import fs from "node:fs/promises";
import path from "node:path";
import type { DefinitionNameLookup } from "../../domain/definition-name-lookup.js";
import { isReleasedTeamNode, parseReleasedOrgTreeV1, type ReleasedOrgTreeV1 } from "./released-org-tree-v1.js";
import {
  AGENT_LOG, AGENT_RUN_FILE, ORG_TREE_FILE, TEAM_LOG, TEAM_TREE_FILE,
  agentUnitRunFile, containerFile, exists, memoryLayout, plannedUnits, readJson, splitHandoffs, teamUnitTree, unitTargetDone, writeFileAtomic, writeJsonAtomic,
} from "./org-unit-targets.js";
import { orgLogFiles, planLogSplit, removeOrgLog, writeUnitLogs, type UnitAgent } from "./org-log-split.js";
import type { UnitRunRef } from "./org-delegations.js";

type Json = Record<string, unknown>;

/** What converting one released Org did: its units (for the delegations and the indexes), and what it kept as residue. */
export type OrgConversionResult = Readonly<{ unitOf: ReadonlyMap<string, UnitRunRef>; unitRuns: readonly UnitRunRef[]; logKeptAsResidue: boolean; unroutedLines: number }>;

/** The step a later start must wait for: the Org stays as it is and is converted by a follow-up (not a failure). */
export class OrgConversionWaits extends Error {}

const WAITS_FOR = /has not converted it\)$/;

/** Moves a released member folder to its unit's place (rename, never copy); a folder already moved is not moved again. */
const moveFolder = async (source: string, target: string): Promise<void> => {
  const [hasSource, hasTarget] = await Promise.all([exists(source), exists(target)]);
  if (hasSource && hasTarget) throw new Error(`both '${source}' and '${target}' exist; the unit's folder cannot be placed`);
  if (!hasSource) return;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.rename(source, target);
};

/** Whether a run folder holds a trace of its own (the agent ran). */
const hasOwnTraces = async (dir: string): Promise<boolean> =>
  (await fs.readdir(dir).catch(() => [] as string[])).some((name) => name.startsWith("raw_traces_"));

/** Each agent of the released Org and the unit run it lives in now, with its Org address. */
const unitAgentsOf = (tree: ReleasedOrgTreeV1, memoryDir: string): Map<string, UnitAgent> => {
  const layout = memoryLayout(memoryDir);
  const agents = new Map<string, UnitAgent>();
  for (const member of tree.rootOrg.members) {
    if (isReleasedTeamNode(member)) {
      for (const agent of member.members) agents.set(agent.agentRunId, { unitRunId: member.teamRunId, unitDir: layout.teamDir(member.teamRunId), logName: TEAM_LOG, orgAddress: agent.address });
    } else {
      agents.set(member.agentRunId, { unitRunId: member.agentRunId, unitDir: layout.agentDir(member.agentRunId), logName: AGENT_LOG, orgAddress: member.address });
    }
  }
  return agents;
};

/**
 * Converts one released Org run's units (design DS-005 steps 2–4; storage contract §1–§5, §9, §11), each step atomic per
 * file and recognized when done (a retry continues; no journal, guideline §7):
 * 1. its log is planned into its units' logs (read while every source is in place);
 * 2. each mounted Team's folder becomes `agent_teams/<teamRunId>/` with its tree (team space, its own rules, `containedIn`);
 * 3. each direct agent's folder becomes `agents/<agentRunId>/` with its run file (`containedIn`, its Org address);
 * 4. the units' logs are written, then the Org log is removed (a line no unit has keeps it as residue).
 *
 * A unit already moved with its target file in place is recognized: only its rename and its file are skipped. The paths
 * into its folder are moved by the node pass on every attempt (SR-018, `org-path-rewrite.ts`), and the container file is
 * written last (`writeConvertedContainer`), only after this Org's part of that pass succeeded: it is the one completion
 * marker, so until then every attempt reads the released tree again and repeats these steps and the pass.
 */
export const convertReleasedOrg = async (input: Readonly<{ memoryDir: string; orgRunId: string; raw: unknown; names: DefinitionNameLookup }>): Promise<OrgConversionResult> => {
  const layout = memoryLayout(input.memoryDir);
  const orgDir = layout.orgDir(input.orgRunId);
  let tree: ReleasedOrgTreeV1;
  try { tree = parseReleasedOrgTreeV1(input.raw, input.orgRunId); }
  catch (error) { throw WAITS_FOR.test(String((error as Error).message)) ? new OrgConversionWaits((error as Error).message) : error; }
  const agents = unitAgentsOf(tree, input.memoryDir);
  const hadLog = (await orgLogFiles(orgDir).catch((error: Error) => { throw WAITS_FOR.test(error.message) ? new OrgConversionWaits(error.message) : error; })).length > 0;
  const split = hadLog ? await planLogSplit(orgDir, agents) : null;
  const { teams: teamRules } = splitHandoffs(tree);
  const units = plannedUnits(tree);
  for (const member of tree.rootOrg.members) {
    if (isReleasedTeamNode(member)) {
      const target = path.join(layout.teamDir(member.teamRunId), TEAM_TREE_FILE);
      if (await unitTargetDone(target, input.orgRunId, member.address)) continue;
      await moveFolder(path.join(orgDir, member.teamRunId), layout.teamDir(member.teamRunId));
      const name = (await input.names.teamDefinitionName(member.teamDefinitionId).catch(() => null)) ?? member.teamDefinitionId;
      await writeJsonAtomic(target, teamUnitTree(tree, member, name, teamRules.get(member.address) ?? []));
      continue;
    }
    const target = path.join(layout.agentDir(member.agentRunId), AGENT_RUN_FILE);
    if (await unitTargetDone(target, input.orgRunId, member.address)) continue;
    await moveFolder(path.join(orgDir, member.agentRunId), layout.agentDir(member.agentRunId));
    await writeJsonAtomic(target, agentUnitRunFile(tree, member, input.memoryDir, await hasOwnTraces(layout.agentDir(member.agentRunId))));
  }
  if (split) {
    await writeUnitLogs(split);
    if (!split.unrouted) await removeOrgLog(orgDir);
  }
  // Every Team unit has its own log (today's Team package requires one), empty when its members exchanged nothing.
  for (const member of tree.rootOrg.members.filter(isReleasedTeamNode)) {
    const log = path.join(layout.teamDir(member.teamRunId), `${TEAM_LOG}_active.jsonl`);
    if (!await exists(log)) await writeFileAtomic(log, "");
  }
  return { unitOf: unitRunsByAgent(tree), unitRuns: units.map((unit) => ({ kind: unit.kind, runId: unit.runId })),
    logKeptAsResidue: Boolean(split?.unrouted), unroutedLines: split?.unrouted ?? 0 };
};

/**
 * SR-018 step 6: the container file replaces the released tree, last, once this Org's units are converted and its part of
 * the node pass succeeded (its existence means every candidate file was visited with this Org's moves).
 */
export const writeConvertedContainer = async (memoryDir: string, orgRunId: string, raw: unknown): Promise<void> => {
  const tree = parseReleasedOrgTreeV1(raw, orgRunId);
  await writeJsonAtomic(path.join(memoryLayout(memoryDir).orgDir(orgRunId), ORG_TREE_FILE), containerFile(tree, plannedUnits(tree), splitHandoffs(tree).org));
};

const unitRunsByAgent = (tree: ReleasedOrgTreeV1): Map<string, UnitRunRef> => {
  const unitOf = new Map<string, UnitRunRef>();
  for (const member of tree.rootOrg.members) {
    if (isReleasedTeamNode(member)) for (const agent of member.members) unitOf.set(agent.agentRunId, { kind: "agent_team", runId: member.teamRunId });
    else unitOf.set(member.agentRunId, { kind: "agent", runId: member.agentRunId });
  }
  return unitOf;
};

/** A converted Org's units, from its container file and its Team units' trees (a later pass: delegations, indexes). */
export const containerUnits = async (memoryDir: string, container: Json): Promise<OrgConversionResult> => {
  const layout = memoryLayout(memoryDir);
  const root = container.rootOrg as Json;
  const unitOf = new Map<string, UnitRunRef>();
  const unitRuns: UnitRunRef[] = [];
  for (const unit of [...(root.units as Json[]), ...((root.formerUnits as Json[] | undefined) ?? [])]) {
    const runId = String(unit.runId);
    if (unit.kind === "agent") { unitOf.set(runId, { kind: "agent", runId }); unitRuns.push({ kind: "agent", runId }); continue; }
    unitRuns.push({ kind: "agent_team", runId });
    const tree = await readJson(path.join(layout.teamDir(runId), TEAM_TREE_FILE)).catch(() => null) as Json | null;
    const team = tree?.rootTeam as Json | undefined;
    for (const member of [...((team?.members as Json[] | undefined) ?? []), ...((team?.formerMembers as Json[] | undefined) ?? [])]) {
      if (typeof member.agentRunId === "string") unitOf.set(member.agentRunId, { kind: "agent_team", runId });
    }
  }
  return { unitOf, unitRuns, logKeptAsResidue: false, unroutedLines: 0 };
};

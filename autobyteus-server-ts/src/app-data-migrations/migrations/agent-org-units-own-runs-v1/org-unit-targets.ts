import fs from "node:fs/promises";
import path from "node:path";
import { isExternalProviderRuntimeKind, type RuntimeKind } from "../../frozen/server/runtime-management/runtime-kind-enum.js";
import {
  isReleasedTeamNode, isUnderTeam, teamSpaceOf,
  type ReleasedHandoff, type ReleasedLaunch, type ReleasedOrgAgentNode, type ReleasedOrgTeamNode, type ReleasedOrgTreeV1,
} from "./released-org-tree-v1.js";

/**
 * The target files of an Org's conversion, in the shapes today's readers read (frozen here as this migration's targets:
 * the Org container file, a Team unit's tree, an agent unit's run file; storage contract §2–§4, §11), and the layout of
 * the memory folder it touches.
 */
type Json = Record<string, unknown>;

export const ORG_TREE_FILE = "agent_org_run_execution_tree.json";
export const TEAM_TREE_FILE = "team_run_execution_tree.json";
export const AGENT_RUN_FILE = "run_metadata.json";
export const ORG_LOG = "agent_org_communication_messages";
export const TEAM_LOG = "team_communication_messages";
export const AGENT_LOG = "communication_messages";

export const memoryLayout = (memoryDir: string) => Object.freeze({
  orgDir: (orgRunId: string) => path.join(memoryDir, "agent_orgs", orgRunId),
  teamDir: (teamRunId: string) => path.join(memoryDir, "agent_teams", teamRunId),
  agentDir: (agentRunId: string) => path.join(memoryDir, "agents", agentRunId),
});

/** One unit of the converted Org: its Org address, kind, run ID (kept from the released tree) and definition. */
export type PlannedUnit = Readonly<{ address: string; kind: "agent" | "agent_team"; runId: string; definitionId: string }>;

const launchJson = (launch: ReleasedLaunch, fallbackWorkspace: string | null): Json => ({
  runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig,
  autoExecuteTools: launch.autoExecuteTools, workspaceRootPath: launch.workspaceRootPath ?? fallbackWorkspace,
});

const containedIn = (orgRunId: string, address: string): Json => ({ orgRunId, address });

/** The handoffs wholly inside one Team (its own rules, in team space); every other one stays the Org's (contract §9). */
export const splitHandoffs = (tree: ReleasedOrgTreeV1): Readonly<{ org: ReleasedHandoff[]; teams: Map<string, ReleasedHandoff[]> }> => {
  const teams = new Map<string, ReleasedHandoff[]>();
  const org: ReleasedHandoff[] = [];
  const teamAddresses = tree.rootOrg.members.filter(isReleasedTeamNode).map((team) => team.address);
  for (const handoff of tree.handoffs) {
    const team = teamAddresses.find((address) => isUnderTeam(address, handoff.from) && isUnderTeam(address, handoff.to)
      && handoff.from !== address && handoff.to !== address);
    if (!team) { org.push(handoff); continue; }
    teams.set(team, [...teams.get(team) ?? [], { from: teamSpaceOf(team, handoff.from), to: teamSpaceOf(team, handoff.to), rules: handoff.rules }]);
  }
  return { org, teams };
};

export const plannedUnits = (tree: ReleasedOrgTreeV1): PlannedUnit[] => tree.rootOrg.members.map((member) => isReleasedTeamNode(member)
  ? { address: member.address, kind: "agent_team", runId: member.teamRunId, definitionId: member.teamDefinitionId }
  : { address: member.address, kind: "agent", runId: member.agentRunId, definitionId: member.agentDefinitionId });

const memberJson = (team: ReleasedOrgTeamNode, member: ReleasedOrgAgentNode, fallbackWorkspace: string | null): Json => ({
  address: teamSpaceOf(team.address, member.address), agentDefinitionId: member.agentDefinitionId, role: member.role, description: member.description,
  agentRunId: member.agentRunId, platformAgentRunId: member.platformAgentRunId, launchConfiguration: launchJson(member.launchConfiguration, fallbackWorkspace),
  ...(member.launchSource !== undefined ? { launchSource: member.launchSource } : {}),
  ...(member.pendingRuntimeSwitch !== undefined ? { pendingRuntimeSwitch: member.pendingRuntimeSwitch } : {}),
});

/** A Team unit's tree (contract §3): team space, the Team's own rules, `containedIn`, the Org's ownership (§11). */
export const teamUnitTree = (tree: ReleasedOrgTreeV1, team: ReleasedOrgTeamNode, teamDefinitionName: string, rules: readonly ReleasedHandoff[]): Json => {
  const workspace = team.defaultLaunchConfiguration.workspaceRootPath ?? tree.rootOrg.defaultLaunchConfiguration.workspaceRootPath;
  return {
    createdAt: tree.createdAt, archivedAt: tree.archivedAt, applicationBinding: tree.applicationBinding,
    handoffs: rules.map((rule) => ({ from: rule.from, to: rule.to, rules: [...rule.rules] })),
    rootTeam: {
      address: "/", teamDefinitionId: team.teamDefinitionId, teamDefinitionName, teamRunId: team.teamRunId,
      coordinatorAddress: teamSpaceOf(team.address, team.coordinatorAddress),
      defaultLaunchConfiguration: launchJson(team.defaultLaunchConfiguration, workspace),
      members: team.members.map((member) => memberJson(team, member, workspace)),
    },
    containedIn: containedIn(tree.rootOrg.orgRunId, team.address),
  };
};

/** An agent unit's run file (contract §4, §11): its identity, launch, address, `containedIn`, and the Org's ownership. */
/** A prepared run's expiry window, as today's provisioning writes it (an Org's unit is never expired: its container keeps it). */
const PREPARED_RUN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Where a released direct agent stands (today's standalone activation states): `started` when it can be restored as it
 * ran: an external runtime with its provider conversation (`platformAgentRunId`, not the run ID), the server runtime with
 * a trace of its own; otherwise `prepared` (its first input starts it). The released Org stored no time per member: the
 * Org's `createdAt` stands for both.
 */
export const agentUnitLifecycle = (agent: ReleasedOrgAgentNode, runtimeKind: string, hasTraces: boolean, createdAt: string): Json => {
  const platform = typeof agent.platformAgentRunId === "string" ? agent.platformAgentRunId.trim() : "";
  const started = isExternalProviderRuntimeKind(runtimeKind as RuntimeKind) ? Boolean(platform) && platform !== agent.agentRunId : hasTraces;
  return started ? { startedAt: createdAt }
    : { preparedAt: createdAt, preparedExpiresAt: new Date(Date.parse(createdAt) + PREPARED_RUN_TTL_MS).toISOString(), startedAt: null };
};

export const agentUnitRunFile = (tree: ReleasedOrgTreeV1, agent: ReleasedOrgAgentNode, memoryDir: string, hasTraces: boolean): Json => {
  const launch = launchJson(agent.launchConfiguration, tree.rootOrg.defaultLaunchConfiguration.workspaceRootPath ?? path.sep);
  const binding = tree.applicationBinding;
  return {
    runId: agent.agentRunId, agentDefinitionId: agent.agentDefinitionId, workspaceRootPath: launch.workspaceRootPath,
    memoryDir: memoryLayout(memoryDir).agentDir(agent.agentRunId), llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig,
    autoExecuteTools: launch.autoExecuteTools, runtimeKind: launch.runtimeKind, platformAgentRunId: agent.platformAgentRunId,
    ...agentUnitLifecycle(agent, String(launch.runtimeKind), hasTraces, tree.createdAt),
    // An application's Org: the context today's Org run gives its direct agent (the producer is the agent at its address).
    applicationExecutionContext: binding ? { applicationId: binding.applicationId, bindingId: binding.bindingId,
      producer: { agentRunId: agent.agentRunId, displayName: agent.address.split("/").filter(Boolean).at(-1) ?? agent.agentRunId } } : null,
    containedIn: containedIn(tree.rootOrg.orgRunId, agent.address),
    address: agent.address,
    ...(agent.launchSource !== undefined ? { launchSource: agent.launchSource } : {}),
    ...(agent.pendingRuntimeSwitch !== undefined ? { pendingRuntimeSwitch: agent.pendingRuntimeSwitch } : {}),
  };
};

/** The container file (contract §2): the Org's own fields, its units, no former units yet, and the Org-level rules. */
export const containerFile = (tree: ReleasedOrgTreeV1, units: readonly PlannedUnit[], orgRules: readonly ReleasedHandoff[]): Json => ({
  subjectKind: "agent_org", createdAt: tree.createdAt, archivedAt: tree.archivedAt, applicationBinding: tree.applicationBinding,
  handoffs: orgRules.map((rule) => ({ from: rule.from, to: rule.to, rules: [...rule.rules] })),
  rootOrg: {
    address: "/", orgDefinitionId: tree.rootOrg.orgDefinitionId, orgDefinitionName: tree.rootOrg.orgDefinitionName, orgRunId: tree.rootOrg.orgRunId,
    defaultLaunchConfiguration: launchJson(tree.rootOrg.defaultLaunchConfiguration, tree.rootOrg.defaultLaunchConfiguration.workspaceRootPath),
    units: units.map((unit) => ({ address: unit.address, kind: unit.kind, runId: unit.runId, definitionId: unit.definitionId })),
    formerUnits: [],
  },
});

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

export const readJson = async (file: string): Promise<unknown | null> => {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch (error) { if (isMissing(error)) return null; throw error; }
};
export const exists = (target: string): Promise<boolean> => fs.access(target).then(() => true, (error: unknown) => {
  if (isMissing(error)) return false;
  throw error;
});

/** One file written whole: a temporary sibling, then a rename over the target (§7: each step atomic per file). */
export const writeFileAtomic = async (file: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, content, "utf8");
  await fs.rename(temporary, file);
};
export const writeJsonAtomic = (file: string, value: unknown): Promise<void> => writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);

/** Whether a unit's target file is in place: it names this Org at this address (`containedIn`). */
export const unitTargetDone = async (file: string, orgRunId: string, address: string): Promise<boolean> => {
  const value = await readJson(file).catch(() => null) as Json | null;
  const link = value && typeof value === "object" ? value.containedIn as Json | undefined : undefined;
  return Boolean(link && link.orgRunId === orgRunId && link.address === address);
};

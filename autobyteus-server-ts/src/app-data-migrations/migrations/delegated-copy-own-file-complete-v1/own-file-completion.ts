import { isDeepStrictEqual } from "node:util";
import { normalizeCollaborationHandoffs, type CollaborationHandoff } from "../../frozen/server/agent-collaboration/domain/collaboration-handoff.js";
import type { LaunchConfigurationSource } from "../../frozen/server/agent-collaboration/domain/launch-configuration-source.js";
import type { AgentLaunchConfiguration } from "../../frozen/server/agent-team-execution/domain/team-run-config.js";
import type { TaskAgentTeamTreeFile } from "../../frozen/server/agent-team-execution/domain/task-agent-team-tree.js";
import type { TaskAgentRunMetadata } from "../../frozen/server/run-history/store/agent-run-metadata-types.js";
import { parseTaskAgentRunMetadata } from "../../frozen/server/run-history/store/task-agent-own-file-schema.js";
import { validateTaskAgentTeamTreePayload } from "../../frozen/server/run-history/store/task-agent-team-tree-schema.js";
import {
  parseReleasedTaskAgentRunMetadata,
  releasedTaskAgentStartedLaunch,
  validateReleasedTaskAgentTeamTreePayload,
  type ReleasedTaskAgentCoordinatingRun,
  type ReleasedTaskAgentRunMetadata,
  type ReleasedTaskAgentSection,
  type ReleasedTaskAgentTeamTreeFile,
} from "../../frozen/released-run-package-shapes/released-task-agent-own-files-with-origin.js";
import { parseLaunchConfiguration } from "../../frozen/released-run-package-shapes/released-trees-before-task-agent-own-run.js";

/**
 * The per-file conversion of `20261019_delegated_copy_own_file_complete_v1` (design Migration Plan M1–M4),
 * pure and on raw JSON: a delegated copy's own file in the released shape (with `taskAgent.origin`) becomes
 * the current shape, which restores on its own. A copy of a configured place takes the missing facts from its
 * slot in the coordinating run's tree as it is now (what it restores with before the upgrade). The released
 * shape is read with the frozen released parsers; the result is checked with the current readers.
 */

export type OwnFileKind = "agent" | "team";

/** A coordinating run's tree file as raw JSON, or why it cannot be read. */
export type RawCoordinatingTree =
  | Readonly<{ kind: "present"; raw: Record<string, unknown> }>
  | Readonly<{ kind: "unavailable"; reason: string }>;

export type OwnFileCompletion =
  | Readonly<{ kind: "already_current" }>
  | Readonly<{ kind: "complete"; payload: TaskAgentRunMetadata | TaskAgentTeamTreeFile }>
  | Readonly<{ kind: "placement_missing"; reason: string }>
  | Readonly<{ kind: "unsupported"; reason: string }>;

type Json = Record<string, unknown>;

/** Provenance of a copy started from a configured placement (D-6): "As configured in this run". */
const CONFIGURED: LaunchConfigurationSource = Object.freeze({ origin: "configured", fallbacks: Object.freeze([]) });

const message = (error: unknown): string => error instanceof Error ? error.message : String(error);

/** A configured placement that exists but cannot supply the facts (its own data is not readable). */
class UnusablePlacementError extends Error {}
const fromPlacement = <T>(read: () => T): T => {
  try { return read(); } catch (error) { throw new UnusablePlacementError(message(error)); }
};
const isRecord = (value: unknown): value is Json => !!value && typeof value === "object" && !Array.isArray(value);
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

/** The 5 current launch keys of a slot's launch object (obsolete keys such as `skillAccessMode` are never read, AR-002). */
const projectLaunch = (value: unknown, label: string): AgentLaunchConfiguration => {
  if (!isRecord(value)) throw new Error(`${label} is not an object.`);
  return parseLaunchConfiguration({
    runtimeKind: value.runtimeKind,
    llmModelIdentifier: value.llmModelIdentifier,
    llmConfig: value.llmConfig,
    autoExecuteTools: value.autoExecuteTools,
    workspaceRootPath: value.workspaceRootPath,
  }, label);
};

/** Today's configured rule (D-5): a member follows its Team iff its runtime, model and model settings equal the Team's. */
const followsConfiguredTeam = (team: AgentLaunchConfiguration, member: AgentLaunchConfiguration): boolean =>
  member.runtimeKind === team.runtimeKind
  && member.llmModelIdentifier === team.llmModelIdentifier
  && isDeepStrictEqual(member.llmConfig ?? null, team.llmConfig ?? null);

/**
 * The configured placements of a coordinating tree (the slot locator): a Team run's members; an Org run's
 * direct agents, mounted teams and their members. An Agent run has none.
 */
const placementsOf = (family: ReleasedTaskAgentCoordinatingRun["kind"], tree: Json): Json[] => {
  if (family === "agent") return [];
  const root = family === "agent_team" ? tree.rootTeam : tree.rootOrg;
  if (!isRecord(root)) return [];
  const direct = list(root.members).filter(isRecord);
  return family === "agent_team"
    ? direct
    : direct.flatMap((member) => typeof member.teamRunId === "string" ? [member, ...list(member.members).filter(isRecord)] : [member]);
};

const findPlacement = (
  family: ReleasedTaskAgentCoordinatingRun["kind"],
  tree: Json,
  address: string,
  kind: "agentRunId" | "teamRunId",
): Json | null => placementsOf(family, tree).find((placement) => placement.address === address && typeof placement[kind] === "string") ?? null;

const section = (released: ReleasedTaskAgentSection, launchSource: LaunchConfigurationSource | undefined) => ({
  coordinatingRun: released.coordinatingRun,
  ...(released.delegatorAgentRunId === undefined ? {} : { delegatorAgentRunId: released.delegatorAgentRunId }),
  address: released.address,
  ...(launchSource === undefined ? {} : { launchSource }),
  ...(released.userLaunchSelection === undefined ? {} : { userLaunchSelection: released.userLaunchSelection }),
});

const agentFile = (
  released: ReleasedTaskAgentRunMetadata,
  agentDefinitionId: string,
  launch: AgentLaunchConfiguration,
  launchSource: LaunchConfigurationSource | undefined,
): TaskAgentRunMetadata => parseTaskAgentRunMetadata({
  runId: released.runId,
  agentDefinitionId,
  workspaceRootPath: launch.workspaceRootPath,
  memoryDir: released.memoryDir,
  llmModelIdentifier: launch.llmModelIdentifier,
  llmConfig: launch.llmConfig,
  autoExecuteTools: launch.autoExecuteTools,
  runtimeKind: launch.runtimeKind,
  platformAgentRunId: released.platformAgentRunId,
  startedAt: released.startedAt,
  taskAgent: section(released.taskAgent, launchSource),
}, released.runId);

/** M2 (agent) and M3. */
const completeAgent = (released: ReleasedTaskAgentRunMetadata, coordinating: () => RawCoordinatingTree): OwnFileCompletion => {
  if (released.taskAgent.origin === "catalog") {
    return { kind: "complete", payload: agentFile(released, released.agentDefinitionId, releasedTaskAgentStartedLaunch(released)!, released.taskAgent.launchSource) };
  }
  const tree = coordinating();
  if (tree.kind === "unavailable") return { kind: "placement_missing", reason: tree.reason };
  const { coordinatingRun, address } = released.taskAgent;
  const slot = findPlacement(coordinatingRun.kind, tree.raw, address, "agentRunId");
  if (!slot) return { kind: "placement_missing", reason: `No configured Agent at '${address}' in ${coordinatingRun.kind} run '${coordinatingRun.runId}'.` };
  if (typeof slot.agentDefinitionId !== "string" || !slot.agentDefinitionId) {
    return { kind: "placement_missing", reason: `The configured Agent at '${address}' names no definition.` };
  }
  const launch = fromPlacement(() => projectLaunch(slot.launchConfiguration, `configured Agent '${address}'.launchConfiguration`));
  return { kind: "complete", payload: agentFile(released, slot.agentDefinitionId, launch, released.taskAgent.launchSource ?? CONFIGURED) };
};

const teamFile = (
  released: ReleasedTaskAgentTeamTreeFile,
  facts: Readonly<{
    teamDefinitionId: string;
    coordinatorAddress: string;
    defaultLaunchConfiguration: AgentLaunchConfiguration;
    handoffs: readonly CollaborationHandoff[];
    member: (member: ReleasedTaskAgentTeamTreeFile["rootTeam"]["members"][number]) =>
      Readonly<{ agentDefinitionId: string; launchConfiguration: AgentLaunchConfiguration; followsTeam: boolean }>;
    launchSource: LaunchConfigurationSource | undefined;
  }>,
): TaskAgentTeamTreeFile => validateTaskAgentTeamTreePayload({
  createdAt: released.createdAt,
  archivedAt: null,
  applicationBinding: null,
  handoffs: facts.handoffs,
  rootTeam: {
    address: released.rootTeam.address,
    teamDefinitionId: facts.teamDefinitionId,
    teamRunId: released.rootTeam.teamRunId,
    coordinatorAddress: facts.coordinatorAddress,
    defaultLaunchConfiguration: facts.defaultLaunchConfiguration,
    members: released.rootTeam.members.map((member) => ({
      address: member.address,
      ...facts.member(member),
      agentRunId: member.agentRunId,
      platformAgentRunId: member.platformAgentRunId,
      role: null,
      description: null,
      ...(member.launchSource === undefined ? {} : { launchSource: member.launchSource }),
      ...(member.userLaunchSelection === undefined ? {} : { userLaunchSelection: member.userLaunchSelection }),
    })),
    taskExecutions: [],
  },
  taskAgent: section(released.taskAgent, facts.launchSource),
}, released.rootTeam.teamRunId);

/** M2 (team) and M4. */
const completeTeam = (released: ReleasedTaskAgentTeamTreeFile, coordinating: () => RawCoordinatingTree): OwnFileCompletion => {
  const root = released.rootTeam;
  if (released.taskAgent.origin === "catalog") {
    // The recorded rule: a member with its own launch runs on it and does not follow; one without runs on the Team's and follows.
    return { kind: "complete", payload: teamFile(released, {
      teamDefinitionId: root.teamDefinitionId,
      coordinatorAddress: root.coordinatorAddress,
      defaultLaunchConfiguration: root.defaultLaunchConfiguration,
      handoffs: released.handoffs,
      member: (member) => ({
        agentDefinitionId: member.agentDefinitionId,
        launchConfiguration: member.launchConfiguration ?? root.defaultLaunchConfiguration,
        followsTeam: member.launchConfiguration === undefined,
      }),
      launchSource: released.taskAgent.launchSource,
    }) };
  }
  const tree = coordinating();
  if (tree.kind === "unavailable") return { kind: "placement_missing", reason: tree.reason };
  const { coordinatingRun, address } = released.taskAgent;
  const slot = findPlacement(coordinatingRun.kind, tree.raw, address, "teamRunId");
  if (!slot) return { kind: "placement_missing", reason: `No configured Team at '${address}' in ${coordinatingRun.kind} run '${coordinatingRun.runId}'.` };
  const slotMembers = new Map(list(slot.members).filter(isRecord).map((member) => [member.address, member] as const));
  const ownAddresses = root.members.map((member) => member.address);
  if (slotMembers.size !== ownAddresses.length || ownAddresses.some((member) => !slotMembers.has(member))) {
    return { kind: "placement_missing", reason: `The configured Team at '${address}' no longer has the copy's members.` };
  }
  if (typeof slot.teamDefinitionId !== "string" || typeof slot.coordinatorAddress !== "string") {
    return { kind: "placement_missing", reason: `The configured Team at '${address}' names no definition or coordinator.` };
  }
  const teamLaunch = fromPlacement(() => projectLaunch(slot.defaultLaunchConfiguration, `configured Team '${address}'.defaultLaunchConfiguration`));
  const memberAddresses = new Set<string>(ownAddresses);
  const handoffs = fromPlacement(() => normalizeCollaborationHandoffs(tree.raw.handoffs ?? []))
    .filter((handoff) => memberAddresses.has(handoff.from));
  const members = new Map(root.members.map((member) => {
    const placed = slotMembers.get(member.address)!;
    const launch = fromPlacement(() => projectLaunch(placed.launchConfiguration, `configured member '${member.address}'.launchConfiguration`));
    if (typeof placed.agentDefinitionId !== "string" || !placed.agentDefinitionId) {
      throw new UnusablePlacementError(`The configured member '${member.address}' names no definition.`);
    }
    return [member.address, { agentDefinitionId: placed.agentDefinitionId, launchConfiguration: launch, followsTeam: followsConfiguredTeam(teamLaunch, launch) }] as const;
  }));
  return { kind: "complete", payload: teamFile(released, {
    teamDefinitionId: slot.teamDefinitionId,
    coordinatorAddress: slot.coordinatorAddress,
    defaultLaunchConfiguration: teamLaunch,
    handoffs,
    member: (member) => members.get(member.address)!,
    launchSource: released.taskAgent.launchSource ?? CONFIGURED,
  }) };
};

/** Whether a raw own file is a copy of a configured place in the released shape (the only kind that needs its slot). */
export const isConfiguredPlaceCopy = (raw: Json): boolean => isRecord(raw.taskAgent) && raw.taskAgent.origin === "configured_place";

/** The coordinating run an own file names, read from its raw `taskAgent` section; null when it names none. */
export const coordinatingRunOfRaw = (raw: Json): ReleasedTaskAgentCoordinatingRun | null => {
  const coordinating = isRecord(raw.taskAgent) ? raw.taskAgent.coordinatingRun : null;
  return isRecord(coordinating) && typeof coordinating.runId === "string"
    && (coordinating.kind === "agent" || coordinating.kind === "agent_team" || coordinating.kind === "agent_org")
    ? { kind: coordinating.kind, runId: coordinating.runId }
    : null;
};

/**
 * M1–M4 for one own file. `coordinating` reads its coordinating run's tree; it is called only for a copy of
 * a configured place.
 */
export const completeOwnFile = (input: Readonly<{
  kind: OwnFileKind;
  runId: string;
  raw: Json;
  coordinating: () => RawCoordinatingTree;
}>): OwnFileCompletion => {
  const taskAgent = isRecord(input.raw.taskAgent) ? input.raw.taskAgent : null;
  if (taskAgent && !("origin" in taskAgent)) {
    try {
      if (input.kind === "agent") parseTaskAgentRunMetadata(input.raw, input.runId);
      else validateTaskAgentTeamTreePayload(input.raw, input.runId);
      return { kind: "already_current" };
    } catch (error) {
      return { kind: "unsupported", reason: `It has no origin but is not in the current shape: ${message(error)}` };
    }
  }
  let released: ReleasedTaskAgentRunMetadata | ReleasedTaskAgentTeamTreeFile;
  try {
    released = input.kind === "agent"
      ? parseReleasedTaskAgentRunMetadata(input.raw, input.runId)
      : validateReleasedTaskAgentTeamTreePayload(input.raw, input.runId);
  } catch (error) {
    return { kind: "unsupported", reason: `It is not in the released shape: ${message(error)}` };
  }
  try {
    return "rootTeam" in released ? completeTeam(released, input.coordinating) : completeAgent(released, input.coordinating);
  } catch (error) {
    if (error instanceof UnusablePlacementError) return { kind: "placement_missing", reason: error.message };
    return { kind: "unsupported", reason: `It cannot be converted to the current shape: ${message(error)}` };
  }
};

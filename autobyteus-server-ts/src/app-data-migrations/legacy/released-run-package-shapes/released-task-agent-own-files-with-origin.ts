// Frozen copy of the task agents' own files as released with `20261017_task_agent_own_run_v1`, as of
// origin/personal@f171032e88: the `taskAgent` section with `origin` ("catalog" | "configured_place"), an agent
// own file whose launch fields are all `null` when never recorded (a copy of a configured place), a task team
// member whose launch is present only when it runs on its own agent default, and the two writers of that
// period (`taskAgentOwnMetadata`, `taskAgentTeamOwnTree`; import paths remapped, records typed with the
// released tree records). Parsers and writers are those of `src/run-history/store/task-agent-own-*` at that
// commit. Owned by `20261017_task_agent_own_run_v1` (its own-file writes and reads) and by
// `20261019_delegated_copy_own_file_complete_v1` (its classifier); current runtime code must never import it.

import fs from "node:fs/promises";
import path from "node:path";
import { TASK_AGENT_PLACEMENT } from "../../../agent-memory/domain/agent-run-memory-placement.js";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import type { AgentTeamAddress } from "../../../agent-collaboration/domain/agent-team-address.js";
import {
  normalizeCollaborationHandoffs,
  type CollaborationHandoff,
} from "../../../agent-collaboration/domain/collaboration-handoff.js";
import type { LaunchConfigurationSource } from "../../../agent-collaboration/domain/launch-configuration-source.js";
import type { AgentLaunchConfiguration } from "../../../agent-team-execution/domain/team-run-config.js";
import type { AtomicRunPackageFileCommitWriter, RunPackageFileWriteResult } from "../../../run-history/store/atomic-run-package-file-commit-writer.js";
import type { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import { parseLaunchConfigurationSource, parseOptionalLaunchFields, parseOptionalUserLaunchSelection } from "./released-trees-before-task-agent-own-run/launch-configuration-source-schema.js";
import {
  canonicalNonRootAddress,
  deepFreeze,
  isoTimestamp,
  nullableString,
  objectRecord,
  parseLaunchConfiguration,
  requireKeys,
  requiredArray,
  requiredString,
} from "./released-trees-before-task-agent-own-run/run-execution-tree-shared-record-schemas.js";
import type {
  ConfiguredAgentExecutionNode,
  ConfiguredTeamExecutionNode,
  TaskAgentExecution,
  TaskExecution,
  TaskTeamExecution,
  TaskTeamExecutionSourceMember,
  UserLaunchSelection,
} from "./released-trees-before-task-agent-own-run.js";

export const RELEASED_TASK_AGENT_RUN_METADATA_FILE = "run_metadata.json";
export const RELEASED_TASK_AGENT_TEAM_TREE_FILE = "team_run_execution_tree.json";

// ---- types (`agent-run-metadata-types.ts`, `task-agent-team-tree.ts`) ------------------------------------------

export type ReleasedTaskAgentCoordinatingRun = Readonly<{ kind: "agent" | "agent_team" | "agent_org"; runId: string }>;
export type ReleasedTaskAgentOrigin = "catalog" | "configured_place";

export type ReleasedTaskAgentSection = Readonly<{
  coordinatingRun: ReleasedTaskAgentCoordinatingRun;
  delegatorAgentRunId?: string;
  address: AgentTeamAddress;
  origin: ReleasedTaskAgentOrigin;
  launchSource?: LaunchConfigurationSource;
  userLaunchSelection?: UserLaunchSelection;
}>;

export type ReleasedTaskAgentRunMetadata = Readonly<{
  runId: string;
  agentDefinitionId: string;
  workspaceRootPath: string | null;
  memoryDir: string;
  llmModelIdentifier: string | null;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean | null;
  runtimeKind: RuntimeKind | null;
  platformAgentRunId: string | null;
  startedAt: string;
  taskAgent: ReleasedTaskAgentSection;
}>;

export type ReleasedTaskAgentTeamMemberNode = Readonly<{
  address: AgentTeamAddress;
  agentDefinitionId: string;
  agentRunId: string;
  platformAgentRunId: string | null;
  role: null;
  description: null;
  launchConfiguration?: AgentLaunchConfiguration;
  launchSource?: LaunchConfigurationSource;
  userLaunchSelection?: UserLaunchSelection;
}>;

export type ReleasedTaskAgentTeamTreeFile = Readonly<{
  createdAt: string;
  archivedAt: null;
  applicationBinding: null;
  handoffs: readonly CollaborationHandoff[];
  rootTeam: Readonly<{
    address: AgentTeamAddress;
    teamDefinitionId: string;
    teamRunId: string;
    coordinatorAddress: AgentTeamAddress;
    defaultLaunchConfiguration: AgentLaunchConfiguration;
    members: readonly ReleasedTaskAgentTeamMemberNode[];
    taskExecutions: readonly [];
  }>;
  taskAgent: ReleasedTaskAgentSection;
}>;

export type ReleasedConfiguredPlaceResolver = (address: AgentTeamAddress) => ConfiguredAgentExecutionNode | ConfiguredTeamExecutionNode | null;

// ---- readers (`task-agent-own-file-schema.ts`, `task-agent-team-tree-schema.ts`) --------------------------------

const COORDINATING_RUN_KINDS: readonly ReleasedTaskAgentCoordinatingRun["kind"][] = ["agent", "agent_team", "agent_org"];
const ORIGINS: readonly ReleasedTaskAgentOrigin[] = ["catalog", "configured_place"];

export const hasReleasedTaskAgentSection = (value: unknown): boolean =>
  !!value && typeof value === "object" && !Array.isArray(value) && "taskAgent" in value;

export const parseReleasedTaskAgentSection = (value: unknown, label = "taskAgent"): ReleasedTaskAgentSection => {
  const section = objectRecord(value, label);
  requireKeys(section, ["coordinatingRun", "address", "origin"], label);
  const coordinating = objectRecord(section.coordinatingRun, `${label}.coordinatingRun`);
  requireKeys(coordinating, ["kind", "runId"], `${label}.coordinatingRun`);
  if (!COORDINATING_RUN_KINDS.includes(coordinating.kind as ReleasedTaskAgentCoordinatingRun["kind"])) {
    throw new Error(`${label}.coordinatingRun.kind is unsupported.`);
  }
  if (!ORIGINS.includes(section.origin as ReleasedTaskAgentOrigin)) throw new Error(`${label}.origin is unsupported.`);
  return {
    coordinatingRun: {
      kind: coordinating.kind as ReleasedTaskAgentCoordinatingRun["kind"],
      runId: requiredString(coordinating.runId, `${label}.coordinatingRun.runId`),
    },
    ...(section.delegatorAgentRunId === undefined
      ? {}
      : { delegatorAgentRunId: requiredString(section.delegatorAgentRunId, `${label}.delegatorAgentRunId`) }),
    address: canonicalNonRootAddress(section.address, `${label}.address`),
    origin: section.origin as ReleasedTaskAgentOrigin,
    ...(section.launchSource === undefined
      ? {}
      : { launchSource: parseLaunchConfigurationSource(section.launchSource, `${label}.launchSource`) }),
    ...parseOptionalUserLaunchSelection(section, "userLaunchSelection", label),
  };
};

export const releasedTaskAgentStartedLaunch = (metadata: ReleasedTaskAgentRunMetadata): AgentLaunchConfiguration | null =>
  metadata.runtimeKind === null || metadata.llmModelIdentifier === null || metadata.autoExecuteTools === null
    ? null
    : {
        runtimeKind: metadata.runtimeKind,
        llmModelIdentifier: metadata.llmModelIdentifier,
        llmConfig: metadata.llmConfig,
        autoExecuteTools: metadata.autoExecuteTools,
        workspaceRootPath: metadata.workspaceRootPath,
      };

const parseStartedLaunch = (record: Record<string, unknown>, label: string): AgentLaunchConfiguration | null => {
  const unrecorded = record.runtimeKind === null && record.llmModelIdentifier === null
    && record.llmConfig === null && record.autoExecuteTools === null && record.workspaceRootPath === null;
  return unrecorded ? null : parseLaunchConfiguration({
    runtimeKind: record.runtimeKind,
    llmModelIdentifier: record.llmModelIdentifier,
    llmConfig: record.llmConfig,
    autoExecuteTools: record.autoExecuteTools,
    workspaceRootPath: record.workspaceRootPath,
  }, label);
};

export const parseReleasedTaskAgentRunMetadata = (value: unknown, expectedRunId: string): ReleasedTaskAgentRunMetadata => {
  const label = "Task agent run metadata";
  const record = objectRecord(value, label);
  requireKeys(record, [
    "runId", "agentDefinitionId", "workspaceRootPath", "memoryDir", "llmModelIdentifier", "llmConfig",
    "autoExecuteTools", "runtimeKind", "platformAgentRunId", "startedAt", "taskAgent",
  ], label);
  const runId = requiredString(record.runId, `${label}.runId`);
  if (runId !== expectedRunId) throw new Error(`${label} runId '${runId}' does not match '${expectedRunId}'.`);
  const taskAgent = parseReleasedTaskAgentSection(record.taskAgent, `${label}.taskAgent`);
  const launch = parseStartedLaunch(record, label);
  if (!launch && taskAgent.origin === "catalog") {
    throw new Error(`${label} of a catalog task agent must record the launch it started with.`);
  }
  return {
    runId,
    agentDefinitionId: requiredString(record.agentDefinitionId, `${label}.agentDefinitionId`),
    workspaceRootPath: launch?.workspaceRootPath ?? null,
    memoryDir: path.resolve(requiredString(record.memoryDir, `${label}.memoryDir`)),
    llmModelIdentifier: launch?.llmModelIdentifier ?? null,
    llmConfig: launch?.llmConfig ?? null,
    autoExecuteTools: launch?.autoExecuteTools ?? null,
    runtimeKind: launch?.runtimeKind ?? null,
    platformAgentRunId: nullableString(record.platformAgentRunId, `${label}.platformAgentRunId`),
    startedAt: isoTimestamp(record.startedAt, `${label}.startedAt`),
    taskAgent,
  };
};

const parseMember = (value: unknown, label: string): ReleasedTaskAgentTeamMemberNode => {
  const member = objectRecord(value, label);
  requireKeys(member, ["address", "agentDefinitionId", "agentRunId", "platformAgentRunId"], label);
  return {
    address: canonicalNonRootAddress(member.address, `${label}.address`),
    agentDefinitionId: requiredString(member.agentDefinitionId, `${label}.agentDefinitionId`),
    agentRunId: requiredString(member.agentRunId, `${label}.agentRunId`),
    platformAgentRunId: nullableString(member.platformAgentRunId, `${label}.platformAgentRunId`),
    role: null,
    description: null,
    ...parseOptionalLaunchFields(member, { launch: "launchConfiguration", source: "launchSource" }, label),
    ...parseOptionalUserLaunchSelection(member, "userLaunchSelection", label),
  };
};

const parseRootTeam = (value: unknown): ReleasedTaskAgentTeamTreeFile["rootTeam"] => {
  const root = objectRecord(value, "rootTeam");
  requireKeys(root, [
    "address", "teamDefinitionId", "teamRunId", "coordinatorAddress", "defaultLaunchConfiguration", "members",
  ], "rootTeam");
  if (root.taskExecutions !== undefined && requiredArray(root.taskExecutions, "rootTeam.taskExecutions").length > 0) {
    throw new Error("A task agent team's own tree holds no task executions.");
  }
  const members = requiredArray(root.members, "rootTeam.members").map((member, index) =>
    parseMember(member, `rootTeam.members[${index}]`));
  const coordinatorAddress = canonicalNonRootAddress(root.coordinatorAddress, "rootTeam.coordinatorAddress");
  if (members.filter((member) => member.address === coordinatorAddress).length !== 1) {
    throw new Error("rootTeam has no unique coordinator member.");
  }
  const runIds = new Set<string>();
  for (const member of members) {
    if (runIds.has(member.agentRunId)) throw new Error(`Duplicate member run ID '${member.agentRunId}'.`);
    runIds.add(member.agentRunId);
  }
  return {
    address: canonicalNonRootAddress(root.address, "rootTeam.address"),
    teamDefinitionId: requiredString(root.teamDefinitionId, "rootTeam.teamDefinitionId"),
    teamRunId: requiredString(root.teamRunId, "rootTeam.teamRunId"),
    coordinatorAddress,
    defaultLaunchConfiguration: parseLaunchConfiguration(root.defaultLaunchConfiguration, "rootTeam.defaultLaunchConfiguration"),
    members,
    taskExecutions: [],
  };
};

export const validateReleasedTaskAgentTeamTreePayload = (value: unknown, expectedTeamRunId: string): ReleasedTaskAgentTeamTreeFile => {
  const payload = objectRecord(value, "Task agent team tree");
  requireKeys(payload, ["createdAt", "handoffs", "rootTeam", "taskAgent"], "Task agent team tree");
  const tree: ReleasedTaskAgentTeamTreeFile = {
    createdAt: isoTimestamp(payload.createdAt, "createdAt"),
    archivedAt: null,
    applicationBinding: null,
    handoffs: normalizeCollaborationHandoffs(payload.handoffs),
    rootTeam: parseRootTeam(payload.rootTeam),
    taskAgent: parseReleasedTaskAgentSection(payload.taskAgent),
  };
  if (tree.rootTeam.teamRunId !== expectedTeamRunId) {
    throw new Error(`Task agent team tree '${tree.rootTeam.teamRunId}' does not match '${expectedTeamRunId}'.`);
  }
  if (tree.taskAgent.address !== tree.rootTeam.address) {
    throw new Error("A task agent team's address and its taskAgent address differ.");
  }
  return deepFreeze(tree);
};

// ---- writers (`task-agent-own-records.ts`) ----------------------------------------------------------------------

const section = (input: Readonly<{
  coordinatingRun: ReleasedTaskAgentCoordinatingRun;
  record: TaskExecution;
  origin: ReleasedTaskAgentOrigin;
  launchSource?: LaunchConfigurationSource;
  userLaunchSelection?: UserLaunchSelection;
}>): ReleasedTaskAgentSection => ({
  coordinatingRun: input.coordinatingRun,
  ...(input.record.delegatorAgentRunId === undefined ? {} : { delegatorAgentRunId: input.record.delegatorAgentRunId }),
  address: input.record.address,
  origin: input.origin,
  ...(input.launchSource === undefined ? {} : { launchSource: input.launchSource }),
  ...(input.userLaunchSelection === undefined ? {} : { userLaunchSelection: input.userLaunchSelection }),
});

const launchFields = (launch: AgentLaunchConfiguration | null) => ({
  workspaceRootPath: launch?.workspaceRootPath ?? null,
  llmModelIdentifier: launch?.llmModelIdentifier ?? null,
  llmConfig: launch?.llmConfig ?? null,
  autoExecuteTools: launch?.autoExecuteTools ?? null,
  runtimeKind: launch?.runtimeKind ?? null,
});

export const releasedTaskAgentOwnMetadata = (input: Readonly<{
  record: TaskAgentExecution;
  coordinatingRun: ReleasedTaskAgentCoordinatingRun;
  memoryDir: string;
  resolvePlace: ReleasedConfiguredPlaceResolver;
  existing: ReleasedTaskAgentRunMetadata | null;
}>): ReleasedTaskAgentRunMetadata => {
  const { record } = input;
  const common = { runId: record.agentRunId, memoryDir: input.memoryDir, platformAgentRunId: record.platformAgentRunId, startedAt: record.startedAt };
  if (record.source) {
    return {
      ...common,
      agentDefinitionId: record.source.agentDefinitionId,
      ...launchFields(record.source.launchConfiguration),
      taskAgent: section({ ...input, origin: "catalog", launchSource: record.source.launchSource, userLaunchSelection: record.userLaunchSelection }),
    };
  }
  const place = input.resolvePlace(record.address);
  const placeAgent = place && "agentRunId" in place ? place : null;
  const agentDefinitionId = input.existing?.agentDefinitionId ?? placeAgent?.agentDefinitionId;
  if (!agentDefinitionId) throw new Error(`Task agent '${record.agentRunId}' has no source and no configured place at '${record.address}'.`);
  return {
    ...common,
    agentDefinitionId,
    ...launchFields(input.existing ? releasedTaskAgentStartedLaunch(input.existing) : placeAgent?.launchConfiguration ?? null),
    taskAgent: section({ ...input, origin: "configured_place", userLaunchSelection: record.userLaunchSelection }),
  };
};

const handoffsWithin = (handoffs: readonly CollaborationHandoff[], addresses: ReadonlySet<string>): CollaborationHandoff[] =>
  handoffs.filter((handoff) => addresses.has(handoff.from) && addresses.has(handoff.to));

export const releasedTaskAgentTeamOwnTree = (input: Readonly<{
  record: TaskTeamExecution;
  coordinatingRun: ReleasedTaskAgentCoordinatingRun;
  resolvePlace: ReleasedConfiguredPlaceResolver;
  treeHandoffs: readonly CollaborationHandoff[];
  existing: ReleasedTaskAgentTeamTreeFile | null;
}>): ReleasedTaskAgentTeamTreeFile => {
  const { record } = input;
  if (record.taskExecutions.length > 0) {
    throw new Error(`Task TeamRun '${record.teamRunId}' holds task executions; they belong to the coordinating run.`);
  }
  const userLaunchSelection = (member: TaskTeamExecution["members"][number]) =>
    member.userLaunchSelection === undefined ? {} : { userLaunchSelection: member.userLaunchSelection };
  if (record.source) {
    const source = record.source;
    const sourceMember = (address: AgentTeamAddress): TaskTeamExecutionSourceMember => {
      const found = source.members.find((member) => member.address === address);
      if (!found) throw new Error(`Task TeamRun '${record.teamRunId}' member '${address}' is not in its source.`);
      return found;
    };
    return {
      createdAt: record.startedAt,
      archivedAt: null,
      applicationBinding: null,
      handoffs: source.handoffs,
      rootTeam: {
        address: record.address,
        teamDefinitionId: source.teamDefinitionId,
        teamRunId: record.teamRunId,
        coordinatorAddress: source.coordinatorAddress,
        defaultLaunchConfiguration: source.defaultLaunchConfiguration,
        members: record.members.map((member): ReleasedTaskAgentTeamMemberNode => {
          const definition = sourceMember(member.address);
          return {
            address: member.address,
            agentDefinitionId: definition.agentDefinitionId,
            agentRunId: member.agentRunId,
            platformAgentRunId: member.platformAgentRunId,
            role: null,
            description: null,
            ...(definition.launchConfiguration === undefined ? {} : { launchConfiguration: definition.launchConfiguration }),
            ...(definition.launchSource === undefined ? {} : { launchSource: definition.launchSource }),
            ...userLaunchSelection(member),
          };
        }),
        taskExecutions: [],
      },
      taskAgent: section({ ...input, origin: "catalog", launchSource: source.defaultLaunchSource, userLaunchSelection: record.userTeamLaunchSelection }),
    };
  }
  const place = input.resolvePlace(record.address);
  const placeTeam = place && "teamRunId" in place ? place : null;
  const existing = input.existing?.rootTeam ?? null;
  if (!placeTeam && !existing) throw new Error(`Task TeamRun '${record.teamRunId}' has no source and no configured place at '${record.address}'.`);
  const memberFacts = (address: AgentTeamAddress) =>
    existing?.members.find((member) => member.address === address)
    ?? placeTeam?.members.find((member) => member.address === address)
    ?? null;
  return {
    createdAt: record.startedAt,
    archivedAt: null,
    applicationBinding: null,
    handoffs: input.existing?.handoffs ?? handoffsWithin(input.treeHandoffs, new Set(placeTeam!.members.map((member) => member.address))),
    rootTeam: {
      address: record.address,
      teamDefinitionId: existing?.teamDefinitionId ?? placeTeam!.teamDefinitionId,
      teamRunId: record.teamRunId,
      coordinatorAddress: existing?.coordinatorAddress ?? placeTeam!.coordinatorAddress,
      defaultLaunchConfiguration: existing?.defaultLaunchConfiguration ?? placeTeam!.defaultLaunchConfiguration,
      members: record.members.map((member): ReleasedTaskAgentTeamMemberNode => {
        const facts = memberFacts(member.address);
        if (!facts) throw new Error(`Task TeamRun '${record.teamRunId}' member '${member.address}' is not in its configured place.`);
        return {
          address: member.address,
          agentDefinitionId: facts.agentDefinitionId,
          agentRunId: member.agentRunId,
          platformAgentRunId: member.platformAgentRunId,
          role: null,
          description: null,
          ...(facts.launchConfiguration === undefined ? {} : { launchConfiguration: facts.launchConfiguration }),
          ...("launchSource" in facts && facts.launchSource !== undefined ? { launchSource: facts.launchSource } : {}),
          ...userLaunchSelection(member),
        };
      }),
      taskExecutions: [],
    },
    taskAgent: section({ ...input, origin: "configured_place", userLaunchSelection: record.userTeamLaunchSelection }),
  };
};

// ---- files (`task-agent-own-files.ts`, `agent-run-metadata-store.ts`) ------------------------------------------

export type ReleasedOwnFileReadState<T> =
  | Readonly<{ kind: "present"; value: T }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "unreadable"; error: Error }>;

const asError = (error: unknown): Error => error instanceof Error ? error : new Error(String(error));
const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const readState = async <T>(filePath: string, parse: (parsed: unknown) => T): Promise<ReleasedOwnFileReadState<T>> => {
  let text: string;
  try { text = await fs.readFile(filePath, "utf-8"); }
  catch (error) { return isMissing(error) ? { kind: "missing" } : { kind: "unreadable", error: asError(error) }; }
  try {
    const parsed: unknown = JSON.parse(text);
    // A run's file without a `taskAgent` section is not a task agent's own file (G1, G2).
    if (!hasReleasedTaskAgentSection(parsed)) return { kind: "missing" };
    return { kind: "present", value: parse(parsed) };
  } catch (error) {
    return { kind: "unreadable", error: asError(error) };
  }
};

/**
 * The task agents' own files under one memory root, read and written in their released shape: an agent's
 * `run_metadata.json` at `agents/<id>/`, a task agent team's tree at `agent_teams/<id>/`. A team's own message
 * log is created first when missing, as the released writer did (`createTeamLog`).
 */
export class ReleasedTaskAgentOwnFiles {
  private readonly layout: AgentMemoryLayout;

  constructor(
    memoryRoot: string,
    private readonly writer: AtomicRunPackageFileCommitWriter,
    private readonly createTeamLog: (teamRunId: string) => Promise<RunPackageFileWriteResult | null>,
  ) {
    this.layout = new AgentMemoryLayout(memoryRoot);
  }

  agentMemoryDir(agentRunId: string): string {
    return this.layout.getAgentRunMemoryDirPath(TASK_AGENT_PLACEMENT, agentRunId);
  }

  teamDir(teamRunId: string): string {
    return this.layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] });
  }

  readAgent(agentRunId: string): Promise<ReleasedOwnFileReadState<ReleasedTaskAgentRunMetadata>> {
    return readState(path.join(this.layout.getStandaloneRunDirPath(agentRunId), RELEASED_TASK_AGENT_RUN_METADATA_FILE),
      (parsed) => parseReleasedTaskAgentRunMetadata(parsed, agentRunId));
  }

  readTeam(teamRunId: string): Promise<ReleasedOwnFileReadState<ReleasedTaskAgentTeamTreeFile>> {
    return readState(path.join(this.teamDir(teamRunId), RELEASED_TASK_AGENT_TEAM_TREE_FILE),
      (parsed) => validateReleasedTaskAgentTeamTreePayload(parsed, teamRunId));
  }

  writeAgent(metadata: ReleasedTaskAgentRunMetadata): Promise<RunPackageFileWriteResult> {
    const normalized = parseReleasedTaskAgentRunMetadata(metadata, metadata.runId.trim());
    return this.writer.write({
      file: "task_agent_run_metadata",
      filePath: path.join(this.layout.getStandaloneRunDirPath(normalized.runId), RELEASED_TASK_AGENT_RUN_METADATA_FILE),
      payload: normalized,
    });
  }

  async writeTeam(tree: ReleasedTaskAgentTeamTreeFile): Promise<RunPackageFileWriteResult> {
    const teamRunId = tree.rootTeam.teamRunId;
    const log = await this.createTeamLog(teamRunId);
    if (log && log.outcome !== "committed") return log;
    return this.writer.write({
      file: "task_agent_team_tree",
      filePath: path.join(this.teamDir(teamRunId), RELEASED_TASK_AGENT_TEAM_TREE_FILE),
      payload: validateReleasedTaskAgentTeamTreePayload(tree, teamRunId),
    });
  }
}

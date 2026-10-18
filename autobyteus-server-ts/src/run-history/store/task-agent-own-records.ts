import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type {
  TaskAgentTeamMemberNode,
  TaskAgentTeamTreeFile,
} from "../../agent-team-execution/domain/task-agent-team-tree.js";
import type {
  ConfiguredAgentExecutionNode,
  ConfiguredTeamExecutionNode,
  TaskAgentExecution,
  TaskExecution,
  TaskTeamExecution,
  TaskTeamExecutionSourceMember,
} from "../domain/run-execution-tree-shared-records.js";
import type { TaskAgentCoordinatingRun, TaskAgentRunMetadata, TaskAgentSection } from "./agent-run-metadata-types.js";
import { taskAgentStartedLaunch } from "./task-agent-own-file-schema.js";

/**
 * The mapping between today's in-memory task records and their on-disk form (design D-1, contract §3):
 * the coordinating tree keeps a link, the task agent's own file keeps its facts. Pure: no IO.
 */

/** The link a coordinating tree keeps for a task agent (contract §3.3). */
export type TaskAgentLink = Readonly<{ address: AgentTeamAddress; agentRunId: string; delegatorAgentRunId?: string; startedAt: string }>;
export type TaskTeamLink = Readonly<{ address: AgentTeamAddress; teamRunId: string; delegatorAgentRunId?: string; startedAt: string }>;
export type TaskExecutionLink = TaskAgentLink | TaskTeamLink;

/** The configured place a task agent without `source` was started from (U-4), resolved in its coordinating tree. */
export type ConfiguredPlaceResolver = (address: AgentTeamAddress) => ConfiguredAgentExecutionNode | ConfiguredTeamExecutionNode | null;

export const taskExecutionRunId = (task: Readonly<{ agentRunId: string } | { teamRunId: string }>): string =>
  "agentRunId" in task ? task.agentRunId : task.teamRunId;

/** On disk, a full record carries its facts (`platformAgentRunId` / `members`); a link never does. */
export const isTaskExecutionLinkEntry = (entry: Record<string, unknown>): boolean =>
  !("platformAgentRunId" in entry) && !("members" in entry);

export const taskExecutionLinkOf = (record: TaskExecution): TaskExecutionLink => {
  const delegator = record.delegatorAgentRunId === undefined ? {} : { delegatorAgentRunId: record.delegatorAgentRunId };
  return "agentRunId" in record
    ? { address: record.address, agentRunId: record.agentRunId, ...delegator, startedAt: record.startedAt }
    : { address: record.address, teamRunId: record.teamRunId, ...delegator, startedAt: record.startedAt };
};

const section = (input: Readonly<{
  coordinatingRun: TaskAgentCoordinatingRun;
  record: TaskExecution;
  origin: TaskAgentSection["origin"];
  launchSource?: TaskAgentSection["launchSource"];
  userLaunchSelection?: TaskAgentSection["userLaunchSelection"];
}>): TaskAgentSection => ({
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

/**
 * A task agent's own `run_metadata.json` from its record (contract §3.1). A catalog copy records its
 * definition and started launch from `source`; a copy of a configured place records the place's
 * definition, and its started launch only when first written (an existing file keeps what it recorded).
 */
export const taskAgentOwnMetadata = (input: Readonly<{
  record: TaskAgentExecution;
  coordinatingRun: TaskAgentCoordinatingRun;
  memoryDir: string;
  resolvePlace: ConfiguredPlaceResolver;
  existing: TaskAgentRunMetadata | null;
}>): TaskAgentRunMetadata => {
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
    ...launchFields(input.existing ? taskAgentStartedLaunch(input.existing) : placeAgent?.launchConfiguration ?? null),
    taskAgent: section({ ...input, origin: "configured_place", userLaunchSelection: record.userLaunchSelection }),
  };
};

/** Today's record of an agent task agent from its link and own file (contract §3.1, U-4). */
export const composeTaskAgentRecord = (link: TaskAgentLink, own: TaskAgentRunMetadata): TaskAgentExecution => {
  const launch = taskAgentStartedLaunch(own);
  if (own.taskAgent.origin === "catalog" && !launch) throw new Error(`Catalog task agent '${own.runId}' has no started launch.`);
  return {
    address: link.address,
    agentRunId: link.agentRunId,
    platformAgentRunId: own.platformAgentRunId,
    ...(link.delegatorAgentRunId === undefined ? {} : { delegatorAgentRunId: link.delegatorAgentRunId }),
    startedAt: link.startedAt,
    ...(own.taskAgent.origin === "catalog"
      ? { source: {
          kind: "agent" as const,
          agentDefinitionId: own.agentDefinitionId,
          launchConfiguration: launch!,
          ...(own.taskAgent.launchSource === undefined ? {} : { launchSource: own.taskAgent.launchSource }),
        } }
      : {}),
    ...(own.taskAgent.userLaunchSelection === undefined ? {} : { userLaunchSelection: own.taskAgent.userLaunchSelection }),
  };
};

const handoffsWithin = (handoffs: readonly CollaborationHandoff[], addresses: ReadonlySet<string>): CollaborationHandoff[] =>
  handoffs.filter((handoff) => addresses.has(handoff.from) && addresses.has(handoff.to));

/**
 * A task agent team's own tree from its record (contract §3.2, U-3). A catalog copy records its source;
 * a copy of a configured place records the place's team facts when first written. `taskExecutions` of
 * a team record must be empty: task agents its members create are linked by the coordinating run (U-5).
 */
export const taskAgentTeamOwnTree = (input: Readonly<{
  record: TaskTeamExecution;
  coordinatingRun: TaskAgentCoordinatingRun;
  resolvePlace: ConfiguredPlaceResolver;
  treeHandoffs: readonly CollaborationHandoff[];
  existing: TaskAgentTeamTreeFile | null;
}>): TaskAgentTeamTreeFile => {
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
        members: record.members.map((member): TaskAgentTeamMemberNode => {
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
      members: record.members.map((member): TaskAgentTeamMemberNode => {
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

/** Today's record of a task agent team from its link and own tree (contract §3.2, U-3, U-4). */
export const composeTaskTeamRecord = (link: TaskTeamLink, own: TaskAgentTeamTreeFile): TaskTeamExecution => {
  const root = own.rootTeam;
  return {
    address: link.address,
    teamRunId: link.teamRunId,
    members: root.members.map((member) => ({
      address: member.address,
      agentRunId: member.agentRunId,
      platformAgentRunId: member.platformAgentRunId,
      ...(member.userLaunchSelection === undefined ? {} : { userLaunchSelection: member.userLaunchSelection }),
    })),
    taskExecutions: [],
    ...(link.delegatorAgentRunId === undefined ? {} : { delegatorAgentRunId: link.delegatorAgentRunId }),
    startedAt: link.startedAt,
    ...(own.taskAgent.origin === "catalog"
      ? { source: {
          kind: "agent_team" as const,
          teamDefinitionId: root.teamDefinitionId,
          coordinatorAddress: root.coordinatorAddress,
          members: root.members.map((member) => ({
            address: member.address,
            agentDefinitionId: member.agentDefinitionId,
            ...(member.launchConfiguration === undefined ? {} : { launchConfiguration: member.launchConfiguration }),
            ...(member.launchSource === undefined ? {} : { launchSource: member.launchSource }),
          })),
          handoffs: own.handoffs,
          defaultLaunchConfiguration: root.defaultLaunchConfiguration,
          ...(own.taskAgent.launchSource === undefined ? {} : { defaultLaunchSource: own.taskAgent.launchSource }),
        } }
      : {}),
    ...(own.taskAgent.userLaunchSelection === undefined ? {} : { userTeamLaunchSelection: own.taskAgent.userLaunchSelection }),
  };
};

import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type {
  TaskAgentTeamMemberNode,
  TaskAgentTeamTreeFile,
} from "../../agent-team-execution/domain/task-agent-team-tree.js";
import type {
  TaskAgentExecution,
  TaskExecution,
  TaskTeamExecution,
  TaskTeamExecutionSourceMember,
} from "../domain/run-execution-tree-shared-records.js";
import type { TaskAgentCoordinatingRun, TaskAgentRunMetadata, TaskAgentSection } from "./agent-run-metadata-types.js";
import { taskAgentStartedLaunch } from "./task-agent-own-file-schema.js";

/**
 * The mapping between today's in-memory task records and a delegated run's own file (design D-1, D-2, contract §3):
 * the own file keeps every fact of the record, its address, delegator and start among them; a coordinating run
 * stores nothing of a local delegated run (CM-8). One branch each way. Pure: no IO.
 */

export const taskExecutionRunId = (task: Readonly<{ agentRunId: string } | { teamRunId: string }>): string =>
  "agentRunId" in task ? task.agentRunId : task.teamRunId;

const LINK_KEYS = new Set(["address", "agentRunId", "teamRunId", "startedAt", "delegatorAgentRunId"]);
/**
 * Whether a stored local entry is a link by its exact key set (design D-3, SR-008): `address`, exactly one of
 * `agentRunId` / `teamRunId`, `startedAt`, and optionally `delegatorAgentRunId`. Any other key (a full record's facts,
 * nested runs) means it is not a link. Only the save uses it, to decide what it may leave out.
 */
export const isTaskExecutionLinkEntry = (entry: Record<string, unknown>): boolean => {
  const keys = Object.keys(entry);
  return keys.every((key) => LINK_KEYS.has(key)) && "address" in entry && "startedAt" in entry
    && ("agentRunId" in entry) !== ("teamRunId" in entry);
};

const section = (input: Readonly<{
  coordinatingRun: TaskAgentCoordinatingRun;
  record: TaskExecution;
  launchSource?: TaskAgentSection["launchSource"];
  userLaunchSelection?: TaskAgentSection["userLaunchSelection"];
  pendingRuntimeSwitch?: TaskAgentSection["pendingRuntimeSwitch"];
}>): TaskAgentSection => ({
  coordinatingRun: input.coordinatingRun,
  ...(input.record.delegatorAgentRunId === undefined ? {} : { delegatorAgentRunId: input.record.delegatorAgentRunId }),
  address: input.record.address,
  ...(input.launchSource === undefined ? {} : { launchSource: input.launchSource }),
  ...(input.userLaunchSelection === undefined ? {} : { userLaunchSelection: input.userLaunchSelection }),
  ...(input.pendingRuntimeSwitch === undefined ? {} : { pendingRuntimeSwitch: input.pendingRuntimeSwitch }),
});

/** A task agent's own `run_metadata.json` from its record (contract §3.1): its definition and started launch from `source`. */
export const taskAgentOwnMetadata = (input: Readonly<{
  record: TaskAgentExecution;
  coordinatingRun: TaskAgentCoordinatingRun;
  memoryDir: string;
}>): TaskAgentRunMetadata => {
  const { record } = input;
  const launch = record.source.launchConfiguration;
  return {
    runId: record.agentRunId,
    agentDefinitionId: record.source.agentDefinitionId,
    workspaceRootPath: launch.workspaceRootPath,
    memoryDir: input.memoryDir,
    llmModelIdentifier: launch.llmModelIdentifier,
    llmConfig: launch.llmConfig,
    autoExecuteTools: launch.autoExecuteTools,
    runtimeKind: launch.runtimeKind,
    platformAgentRunId: record.platformAgentRunId,
    startedAt: record.startedAt,
    taskAgent: section({
      ...input,
      launchSource: record.source.launchSource,
      userLaunchSelection: record.userLaunchSelection,
      pendingRuntimeSwitch: record.pendingRuntimeSwitch,
    }),
  };
};

/** Today's record of an agent task agent from its own file (contract §3.1). */
export const composeTaskAgentRecord = (own: TaskAgentRunMetadata): TaskAgentExecution => ({
  address: own.taskAgent.address,
  agentRunId: own.runId,
  platformAgentRunId: own.platformAgentRunId,
  ...(own.taskAgent.delegatorAgentRunId === undefined ? {} : { delegatorAgentRunId: own.taskAgent.delegatorAgentRunId }),
  startedAt: own.startedAt,
  source: {
    kind: "agent",
    agentDefinitionId: own.agentDefinitionId,
    launchConfiguration: taskAgentStartedLaunch(own),
    ...(own.taskAgent.launchSource === undefined ? {} : { launchSource: own.taskAgent.launchSource }),
  },
  ...(own.taskAgent.userLaunchSelection === undefined ? {} : { userLaunchSelection: own.taskAgent.userLaunchSelection }),
  ...(own.taskAgent.pendingRuntimeSwitch === undefined ? {} : { pendingRuntimeSwitch: own.taskAgent.pendingRuntimeSwitch }),
});

/**
 * A task agent team's own tree from its record (contract §3.2, U-3): its source, each member with its complete
 * launch and `followsTeam` (D-5). `taskExecutions` of a team record must be empty: task agents its members
 * create are linked by the coordinating run (U-5).
 */
export const taskAgentTeamOwnTree = (input: Readonly<{
  record: TaskTeamExecution;
  coordinatingRun: TaskAgentCoordinatingRun;
}>): TaskAgentTeamTreeFile => {
  const { record } = input;
  if (record.taskExecutions.length > 0) {
    throw new Error(`Task TeamRun '${record.teamRunId}' holds task executions; they belong to the coordinating run.`);
  }
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
          launchConfiguration: definition.launchConfiguration,
          followsTeam: definition.followsTeam,
          ...(definition.launchSource === undefined ? {} : { launchSource: definition.launchSource }),
          ...(member.userLaunchSelection === undefined ? {} : { userLaunchSelection: member.userLaunchSelection }),
          ...(member.pendingRuntimeSwitch === undefined ? {} : { pendingRuntimeSwitch: member.pendingRuntimeSwitch }),
        };
      }),
      taskExecutions: [],
    },
    taskAgent: section({ ...input, launchSource: source.defaultLaunchSource, userLaunchSelection: record.userTeamLaunchSelection }),
  };
};

/** Today's record of a task agent team from its own tree (contract §3.2, U-3). */
export const composeTaskTeamRecord = (own: TaskAgentTeamTreeFile): TaskTeamExecution => {
  const root = own.rootTeam;
  return {
    address: own.taskAgent.address,
    teamRunId: root.teamRunId,
    members: root.members.map((member) => ({
      address: member.address,
      agentRunId: member.agentRunId,
      platformAgentRunId: member.platformAgentRunId,
      ...(member.userLaunchSelection === undefined ? {} : { userLaunchSelection: member.userLaunchSelection }),
      ...(member.pendingRuntimeSwitch === undefined ? {} : { pendingRuntimeSwitch: member.pendingRuntimeSwitch }),
    })),
    taskExecutions: [],
    ...(own.taskAgent.delegatorAgentRunId === undefined ? {} : { delegatorAgentRunId: own.taskAgent.delegatorAgentRunId }),
    startedAt: own.createdAt,
    source: {
      kind: "agent_team",
      teamDefinitionId: root.teamDefinitionId,
      coordinatorAddress: root.coordinatorAddress,
      members: root.members.map((member) => ({
        address: member.address,
        agentDefinitionId: member.agentDefinitionId,
        launchConfiguration: member.launchConfiguration,
        followsTeam: member.followsTeam,
        ...(member.launchSource === undefined ? {} : { launchSource: member.launchSource }),
      })),
      handoffs: own.handoffs,
      defaultLaunchConfiguration: root.defaultLaunchConfiguration,
      ...(own.taskAgent.launchSource === undefined ? {} : { defaultLaunchSource: own.taskAgent.launchSource }),
    },
    ...(own.taskAgent.userLaunchSelection === undefined ? {} : { userTeamLaunchSelection: own.taskAgent.userLaunchSelection }),
  };
};

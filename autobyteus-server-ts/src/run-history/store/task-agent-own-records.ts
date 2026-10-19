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
 * The mapping between today's in-memory task records and their on-disk form (design D-1, contract §3):
 * the coordinating tree keeps a link, the task agent's own file keeps its facts, its `source` among them.
 * One branch each way (D-3). Pure: no IO.
 */

/** The link a coordinating tree keeps for a task agent (contract §3.3). */
export type TaskAgentLink = Readonly<{ address: AgentTeamAddress; agentRunId: string; delegatorAgentRunId?: string; startedAt: string }>;
export type TaskTeamLink = Readonly<{ address: AgentTeamAddress; teamRunId: string; delegatorAgentRunId?: string; startedAt: string }>;
export type TaskExecutionLink = TaskAgentLink | TaskTeamLink;

export const taskExecutionRunId = (task: Readonly<{ agentRunId: string } | { teamRunId: string }>): string =>
  "agentRunId" in task ? task.agentRunId : task.teamRunId;

/** On disk, a full record carries its facts (`platformAgentRunId` / `members`); a link never does. */
export const isTaskExecutionLinkEntry = (entry: Record<string, unknown>): boolean =>
  !("platformAgentRunId" in entry) && !("members" in entry);

/** The link of a record: only its address, identity, delegator and start (any record shape that has them). */
export const taskExecutionLinkOf = (
  record: Pick<TaskAgentExecution, "address" | "agentRunId" | "delegatorAgentRunId" | "startedAt">
    | Pick<TaskTeamExecution, "address" | "teamRunId" | "delegatorAgentRunId" | "startedAt">,
): TaskExecutionLink => {
  const delegator = record.delegatorAgentRunId === undefined ? {} : { delegatorAgentRunId: record.delegatorAgentRunId };
  return "agentRunId" in record
    ? { address: record.address, agentRunId: record.agentRunId, ...delegator, startedAt: record.startedAt }
    : { address: record.address, teamRunId: record.teamRunId, ...delegator, startedAt: record.startedAt };
};

const section = (input: Readonly<{
  coordinatingRun: TaskAgentCoordinatingRun;
  record: TaskExecution;
  launchSource?: TaskAgentSection["launchSource"];
  userLaunchSelection?: TaskAgentSection["userLaunchSelection"];
}>): TaskAgentSection => ({
  coordinatingRun: input.coordinatingRun,
  ...(input.record.delegatorAgentRunId === undefined ? {} : { delegatorAgentRunId: input.record.delegatorAgentRunId }),
  address: input.record.address,
  ...(input.launchSource === undefined ? {} : { launchSource: input.launchSource }),
  ...(input.userLaunchSelection === undefined ? {} : { userLaunchSelection: input.userLaunchSelection }),
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
    taskAgent: section({ ...input, launchSource: record.source.launchSource, userLaunchSelection: record.userLaunchSelection }),
  };
};

/** Today's record of an agent task agent from its link and own file (contract §3.1). */
export const composeTaskAgentRecord = (link: TaskAgentLink, own: TaskAgentRunMetadata): TaskAgentExecution => ({
  address: link.address,
  agentRunId: link.agentRunId,
  platformAgentRunId: own.platformAgentRunId,
  ...(link.delegatorAgentRunId === undefined ? {} : { delegatorAgentRunId: link.delegatorAgentRunId }),
  startedAt: link.startedAt,
  source: {
    kind: "agent",
    agentDefinitionId: own.agentDefinitionId,
    launchConfiguration: taskAgentStartedLaunch(own),
    ...(own.taskAgent.launchSource === undefined ? {} : { launchSource: own.taskAgent.launchSource }),
  },
  ...(own.taskAgent.userLaunchSelection === undefined ? {} : { userLaunchSelection: own.taskAgent.userLaunchSelection }),
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
        };
      }),
      taskExecutions: [],
    },
    taskAgent: section({ ...input, launchSource: source.defaultLaunchSource, userLaunchSelection: record.userTeamLaunchSelection }),
  };
};

/** Today's record of a task agent team from its link and own tree (contract §3.2, U-3). */
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

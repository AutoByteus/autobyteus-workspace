import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TaskAgentTeamTreeFile } from "../../agent-team-execution/domain/task-agent-team-tree.js";
import type {
  TaskAgentExecution,

  TaskTeamExecution,

} from "../domain/run-execution-tree-shared-records.js";
import type {  TaskAgentRunMetadata } from "./agent-run-metadata-types.js";
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

import type { TaskExecutionLifetimeStamp } from "./task-execution-lifetime.js";
import type {
  TaskAgentExecution,
  TaskAgentExecutionSource,
  TaskTeamExecution,
  TaskTeamExecutionSource,
  TaskTeamMemberExecution,
} from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRunAgentTeamNode, TeamRunNode } from "../../../agent-team-execution/domain/team-run-config.js";

const member = (node: TeamRunNode): TaskTeamMemberExecution => node.kind === "agent"
  ? Object.freeze({
      address: node.address,
      agentRunId: node.agentRunId,
      platformAgentRunId: node.platformAgentRunId,
    })
  : Object.freeze({
      address: node.address,
      teamRunId: node.teamRunId,
      members: Object.freeze(node.children.map(member)),
      taskExecutions: Object.freeze([]),
    });

export const projectTaskAgentExecution = (input: {
  address: TaskAgentExecution["address"];
  agentRunId: string;
  delegatorAgentRunId: string;
  startedAt: string;
  taskLifetime?: TaskExecutionLifetimeStamp;
  /** Only for a copy started from the catalog. */
  source?: TaskAgentExecutionSource | null;
}): TaskAgentExecution => Object.freeze({
  address: input.address,
  agentRunId: input.agentRunId,
  platformAgentRunId: null,
  delegatorAgentRunId: input.delegatorAgentRunId,
  startedAt: input.startedAt,
  ...(input.source ? { source: input.source } : {}),
  ...(input.taskLifetime ? { taskLifetime: input.taskLifetime } : {}),
});

export const projectTaskTeamExecution = (input: {
  node: TeamRunAgentTeamNode;
  delegatorAgentRunId: string;
  startedAt: string;
  taskLifetime?: TaskExecutionLifetimeStamp;
  /** Only for a copy started from the catalog. */
  source?: TaskTeamExecutionSource | null;
}): TaskTeamExecution => Object.freeze({
  address: input.node.address,
  teamRunId: input.node.teamRunId,
  members: Object.freeze(input.node.children.map(member)),
  taskExecutions: Object.freeze([]),
  delegatorAgentRunId: input.delegatorAgentRunId,
  startedAt: input.startedAt,
  ...(input.source ? { source: input.source } : {}),
  ...(input.taskLifetime ? { taskLifetime: input.taskLifetime } : {}),
});

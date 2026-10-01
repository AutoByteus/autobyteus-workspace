import type {
  TaskAgentExecution,
  TaskTeamExecution,
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
}): TaskAgentExecution => Object.freeze({
  address: input.address,
  agentRunId: input.agentRunId,
  platformAgentRunId: null,
  delegatorAgentRunId: input.delegatorAgentRunId,
  startedAt: input.startedAt,
});

export const projectTaskTeamExecution = (input: {
  node: TeamRunAgentTeamNode;
  delegatorAgentRunId: string;
  startedAt: string;
}): TaskTeamExecution => Object.freeze({
  address: input.node.address,
  teamRunId: input.node.teamRunId,
  members: Object.freeze(input.node.children.map(member)),
  taskExecutions: Object.freeze([]),
  delegatorAgentRunId: input.delegatorAgentRunId,
  startedAt: input.startedAt,
});

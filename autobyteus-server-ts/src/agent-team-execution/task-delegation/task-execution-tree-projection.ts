import type {
  TaskAgentExecution,
  TaskTeamExecution,
  TaskTeamMemberExecution,
} from "../domain/team-run-execution-tree.js";
import type { TeamRunAgentTeamNode, TeamRunNode } from "../domain/team-run-config.js";

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
  startedAt: string;
}): TaskAgentExecution => Object.freeze({
  address: input.address,
  agentRunId: input.agentRunId,
  platformAgentRunId: null,
  startedAt: input.startedAt,
  settledAt: null,
});

export const projectTaskTeamExecution = (input: {
  node: TeamRunAgentTeamNode;
  startedAt: string;
}): TaskTeamExecution => Object.freeze({
  address: input.node.address,
  teamRunId: input.node.teamRunId,
  members: Object.freeze(input.node.children.map(member)),
  taskExecutions: Object.freeze([]),
  startedAt: input.startedAt,
  settledAt: null,
});

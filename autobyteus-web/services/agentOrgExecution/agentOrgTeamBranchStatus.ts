import type { AgentStatus } from '~/types/agent/AgentStatus';
import type {
  AgentOrgConfiguredTeamNode,
  AgentOrgTaskExecutionNode,
} from '~/types/collaboration/agentOrgExecution';
import {
  foldTeamAggregateStatus,
  type TeamStatusAuthority,
} from '~/utils/workspaceTeamAggregateStatus';

/** A delegated child's agents: a task Agent, or a task Team's members (Teams are flat) and its own children. */
const appendTaskAgentRunIds = (
  node: AgentOrgTaskExecutionNode,
  runIds: string[],
): void => {
  if ('agentRunId' in node) {
    runIds.push(node.agentRunId);
    return;
  }
  for (const member of node.members) runIds.push(member.agentRunId);
  for (const task of node.taskExecutions) appendTaskAgentRunIds(task, runIds);
};

export const projectAgentOrgTeamBranchStatus = (input: Readonly<{
  team: AgentOrgConfiguredTeamNode;
  authority: TeamStatusAuthority;
  statusForAgentRunId(
    agentRunId: string,
  ): AgentStatus | string | null | undefined;
}>): AgentStatus => {
  const agentRunIds = input.team.members.map((member) => member.agentRunId);
  for (const task of input.team.taskExecutions) appendTaskAgentRunIds(task, agentRunIds);
  return foldTeamAggregateStatus(
    agentRunIds.map((agentRunId) => input.statusForAgentRunId(agentRunId)),
    input.authority,
  );
};

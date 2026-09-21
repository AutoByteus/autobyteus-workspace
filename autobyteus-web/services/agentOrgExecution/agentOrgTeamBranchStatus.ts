import type { AgentStatus } from '~/types/agent/AgentStatus';
import type {
  AgentOrgConfiguredTeamNode,
  AgentOrgTaskExecutionNode,
  AgentOrgTaskTeamMember,
} from '~/types/collaboration/agentOrgExecution';
import {
  foldTeamAggregateStatus,
  type TeamStatusAuthority,
} from '~/utils/workspaceTeamAggregateStatus';

type AgentOrgTaskBranchNode = AgentOrgTaskExecutionNode | AgentOrgTaskTeamMember;

const appendTaskAgentRunIds = (
  node: AgentOrgTaskBranchNode,
  runIds: string[],
): void => {
  if ('agentRunId' in node) {
    runIds.push(node.agentRunId);
    return;
  }
  for (const member of node.members) appendTaskAgentRunIds(member, runIds);
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

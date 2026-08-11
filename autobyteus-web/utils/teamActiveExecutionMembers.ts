import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { createTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { hasConversationMessages, isTaskAgentOnlyConversation } from '~/utils/teamTaskAgentConversation';

export interface TeamActiveExecutionMemberEntry { node: TeamMemberNode; depth: number; executionAddress: TeamExecutionAddress }

const stableAddress = (team: AgentTeamContext, memberAddress: string): TeamExecutionAddress =>
  createTeamExecutionAddress({ rootTeamRunId: team.executions.getRootTeamRunId(), memberAddress });
export const contextForTeamNode = (team: AgentTeamContext, node: TeamMemberNode): AgentContext | null =>
  team.executions.getAgentContext(stableAddress(team, node.address));
export const shouldShowMemberConversation = (_node: TeamMemberNode | null | undefined, context: AgentContext | null): boolean =>
  Boolean(context && !isTaskAgentOnlyConversation(context));
export const shouldShowMemberConversationPreview = (node: TeamMemberNode | null | undefined, context: AgentContext | null): boolean =>
  shouldShowMemberConversation(node, context) && hasConversationMessages(context);
const activeStatuses = new Set<AgentStatus>([AgentStatus.Running, AgentStatus.Error]);

export const flattenActiveExecutionMemberNodesForDisplay = (team: AgentTeamContext): TeamActiveExecutionMemberEntry[] =>
  team.executions.listNavigationRows().flatMap((row) => {
    const node = team.topology.getNode(row.executionAddress.memberAddress);
    const context = team.executions.getAgentContext(row.executionAddress);
    if (!node) return [];
    const visible = row.kind === 'task_agent' || row.kind === 'task_team' || row.kind === 'task_team_agent'
      || node.address === team.topology.rootTeam.coordinatorAddress
      || shouldShowMemberConversationPreview(node, context)
      || activeStatuses.has(context?.state.currentStatus as AgentStatus);
    return visible ? [{ node, depth: row.depth, executionAddress: row.executionAddress }] : [];
  });

export const resolveActiveExecutionFocus = (
  team: AgentTeamContext,
  preferred: TeamExecutionAddress = team.executions.getFocusedAddress(),
): TeamExecutionAddress => {
  if (team.executions.hasExecution(preferred) && team.executions.getExecutionSummary(preferred)?.focusable) return preferred;
  const entries = flattenActiveExecutionMemberNodesForDisplay(team);
  return entries.find((entry) => entry.node.address === team.topology.rootTeam.coordinatorAddress)?.executionAddress
    ?? entries.find((entry) => team.executions.getExecutionSummary(entry.executionAddress)?.focusable)?.executionAddress
    ?? stableAddress(team, team.topology.rootTeam.coordinatorAddress);
};

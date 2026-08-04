import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { createTeamExecutionAddress, serializeTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { hasConversationMessages, isTaskAgentOnlyConversation } from '~/utils/teamTaskAgentConversation';

export interface TeamActiveExecutionMemberEntry { node: TeamMemberNode; depth: number }

const addressForNode = (team: AgentTeamContext, node: TeamMemberNode): TeamExecutionAddress =>
  node.executionAddress ?? createTeamExecutionAddress({ rootTeamRunId: team.teamRunId, memberAddress: node.address });

export const contextForTeamNode = (
  team: AgentTeamContext,
  node: TeamMemberNode,
): AgentContext | null => team.agentExecutionsByKey.get(serializeTeamExecutionAddress(addressForNode(team, node))) ?? null;

export const shouldShowMemberConversation = (
  node: TeamMemberNode | null | undefined,
  context: AgentContext | null,
): boolean => Boolean(context && (node?.isTaskExecution || !isTaskAgentOnlyConversation(context)));

export const shouldShowMemberConversationPreview = (
  node: TeamMemberNode | null | undefined,
  context: AgentContext | null,
): boolean => shouldShowMemberConversation(node, context) && hasConversationMessages(context);

const activeStatuses = new Set<AgentStatus>([AgentStatus.Running, AgentStatus.Error]);

export const isActiveExecutionMemberNode = (team: AgentTeamContext, node: TeamMemberNode): boolean => {
  if (node.isTaskExecution || node.address === team.rootTeam.coordinatorAddress) return true;
  const context = contextForTeamNode(team, node);
  if (node.kind === 'agent_team') return false;
  if (isTaskAgentOnlyConversation(context)) return false;
  const status = context?.state.currentStatus ?? node.currentStatus ?? null;
  return shouldShowMemberConversationPreview(node, context) || activeStatuses.has(status as AgentStatus);
};

export const flattenActiveExecutionMemberNodesForDisplay = (
  team: AgentTeamContext,
  nodes: readonly TeamMemberNode[] = team.rootTeam.children,
  depth = 0,
): TeamActiveExecutionMemberEntry[] => nodes.flatMap((node) => {
  const children = node.kind === 'agent_team'
    ? flattenActiveExecutionMemberNodesForDisplay(team, node.children, depth + 1)
    : [];
  return isActiveExecutionMemberNode(team, node) || children.length
    ? [{ node, depth }, ...children]
    : children;
});

export const resolveActiveExecutionFocus = (
  team: AgentTeamContext,
  preferred: TeamExecutionAddress = team.focusedExecutionAddress,
): TeamExecutionAddress => {
  const entries = flattenActiveExecutionMemberNodesForDisplay(team);
  const preferredKey = serializeTeamExecutionAddress(preferred);
  const preferredNode = entries.find(({ node }) =>
    serializeTeamExecutionAddress(addressForNode(team, node)) === preferredKey);
  if (preferredNode) return preferred;
  const coordinator = entries.find(({ node }) => node.address === team.rootTeam.coordinatorAddress);
  return addressForNode(team, coordinator?.node ?? entries[0]?.node ?? team.rootTeam);
};

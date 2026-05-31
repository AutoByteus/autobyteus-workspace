import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';

export interface TeamActiveExecutionMemberEntry {
  node: TeamMemberNode;
  depth: number;
}

const isNonOfflineStatus = (status: AgentStatus | null | undefined): boolean =>
  Boolean(status && status !== AgentStatus.Offline);

const isRuntimeActivityStatus = (status: AgentStatus | null | undefined): boolean =>
  Boolean(status && status !== AgentStatus.Offline && status !== AgentStatus.Initializing);

const getConversationMessages = (context: AgentContext | null): Array<{ type?: string; text?: string }> => {
  const conversation = context?.state?.conversation ?? context?.conversation;
  return Array.isArray(conversation?.messages) ? conversation.messages : [];
};

const isTaskAgentWorkPacketText = (text: string | null | undefined): boolean => {
  const normalized = text?.trim() || '';
  return normalized.includes('You have been activated as task agent') ||
    normalized.includes('Task-agent run:') ||
    normalized.includes('current task-agent instance');
};

const isTaskAgentOnlyConversation = (context: AgentContext | null): boolean => {
  const userMessages = getConversationMessages(context)
    .filter((message) => message.type === 'user');
  return userMessages.length > 0 &&
    userMessages.every((message) => isTaskAgentWorkPacketText(message.text));
};

const hasDirectConversationActivity = (context: AgentContext | null): boolean =>
  getConversationMessages(context).length > 0 && !isTaskAgentOnlyConversation(context);

const hasRuntimeContextActivity = (context: AgentContext | null): boolean => Boolean(
  context && (
    isRuntimeActivityStatus(context.state?.currentStatus) ||
    context.state?.canInterrupt ||
    context.state?.compactionStatus ||
    context.isSending ||
    hasDirectConversationActivity(context)
  ),
);

export const isActiveExecutionMemberNode = (
  teamContext: AgentTeamContext,
  node: TeamMemberNode,
): boolean => {
  if (node.isTaskAgentInstance) {
    return true;
  }

  if (node.memberRouteKey === teamContext.coordinatorMemberRouteKey) {
    return true;
  }

  if (isNonOfflineStatus(node.currentStatus)) {
    return true;
  }

  const context = teamContext.leafAgentContextsByRouteKey.get(node.memberRouteKey) ?? null;
  return hasRuntimeContextActivity(context);
};

export const flattenActiveExecutionMemberNodesForDisplay = (
  teamContext: AgentTeamContext,
  memberTree: readonly TeamMemberNode[] = teamContext.memberTree,
  depth = 0,
): TeamActiveExecutionMemberEntry[] => {
  const sourceTree = Array.isArray(memberTree) ? memberTree : [];
  return sourceTree.flatMap((node) => {
    const childEntries = node.memberKind === 'agent_team'
      ? flattenActiveExecutionMemberNodesForDisplay(teamContext, node.children, depth + 1)
      : [];
    const includeNode = isActiveExecutionMemberNode(teamContext, node) || childEntries.length > 0;

    return includeNode
      ? [{ node, depth }, ...childEntries]
      : childEntries;
  });
};

export const resolveActiveExecutionFocusedMemberRouteKey = (
  teamContext: AgentTeamContext,
  preferredRouteKey: string | null | undefined = teamContext.focusedMemberRouteKey,
): string => {
  const activeEntries = flattenActiveExecutionMemberNodesForDisplay(teamContext);
  const activeRouteKeys = new Set(activeEntries.map((entry) => entry.node.memberRouteKey));
  const preferred = preferredRouteKey?.trim() || '';
  if (preferred && activeRouteKeys.has(preferred)) {
    return preferred;
  }

  const coordinator = teamContext.coordinatorMemberRouteKey?.trim() || '';
  if (coordinator && activeRouteKeys.has(coordinator)) {
    return coordinator;
  }

  return activeEntries[0]?.node.memberRouteKey ?? '';
};

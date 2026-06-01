import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';

export interface TeamActiveExecutionMemberEntry {
  node: TeamMemberNode;
  depth: number;
}

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

export const shouldShowMemberConversation = (
  node: TeamMemberNode | null | undefined,
  context: AgentContext | null,
): boolean => Boolean(
  context &&
  (node?.isTaskAgentInstance || !isTaskAgentOnlyConversation(context))
);

export const shouldShowMemberConversationPreview = (
  node: TeamMemberNode | null | undefined,
  context: AgentContext | null,
): boolean => shouldShowMemberConversation(node, context) && getConversationMessages(context).length > 0;

const getTaskAgentParentRouteKey = (node: TeamMemberNode): string => (
  node.logicalMemberRouteKey?.trim() ||
  node.memberPath.slice(0, -1).join('/').trim()
);

const collectTaskAgentNodes = (nodes: readonly TeamMemberNode[]): TeamMemberNode[] =>
  nodes.flatMap((node) => [
    ...(node.isTaskAgentInstance ? [node] : []),
    ...(node.memberKind === 'agent_team' ? collectTaskAgentNodes(node.children) : []),
  ]);

export const isActiveExecutionMemberNode = (
  _teamContext: AgentTeamContext,
  node: TeamMemberNode,
): boolean => {
  return Boolean(node.memberRouteKey);
};

export const flattenActiveExecutionMemberNodesForDisplay = (
  teamContext: AgentTeamContext,
  memberTree: readonly TeamMemberNode[] = teamContext.memberTree,
  depth = 0,
): TeamActiveExecutionMemberEntry[] => {
  const sourceTree = Array.isArray(memberTree) ? memberTree : [];
  const taskAgentNodes = collectTaskAgentNodes(sourceTree);

  const taskAgentChildrenFor = (parentRouteKey: string, childDepth: number): TeamActiveExecutionMemberEntry[] =>
    taskAgentNodes
      .filter((candidate) => getTaskAgentParentRouteKey(candidate) === parentRouteKey)
      .map((candidate) => ({ node: candidate, depth: childDepth }));

  const visit = (nodes: readonly TeamMemberNode[], currentDepth: number): TeamActiveExecutionMemberEntry[] =>
    nodes.flatMap((node) => {
      if (node.isTaskAgentInstance) {
        const hasLogicalParent = Boolean(getTaskAgentParentRouteKey(node));
        return hasLogicalParent ? [] : [{ node, depth: currentDepth }];
      }

      const childEntries = node.memberKind === 'agent_team'
        ? visit(node.children, currentDepth + 1)
        : [];
      const taskAgentChildren = taskAgentChildrenFor(node.memberRouteKey, currentDepth + 1);
      const includeNode = isActiveExecutionMemberNode(teamContext, node) ||
        childEntries.length > 0 ||
        taskAgentChildren.length > 0;

      return includeNode
        ? [{ node, depth: currentDepth }, ...childEntries, ...taskAgentChildren]
        : [...childEntries, ...taskAgentChildren];
    });

  const entries = visit(sourceTree, depth);
  const includedRouteKeys = new Set(entries.map((entry) => entry.node.memberRouteKey));
  const unassignedTaskAgents = taskAgentNodes
    .filter((node) => !includedRouteKeys.has(node.memberRouteKey))
    .map((node) => ({ node, depth }));

  return [...entries, ...unassignedTaskAgents];
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

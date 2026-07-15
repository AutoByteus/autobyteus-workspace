import { flattenLeafAgentMemberNodes } from '~/utils/teamDefinitionMembers';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';

export interface TokenUsageTeamMemberIdentity {
  memberRouteKey: string;
  displayName: string;
  runId: string | null;
  isFocused: boolean;
}

export type TokenUsageMemberDisplayNameResolver = (
  memberRouteKey: string,
  memberContext?: AgentContext | null,
) => string;

export const resolveFocusedLeafMemberRouteKey = (team: AgentTeamContext | null): string => {
  if (!team) return '';
  const requestedRouteKey = team.focusedMemberRouteKey?.trim() || '';
  return requestedRouteKey && team.leafAgentContextsByRouteKey.has(requestedRouteKey)
    ? requestedRouteKey
    : '';
};

export const buildTokenUsageTeamMemberIdentities = (params: {
  team: AgentTeamContext | null;
  focusedRouteKey: string;
  getMemberDisplayName: TokenUsageMemberDisplayNameResolver;
}): TokenUsageTeamMemberIdentity[] => {
  const team = params.team;
  if (!team) return [];

  const identities: TokenUsageTeamMemberIdentity[] = [];
  const seenRouteKeys = new Set<string>();

  const appendIdentity = (memberRouteKey: string, displayName: string): void => {
    const normalizedRouteKey = memberRouteKey.trim();
    if (!normalizedRouteKey || seenRouteKeys.has(normalizedRouteKey)) return;
    seenRouteKeys.add(normalizedRouteKey);
    const context = team.leafAgentContextsByRouteKey.get(normalizedRouteKey) || null;
    const node = team.memberNodesByRouteKey.get(normalizedRouteKey) || null;
    identities.push({
      memberRouteKey: normalizedRouteKey,
      displayName: displayName || node?.displayName || params.getMemberDisplayName(normalizedRouteKey, context),
      runId: context?.state.runId || node?.memberRunId || null,
      isFocused: normalizedRouteKey === params.focusedRouteKey,
    });
  };

  for (const node of flattenLeafAgentMemberNodes(team.memberTree || [])) {
    appendIdentity(node.memberRouteKey, node.displayName || node.memberName);
  }
  for (const [memberRouteKey, context] of team.leafAgentContextsByRouteKey.entries()) {
    appendIdentity(memberRouteKey, params.getMemberDisplayName(memberRouteKey, context));
  }

  return identities;
};

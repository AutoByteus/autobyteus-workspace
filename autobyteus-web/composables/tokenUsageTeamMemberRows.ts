import { flattenLeafAgentMemberNodes } from '~/utils/teamDefinitionMembers';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import {
  createTeamExecutionAddress,
  parseTeamExecutionAddress,
  serializeTeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';

export interface TokenUsageTeamMemberIdentity {
  memberAddress: string;
  displayName: string;
  runId: string | null;
  isFocused: boolean;
}

export type TokenUsageMemberDisplayNameResolver = (
  memberAddress: string,
  memberContext?: AgentContext | null,
) => string;

export const resolveFocusedLeafMemberAddress = (team: AgentTeamContext | null): string => {
  if (!team) return '';
  const requested = team.focusedExecutionAddress;
  return team.agentExecutionsByKey.has(serializeTeamExecutionAddress(requested))
    ? requested.memberAddress : '';
};

export const buildTokenUsageTeamMemberIdentities = (params: {
  team: AgentTeamContext | null;
  focusedMemberAddress: string;
  getMemberDisplayName: TokenUsageMemberDisplayNameResolver;
}): TokenUsageTeamMemberIdentity[] => {
  const team = params.team;
  if (!team) return [];

  const identities: TokenUsageTeamMemberIdentity[] = [];
  const seenMemberAddresses = new Set<string>();

  const appendIdentity = (memberAddress: string, displayName: string): void => {
    const normalizedMemberAddress = memberAddress.trim();
    if (!normalizedMemberAddress || seenMemberAddresses.has(normalizedMemberAddress)) return;
    seenMemberAddresses.add(normalizedMemberAddress);
    const context = team.agentExecutionsByKey.get(serializeTeamExecutionAddress(createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      memberAddress: normalizedMemberAddress,
    }))) || null;
    const node = team.memberNodesByAddress.get(normalizedMemberAddress) || null;
    identities.push({
      memberAddress: normalizedMemberAddress,
      displayName: displayName || node?.displayName || params.getMemberDisplayName(normalizedMemberAddress, context),
      runId: context?.state.runId || (node?.kind === 'agent' ? node.agentRunId : null),
      isFocused: normalizedMemberAddress === params.focusedMemberAddress,
    });
  };

  for (const node of flattenLeafAgentMemberNodes(team.rootTeam.children || [])) {
    appendIdentity(node.address, node.displayName);
  }
  for (const [executionKey, context] of team.agentExecutionsByKey.entries()) {
    let memberAddress = '';
    try { memberAddress = parseTeamExecutionAddress(JSON.parse(executionKey)).memberAddress; } catch { continue; }
    appendIdentity(memberAddress, params.getMemberDisplayName(memberAddress, context));
  }

  return identities;
};

import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';

export interface TokenUsageTeamMemberIdentity {
  agentRunId: string;
  memberAddress: string;
  displayName: string;
  isFocused: boolean;
}

export const resolveFocusedTeamAgentRunId = (team: AgentTeamContext | null): string | null => {
  if (!team) return null;
  const agentRunId = team.view.getFocusedAgentRunId();
  return team.view.getAgentContext(agentRunId) ? agentRunId : null;
};

export const buildTokenUsageTeamMemberIdentities = (params: {
  team: AgentTeamContext | null;
  focusedAgentRunId: string | null;
}): TokenUsageTeamMemberIdentity[] => {
  if (!params.team) return [];
  return params.team.view.listNavigationRows()
    .filter((row) => row.focusable && row.agentRunId)
    .map((row) => ({
      agentRunId: row.agentRunId!,
      memberAddress: row.address,
      displayName: row.displayName,
      isFocused: row.agentRunId === params.focusedAgentRunId,
    }));
};

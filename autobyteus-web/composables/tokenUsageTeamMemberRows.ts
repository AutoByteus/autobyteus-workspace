import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import {
  sameTeamExecutionAddress,
  type TeamExecutionAddress,
} from '~/types/agent/TeamExecutionAddress';

export interface TokenUsageTeamMemberIdentity {
  executionAddress: TeamExecutionAddress;
  displayName: string;
  isFocused: boolean;
}

export const resolveFocusedTeamExecutionAddress = (team: AgentTeamContext | null): TeamExecutionAddress | null => {
  if (!team) return null;
  const focused = team.executions.getFocusedAddress();
  return team.executions.getAgentContext(focused) ? focused : null;
};

export const buildTokenUsageTeamMemberIdentities = (params: {
  team: AgentTeamContext | null;
  focusedExecutionAddress: TeamExecutionAddress | null;
}): TokenUsageTeamMemberIdentity[] => {
  const team = params.team;
  if (!team) return [];
  return team.executions.listNavigationRows()
    .filter((row) => row.focusable)
    .map((row) => ({
      executionAddress: row.executionAddress,
      displayName: row.displayName,
      isFocused: Boolean(params.focusedExecutionAddress
        && sameTeamExecutionAddress(row.executionAddress, params.focusedExecutionAddress)),
    }));
};

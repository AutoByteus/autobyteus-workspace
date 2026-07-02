import type { TokenUsageExecutionAddress } from "../../token-usage/domain/execution-address.js";
import { cloneTokenUsageExecutionAddress } from "../../token-usage/domain/execution-address.js";

export type TokenUsageTeamExecutionScope = {
  rootTeamRunId: string;
  teamScopeAddress: TokenUsageExecutionAddress;
};

export type TokenUsageExecutionScope = TokenUsageTeamExecutionScope & {
  currentRunAddress: TokenUsageExecutionAddress;
};

export const cloneTokenUsageTeamExecutionScope = (
  scope: TokenUsageTeamExecutionScope,
): TokenUsageTeamExecutionScope => ({
  rootTeamRunId: scope.rootTeamRunId,
  teamScopeAddress: cloneTokenUsageExecutionAddress(scope.teamScopeAddress),
});

export const cloneTokenUsageExecutionScope = (
  scope: TokenUsageExecutionScope,
): TokenUsageExecutionScope => ({
  ...cloneTokenUsageTeamExecutionScope(scope),
  currentRunAddress: cloneTokenUsageExecutionAddress(scope.currentRunAddress),
});

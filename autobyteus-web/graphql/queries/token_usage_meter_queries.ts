import gql from 'graphql-tag';

export const TOKEN_USAGE_RUN_SUMMARY_FIELDS = gql`
  fragment TokenUsageRunSummaryFields on TokenUsageRunSummaryGraphql {
    runId
    rootTeamRunId
    teamRunPath
    memberAgentRunId
    memberPath
    memberRouteKey
    agentDefinitionId
    workspaceId
    inputTokens
    outputTokens
    totalTokens
    reasoningOutputTokens
    estimatedApiInputCost
    estimatedApiOutputCost
    estimatedApiReasoningOutputCost
    estimatedApiTotalCost
    currency
    apiCostStatus
    latestContextInputTokens
    effectiveContextBudgetTokens
    contextPressurePercent
    latestModelProvider
    latestModelIdentifier
    latestRuntimeKind
    eventCount
    updatedAt
  }
`;

export const GET_AGENT_RUN_TOKEN_USAGE_SUMMARY = gql`
  ${TOKEN_USAGE_RUN_SUMMARY_FIELDS}
  query GetAgentRunTokenUsageSummary($runId: String!) {
    getAgentRunTokenUsageSummary(runId: $runId) {
      ...TokenUsageRunSummaryFields
    }
  }
`;

export const GET_TEAM_RUN_TOKEN_USAGE_SUMMARY = gql`
  ${TOKEN_USAGE_RUN_SUMMARY_FIELDS}
  query GetTeamRunTokenUsageSummary($teamRunId: String!) {
    getTeamRunTokenUsageSummary(teamRunId: $teamRunId) {
      ...TokenUsageRunSummaryFields
    }
  }
`;

export const GET_TEAM_MEMBER_TOKEN_USAGE_SUMMARY = gql`
  ${TOKEN_USAGE_RUN_SUMMARY_FIELDS}
  query GetTeamMemberTokenUsageSummary($teamRunId: String!, $memberAgentRunId: String, $memberRouteKey: String) {
    getTeamMemberTokenUsageSummary(
      teamRunId: $teamRunId,
      memberAgentRunId: $memberAgentRunId,
      memberRouteKey: $memberRouteKey
    ) {
      ...TokenUsageRunSummaryFields
    }
  }
`;

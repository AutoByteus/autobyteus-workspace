import gql from 'graphql-tag';

export const TOKEN_USAGE_RUN_SUMMARY_FIELDS = gql`
  fragment TokenUsageRunSummaryFields on TokenUsageRunSummaryGraphql {
    runId
    rootTeamRunId
    agentDefinitionId
    workspaceId
    grossInputTokens
    standardInputTokens
    cacheMissInputTokens
    cacheReadInputTokens
    cacheCreationInputTokens
    cacheCreation5mInputTokens
    cacheCreation1hInputTokens
    outputTokens
    reasoningOutputTokens
    billableOutputTokens
    totalTokens
    cacheReadInputTokenRate
    standardInputTokenRate
    cacheCreationInputTokenRate
    cacheState
    estimatedApiInputCost
    estimatedApiStandardInputCost
    estimatedApiCacheReadInputCost
    estimatedApiCacheCreationInputCost
    estimatedApiCacheCreation5mInputCost
    estimatedApiCacheCreation1hInputCost
    estimatedApiOutputCost
    estimatedApiReasoningOutputCost
    estimatedApiTotalCost
    currency
    apiCostStatus
    missingPriceDimensions
    pricingPolicyKey
    selectedPricingTierId
    unitPrices {
      standardInput {
        status
        pricePerMillion
      }
      cacheReadInput {
        status
        pricePerMillion
      }
      cacheCreationInput {
        status
        pricePerMillion
      }
      cacheCreation5mInput {
        status
        pricePerMillion
      }
      cacheCreation1hInput {
        status
        pricePerMillion
      }
      output {
        status
        pricePerMillion
      }
      reasoningOutput {
        status
        pricePerMillion
      }
    }
    latestPromptTokens
    effectiveContextWindowTokens
    contextWindowUsagePercent
    latestModelProvider
    latestModelIdentifier
    latestRuntimeKind
    usageReportCount
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
  query GetTeamMemberTokenUsageSummary($teamRunId: String!, $agentRunId: String!) {
    getTeamMemberTokenUsageSummary(
      teamRunId: $teamRunId,
      agentRunId: $agentRunId
    ) {
      ...TokenUsageRunSummaryFields
    }
  }
`;

import gql from 'graphql-tag';

export const TOKEN_USAGE_COST_SUMMARY_AGGREGATE_FIELDS = gql`
  fragment TokenUsageCostSummaryAggregateFields on TokenUsageCostSummaryAggregateGraphql {
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
    usageReportCount
    updatedAt
    observedRuntimeKinds
    observedModelIdentifiers
    observedModelProviders
  }
`;

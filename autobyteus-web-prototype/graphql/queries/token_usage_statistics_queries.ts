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

export const GET_TOKEN_USAGE_TASK_STATISTICS = gql`
  ${TOKEN_USAGE_COST_SUMMARY_AGGREGATE_FIELDS}
  fragment TokenUsageTaskStatisticsRowFields on TokenUsageTaskStatisticsRowGraphql {
    rowId
    rowKind
    runId
    taskId
    rootTeamRunId
    displayName
    summary
    createdAt
    createdTimeSource
    models
    modelDisplayNames
    runtimeKinds
    aggregate {
      ...TokenUsageCostSummaryAggregateFields
    }
  }
  query GetTokenUsageTaskStatisticsInPeriod($startTime: DateTime!, $endTime: DateTime!) {
    tokenUsageTaskStatisticsInPeriod(startTime: $startTime, endTime: $endTime) {
      rows {
        ...TokenUsageTaskStatisticsRowFields
        children {
          ...TokenUsageTaskStatisticsRowFields
          children {
            ...TokenUsageTaskStatisticsRowFields
            children {
              ...TokenUsageTaskStatisticsRowFields
              children {
                ...TokenUsageTaskStatisticsRowFields
                children {
                  ...TokenUsageTaskStatisticsRowFields
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_TOKEN_USAGE_STATISTICS = gql`
  ${TOKEN_USAGE_COST_SUMMARY_AGGREGATE_FIELDS}
  query GetUsageStatisticsInPeriod($startTime: DateTime!, $endTime: DateTime!) {
    usageStatisticsInPeriod(startTime: $startTime, endTime: $endTime) {
      runtimeKind
      llmModel
      modelDisplayName
      inputTokens
      cacheReadInputTokens
      cacheCreationInputTokens
      cacheReadInputTokenRate
      cacheState
      outputTokens
      thinkingTokens
      inputCost
      outputCost
      thinkingCost
      totalCost
      currency
      apiCostStatus
      aggregate {
        ...TokenUsageCostSummaryAggregateFields
      }
    }
  }
`;

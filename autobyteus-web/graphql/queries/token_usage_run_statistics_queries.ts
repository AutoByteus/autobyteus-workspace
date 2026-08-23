import gql from 'graphql-tag';

import { TOKEN_USAGE_COST_SUMMARY_AGGREGATE_FIELDS } from './token_usage_cost_summary_fragment';

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

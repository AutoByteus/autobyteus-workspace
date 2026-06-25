import gql from 'graphql-tag';

export const GET_TOKEN_USAGE_STATISTICS = gql`
  query GetUsageStatisticsInPeriod($startTime: DateTime!, $endTime: DateTime!) {
    usageStatisticsInPeriod(startTime: $startTime, endTime: $endTime) {
      llmModel
      promptTokens
      assistantTokens
      reasoningTokens
      promptCost
      assistantCost
      reasoningCost
      totalCost
      currency
      apiCostStatus
    }
  }
`;

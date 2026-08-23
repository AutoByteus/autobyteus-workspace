import gql from 'graphql-tag';
import { TOKEN_USAGE_COST_SUMMARY_AGGREGATE_FIELDS } from './token_usage_cost_summary_fragment';

export const GET_TOKEN_USAGE_ANALYTICS = gql`
  ${TOKEN_USAGE_COST_SUMMARY_AGGREGATE_FIELDS}
  query GetTokenUsageAnalytics($input: TokenUsageAnalyticsInputGraphql!) {
    tokenUsageAnalytics(input: $input) {
      appliedRange { preset startTime endTimeExclusive granularity }
      comparisonRange { startTime endTimeExclusive }
      coverage { status coverageStart }
      comparisonCoverage { status coverageStart }
      appliedFilters { runtimeKind providerKey modelKey }
      selectedAggregate { ...TokenUsageCostSummaryAggregateFields }
      selectedCostQuality { kind currency missingPriceDimensions }
      comparisonAggregate { ...TokenUsageCostSummaryAggregateFields }
      comparisonCostQuality { kind currency missingPriceDimensions }
      activeDayCount
      trendBuckets {
        bucketStart
        bucketEndExclusive
        aggregate { ...TokenUsageCostSummaryAggregateFields }
        costQuality { kind currency missingPriceDimensions }
      }
      comparisonBuckets {
        bucketStart
        bucketEndExclusive
        aggregate { ...TokenUsageCostSummaryAggregateFields }
        costQuality { kind currency missingPriceDimensions }
      }
      breakdownRows {
        rowKey
        identityKey
        providerKey
        modelKey
        runtimeKind
        modelProvider
        providerName
        providerDisplayName
        modelIdentifier
        modelValue
        modelDisplayName
        aggregate { ...TokenUsageCostSummaryAggregateFields }
        costQuality { kind currency missingPriceDimensions }
      }
      filterOptions {
        runtimeKinds
        providers { key modelProvider providerName displayName }
        models { key modelIdentifier modelValue displayName }
      }
    }
  }
`;

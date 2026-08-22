import type { TokenUsageCostSummaryAggregate } from "../projections/token-usage-cost-summary-aggregate.js";
import type {
  TokenUsageAccountingSummarySource,
  TokenUsageCostTotals,
  TokenUsagePricingSummary,
  TokenUsageTokenTotals,
} from "./token-usage-accounting-summary.js";
import type { CacheState } from "./token-usage-component-basis.js";

export const TOKEN_USAGE_ANALYTICS_COVERAGE_ID = 1;
export type TokenUsageAnalyticsRangePreset = "THIS_MONTH" | "LAST_MONTH" | "LAST_3_MONTHS" | "LAST_12_MONTHS" | "CUSTOM";
export type TokenUsageAnalyticsGranularity = "DAY" | "WEEK" | "MONTH";
export type TokenUsageAnalyticsCoverageStatus = "FULL" | "PARTIAL" | "UNAVAILABLE";
export type TokenUsageAnalyticsCostQualityKind = "NO_USAGE" | "COMPLETE" | "PARTIAL" | "MISSING" | "LOCAL" | "MIXED_CURRENCY";

export interface TokenUsageAnalyticsInput {
  rangePreset: TokenUsageAnalyticsRangePreset;
  startTime: Date;
  endTimeExclusive: Date;
  runtimeKind: string | null;
  providerKey: string | null;
  modelKey: string | null;
}

export interface TokenUsageAnalyticsRange {
  startTime: Date;
  endTimeExclusive: Date;
}

export interface TokenUsageAnalyticsRangePlan {
  preset: TokenUsageAnalyticsRangePreset;
  selected: TokenUsageAnalyticsRange;
  comparison: TokenUsageAnalyticsRange | null;
  granularity: TokenUsageAnalyticsGranularity;
}

export interface TokenUsageAnalyticsDailyFacet extends TokenUsageAccountingSummarySource {
  bucketStart: Date;
  facetKey: string;
  identityKey: string;
  providerKey: string;
  modelKey: string;
  runtimeKind: string;
  modelProvider: string | null;
  providerName: string | null;
  modelIdentifier: string | null;
  modelValue: string | null;
}

export interface TokenUsageAnalyticsFacetIncrement {
  bucketStart: Date;
  facetKey: string;
  identityKey: string;
  providerKey: string;
  modelKey: string;
  runtimeKind: string;
  modelProvider: string | null;
  providerName: string | null;
  modelIdentifier: string | null;
  modelValue: string | null;
  cacheState: CacheState;
  pricingSummary: TokenUsagePricingSummary;
  tokenTotals: TokenUsageTokenTotals;
  costTotals: TokenUsageCostTotals;
  usageReportCount: bigint;
  latestObservedAt: Date;
}

export interface TokenUsageAnalyticsSnapshot {
  coverageStart: Date;
  selectedFacets: TokenUsageAnalyticsDailyFacet[];
  comparisonFacets: TokenUsageAnalyticsDailyFacet[];
  filterFacets: TokenUsageAnalyticsDailyFacet[];
}

export interface TokenUsageAnalyticsCostQuality {
  kind: TokenUsageAnalyticsCostQualityKind;
  currency: string | null;
  missingPriceDimensions: string[];
}

export interface TokenUsageAnalyticsCoverage {
  status: TokenUsageAnalyticsCoverageStatus;
  coverageStart: Date;
}

export interface TokenUsageAnalyticsBucket {
  bucketStart: Date;
  bucketEndExclusive: Date;
  aggregate: TokenUsageCostSummaryAggregate;
  costQuality: TokenUsageAnalyticsCostQuality;
}

export interface TokenUsageAnalyticsBreakdownRow {
  rowKey: string;
  identityKey: string;
  providerKey: string;
  modelKey: string;
  runtimeKind: string;
  modelProvider: string | null;
  providerName: string | null;
  providerDisplayName: string;
  modelIdentifier: string | null;
  modelValue: string | null;
  modelDisplayName: string;
  aggregate: TokenUsageCostSummaryAggregate;
  costQuality: TokenUsageAnalyticsCostQuality;
}

export interface TokenUsageAnalyticsFilterOptions {
  runtimeKinds: string[];
  providers: Array<{ key: string; modelProvider: string | null; providerName: string | null; displayName: string }>;
  models: Array<{ key: string; modelIdentifier: string | null; modelValue: string | null; displayName: string }>;
}

export interface TokenUsageAnalyticsResult {
  appliedRange: TokenUsageAnalyticsRangePlan["selected"] & { preset: TokenUsageAnalyticsRangePreset; granularity: TokenUsageAnalyticsGranularity };
  comparisonRange: TokenUsageAnalyticsRange | null;
  coverage: TokenUsageAnalyticsCoverage;
  comparisonCoverage: TokenUsageAnalyticsCoverage | null;
  appliedFilters: { runtimeKind: string | null; providerKey: string | null; modelKey: string | null };
  selectedAggregate: TokenUsageCostSummaryAggregate;
  selectedCostQuality: TokenUsageAnalyticsCostQuality;
  comparisonAggregate: TokenUsageCostSummaryAggregate | null;
  comparisonCostQuality: TokenUsageAnalyticsCostQuality | null;
  activeDayCount: number;
  trendBuckets: TokenUsageAnalyticsBucket[];
  comparisonBuckets: TokenUsageAnalyticsBucket[];
  breakdownRows: TokenUsageAnalyticsBreakdownRow[];
  filterOptions: TokenUsageAnalyticsFilterOptions;
}

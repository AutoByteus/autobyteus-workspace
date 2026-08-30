import type { TokenUsageAnalyticsResult } from '~/types/tokenUsageAnalytics';
import type { TokenUsageCostSummaryAggregate } from '~/types/tokenUsageCostSummary';

export const aggregate = (overrides: Partial<TokenUsageCostSummaryAggregate> = {}): TokenUsageCostSummaryAggregate => ({
  grossInputTokens: 0,
  standardInputTokens: 0,
  cacheMissInputTokens: 0,
  cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheCreation5mInputTokens: 0,
  cacheCreation1hInputTokens: 0,
  outputTokens: 0,
  reasoningOutputTokens: 0,
  billableOutputTokens: 0,
  totalTokens: 0,
  cacheReadInputTokenRate: null,
  standardInputTokenRate: null,
  cacheCreationInputTokenRate: null,
  cacheState: 'unknown',
  estimatedApiInputCost: null,
  estimatedApiStandardInputCost: null,
  estimatedApiCacheReadInputCost: null,
  estimatedApiCacheCreationInputCost: null,
  estimatedApiCacheCreation5mInputCost: null,
  estimatedApiCacheCreation1hInputCost: null,
  estimatedApiOutputCost: null,
  estimatedApiReasoningOutputCost: null,
  estimatedApiTotalCost: null,
  currency: null,
  apiCostStatus: 'price_missing',
  missingPriceDimensions: [],
  pricingPolicyKey: null,
  selectedPricingTierId: null,
  usageReportCount: 0,
  updatedAt: null,
  observedRuntimeKinds: [],
  observedModelIdentifiers: [],
  observedModelProviders: [],
  ...overrides,
});

const quality = (kind = 'COMPLETE', currency: string | null = 'USD') => ({
  kind,
  currency,
  missingPriceDimensions: [] as string[],
});

export const bucket = (start: string, end: string, tokens = 10) => ({
  bucketStart: `${start}T00:00:00.000Z`,
  bucketEndExclusive: `${end}T00:00:00.000Z`,
  aggregate: aggregate({
    grossInputTokens: tokens,
    standardInputTokens: tokens,
    totalTokens: tokens,
    estimatedApiInputCost: tokens / 100,
    estimatedApiStandardInputCost: tokens / 100,
    estimatedApiTotalCost: tokens / 100,
    currency: 'USD',
    apiCostStatus: 'estimated',
    usageReportCount: 1,
  }),
  costQuality: quality(),
});

export const analyticsResult = (overrides: Partial<TokenUsageAnalyticsResult> = {}): TokenUsageAnalyticsResult => ({
  appliedRange: {
    preset: 'CUSTOM',
    startTime: '2026-01-31T00:00:00.000Z',
    endTimeExclusive: '2026-09-01T00:00:00.000Z',
    granularity: 'MONTH',
  },
  comparisonRange: {
    startTime: '2025-07-02T00:00:00.000Z',
    endTimeExclusive: '2026-01-31T00:00:00.000Z',
  },
  coverage: { status: 'FULL', coverageStart: '2025-01-01T00:00:00.000Z' },
  comparisonCoverage: { status: 'FULL', coverageStart: '2025-01-01T00:00:00.000Z' },
  appliedFilters: { runtimeKind: null, providerKey: null, modelKey: null },
  selectedAggregate: aggregate({ totalTokens: 80, estimatedApiTotalCost: 0.8, currency: 'USD', apiCostStatus: 'estimated' }),
  selectedCostQuality: quality(),
  comparisonAggregate: aggregate({ totalTokens: 70, estimatedApiTotalCost: 0.7, currency: 'USD', apiCostStatus: 'estimated' }),
  comparisonCostQuality: quality(),
  activeDayCount: 8,
  trendBuckets: [],
  comparisonBuckets: [],
  breakdownRows: [],
  filterOptions: { runtimeKinds: [], providers: [], models: [] },
  ...overrides,
} as unknown as TokenUsageAnalyticsResult);

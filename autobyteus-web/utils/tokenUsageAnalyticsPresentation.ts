import type {
  TokenUsageAnalyticsBreakdownRow,
  TokenUsageAnalyticsMetric,
  TokenUsageAnalyticsResult,
} from '~/types/tokenUsageAnalytics';

const DAY_MS = 86_400_000;

export interface TokenUsagePacePoint {
  x: number;
  y: number;
  rangeStart: string;
  rangeEndExclusive: string;
  qualityKind: string;
  currency: string | null | undefined;
  apiCostStatus: string;
  missingPriceDimensions: string[];
}

export const buildTokenUsagePacePoints = (
  buckets: TokenUsageAnalyticsResult['trendBuckets'],
  rangeStart: string,
  metric: TokenUsageAnalyticsMetric,
): TokenUsagePacePoint[] => {
  const start = Date.parse(rangeStart);
  let cumulative = 0;
  const qualityKinds = new Set<string>();
  const currencies = new Set<string>();
  const apiCostStatuses = new Set<string>();
  const missingPriceDimensions = new Set<string>();
  return buckets.map((bucket) => {
    const amount = metric === 'TOKENS'
      ? bucket.aggregate.totalTokens
      : bucket.aggregate.estimatedApiTotalCost;
    cumulative += amount ?? 0;
    if (bucket.aggregate.usageReportCount > 0) {
      qualityKinds.add(bucket.costQuality.kind);
      if (bucket.costQuality.currency) currencies.add(bucket.costQuality.currency);
      apiCostStatuses.add(bucket.aggregate.apiCostStatus);
      bucket.costQuality.missingPriceDimensions.forEach((dimension) => missingPriceDimensions.add(dimension));
    }
    const hasPriced = qualityKinds.has('COMPLETE') || qualityKinds.has('PARTIAL');
    const hasIncomplete = qualityKinds.has('PARTIAL') || qualityKinds.has('MISSING') || qualityKinds.has('LOCAL');
    const qualityKind = currencies.size > 1 || qualityKinds.has('MIXED_CURRENCY')
      ? 'MIXED_CURRENCY'
      : qualityKinds.size > 0 && [...qualityKinds].every((kind) => kind === 'LOCAL')
        ? 'LOCAL'
        : hasPriced && hasIncomplete
          ? 'PARTIAL'
          : qualityKinds.has('MISSING') ? 'MISSING' : qualityKinds.size > 0 ? 'COMPLETE' : 'NO_USAGE';
    return {
      x: (Date.parse(bucket.bucketEndExclusive) - start) / DAY_MS,
      y: cumulative,
      rangeStart,
      rangeEndExclusive: bucket.bucketEndExclusive,
      qualityKind,
      currency: currencies.size === 1 ? [...currencies][0] : null,
      apiCostStatus: apiCostStatuses.size === 1 ? [...apiCostStatuses][0]! : apiCostStatuses.size > 1 ? 'mixed' : 'price_missing',
      missingPriceDimensions: [...missingPriceDimensions].sort(),
    };
  });
};

export const tokenUsageBreakdownShare = (
  result: TokenUsageAnalyticsResult,
  row: TokenUsageAnalyticsBreakdownRow,
  metric: TokenUsageAnalyticsMetric,
): number | null => {
  if (metric === 'TOKENS') {
    return result.selectedAggregate.totalTokens > 0
      ? row.aggregate.totalTokens / result.selectedAggregate.totalTokens
      : null;
  }
  const total = result.selectedAggregate.estimatedApiTotalCost;
  const value = row.aggregate.estimatedApiTotalCost;
  if (total == null || total <= 0 || value == null ||
    !['COMPLETE', 'PARTIAL'].includes(result.selectedCostQuality.kind) ||
    !['COMPLETE', 'PARTIAL'].includes(row.costQuality.kind) ||
    !row.costQuality.currency || row.costQuality.currency !== result.selectedCostQuality.currency) return null;
  return value / total;
};

export const formatTokenUsageAnalyticsCost = (input: {
  value: number | null | undefined;
  currency: string | null | undefined;
  qualityKind: string;
  localLabel: string;
  unpricedLabel: string;
  currencyUnavailableLabel: string;
}): string => {
  if (input.qualityKind === 'LOCAL') return input.localLabel;
  if (input.value == null || ['MISSING', 'NO_USAGE', 'MIXED_CURRENCY'].includes(input.qualityKind)) return input.unpricedLabel;
  if (!input.currency) {
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(input.value)} · ${input.currencyUnavailableLabel}`;
  }
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: input.currency,
    maximumFractionDigits: 4,
  }).format(input.value);
};

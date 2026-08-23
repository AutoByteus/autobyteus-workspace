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

type TokenUsageAnalyticsCostQuality = TokenUsageAnalyticsResult['selectedCostQuality'];

/** Merge server-derived bucket qualities with the same precedence as the analytics provider. */
export const mergeTokenUsageAnalyticsCostQualities = (
  qualities: readonly TokenUsageAnalyticsCostQuality[],
): TokenUsageAnalyticsCostQuality => {
  const contributing = qualities.filter((quality) => quality.kind !== 'NO_USAGE');
  if (contributing.length === 0) return { kind: 'NO_USAGE', currency: null, missingPriceDimensions: [] };

  const pricedCurrencies = new Set(contributing
    .filter((quality) => ['COMPLETE', 'PARTIAL'].includes(quality.kind) && quality.currency)
    .map((quality) => quality.currency!));
  const reportedCurrencies = new Set(contributing
    .map((quality) => quality.currency)
    .filter((currency): currency is string => Boolean(currency)));
  const missingPriceDimensions = [...new Set(contributing
    .flatMap((quality) => quality.missingPriceDimensions))].sort();
  if (pricedCurrencies.size > 1 || contributing.some((quality) => quality.kind === 'MIXED_CURRENCY')) {
    return { kind: 'MIXED_CURRENCY', currency: null, missingPriceDimensions };
  }
  if (contributing.every((quality) => quality.kind === 'LOCAL')) {
    return { kind: 'LOCAL', currency: null, missingPriceDimensions: [] };
  }

  const known = contributing.some((quality) => ['COMPLETE', 'PARTIAL'].includes(quality.kind));
  const incomplete = contributing.some((quality) => ['MISSING', 'PARTIAL'].includes(quality.kind));
  const currency = [...pricedCurrencies][0] ?? (reportedCurrencies.size === 1 ? [...reportedCurrencies][0]! : null);
  return {
    kind: !known && incomplete ? 'MISSING' : known && incomplete ? 'PARTIAL' : 'COMPLETE',
    currency,
    missingPriceDimensions,
  };
};

export const buildTokenUsagePacePoints = (
  buckets: TokenUsageAnalyticsResult['trendBuckets'],
  rangeStart: string,
  metric: TokenUsageAnalyticsMetric,
): TokenUsagePacePoint[] => {
  const start = Date.parse(rangeStart);
  let cumulative = 0;
  const costQualities: TokenUsageAnalyticsCostQuality[] = [];
  const apiCostStatuses = new Set<string>();
  return buckets.map((bucket) => {
    const amount = metric === 'TOKENS'
      ? bucket.aggregate.totalTokens
      : bucket.aggregate.estimatedApiTotalCost;
    cumulative += amount ?? 0;
    if (bucket.aggregate.usageReportCount > 0) {
      costQualities.push(bucket.costQuality);
      apiCostStatuses.add(bucket.aggregate.apiCostStatus);
    }
    const costQuality = mergeTokenUsageAnalyticsCostQualities(costQualities);
    return {
      x: (Date.parse(bucket.bucketEndExclusive) - start) / DAY_MS,
      y: cumulative,
      rangeStart,
      rangeEndExclusive: bucket.bucketEndExclusive,
      qualityKind: costQuality.kind,
      currency: costQuality.currency,
      apiCostStatus: apiCostStatuses.size === 1 ? [...apiCostStatuses][0]! : apiCostStatuses.size > 1 ? 'mixed' : 'price_missing',
      missingPriceDimensions: costQuality.missingPriceDimensions,
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

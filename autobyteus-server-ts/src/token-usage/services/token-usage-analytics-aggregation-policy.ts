import type {
  TokenUsageAnalyticsBucket,
  TokenUsageAnalyticsCostQuality,
  TokenUsageAnalyticsDailyFacet,
  TokenUsageAnalyticsRange,
  TokenUsageAnalyticsRangePlan,
} from "../domain/token-usage-analytics.js";
import {
  buildTokenUsageCostSummaryAggregate,
  type TokenUsageCostSummaryAggregate,
} from "../projections/token-usage-cost-summary-aggregate.js";

const DAY_MS = 86_400_000;
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);

export const tokenUsageAnalyticsCostQuality = (
  facets: readonly TokenUsageAnalyticsDailyFacet[],
  aggregate: TokenUsageCostSummaryAggregate,
): TokenUsageAnalyticsCostQuality => {
  if (aggregate.usage_report_count === 0 && aggregate.total_tokens === 0) {
    return { kind: "NO_USAGE", currency: null, missingPriceDimensions: [] };
  }
  const pricedCurrencies = new Set(facets
    .filter((facet) => facet.costTotals.estimated_api_total_cost !== null && facet.pricingSummary.currencies.status === "single")
    .map((facet) => facet.pricingSummary.currencies.status === "single" ? facet.pricingSummary.currencies.value : null)
    .filter((currency): currency is string => Boolean(currency)));
  if (pricedCurrencies.size > 1) {
    return { kind: "MIXED_CURRENCY", currency: null, missingPriceDimensions: aggregate.missing_price_dimensions };
  }
  const statuses = facets.flatMap((facet) => facet.pricingSummary.apiCostStatuses.status === "single"
    ? [facet.pricingSummary.apiCostStatuses.value] : []);
  const allLocal = facets.length > 0 && statuses.length === facets.length && statuses.every((status) => status === "local_no_api_bill");
  if (allLocal) return { kind: "LOCAL", currency: null, missingPriceDimensions: [] };
  const known = facets.some((facet) => facet.costTotals.estimated_api_total_cost !== null);
  const incomplete = facets.some((facet) => facet.pricingSummary.missingPriceDimensions.length > 0 ||
    facet.pricingSummary.apiCostStatuses.status !== "single" ||
    (facet.pricingSummary.apiCostStatuses.status === "single" && ["price_missing", "partial_price_missing", "mixed"].includes(facet.pricingSummary.apiCostStatuses.value)));
  const currency = [...pricedCurrencies][0] ?? aggregate.currency;
  if (!known && incomplete) return { kind: "MISSING", currency, missingPriceDimensions: aggregate.missing_price_dimensions };
  if (known && incomplete) return { kind: "PARTIAL", currency, missingPriceDimensions: aggregate.missing_price_dimensions };
  return { kind: "COMPLETE", currency, missingPriceDimensions: aggregate.missing_price_dimensions };
};

export const tokenUsageAnalyticsCoverageFor = (range: TokenUsageAnalyticsRange, coverageStart: Date) => ({
  status: range.endTimeExclusive <= coverageStart
    ? "UNAVAILABLE" as const
    : range.startTime < coverageStart ? "PARTIAL" as const : "FULL" as const,
  coverageStart,
});

const bucketRanges = (range: TokenUsageAnalyticsRange, granularity: TokenUsageAnalyticsRangePlan["granularity"]): TokenUsageAnalyticsRange[] => {
  const ranges: TokenUsageAnalyticsRange[] = [];
  let cursor = range.startTime;
  while (cursor < range.endTimeExclusive) {
    let next = granularity === "DAY"
      ? addDays(cursor, 1)
      : granularity === "WEEK"
        ? addDays(cursor, 7)
        : new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    if (next > range.endTimeExclusive) next = range.endTimeExclusive;
    ranges.push({ startTime: cursor, endTimeExclusive: next });
    cursor = next;
  }
  return ranges;
};

export const buildTokenUsageAnalyticsBuckets = (
  facets: readonly TokenUsageAnalyticsDailyFacet[],
  range: TokenUsageAnalyticsRange,
  granularity: TokenUsageAnalyticsRangePlan["granularity"],
): TokenUsageAnalyticsBucket[] => bucketRanges(range, granularity).map((bucket) => {
  const sources = facets.filter((facet) => facet.bucketStart >= bucket.startTime && facet.bucketStart < bucket.endTimeExclusive);
  const aggregate = buildTokenUsageCostSummaryAggregate(sources);
  return { bucketStart: bucket.startTime, bucketEndExclusive: bucket.endTimeExclusive, aggregate, costQuality: tokenUsageAnalyticsCostQuality(sources, aggregate) };
});

export const tokenUsageAnalyticsPartitionKey = (facet: TokenUsageAnalyticsDailyFacet): string => {
  if (facet.pricingSummary.apiCostStatuses.status === "single" && facet.pricingSummary.apiCostStatuses.value === "local_no_api_bill") return "LOCAL";
  if (facet.costTotals.estimated_api_total_cost !== null && facet.pricingSummary.currencies.status === "single") {
    return `CURRENCY:${facet.pricingSummary.currencies.value}`;
  }
  return "UNPRICED";
};

export const assertTokenUsageAnalyticsBucketReconciliation = (
  buckets: readonly TokenUsageAnalyticsBucket[],
  range: TokenUsageAnalyticsRange,
  aggregate: TokenUsageCostSummaryAggregate,
  subject: string,
): void => {
  if (buckets.length === 0 || buckets[0]!.bucketStart.getTime() !== range.startTime.getTime() ||
    buckets[buckets.length - 1]!.bucketEndExclusive.getTime() !== range.endTimeExclusive.getTime()) {
    throw new Error(`TOKEN_USAGE_ANALYTICS_${subject}_BUCKET_RANGE_FAILED`);
  }
  for (let index = 1; index < buckets.length; index += 1) {
    if (buckets[index - 1]!.bucketEndExclusive.getTime() !== buckets[index]!.bucketStart.getTime()) {
      throw new Error(`TOKEN_USAGE_ANALYTICS_${subject}_BUCKET_ORDER_FAILED`);
    }
  }
  const tokenTotal = buckets.reduce((sum, bucket) => sum + bucket.aggregate.total_tokens, 0);
  if (!Number.isSafeInteger(tokenTotal) || tokenTotal !== aggregate.total_tokens) {
    throw new Error(`TOKEN_USAGE_ANALYTICS_${subject}_RECONCILIATION_FAILED`);
  }
  if (aggregate.estimated_api_total_cost === null) return;
  const usageBearingCosts = buckets
    .filter((bucket) => bucket.aggregate.usage_report_count > 0 || bucket.aggregate.total_tokens > 0)
    .map((bucket) => bucket.aggregate.estimated_api_total_cost);
  if (usageBearingCosts.some((cost) => cost === null)) {
    throw new Error(`TOKEN_USAGE_ANALYTICS_${subject}_COST_RECONCILIATION_FAILED`);
  }
  const costTotal = usageBearingCosts.reduce<number>((sum, cost) => sum + (cost ?? 0), 0);
  const tolerance = Math.max(1, Math.abs(aggregate.estimated_api_total_cost)) * 1e-12;
  if (Math.abs(costTotal - aggregate.estimated_api_total_cost) > tolerance) {
    throw new Error(`TOKEN_USAGE_ANALYTICS_${subject}_COST_RECONCILIATION_FAILED`);
  }
};

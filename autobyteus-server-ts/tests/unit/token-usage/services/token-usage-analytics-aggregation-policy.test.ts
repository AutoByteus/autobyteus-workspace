import { describe, expect, it } from "vitest";
import type { TokenUsageAnalyticsDailyFacet } from "../../../../src/token-usage/domain/token-usage-analytics.js";
import { buildTokenUsageCostSummaryAggregate } from "../../../../src/token-usage/projections/token-usage-cost-summary-aggregate.js";
import { projectTokenUsageAnalyticsContribution } from "../../../../src/token-usage/projections/token-usage-analytics-contribution.js";
import {
  assertTokenUsageAnalyticsBucketReconciliation,
  buildTokenUsageAnalyticsBuckets,
  tokenUsageAnalyticsCostQuality,
  tokenUsageAnalyticsCoverageFor,
} from "../../../../src/token-usage/services/token-usage-analytics-aggregation-policy.js";
import { buildCurrentTokenUsagePayload } from "../../../helpers/token-usage-run-record-fixtures.js";

const facet = (overrides: Record<string, unknown> = {}): TokenUsageAnalyticsDailyFacet =>
  projectTokenUsageAnalyticsContribution({
    ...buildCurrentTokenUsagePayload({
      inputTokens: 10,
      outputTokens: 2,
      totalCost: 0.12,
      inputCost: 0.1,
      outputCost: 0.02,
      apiCostStatus: "estimated",
      currency: "USD",
    }),
    ...overrides,
  });

const quality = (facets: TokenUsageAnalyticsDailyFacet[]) => {
  const aggregate = buildTokenUsageCostSummaryAggregate(facets);
  return tokenUsageAnalyticsCostQuality(facets, aggregate);
};

describe("token usage analytics aggregation policy", () => {
  it("classifies the complete, partial, missing, local, and mixed-currency matrix", () => {
    const complete = facet();
    const partial = facet({
      api_cost_status: "partial_price_missing",
      missing_price_dimensions: ["output"],
      estimated_api_output_cost: null,
      estimated_api_total_cost: 0.1,
    });
    const missing = facet({
      api_cost_status: "price_missing",
      pricing_status: "missing",
      currency: null,
      missing_price_dimensions: ["input", "output"],
      estimated_api_input_cost: null,
      estimated_api_standard_input_cost: null,
      estimated_api_output_cost: null,
      estimated_api_total_cost: null,
    });
    const local = facet({
      api_cost_status: "local_no_api_bill",
      pricing_status: "local_no_api_bill",
      currency: null,
      missing_price_dimensions: [],
      estimated_api_input_cost: 0,
      estimated_api_standard_input_cost: 0,
      estimated_api_output_cost: 0,
      estimated_api_total_cost: 0,
    });
    const eur = facet({ currency: "EUR" });

    expect(quality([])).toEqual({ kind: "NO_USAGE", currency: null, missingPriceDimensions: [] });
    expect(quality([complete])).toMatchObject({ kind: "COMPLETE", currency: "USD" });
    expect(quality([partial])).toMatchObject({ kind: "PARTIAL", currency: "USD", missingPriceDimensions: ["output"] });
    expect(quality([missing])).toMatchObject({ kind: "MISSING", currency: null });
    expect(quality([local])).toEqual({ kind: "LOCAL", currency: null, missingPriceDimensions: [] });
    expect(quality([complete, local])).toMatchObject({ kind: "COMPLETE", currency: "USD" });
    expect(quality([complete, missing])).toMatchObject({ kind: "PARTIAL", currency: "USD" });
    expect(quality([complete, eur])).toMatchObject({ kind: "MIXED_CURRENCY", currency: null });
  });

  it("classifies exact coverage boundary instants without treating unavailable history as zero", () => {
    const coverageStart = new Date("2026-08-10T12:00:00.000Z");
    expect(tokenUsageAnalyticsCoverageFor({
      startTime: new Date("2026-07-01T00:00:00.000Z"),
      endTimeExclusive: new Date("2026-08-01T00:00:00.000Z"),
    }, coverageStart).status).toBe("UNAVAILABLE");
    expect(tokenUsageAnalyticsCoverageFor({
      startTime: new Date("2026-08-01T00:00:00.000Z"),
      endTimeExclusive: new Date("2026-09-01T00:00:00.000Z"),
    }, coverageStart).status).toBe("PARTIAL");
    expect(tokenUsageAnalyticsCoverageFor({
      startTime: coverageStart,
      endTimeExclusive: new Date("2026-09-01T00:00:00.000Z"),
    }, coverageStart).status).toBe("FULL");
  });

  it("builds contiguous daily/weekly/monthly buckets and reconciles exact endpoints", () => {
    const sources = [
      facet({ observed_at: "2026-01-01T12:00:00.000Z" }),
      facet({ observed_at: "2026-01-08T12:00:00.000Z" }),
      facet({ observed_at: "2026-02-01T12:00:00.000Z" }),
    ];
    const range = {
      startTime: new Date("2026-01-01T00:00:00.000Z"),
      endTimeExclusive: new Date("2026-03-01T00:00:00.000Z"),
    };
    const aggregate = buildTokenUsageCostSummaryAggregate(sources);

    for (const granularity of ["DAY", "WEEK", "MONTH"] as const) {
      const buckets = buildTokenUsageAnalyticsBuckets(sources, range, granularity);
      if (granularity === "DAY") {
        const emptyBucket = buckets.find((bucket) =>
          bucket.bucketStart.toISOString() === "2026-01-02T00:00:00.000Z");
        expect(emptyBucket?.costQuality).toEqual({
          kind: "NO_USAGE",
          currency: null,
          missingPriceDimensions: [],
        });
        expect(emptyBucket?.aggregate.estimated_api_total_cost).toBeNull();
      }
      expect(() => assertTokenUsageAnalyticsBucketReconciliation(buckets, range, aggregate, granularity))
        .not.toThrow();
      expect(buckets[0]!.bucketStart).toEqual(range.startTime);
      expect(buckets.at(-1)!.bucketEndExclusive).toEqual(range.endTimeExclusive);
    }
  });

  it("still rejects a null cost on a usage-bearing bucket when the range has a known cost", () => {
    const sources = [
      facet({ observed_at: "2026-01-01T12:00:00.000Z" }),
      facet({
        observed_at: "2026-01-02T12:00:00.000Z",
        api_cost_status: "price_missing",
        pricing_status: "missing",
        currency: null,
        missing_price_dimensions: ["input", "output"],
        estimated_api_input_cost: null,
        estimated_api_standard_input_cost: null,
        estimated_api_output_cost: null,
        estimated_api_total_cost: null,
      }),
    ];
    const range = {
      startTime: new Date("2026-01-01T00:00:00.000Z"),
      endTimeExclusive: new Date("2026-01-03T00:00:00.000Z"),
    };
    const buckets = buildTokenUsageAnalyticsBuckets(sources, range, "DAY");
    const aggregate = buildTokenUsageCostSummaryAggregate(sources);

    expect(buckets[1]?.costQuality.kind).toBe("MISSING");
    expect(buckets[1]?.aggregate.estimated_api_total_cost).toBeNull();
    expect(() => assertTokenUsageAnalyticsBucketReconciliation(buckets, range, aggregate, "DAY"))
      .toThrow("TOKEN_USAGE_ANALYTICS_DAY_COST_RECONCILIATION_FAILED");
  });
});

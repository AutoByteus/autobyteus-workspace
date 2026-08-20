import { describe, expect, it } from "vitest";
import { createTokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import { emptyTrustedDimensions, type ResolvedTokenPricingPolicy } from "../../../../src/token-usage/pricing/token-pricing-policy.js";
import { buildTokenUsageRunAggregate } from "../../../../src/token-usage/projections/token-usage-run-aggregate.js";
import { foldTokenUsageObservation } from "../../../../src/token-usage/projections/token-usage-run-fold.js";
import {
  mergeTokenUsagePricingSummaries,
  pricingSummaryFromPayload,
} from "../../../../src/token-usage/projections/token-usage-pricing-summary.js";

const payload = (eventId: string, currency: string) => createTokenUsageUpdatedPayload({
  runId: "run-mixed-currency",
  payload: {
    usage_event_id: eventId,
    idempotency_key: `idem:${eventId}`,
    observed_at: `2026-08-19T00:00:0${eventId}.000Z`,
    runtime_kind: "autobyteus",
    ingestion_kind: "autobyteus_llm_phase",
    usage_scope: "per_call",
    input_token_semantic: "gross_includes_cache",
    reported_input_tokens: 10,
    reported_output_tokens: 5,
    reported_total_tokens: 15,
    accounting_input_tokens: 10,
    accounting_output_tokens: 5,
    accounting_total_tokens: 15,
    standard_input_tokens: 10,
    cache_miss_input_tokens: 10,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_creation_5m_input_tokens: 0,
    cache_creation_1h_input_tokens: 0,
    reasoning_output_tokens: 0,
    billable_input_tokens: 10,
    billable_output_tokens: 5,
    currency,
    input_price_per_million: 5,
    output_price_per_million: 30,
    pricing_status: "trusted",
    api_cost_status: "estimated",
  },
});

const policy = (currency: string): ResolvedTokenPricingPolicy => ({
  pricing_policy_key: `policy-${currency}`,
  price_config_id: `config-${currency}`,
  model_provider: null,
  model_identifier: null,
  model_value: null,
  canonical_name: null,
  currency,
  input_price_per_million: 5,
  output_price_per_million: 30,
  cached_input_read_price_per_million: null,
  cached_input_write_price_per_million: null,
  cached_input_write_5m_price_per_million: null,
  cached_input_write_1h_price_per_million: null,
  input_price_tiers: [],
  pricing_status: "trusted",
  trusted_dimensions: {
    ...emptyTrustedDimensions(),
    input: true,
    output: true,
  },
  missing_reason: null,
  source: "test",
  effective_from: null,
  effective_to: null,
  version: null,
});

describe("token usage pricing summary", () => {
  it("makes mixed currency govern cost status and every relevant unit price", () => {
    const mixed = mergeTokenUsagePricingSummaries(
      pricingSummaryFromPayload(payload("1", "USD")),
      pricingSummaryFromPayload(payload("2", "CNY")),
    );

    expect(mixed.currencies).toEqual({ status: "mixed" });
    expect(mixed.apiCostStatuses).toEqual({ status: "mixed" });
    expect(mixed.unitPrices.standard_input).toEqual({ status: "mixed", price_per_million: null });
    expect(mixed.unitPrices.output).toEqual({ status: "mixed", price_per_million: null });
    expect(mixed.unitPrices.cache_read_input).toEqual({
      status: "not_applicable",
      price_per_million: null,
    });
  });

  it("normalizes an inconsistent stored mixed-currency summary at aggregate read time", () => {
    const first = foldTokenUsageObservation({
      current: null,
      payload: payload("1", "USD"),
      pricingPolicy: policy("USD"),
    }).record!;
    const mixedRecord = foldTokenUsageObservation({
      current: first,
      payload: payload("2", "CNY"),
      pricingPolicy: policy("CNY"),
    }).record!;
    expect(mixedRecord.currency).toBeNull();
    expect(mixedRecord.apiCostStatus).toBe("mixed");
    expect(mixedRecord.pricingSummary.unitPrices.output).toEqual({
      status: "mixed",
      price_per_million: null,
    });
    const previouslyInconsistent = {
      ...mixedRecord,
      apiCostStatus: "estimated" as const,
      pricingSummary: {
        ...mixedRecord.pricingSummary,
        apiCostStatuses: { status: "single" as const, value: "estimated" },
        unitPrices: {
          ...mixedRecord.pricingSummary.unitPrices,
          output: { status: "single" as const, price_per_million: 30 },
        },
      },
    };

    const aggregate = buildTokenUsageRunAggregate([previouslyInconsistent]);

    expect(aggregate.gross_input_tokens).toBe(20);
    expect(aggregate.output_tokens).toBe(10);
    expect(aggregate.currency).toBeNull();
    expect(aggregate.estimated_api_total_cost).toBeNull();
    expect(aggregate.api_cost_status).toBe("mixed");
    expect(aggregate.unit_prices.output).toEqual({ status: "mixed", price_per_million: null });
    expect(aggregate.unit_prices.cache_read_input).toEqual({
      status: "not_applicable",
      price_per_million: null,
    });
  });
});

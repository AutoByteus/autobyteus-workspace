import { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createTokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import type { TokenUsageRunRecord } from "../../../../src/token-usage/domain/token-usage-run-record.js";
import { emptyTrustedDimensions, type ResolvedTokenPricingPolicy } from "../../../../src/token-usage/pricing/token-pricing-policy.js";
import { TokenCostCalculator } from "../../../../src/token-usage/pricing/token-cost-calculator.js";
import { foldTokenUsageObservation } from "../../../../src/token-usage/projections/token-usage-run-fold.js";
import { TokenUsageSafeIntegerExceededError } from "../../../../src/token-usage/projections/token-usage-run-aggregate.js";
import { SqlTokenUsageRunRepository } from "../../../../src/token-usage/repositories/sql/token-usage-run-repository.js";
import { TokenUsageRunAccumulator } from "../../../../src/token-usage/services/token-usage-run-accumulator.js";

const policy: ResolvedTokenPricingPolicy = {
  pricing_policy_key: null,
  price_config_id: null,
  model_provider: null,
  model_identifier: null,
  model_value: null,
  canonical_name: null,
  currency: null,
  input_price_per_million: null,
  output_price_per_million: null,
  cached_input_read_price_per_million: null,
  cached_input_write_price_per_million: null,
  cached_input_write_5m_price_per_million: null,
  cached_input_write_1h_price_per_million: null,
  input_price_tiers: [],
  pricing_status: "missing",
  trusted_dimensions: emptyTrustedDimensions(),
  missing_reason: "test",
  source: null,
  effective_from: null,
  effective_to: null,
  version: null,
};

const localPolicy: ResolvedTokenPricingPolicy = {
  ...policy,
  model_provider: "OLLAMA",
  model_identifier: "local-model",
  model_value: "local-model",
  pricing_status: "local_no_api_bill",
  missing_reason: null,
};

const directPayload = (eventId: string) => createTokenUsageUpdatedPayload({
  runId: "run-safe-int-boundary",
  payload: {
    usage_event_id: eventId,
    idempotency_key: `idem:${eventId}`,
    observed_at: `2026-08-19T00:00:0${eventId}.000Z`,
    runtime_kind: "autobyteus",
    ingestion_kind: "autobyteus_llm_phase",
    usage_scope: "per_call",
    input_token_semantic: "gross_includes_cache",
    reported_input_tokens: 1,
    reported_output_tokens: 0,
    reported_total_tokens: 1,
    accounting_input_tokens: 1,
    accounting_output_tokens: 0,
    accounting_total_tokens: 1,
    standard_input_tokens: 1,
    cache_miss_input_tokens: 1,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_creation_5m_input_tokens: 0,
    cache_creation_1h_input_tokens: 0,
    reasoning_output_tokens: 0,
    billable_input_tokens: 1,
    billable_output_tokens: 0,
  },
});

const localPayload = createTokenUsageUpdatedPayload({
  runId: "run-local-cache-state",
  payload: {
    usage_event_id: "local-1",
    idempotency_key: "local-idem-1",
    observed_at: "2026-08-19T00:01:00.000Z",
    runtime_kind: "OLLAMA",
    ingestion_kind: "autobyteus_llm_phase",
    usage_scope: "per_call",
    input_token_semantic: "gross_includes_cache",
    reported_input_tokens: 2,
    reported_output_tokens: 1,
    reported_total_tokens: 3,
    accounting_input_tokens: 2,
    accounting_output_tokens: 1,
    accounting_total_tokens: 3,
    standard_input_tokens: 2,
    cache_miss_input_tokens: 2,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_creation_5m_input_tokens: 0,
    cache_creation_1h_input_tokens: 0,
    reasoning_output_tokens: 0,
    billable_input_tokens: 2,
    billable_output_tokens: 1,
    model_provider: "OLLAMA",
    model_identifier: "local-model",
    model_value: "local-model",
  },
});

describe("TokenUsageRunAccumulator", () => {
  it("persists and publicly returns the first explicit local cache state", async () => {
    const realCalculator = new TokenCostCalculator();
    const calculator = {
      resolvePolicy: vi.fn().mockResolvedValue(localPolicy),
      applyPolicy: vi.fn((payload, resolvedPolicy) => realCalculator.applyPolicy(payload, resolvedPolicy)),
    };
    const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    const repository = new SqlTokenUsageRunRepository(prisma);
    try {
      const accumulator = new TokenUsageRunAccumulator(repository, calculator as never);
      const result = await accumulator.recordObservation(localPayload);
      const persisted = await repository.getByRunId(localPayload.run_id);

      expect(persisted?.usageReportCount).toBe(1n);
      expect(persisted?.cacheState).toBe("unsupported_or_local");
      expect(result.cache_state).toBe("unsupported_or_local");
      expect(result.run_summary_after_event?.cache_state).toBe("unsupported_or_local");
    } finally {
      await prisma.tokenUsageRunRecord.deleteMany({ where: { runId: localPayload.run_id } });
      await prisma.$disconnect();
    }
  });

  it("commits exact BigInt state before an unsafe public-summary projection rejects", async () => {
    const calculator = {
      resolvePolicy: vi.fn().mockResolvedValue(policy),
      applyPolicy: vi.fn((payload) => payload),
    };
    const initial = foldTokenUsageObservation({
      current: null,
      payload: directPayload("1"),
      pricingPolicy: policy,
      costCalculator: calculator as never,
    }).record!;
    const nearBoundary: TokenUsageRunRecord = {
      ...initial,
      tokenTotals: {
        ...initial.tokenTotals,
        accounting_input_tokens: BigInt(Number.MAX_SAFE_INTEGER),
      },
    };
    const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    const repository = new SqlTokenUsageRunRepository(prisma);
    try {
      await prisma.$transaction((transaction) => repository.save(transaction, nearBoundary));
      const accumulator = new TokenUsageRunAccumulator(repository, calculator as never);

      await expect(accumulator.recordObservation(directPayload("2"))).rejects.toEqual(
        expect.objectContaining({
          name: "TokenUsageSafeIntegerExceededError",
          code: "TOKEN_USAGE_SAFE_INTEGER_EXCEEDED",
          field: "accounting_input_tokens",
        }),
      );

      const committed = await repository.getByRunId(nearBoundary.runId);
      expect(committed).not.toBeNull();
      expect(committed!.tokenTotals.accounting_input_tokens).toBe(9_007_199_254_740_992n);
      expect(committed!.revision).toBe(nearBoundary.revision + 1n);
      expect(committed!.usageReportCount).toBe(nearBoundary.usageReportCount + 1n);
      expect(new TokenUsageSafeIntegerExceededError("accounting_input_tokens").message).toBe(
        "TOKEN_USAGE_SAFE_INTEGER_EXCEEDED:accounting_input_tokens",
      );
    } finally {
      await prisma.tokenUsageRunRecord.deleteMany({ where: { runId: nearBoundary.runId } });
      await prisma.$disconnect();
    }
  });
});

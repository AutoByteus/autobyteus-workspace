import { describe, expect, it } from "vitest";
import { createTokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import type { ResolvedTokenPricingPolicy } from "../../../../src/token-usage/pricing/token-pricing-policy.js";
import { foldTokenUsageObservation } from "../../../../src/token-usage/projections/token-usage-run-fold.js";

// Opus 5.5 Standard rates per million tokens (catalog row).
const opus55: ResolvedTokenPricingPolicy = {
  pricing_policy_key: "autobyteus_model_catalog:ANTHROPIC:claude-opus-5-5",
  price_config_id: "autobyteus_model_catalog:ANTHROPIC:claude-opus-5-5",
  model_provider: "ANTHROPIC",
  model_identifier: "claude-opus-5-5",
  model_value: "claude-opus-5-5",
  canonical_name: "claude-opus-5-5",
  currency: "USD",
  input_price_per_million: 4,
  output_price_per_million: 20,
  cached_input_read_price_per_million: 0.2,
  cached_input_write_price_per_million: 5,
  cached_input_write_5m_price_per_million: 5,
  cached_input_write_1h_price_per_million: 8,
  input_price_tiers: [],
  pricing_status: "trusted",
  trusted_dimensions: {
    input: true, output: true, cached_input_read: true, cached_input_write: true,
    cached_input_write_5m: true, cached_input_write_1h: true,
  },
  missing_reason: null,
  source: "autobyteus_model_catalog",
  effective_from: null,
  effective_to: null,
  version: null,
};

// Shaped like the core's AGENT_TOKEN_USAGE_UPDATED payloads (Anthropic usage: base excludes cache).
const usage = (input: number, cacheRead: number, cacheWrite1h: number, output: number) => ({
  input_tokens: input,
  output_tokens: output,
  total_tokens: input + cacheRead + cacheWrite1h + output,
  input_token_semantic: "base_excludes_cache",
  cache_read_input_tokens: cacheRead,
  cache_creation_input_tokens: cacheWrite1h,
  cache_creation_5m_input_tokens: 0,
  cache_creation_1h_input_tokens: cacheWrite1h,
  cache_state: "positive",
  model_provider: "ANTHROPIC",
  model_identifier: "claude-opus-5-5",
  model_value: "claude-opus-5-5",
  usage_scope: "per_call",
});

describe("token usage of compaction summary attempts", () => {
  it("adds autobyteus_compaction calls to the run totals and cost, priced with cache components", () => {
    const agentCall = createTokenUsageUpdatedPayload({ runId: "run-compaction-meter", payload: {
      usage: usage(1_000, 900_000, 10_000, 2_000),
      turn_id: "turn_0007", llm_call_id: "turn_0007:llm:1", call_sequence: 1,
      runtime_kind: "autobyteus", ingestion_kind: "autobyteus_llm_phase",
      idempotency_key: "agent:turn_0007:llm:1", observed_at: "2026-10-09T10:00:00.000Z",
      latest_prompt_tokens: 911_000, effective_context_window_tokens: 1_000_000, context_window_usage_percent: 91.1,
    } });
    const compactionCall = createTokenUsageUpdatedPayload({ runId: "run-compaction-meter", payload: {
      usage: usage(50, 911_000, 2_000, 8_000),
      turn_id: "turn_0007", llm_call_id: "turn_0007:compaction:op_12:1",
      runtime_kind: "autobyteus", ingestion_kind: "autobyteus_compaction",
      idempotency_key: "agent:turn_0007:compaction:op_12:1", observed_at: "2026-10-09T10:00:05.000Z",
      latest_prompt_tokens: null, effective_context_window_tokens: 1_000_000, context_window_usage_percent: null,
    } });

    const first = foldTokenUsageObservation({ current: null, payload: agentCall, pricingPolicy: opus55 });
    const second = foldTokenUsageObservation({ current: first.record, payload: compactionCall, pricingPolicy: opus55 });

    expect(second.kind).toBe("CHANGED");
    expect(second.authoritativePayload.ingestion_kind).toBe("autobyteus_compaction");
    expect(second.authoritativePayload.api_cost_status).toBe("estimated");
    expect(second.authoritativePayload.estimated_api_cache_read_input_cost).toBeCloseTo(911_000 * 0.2 / 1_000_000);
    expect(second.authoritativePayload.estimated_api_cache_creation_1h_input_cost).toBeCloseTo(2_000 * 8 / 1_000_000);
    expect(second.record.usageReportCount).toBe(2n);
    expect(second.record.tokenTotals.cache_read_input_tokens).toBe(1_811_000n);
    expect(second.record.tokenTotals.cache_creation_1h_input_tokens).toBe(12_000n);
    expect(second.record.costTotals.estimated_api_total_cost).toBeCloseTo(
      (first.authoritativePayload.estimated_api_total_cost ?? 0) + (second.authoritativePayload.estimated_api_total_cost ?? 0),
    );
    // The newest observation owns the latest-prompt reading: after a compaction call it is unknown
    // (the context just shrank) until the agent's next request reports it again.
    expect(second.record.latestPromptTokens).toBeNull();
    expect(second.record.contextWindowUsagePercent).toBeNull();
    expect(second.record.effectiveContextWindowTokens).toBe(1_000_000n);
  });
});

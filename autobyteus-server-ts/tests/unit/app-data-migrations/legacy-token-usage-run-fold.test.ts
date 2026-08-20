import { describe, expect, it } from "vitest";
import type { CacheState } from "../../../src/token-usage/domain/token-usage-component-basis.js";
import {
  LegacyTokenUsageRunFold,
} from "../../../src/app-data-migrations/migrations/token-usage-run-records-v1/legacy-token-usage-run-fold.js";
import {
  legacyRowToCurrentPayload,
  type LegacyTokenUsageLedgerRow,
} from "../../../src/app-data-migrations/migrations/token-usage-run-records-v1/legacy-token-usage-row.js";

const legacyRow = (input: {
  id: number;
  cacheState: CacheState;
  overrides?: Partial<LegacyTokenUsageLedgerRow>;
}): LegacyTokenUsageLedgerRow => ({
  id: input.id,
  usage_event_id: `legacy-event-${input.id}`,
  idempotency_key: `legacy-idem-${input.id}`,
  observed_at: `2026-08-19T02:00:0${input.id}.000Z`,
  persisted_at: `2026-08-19T02:00:0${input.id}.500Z`,
  run_id: "legacy-cache-run",
  root_team_run_id: null,
  turn_id: null,
  llm_call_id: null,
  call_sequence: input.id,
  agent_definition_id: null,
  workspace_id: null,
  task_id: null,
  team_name: null,
  agent_name: null,
  run_summary: null,
  run_created_at: null,
  member_display_name: null,
  runtime_kind: "OLLAMA",
  model_provider: "OLLAMA",
  provider_name: null,
  model_identifier: "local-model",
  model_value: "local-model",
  ingestion_kind: "autobyteus_llm_phase",
  usage_scope: "per_call",
  snapshot_series_key: null,
  previous_snapshot_event_id: null,
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
  cache_state: input.cacheState,
  reasoning_output_tokens: 0,
  billable_input_tokens: 1,
  billable_output_tokens: 0,
  quality_flags_json: null,
  cost_basis: null,
  currency: null,
  input_price_per_million: null,
  output_price_per_million: null,
  cached_input_read_price_per_million: null,
  cached_input_write_price_per_million: null,
  cached_input_write_5m_price_per_million: null,
  cached_input_write_1h_price_per_million: null,
  pricing_source: null,
  pricing_status: "local_no_api_bill",
  pricing_missing_reason: null,
  pricing_policy_key: null,
  selected_pricing_tier_id: null,
  missing_price_dimensions_json: null,
  estimated_api_input_cost: 0,
  estimated_api_standard_input_cost: 0,
  estimated_api_cache_read_input_cost: null,
  estimated_api_cache_creation_input_cost: null,
  estimated_api_cache_creation_5m_input_cost: null,
  estimated_api_cache_creation_1h_input_cost: null,
  estimated_api_output_cost: 0,
  estimated_api_reasoning_output_cost: null,
  estimated_api_total_cost: 0,
  api_cost_status: "local_no_api_bill",
  latest_prompt_tokens: null,
  effective_context_window_tokens: null,
  context_window_usage_percent: null,
  source_reported_input_tokens: null,
  source_reported_output_tokens: null,
  source_reported_total_tokens: null,
  source_accounting_input_tokens: null,
  source_accounting_output_tokens: null,
  source_accounting_total_tokens: null,
  source_standard_input_tokens: null,
  source_cache_miss_input_tokens: null,
  source_cache_read_input_tokens: null,
  source_cache_creation_input_tokens: null,
  source_cache_creation_5m_input_tokens: null,
  source_cache_creation_1h_input_tokens: null,
  source_reasoning_output_tokens: null,
  source_billable_input_tokens: null,
  source_billable_output_tokens: null,
  ...input.overrides,
});

const foldLegacyCacheStates = (states: CacheState[]) => {
  const fold = new LegacyTokenUsageRunFold();
  states.forEach((cacheState, index) => fold.add(legacyRow({ id: index + 1, cacheState })));
  return fold.finish();
};

describe("LegacyTokenUsageRunFold cache-state semantics", () => {
  it("normalizes non-local unknown input semantics before admitting the legacy contribution", () => {
    const payload = legacyRowToCurrentPayload(legacyRow({
      id: 1,
      cacheState: "positive",
      overrides: {
        input_token_semantic: "unknown",
        standard_input_tokens: 6,
        cache_miss_input_tokens: 6,
        cache_read_input_tokens: 3,
        cache_creation_input_tokens: 1,
        cache_creation_5m_input_tokens: 1,
        cache_creation_1h_input_tokens: 0,
        missing_price_dimensions_json: '["provider_price","input_token_semantic"]',
        estimated_api_input_cost: 0.8,
        estimated_api_standard_input_cost: 0.6,
        estimated_api_cache_read_input_cost: 0.1,
        estimated_api_cache_creation_input_cost: 0.1,
        estimated_api_cache_creation_5m_input_cost: 0.1,
        estimated_api_cache_creation_1h_input_cost: 0,
        estimated_api_output_cost: 0.2,
        estimated_api_total_cost: 1,
        pricing_status: "trusted",
        api_cost_status: "estimated",
      },
    }));

    expect(payload).toMatchObject({
      input_token_semantic: "unknown",
      standard_input_tokens: null,
      cache_miss_input_tokens: null,
      cache_read_input_tokens: null,
      cache_creation_input_tokens: null,
      cache_creation_5m_input_tokens: null,
      cache_creation_1h_input_tokens: null,
      cache_state: "unknown",
      pricing_missing_reason: "input_token_semantic_unknown",
      estimated_api_input_cost: null,
      estimated_api_standard_input_cost: null,
      estimated_api_cache_read_input_cost: null,
      estimated_api_cache_creation_input_cost: null,
      estimated_api_total_cost: 0.2,
      api_cost_status: "partial_price_missing",
      missing_price_dimensions: ["input_token_semantic", "provider_price", "standard_input_tokens"],
    });
  });

  it("preserves the released local-no-API-bill exception and enforces the dimension bound", () => {
    const local = legacyRowToCurrentPayload(legacyRow({
      id: 1,
      cacheState: "unsupported_or_local",
      overrides: {
        input_token_semantic: "unknown",
        standard_input_tokens: 1,
        estimated_api_input_cost: 0,
        estimated_api_total_cost: 0,
        pricing_status: "local_no_api_bill",
        api_cost_status: "local_no_api_bill",
        missing_price_dimensions_json: '["local_existing"]',
      },
    }));
    expect(local).toMatchObject({
      standard_input_tokens: 1,
      cache_state: "unsupported_or_local",
      estimated_api_input_cost: 0,
      estimated_api_total_cost: 0,
      api_cost_status: "local_no_api_bill",
      missing_price_dimensions: ["local_existing"],
    });

    expect(() => legacyRowToCurrentPayload(legacyRow({
      id: 2,
      cacheState: "unknown",
      overrides: {
        input_token_semantic: "unknown",
        pricing_status: "trusted",
        api_cost_status: "estimated",
        missing_price_dimensions_json: JSON.stringify(Array.from({ length: 33 }, (_, index) => `d${index}`)),
      },
    }))).toThrow("Legacy token usage missing-price dimensions exceed the target bound.");

    const fold = new LegacyTokenUsageRunFold();
    fold.add(legacyRow({
      id: 3,
      cacheState: "not_reported",
      overrides: {
        missing_price_dimensions_json: JSON.stringify(Array.from({ length: 20 }, (_, index) => `a${index}`)),
      },
    }));
    expect(() => fold.add(legacyRow({
      id: 4,
      cacheState: "not_reported",
      overrides: {
        missing_price_dimensions_json: JSON.stringify(Array.from({ length: 20 }, (_, index) => `b${index}`)),
      },
    }))).toThrow("Legacy token usage merged missing-price dimensions exceed the target bound.");
  });

  it("uses the first admitted legacy cache observation instead of the empty-record sentinel", () => {
    const record = foldLegacyCacheStates(["unsupported_or_local"]);

    expect(record.usageReportCount).toBe(1n);
    expect(record.cacheState).toBe("unsupported_or_local");
  });

  it.each([
    [["unsupported_or_local", "unsupported_or_local"], "unsupported_or_local"],
    [["unsupported_or_local", "unknown"], "unknown"],
    [["unknown", "positive"], "positive"],
    [["unsupported_or_local", "zero_reported"], "zero_reported"],
    [["unknown"], "unknown"],
  ] as Array<[CacheState[], CacheState]>)(
    "summarizes admitted legacy cache observations %j as %s",
    (states, expected) => {
      const record = foldLegacyCacheStates(states);

      expect(record.usageReportCount).toBe(BigInt(states.length));
      expect(record.cacheState).toBe(expected);
    },
  );
});

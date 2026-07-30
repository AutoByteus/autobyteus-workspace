import { describe, expect, it } from "vitest";
import type { TokenUsageUpdatedPayload } from "../../../../src/agent-execution/domain/agent-run-token-usage.js";
import { buildTokenUsageCostSummaryAggregate } from "../../../../src/token-usage/projections/token-usage-cost-summary-aggregate.js";

const buildEvent = (overrides: Partial<TokenUsageUpdatedPayload> = {}): TokenUsageUpdatedPayload => ({
  usage_event_id: overrides.usage_event_id ?? "event-1",
  idempotency_key: overrides.idempotency_key ?? "event-key-1",
  observed_at: overrides.observed_at ?? "2026-07-02T10:00:00.000Z",
  run_id: overrides.run_id ?? "run-1",
  turn_id: null,
  llm_call_id: null,
  call_sequence: null,
  root_team_run_id: null,
  team_run_path: null,
  member_agent_run_id: null,
  member_path: null,
  member_route_key: null,
  agent_definition_id: null,
  workspace_id: null,
  task_agent_instance_id: null,
  task_agent_run_id: null,
  task_id: null,
  team_name: null,
  agent_name: null,
  run_summary: null,
  run_created_at: null,
  member_name: null,
  runtime_kind: "codex_app_server",
  model_provider: "OPENAI",
  provider_name: null,
  model_identifier: "gpt-test",
  model_value: null,
  ingestion_kind: "codex_thread_token_usage",
  usage_scope: "per_turn",
  snapshot_series_key: null,
  previous_snapshot_event_id: null,
  input_token_semantic: "gross_includes_cache",
  reported_input_tokens: 100,
  reported_output_tokens: 20,
  reported_total_tokens: 120,
  accounting_input_tokens: 100,
  accounting_output_tokens: 20,
  accounting_total_tokens: 120,
  standard_input_tokens: 100,
  cache_miss_input_tokens: 100,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_creation_5m_input_tokens: 0,
  cache_creation_1h_input_tokens: 0,
  cache_state: "not_reported",
  reasoning_output_tokens: 0,
  billable_input_tokens: 100,
  billable_output_tokens: 20,
  cost_basis: "api_price_estimate",
  currency: "USD",
  input_price_per_million: 5,
  output_price_per_million: 30,
  cached_input_read_price_per_million: 0.5,
  cached_input_write_price_per_million: null,
  cached_input_write_5m_price_per_million: null,
  cached_input_write_1h_price_per_million: null,
  pricing_source: "catalog",
  pricing_status: "trusted",
  pricing_missing_reason: null,
  pricing_snapshot_json: null,
  pricing_policy_key: "catalog:openai:gpt-test",
  selected_pricing_tier_id: null,
  missing_price_dimensions: [],
  estimated_api_input_cost: 0.0005,
  estimated_api_standard_input_cost: 0.0005,
  estimated_api_cache_read_input_cost: null,
  estimated_api_cache_creation_input_cost: null,
  estimated_api_cache_creation_5m_input_cost: null,
  estimated_api_cache_creation_1h_input_cost: null,
  estimated_api_output_cost: 0.0006,
  estimated_api_reasoning_output_cost: null,
  estimated_api_total_cost: 0.0011,
  api_cost_status: "estimated",
  meter_delta_input_tokens: 100,
  meter_delta_output_tokens: 20,
  meter_delta_total_tokens: 120,
  run_summary_after_event: null,
  latest_prompt_tokens: null,
  effective_context_window_tokens: null,
  context_window_usage_percent: null,
  raw_usage_json: null,
  raw_event_json: null,
  quality_flags: [],
  ...overrides,
});

describe("token usage unit-price summary projection", () => {
  it("summarizes single component unit prices and ignores zero-token price churn", () => {
    const aggregate = buildTokenUsageCostSummaryAggregate([
      buildEvent({
        cache_read_input_tokens: 40,
        cache_state: "positive",
        reasoning_output_tokens: 7,
      }),
      buildEvent({
        usage_event_id: "zero-token-event",
        idempotency_key: "zero-token-key",
        accounting_input_tokens: 0,
        accounting_output_tokens: 0,
        accounting_total_tokens: 0,
        standard_input_tokens: 0,
        cache_miss_input_tokens: 0,
        billable_input_tokens: 0,
        billable_output_tokens: 0,
        reported_input_tokens: 0,
        reported_output_tokens: 0,
        reported_total_tokens: 0,
        input_price_per_million: 999,
        output_price_per_million: 999,
        pricing_policy_key: "catalog:openai:different-zero-token-policy",
      }),
    ]);

    expect(aggregate.unit_prices.standard_input).toEqual({ status: "single", price_per_million: 5 });
    expect(aggregate.unit_prices.cache_read_input).toEqual({ status: "single", price_per_million: 0.5 });
    expect(aggregate.unit_prices.output).toEqual({ status: "single", price_per_million: 30 });
    expect(aggregate.unit_prices.reasoning_output).toEqual({ status: "single", price_per_million: 30 });
    expect(aggregate.unit_prices.cache_creation_input).toEqual({ status: "not_applicable", price_per_million: null });
  });

  it("marks component-relevant differing positive-token prices as mixed", () => {
    const aggregate = buildTokenUsageCostSummaryAggregate([
      buildEvent({ usage_event_id: "input-5", idempotency_key: "input-5-key", standard_input_tokens: 100, input_price_per_million: 5 }),
      buildEvent({ usage_event_id: "input-6", idempotency_key: "input-6-key", standard_input_tokens: 50, input_price_per_million: 6 }),
    ]);

    expect(aggregate.unit_prices.standard_input).toEqual({ status: "mixed", price_per_million: null });
    expect(aggregate.unit_prices.output).toEqual({ status: "single", price_per_million: 30 });
  });

  it("distinguishes missing, partial-missing, and local/no-bill component prices", () => {
    const missingAggregate = buildTokenUsageCostSummaryAggregate([
      buildEvent({
        input_price_per_million: null,
        api_cost_status: "partial_price_missing",
        missing_price_dimensions: ["standard_input_price"],
      }),
    ]);
    const partialAggregate = buildTokenUsageCostSummaryAggregate([
      buildEvent({ usage_event_id: "priced", idempotency_key: "priced-key", input_price_per_million: 5 }),
      buildEvent({
        usage_event_id: "missing",
        idempotency_key: "missing-key",
        input_price_per_million: null,
        api_cost_status: "partial_price_missing",
        missing_price_dimensions: ["standard_input_price"],
      }),
    ]);
    const localAggregate = buildTokenUsageCostSummaryAggregate([
      buildEvent({
        pricing_status: "local_no_api_bill",
        api_cost_status: "local_no_api_bill",
        currency: null,
        input_price_per_million: null,
        output_price_per_million: null,
      }),
    ]);

    expect(missingAggregate.unit_prices.standard_input).toEqual({ status: "missing", price_per_million: null });
    expect(partialAggregate.unit_prices.standard_input).toEqual({ status: "partial_missing", price_per_million: 5 });
    expect(localAggregate.unit_prices.standard_input).toEqual({ status: "local_no_api_bill", price_per_million: null });
  });

  it("uses stable price comparison tolerance for equivalent decimal prices", () => {
    const aggregate = buildTokenUsageCostSummaryAggregate([
      buildEvent({ usage_event_id: "input-a", idempotency_key: "input-a-key", input_price_per_million: 5 }),
      buildEvent({ usage_event_id: "input-b", idempotency_key: "input-b-key", input_price_per_million: 5.0000000001 }),
    ]);

    expect(aggregate.unit_prices.standard_input).toEqual({ status: "single", price_per_million: 5 });
  });
});

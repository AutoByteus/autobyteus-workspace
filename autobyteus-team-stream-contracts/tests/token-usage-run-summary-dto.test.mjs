import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseTeamStreamServerMessage,
  tokenUsageRunSummaryDtoSchema,
} from '../dist/index.js';

const summary = (overrides = {}) => ({
  run_id: 'member-run-1',
  root_team_run_id: 'team-run-1',
  agent_definition_id: 'agent-definition-1',
  workspace_id: 'workspace-1',
  gross_input_tokens: 300,
  standard_input_tokens: 180,
  cache_miss_input_tokens: 180,
  cache_read_input_tokens: 80,
  cache_creation_input_tokens: 40,
  cache_creation_5m_input_tokens: 10,
  cache_creation_1h_input_tokens: 20,
  output_tokens: 50,
  reasoning_output_tokens: 12,
  billable_output_tokens: 50,
  total_tokens: 350,
  cache_read_input_token_rate: 80 / 300,
  standard_input_token_rate: 0.6,
  cache_creation_input_token_rate: 40 / 300,
  cache_state: 'positive',
  estimated_api_input_cost: 0.003,
  estimated_api_standard_input_cost: 0.0018,
  estimated_api_cache_read_input_cost: 0.00008,
  estimated_api_cache_creation_input_cost: 0.00024,
  estimated_api_cache_creation_5m_input_cost: 0.00006,
  estimated_api_cache_creation_1h_input_cost: 0.0002,
  estimated_api_output_cost: 0.002,
  estimated_api_reasoning_output_cost: 0.0004,
  estimated_api_total_cost: 0.005,
  currency: 'USD',
  api_cost_status: 'estimated',
  missing_price_dimensions: [],
  pricing_policy_key: 'catalog:openai:gpt-5.6-sol',
  selected_pricing_tier_id: 'standard',
  unit_prices: {
    standard_input: { status: 'single', price_per_million: 10 },
    cache_read_input: { status: 'single', price_per_million: 1 },
    cache_creation_input: { status: 'single', price_per_million: 6 },
    cache_creation_5m_input: { status: 'single', price_per_million: 6 },
    cache_creation_1h_input: { status: 'single', price_per_million: 10 },
    output: { status: 'single', price_per_million: 30 },
    reasoning_output: { status: 'single', price_per_million: 30 },
  },
  latest_prompt_tokens: 200,
  effective_context_window_tokens: 128_000,
  context_window_usage_percent: 0.15625,
  latest_model_provider: 'OPENAI',
  latest_model_identifier: 'gpt-5.6-sol',
  latest_runtime_kind: 'codex_app_server',
  usage_report_count: 3,
  updated_at: '2026-08-20T10:05:00.000Z',
  ...overrides,
});

const teamTokenMessage = () => ({
  type: 'TOKEN_USAGE_UPDATED',
  payload: {
    change_sequence: 2,
    agent_run_id: 'member-run-1',
    usage_event_id: 'event-1',
    idempotency_key: 'key-1',
    observed_at: '2026-08-20T10:05:00.000Z',
    turn_id: null,
    llm_call_id: null,
    model_provider: 'OPENAI',
    model_identifier: 'gpt-5.6-sol',
    model_value: null,
    usage_scope: 'per_turn',
    input_token_semantic: 'gross_includes_cache',
    standard_input_tokens: 40,
    cache_miss_input_tokens: 40,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_creation_5m_input_tokens: 0,
    cache_creation_1h_input_tokens: 0,
    cache_state: 'not_reported',
    reasoning_output_tokens: 0,
    billable_output_tokens: 10,
    meter_delta_input_tokens: 40,
    meter_delta_output_tokens: 10,
    meter_delta_total_tokens: 50,
    input_price_per_million: 10,
    output_price_per_million: 30,
    cached_input_read_price_per_million: null,
    cached_input_write_price_per_million: null,
    cached_input_write_5m_price_per_million: null,
    cached_input_write_1h_price_per_million: null,
    estimated_api_input_cost: 0.0004,
    estimated_api_standard_input_cost: 0.0004,
    estimated_api_cache_read_input_cost: null,
    estimated_api_cache_creation_input_cost: null,
    estimated_api_cache_creation_5m_input_cost: null,
    estimated_api_cache_creation_1h_input_cost: null,
    estimated_api_output_cost: 0.0003,
    estimated_api_reasoning_output_cost: null,
    estimated_api_total_cost: 0.0007,
    currency: 'USD',
    api_cost_status: 'estimated',
    missing_price_dimensions: [],
    pricing_policy_key: 'catalog:openai:gpt-5.6-sol',
    selected_pricing_tier_id: 'standard',
    latest_prompt_tokens: 200,
    effective_context_window_tokens: 128_000,
    context_window_usage_percent: 0.15625,
    run_summary_after_event: summary(),
    quality_flags: [],
  },
});

test('validates and preserves the exact cumulative summary on a team token event', () => {
  const parsed = parseTeamStreamServerMessage(teamTokenMessage());
  assert.equal(parsed.type, 'TOKEN_USAGE_UPDATED');
  assert.equal(parsed.payload.run_summary_after_event.latest_runtime_kind, 'codex_app_server');
  assert.equal(parsed.payload.run_summary_after_event.unit_prices.cache_creation_1h_input.price_per_million, 10);
  assert.equal(parsed.payload.run_summary_after_event.usage_report_count, 3);
  assert.equal(Object.isFrozen(parsed.payload.run_summary_after_event.unit_prices), true);
});

test('requires a non-negative safe-integer report generation', () => {
  assert.throws(() => tokenUsageRunSummaryDtoSchema.parse(summary({
    usage_report_count: Number.MAX_SAFE_INTEGER + 1,
  })));
  assert.throws(() => tokenUsageRunSummaryDtoSchema.parse(summary({ usage_report_count: -1 })));
});

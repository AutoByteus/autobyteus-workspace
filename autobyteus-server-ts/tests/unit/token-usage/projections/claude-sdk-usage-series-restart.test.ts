import { describe, expect, it } from 'vitest';
import { buildClaudeTokenUsageEvent } from '../../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js';
import { createTokenUsageUpdatedPayload } from '../../../../src/agent-execution/domain/agent-run-token-usage.js';
import { foldTokenUsageObservation } from '../../../../src/token-usage/projections/token-usage-run-fold.js';
import { selectedClaudeSdkDetailsFromState } from '../../../../src/token-usage/projections/claude-sdk-model-usage-reconciler.js';
import type { TokenUsageRunRecord } from '../../../../src/token-usage/domain/token-usage-run-record.js';
import type { ResolvedTokenPricingPolicy } from '../../../../src/token-usage/pricing/token-pricing-policy.js';

const opus = 'claude-opus-5-5[1m]';
const haiku = 'claude-haiku-4-5-20251001';
const row = (inputTokens: number, extras: Record<string, unknown> = {}) => ({
  inputTokens, outputTokens: 10, cacheReadInputTokens: 2, cacheCreationInputTokens: 3,
  costUSD: 999, costBasis: 'unknown', provider: 'firstParty', ...extras,
});
const price: ResolvedTokenPricingPolicy = {
  pricing_policy_key: 'configured-opus', price_config_id: 'configured-opus', model_provider: 'ANTHROPIC',
  model_identifier: 'claude-opus-5-5', model_value: 'claude-opus-5-5', canonical_name: 'claude-opus-5-5',
  currency: 'USD', input_price_per_million: 10, output_price_per_million: 20,
  cached_input_read_price_per_million: 1, cached_input_write_price_per_million: null,
  cached_input_write_5m_price_per_million: 5, cached_input_write_1h_price_per_million: 8,
  input_price_tiers: [], pricing_status: 'trusted',
  trusted_dimensions: { input: true, output: true, cached_input_read: true, cached_input_write: false,
    cached_input_write_5m: true, cached_input_write_1h: true },
  missing_reason: null, source: 'configured', effective_from: null, effective_to: null, version: null,
  pricing_schedule_id: null, pricing_schedule_period_id: null, pricing_schedule_effective_from: null,
  pricing_schedule_window_timezone: null, pricing_schedule_peak_days: null, pricing_schedule_peak_days_timezone: null,
};
const observation = (input: {
  resultId: string; selectedValue?: string; selectedRaw?: string | null;
  queryKind?: 'create' | 'resume'; rows: Record<string, unknown>;
  main?: Record<string, unknown>;
  seriesRestart?: boolean;
}) => {
  const selectedValue = input.selectedValue ?? 'opus[1m]';
  const selectedRaw = input.selectedRaw === undefined ? opus : input.selectedRaw;
  const event = buildClaudeTokenUsageEvent({
    chunk: { type: 'result', uuid: input.resultId, modelUsage: input.rows,
      total_cost_usd: 100, usage: input.main },
    runId: 'sdk-run', turnId: input.resultId, sessionId: 'sdk-session', model: selectedValue,
    queryKind: input.queryKind ?? 'resume',
    selectedBinding: { selectedModelValue: selectedValue,
      selectedResolvedRawModelId: selectedRaw, resolution: selectedRaw ? 'resolved' : 'missing' },
  })!;
  const params = input.seriesRestart ? { ...event.params, claude_sdk_series_restart: true } : event.params;
  return createTokenUsageUpdatedPayload({ runId: 'sdk-run', payload: params });
};
const fold = (current: TokenUsageRunRecord | null, payload: ReturnType<typeof observation>, policy: ResolvedTokenPricingPolicy | null = price) =>
  foldTokenUsageObservation({ current, payload, pricingPolicy: policy });

const opusRow = (inputTokens: number, extras: Record<string, unknown> = {}) => row(inputTokens,
  { canonicalModel: 'claude-opus-5-5', ...extras });


const main = (inputTokens: number) => ({
  input_tokens: inputTokens, output_tokens: 10, cache_read_input_tokens: 2, cache_creation_input_tokens: 3,
});
/** A create generation that reached a cumulative selected checkpoint of 1500 input tokens. */
const createGeneration = () => {
  const first = fold(null, observation({ resultId: 'c1', queryKind: 'create', rows: { [opus]: opusRow(1000) }, main: main(1000) }));
  const second = fold(first.record, observation({ resultId: 'c2', queryKind: 'create', rows: { [opus]: opusRow(1500) }, main: main(500) }));
  expect(second.authoritativePayload.standard_input_tokens).toBe(500);
  return second.record!;
};

describe('Claude SDK usage across process generations (SR-012, RSK-007)', () => {
  it('counts the first turn after a crash restart from origin 0 instead of suppressing it as a regression', () => {
    const afterCrash = fold(createGeneration(), observation({
      resultId: 'r1', rows: { [opus]: opusRow(400) }, main: main(400), seriesRestart: true,
    }));

    expect(afterCrash.authoritativePayload.standard_input_tokens).toBe(400);
    expect(afterCrash.authoritativePayload.quality_flags).toContain('claude_sdk_series_restart_main_loop_delta');
    expect(afterCrash.authoritativePayload.quality_flags).not.toContain('claude_sdk_selected_regressed');
    expect(afterCrash.record!.tokenTotals.standard_input_tokens).toBe(1900n);

    const nextTurn = fold(afterCrash.record, observation({ resultId: 'r2', rows: { [opus]: opusRow(700) }, main: main(300) }));
    expect(nextTurn.authoritativePayload.standard_input_tokens).toBe(300);
    expect(nextTurn.authoritativePayload.quality_flags).not.toContain('claude_sdk_series_restart_main_loop_delta');
  });

  it('counts the full turn when a restore-time origin makes the reset undetectable as a regression', () => {
    // Restarted from a restore-time total of 1200: 1200 + 400 = 1600 exceeds the old checkpoint (1500).
    const restarted = fold(createGeneration(), observation({
      resultId: 'r1', rows: { [opus]: opusRow(1600) }, main: main(400), seriesRestart: true,
    }));

    expect(restarted.authoritativePayload.standard_input_tokens).toBe(400);
    const nextTurn = fold(restarted.record, observation({ resultId: 'r2', rows: { [opus]: opusRow(1900) }, main: main(300) }));
    expect(nextTurn.authoritativePayload.standard_input_tokens).toBe(300);
  });

  it('matches cumulative differencing after a clean restore that continues from the saved total', () => {
    const restored = fold(createGeneration(), observation({
      resultId: 'r1', rows: { [opus]: opusRow(1900) }, main: main(400), seriesRestart: true,
    }));

    expect(restored.authoritativePayload.standard_input_tokens).toBe(400);
    expect(restored.record!.tokenTotals.standard_input_tokens).toBe(1900n);
  });

  it('keeps same-process and create-generation observations on cumulative differencing', () => {
    const record = createGeneration();
    const sameProcessRegression = fold(record, observation({ resultId: 'r1', rows: { [opus]: opusRow(400) }, main: main(400) }));

    expect(sameProcessRegression.authoritativePayload.standard_input_tokens).toBeNull();
    expect(sameProcessRegression.authoritativePayload.quality_flags).toContain('claude_sdk_selected_regressed');
  });

  it('admits nothing and re-anchors when the restart observation has no main-loop usage', () => {
    const restarted = fold(createGeneration(), observation({ resultId: 'r1', rows: { [opus]: opusRow(400) }, seriesRestart: true }));

    expect(restarted.authoritativePayload.standard_input_tokens).toBeNull();
    expect(restarted.authoritativePayload.quality_flags).toContain('claude_sdk_series_restart_main_loop_unavailable');
    const nextTurn = fold(restarted.record, observation({ resultId: 'r2', rows: { [opus]: opusRow(700) }, main: main(300) }));
    expect(nextTurn.authoritativePayload.standard_input_tokens).toBe(300);
  });
});

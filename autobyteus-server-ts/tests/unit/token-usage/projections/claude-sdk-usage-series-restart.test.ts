import { describe, expect, it } from 'vitest';
import { buildClaudeTokenUsageEvent } from '../../../../src/agent-execution/backends/claude/session/claude-session-token-usage.js';
import { createTokenUsageUpdatedPayload } from '../../../../src/agent-execution/domain/agent-run-token-usage.js';
import { foldTokenUsageObservation } from '../../../../src/token-usage/projections/token-usage-run-fold.js';
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
  // A resumed process's calls are admitted live per call (D-2); its first result only
  // re-anchors the checkpoints, whatever origin its cumulative totals restarted from (D-3).
  it.each([
    ['a crash restart from origin 0', 400],
    ['a restore-time origin that hides the reset', 1600],
    ['a clean restore that continues from the saved total', 1900],
  ])('admits nothing and re-anchors after %s', (_label, restartedTotal) => {
    const restarted = fold(createGeneration(), observation({
      resultId: 'r1', rows: { [opus]: opusRow(restartedTotal) }, main: main(400), seriesRestart: true,
    }));

    expect(restarted.authoritativePayload.standard_input_tokens).toBeNull();
    expect(restarted.authoritativePayload.quality_flags).toContain('claude_sdk_series_restart_rebaselined');
    expect(restarted.authoritativePayload.quality_flags).not.toContain('claude_sdk_selected_regressed');
    expect(restarted.record!.tokenTotals.standard_input_tokens).toBe(1500n);

    const nextTurn = fold(restarted.record, observation({ resultId: 'r2', rows: { [opus]: opusRow(restartedTotal + 300) }, main: main(300) }));
    expect(nextTurn.authoritativePayload.standard_input_tokens).toBe(300);
    expect(nextTurn.authoritativePayload.quality_flags).not.toContain('claude_sdk_series_restart_rebaselined');
  });

  it('keeps same-process and create-generation observations on cumulative differencing', () => {
    const record = createGeneration();
    const sameProcessRegression = fold(record, observation({ resultId: 'r1', rows: { [opus]: opusRow(400) }, main: main(400) }));

    expect(sameProcessRegression.authoritativePayload.standard_input_tokens).toBeNull();
    expect(sameProcessRegression.authoritativePayload.quality_flags).toContain('claude_sdk_selected_regressed');
  });
});

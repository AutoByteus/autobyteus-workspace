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
  return createTokenUsageUpdatedPayload({ runId: 'sdk-run', payload: event.params });
};
const fold = (current: TokenUsageRunRecord | null, payload: ReturnType<typeof observation>, policy: ResolvedTokenPricingPolicy | null = price) =>
  foldTokenUsageObservation({ current, payload, pricingPolicy: policy });

const opusRow = (inputTokens: number, extras: Record<string, unknown> = {}) => row(inputTokens,
  { canonicalModel: 'claude-opus-5-5', ...extras });

describe('Claude SDK selected-only configured-price fold', () => {
  it('checkpoints all raw models but prices only selected Opus on create/resume and retry', () => {
    const first = fold(null, observation({ resultId: 'one', queryKind: 'create', rows: {
      [haiku]: row(50), [opus]: opusRow(100),
    } }));
    expect(first.kind).toBe('CHANGED');
    expect(first.authoritativePayload.accounting_input_tokens).toBe(105);
    expect(first.authoritativePayload.estimated_api_total_cost).toBeCloseTo((1000 + 2 + 24 + 200) / 1e6, 9);
    expect(first.authoritativePayload.quality_flags).toContain('claude_sdk_cache_write_1h_assumed');
    expect(first.authoritativePayload.claude_sdk_model_usage).toEqual([]);
    expect(selectedClaudeSdkDetailsFromState(first.record!.claudeSdkUsageStateJson).map((detail) => detail.rawModelId)).toEqual([opus]);
    expect(first.record!.claudeSdkUsageStateJson).toContain(haiku);
    expect(first.record!.claudeSdkUsageStateJson).not.toContain("costUSD");
    const secondPayload = observation({ resultId: 'two', rows: {
      [opus]: opusRow(120, { costUSD: 0 }), [haiku]: row(70),
    } });
    const second = fold(first.record, secondPayload);
    expect(second.authoritativePayload.standard_input_tokens).toBe(20);
    expect(second.authoritativePayload.estimated_api_total_cost).toBeCloseTo(20 * 10 / 1e6, 9);
    expect(second.record!.tokenTotals.accounting_input_tokens).toBe(125n);
    expect(fold(second.record, secondPayload).kind).toBe('SUPPRESSED');
    expect(second.authoritativePayload.missing_price_dimensions).toEqual([]);
  });

  it('uses exact terminal 5m/1h split only after all four selected dimensions reconcile', () => {
    const rows = { [haiku]: row(50), [opus]: opusRow(2, { outputTokens: 63,
      cacheReadInputTokens: 9617, cacheCreationInputTokens: 7140 }) };
    const main = { input_tokens: 2, output_tokens: 63, cache_read_input_tokens: 9617,
      cache_creation_input_tokens: 7140, cache_creation: { ephemeral_5m_input_tokens: 0,
        ephemeral_1h_input_tokens: 7140 } };
    const exact = fold(null, observation({ resultId: 'exact', queryKind: 'create', rows, main }));
    expect(exact.authoritativePayload.cache_creation_1h_input_tokens).toBe(7140);
    expect(exact.authoritativePayload.quality_flags).not.toContain('claude_sdk_cache_write_1h_assumed');
    expect(exact.authoritativePayload.estimated_api_total_cost).toBeCloseTo(
      (2 * 10 + 63 * 20 + 9617 * 1 + 7140 * 8) / 1e6, 9);
    const mismatch = fold(null, observation({ resultId: 'mismatch', queryKind: 'create', rows,
      main: { ...main, output_tokens: 64 } }));
    expect(mismatch.authoritativePayload.accounting_total_tokens).toBe(exact.authoritativePayload.accounting_total_tokens);
    expect(mismatch.authoritativePayload.quality_flags).toContain('claude_sdk_cache_write_1h_assumed');
    expect(mismatch.authoritativePayload.estimated_api_total_cost).toBe(exact.authoritativePayload.estimated_api_total_cost);
    const mixed = fold(null, observation({ resultId: 'mixed', queryKind: 'create', rows,
      main: { ...main, cache_creation: { ephemeral_5m_input_tokens: 140, ephemeral_1h_input_tokens: 7000 } } }));
    expect(mixed.authoritativePayload.cache_creation_5m_input_tokens).toBe(140);
    expect(mixed.authoritativePayload.estimated_api_total_cost).toBeCloseTo(
      (2 * 10 + 63 * 20 + 9617 + 140 * 5 + 7000 * 8) / 1e6, 9);
  });

  it('fails closed for unresolved mapping and baselines legacy resume', () => {
    const unresolved = fold(null, observation({ resultId: 'missing', selectedRaw: null,
      rows: { [haiku]: row(50), [opus]: opusRow(100) } }));
    expect(unresolved.authoritativePayload.accounting_input_tokens).toBeNull();
    expect(unresolved.authoritativePayload.estimated_api_total_cost).toBeNull();
    const old: TokenUsageRunRecord = { ...unresolved.record!, claudeSdkUsageStateJson: null, usageReportCount: 1n };
    const resumed = fold(old, observation({ resultId: 'legacy', rows: { [opus]: opusRow(100) } }));
    expect(resumed.authoritativePayload.accounting_input_tokens).toBeNull();
    expect(resumed.authoritativePayload.quality_flags).toContain('claude_sdk_selected_legacy_resume_baselined');
    const next = fold(resumed.record, observation({ resultId: 'next', rows: { [opus]: opusRow(105) } }));
    expect(next.authoritativePayload.standard_input_tokens).toBe(5);
    expect(next.authoritativePayload.estimated_api_total_cost).toBeCloseTo(5 * 10 / 1e6, 9);
  });

  it('marks missing 1h configured rate partial rather than substituting generic or SDK cost', () => {
    const result = fold(null, observation({ resultId: 'rate', queryKind: 'create', rows: { [opus]: opusRow(100) } }),
      { ...price, cached_input_write_1h_price_per_million: null,
        trusted_dimensions: { ...price.trusted_dimensions, cached_input_write_1h: false } });
    expect(result.authoritativePayload.api_cost_status).toBe('partial_price_missing');
    expect(result.authoritativePayload.missing_price_dimensions).toContain('cache_creation_1h_input_price');
    expect(result.authoritativePayload.quality_flags).toContain('claude_sdk_cache_write_1h_assumed');
  });

  it('baselines a reset in one checkpoint, then prices each selected post-reset advance once', () => {
    const first = fold(null, observation({ resultId: 'base', queryKind: 'create', rows: { [opus]: opusRow(100) } }));
    const regressed = fold(first.record, observation({ resultId: 'regress', rows: { [opus]: opusRow(90) } }));
    expect(regressed.authoritativePayload.accounting_input_tokens).toBeNull();
    expect(regressed.authoritativePayload.estimated_api_total_cost).toBeNull();
    expect(regressed.authoritativePayload.quality_flags).toContain('claude_sdk_selected_regressed');
    const resetState = JSON.parse(regressed.record!.claudeSdkUsageStateJson!);
    expect(resetState.checkpoints).toHaveLength(1);
    expect(resetState.checkpoints[0].inputTokens).toBe(90);
    const afterReset = fold(regressed.record, observation({ resultId: 'post-reset-95', rows: { [opus]: opusRow(95) } }));
    expect(afterReset.authoritativePayload.standard_input_tokens).toBe(5);
    expect(afterReset.authoritativePayload.estimated_api_total_cost).toBeCloseTo(5 * 10 / 1e6, 9);
    expect(JSON.parse(afterReset.record!.claudeSdkUsageStateJson!).checkpoints).toHaveLength(1);
    const next = fold(afterReset.record, observation({ resultId: 'post-reset-105', rows: { [opus]: opusRow(105) } }));
    expect(next.authoritativePayload.standard_input_tokens).toBe(10);
    expect(next.authoritativePayload.estimated_api_total_cost).toBeCloseTo(10 * 10 / 1e6, 9);
    expect(next.record!.tokenTotals.standard_input_tokens).toBe(115n);
    expect(next.record!.costTotals.estimated_api_total_cost).toBeCloseTo(
      first.authoritativePayload.estimated_api_total_cost! + 15 * 10 / 1e6, 9);
    expect(JSON.parse(next.record!.claudeSdkUsageStateJson!).checkpoints).toHaveLength(1);
    expect(fold(next.record, observation({ resultId: 'post-reset-105', rows: { [opus]: opusRow(105) } })).kind)
      .toBe('SUPPRESSED');
  });

  it('leaves a selected row with unknown canonical price missing', () => {
    const unknown = fold(null, observation({ resultId: 'canonical', queryKind: 'create', rows: { [opus]: row(100) } }), null);
    expect(unknown.authoritativePayload.standard_input_tokens).toBe(100);
    expect(unknown.authoritativePayload.estimated_api_total_cost).toBeNull();
    expect(unknown.authoritativePayload.quality_flags).toContain('claude_sdk_selected_configured_price_missing');
  });
});

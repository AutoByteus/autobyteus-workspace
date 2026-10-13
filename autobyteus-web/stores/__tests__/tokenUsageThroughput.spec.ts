import { describe, expect, it } from 'vitest';
import { createTokenUsageThroughput } from '../tokenUsageThroughput';
import type { TokenUsageUpdatedPayload } from '~/types/tokenUsageMeter';

const report = (seconds: number, overrides: Partial<TokenUsageUpdatedPayload> = {}) => ({
  usage_event_id: `event-${seconds}`, idempotency_key: `key-${seconds}`,
  observed_at: new Date(Date.UTC(2026, 9, 13, 10, 0, seconds)).toISOString(),
  turn_id: 'turn-1', runtime_kind: 'codex_app_server', model_provider: 'OPENAI',
  model_identifier: 'reported-model', model_value: 'model-value',
  reports_model_call: true, meter_delta_output_tokens: 200, ...overrides,
});
const summary = (revision: number, usageReportCount = revision, latestRuntimeKind = 'codex_app_server') => ({
  revision, usageReportCount, latestRuntimeKind,
});
const pair = () => {
  const meter = createTokenUsageThroughput();
  meter.observe('run', report(0), summary(1));
  meter.observe('run', report(10), summary(2));
  return meter;
};

describe('exact-run report-interval throughput', () => {
  it('uses only later normalized output and server time: collecting → 20 → 30; zero is real', () => {
    const meter = createTokenUsageThroughput();
    expect(meter.getRunThroughput('run')).toBeNull();
    meter.observe('run', report(0, { meter_delta_output_tokens: 9000 }), summary(1));
    expect(meter.getRunThroughput('run')).toEqual({ status: 'collecting', reason: 'matchingReport' });
    meter.observe('run', report(10, { meter_delta_input_tokens: 50000, reasoning_output_tokens: 100 }), summary(2));
    expect(meter.getRunThroughput('run')).toMatchObject({ status: 'ready', outputTokens: 200, elapsedSeconds: 10, tokensPerSecond: 20 });
    meter.observe('run', report(15, { meter_delta_output_tokens: 150 }), summary(3));
    expect(meter.getRunThroughput('run')).toMatchObject({ tokensPerSecond: 30, outputTokens: 150, elapsedSeconds: 5 });
    meter.observe('run', report(20, { meter_delta_output_tokens: 0 }), summary(4));
    expect(meter.getRunThroughput('run')).toMatchObject({ status: 'ready', tokensPerSecond: 0 });
  });

  it.each(['autobyteus', 'codex_app_server', 'claude_agent_sdk', 'antigravity_cli', 'grok_build'])(
    'accepts compatible normalized report fields from %s (not live-runtime proof)', (runtime) => {
      const meter = createTokenUsageThroughput();
      meter.observe('run', report(0, { runtime_kind: runtime }), summary(1, 1, runtime));
      meter.observe('run', report(10, { runtime_kind: runtime }), summary(2, 2, runtime));
      expect(meter.getRunThroughput('run')).toMatchObject({ tokensPerSecond: 20, identity: { runtimeKind: runtime } });
    },
  );

  it('accepts model_value without model_identifier and has no arbitrary numeric cap', () => {
    const meter = createTokenUsageThroughput();
    meter.observe('run', report(0, { model_identifier: null }), summary(1));
    meter.observe('run', report(1, { model_identifier: null, meter_delta_output_tokens: 999999 }), summary(2));
    expect(meter.getRunThroughput('run')).toMatchObject({ tokensPerSecond: 999999, identity: { modelIdentifier: null, modelValue: 'model-value' } });
  });

  it('ignores duplicate and stale revisions, and isolates concurrent runs', () => {
    const meter = pair();
    const saved = meter.getRunThroughput('run');
    meter.observe('run', report(15), summary(2));
    meter.observe('run', report(20), summary(1));
    meter.observe('other', report(25), summary(1));
    expect(meter.getRunThroughput('run')).toEqual(saved);
    expect(meter.getRunThroughput('other')?.status).toBe('collecting');
  });

  it('preserves a reading/baseline through context-only and Claude reconciliation revisions', () => {
    const meter = pair();
    const saved = meter.getRunThroughput('run');
    meter.observe('run', report(12, { reports_model_call: false, meter_delta_output_tokens: 999, model_identifier: 'subagent' }), summary(3, 2));
    expect(meter.getRunThroughput('run')).toEqual(saved);
    meter.observe('run', report(15, { meter_delta_output_tokens: 150 }), summary(4, 3));
    expect(meter.getRunThroughput('run')).toMatchObject({ tokensPerSecond: 30, identity: { modelIdentifier: 'reported-model' } });
  });

  it('breaks continuity on missing revisions (even non-call reports) and missing call counts', () => {
    const meter = pair();
    meter.observe('run', report(15, { reports_model_call: false }), summary(4, 3));
    expect(meter.getRunThroughput('run')).toEqual({ status: 'collecting', reason: 'continuity' });
    meter.observe('run', report(20), summary(5, 4));
    expect(meter.getRunThroughput('run')?.status).toBe('collecting');
    meter.observe('run', report(25), summary(6, 6));
    expect(meter.getRunThroughput('run')?.status).toBe('collecting');
    meter.observe('run', report(30), summary(7, 7));
    expect(meter.getRunThroughput('run')).toMatchObject({ tokensPerSecond: 40 });
  });

  it.each([
    { turn_id: 'turn-2' }, { model_identifier: 'new-model' }, { model_value: 'new-value' },
    { model_provider: 'OTHER' }, { runtime_kind: 'autobyteus' },
  ])('starts collecting on tuple change %j', (change) => {
    const meter = pair();
    meter.observe('run', report(20, change), summary(3, 3, change.runtime_kind ?? 'codex_app_server'));
    expect(meter.getRunThroughput('run')?.status).toBe('collecting');
  });

  it.each([
    { turn_id: null }, { model_identifier: null, model_value: null },
    { observed_at: undefined }, { observed_at: 'bad-time' },
    { meter_delta_output_tokens: null }, { meter_delta_output_tokens: undefined },
    { meter_delta_output_tokens: -1 }, { meter_delta_output_tokens: NaN },
    { meter_delta_output_tokens: Infinity }, { meter_delta_output_tokens: 0.5 },
    { meter_delta_output_tokens: Number.MAX_SAFE_INTEGER + 1 },
    { runtime_kind: 'conflicting-runtime' },
  ])('rejects insufficient evidence %j and recovers with a new pair', (change) => {
    const meter = pair();
    meter.observe('run', report(15, change), summary(3));
    expect(meter.getRunThroughput('run')).toEqual({ status: 'unavailable', reason: 'invalidReport' });
    meter.observe('run', report(20), summary(4));
    expect(meter.getRunThroughput('run')?.status).toBe('collecting');
    meter.observe('run', report(25), summary(5));
    expect(meter.getRunThroughput('run')).toMatchObject({ tokensPerSecond: 40 });
  });

  it.each(['reported_output_tokens_missing', 'output_tokens_missing', 'snapshot_series_key_missing',
    'cumulative_snapshot_source_unrecoverable', 'cumulative_snapshot_regressed',
    'cumulative_series_checkpoint_evicted', 'token_usage_persistence_unavailable', 'token_usage_public_summary_unavailable',
  ])('invalidates output accounting flag %s', (flag) => {
    const meter = pair();
    meter.observe('run', report(15, { quality_flags: [flag] }), summary(3));
    expect(meter.getRunThroughput('run')?.status).toBe('unavailable');
  });

  it('re-baselines missing provider delta but does not reject input/cache/price-only uncertainty', () => {
    const meter = pair();
    meter.observe('run', report(15, { quality_flags: ['cumulative_snapshot_provider_delta_missing'], meter_delta_output_tokens: 0 }), summary(3));
    expect(meter.getRunThroughput('run')?.status).toBe('collecting');
    meter.observe('run', report(20, { quality_flags: ['input_tokens_missing', 'price_missing', 'cache_details_missing'] }), summary(4));
    expect(meter.getRunThroughput('run')).toMatchObject({ tokensPerSecond: 40 });
  });

  it.each([10, 9])('rejects a nonpositive interval ending at %ss and breaks the pair', (seconds) => {
    const meter = pair();
    meter.observe('run', report(seconds), summary(3));
    expect(meter.getRunThroughput('run')).toEqual({ status: 'unavailable', reason: 'invalidInterval' });
    meter.observe('run', report(20), summary(4));
    expect(meter.getRunThroughput('run')?.status).toBe('collecting');
  });

  it('uses same-event summary runtime for presentation reports, not inferred configuration', () => {
    const meter = createTokenUsageThroughput();
    meter.observe('run', report(0, { runtime_kind: undefined }), summary(1, 1, 'claude_agent_sdk'));
    meter.observe('run', report(10, { runtime_kind: undefined }), summary(2, 2, 'claude_agent_sdk'));
    expect(meter.getRunThroughput('run')).toMatchObject({ tokensPerSecond: 20, identity: { runtimeKind: 'claude_agent_sdk' } });
    meter.observe('run', report(20, { runtime_kind: null }), { ...summary(3), latestRuntimeKind: null });
    expect(meter.getRunThroughput('run')?.status).toBe('unavailable');
  });

  it('breaks on a known fresh unsaved call, not stale, duplicate or uncorrelated reports', () => {
    const meter = pair();
    const saved = meter.getRunThroughput('run');
    meter.observeMissingSummary('other', report(20));
    meter.observeMissingSummary('run', report(10));
    meter.observeMissingSummary('run', report(9));
    meter.observeMissingSummary('run', report(12, { reports_model_call: false }));
    expect(meter.getRunThroughput('run')).toEqual(saved);
    meter.observeMissingSummary('run', report(15));
    expect(meter.getRunThroughput('run')).toEqual({ status: 'unavailable', reason: 'missingSummary' });
    meter.observe('run', report(20), summary(3));
    expect(meter.getRunThroughput('run')?.status).toBe('collecting');
    meter.observeMissingSummary('run', report(15));
    meter.observe('run', report(25), summary(4));
    expect(meter.getRunThroughput('run')).toMatchObject({ tokensPerSecond: 40 });
  });

  it.each([NaN, -1, 0, 1.5])('rejects invalid model-call count %s', (count) => {
    const meter = pair();
    meter.observe('run', report(20), summary(3, count));
    expect(meter.getRunThroughput('run')?.status).toBe('unavailable');
  });
});

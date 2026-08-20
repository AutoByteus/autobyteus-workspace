import { describe, expect, it } from 'vitest';
import { createTokenUsageUpdatedPayload } from '../../../../src/agent-execution/domain/agent-run-token-usage.js';
import { TokenUsageSnapshotDeltaNormalizer } from '../../../../src/token-usage/projections/token-usage-snapshot-delta-normalizer.js';

const cumulativeSnapshotSourceTokensKey = 'autobyteus_cumulative_snapshot_source_tokens';

let eventSequence = 0;

const asToken = (value: unknown, fallback: number | null): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;

const buildCumulativeSnapshot = (overrides: Record<string, unknown> = {}) => {
  eventSequence += 1;
  const reportedInputTokens = asToken(overrides.reported_input_tokens, 100);
  const reportedOutputTokens = asToken(overrides.reported_output_tokens, 40);
  const cacheReadTokens = asToken(overrides.cache_read_input_tokens, 10);
  const cacheCreationTokens = asToken(overrides.cache_creation_input_tokens, 5);
  const reasoningOutputTokens = asToken(overrides.reasoning_output_tokens, 8);
  const billableOutputTokens = asToken(
    overrides.billable_output_tokens,
    reportedOutputTokens === null ? null : reportedOutputTokens + (reasoningOutputTokens ?? 0),
  );
  const accountingInputTokens = asToken(overrides.accounting_input_tokens, reportedInputTokens);
  const accountingOutputTokens = asToken(overrides.accounting_output_tokens, billableOutputTokens);
  const accountingTotalTokens = asToken(
    overrides.accounting_total_tokens,
    accountingInputTokens !== null && accountingOutputTokens !== null
      ? accountingInputTokens + accountingOutputTokens
      : null,
  );
  const standardInputTokens = asToken(
    overrides.standard_input_tokens,
    reportedInputTokens === null
      ? null
      : Math.max(reportedInputTokens - (cacheReadTokens ?? 0) - (cacheCreationTokens ?? 0), 0),
  );
  return createTokenUsageUpdatedPayload({
    runId: 'run-snapshot-normalizer-test',
    payload: {
      usage_event_id: `snapshot-event-${eventSequence}`,
      idempotency_key: `snapshot:${eventSequence}`,
      runtime_kind: 'codex_app_server',
      ingestion_kind: 'codex_thread_token_usage',
      usage_scope: 'cumulative_snapshot',
      snapshot_series_key: 'codex_thread:thread-1',
      input_token_semantic: 'gross_includes_cache',
      reported_input_tokens: reportedInputTokens,
      reported_output_tokens: reportedOutputTokens,
      reported_total_tokens: asToken(
        overrides.reported_total_tokens,
        reportedInputTokens !== null && reportedOutputTokens !== null ? reportedInputTokens + reportedOutputTokens : null,
      ),
      accounting_input_tokens: accountingInputTokens,
      accounting_output_tokens: accountingOutputTokens,
      accounting_total_tokens: accountingTotalTokens,
      standard_input_tokens: standardInputTokens,
      cache_miss_input_tokens: standardInputTokens,
      cache_read_input_tokens: cacheReadTokens,
      cache_creation_input_tokens: cacheCreationTokens,
      cache_state: 'positive',
      reasoning_output_tokens: reasoningOutputTokens,
      billable_input_tokens: accountingInputTokens,
      billable_output_tokens: billableOutputTokens,
      model_provider: 'OPENAI',
      model_identifier: 'gpt-test',
      ...overrides,
    },
  });
};

const buildNormalizer = () => new TokenUsageSnapshotDeltaNormalizer();

describe('TokenUsageSnapshotDeltaNormalizer', () => {
  it('keeps the exact cumulative source while using provider-delta metadata for the optimistic live delta', async () => {
    const normalized = await buildNormalizer().normalizeAccountingDelta(buildCumulativeSnapshot({
      reported_input_tokens: 1000,
      reported_output_tokens: 80,
      reported_total_tokens: 1080,
      cache_read_input_tokens: 900,
      cache_creation_input_tokens: 0,
      reasoning_output_tokens: 12,
      billable_input_tokens: 1000,
      billable_output_tokens: 80,
      raw_event_json: {
        [cumulativeSnapshotSourceTokensKey]: undefined,
        autobyteus_cumulative_snapshot_provider_delta_tokens: {
          reported_input_tokens: 100,
          reported_output_tokens: 8,
          reported_total_tokens: 108,
          accounting_input_tokens: null,
          accounting_output_tokens: null,
          accounting_total_tokens: null,
          standard_input_tokens: null,
          cache_miss_input_tokens: null,
          cache_read_input_tokens: 90,
          cache_creation_input_tokens: null,
          cache_creation_5m_input_tokens: null,
          cache_creation_1h_input_tokens: null,
          reasoning_output_tokens: 2,
          billable_input_tokens: null,
          billable_output_tokens: null,
        },
      },
    }));

    expect(normalized.quality_flags).not.toContain('first_cumulative_snapshot_baselined_from_provider_delta');
    expect(normalized.reported_input_tokens).toBe(100);
    expect(normalized.accounting_input_tokens).toBe(100);
    expect(normalized.standard_input_tokens).toBe(10);
    expect(normalized.cache_read_input_tokens).toBe(90);
    expect(normalized.accounting_output_tokens).toBe(8);
    expect(normalized.accounting_total_tokens).toBe(108);
    expect(normalized.reasoning_output_tokens).toBe(2);
    expect(normalized.raw_event_json).toMatchObject({
      [cumulativeSnapshotSourceTokensKey]: {
        reported_input_tokens: 1000,
        cache_read_input_tokens: 900,
      },
    });
  });

  it('does not reconcile one cumulative observation against another in the transient normalizer', async () => {
    const normalizer = buildNormalizer();
    const normalized = await normalizer.normalizeAccountingDelta(buildCumulativeSnapshot({
      reported_input_tokens: 1300,
      reported_output_tokens: 100,
      reported_total_tokens: 1400,
      cache_read_input_tokens: 1170,
      cache_creation_input_tokens: 0,
      reasoning_output_tokens: 16,
      billable_input_tokens: 1300,
      billable_output_tokens: 100,
      raw_event_json: {
        autobyteus_cumulative_snapshot_provider_delta_tokens: {
          reported_input_tokens: 50,
          reported_output_tokens: 5,
          reported_total_tokens: 55,
          accounting_input_tokens: null,
          accounting_output_tokens: null,
          accounting_total_tokens: null,
          standard_input_tokens: null,
          cache_miss_input_tokens: null,
          cache_read_input_tokens: 45,
          cache_creation_input_tokens: null,
          cache_creation_5m_input_tokens: null,
          cache_creation_1h_input_tokens: null,
          reasoning_output_tokens: 1,
          billable_input_tokens: null,
          billable_output_tokens: null,
        },
      },
    }));

    expect(normalized.quality_flags).not.toContain('cumulative_snapshot_provider_delta_mismatch');
    expect(normalized.reported_input_tokens).toBe(50);
    expect(normalized.accounting_input_tokens).toBe(50);
    expect(normalized.cache_read_input_tokens).toBe(45);
    expect(normalized.accounting_output_tokens).toBe(5);
    expect(normalized.reasoning_output_tokens).toBe(1);
    expect(normalized.raw_event_json).toMatchObject({
      [cumulativeSnapshotSourceTokensKey]: {
        reported_input_tokens: 1300,
        cache_read_input_tokens: 1170,
      },
    });
  });

  it('preserves assumed-run-origin cumulative values but defers Codex snapshots without provider deltas to the durable fold', async () => {
    const codex = await buildNormalizer().normalizeAccountingDelta(buildCumulativeSnapshot({
      reported_input_tokens: 150,
      reported_output_tokens: 70,
      reported_total_tokens: 220,
      cache_read_input_tokens: 25,
      cache_creation_input_tokens: 9,
      reasoning_output_tokens: 18,
      billable_input_tokens: 150,
      billable_output_tokens: 88,
    }));
    expect(codex.quality_flags).toContain('cumulative_snapshot_provider_delta_missing');
    expect(codex.accounting_input_tokens).toBeNull();
    expect(codex.meter_delta_total_tokens).toBeNull();
    expect(codex.raw_event_json).toMatchObject({
      [cumulativeSnapshotSourceTokensKey]: {
        cache_read_input_tokens: 25,
        cache_creation_input_tokens: 9,
        reasoning_output_tokens: 18,
        billable_input_tokens: 150,
        billable_output_tokens: 88,
      },
    });
    const assumed = await buildNormalizer().normalizeAccountingDelta(buildCumulativeSnapshot({
      runtime_kind: 'autobyteus',
      ingestion_kind: 'native_model_call',
    }));
    expect(assumed.quality_flags).toContain('first_cumulative_snapshot_assumed_run_origin');
    expect(assumed.accounting_input_tokens).toBe(100);
    expect(assumed.meter_delta_total_tokens).toBe(148);
  });

  it('clears cost-affecting fields when a cumulative snapshot lacks a series key', async () => {
    const normalized = await buildNormalizer().normalizeAccountingDelta(buildCumulativeSnapshot({
      snapshot_series_key: null,
      reported_input_tokens: 140,
      reported_output_tokens: 65,
      reported_total_tokens: 205,
      cache_read_input_tokens: 20,
      cache_creation_input_tokens: 8,
      reasoning_output_tokens: 15,
      billable_input_tokens: 140,
      billable_output_tokens: 80,
    }));

    expect(normalized.quality_flags).toContain('snapshot_series_key_missing');
    expect(normalized.accounting_input_tokens).toBeNull();
    expect(normalized.accounting_output_tokens).toBeNull();
    expect(normalized.accounting_total_tokens).toBeNull();
    expect(normalized.cache_read_input_tokens).toBeNull();
    expect(normalized.cache_creation_input_tokens).toBeNull();
    expect(normalized.reasoning_output_tokens).toBeNull();
    expect(normalized.billable_input_tokens).toBeNull();
    expect(normalized.billable_output_tokens).toBeNull();

  });
});

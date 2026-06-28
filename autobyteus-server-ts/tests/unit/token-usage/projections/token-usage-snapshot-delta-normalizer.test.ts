import { describe, expect, it } from 'vitest';
import { createTokenUsageUpdatedPayload } from '../../../../src/agent-execution/domain/agent-run-token-usage.js';
import { TokenCostCalculator } from '../../../../src/token-usage/pricing/token-cost-calculator.js';
import { TokenUsageSnapshotDeltaNormalizer } from '../../../../src/token-usage/projections/token-usage-snapshot-delta-normalizer.js';
import type { TokenUsageUpdatedPayload } from '../../../../src/agent-execution/domain/agent-run-token-usage.js';
import type { ResolvedTokenPricingPolicy } from '../../../../src/token-usage/pricing/token-pricing-policy.js';

const cumulativeSnapshotSourceTokensKey = 'autobyteus_cumulative_snapshot_source_tokens';

const trustedPrice: ResolvedTokenPricingPolicy = {
  pricing_policy_key: 'price:snapshot-test',
  price_config_id: 'price:snapshot-test',
  model_provider: 'OPENAI',
  model_identifier: 'gpt-test',
  model_value: 'gpt-test',
  canonical_name: 'gpt-test',
  currency: 'USD',
  input_price_per_million: 2,
  output_price_per_million: 10,
  cached_input_read_price_per_million: 0.2,
  cached_input_write_price_per_million: 1,
  cached_input_write_5m_price_per_million: null,
  cached_input_write_1h_price_per_million: null,
  input_price_tiers: [],
  pricing_status: 'trusted',
  trusted_dimensions: {
    input: true,
    output: true,
    cached_input_read: true,
    cached_input_write: true,
    cached_input_write_5m: false,
    cached_input_write_1h: false,
  },
  missing_reason: null,
  source: 'autobyteus_model_catalog',
  effective_from: null,
  effective_to: null,
  version: null,
};

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

const buildNormalizer = (previous: TokenUsageUpdatedPayload | null = null) => new TokenUsageSnapshotDeltaNormalizer({
  getLatestCumulativeSnapshot: async () => previous,
} as never);

describe('TokenUsageSnapshotDeltaNormalizer', () => {
  it('uses provider-delta metadata as the first cumulative snapshot baseline', async () => {
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

    expect(normalized.quality_flags).toContain('first_cumulative_snapshot_baselined_from_provider_delta');
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

  it('uses cumulative movement after a previous snapshot and flags provider-delta mismatch', async () => {
    const normalizer = buildNormalizer();
    await normalizer.normalizeAccountingDelta(buildCumulativeSnapshot({
      reported_input_tokens: 1000,
      reported_output_tokens: 80,
      reported_total_tokens: 1080,
      cache_read_input_tokens: 900,
      cache_creation_input_tokens: 0,
      reasoning_output_tokens: 12,
      billable_input_tokens: 1000,
      billable_output_tokens: 80,
      raw_event_json: {
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

    expect(normalized.quality_flags).toContain('cumulative_snapshot_provider_delta_mismatch');
    expect(normalized.reported_input_tokens).toBe(300);
    expect(normalized.accounting_input_tokens).toBe(300);
    expect(normalized.cache_read_input_tokens).toBe(270);
    expect(normalized.accounting_output_tokens).toBe(20);
    expect(normalized.reasoning_output_tokens).toBe(4);
  });

  it('delta-normalizes cumulative cost-affecting fields and keeps source cumulative fields for restarted lookups', async () => {
    const normalizer = buildNormalizer();
    await normalizer.normalizeAccountingDelta(buildCumulativeSnapshot());
    const second = await normalizer.normalizeAccountingDelta(buildCumulativeSnapshot({
      reported_input_tokens: 150,
      reported_output_tokens: 70,
      reported_total_tokens: 220,
      cache_read_input_tokens: 25,
      cache_creation_input_tokens: 9,
      reasoning_output_tokens: 18,
      billable_input_tokens: 150,
      billable_output_tokens: 88,
    }));

    expect(second.accounting_input_tokens).toBe(50);
    expect(second.accounting_output_tokens).toBe(40);
    expect(second.accounting_total_tokens).toBe(90);
    expect(second.standard_input_tokens).toBe(31);
    expect(second.cache_read_input_tokens).toBe(15);
    expect(second.cache_creation_input_tokens).toBe(4);
    expect(second.reasoning_output_tokens).toBe(10);
    expect(second.billable_input_tokens).toBe(50);
    expect(second.billable_output_tokens).toBe(40);
    expect(second.raw_event_json).toMatchObject({
      [cumulativeSnapshotSourceTokensKey]: {
        cache_read_input_tokens: 25,
        cache_creation_input_tokens: 9,
        reasoning_output_tokens: 18,
        billable_input_tokens: 150,
        billable_output_tokens: 88,
      },
    });

    const restartedNormalizer = buildNormalizer(second);
    const third = await restartedNormalizer.normalizeAccountingDelta(buildCumulativeSnapshot({
      reported_input_tokens: 210,
      reported_output_tokens: 100,
      reported_total_tokens: 310,
      cache_read_input_tokens: 45,
      cache_creation_input_tokens: 15,
      reasoning_output_tokens: 30,
      billable_input_tokens: 210,
      billable_output_tokens: 130,
    }));

    expect(third.previous_snapshot_event_id).toBe(second.usage_event_id);
    expect(third.accounting_input_tokens).toBe(60);
    expect(third.accounting_output_tokens).toBe(42);
    expect(third.accounting_total_tokens).toBe(102);
    expect(third.standard_input_tokens).toBe(34);
    expect(third.cache_read_input_tokens).toBe(20);
    expect(third.cache_creation_input_tokens).toBe(6);
    expect(third.reasoning_output_tokens).toBe(12);
    expect(third.billable_input_tokens).toBe(60);
    expect(third.billable_output_tokens).toBe(42);
  });

  it('clears every calculator-consumed field for regressed cumulative snapshots', async () => {
    const normalizer = buildNormalizer();
    await normalizer.normalizeAccountingDelta(buildCumulativeSnapshot());
    const previous = await normalizer.normalizeAccountingDelta(buildCumulativeSnapshot({
      reported_input_tokens: 150,
      reported_output_tokens: 70,
      reported_total_tokens: 220,
      cache_read_input_tokens: 25,
      cache_creation_input_tokens: 9,
      reasoning_output_tokens: 18,
      billable_input_tokens: 150,
      billable_output_tokens: 88,
    }));

    const regressed = await buildNormalizer(previous).normalizeAccountingDelta(buildCumulativeSnapshot({
      reported_input_tokens: 140,
      reported_output_tokens: 65,
      reported_total_tokens: 205,
      cache_read_input_tokens: 20,
      cache_creation_input_tokens: 8,
      reasoning_output_tokens: 15,
      billable_input_tokens: 140,
      billable_output_tokens: 80,
    }));

    expect(regressed.quality_flags).toContain('cumulative_snapshot_regressed');
    expect(regressed.accounting_input_tokens).toBeNull();
    expect(regressed.accounting_output_tokens).toBeNull();
    expect(regressed.accounting_total_tokens).toBeNull();
    expect(regressed.meter_delta_input_tokens).toBeNull();
    expect(regressed.meter_delta_output_tokens).toBeNull();
    expect(regressed.meter_delta_total_tokens).toBeNull();
    expect(regressed.cache_read_input_tokens).toBeNull();
    expect(regressed.cache_creation_input_tokens).toBeNull();
    expect(regressed.reasoning_output_tokens).toBeNull();
    expect(regressed.billable_input_tokens).toBeNull();
    expect(regressed.billable_output_tokens).toBeNull();

    const priced = new TokenCostCalculator().applyPolicy(regressed, trustedPrice);
    expect(priced.cost_basis).toBeNull();
    expect(priced.estimated_api_input_cost).toBeNull();
    expect(priced.estimated_api_standard_input_cost).toBeNull();
    expect(priced.estimated_api_cache_read_input_cost).toBeNull();
    expect(priced.estimated_api_cache_creation_input_cost).toBeNull();
    expect(priced.estimated_api_output_cost).toBeNull();
    expect(priced.estimated_api_reasoning_output_cost).toBeNull();
    expect(priced.estimated_api_total_cost).toBeNull();
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

    const priced = new TokenCostCalculator().applyPolicy(normalized, trustedPrice);
    expect(priced.estimated_api_total_cost).toBeNull();
  });
});

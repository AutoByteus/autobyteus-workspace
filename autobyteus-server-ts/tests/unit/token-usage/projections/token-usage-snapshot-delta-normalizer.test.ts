import { describe, expect, it } from 'vitest';
import { createTokenUsageUpdatedPayload } from '../../../../src/agent-execution/domain/agent-run-token-usage.js';
import { TokenCostCalculator } from '../../../../src/token-usage/pricing/token-cost-calculator.js';
import { TokenUsageSnapshotDeltaNormalizer } from '../../../../src/token-usage/projections/token-usage-snapshot-delta-normalizer.js';
import type { TokenUsageUpdatedPayload } from '../../../../src/agent-execution/domain/agent-run-token-usage.js';
import type { TokenPriceConfig } from '../../../../src/token-usage/pricing/token-price-config-provider.js';

const cumulativeSnapshotSourceTokensKey = 'autobyteus_cumulative_snapshot_source_tokens';

const trustedPrice: TokenPriceConfig = {
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
  input_price_tiers: [],
  pricing_status: 'trusted',
  trusted_dimensions: {
    input: true,
    output: true,
    cached_input_read: true,
    cached_input_write: true,
  },
  missing_reason: null,
  source: 'autobyteus_model_catalog',
  effective_from: null,
  effective_to: null,
  version: null,
};

let eventSequence = 0;

const buildCumulativeSnapshot = (overrides: Record<string, unknown> = {}) => {
  eventSequence += 1;
  return createTokenUsageUpdatedPayload({
    runId: 'run-snapshot-normalizer-test',
    payload: {
      usage_event_id: `snapshot-event-${eventSequence}`,
      idempotency_key: `snapshot:${eventSequence}`,
      runtime_kind: 'codex_app_server',
      ingestion_kind: 'codex_thread_token_usage',
      usage_scope: 'cumulative_snapshot',
      snapshot_series_key: 'codex_thread:thread-1',
      reported_input_tokens: 100,
      reported_output_tokens: 40,
      reported_total_tokens: 140,
      cache_read_input_tokens: 10,
      cache_creation_input_tokens: 5,
      reasoning_output_tokens: 8,
      billable_input_tokens: 100,
      billable_output_tokens: 48,
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
    expect(second.accounting_output_tokens).toBe(30);
    expect(second.accounting_total_tokens).toBe(80);
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
    expect(third.accounting_output_tokens).toBe(30);
    expect(third.accounting_total_tokens).toBe(90);
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

    const priced = new TokenCostCalculator().applyPrice(regressed, trustedPrice);
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

    const priced = new TokenCostCalculator().applyPrice(normalized, trustedPrice);
    expect(priced.estimated_api_total_cost).toBeNull();
  });
});

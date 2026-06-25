import { describe, expect, it } from 'vitest';
import { createTokenUsageUpdatedPayload } from '../../../../src/agent-execution/domain/agent-run-token-usage.js';
import { TokenCostCalculator } from '../../../../src/token-usage/pricing/token-cost-calculator.js';
import type { TokenPriceConfig } from '../../../../src/token-usage/pricing/token-price-config-provider.js';

const basePrice: TokenPriceConfig = {
  price_config_id: 'price:test',
  model_provider: 'OPENAI',
  model_identifier: 'gpt-test',
  model_value: 'gpt-test',
  canonical_name: 'gpt-test',
  currency: 'USD',
  input_price_per_million: 2,
  output_price_per_million: 10,
  cached_input_read_price_per_million: null,
  cached_input_write_price_per_million: null,
  pricing_status: 'trusted',
  trusted_dimensions: {
    input: true,
    output: true,
    cached_input_read: false,
    cached_input_write: false,
  },
  missing_reason: null,
  source: 'autobyteus_model_catalog',
  effective_from: null,
  effective_to: null,
  version: null,
};

const buildPayload = (overrides: Record<string, unknown> = {}) => createTokenUsageUpdatedPayload({
  runId: 'run-cost-test',
  payload: {
    idempotency_key: `cost:${Math.random()}`,
    runtime_kind: 'autobyteus',
    ingestion_kind: 'autobyteus_llm_phase',
    usage_scope: 'per_call',
    reported_input_tokens: 1000,
    reported_output_tokens: 250,
    reported_total_tokens: 1250,
    accounting_input_tokens: 1000,
    accounting_output_tokens: 250,
    accounting_total_tokens: 1250,
    model_provider: 'OPENAI',
    model_identifier: 'gpt-test',
    ...overrides,
  },
});

describe('TokenCostCalculator', () => {
  const calculator = new TokenCostCalculator();

  it('calculates estimated API input/output/total costs only for trusted dimensions', () => {
    const enriched = calculator.applyPrice(buildPayload(), basePrice);

    expect(enriched.api_cost_status).toBe('estimated');
    expect(enriched.cost_basis).toBe('api_price_estimate');
    expect(enriched.estimated_api_input_cost).toBe(0.002);
    expect(enriched.estimated_api_output_cost).toBe(0.0025);
    expect(enriched.estimated_api_total_cost).toBe(0.0045000000000000005);
    expect(enriched.pricing_status).toBe('trusted');
    expect(enriched.pricing_snapshot_json).toMatchObject({ price_config_id: 'price:test' });
  });

  it('keeps missing/default-zero pricing token-only instead of showing zero estimated cost', () => {
    const enriched = calculator.applyPrice(buildPayload(), {
      ...basePrice,
      price_config_id: null,
      currency: null,
      input_price_per_million: null,
      output_price_per_million: null,
      pricing_status: 'missing',
      trusted_dimensions: {
        input: false,
        output: false,
        cached_input_read: false,
        cached_input_write: false,
      },
      missing_reason: 'pricing_config_absent',
      source: null,
    });

    expect(enriched.api_cost_status).toBe('price_missing');
    expect(enriched.cost_basis).toBeNull();
    expect(enriched.estimated_api_input_cost).toBeNull();
    expect(enriched.estimated_api_output_cost).toBeNull();
    expect(enriched.estimated_api_total_cost).toBeNull();
    expect(enriched.pricing_missing_reason).toBe('pricing_config_absent');
  });

  it('marks cache-priced rows partial when standard prices are trusted but cache prices are absent', () => {
    const enriched = calculator.applyPrice(buildPayload({
      accounting_input_tokens: 1000,
      cache_read_input_tokens: 400,
      cache_creation_input_tokens: null,
    }), basePrice);

    expect(enriched.api_cost_status).toBe('partial_price_missing');
    expect(enriched.pricing_missing_reason).toBe('dimension_missing');
    expect(enriched.estimated_api_standard_input_cost).toBe(0.0012);
    expect(enriched.estimated_api_cache_read_input_cost).toBeNull();
    expect(enriched.estimated_api_output_cost).toBe(0.0025);
    expect(enriched.estimated_api_total_cost).toBe(0.0037);
  });
});

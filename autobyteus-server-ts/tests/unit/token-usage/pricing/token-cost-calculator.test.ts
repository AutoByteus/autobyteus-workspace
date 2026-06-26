import { describe, expect, it } from 'vitest';
import { createTokenUsageUpdatedPayload } from '../../../../src/agent-execution/domain/agent-run-token-usage.js';
import { TokenCostCalculator } from '../../../../src/token-usage/pricing/token-cost-calculator.js';
import type { ResolvedTokenPricingPolicy } from '../../../../src/token-usage/pricing/token-pricing-policy.js';

const basePrice: ResolvedTokenPricingPolicy = {
  pricing_policy_key: 'price:test',
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
  cached_input_write_5m_price_per_million: null,
  cached_input_write_1h_price_per_million: null,
  input_price_tiers: [],
  pricing_status: 'trusted',
  trusted_dimensions: {
    input: true,
    output: true,
    cached_input_read: false,
    cached_input_write: false,
    cached_input_write_5m: false,
    cached_input_write_1h: false,
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
    input_token_semantic: 'gross_includes_cache',
    accounting_input_tokens: 1000,
    accounting_output_tokens: 250,
    accounting_total_tokens: 1250,
    standard_input_tokens: 1000,
    cache_state: 'not_reported',
    model_provider: 'OPENAI',
    model_identifier: 'gpt-test',
    ...overrides,
  },
});

describe('TokenCostCalculator', () => {
  const calculator = new TokenCostCalculator();

  it('calculates estimated API input/output/total costs only for trusted dimensions', () => {
    const enriched = calculator.applyPolicy(buildPayload(), basePrice);

    expect(enriched.api_cost_status).toBe('estimated');
    expect(enriched.cost_basis).toBe('api_price_estimate');
    expect(enriched.estimated_api_input_cost).toBe(0.002);
    expect(enriched.estimated_api_output_cost).toBe(0.0025);
    expect(enriched.estimated_api_total_cost).toBe(0.0045000000000000005);
    expect(enriched.pricing_status).toBe('trusted');
    expect(enriched.pricing_snapshot_json).toMatchObject({ pricing_policy_key: 'price:test' });
  });

  it('keeps missing/default-zero pricing token-only instead of showing zero estimated cost', () => {
    const enriched = calculator.applyPolicy(buildPayload(), {
      ...basePrice,
      pricing_policy_key: null,
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
        cached_input_write_5m: false,
        cached_input_write_1h: false,
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
    const enriched = calculator.applyPolicy(buildPayload({
      accounting_input_tokens: 1000,
      standard_input_tokens: 600,
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

  it('uses billable output tokens for output cost and reports reasoning as a subcost without double counting', () => {
    const enriched = calculator.applyPolicy(buildPayload({
      accounting_output_tokens: 3,
      billable_output_tokens: 115,
      reasoning_output_tokens: 112,
    }), basePrice);

    expect(enriched.api_cost_status).toBe('estimated');
    expect(enriched.estimated_api_output_cost).toBe(0.00115);
    expect(enriched.estimated_api_reasoning_output_cost).toBe(0.00112);
    expect(enriched.estimated_api_total_cost).toBe(0.00315);
  });

  it('prices cache creation input when the cache-write dimension is trusted', () => {
    const enriched = calculator.applyPolicy(buildPayload({
      accounting_input_tokens: 1000,
      standard_input_tokens: 700,
      cache_creation_input_tokens: 300,
    }), {
      ...basePrice,
      cached_input_write_price_per_million: 1,
      trusted_dimensions: {
        ...basePrice.trusted_dimensions,
        cached_input_write: true,
      },
    });

    expect(enriched.api_cost_status).toBe('estimated');
    expect(enriched.estimated_api_standard_input_cost).toBe(0.0014);
    expect(enriched.estimated_api_cache_creation_input_cost).toBe(0.0003);
    expect(enriched.estimated_api_input_cost).toBeCloseTo(0.0017);
    expect(enriched.estimated_api_output_cost).toBe(0.0025);
    expect(enriched.estimated_api_total_cost).toBeCloseTo(0.0042);
  });

  it('marks positive cache creation tokens partial when cache-write pricing is missing', () => {
    const enriched = calculator.applyPolicy(buildPayload({
      accounting_input_tokens: 1000,
      standard_input_tokens: 700,
      cache_creation_input_tokens: 300,
    }), basePrice);

    expect(enriched.api_cost_status).toBe('partial_price_missing');
    expect(enriched.pricing_missing_reason).toBe('dimension_missing');
    expect(enriched.estimated_api_standard_input_cost).toBe(0.0014);
    expect(enriched.estimated_api_cache_creation_input_cost).toBeNull();
    expect(enriched.estimated_api_input_cost).toBe(0.0014);
    expect(enriched.estimated_api_output_cost).toBe(0.0025);
    expect(enriched.estimated_api_total_cost).toBe(0.0039);
  });

  it('prices cache read input when the cache dimension is trusted', () => {
    const enriched = calculator.applyPolicy(buildPayload({
      accounting_input_tokens: 1000,
      standard_input_tokens: 600,
      cache_read_input_tokens: 400,
    }), {
      ...basePrice,
      cached_input_read_price_per_million: 0.2,
      trusted_dimensions: {
        ...basePrice.trusted_dimensions,
        cached_input_read: true,
      },
    });

    expect(enriched.api_cost_status).toBe('estimated');
    expect(enriched.estimated_api_standard_input_cost).toBe(0.0012);
    expect(enriched.estimated_api_cache_read_input_cost).toBe(0.00008);
    expect(enriched.estimated_api_input_cost).toBeCloseTo(0.00128);
  });

  it('selects input-size pricing tiers from event input tokens', () => {
    const tieredPrice: ResolvedTokenPricingPolicy = {
      ...basePrice,
      input_price_tiers: [
        {
          tier_id: 'le_512k',
          max_input_tokens: 512000,
          input_price_per_million: 0.3,
          output_price_per_million: 1.2,
          cached_input_read_price_per_million: 0.06,
          cached_input_write_price_per_million: null,
          cached_input_write_5m_price_per_million: null,
          cached_input_write_1h_price_per_million: null,
          trusted_dimensions: {
            input: true,
            output: true,
            cached_input_read: true,
            cached_input_write: false,
            cached_input_write_5m: false,
            cached_input_write_1h: false,
          },
        },
        {
          tier_id: 'gt_512k',
          max_input_tokens: null,
          input_price_per_million: 0.6,
          output_price_per_million: 2.4,
          cached_input_read_price_per_million: 0.12,
          cached_input_write_price_per_million: null,
          cached_input_write_5m_price_per_million: null,
          cached_input_write_1h_price_per_million: null,
          trusted_dimensions: {
            input: true,
            output: true,
            cached_input_read: true,
            cached_input_write: false,
            cached_input_write_5m: false,
            cached_input_write_1h: false,
          },
        },
      ],
    };

    const enriched = calculator.applyPolicy(buildPayload({
      accounting_input_tokens: 600000,
      accounting_output_tokens: 1000,
      accounting_total_tokens: 601000,
      standard_input_tokens: 600000,
    }), tieredPrice);

    expect(enriched.input_price_per_million).toBe(0.6);
    expect(enriched.output_price_per_million).toBe(2.4);
    expect(enriched.pricing_snapshot_json).toMatchObject({ selected_tier_id: 'gt_512k' });
    expect(enriched.estimated_api_input_cost).toBe(0.36);
    expect(enriched.estimated_api_output_cost).toBe(0.0024);
  });

});

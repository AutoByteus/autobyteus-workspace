import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMFactory } from 'autobyteus-ts';
import { LMStudioModelProvider } from 'autobyteus-ts/llm/lmstudio-provider.js';
import { OllamaModelProvider } from 'autobyteus-ts/llm/ollama-provider.js';
import { TokenPriceConfigProvider } from '../../../../src/token-usage/pricing/token-price-config-provider.js';

const ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'KIMI_API_KEY',
  'MISTRAL_API_KEY',
  'GEMINI_API_KEY',
  'VERTEX_AI_API_KEY',
] as const;

describe('TokenPriceConfigProvider Anthropic catalog policies', () => {
  const originalEnv = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv.set(key, process.env[key]);
      delete process.env[key];
    }

    vi.spyOn(OllamaModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    vi.spyOn(LMStudioModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    LLMFactory.resetForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    LLMFactory.resetForTests();

    for (const key of ENV_KEYS) {
      const value = originalEnv.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    originalEnv.clear();
  });

  it.each([
    ['claude-fable-5', 10, 50, 1, 12.5, 20],
    ['claude-opus-4.8', 5, 25, 0.5, 6.25, 10],
    ['claude-opus-5', 5, 25, 0.5, 6.25, 10],
    ['claude-sonnet-5', 3, 15, 0.3, 3.75, 6],
  ] as const)(
    'exposes cache-aware Anthropic pricing dimensions for %s to server token-pricing consumers',
    async (modelIdentifier, input, output, cacheRead, cacheWrite5m, cacheWrite1h) => {
      const policy = await new TokenPriceConfigProvider().resolvePolicy({
        runtime_kind: 'autobyteus',
        model_provider: 'ANTHROPIC',
        model_identifier: modelIdentifier,
        model_value: null,
        observed_at: '2026-07-07T00:00:00.000Z',
      });

      expect(policy).toMatchObject({
        pricing_policy_key: `autobyteus_model_catalog:ANTHROPIC:${modelIdentifier}`,
        price_config_id: `autobyteus_model_catalog:ANTHROPIC:${modelIdentifier}`,
        model_provider: 'ANTHROPIC',
        model_identifier: modelIdentifier,
        canonical_name: modelIdentifier,
        currency: 'USD',
        pricing_status: 'trusted',
        input_price_per_million: input,
        output_price_per_million: output,
        cached_input_read_price_per_million: cacheRead,
        cached_input_write_5m_price_per_million: cacheWrite5m,
        cached_input_write_1h_price_per_million: cacheWrite1h,
        trusted_dimensions: {
          input: true,
          output: true,
          cached_input_read: true,
          cached_input_write_5m: true,
          cached_input_write_1h: true,
        },
      });
    },
  );

  it.each([
    ['2026-01-01T02:00:00.000Z', 'flat', 0.14, 0.28, 0.0028],
    ['2025-01-01T05:00:00.000Z', 'flat', 0.14, 0.28, 0.0028],
  ] as const)('selects the effective DeepSeek V4 pricing period (%s)', async (observedAt, period, input, output, cacheRead) => {
    const policy = await new TokenPriceConfigProvider().resolvePolicy({
      runtime_kind: 'autobyteus',
      model_provider: 'DEEPSEEK',
      model_identifier: 'deepseek-v4-flash',
      model_value: null,
      observed_at: observedAt,
    });

    expect(policy).toMatchObject({
      pricing_status: 'trusted',
      input_price_per_million: input,
      output_price_per_million: output,
      cached_input_read_price_per_million: cacheRead,
      pricing_schedule_id: period === 'flat' ? 'deepseek-v4-before-2026-08-17' : 'deepseek-v4-2026-08-17',
      pricing_schedule_period_id: period,
      pricing_schedule_effective_from: period === 'flat' ? null : '2026-08-16T16:00:00Z',
      pricing_schedule_window_timezone: period === 'flat' ? null : 'UTC',
    });
    expect(policy.pricing_policy_key).toContain(`:${period === 'flat' ? 'deepseek-v4-before-2026-08-17' : 'deepseek-v4-2026-08-17'}:${period}`);
  });

  it('does not guess a DeepSeek price when the scheduled timestamp is invalid', async () => {
    const policy = await new TokenPriceConfigProvider().resolvePolicy({
      runtime_kind: 'autobyteus',
      model_provider: 'DEEPSEEK',
      model_identifier: 'deepseek-v4-pro',
      model_value: null,
      observed_at: 'not-a-timestamp',
    });

    expect(policy).toMatchObject({
      pricing_status: 'missing',
      missing_reason: 'pricing_schedule_time_invalid',
      input_price_per_million: null,
      output_price_per_million: null,
      cached_input_read_price_per_million: null,
      pricing_schedule_id: null,
      pricing_schedule_period_id: null,
    });
  });
});

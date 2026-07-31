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
});

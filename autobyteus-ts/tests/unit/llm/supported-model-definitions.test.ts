import { beforeAll, describe, expect, it } from 'vitest';
import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { LLMModel } from '../../../src/llm/models.js';
import { supportedModelDefinitions } from '../../../src/llm/supported-model-definitions.js';
import { LLMProvider } from '../../../src/llm/providers.js';

describe('supportedModelDefinitions', () => {
  beforeAll(() => {
    LLMFactory.resetForTests();
    (LLMFactory as unknown as { initialized: boolean }).initialized = true;
    for (const definition of supportedModelDefinitions) {
      if (definition.name === 'gemini-3.5-flash' || definition.name === 'minimax-m3') {
        LLMFactory.registerModel(new LLMModel(definition));
      }
    }
  });

  it('exposes trusted shared-catalog pricing through the server-facing pricing lookup', async () => {
    const gemini35Flash = await LLMFactory.getModelPricingInfo({
      modelIdentifier: 'gemini-3.5-flash',
      modelProvider: LLMProvider.GEMINI,
    });

    expect(gemini35Flash).toMatchObject({
      model_identifier: 'gemini-3.5-flash',
      model_value: 'gemini-3.5-flash',
      canonical_name: 'gemini-3.5-flash',
      model_provider: LLMProvider.GEMINI,
      pricing_status: 'trusted',
      pricing_source: 'autobyteus_model_catalog',
      currency: 'USD',
      input_price_per_million: 1.5,
      output_price_per_million: 9.0,
      trusted_dimensions: {
        input: true,
        output: true,
        cached_input_read: false,
        cached_input_write: false,
      },
    });
    expect(gemini35Flash?.price_config_id).toBe('autobyteus_model_catalog:GEMINI:gemini-3.5-flash');
  });

  it('keeps current unpriced/default-zero catalog entries price-missing instead of trusted zero', async () => {
    const minimaxM3 = await LLMFactory.getModelPricingInfo({
      modelIdentifier: 'minimax-m3',
      modelProvider: LLMProvider.MINIMAX,
    });

    expect(minimaxM3).toMatchObject({
      model_identifier: 'minimax-m3',
      model_value: 'MiniMax-M3',
      pricing_status: 'missing',
      pricing_source: null,
      currency: null,
      input_price_per_million: null,
      output_price_per_million: null,
      trusted_dimensions: {
        input: false,
        output: false,
        cached_input_read: false,
        cached_input_write: false,
      },
      missing_reason: 'pricing_config_absent',
    });
  });

  it('refreshes user-directed model registry entries without stale default choices', () => {
    const names = new Set(supportedModelDefinitions.map((model) => model.name));
    const values = new Set(supportedModelDefinitions.map((model) => model.value));

    expect(Array.from(names)).toEqual(expect.arrayContaining([
      'claude-opus-4.8',
      'grok-4.3',
      'grok-build-0.1',
      'minimax-m3',
      'qwen3.7-max',
    ]));
    expect(values).toContain('claude-opus-4-8');
    expect(values).toContain('MiniMax-M3');
    expect(names).not.toContain('claude-haiku-4.5');
    expect(names).not.toContain('grok-4-1-fast-reasoning');
    expect(names).not.toContain('grok-code-fast-1');
  });
});

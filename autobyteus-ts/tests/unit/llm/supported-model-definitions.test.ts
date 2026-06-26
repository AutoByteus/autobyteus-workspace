import { beforeAll, describe, expect, it } from 'vitest';
import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { LLMModel } from '../../../src/llm/models.js';
import { supportedModelDefinitions } from '../../../src/llm/supported-model-definitions.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { getCuratedModelMetadata } from '../../../src/llm/metadata/curated-model-metadata.js';

describe('supportedModelDefinitions', () => {
  beforeAll(() => {
    LLMFactory.resetForTests();
    (LLMFactory as unknown as { initialized: boolean }).initialized = true;
    for (const definition of supportedModelDefinitions) {
      if ([
        'gemini-3.5-flash',
        'gemini-3.1-pro-preview',
        'minimax-m3',
        'deepseek-v4-pro',
        'claude-opus-4.8',
        'grok-4.3',
        'kimi-k2.7-code',
        'kimi-k2.7-code-highspeed',
        'qwen3-max',
        'glm-5.2',
      ].includes(definition.name)) {
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
      cached_input_read_price_per_million: 0.15,
      trusted_dimensions: {
        input: true,
        output: true,
        cached_input_read: true,
        cached_input_write: false,
      },
    });
    expect(gemini35Flash?.price_config_id).toBe('autobyteus_model_catalog:GEMINI:gemini-3.5-flash');
  });

  it('corrects verified non-Mistral model prices and cache dimensions', async () => {
    await expect(LLMFactory.getModelPricingInfo({ modelIdentifier: 'deepseek-v4-pro', modelProvider: LLMProvider.DEEPSEEK }))
      .resolves.toMatchObject({
        pricing_status: 'trusted',
        input_price_per_million: 0.435,
        output_price_per_million: 0.87,
        cached_input_read_price_per_million: 0.003625,
        trusted_dimensions: { cached_input_read: true },
      });

    await expect(LLMFactory.getModelPricingInfo({ modelIdentifier: 'claude-opus-4.8', modelProvider: LLMProvider.ANTHROPIC }))
      .resolves.toMatchObject({ input_price_per_million: 5, output_price_per_million: 25 });

    await expect(LLMFactory.getModelPricingInfo({ modelIdentifier: 'grok-4.3', modelProvider: LLMProvider.GROK }))
      .resolves.toMatchObject({ input_price_per_million: 1.25, output_price_per_million: 2.5, cached_input_read_price_per_million: 0.2 });

    await expect(LLMFactory.getModelPricingInfo({ modelIdentifier: 'kimi-k2.7-code', modelProvider: LLMProvider.KIMI }))
      .resolves.toMatchObject({ input_price_per_million: 0.95, output_price_per_million: 4, cached_input_read_price_per_million: 0.19 });
  });

  it('uses the shared fixed Kimi K2.7 Code policy for both official catalog rows', () => {
    const standard = supportedModelDefinitions.find((definition) => definition.name === 'kimi-k2.7-code');
    const highspeed = supportedModelDefinitions.find((definition) => definition.name === 'kimi-k2.7-code-highspeed');

    expect(standard?.defaultConfig).toMatchObject({
      temperature: 1,
      topP: 0.95,
      presencePenalty: 0,
      frequencyPenalty: 0,
      extraParams: { n: 1 },
    });
    expect(highspeed?.defaultConfig).toMatchObject({
      temperature: 1,
      topP: 0.95,
      presencePenalty: 0,
      frequencyPenalty: 0,
      extraParams: { n: 1 },
    });
  });

  it('encodes tiered and non-USD pricing without flattening provider-specific facts', async () => {
    const minimaxM3 = await LLMFactory.getModelPricingInfo({
      modelIdentifier: 'minimax-m3',
      modelProvider: LLMProvider.MINIMAX,
    });
    expect(minimaxM3).toMatchObject({
      model_identifier: 'minimax-m3',
      model_value: 'MiniMax-M3',
      pricing_status: 'trusted',
      input_price_per_million: 0.3,
      output_price_per_million: 1.2,
      cached_input_read_price_per_million: 0.06,
    });
    expect(minimaxM3?.input_price_tiers).toEqual([
      expect.objectContaining({ tier_id: 'standard_le_512k', max_input_tokens: 512000, input_price_per_million: 0.3, output_price_per_million: 1.2 }),
      expect.objectContaining({ tier_id: 'standard_gt_512k', max_input_tokens: null, input_price_per_million: 0.6, output_price_per_million: 2.4 }),
    ]);

    const geminiPro = await LLMFactory.getModelPricingInfo({ modelIdentifier: 'gemini-3.1-pro-preview', modelProvider: LLMProvider.GEMINI });
    expect(geminiPro?.input_price_tiers).toEqual([
      expect.objectContaining({
        tier_id: 'prompt_le_200k',
        max_input_tokens: 200000,
        input_price_per_million: 2.25,
        output_price_per_million: 18,
        cached_input_read_price_per_million: 0.225,
      }),
      expect.objectContaining({
        tier_id: 'prompt_gt_200k',
        max_input_tokens: null,
        input_price_per_million: 4.5,
        output_price_per_million: 27,
        cached_input_read_price_per_million: 0.45,
      }),
    ]);

    const glm = await LLMFactory.getModelPricingInfo({ modelIdentifier: 'glm-5.2', modelProvider: LLMProvider.GLM });
    expect(glm).toMatchObject({ currency: 'CNY', input_price_per_million: 8, output_price_per_million: 28, cached_input_read_price_per_million: 2 });
  });

  it('keeps ambiguous Qwen pricing missing instead of trusted flat estimates', async () => {
    const qwen = await LLMFactory.getModelPricingInfo({
      modelIdentifier: 'qwen3-max',
      modelProvider: LLMProvider.QWEN,
    });

    expect(qwen).toMatchObject({
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

  it('removes MiniMax M2.7 from the registry and curated metadata', () => {
    const names = new Set(supportedModelDefinitions.map((model) => model.name));
    const values = new Set(supportedModelDefinitions.map((model) => model.value));

    expect(names).toContain('minimax-m3');
    expect(values).toContain('MiniMax-M3');
    expect(names).not.toContain('minimax-m2.7');
    expect(values).not.toContain('MiniMax-M2.7');
    expect(getCuratedModelMetadata({
      provider: LLMProvider.MINIMAX,
      name: 'minimax-m2.7',
      value: 'MiniMax-M2.7',
      canonicalName: 'minimax-m2.7',
    })).toBeNull();
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

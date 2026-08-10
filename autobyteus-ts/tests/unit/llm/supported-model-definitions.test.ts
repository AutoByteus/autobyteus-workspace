import { beforeAll, describe, expect, it } from 'vitest';
import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { LLMModel } from '../../../src/llm/models.js';
import { supportedModelDefinitions } from '../../../src/llm/supported-model-definitions.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { OpenAILLM } from '../../../src/llm/api/openai-llm.js';

describe('supportedModelDefinitions', () => {
  beforeAll(() => {
    LLMFactory.resetForTests();
    (LLMFactory as unknown as { initialized: boolean }).initialized = true;
    for (const definition of supportedModelDefinitions) {
      if ([
        'gpt-5.6-sol',
        'gpt-5.6-terra',
        'gpt-5.6-luna',
        'gemini-3.5-flash',
        'gemini-3.1-pro-preview',
        'minimax-m3',
        'deepseek-v4-pro',
        'DeepSeek V4 Flash 0731 (Qwen)',
        'claude-opus-5',
        'claude-fable-5',
        'claude-opus-4.8',
        'claude-sonnet-5',
        'grok-4.5',
        'kimi-k2.7-code',
        'kimi-k2.7-code-highspeed',
        'qwen3-max',
        'glm-5.2',
      ].includes(definition.name)) {
        LLMFactory.registerModel(new LLMModel(definition));
      }
    }
  });

  it('registers exactly the three canonical GPT-5.6 models with family-specific reasoning and tiered cache pricing', async () => {
    const cases = [
      ['gpt-5.6-sol', 5, 30, 0.5, 6.25],
      ['gpt-5.6-terra', 2, 12, 0.2, 2.5],
      ['gpt-5.6-luna', 0.2, 1.2, 0.02, 0.25],
    ] as const;
    const openAIIds = supportedModelDefinitions
      .filter((definition) => definition.provider === LLMProvider.OPENAI)
      .map((definition) => definition.name);

    expect(openAIIds.filter((id) => id.startsWith('gpt-5.6-')).sort()).toEqual(cases.map(([id]) => id).sort());
    expect(openAIIds).not.toContain('gpt-5.6');

    for (const [modelId, input, output, cacheRead, cacheWrite] of cases) {
      const definition = supportedModelDefinitions.find((entry) => entry.name === modelId);
      expect(definition).toMatchObject({
        name: modelId,
        value: modelId,
        canonicalName: modelId,
        provider: LLMProvider.OPENAI,
        llmClass: OpenAILLM,
      });
      expect(definition?.configSchema?.toJsonSchema()).toMatchObject({
        properties: {
          reasoning_effort: {
            default: 'medium',
            enum: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
          },
          reasoning_summary: { enum: ['none', 'auto', 'concise', 'detailed'] },
        },
      });

      const modelPricing = await LLMFactory.getModelPricingInfo({
        modelIdentifier: modelId,
        modelProvider: LLMProvider.OPENAI,
      });
      expect(modelPricing).toMatchObject({
        pricing_status: 'trusted',
        input_price_per_million: input,
        output_price_per_million: output,
        cached_input_read_price_per_million: cacheRead,
        cached_input_write_price_per_million: cacheWrite,
        trusted_dimensions: { cached_input_read: true, cached_input_write: true },
      });
      expect(modelPricing?.input_price_tiers).toEqual([
        expect.objectContaining({
          tier_id: 'standard_le_272k',
          max_input_tokens: 272000,
          input_price_per_million: input,
          output_price_per_million: output,
          cached_input_read_price_per_million: cacheRead,
          cached_input_write_price_per_million: cacheWrite,
        }),
        expect.objectContaining({
          tier_id: 'long_context_gt_272k',
          max_input_tokens: null,
          input_price_per_million: input * 2,
          output_price_per_million: Number((output * 1.5).toFixed(10)),
          cached_input_read_price_per_million: cacheRead * 2,
          cached_input_write_price_per_million: cacheWrite * 2,
        }),
      ]);
      expect(definition?.defaultConfig?.pricingConfig.pricingEffectiveDate).toBe('2026-07-30');
    }

    const olderSchema = supportedModelDefinitions.find((entry) => entry.name === 'gpt-5.5')?.configSchema?.toJsonSchema();
    expect(olderSchema).toMatchObject({
      properties: {
        reasoning_effort: {
          default: 'none',
          enum: ['none', 'low', 'medium', 'high', 'xhigh'],
        },
      },
    });
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

  it('keeps Gemini model definitions credential-independent', () => {
    const definition = supportedModelDefinitions.find(
      (entry) => entry.name === 'gemini-3.5-flash',
    );
    expect(definition).toBeDefined();
    expect(definition).not.toHaveProperty('credentialProviderId');
    expect(definition).not.toHaveProperty('authenticationRequirement');
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

    await expect(LLMFactory.getModelPricingInfo({ modelIdentifier: 'grok-4.5', modelProvider: LLMProvider.GROK }))
      .resolves.toMatchObject({
        pricing_status: 'trusted',
        pricing_source: 'autobyteus_model_catalog',
        input_price_per_million: 2,
        output_price_per_million: 6,
        cached_input_read_price_per_million: 0.5,
      });

    await expect(LLMFactory.getModelPricingInfo({ modelIdentifier: 'kimi-k2.7-code', modelProvider: LLMProvider.KIMI }))
      .resolves.toMatchObject({ input_price_per_million: 0.95, output_price_per_million: 4, cached_input_read_price_per_million: 0.19 });
  });

  it('registers current Anthropic target models with exact IDs and cache-aware standard pricing', async () => {
    const names = new Set(supportedModelDefinitions.map((model) => model.name));
    const values = new Set(supportedModelDefinitions.map((model) => model.value));

    expect(Array.from(names)).toEqual(expect.arrayContaining([
      'claude-fable-5',
      'claude-opus-5',
      'claude-opus-4.8',
      'claude-sonnet-5',
    ]));
    expect(Array.from(values)).toEqual(expect.arrayContaining([
      'claude-fable-5',
      'claude-opus-5',
      'claude-opus-4-8',
      'claude-sonnet-5',
    ]));
    expect(names).not.toContain('claude-sonnet-4.8');
    expect(values).not.toContain('claude-sonnet-4-8');

    const expectedPricing = [
      ['claude-opus-5', 5, 25, 0.5, 6.25, 10, '2026-07-24'],
      ['claude-fable-5', 10, 50, 1, 12.5, 20, '2026-07-07'],
      ['claude-opus-4.8', 5, 25, 0.5, 6.25, 10, '2026-07-07'],
      ['claude-sonnet-5', 3, 15, 0.3, 3.75, 6, '2026-07-07'],
    ] as const;

    for (const [modelIdentifier, input, output, cacheRead, cacheWrite5m, cacheWrite1h, effectiveDate] of expectedPricing) {
      const pricing = await LLMFactory.getModelPricingInfo({
        modelIdentifier,
        modelProvider: LLMProvider.ANTHROPIC,
      });

      expect(pricing).toMatchObject({
        pricing_status: 'trusted',
        pricing_source: 'autobyteus_model_catalog',
        currency: 'USD',
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
      expect(supportedModelDefinitions.find((definition) => definition.name === modelIdentifier)?.defaultConfig?.pricingConfig.pricingEffectiveDate)
        .toBe(effectiveDate);
    }
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

  it('defines the exact Qwen-served target values with unique cross-provider identifiers', () => {
    const qwenDefinitions = supportedModelDefinitions.filter(
      (definition) => definition.provider === LLMProvider.QWEN,
    );
    const byValue = new Map(qwenDefinitions.map((definition) => [definition.value, definition]));

    expect(byValue.get('qwen3.8-max')).toMatchObject({
      name: 'qwen3.8-max',
      value: 'qwen3.8-max',
      canonicalName: 'qwen3.8-max',
      staticMetadata: {
        maxContextTokens: 1_000_000,
        maxInputTokens: null,
        maxOutputTokens: null,
      },
    });
    expect(byValue.get('deepseek-v4-pro')).toMatchObject({
      value: 'deepseek-v4-pro',
      modelIdentifierOverride: 'qwen:deepseek-v4-pro',
      staticMetadata: { maxContextTokens: 1_000_000 },
    });
    expect(byValue.get('deepseek-v4-flash-0731')).toMatchObject({
      name: 'DeepSeek V4 Flash 0731 (Qwen)',
      value: 'deepseek-v4-flash-0731',
      provider: LLMProvider.QWEN,
      llmClass: expect.any(Function),
      canonicalName: 'deepseek-v4-flash-0731',
      modelIdentifierOverride: 'qwen:deepseek-v4-flash-0731',
      staticMetadata: {
        maxContextTokens: 1_000_000,
        maxInputTokens: null,
        maxOutputTokens: null,
        provenance: {
          sourceUrl: 'https://www.alibabacloud.com/help/en/model-studio/text-generation-model',
          verifiedAt: '2026-08-06',
        },
      },
    });
    expect(byValue.get('glm-5.2')).toMatchObject({
      value: 'glm-5.2',
      modelIdentifierOverride: 'qwen:glm-5.2',
      staticMetadata: { maxContextTokens: 198_000 },
    });
    expect(qwenDefinitions.some((definition) => definition.value === 'qwen3.8-max-preview'))
      .toBe(false);

    const qwenDeepSeek = new LLMModel(byValue.get('deepseek-v4-pro')!);
    const qwenDeepSeekFlash = new LLMModel(byValue.get('deepseek-v4-flash-0731')!);
    const directDeepSeek = new LLMModel(supportedModelDefinitions.find(
      (definition) => definition.provider === LLMProvider.DEEPSEEK
        && definition.value === 'deepseek-v4-pro',
    )!);
    const qwenGlm = new LLMModel(byValue.get('glm-5.2')!);
    const directGlm = new LLMModel(supportedModelDefinitions.find(
      (definition) => definition.provider === LLMProvider.GLM
        && definition.value === 'glm-5.2',
    )!);

    expect(qwenDeepSeek.value).toBe(directDeepSeek.value);
    expect(qwenDeepSeek.modelIdentifier).not.toBe(directDeepSeek.modelIdentifier);
    expect(qwenDeepSeekFlash.modelIdentifier).toBe('qwen:deepseek-v4-flash-0731');
    expect(qwenDeepSeekFlash.value).toBe('deepseek-v4-flash-0731');
    expect(qwenDeepSeekFlash.modelIdentifier).not.toBe('deepseek-v4-flash');
    expect(qwenGlm.value).toBe(directGlm.value);
    expect(qwenGlm.modelIdentifier).not.toBe(directGlm.modelIdentifier);
  });

  it('removes MiniMax M2.7 and keeps built-in capability metadata on definitions', () => {
    const names = new Set(supportedModelDefinitions.map((model) => model.name));
    const values = new Set(supportedModelDefinitions.map((model) => model.value));

    expect(names).toContain('minimax-m3');
    expect(values).toContain('MiniMax-M3');
    expect(names).not.toContain('minimax-m2.7');
    expect(values).not.toContain('MiniMax-M2.7');

    expect(supportedModelDefinitions.every((definition) => definition.staticMetadata)).toBe(true);
    for (const definition of supportedModelDefinitions.filter(
      (entry) => entry.provider === LLMProvider.GEMINI,
    )) {
      expect(definition.staticMetadata.multimodalCapabilities).toEqual({
        image: 'supported',
        audio: 'supported',
        video: 'supported',
      });
    }
    for (const definition of supportedModelDefinitions.filter(
      (entry) => entry.provider === LLMProvider.DEEPSEEK,
    )) {
      expect(definition.staticMetadata.multimodalCapabilities.image).toBe('unsupported');
    }
  });

  it('refreshes user-directed model registry entries without stale default choices', () => {
    const names = new Set(supportedModelDefinitions.map((model) => model.name));
    const values = new Set(supportedModelDefinitions.map((model) => model.value));

    expect(Array.from(names)).toEqual(expect.arrayContaining([
      'claude-fable-5',
      'claude-opus-4.8',
      'claude-sonnet-5',
      'grok-4.5',
      'minimax-m3',
      'qwen3.7-max',
    ]));
    expect(values).toContain('claude-fable-5');
    expect(values).toContain('claude-opus-4-8');
    expect(values).toContain('claude-sonnet-5');
    expect(values).toContain('MiniMax-M3');
    expect(names).not.toContain('claude-haiku-4.5');
    expect(names).not.toContain('claude-sonnet-4.8');
    expect(names).not.toContain('grok-4.3');
    expect(names).not.toContain('grok-build-0.1');
    expect(names).not.toContain('grok-4-1-fast-reasoning');
    expect(names).not.toContain('grok-code-fast-1');
  });

  it('exposes only Grok 4.5 with the provider reasoning contract', async () => {
    const grokDefinitions = supportedModelDefinitions.filter((definition) => definition.provider === LLMProvider.GROK);
    expect(grokDefinitions.map((definition) => definition.name)).toEqual(['grok-4.5']);
    expect(grokDefinitions[0]).toMatchObject({
      name: 'grok-4.5',
      value: 'grok-4.5',
      canonicalName: 'grok-4.5',
    });
    expect(grokDefinitions[0]?.defaultConfig).toMatchObject({
      extraParams: { reasoning_effort: 'high' },
    });
    expect(grokDefinitions[0]?.configSchema?.toJsonSchema()).toMatchObject({
      properties: {
        reasoning_effort: {
          default: 'high',
          enum: ['low', 'medium', 'high'],
        },
      },
    });
    expect(grokDefinitions[0]?.defaultConfig?.pricingConfig.pricingEffectiveDate).toBe('2026-07-08');
    expect(await LLMFactory.getModelPricingInfo({
      modelIdentifier: 'grok-4.5',
      modelProvider: LLMProvider.GROK,
    })).toMatchObject({
      input_price_per_million: 2,
      output_price_per_million: 6,
      cached_input_read_price_per_million: 0.5,
    });
    await expect(LLMFactory.createLLM('grok-4.3')).rejects.toThrow("Model with identifier 'grok-4.3' not found.");
    await expect(LLMFactory.createLLM('grok-build-0.1')).rejects.toThrow("Model with identifier 'grok-build-0.1' not found.");
  });
});

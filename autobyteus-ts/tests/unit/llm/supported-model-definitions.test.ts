import { beforeAll, describe, expect, it } from 'vitest';
import { LLMFactory, CurrentModelSelectionRequiredError } from '../../../src/llm/llm-factory.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { supportedModelDefinitions } from '../../../src/llm/supported-model-definitions.js';

describe('current supported model definitions', () => {
  beforeAll(() => {
    LLMFactory.resetForTests();
    (LLMFactory as unknown as { initialized: boolean }).initialized = true;
    for (const definition of supportedModelDefinitions) {
      LLMFactory.registerModel(new LLMModel(definition));
    }
  });

  it('contains current named rows and removes the replaced curated identifiers', () => {
    const names = new Set(supportedModelDefinitions.map((definition) => definition.name));
    expect([...names]).toEqual(expect.arrayContaining([
      'grok-4.6', 'gemini-3.8-flash', 'kimi-k3', 'glm-5.3', 'minimax-m3',
    ]));
    expect([...names].some((name) => name === 'grok-4.5' || name === 'gemini-3.5-flash'
      || name === 'gemini-3.7-flash' || name === 'gemini-3-flash-preview'
      || name.startsWith('kimi-k2') || name === 'glm-5.2')).toBe(false);
  });

  it('uses current provider values and request schemas', () => {
    expect(supportedModelDefinitions.find((definition) => definition.name === 'minimax-m3')).toMatchObject({
      value: 'MiniMax-M3',
      provider: LLMProvider.MINIMAX,
    });
    expect(supportedModelDefinitions.find((definition) => definition.name === 'grok-4.6')?.configSchema?.toJsonSchema())
      .toMatchObject({ properties: { reasoning_effort: { enum: ['low', 'medium', 'high', 'xhigh'], default: 'high' } } });
    expect(supportedModelDefinitions.find((definition) => definition.name === 'gemini-3.8-flash')?.configSchema?.toJsonSchema())
      .toMatchObject({ properties: {
        thinking_level: { enum: ['low', 'medium', 'high'], default: 'medium' },
        include_thoughts: { default: false },
      } });
    expect(supportedModelDefinitions.find((definition) => definition.name === 'glm-5.3')?.configSchema?.toJsonSchema())
      .toMatchObject({ properties: { thinking_type: { enum: ['enabled'] }, reasoning_effort: { enum: ['low', 'high', 'max'] } } });
  });

  it('exposes the latest DeepSeek schedule and explicitly unprices unverified GLM deployment pricing', async () => {
    await expect(LLMFactory.getModelPricingInfo({ modelIdentifier: 'deepseek-v4-flash', modelProvider: LLMProvider.DEEPSEEK }))
      .resolves.toMatchObject({
        pricing_status: 'trusted',
        input_price_per_million: 0.22,
        output_price_per_million: 0.66,
        pricing_schedule_history: expect.arrayContaining([
          expect.objectContaining({ kind: 'fixed', scheduleId: 'deepseek-v4-before-2026-08-17', effectiveFrom: null }),
          expect.objectContaining({ kind: 'time_window', scheduleId: 'deepseek-v4-2026-08-17', effectiveFrom: '2026-08-16T16:00:00Z' }),
          expect.objectContaining({ kind: 'time_window', scheduleId: 'deepseek-v4-2026-08-23', effectiveFrom: '2026-08-22T16:00:00Z' }),
        ]),
      });
    await expect(LLMFactory.getModelPricingInfo({ modelIdentifier: 'glm-5.3', modelProvider: LLMProvider.GLM }))
      .resolves.toMatchObject({ pricing_status: 'missing', missing_reason: 'pricing_config_absent' });
  });

  it('exposes exact DeepSeek Pro prior flat rates in history', async () => {
    const pricing = await LLMFactory.getModelPricingInfo({ modelIdentifier: 'deepseek-v4-pro', modelProvider: LLMProvider.DEEPSEEK });
    const prior = pricing.pricing_schedule_history?.find((schedule) => schedule.kind === 'fixed');
    expect(prior?.kind === 'fixed' && [prior.period.cachedInputReadTokenPricing, prior.period.inputTokenPricing, prior.period.outputTokenPricing])
      .toEqual([0.003625, 0.435, 0.87]);
  });

  it('requires exact current AutoByteus identifiers without aliasing removed rows', async () => {
    await expect(LLMFactory.requireCurrentModelIdentifier('grok-4.6')).resolves.toBeUndefined();
    await expect(LLMFactory.requireCurrentModelIdentifier('grok-4.5'))
      .rejects.toBeInstanceOf(CurrentModelSelectionRequiredError);
    await expect(LLMFactory.requireCurrentModelIdentifier('gemini-3.8-flash')).resolves.toBeUndefined();
    await expect(LLMFactory.requireCurrentModelIdentifier('gemini-3.7-flash'))
      .rejects.toBeInstanceOf(CurrentModelSelectionRequiredError);
  });

  it('defines exact Gemini 3.8 identity, metadata, and fixed pricing history', async () => {
    const definitions = supportedModelDefinitions.filter((candidate) => candidate.name === 'gemini-3.8-flash');
    expect(definitions).toHaveLength(1);
    const [definition] = definitions;
    expect(definition).toMatchObject({
      name: 'gemini-3.8-flash',
      value: 'gemini-3.8-flash',
      canonicalName: 'gemini-3.8-flash',
      provider: LLMProvider.GEMINI,
      staticMetadata: {
        maxContextTokens: 1_048_576,
        maxInputTokens: 1_048_576,
        maxOutputTokens: 65_536,
        provenance: {
          sourceUrl: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash',
          verifiedAt: '2026-09-02',
        },
      },
    });
    expect(definition?.defaultConfig.pricingConfig).toMatchObject({
      pricingSource: 'autobyteus_model_catalog',
      pricingEffectiveDate: '2026-09-02',
    });

    await expect(LLMFactory.getModelPricingInfo({
      modelIdentifier: 'gemini-3.8-flash',
      modelProvider: LLMProvider.GEMINI,
    })).resolves.toMatchObject({
      pricing_status: 'trusted',
      input_price_per_million: 0.75,
      output_price_per_million: 3.75,
      cached_input_read_price_per_million: 0.075,
      pricing_schedule_history: [
        {
          kind: 'fixed',
          scheduleId: 'gemini-3-8-flash-introductory-2026-09-02',
          effectiveFrom: null,
          period: expect.objectContaining({
            periodId: 'introductory',
            inputTokenPricing: 0.75,
            outputTokenPricing: 3.75,
            cachedInputReadTokenPricing: 0.075,
          }),
        },
        {
          kind: 'fixed',
          scheduleId: 'gemini-3-8-flash-standard-2027-01-01',
          effectiveFrom: '2027-01-01T00:00:00Z',
          period: expect.objectContaining({
            periodId: 'standard',
            inputTokenPricing: 1.5,
            outputTokenPricing: 7.5,
            cachedInputReadTokenPricing: 0.15,
          }),
        },
      ],
    });
  });

  it('defines exact GPT-6 Astra metadata, direct schema, and complete Standard pricing tiers', async () => {
    const definitions = supportedModelDefinitions.filter((candidate) => candidate.name === 'gpt-6-astra');
    expect(definitions).toHaveLength(1);
    const [definition] = definitions;
    expect(definition).toMatchObject({
      name: 'gpt-6-astra',
      value: 'gpt-6-astra',
      canonicalName: 'gpt-6-astra',
      provider: LLMProvider.OPENAI,
      staticMetadata: {
        maxContextTokens: 1_050_000,
        maxInputTokens: null,
        maxOutputTokens: 128_000,
        provenance: {
          sourceUrl: 'https://developers.openai.com/api/docs/models/gpt-6-astra',
          verifiedAt: '2026-09-22',
        },
      },
    });
    expect(definition?.configSchema?.toJsonSchema()).toMatchObject({
      properties: {
        reasoning_effort: {
          default: 'medium',
          enum: ['low', 'medium', 'high', 'xhigh', 'max'],
        },
      },
    });
    expect(definition?.defaultConfig.pricingConfig).toMatchObject({
      pricingEffectiveDate: '2026-09-22',
      inputTokenPricing: 10,
      outputTokenPricing: 50,
      cachedInputReadTokenPricing: 1,
      cachedInputWriteTokenPricing: 12.5,
    });

    await expect(LLMFactory.getModelPricingInfo({
      modelIdentifier: 'gpt-6-astra',
      modelProvider: LLMProvider.OPENAI,
    })).resolves.toMatchObject({
      pricing_status: 'trusted',
      input_price_per_million: 10,
      output_price_per_million: 50,
      cached_input_read_price_per_million: 1,
      cached_input_write_price_per_million: 12.5,
      input_price_tiers: [
        {
          tier_id: 'standard_le_272k',
          max_input_tokens: 272_000,
          input_price_per_million: 10,
          output_price_per_million: 50,
          cached_input_read_price_per_million: 1,
          cached_input_write_price_per_million: 12.5,
        },
        {
          tier_id: 'long_context_gt_272k',
          max_input_tokens: null,
          input_price_per_million: 20,
          output_price_per_million: 75,
          cached_input_read_price_per_million: 2,
          cached_input_write_price_per_million: 25,
        },
      ],
    });
  });

  it.each([
    ['gpt-5.6-sol', 5, 30, 0.5, 6.25, 10, 45, 1, 12.5],
    ['gpt-5.6-terra', 2, 12, 0.2, 2.5, 4, 18, 0.4, 5],
    ['gpt-5.6-luna', 0.2, 1.2, 0.02, 0.25, 0.4, 1.8, 0.04, 0.5],
  ] as const)(
    'preserves %s pricing while reusing the generalized long-context constructor',
    async (modelIdentifier, input, output, cacheRead, cacheWrite, longInput, longOutput, longCacheRead, longCacheWrite) => {
      const definition = supportedModelDefinitions.find((candidate) => candidate.name === modelIdentifier);
      expect(definition?.defaultConfig.pricingConfig).toMatchObject({
        pricingEffectiveDate: '2026-07-30',
        inputTokenPricing: input,
        outputTokenPricing: output,
        cachedInputReadTokenPricing: cacheRead,
        cachedInputWriteTokenPricing: cacheWrite,
      });
      await expect(LLMFactory.getModelPricingInfo({
        modelIdentifier,
        modelProvider: LLMProvider.OPENAI,
      })).resolves.toMatchObject({
        input_price_per_million: input,
        output_price_per_million: output,
        cached_input_read_price_per_million: cacheRead,
        cached_input_write_price_per_million: cacheWrite,
        input_price_tiers: [
          expect.objectContaining({ tier_id: 'standard_le_272k', max_input_tokens: 272_000 }),
          expect.objectContaining({
            tier_id: 'long_context_gt_272k',
            max_input_tokens: null,
            input_price_per_million: longInput,
            output_price_per_million: longOutput,
            cached_input_read_price_per_million: longCacheRead,
            cached_input_write_price_per_million: longCacheWrite,
          }),
        ],
      });
    },
  );

  it('defines exact Claude Fable 5.1 metadata and cache-aware Standard pricing without a manual thinking schema', async () => {
    const definitions = supportedModelDefinitions.filter((candidate) => candidate.name === 'claude-fable-5-1');
    expect(definitions).toHaveLength(1);
    const [definition] = definitions;
    expect(definition).toMatchObject({
      name: 'claude-fable-5-1',
      value: 'claude-fable-5-1',
      canonicalName: 'claude-fable-5-1',
      provider: LLMProvider.ANTHROPIC,
      staticMetadata: {
        maxContextTokens: 1_000_000,
        maxInputTokens: 1_000_000,
        maxOutputTokens: 128_000,
        provenance: {
          sourceUrl: 'https://platform.claude.com/docs/en/models/fable-5-1/overview',
          verifiedAt: '2026-09-22',
        },
      },
    });
    expect(definition?.configSchema).toBeUndefined();
    expect(definition?.defaultConfig.pricingConfig).toMatchObject({
      pricingEffectiveDate: '2026-09-01',
      inputTokenPricing: 10,
      outputTokenPricing: 50,
      cachedInputReadTokenPricing: 0.25,
      cachedInputWrite5mTokenPricing: 12.5,
      cachedInputWrite1hTokenPricing: 20,
    });

    await expect(LLMFactory.getModelPricingInfo({
      modelIdentifier: 'claude-fable-5-1',
      modelProvider: LLMProvider.ANTHROPIC,
    })).resolves.toMatchObject({
      pricing_status: 'trusted',
      input_price_per_million: 10,
      output_price_per_million: 50,
      cached_input_read_price_per_million: 0.25,
      cached_input_write_5m_price_per_million: 12.5,
      cached_input_write_1h_price_per_million: 20,
    });

    await expect(LLMFactory.getModelPricingInfo({
      modelIdentifier: 'claude-fable-5',
      modelProvider: LLMProvider.ANTHROPIC,
    })).resolves.toMatchObject({ cached_input_read_price_per_million: 1 });
  });

  it.each([
    [LLMProvider.OPENAI, 'gpt-6'],
    [LLMProvider.OPENAI, 'astra'],
    [LLMProvider.ANTHROPIC, 'claude-fable-5.1'],
  ])('does not alias %s model identifier %s', async (provider, modelIdentifier) => {
    await expect(LLMFactory.getModelPricingInfo({ modelIdentifier, modelProvider: provider }))
      .resolves.toMatchObject({ pricing_status: 'missing', missing_reason: 'model_not_found' });
  });
});

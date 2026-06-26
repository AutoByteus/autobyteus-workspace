import { describe, expect, it } from 'vitest';
import { LLMConfig, TokenPricingConfig } from '../../../../src/llm/utils/llm-config.js';
import { applyRawLlmConfigOverrides } from '../../../../src/llm/utils/llm-config-overrides.js';

describe('applyRawLlmConfigOverrides', () => {
  it('preserves absent model defaults while applying explicit standard fields as first-class config', () => {
    const config = new LLMConfig({
      temperature: 1,
      topP: 0.95,
      maxTokens: 4096,
      extraParams: {
        model_only: true,
      },
      pricingConfig: new TokenPricingConfig({ inputTokenPricing: 1, outputTokenPricing: 2 }),
    });

    applyRawLlmConfigOverrides(config, {
      max_tokens: 1024,
      custom_provider_flag: 'kept',
    });

    expect(config.temperature).toBe(1);
    expect(config.topP).toBe(0.95);
    expect(config.maxTokens).toBe(1024);
    expect(config.pricingConfig.inputTokenPricing).toBe(1);
    expect(config.extraParams).toEqual({
      model_only: true,
      custom_provider_flag: 'kept',
    });
  });

  it('does not pass standard raw keys through extraParams', () => {
    const config = new LLMConfig({ temperature: 0.8 });

    applyRawLlmConfigOverrides(config, {
      temperature: 0.2,
      top_p: 0.4,
      maxTokens: 512,
      stop: ['END'],
      extra_params: {
        temperature: 0.1,
        top_p: 0.3,
        nested_unknown: true,
      },
      extraParams: {
        max_tokens: 256,
        camel_unknown: 'kept',
      },
      unknown_top_level: 'kept',
    });

    expect(config.temperature).toBe(0.2);
    expect(config.topP).toBe(0.4);
    expect(config.maxTokens).toBe(512);
    expect(config.stopSequences).toEqual(['END']);
    expect(config.extraParams).toEqual({
      nested_unknown: true,
      camel_unknown: 'kept',
      unknown_top_level: 'kept',
    });
  });

  it('treats missing and explicit null distinctly for nullable fields', () => {
    const config = new LLMConfig({
      temperature: 0.6,
      topP: 0.9,
      maxTokens: 1000,
      stopSequences: ['STOP'],
    });

    applyRawLlmConfigOverrides(config, {
      temperature: null,
      top_p: null,
      max_tokens: null,
      stop_sequences: null,
      provider_null: null,
    });

    expect(config.temperature).toBe(0.6);
    expect(config.topP).toBeNull();
    expect(config.maxTokens).toBeNull();
    expect(config.stopSequences).toBeNull();
    expect(config.extraParams).toEqual({ provider_null: null });
  });

  it('supports camelCase aliases for existing LLMConfigInput field names', () => {
    const config = new LLMConfig();

    applyRawLlmConfigOverrides(config, {
      rateLimit: 10,
      tokenLimit: 2000,
      systemMessage: 'Be direct.',
      compactionRatio: 0.5,
      safetyMarginTokens: 128,
      frequencyPenalty: 0.1,
      presencePenalty: 0.2,
      stopSequences: ['DONE'],
    });

    expect(config.rateLimit).toBe(10);
    expect(config.tokenLimit).toBe(2000);
    expect(config.systemMessage).toBe('Be direct.');
    expect(config.compactionRatio).toBe(0.5);
    expect(config.safetyMarginTokens).toBe(128);
    expect(config.frequencyPenalty).toBe(0.1);
    expect(config.presencePenalty).toBe(0.2);
    expect(config.stopSequences).toEqual(['DONE']);
  });
});

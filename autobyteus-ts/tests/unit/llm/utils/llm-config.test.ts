import { describe, it, expect } from 'vitest';
import { LLMConfig, TokenPricingConfig } from '../../../../src/llm/utils/llm-config.js';

describe('TokenPricingConfig', () => {
  it('initializes with defaults', () => {
    const config = new TokenPricingConfig();
    expect(config.inputTokenPricing).toBe(0.0);
    expect(config.outputTokenPricing).toBe(0.0);
  });

  it('initializes with custom values', () => {
    const config = new TokenPricingConfig({ inputTokenPricing: 0.001, outputTokenPricing: 0.002 });
    expect(config.inputTokenPricing).toBe(0.001);
    expect(config.outputTokenPricing).toBe(0.002);
  });

  it('toDict', () => {
    const config = new TokenPricingConfig({ inputTokenPricing: 0.0015, outputTokenPricing: 0.0025 });
    expect(config.toDict()).toEqual({
      input_token_pricing: 0.0015,
      output_token_pricing: 0.0025
    });
  });

  it('fromDict full', () => {
    const config = TokenPricingConfig.fromDict({ input_token_pricing: 0.003, output_token_pricing: 0.004 });
    expect(config.inputTokenPricing).toBe(0.003);
    expect(config.outputTokenPricing).toBe(0.004);
  });

  it('fromDict partial', () => {
    const inputOnly = TokenPricingConfig.fromDict({ input_token_pricing: 0.005 });
    expect(inputOnly.inputTokenPricing).toBe(0.005);
    expect(inputOnly.outputTokenPricing).toBe(0.0);

    const outputOnly = TokenPricingConfig.fromDict({ output_token_pricing: 0.006 });
    expect(outputOnly.inputTokenPricing).toBe(0.0);
    expect(outputOnly.outputTokenPricing).toBe(0.006);
  });

  it('mergeWith none does not change', () => {
    const config = new TokenPricingConfig({ inputTokenPricing: 0.1, outputTokenPricing: 0.2 });
    const before = config.toDict();
    config.mergeWith(null);
    expect(config.toDict()).toEqual(before);
  });

  it('mergeWith another config overrides with defaults', () => {
    const base = new TokenPricingConfig({ inputTokenPricing: 0.1, outputTokenPricing: 0.2 });
    const override = new TokenPricingConfig({ inputTokenPricing: 0.15 });
    base.mergeWith(override);
    expect(base.inputTokenPricing).toBe(0.15);
    expect(base.outputTokenPricing).toBe(0.0);

    const base2 = new TokenPricingConfig({ inputTokenPricing: 0.3, outputTokenPricing: 0.4 });
    const override2 = new TokenPricingConfig({ outputTokenPricing: 0.45 });
    base2.mergeWith(override2);
    expect(base2.inputTokenPricing).toBe(0.0);
    expect(base2.outputTokenPricing).toBe(0.45);
  });
});

describe('LLMConfig', () => {
  it('initializes with defaults', () => {
    const config = new LLMConfig();
    expect(config.rateLimit).toBeNull();
    expect(config.tokenLimit).toBeNull();
    expect(config.systemMessage).toBe('You are a helpful assistant.');
    expect(config.temperature).toBe(0.7);
    expect(config.maxTokens).toBeNull();
    expect(config.topP).toBeNull();
    expect(config.frequencyPenalty).toBeNull();
    expect(config.presencePenalty).toBeNull();
    expect(config.stopSequences).toBeNull();
    expect(config.extraParams).toEqual({});
    expect(config.compactionRatio).toBeNull();
    expect(config.safetyMarginTokens).toBeNull();
    expect(config.pricingConfig.inputTokenPricing).toBe(0.0);
    expect(config.pricingConfig.outputTokenPricing).toBe(0.0);
  });

  it('initializes with custom values', () => {
    const pricing = new TokenPricingConfig({ inputTokenPricing: 0.01, outputTokenPricing: 0.02 });
    const config = new LLMConfig({
      rateLimit: 100,
      systemMessage: 'Be concise.',
      temperature: 0.5,
      maxTokens: 1024,
      compactionRatio: 0.5,
      safetyMarginTokens: 128,
      stopSequences: ['\nUser:'],
      extraParams: { custom_key: 'custom_value' },
      pricingConfig: pricing
    });
    expect(config.rateLimit).toBe(100);
    expect(config.systemMessage).toBe('Be concise.');
    expect(config.temperature).toBe(0.5);
    expect(config.maxTokens).toBe(1024);
    expect(config.compactionRatio).toBe(0.5);
    expect(config.safetyMarginTokens).toBe(128);
    expect(config.stopSequences).toEqual(['\nUser:']);
    expect(config.extraParams).toEqual({ custom_key: 'custom_value' });
    expect(config.pricingConfig).toBe(pricing);
  });

  it('initializes pricing_config from dict', () => {
    const config = new LLMConfig({ pricingConfig: { inputTokenPricing: 0.03, outputTokenPricing: 0.04 } });
    expect(config.pricingConfig.inputTokenPricing).toBe(0.03);
    expect(config.pricingConfig.outputTokenPricing).toBe(0.04);
  });

  it('initializes pricing_config with invalid type', () => {
    const config = new LLMConfig({ pricingConfig: 'invalid_type' as any });
    expect(config.pricingConfig.inputTokenPricing).toBe(0.0);
    expect(config.pricingConfig.outputTokenPricing).toBe(0.0);
  });

  it('defaultConfig returns defaults', () => {
    expect(LLMConfig.defaultConfig()).toEqual(new LLMConfig());
  });

  it('toDict excludes nulls', () => {
    const config = new LLMConfig({
      systemMessage: 'Test prompt',
      temperature: 0.9,
      maxTokens: 500,
      compactionRatio: 0.6,
      safetyMarginTokens: 256,
      extraParams: { test: 1 },
      pricingConfig: TokenPricingConfig.fromDict({ input_token_pricing: 0.01, output_token_pricing: 0.02 })
    });
    const dict = config.toDict();
    expect(dict).toEqual({
      system_message: 'Test prompt',
      temperature: 0.9,
      max_tokens: 500,
      compaction_ratio: 0.6,
      safety_margin_tokens: 256,
      extra_params: { test: 1 },
      pricing_config: { input_token_pricing: 0.01, output_token_pricing: 0.02 }
    });
    expect(dict).not.toHaveProperty('rate_limit');
  });

  it('toJson', () => {
    const config = new LLMConfig({ systemMessage: 'JSON Test', temperature: 0.6 });
    const jsonStr = config.toJson();
    expect(JSON.parse(jsonStr)).toEqual(config.toDict());
  });

  it('fromDict full', () => {
    const data = {
      rate_limit: 50,
      token_limit: 4000,
      system_message: 'Full dict test',
      temperature: 0.2,
      max_tokens: 200,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.2,
      stop_sequences: ['stop'],
      compaction_ratio: 0.55,
      safety_margin_tokens: 192,
      extra_params: { extra: 'param' },
      pricing_config: { input_token_pricing: 0.07, output_token_pricing: 0.08 }
    };
    const config = LLMConfig.fromDict(data);
    expect(config.rateLimit).toBe(50);
    expect(config.systemMessage).toBe('Full dict test');
    expect(config.temperature).toBe(0.2);
    expect(config.maxTokens).toBe(200);
    expect(config.extraParams).toEqual({ extra: 'param' });
    expect(config.compactionRatio).toBe(0.55);
    expect(config.safetyMarginTokens).toBe(192);
    expect(config.pricingConfig.inputTokenPricing).toBe(0.07);
  });

  it('fromDict partial', () => {
    const config = LLMConfig.fromDict({ system_message: 'Partial dict test', max_tokens: 150 });
    expect(config.systemMessage).toBe('Partial dict test');
    expect(config.maxTokens).toBe(150);
    expect(config.temperature).toBe(0.7);
    expect(config.compactionRatio).toBeNull();
    expect(config.safetyMarginTokens).toBeNull();
    expect(config.pricingConfig).toBeInstanceOf(TokenPricingConfig);
  });

  it('fromJson', () => {
    const jsonStr = JSON.stringify({
      system_message: 'From JSON',
      temperature: 0.3,
      pricing_config: { input_token_pricing: 0.0001, output_token_pricing: 0.0002 }
    });
    const config = LLMConfig.fromJson(jsonStr);
    expect(config.systemMessage).toBe('From JSON');
    expect(config.temperature).toBe(0.3);
    expect(config.pricingConfig.inputTokenPricing).toBe(0.0001);
  });

  it('update existing attributes', () => {
    const config = new LLMConfig();
    config.update({ temperature: 0.3, systemMessage: 'Updated prompt' });
    expect(config.temperature).toBe(0.3);
    expect(config.systemMessage).toBe('Updated prompt');
  });

  it('update extra_params', () => {
    const config = new LLMConfig({ extraParams: { initial: 'value' } });
    config.update({ new_extra: 'new_value', another_extra: 123 });
    expect(config.extraParams).toEqual({ initial: 'value', new_extra: 'new_value', another_extra: 123 });
  });

  it('update pricing_config with dict', () => {
    const config = new LLMConfig();
    config.update({ pricingConfig: { inputTokenPricing: 0.11, outputTokenPricing: 0.22 } });
    expect(config.pricingConfig.inputTokenPricing).toBe(0.11);
    expect(config.pricingConfig.outputTokenPricing).toBe(0.22);
  });

  it('mergeWith none does not change', () => {
    const original = new LLMConfig({ temperature: 0.8 });
    const copy = LLMConfig.fromDict(original.toDict());
    copy.mergeWith(null);
    expect(copy.toDict()).toEqual(original.toDict());
  });

  it('mergeWith another config partial', () => {
    const base = new LLMConfig({ systemMessage: 'Base prompt', temperature: 0.7, maxTokens: 100 });
    const override = new LLMConfig({ temperature: 0.5, stopSequences: ['\n'] });
    base.mergeWith(override);
    expect(base.systemMessage).toBe('You are a helpful assistant.');
    expect(base.temperature).toBe(0.5);
    expect(base.maxTokens).toBe(100);
    expect(base.stopSequences).toEqual(['\n']);
  });

  it('mergeWith extra_params merging', () => {
    const base = new LLMConfig({ extraParams: { base_param: 1, common_param: 'base_val' } });
    const override = new LLMConfig({ extraParams: { override_param: 2, common_param: 'override_val' } });
    base.mergeWith(override);
    expect(base.extraParams).toEqual({
      base_param: 1,
      common_param: 'override_val',
      override_param: 2
    });
  });

  it('mergeWith pricing_config merging', () => {
    const base = new LLMConfig({ pricingConfig: { inputTokenPricing: 0.1, outputTokenPricing: 0.2 } });
    const override = new LLMConfig({ pricingConfig: { outputTokenPricing: 0.25 } });
    base.mergeWith(override);
    expect(base.pricingConfig.inputTokenPricing).toBe(0.0);
    expect(base.pricingConfig.outputTokenPricing).toBe(0.25);
  });

  it('mergeWith does not clear base when override fields are null', () => {
    const base = new LLMConfig({ maxTokens: 1024, temperature: 0.7, systemMessage: 'Explicit Base System Message' });
    const override = new LLMConfig({ temperature: 0.5 });
    base.mergeWith(override);
    expect(base.maxTokens).toBe(1024);
    expect(base.temperature).toBe(0.5);
    expect(base.systemMessage).toBe('You are a helpful assistant.');
  });
});

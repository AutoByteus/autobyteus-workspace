import { TokenPricingConfig, type TokenPricingConfigInput } from './utils/llm-config.js';

export const pricing = (input: number, output: number, options: Omit<TokenPricingConfigInput, 'inputTokenPricing' | 'outputTokenPricing'> = {}) =>
  new TokenPricingConfig({
    currency: 'USD',
    pricingSource: 'autobyteus_model_catalog',
    pricingEffectiveDate: '2026-06-25',
    ...options,
    inputTokenPricing: input,
    outputTokenPricing: output,
  });

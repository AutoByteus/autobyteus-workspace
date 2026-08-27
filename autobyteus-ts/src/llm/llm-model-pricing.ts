import { TokenPricingConfig } from './utils/llm-config.js';
import type { LLMModel } from './models.js';
import type { LLMProvider } from './providers.js';
import type {
  ModelPricingInfo,
  ModelPricingTierInfo,
  PricingStatus,
} from './model-pricing-types.js';

export type {
  ModelPricingInfo,
  ModelPricingTierInfo,
  PricingStatus,
} from './model-pricing-types.js';

type PricingTrustDimensions = {
  input: boolean;
  output: boolean;
  cached_input_read: boolean;
  cached_input_write: boolean;
  cached_input_write_5m: boolean;
  cached_input_write_1h: boolean;
};
export type ModelPricingLookupInput = {
  modelIdentifier?: string | null;
  modelValue?: string | null;
  canonicalName?: string | null;
  modelProvider?: LLMProvider | string | null;
};

const untrustedDimensions = (): PricingTrustDimensions => ({
  input: false,
  output: false,
  cached_input_read: false,
  cached_input_write: false,
  cached_input_write_5m: false,
  cached_input_write_1h: false,
});

const missingInfo = (
  input: ModelPricingLookupInput,
  model: LLMModel | null,
  reason: NonNullable<ModelPricingInfo['missing_reason']>,
): ModelPricingInfo => ({
  model_identifier: model?.modelIdentifier ?? input.modelIdentifier ?? null,
  model_value: model?.value ?? input.modelValue ?? null,
  canonical_name: model?.canonicalName ?? input.canonicalName ?? null,
  model_provider: model?.provider ?? (input.modelProvider ? String(input.modelProvider) : null),
  pricing_status: 'missing',
  pricing_source: null,
  price_config_id: null,
  currency: null,
  input_price_per_million: null,
  output_price_per_million: null,
  cached_input_read_price_per_million: null,
  cached_input_write_price_per_million: null,
  cached_input_write_5m_price_per_million: null,
  cached_input_write_1h_price_per_million: null,
  input_price_tiers: [],
  pricing_schedule_history: null,
  trusted_dimensions: untrustedDimensions(),
  missing_reason: reason,
});

const findModel = (models: readonly LLMModel[], input: ModelPricingLookupInput): LLMModel | null => {
  const provider = input.modelProvider ? String(input.modelProvider) : null;
  const keys = [input.modelIdentifier, input.modelValue, input.canonicalName]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return models.find((model) => (!provider || model.provider === provider) && keys.some((key) =>
    model.modelIdentifier === key || model.value === key || model.name === key || model.canonicalName === key
  )) ?? null;
};

export const buildModelPricingInfo = (
  models: readonly LLMModel[],
  input: ModelPricingLookupInput,
): ModelPricingInfo => {
  const model = findModel(models, input);
  if (!model) return missingInfo(input, null, 'model_not_found');
  const pricing = model.defaultConfig?.pricingConfig;
  if (!(pricing instanceof TokenPricingConfig)) return missingInfo(input, model, 'pricing_config_absent');
  const inputTrusted = pricing.inputTokenPricingTrusted;
  const outputTrusted = pricing.outputTokenPricingTrusted;
  if (!inputTrusted && !outputTrusted) return missingInfo(input, model, 'pricing_config_absent');
  const status: PricingStatus = inputTrusted && outputTrusted ? 'trusted' : 'missing';
  const tiers = pricing.inputTokenPricingTiers.map((tier): ModelPricingTierInfo => ({
    tier_id: tier.tierId ?? null,
    max_input_tokens: tier.maxInputTokens ?? null,
    input_price_per_million: tier.inputTokenPricing ?? null,
    output_price_per_million: tier.outputTokenPricing ?? null,
    cached_input_read_price_per_million: tier.cachedInputReadTokenPricing ?? null,
    cached_input_write_price_per_million: tier.cachedInputWriteTokenPricing ?? null,
    cached_input_write_5m_price_per_million: tier.cachedInputWrite5mTokenPricing ?? null,
    cached_input_write_1h_price_per_million: tier.cachedInputWrite1hTokenPricing ?? null,
    trusted_dimensions: {
      input: tier.inputTokenPricing !== undefined,
      output: tier.outputTokenPricing !== undefined,
      cached_input_read: tier.cachedInputReadTokenPricing !== undefined,
      cached_input_write: tier.cachedInputWriteTokenPricing !== undefined,
      cached_input_write_5m: tier.cachedInputWrite5mTokenPricing !== undefined,
      cached_input_write_1h: tier.cachedInputWrite1hTokenPricing !== undefined,
    },
  }));
  return {
    model_identifier: model.modelIdentifier,
    model_value: model.value,
    canonical_name: model.canonicalName,
    model_provider: model.provider,
    pricing_status: status,
    pricing_source: status === 'trusted' ? pricing.pricingSource ?? 'autobyteus_model_catalog' : null,
    price_config_id: status === 'trusted' ? `autobyteus_model_catalog:${model.provider}:${model.canonicalName}` : null,
    currency: status === 'trusted' ? pricing.currency : null,
    input_price_per_million: inputTrusted ? pricing.inputTokenPricing : null,
    output_price_per_million: outputTrusted ? pricing.outputTokenPricing : null,
    cached_input_read_price_per_million: pricing.cachedInputReadTokenPricingTrusted ? pricing.cachedInputReadTokenPricing : null,
    cached_input_write_price_per_million: pricing.cachedInputWriteTokenPricingTrusted ? pricing.cachedInputWriteTokenPricing : null,
    cached_input_write_5m_price_per_million: pricing.cachedInputWrite5mTokenPricingTrusted ? pricing.cachedInputWrite5mTokenPricing : null,
    cached_input_write_1h_price_per_million: pricing.cachedInputWrite1hTokenPricingTrusted ? pricing.cachedInputWrite1hTokenPricing : null,
    input_price_tiers: status === 'trusted' ? tiers : [],
    pricing_schedule_history: pricing.pricingScheduleHistory,
    trusted_dimensions: {
      input: inputTrusted,
      output: outputTrusted,
      cached_input_read: pricing.cachedInputReadTokenPricingTrusted,
      cached_input_write: pricing.cachedInputWriteTokenPricingTrusted,
      cached_input_write_5m: pricing.cachedInputWrite5mTokenPricingTrusted,
      cached_input_write_1h: pricing.cachedInputWrite1hTokenPricingTrusted,
    },
    ...(status === 'missing' ? { missing_reason: 'dimension_missing' as const } : {}),
  };
};

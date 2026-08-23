import type { TokenPricingSchedule } from './utils/token-pricing-schedule.js';

export type PricingStatus = 'trusted' | 'missing' | 'placeholder';

export type ModelPricingTierInfo = {
  tier_id: string | null;
  max_input_tokens: number | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  cached_input_read_price_per_million: number | null;
  cached_input_write_price_per_million: number | null;
  cached_input_write_5m_price_per_million: number | null;
  cached_input_write_1h_price_per_million: number | null;
  trusted_dimensions: {
    input: boolean;
    output: boolean;
    cached_input_read: boolean;
    cached_input_write: boolean;
    cached_input_write_5m: boolean;
    cached_input_write_1h: boolean;
  };
};

export type ModelPricingInfo = {
  model_identifier: string | null;
  model_value: string | null;
  canonical_name: string | null;
  model_provider: string | null;
  pricing_status: PricingStatus;
  pricing_source: 'autobyteus_model_catalog' | string | null;
  price_config_id: string | null;
  currency: string | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  cached_input_read_price_per_million: number | null;
  cached_input_write_price_per_million: number | null;
  cached_input_write_5m_price_per_million: number | null;
  cached_input_write_1h_price_per_million: number | null;
  input_price_tiers: ModelPricingTierInfo[];
  pricing_schedule: TokenPricingSchedule | null;
  trusted_dimensions: {
    input: boolean;
    output: boolean;
    cached_input_read: boolean;
    cached_input_write: boolean;
    cached_input_write_5m: boolean;
    cached_input_write_1h: boolean;
  };
  missing_reason?:
    | 'model_not_found'
    | 'pricing_config_absent'
    | 'constructor_default_zero'
    | 'placeholder_price'
    | 'dimension_missing';
};

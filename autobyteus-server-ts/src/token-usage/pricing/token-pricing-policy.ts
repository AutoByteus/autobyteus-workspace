import type { TokenUsagePricingStatus } from "../../agent-execution/domain/agent-run-token-usage.js";

export type TokenPriceTrustedDimensions = {
  input: boolean;
  output: boolean;
  cached_input_read: boolean;
  cached_input_write: boolean;
  cached_input_write_5m: boolean;
  cached_input_write_1h: boolean;
};

export type TokenPriceTierPolicy = {
  tier_id: string | null;
  max_input_tokens: number | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  cached_input_read_price_per_million: number | null;
  cached_input_write_price_per_million: number | null;
  cached_input_write_5m_price_per_million: number | null;
  cached_input_write_1h_price_per_million: number | null;
  trusted_dimensions: TokenPriceTrustedDimensions;
};

export type ResolvedTokenPricingPolicy = {
  pricing_policy_key: string | null;
  price_config_id: string | null;
  model_provider: string | null;
  model_identifier: string | null;
  model_value: string | null;
  canonical_name: string | null;
  currency: string | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  cached_input_read_price_per_million: number | null;
  cached_input_write_price_per_million: number | null;
  cached_input_write_5m_price_per_million: number | null;
  cached_input_write_1h_price_per_million: number | null;
  input_price_tiers: TokenPriceTierPolicy[];
  pricing_status: TokenUsagePricingStatus;
  trusted_dimensions: TokenPriceTrustedDimensions;
  missing_reason: string | null;
  source: string | null;
  effective_from: string | null;
  effective_to: string | null;
  version: string | null;
};

export type SelectedTokenPricingPolicy = ResolvedTokenPricingPolicy & {
  selected_tier_id?: string | null;
};

export const emptyTrustedDimensions = (): TokenPriceTrustedDimensions => ({
  input: false,
  output: false,
  cached_input_read: false,
  cached_input_write: false,
  cached_input_write_5m: false,
  cached_input_write_1h: false,
});

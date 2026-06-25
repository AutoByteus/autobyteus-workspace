import { LLMFactory, type ModelPricingInfo } from "autobyteus-ts";
import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";

export type TokenPriceTierConfig = {
  tier_id: string | null;
  max_input_tokens: number | null;
  input_price_per_million: number | null;
  output_price_per_million: number | null;
  cached_input_read_price_per_million: number | null;
  cached_input_write_price_per_million: number | null;
  trusted_dimensions: {
    input: boolean;
    output: boolean;
    cached_input_read: boolean;
    cached_input_write: boolean;
  };
};

export type TokenPriceConfig = {
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
  input_price_tiers: TokenPriceTierConfig[];
  pricing_status: "trusted" | "missing" | "placeholder";
  trusted_dimensions: {
    input: boolean;
    output: boolean;
    cached_input_read: boolean;
    cached_input_write: boolean;
  };
  missing_reason: string | null;
  source: string | null;
  effective_from: string | null;
  effective_to: string | null;
  version: string | null;
};

const toPriceConfig = (info: ModelPricingInfo | null): TokenPriceConfig => ({
  price_config_id: info?.price_config_id ?? null,
  model_provider: info?.model_provider ?? null,
  model_identifier: info?.model_identifier ?? null,
  model_value: info?.model_value ?? null,
  canonical_name: info?.canonical_name ?? null,
  currency: info?.currency ?? null,
  input_price_per_million: info?.input_price_per_million ?? null,
  output_price_per_million: info?.output_price_per_million ?? null,
  cached_input_read_price_per_million: info?.cached_input_read_price_per_million ?? null,
  cached_input_write_price_per_million: info?.cached_input_write_price_per_million ?? null,
  input_price_tiers: info?.input_price_tiers ?? [],
  pricing_status: info?.pricing_status ?? "missing",
  trusted_dimensions: info?.trusted_dimensions ?? {
    input: false,
    output: false,
    cached_input_read: false,
    cached_input_write: false,
  },
  missing_reason: info?.missing_reason ?? (info ? null : "model_not_found"),
  source: info?.pricing_source ?? null,
  effective_from: null,
  effective_to: null,
  version: null,
});

export class TokenPriceConfigProvider {
  async resolvePrice(payload: Pick<TokenUsageUpdatedPayload, "model_provider" | "model_identifier" | "model_value" | "observed_at">): Promise<TokenPriceConfig> {
    const info = await LLMFactory.getModelPricingInfo({
      modelProvider: payload.model_provider,
      modelIdentifier: payload.model_identifier,
      modelValue: payload.model_value,
    });
    return toPriceConfig(info);
  }
}

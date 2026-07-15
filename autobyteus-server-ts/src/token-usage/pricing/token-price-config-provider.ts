import { LLMFactory, type ModelPricingInfo } from "autobyteus-ts";
import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import {
  emptyTrustedDimensions,
  type ResolvedTokenPricingPolicy,
} from "./token-pricing-policy.js";

const localRuntimeKinds = new Set(["ollama", "lmstudio"]);
const localProviders = new Set(["OLLAMA", "LMSTUDIO"]);

const policyKey = (info: Pick<ResolvedTokenPricingPolicy, "price_config_id" | "model_provider" | "canonical_name" | "model_identifier">): string | null =>
  info.price_config_id ?? (
    info.model_provider && (info.canonical_name ?? info.model_identifier)
      ? `autobyteus_model_catalog:${info.model_provider}:${info.canonical_name ?? info.model_identifier}`
      : null
  );

const toPolicy = (info: ModelPricingInfo | null): ResolvedTokenPricingPolicy => {
  const trustedDimensions = info?.trusted_dimensions
    ? {
        input: info.trusted_dimensions.input,
        output: info.trusted_dimensions.output,
        cached_input_read: info.trusted_dimensions.cached_input_read,
        cached_input_write: info.trusted_dimensions.cached_input_write,
        cached_input_write_5m: info.trusted_dimensions.cached_input_write_5m,
        cached_input_write_1h: info.trusted_dimensions.cached_input_write_1h,
      }
    : emptyTrustedDimensions();
  const base: ResolvedTokenPricingPolicy = {
    pricing_policy_key: null,
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
    cached_input_write_5m_price_per_million: info?.cached_input_write_5m_price_per_million ?? null,
    cached_input_write_1h_price_per_million: info?.cached_input_write_1h_price_per_million ?? null,
    input_price_tiers: (info?.input_price_tiers ?? []).map((tier) => ({
      tier_id: tier.tier_id,
      max_input_tokens: tier.max_input_tokens,
      input_price_per_million: tier.input_price_per_million,
      output_price_per_million: tier.output_price_per_million,
      cached_input_read_price_per_million: tier.cached_input_read_price_per_million,
      cached_input_write_price_per_million: tier.cached_input_write_price_per_million,
      cached_input_write_5m_price_per_million: tier.cached_input_write_5m_price_per_million,
      cached_input_write_1h_price_per_million: tier.cached_input_write_1h_price_per_million,
      trusted_dimensions: {
        input: tier.trusted_dimensions.input,
        output: tier.trusted_dimensions.output,
        cached_input_read: tier.trusted_dimensions.cached_input_read,
        cached_input_write: tier.trusted_dimensions.cached_input_write,
        cached_input_write_5m: tier.trusted_dimensions.cached_input_write_5m,
        cached_input_write_1h: tier.trusted_dimensions.cached_input_write_1h,
      },
    })),
    pricing_status: info?.pricing_status ?? "missing",
    trusted_dimensions: trustedDimensions,
    missing_reason: info?.missing_reason ?? (info ? null : "model_not_found"),
    source: info?.pricing_source ?? null,
    effective_from: null,
    effective_to: null,
    version: null,
  };
  return {
    ...base,
    pricing_policy_key: policyKey(base),
  };
};

const localPolicy = (payload: Pick<TokenUsageUpdatedPayload, "model_provider" | "model_identifier" | "model_value" | "runtime_kind">): ResolvedTokenPricingPolicy => ({
  pricing_policy_key: `local_no_api_bill:${payload.runtime_kind}`,
  price_config_id: null,
  model_provider: payload.model_provider,
  model_identifier: payload.model_identifier,
  model_value: payload.model_value,
  canonical_name: payload.model_identifier ?? payload.model_value,
  currency: null,
  input_price_per_million: 0,
  output_price_per_million: 0,
  cached_input_read_price_per_million: null,
  cached_input_write_price_per_million: null,
  cached_input_write_5m_price_per_million: null,
  cached_input_write_1h_price_per_million: null,
  input_price_tiers: [],
  pricing_status: "local_no_api_bill",
  trusted_dimensions: {
    input: true,
    output: true,
    cached_input_read: false,
    cached_input_write: false,
    cached_input_write_5m: false,
    cached_input_write_1h: false,
  },
  missing_reason: null,
  source: "local_runtime_no_provider_api_bill",
  effective_from: null,
  effective_to: null,
  version: null,
});

export class TokenPriceConfigProvider {
  async resolvePolicy(payload: Pick<TokenUsageUpdatedPayload, "model_provider" | "model_identifier" | "model_value" | "runtime_kind" | "observed_at">): Promise<ResolvedTokenPricingPolicy> {
    if (localRuntimeKinds.has(payload.runtime_kind.toLowerCase()) || (payload.model_provider && localProviders.has(payload.model_provider))) {
      return localPolicy(payload);
    }
    const info = await LLMFactory.getModelPricingInfo({
      modelProvider: payload.model_provider,
      modelIdentifier: payload.model_identifier,
      modelValue: payload.model_value,
    });
    return toPolicy(info);
  }
}

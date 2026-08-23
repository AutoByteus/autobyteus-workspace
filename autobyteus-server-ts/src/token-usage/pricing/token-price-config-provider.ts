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

const scheduleSelection = (schedule: NonNullable<ModelPricingInfo["pricing_schedule"]>, observedAt: string) => {
  const instant = new Date(observedAt);
  if (Number.isNaN(instant.getTime())) return null;
  const minuteUtc = instant.getUTCHours() * 60 + instant.getUTCMinutes();
  const periodId = schedule.peakWindows.some((window) =>
    minuteUtc >= window.startMinuteUtc && minuteUtc < window.endMinuteUtc)
    ? "peak"
    : schedule.defaultPeriodId;
  return schedule.periods.find((period) => period.periodId === periodId) ?? null;
};

const toPolicy = (info: ModelPricingInfo | null, observedAt: string): ResolvedTokenPricingPolicy => {
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
  const schedule = info?.pricing_schedule ?? null;
  const selectedPeriod = schedule ? scheduleSelection(schedule, observedAt) : null;
  const selectedDimensions = selectedPeriod
    ? {
        input: selectedPeriod.trustedDimensions.input,
        output: selectedPeriod.trustedDimensions.output,
        cached_input_read: selectedPeriod.trustedDimensions.cachedInputRead,
        cached_input_write: selectedPeriod.trustedDimensions.cachedInputWrite,
        cached_input_write_5m: selectedPeriod.trustedDimensions.cachedInputWrite5m,
        cached_input_write_1h: selectedPeriod.trustedDimensions.cachedInputWrite1h,
      }
    : schedule ? emptyTrustedDimensions() : trustedDimensions;
  const selectedPricingStatus = schedule && !selectedPeriod ? "missing" : info?.pricing_status ?? "missing";
  const selectedMissingReason = schedule && !selectedPeriod
    ? "pricing_schedule_time_invalid"
    : info?.missing_reason ?? (info ? null : "model_not_found");
  const selectedInputPrice = schedule && !selectedPeriod
    ? null
    : selectedPeriod?.inputTokenPricing ?? info?.input_price_per_million ?? null;
  const selectedOutputPrice = schedule && !selectedPeriod
    ? null
    : selectedPeriod?.outputTokenPricing ?? info?.output_price_per_million ?? null;
  const selectedCacheReadPrice = schedule && !selectedPeriod
    ? null
    : selectedPeriod?.cachedInputReadTokenPricing ?? info?.cached_input_read_price_per_million ?? null;
  const base: ResolvedTokenPricingPolicy = {
    pricing_policy_key: null,
    price_config_id: info?.price_config_id ?? null,
    model_provider: info?.model_provider ?? null,
    model_identifier: info?.model_identifier ?? null,
    model_value: info?.model_value ?? null,
    canonical_name: info?.canonical_name ?? null,
    currency: info?.currency ?? null,
    input_price_per_million: selectedInputPrice,
    output_price_per_million: selectedOutputPrice,
    cached_input_read_price_per_million: selectedCacheReadPrice,
    cached_input_write_price_per_million: info?.cached_input_write_price_per_million ?? null,
    cached_input_write_5m_price_per_million: info?.cached_input_write_5m_price_per_million ?? null,
    cached_input_write_1h_price_per_million: info?.cached_input_write_1h_price_per_million ?? null,
    input_price_tiers: schedule && !selectedPeriod ? [] : (info?.input_price_tiers ?? []).map((tier) => ({
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
    pricing_status: selectedPricingStatus,
    trusted_dimensions: selectedDimensions,
    missing_reason: selectedMissingReason,
    source: info?.pricing_source ?? null,
    effective_from: schedule?.effectiveFrom ?? null,
    effective_to: null,
    version: null,
    pricing_schedule_id: schedule?.scheduleId ?? null,
    pricing_schedule_period_id: selectedPeriod?.periodId ?? null,
    pricing_schedule_effective_from: schedule?.effectiveFrom ?? null,
    pricing_schedule_timezone: schedule?.timezone ?? null,
  };
  const scheduleSuffix = schedule && selectedPeriod ? `:${schedule.scheduleId}:${selectedPeriod.periodId}` : "";
  return {
    ...base,
    pricing_policy_key: policyKey(base) ? `${policyKey(base)}${scheduleSuffix}` : null,
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
  pricing_schedule_id: null,
  pricing_schedule_period_id: null,
  pricing_schedule_effective_from: null,
  pricing_schedule_timezone: null,
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
    return toPolicy(info, payload.observed_at);
  }
}

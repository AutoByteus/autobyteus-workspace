import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import {
  TokenPriceConfigProvider,
  type TokenPriceConfig,
} from "./token-price-config-provider.js";

const costFor = (tokens: number | null, pricePerMillion: number | null, trusted: boolean): number | null => {
  if (tokens === null || tokens <= 0) return tokens === 0 ? 0 : null;
  if (!trusted || pricePerMillion === null) return null;
  return (tokens / 1_000_000) * pricePerMillion;
};

const sumNullable = (values: Array<number | null>): number | null => {
  const present = values.filter((value): value is number => value !== null);
  return present.length > 0 ? present.reduce((sum, value) => sum + value, 0) : null;
};

type SelectedPrice = TokenPriceConfig & { selected_tier_id?: string | null };

const selectTier = (
  price: TokenPriceConfig,
  inputTokens: number | null,
): { selectedPrice: SelectedPrice; tierInputMissing: boolean } => {
  if (price.input_price_tiers.length === 0) {
    return { selectedPrice: price, tierInputMissing: false };
  }

  if (inputTokens === null) {
    return { selectedPrice: price, tierInputMissing: true };
  }

  const selected = price.input_price_tiers.find((tier) =>
    tier.max_input_tokens === null || inputTokens <= tier.max_input_tokens
  );
  if (!selected) return { selectedPrice: price, tierInputMissing: false };

  return {
    selectedPrice: {
      ...price,
      selected_tier_id: selected.tier_id,
      input_price_per_million: selected.input_price_per_million,
      output_price_per_million: selected.output_price_per_million,
      cached_input_read_price_per_million: selected.cached_input_read_price_per_million,
      cached_input_write_price_per_million: selected.cached_input_write_price_per_million,
      trusted_dimensions: selected.trusted_dimensions,
    },
    tierInputMissing: false,
  };
};

export class TokenCostCalculator {
  constructor(private readonly priceProvider = new TokenPriceConfigProvider()) {}

  async enrichCost(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    const price = await this.priceProvider.resolvePrice(payload);
    return this.applyPrice(payload, price);
  }

  applyPrice(payload: TokenUsageUpdatedPayload, price: TokenPriceConfig): TokenUsageUpdatedPayload {
    const inputTokens = payload.billable_input_tokens ?? payload.accounting_input_tokens;
    const { selectedPrice, tierInputMissing } = selectTier(price, inputTokens);
    const pricingStatus = selectedPrice.pricing_status;
    const pricingMissingReason = selectedPrice.missing_reason;

    if (pricingStatus !== "trusted") {
      return {
        ...payload,
        cost_basis: null,
        currency: selectedPrice.currency,
        input_price_per_million: selectedPrice.input_price_per_million,
        output_price_per_million: selectedPrice.output_price_per_million,
        cached_input_read_price_per_million: selectedPrice.cached_input_read_price_per_million,
        cached_input_write_price_per_million: selectedPrice.cached_input_write_price_per_million,
        pricing_source: selectedPrice.source,
        pricing_status: pricingStatus,
        pricing_missing_reason: pricingMissingReason,
        pricing_snapshot_json: selectedPrice,
        estimated_api_input_cost: null,
        estimated_api_standard_input_cost: null,
        estimated_api_cache_read_input_cost: null,
        estimated_api_cache_creation_input_cost: null,
        estimated_api_output_cost: null,
        estimated_api_reasoning_output_cost: null,
        estimated_api_total_cost: null,
        api_cost_status: "price_missing",
      };
    }

    const cacheRead = payload.cache_read_input_tokens ?? 0;
    const cacheCreation = payload.cache_creation_input_tokens ?? 0;
    const standardInputTokens = inputTokens === null
      ? null
      : Math.max(inputTokens - cacheRead - cacheCreation, 0);
    const outputTokens = payload.billable_output_tokens ?? payload.accounting_output_tokens;
    const reasoningTokens = payload.reasoning_output_tokens ?? null;

    const standardInputCost = costFor(
      standardInputTokens,
      selectedPrice.input_price_per_million,
      selectedPrice.trusted_dimensions.input,
    );
    const cacheReadCost = cacheRead > 0
      ? costFor(cacheRead, selectedPrice.cached_input_read_price_per_million, selectedPrice.trusted_dimensions.cached_input_read)
      : null;
    const cacheCreationCost = cacheCreation > 0
      ? costFor(cacheCreation, selectedPrice.cached_input_write_price_per_million, selectedPrice.trusted_dimensions.cached_input_write)
      : null;
    const outputCost = costFor(
      outputTokens,
      selectedPrice.output_price_per_million,
      selectedPrice.trusted_dimensions.output,
    );
    const reasoningCost = reasoningTokens !== null && reasoningTokens > 0
      ? costFor(
        reasoningTokens,
        selectedPrice.output_price_per_million,
        selectedPrice.trusted_dimensions.output,
      )
      : null;
    const inputCost = sumNullable([standardInputCost, cacheReadCost, cacheCreationCost]);
    const totalCost = sumNullable([inputCost, outputCost]);

    const hasMissingStandardInputCost =
      standardInputTokens !== null && standardInputTokens > 0 && standardInputCost === null;
    const hasMissingOutputCost = outputTokens !== null && outputTokens > 0 && outputCost === null;
    const hasMissingReasoningCost = reasoningTokens !== null && reasoningTokens > 0 && reasoningCost === null;
    const hasMissingCacheCost =
      (cacheRead > 0 && cacheReadCost === null) ||
      (cacheCreation > 0 && cacheCreationCost === null);
    const apiCostStatus =
      hasMissingStandardInputCost ||
      hasMissingOutputCost ||
      hasMissingReasoningCost ||
      hasMissingCacheCost ||
      tierInputMissing
        ? "partial_price_missing"
        : "estimated";
    const missingReason = tierInputMissing
      ? "tier_input_tokens_missing"
      : apiCostStatus === "partial_price_missing"
        ? "dimension_missing"
        : pricingMissingReason;

    return {
      ...payload,
      cost_basis: totalCost !== null ? "api_price_estimate" : null,
      currency: selectedPrice.currency,
      input_price_per_million: selectedPrice.input_price_per_million,
      output_price_per_million: selectedPrice.output_price_per_million,
      cached_input_read_price_per_million: selectedPrice.cached_input_read_price_per_million,
      cached_input_write_price_per_million: selectedPrice.cached_input_write_price_per_million,
      pricing_source: selectedPrice.source,
      pricing_status: selectedPrice.pricing_status,
      pricing_missing_reason: missingReason,
      pricing_snapshot_json: selectedPrice,
      estimated_api_input_cost: inputCost,
      estimated_api_standard_input_cost: standardInputCost,
      estimated_api_cache_read_input_cost: cacheReadCost,
      estimated_api_cache_creation_input_cost: cacheCreationCost,
      estimated_api_output_cost: outputCost,
      estimated_api_reasoning_output_cost: reasoningCost,
      estimated_api_total_cost: totalCost,
      api_cost_status: apiCostStatus,
    };
  }
}

import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import { TokenPriceConfigProvider, type TokenPriceConfig } from "./token-price-config-provider.js";

const costFor = (tokens: number | null, pricePerMillion: number | null, trusted: boolean): number | null => {
  if (tokens === null || tokens <= 0) return tokens === 0 ? 0 : null;
  if (!trusted || pricePerMillion === null) return null;
  return (tokens / 1_000_000) * pricePerMillion;
};

const sumNullable = (values: Array<number | null>): number | null => {
  const present = values.filter((value): value is number => value !== null);
  return present.length > 0 ? present.reduce((sum, value) => sum + value, 0) : null;
};

export class TokenCostCalculator {
  constructor(private readonly priceProvider = new TokenPriceConfigProvider()) {}

  async enrichCost(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    const price = await this.priceProvider.resolvePrice(payload);
    return this.applyPrice(payload, price);
  }

  applyPrice(payload: TokenUsageUpdatedPayload, price: TokenPriceConfig): TokenUsageUpdatedPayload {
    const pricingStatus = price.pricing_status;
    const pricingMissingReason = price.missing_reason;
    if (pricingStatus !== "trusted") {
      return {
        ...payload,
        cost_basis: null,
        currency: price.currency,
        input_price_per_million: price.input_price_per_million,
        output_price_per_million: price.output_price_per_million,
        cached_input_read_price_per_million: price.cached_input_read_price_per_million,
        cached_input_write_price_per_million: price.cached_input_write_price_per_million,
        pricing_source: price.source,
        pricing_status: pricingStatus,
        pricing_missing_reason: pricingMissingReason,
        pricing_snapshot_json: price,
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
    const inputTokens = payload.accounting_input_tokens;
    const standardInputTokens = inputTokens === null
      ? null
      : Math.max(inputTokens - cacheRead - cacheCreation, 0);

    const standardInputCost = costFor(
      standardInputTokens,
      price.input_price_per_million,
      price.trusted_dimensions.input,
    );
    const cacheReadCost = cacheRead > 0
      ? costFor(cacheRead, price.cached_input_read_price_per_million, price.trusted_dimensions.cached_input_read)
      : null;
    const cacheCreationCost = cacheCreation > 0
      ? costFor(cacheCreation, price.cached_input_write_price_per_million, price.trusted_dimensions.cached_input_write)
      : null;
    const outputCost = costFor(
      payload.accounting_output_tokens,
      price.output_price_per_million,
      price.trusted_dimensions.output,
    );
    const inputCost = sumNullable([standardInputCost, cacheReadCost, cacheCreationCost]);
    const totalCost = sumNullable([inputCost, outputCost]);

    const hasMissingInputCost = inputTokens !== null && inputTokens > 0 && inputCost === null;
    const hasMissingOutputCost = payload.accounting_output_tokens !== null && payload.accounting_output_tokens > 0 && outputCost === null;
    const hasMissingCacheCost = (cacheRead > 0 && cacheReadCost === null) || (cacheCreation > 0 && cacheCreationCost === null);
    const apiCostStatus = hasMissingInputCost || hasMissingOutputCost || hasMissingCacheCost
      ? "partial_price_missing"
      : "estimated";

    return {
      ...payload,
      cost_basis: totalCost !== null ? "api_price_estimate" : null,
      currency: price.currency,
      input_price_per_million: price.input_price_per_million,
      output_price_per_million: price.output_price_per_million,
      cached_input_read_price_per_million: price.cached_input_read_price_per_million,
      cached_input_write_price_per_million: price.cached_input_write_price_per_million,
      pricing_source: price.source,
      pricing_status: price.pricing_status,
      pricing_missing_reason: apiCostStatus === "partial_price_missing" ? "dimension_missing" : pricingMissingReason,
      pricing_snapshot_json: price,
      estimated_api_input_cost: inputCost,
      estimated_api_standard_input_cost: standardInputCost,
      estimated_api_cache_read_input_cost: cacheReadCost,
      estimated_api_cache_creation_input_cost: cacheCreationCost,
      estimated_api_output_cost: outputCost,
      estimated_api_reasoning_output_cost: null,
      estimated_api_total_cost: totalCost,
      api_cost_status: apiCostStatus,
    };
  }
}

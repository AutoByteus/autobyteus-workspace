import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import { TokenPriceConfigProvider } from "./token-price-config-provider.js";
import type {
  ResolvedTokenPricingPolicy,
  SelectedTokenPricingPolicy,
} from "./token-pricing-policy.js";

const costFor = (tokens: number | null, pricePerMillion: number | null, trusted: boolean): number | null => {
  if (tokens === null) return null;
  if (tokens <= 0) return 0;
  if (!trusted || pricePerMillion === null) return null;
  return (tokens / 1_000_000) * pricePerMillion;
};

const sumNullable = (values: Array<number | null>): number | null => {
  const present = values.filter((value): value is number => value !== null);
  return present.length > 0 ? present.reduce((sum, value) => sum + value, 0) : null;
};

const selectTier = (
  policy: ResolvedTokenPricingPolicy,
  grossInputTokens: number | null,
): { selectedPolicy: SelectedTokenPricingPolicy; tierInputMissing: boolean } => {
  if (policy.input_price_tiers.length === 0) {
    return { selectedPolicy: policy, tierInputMissing: false };
  }

  if (grossInputTokens === null) {
    return { selectedPolicy: policy, tierInputMissing: true };
  }

  const selected = policy.input_price_tiers.find((tier) =>
    tier.max_input_tokens === null || grossInputTokens <= tier.max_input_tokens
  );
  if (!selected) return { selectedPolicy: policy, tierInputMissing: false };

  return {
    selectedPolicy: {
      ...policy,
      selected_tier_id: selected.tier_id,
      input_price_per_million: selected.input_price_per_million,
      output_price_per_million: selected.output_price_per_million,
      cached_input_read_price_per_million: selected.cached_input_read_price_per_million,
      cached_input_write_price_per_million: selected.cached_input_write_price_per_million,
      cached_input_write_5m_price_per_million: selected.cached_input_write_5m_price_per_million,
      cached_input_write_1h_price_per_million: selected.cached_input_write_1h_price_per_million,
      trusted_dimensions: selected.trusted_dimensions,
    },
    tierInputMissing: false,
  };
};

const hasPositiveTokens = (tokens: number | null): boolean => tokens !== null && tokens > 0;

const mergeDimensions = (...dimensionGroups: Array<string[]>): string[] =>
  Array.from(new Set(dimensionGroups.flat().filter(Boolean))).sort();

export class TokenCostCalculator {
  constructor(private readonly priceProvider = new TokenPriceConfigProvider()) {}

  async enrichCost(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    const policy = await this.priceProvider.resolvePolicy(payload);
    return this.applyPolicy(payload, policy);
  }

  applyPolicy(payload: TokenUsageUpdatedPayload, policy: ResolvedTokenPricingPolicy): TokenUsageUpdatedPayload {
    const { selectedPolicy, tierInputMissing } = selectTier(policy, payload.accounting_input_tokens);
    const basePriceFields = {
      currency: selectedPolicy.currency,
      input_price_per_million: selectedPolicy.input_price_per_million,
      output_price_per_million: selectedPolicy.output_price_per_million,
      cached_input_read_price_per_million: selectedPolicy.cached_input_read_price_per_million,
      cached_input_write_price_per_million: selectedPolicy.cached_input_write_price_per_million,
      cached_input_write_5m_price_per_million: selectedPolicy.cached_input_write_5m_price_per_million,
      cached_input_write_1h_price_per_million: selectedPolicy.cached_input_write_1h_price_per_million,
      pricing_source: selectedPolicy.source,
      pricing_status: selectedPolicy.pricing_status,
      pricing_snapshot_json: selectedPolicy,
      pricing_policy_key: selectedPolicy.pricing_policy_key,
      selected_pricing_tier_id: selectedPolicy.selected_tier_id ?? null,
    };

    if (selectedPolicy.pricing_status === "local_no_api_bill") {
      return {
        ...payload,
        ...basePriceFields,
        cost_basis: null,
        pricing_missing_reason: null,
        missing_price_dimensions: [],
        estimated_api_input_cost: 0,
        estimated_api_standard_input_cost: 0,
        estimated_api_cache_read_input_cost: null,
        estimated_api_cache_creation_input_cost: null,
        estimated_api_cache_creation_5m_input_cost: null,
        estimated_api_cache_creation_1h_input_cost: null,
        estimated_api_output_cost: 0,
        estimated_api_reasoning_output_cost: null,
        estimated_api_total_cost: 0,
        api_cost_status: "local_no_api_bill",
        cache_state: "unsupported_or_local",
      };
    }

    if (selectedPolicy.pricing_status !== "trusted") {
      return {
        ...payload,
        ...basePriceFields,
        cost_basis: null,
        pricing_missing_reason: selectedPolicy.missing_reason,
        missing_price_dimensions: mergeDimensions(payload.missing_price_dimensions, [selectedPolicy.missing_reason ?? "pricing_policy"]),
        estimated_api_input_cost: null,
        estimated_api_standard_input_cost: null,
        estimated_api_cache_read_input_cost: null,
        estimated_api_cache_creation_input_cost: null,
        estimated_api_cache_creation_5m_input_cost: null,
        estimated_api_cache_creation_1h_input_cost: null,
        estimated_api_output_cost: null,
        estimated_api_reasoning_output_cost: null,
        estimated_api_total_cost: null,
        api_cost_status: "price_missing",
      };
    }

    const standardInputTokens = payload.standard_input_tokens;
    const cacheReadTokens = payload.cache_read_input_tokens;
    const cacheCreation5mTokens = payload.cache_creation_5m_input_tokens;
    const cacheCreation1hTokens = payload.cache_creation_1h_input_tokens;
    const subtypeCacheCreationTokens = (cacheCreation5mTokens ?? 0) + (cacheCreation1hTokens ?? 0);
    const aggregateCacheCreationTokens = payload.cache_creation_input_tokens;
    const genericCacheCreationTokens = aggregateCacheCreationTokens === null
      ? null
      : Math.max(aggregateCacheCreationTokens - subtypeCacheCreationTokens, 0);
    const outputTokens = payload.billable_output_tokens ?? payload.accounting_output_tokens;
    const reasoningTokens = payload.reasoning_output_tokens;

    const standardInputCost = costFor(
      standardInputTokens,
      selectedPolicy.input_price_per_million,
      selectedPolicy.trusted_dimensions.input,
    );
    const cacheReadCost = costFor(
      cacheReadTokens,
      selectedPolicy.cached_input_read_price_per_million,
      selectedPolicy.trusted_dimensions.cached_input_read,
    );
    const cacheCreationGenericCost = costFor(
      genericCacheCreationTokens,
      selectedPolicy.cached_input_write_price_per_million,
      selectedPolicy.trusted_dimensions.cached_input_write,
    );
    const cacheCreation5mCost = costFor(
      cacheCreation5mTokens,
      selectedPolicy.cached_input_write_5m_price_per_million,
      selectedPolicy.trusted_dimensions.cached_input_write_5m,
    );
    const cacheCreation1hCost = costFor(
      cacheCreation1hTokens,
      selectedPolicy.cached_input_write_1h_price_per_million,
      selectedPolicy.trusted_dimensions.cached_input_write_1h,
    );
    const cacheCreationCost = sumNullable([cacheCreationGenericCost, cacheCreation5mCost, cacheCreation1hCost]);
    const outputCost = costFor(
      outputTokens,
      selectedPolicy.output_price_per_million,
      selectedPolicy.trusted_dimensions.output,
    );
    const reasoningCost = reasoningTokens !== null && reasoningTokens > 0
      ? costFor(reasoningTokens, selectedPolicy.output_price_per_million, selectedPolicy.trusted_dimensions.output)
      : null;
    const inputCost = sumNullable([standardInputCost, cacheReadCost, cacheCreationCost]);
    const totalCost = sumNullable([inputCost, outputCost]);

    const missingDimensions: string[] = [];
    if (tierInputMissing) missingDimensions.push("pricing_tier_input_tokens");
    if (hasPositiveTokens(payload.accounting_input_tokens) && standardInputTokens === null) {
      missingDimensions.push("standard_input_tokens");
    }
    if (hasPositiveTokens(standardInputTokens) && standardInputCost === null) {
      missingDimensions.push("standard_input_price");
    }
    if ((cacheReadTokens ?? 0) > 0 && cacheReadCost === null) {
      missingDimensions.push("cache_read_input_price");
    }
    if ((genericCacheCreationTokens ?? 0) > 0 && cacheCreationGenericCost === null) {
      missingDimensions.push("cache_creation_input_price");
    }
    if ((cacheCreation5mTokens ?? 0) > 0 && cacheCreation5mCost === null) {
      missingDimensions.push("cache_creation_5m_input_price");
    }
    if ((cacheCreation1hTokens ?? 0) > 0 && cacheCreation1hCost === null) {
      missingDimensions.push("cache_creation_1h_input_price");
    }
    if (hasPositiveTokens(outputTokens) && outputCost === null) {
      missingDimensions.push("output_price");
    }
    if (hasPositiveTokens(reasoningTokens) && reasoningCost === null) {
      missingDimensions.push("reasoning_output_price");
    }

    const allMissingDimensions = mergeDimensions(payload.missing_price_dimensions, missingDimensions);
    const apiCostStatus = allMissingDimensions.length > 0 ? "partial_price_missing" : "estimated";

    return {
      ...payload,
      ...basePriceFields,
      cost_basis: totalCost !== null ? "api_price_estimate" : null,
      pricing_missing_reason: apiCostStatus === "partial_price_missing"
        ? "dimension_missing"
        : selectedPolicy.missing_reason,
      missing_price_dimensions: allMissingDimensions,
      estimated_api_input_cost: inputCost,
      estimated_api_standard_input_cost: standardInputCost,
      estimated_api_cache_read_input_cost: (cacheReadTokens ?? 0) > 0 ? cacheReadCost : null,
      estimated_api_cache_creation_input_cost: (aggregateCacheCreationTokens ?? 0) > 0 ? cacheCreationCost : null,
      estimated_api_cache_creation_5m_input_cost: (cacheCreation5mTokens ?? 0) > 0 ? cacheCreation5mCost : null,
      estimated_api_cache_creation_1h_input_cost: (cacheCreation1hTokens ?? 0) > 0 ? cacheCreation1hCost : null,
      estimated_api_output_cost: outputCost,
      estimated_api_reasoning_output_cost: reasoningCost,
      estimated_api_total_cost: totalCost,
      api_cost_status: apiCostStatus,
    };
  }
}

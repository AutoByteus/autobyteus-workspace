import type { DistinctValueSummary } from "./token-usage-distinct-value-summary.js";
import type { TokenUsageUnitPrices } from "./token-usage-unit-price-summary.js";

export const TOKEN_USAGE_TOKEN_FIELDS = [
  "accounting_input_tokens",
  "accounting_output_tokens",
  "accounting_total_tokens",
  "standard_input_tokens",
  "cache_miss_input_tokens",
  "cache_read_input_tokens",
  "cache_creation_input_tokens",
  "cache_creation_5m_input_tokens",
  "cache_creation_1h_input_tokens",
  "reasoning_output_tokens",
  "billable_input_tokens",
  "billable_output_tokens",
] as const;

export type TokenUsageTokenField = typeof TOKEN_USAGE_TOKEN_FIELDS[number];
export type TokenUsageTokenTotals = Record<TokenUsageTokenField, bigint>;

export const TOKEN_USAGE_COST_FIELDS = [
  "estimated_api_input_cost",
  "estimated_api_standard_input_cost",
  "estimated_api_cache_read_input_cost",
  "estimated_api_cache_creation_input_cost",
  "estimated_api_cache_creation_5m_input_cost",
  "estimated_api_cache_creation_1h_input_cost",
  "estimated_api_output_cost",
  "estimated_api_reasoning_output_cost",
  "estimated_api_total_cost",
] as const;

export type TokenUsageCostField = typeof TOKEN_USAGE_COST_FIELDS[number];
export type TokenUsageCostTotals = Record<TokenUsageCostField, number | null>;

export const TOKEN_USAGE_UNIT_PRICE_FIELDS = [
  "standard_input",
  "cache_read_input",
  "cache_creation_input",
  "cache_creation_5m_input",
  "cache_creation_1h_input",
  "output",
  "reasoning_output",
] as const;

export interface TokenUsagePricingSummary {
  currencies: DistinctValueSummary<string>;
  apiCostStatuses: DistinctValueSummary<string>;
  pricingPolicyKeys: DistinctValueSummary<string>;
  selectedPricingTierIds: DistinctValueSummary<string>;
  missingPriceDimensions: string[];
  unitPrices: TokenUsageUnitPrices;
}

import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import {
  distinctValueFrom,
  mergeDistinctValue,
  unknownDistinctValue,
} from "../domain/token-usage-distinct-value-summary.js";
import type { TokenUsagePricingSummary } from "../domain/token-usage-run-record.js";
import type {
  TokenUsageUnitPrices,
  TokenUsageUnitPriceSummary,
} from "../domain/token-usage-unit-price-summary.js";
import { buildTokenUsageUnitPrices } from "./token-usage-unit-price-summary.js";

const emptyUnitPrice = (): TokenUsageUnitPriceSummary => ({
  status: "not_applicable",
  price_per_million: null,
});

export const emptyTokenUsagePricingSummary = (): TokenUsagePricingSummary => ({
  currencies: unknownDistinctValue(),
  apiCostStatuses: unknownDistinctValue(),
  pricingPolicyKeys: unknownDistinctValue(),
  selectedPricingTierIds: unknownDistinctValue(),
  missingPriceDimensions: [],
  unitPrices: {
    standard_input: emptyUnitPrice(),
    cache_read_input: emptyUnitPrice(),
    cache_creation_input: emptyUnitPrice(),
    cache_creation_5m_input: emptyUnitPrice(),
    cache_creation_1h_input: emptyUnitPrice(),
    output: emptyUnitPrice(),
    reasoning_output: emptyUnitPrice(),
  },
});

const mergeUnitPrice = (
  left: TokenUsageUnitPriceSummary,
  right: TokenUsageUnitPriceSummary,
): TokenUsageUnitPriceSummary => {
  if (left.status === "not_applicable") return right;
  if (right.status === "not_applicable") return left;
  if (left.status === "mixed" || right.status === "mixed") {
    return { status: "mixed", price_per_million: null };
  }
  if (left.status === "single" && right.status === "single") {
    return Math.abs((left.price_per_million ?? 0) - (right.price_per_million ?? 0)) <= 1e-9
      ? left
      : { status: "mixed", price_per_million: null };
  }
  if (left.status === "local_no_api_bill" && right.status === "local_no_api_bill") return left;
  if (left.status === right.status && left.price_per_million === right.price_per_million) return left;
  const single = left.status === "single" ? left : right.status === "single" ? right : null;
  if (single && [left.status, right.status].some((status) => status === "missing" || status === "partial_missing")) {
    return { status: "partial_missing", price_per_million: single.price_per_million };
  }
  return { status: "mixed", price_per_million: null };
};

const applyMixedCurrencySemantics = (
  summary: TokenUsagePricingSummary,
): TokenUsagePricingSummary => summary.currencies.status !== "mixed" ? summary : {
  ...summary,
  apiCostStatuses: { status: "mixed" },
  unitPrices: Object.fromEntries(Object.entries(summary.unitPrices).map(([field, unitPrice]) => [
    field,
    unitPrice.status === "not_applicable"
      ? unitPrice
      : { status: "mixed", price_per_million: null },
  ])) as TokenUsageUnitPrices,
};

export const mergeTokenUsagePricingSummaries = (
  left: TokenUsagePricingSummary,
  right: TokenUsagePricingSummary,
): TokenUsagePricingSummary => applyMixedCurrencySemantics({
  currencies: mergeDistinctValue(left.currencies, right.currencies),
  apiCostStatuses: mergeDistinctValue(left.apiCostStatuses, right.apiCostStatuses),
  pricingPolicyKeys: mergeDistinctValue(left.pricingPolicyKeys, right.pricingPolicyKeys),
  selectedPricingTierIds: mergeDistinctValue(left.selectedPricingTierIds, right.selectedPricingTierIds),
  missingPriceDimensions: [...new Set([
    ...left.missingPriceDimensions,
    ...right.missingPriceDimensions,
  ])].sort(),
  unitPrices: Object.fromEntries(Object.keys(left.unitPrices).map((field) => [
    field,
    mergeUnitPrice(
      left.unitPrices[field as keyof TokenUsageUnitPrices],
      right.unitPrices[field as keyof TokenUsageUnitPrices],
    ),
  ])) as unknown as TokenUsageUnitPrices,
});

export const pricingSummaryFromPayload = (
  payload: TokenUsageUpdatedPayload,
): TokenUsagePricingSummary => ({
  currencies: distinctValueFrom(payload.currency),
  apiCostStatuses: distinctValueFrom(payload.api_cost_status),
  pricingPolicyKeys: distinctValueFrom(payload.pricing_policy_key),
  selectedPricingTierIds: distinctValueFrom(payload.selected_pricing_tier_id),
  missingPriceDimensions: [...new Set(payload.missing_price_dimensions)].sort(),
  unitPrices: buildTokenUsageUnitPrices([payload]),
});

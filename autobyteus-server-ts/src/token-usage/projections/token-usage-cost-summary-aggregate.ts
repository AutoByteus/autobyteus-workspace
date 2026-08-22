import type { TokenUsageApiCostStatus } from "../../agent-execution/domain/agent-run-token-usage.js";
import { summarizeCacheState, type CacheState } from "../domain/token-usage-component-basis.js";
import { distinctValueOrNull } from "../domain/token-usage-distinct-value-summary.js";
import {
  TOKEN_USAGE_COST_FIELDS,
  TOKEN_USAGE_TOKEN_FIELDS,
  type TokenUsageAccountingSummarySource,
} from "../domain/token-usage-accounting-summary.js";
import type { TokenUsageUnitPrices } from "../domain/token-usage-unit-price-summary.js";
import {
  emptyTokenUsagePricingSummary,
  mergeTokenUsagePricingSummaries,
} from "./token-usage-pricing-summary.js";

export interface TokenUsageCostSummaryAggregate {
  gross_input_tokens: number;
  standard_input_tokens: number;
  cache_miss_input_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  cache_creation_5m_input_tokens: number;
  cache_creation_1h_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
  billable_output_tokens: number;
  total_tokens: number;
  cache_read_input_token_rate: number | null;
  standard_input_token_rate: number | null;
  cache_creation_input_token_rate: number | null;
  cache_state: CacheState;
  estimated_api_input_cost: number | null;
  estimated_api_standard_input_cost: number | null;
  estimated_api_cache_read_input_cost: number | null;
  estimated_api_cache_creation_input_cost: number | null;
  estimated_api_cache_creation_5m_input_cost: number | null;
  estimated_api_cache_creation_1h_input_cost: number | null;
  estimated_api_output_cost: number | null;
  estimated_api_reasoning_output_cost: number | null;
  estimated_api_total_cost: number | null;
  currency: string | null;
  api_cost_status: TokenUsageApiCostStatus;
  missing_price_dimensions: string[];
  pricing_policy_key: string | null;
  selected_pricing_tier_id: string | null;
  unit_prices: TokenUsageUnitPrices;
  usage_report_count: number;
  updated_at: string | null;
  observed_runtime_kinds: string[];
  observed_model_identifiers: string[];
  observed_model_providers: string[];
}

export const normalizeTokenUsageRuntimeKind = (runtimeKind: string | null | undefined): string =>
  runtimeKind?.trim() || "Unknown";

export const normalizeTokenUsageModelIdentifier = (value: {
  model_identifier: string | null | undefined;
  model_value: string | null | undefined;
}): string => value.model_identifier?.trim() || value.model_value?.trim() || "Unknown";

export class TokenUsageSafeIntegerExceededError extends Error {
  readonly code = "TOKEN_USAGE_SAFE_INTEGER_EXCEEDED";

  constructor(readonly field: string) {
    super(`TOKEN_USAGE_SAFE_INTEGER_EXCEEDED:${field}`);
    this.name = "TokenUsageSafeIntegerExceededError";
  }
}

export const tokenUsageSafeNumber = (value: bigint, field: string): number => {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new TokenUsageSafeIntegerExceededError(field);
  return number;
};

const addNullableCost = (left: number | null, right: number | null): number | null => {
  if (left === null && right === null) return null;
  const value = (left ?? 0) + (right ?? 0);
  if (!Number.isFinite(value)) throw new Error("TOKEN_USAGE_COST_NOT_FINITE");
  return value;
};

const uniqueSorted = (values: string[][]): string[] => [...new Set(values.flat().filter(Boolean))].sort();
const rate = (numerator: number, denominator: number): number | null => denominator > 0 ? numerator / denominator : null;

/** The single SafeInt/null-cost/mixed-currency aggregate authority for run and analytics sources. */
export const buildTokenUsageCostSummaryAggregate = (
  sources: readonly TokenUsageAccountingSummarySource[],
): TokenUsageCostSummaryAggregate => {
  const tokenBigInts = Object.fromEntries(TOKEN_USAGE_TOKEN_FIELDS.map((field) => [
    field,
    sources.reduce((sum, source) => sum + source.tokenTotals[field], 0n),
  ])) as Record<(typeof TOKEN_USAGE_TOKEN_FIELDS)[number], bigint>;
  const tokens = Object.fromEntries(TOKEN_USAGE_TOKEN_FIELDS.map((field) => [
    field,
    tokenUsageSafeNumber(tokenBigInts[field], field),
  ])) as Record<(typeof TOKEN_USAGE_TOKEN_FIELDS)[number], number>;
  const costs = Object.fromEntries(TOKEN_USAGE_COST_FIELDS.map((field) => [
    field,
    sources.reduce((sum, source) => addNullableCost(sum, source.costTotals[field]), null as number | null),
  ])) as Record<(typeof TOKEN_USAGE_COST_FIELDS)[number], number | null>;
  const pricing = sources.reduce(
    (summary, source) => mergeTokenUsagePricingSummaries(summary, source.pricingSummary),
    emptyTokenUsagePricingSummary(),
  );
  const mixedCurrency = pricing.currencies.status === "mixed";
  const latest = sources.reduce<TokenUsageAccountingSummarySource | null>((current, source) => (
    !current || source.latestObservedAt > current.latestObservedAt ? source : current
  ), null);
  return {
    gross_input_tokens: tokens.accounting_input_tokens,
    standard_input_tokens: tokens.standard_input_tokens,
    cache_miss_input_tokens: tokens.cache_miss_input_tokens,
    cache_read_input_tokens: tokens.cache_read_input_tokens,
    cache_creation_input_tokens: tokens.cache_creation_input_tokens,
    cache_creation_5m_input_tokens: tokens.cache_creation_5m_input_tokens,
    cache_creation_1h_input_tokens: tokens.cache_creation_1h_input_tokens,
    output_tokens: tokens.accounting_output_tokens,
    reasoning_output_tokens: tokens.reasoning_output_tokens,
    billable_output_tokens: tokens.billable_output_tokens,
    total_tokens: tokens.accounting_total_tokens,
    cache_read_input_token_rate: rate(tokens.cache_read_input_tokens, tokens.accounting_input_tokens),
    standard_input_token_rate: rate(tokens.standard_input_tokens, tokens.accounting_input_tokens),
    cache_creation_input_token_rate: rate(tokens.cache_creation_input_tokens, tokens.accounting_input_tokens),
    cache_state: summarizeCacheState(sources.map((source) => source.cacheState)),
    estimated_api_input_cost: mixedCurrency ? null : costs.estimated_api_input_cost,
    estimated_api_standard_input_cost: mixedCurrency ? null : costs.estimated_api_standard_input_cost,
    estimated_api_cache_read_input_cost: mixedCurrency ? null : costs.estimated_api_cache_read_input_cost,
    estimated_api_cache_creation_input_cost: mixedCurrency ? null : costs.estimated_api_cache_creation_input_cost,
    estimated_api_cache_creation_5m_input_cost: mixedCurrency ? null : costs.estimated_api_cache_creation_5m_input_cost,
    estimated_api_cache_creation_1h_input_cost: mixedCurrency ? null : costs.estimated_api_cache_creation_1h_input_cost,
    estimated_api_output_cost: mixedCurrency ? null : costs.estimated_api_output_cost,
    estimated_api_reasoning_output_cost: mixedCurrency ? null : costs.estimated_api_reasoning_output_cost,
    estimated_api_total_cost: mixedCurrency ? null : costs.estimated_api_total_cost,
    currency: distinctValueOrNull(pricing.currencies),
    api_cost_status: pricing.apiCostStatuses.status === "single"
      ? pricing.apiCostStatuses.value as TokenUsageApiCostStatus
      : pricing.apiCostStatuses.status === "mixed" ? "mixed" : "price_missing",
    missing_price_dimensions: pricing.missingPriceDimensions,
    pricing_policy_key: distinctValueOrNull(pricing.pricingPolicyKeys),
    selected_pricing_tier_id: distinctValueOrNull(pricing.selectedPricingTierIds),
    unit_prices: pricing.unitPrices,
    usage_report_count: tokenUsageSafeNumber(sources.reduce((sum, source) => sum + source.usageReportCount, 0n), "usage_report_count"),
    updated_at: latest?.latestObservedAt.toISOString() ?? null,
    observed_runtime_kinds: uniqueSorted(sources.map((source) => source.observedRuntimeKinds)),
    observed_model_identifiers: uniqueSorted(sources.map((source) => source.observedModelIdentifiers)),
    observed_model_providers: uniqueSorted(sources.map((source) => source.observedModelProviders)),
  };
};

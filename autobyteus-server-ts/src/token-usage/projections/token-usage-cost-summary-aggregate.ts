import type { TokenUsageApiCostStatus } from "../../agent-execution/domain/agent-run-token-usage.js";
import type { CacheState } from "../domain/token-usage-component-basis.js";
import type { TokenUsageUnitPrices } from "../domain/token-usage-unit-price-summary.js";

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

import type {
  TokenUsageApiCostStatus,
  TokenUsageUpdatedPayload,
} from "../../agent-execution/domain/agent-run-token-usage.js";
import {
  summarizeCacheState,
  type CacheState,
} from "../domain/token-usage-component-basis.js";

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
  usage_report_count: number;
  updated_at: string | null;
  observed_runtime_kinds: string[];
  observed_model_identifiers: string[];
  observed_model_providers: string[];
}

const UNKNOWN_LABEL = "Unknown";

const add = (current: number, next: number | null | undefined): number => current + (next ?? 0);

const addNullableCost = (current: number | null, next: number | null): number | null => {
  if (current === null && next === null) return null;
  return (current ?? 0) + (next ?? 0);
};

const rate = (numerator: number, denominator: number): number | null => (
  denominator > 0 ? numerator / denominator : null
);

const uniqueStrings = (values: Array<string | null | undefined>): string[] =>
  Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort();

const summarizeCostStatus = (events: TokenUsageUpdatedPayload[]): TokenUsageApiCostStatus => {
  if (events.length === 0) return "price_missing";
  const statuses = new Set(events.map((event) => event.api_cost_status));
  return statuses.size === 1 ? events[0]!.api_cost_status : "mixed";
};

const currencySummary = (events: TokenUsageUpdatedPayload[]): { currency: string | null; mixed: boolean } => {
  const currencies = uniqueStrings(events.map((event) => event.currency));
  if (currencies.length > 1) return { currency: null, mixed: true };
  return { currency: currencies[0] ?? null, mixed: false };
};

const sumCost = (
  events: TokenUsageUpdatedPayload[],
  select: (event: TokenUsageUpdatedPayload) => number | null,
): number | null => events.reduce((sum, event) => addNullableCost(sum, select(event)), null as number | null);

const singleOrNull = (values: string[]): string | null => values.length === 1 ? values[0]! : null;

const latestEvent = (events: TokenUsageUpdatedPayload[]): TokenUsageUpdatedPayload | null => (
  events.reduce<TokenUsageUpdatedPayload | null>((latest, event) => {
    if (!latest) return event;
    return event.observed_at.localeCompare(latest.observed_at) >= 0 ? event : latest;
  }, null)
);

export const normalizeTokenUsageRuntimeKind = (runtimeKind: string | null | undefined): string => {
  const normalized = runtimeKind?.trim();
  return normalized || UNKNOWN_LABEL;
};

export const normalizeTokenUsageModelIdentifier = (event: Pick<TokenUsageUpdatedPayload, "model_identifier" | "model_value">): string => {
  const normalized = event.model_identifier?.trim() || event.model_value?.trim();
  return normalized || UNKNOWN_LABEL;
};

export const buildTokenUsageCostSummaryAggregate = (
  events: TokenUsageUpdatedPayload[],
): TokenUsageCostSummaryAggregate => {
  const grossInputTokens = events.reduce((sum, event) => add(sum, event.accounting_input_tokens), 0);
  const standardInputTokens = events.reduce((sum, event) => add(sum, event.standard_input_tokens), 0);
  const cacheMissInputTokens = events.reduce((sum, event) => add(sum, event.cache_miss_input_tokens), 0);
  const cacheReadTokens = events.reduce((sum, event) => add(sum, event.cache_read_input_tokens), 0);
  const cacheCreationTokens = events.reduce((sum, event) => add(sum, event.cache_creation_input_tokens), 0);
  const cacheCreation5mTokens = events.reduce((sum, event) => add(sum, event.cache_creation_5m_input_tokens), 0);
  const cacheCreation1hTokens = events.reduce((sum, event) => add(sum, event.cache_creation_1h_input_tokens), 0);
  const outputTokens = events.reduce((sum, event) => add(sum, event.accounting_output_tokens), 0);
  const reasoningTokens = events.reduce((sum, event) => add(sum, event.reasoning_output_tokens), 0);
  const billableOutputTokens = events.reduce((sum, event) => add(sum, event.billable_output_tokens), 0);
  const totalTokens = events.reduce((sum, event) => add(sum, event.accounting_total_tokens), 0);
  const { currency, mixed } = currencySummary(events);
  const latest = latestEvent(events);

  return {
    gross_input_tokens: grossInputTokens,
    standard_input_tokens: standardInputTokens,
    cache_miss_input_tokens: cacheMissInputTokens,
    cache_read_input_tokens: cacheReadTokens,
    cache_creation_input_tokens: cacheCreationTokens,
    cache_creation_5m_input_tokens: cacheCreation5mTokens,
    cache_creation_1h_input_tokens: cacheCreation1hTokens,
    output_tokens: outputTokens,
    reasoning_output_tokens: reasoningTokens,
    billable_output_tokens: billableOutputTokens,
    total_tokens: totalTokens,
    cache_read_input_token_rate: rate(cacheReadTokens, grossInputTokens),
    standard_input_token_rate: rate(standardInputTokens, grossInputTokens),
    cache_creation_input_token_rate: rate(cacheCreationTokens, grossInputTokens),
    cache_state: summarizeCacheState(events.map((event) => event.cache_state)),
    estimated_api_input_cost: mixed ? null : sumCost(events, (event) => event.estimated_api_input_cost),
    estimated_api_standard_input_cost: mixed ? null : sumCost(events, (event) => event.estimated_api_standard_input_cost),
    estimated_api_cache_read_input_cost: mixed ? null : sumCost(events, (event) => event.estimated_api_cache_read_input_cost),
    estimated_api_cache_creation_input_cost: mixed ? null : sumCost(events, (event) => event.estimated_api_cache_creation_input_cost),
    estimated_api_cache_creation_5m_input_cost: mixed ? null : sumCost(events, (event) => event.estimated_api_cache_creation_5m_input_cost),
    estimated_api_cache_creation_1h_input_cost: mixed ? null : sumCost(events, (event) => event.estimated_api_cache_creation_1h_input_cost),
    estimated_api_output_cost: mixed ? null : sumCost(events, (event) => event.estimated_api_output_cost),
    estimated_api_reasoning_output_cost: mixed ? null : sumCost(events, (event) => event.estimated_api_reasoning_output_cost),
    estimated_api_total_cost: mixed ? null : sumCost(events, (event) => event.estimated_api_total_cost),
    currency,
    api_cost_status: mixed ? "mixed" : summarizeCostStatus(events),
    missing_price_dimensions: uniqueStrings(events.flatMap((event) => event.missing_price_dimensions)),
    pricing_policy_key: singleOrNull(uniqueStrings(events.map((event) => event.pricing_policy_key))),
    selected_pricing_tier_id: singleOrNull(uniqueStrings(events.map((event) => event.selected_pricing_tier_id))),
    usage_report_count: events.length,
    updated_at: latest?.observed_at ?? null,
    observed_runtime_kinds: uniqueStrings(events.map((event) => normalizeTokenUsageRuntimeKind(event.runtime_kind))),
    observed_model_identifiers: uniqueStrings(events.map((event) => normalizeTokenUsageModelIdentifier(event))),
    observed_model_providers: uniqueStrings(events.map((event) => event.model_provider)),
  };
};

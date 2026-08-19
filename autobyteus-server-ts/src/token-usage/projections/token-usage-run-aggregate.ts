import type { TokenUsageRunSummaryPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import { summarizeCacheState } from "../domain/token-usage-component-basis.js";
import {
  distinctValueLabel,
  distinctValueOrNull,
  mergeDistinctValue,
  unknownDistinctValue,
} from "../domain/token-usage-distinct-value-summary.js";
import {
  TOKEN_USAGE_COST_FIELDS,
  TOKEN_USAGE_TOKEN_FIELDS,
  type TokenUsagePricingSummary,
  type TokenUsageRunRecord,
} from "../domain/token-usage-run-record.js";
import type { TokenUsageCostSummaryAggregate } from "./token-usage-cost-summary-aggregate.js";
import { compareAdmissionMarkers } from "../domain/token-usage-snapshot-checkpoint.js";
import {
  emptyTokenUsagePricingSummary,
  mergeTokenUsagePricingSummaries,
} from "./token-usage-pricing-summary.js";

export class TokenUsageSafeIntegerExceededError extends Error {
  readonly code = "TOKEN_USAGE_SAFE_INTEGER_EXCEEDED";

  constructor(readonly field: string) {
    super(`TOKEN_USAGE_SAFE_INTEGER_EXCEEDED:${field}`);
    this.name = "TokenUsageSafeIntegerExceededError";
  }
}

const safeNumber = (value: bigint, field: string): number => {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new TokenUsageSafeIntegerExceededError(field);
  }
  return number;
};
const addNullable = (left: number | null, right: number | null): number | null => {
  if (left === null && right === null) return null;
  const value = (left ?? 0) + (right ?? 0);
  if (!Number.isFinite(value)) throw new Error("TOKEN_USAGE_COST_NOT_FINITE");
  return value;
};
const rate = (numerator: number, denominator: number): number | null => denominator > 0 ? numerator / denominator : null;

const latestRecord = (records: readonly TokenUsageRunRecord[]): TokenUsageRunRecord | null =>
  records.reduce<TokenUsageRunRecord | null>((latest, record) => (
    !latest || compareAdmissionMarkers(record.latestObservation, latest.latestObservation) > 0 ? record : latest
  ), null);

export const buildTokenUsageRunAggregate = (
  records: readonly TokenUsageRunRecord[],
): TokenUsageCostSummaryAggregate => {
  const tokenBigInts = Object.fromEntries(TOKEN_USAGE_TOKEN_FIELDS.map((field) => [
    field,
    records.reduce((sum, record) => sum + record.tokenTotals[field], 0n),
  ])) as Record<(typeof TOKEN_USAGE_TOKEN_FIELDS)[number], bigint>;
  const tokens = Object.fromEntries(TOKEN_USAGE_TOKEN_FIELDS.map((field) => [
    field,
    safeNumber(tokenBigInts[field], field),
  ])) as Record<(typeof TOKEN_USAGE_TOKEN_FIELDS)[number], number>;
  const costs = Object.fromEntries(TOKEN_USAGE_COST_FIELDS.map((field) => [
    field,
    records.reduce((sum, record) => addNullable(sum, record.costTotals[field]), null as number | null),
  ])) as Record<(typeof TOKEN_USAGE_COST_FIELDS)[number], number | null>;
  let pricing = emptyTokenUsagePricingSummary();
  let runtimeKinds = unknownDistinctValue<string>();
  let modelIdentifiers = unknownDistinctValue<string>();
  let modelProviders = unknownDistinctValue<string>();
  for (const record of records) {
    pricing = mergeTokenUsagePricingSummaries(pricing, record.pricingSummary);
    runtimeKinds = mergeDistinctValue(runtimeKinds, record.identitySummary.runtimeKinds);
    modelIdentifiers = mergeDistinctValue(
      modelIdentifiers,
      record.identitySummary.modelIdentifiers.status === "unknown"
        ? record.identitySummary.modelValues
        : record.identitySummary.modelIdentifiers,
    );
    modelProviders = mergeDistinctValue(modelProviders, record.identitySummary.modelProviders);
  }
  const mixedCurrency = pricing.currencies.status === "mixed";
  const latest = latestRecord(records);
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
    cache_state: summarizeCacheState(records.map((record) => record.cacheState)),
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
      ? pricing.apiCostStatuses.value as TokenUsageCostSummaryAggregate["api_cost_status"]
      : pricing.apiCostStatuses.status === "mixed" ? "mixed" : "price_missing",
    missing_price_dimensions: pricing.missingPriceDimensions,
    pricing_policy_key: distinctValueOrNull(pricing.pricingPolicyKeys),
    selected_pricing_tier_id: distinctValueOrNull(pricing.selectedPricingTierIds),
    unit_prices: pricing.unitPrices,
    usage_report_count: safeNumber(records.reduce((sum, record) => sum + record.usageReportCount, 0n), "usage_report_count"),
    updated_at: latest?.latestObservedAt.toISOString() ?? null,
    observed_runtime_kinds: runtimeKinds.status === "unknown" ? [] : [distinctValueLabel(runtimeKinds)],
    observed_model_identifiers: modelIdentifiers.status === "unknown" ? [] : [distinctValueLabel(modelIdentifiers)],
    observed_model_providers: modelProviders.status === "unknown" ? [] : [distinctValueLabel(modelProviders)],
  };
};

export const buildTokenUsageRunSummaryFromRecords = (input: {
  runId: string;
  records: readonly TokenUsageRunRecord[];
}): TokenUsageRunSummaryPayload => {
  const aggregate = buildTokenUsageRunAggregate(input.records);
  const latest = latestRecord(input.records);
  return {
    run_id: input.runId,
    root_team_run_id: latest?.rootTeamRunId ?? null,
    agent_definition_id: latest?.agentDefinitionId ?? null,
    workspace_id: latest?.workspaceId ?? null,
    ...aggregate,
    latest_prompt_tokens: latest?.latestPromptTokens === null || latest?.latestPromptTokens === undefined
      ? null : safeNumber(latest.latestPromptTokens, "latest_prompt_tokens"),
    effective_context_window_tokens: latest?.effectiveContextWindowTokens === null || latest?.effectiveContextWindowTokens === undefined
      ? null : safeNumber(latest.effectiveContextWindowTokens, "effective_context_window_tokens"),
    context_window_usage_percent: latest?.contextWindowUsagePercent ?? null,
    latest_model_provider: latest?.latestModelProvider ?? null,
    latest_model_identifier: latest?.latestModelIdentifier ?? null,
    latest_runtime_kind: latest?.latestRuntimeKind ?? null,
  };
};

export const mergePricingSummariesForRecords = (
  records: readonly TokenUsageRunRecord[],
): TokenUsagePricingSummary => records.reduce(
  (summary, record) => mergeTokenUsagePricingSummaries(summary, record.pricingSummary),
  emptyTokenUsagePricingSummary(),
);

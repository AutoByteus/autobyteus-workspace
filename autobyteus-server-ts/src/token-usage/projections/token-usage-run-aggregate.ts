import type { TokenUsageRunSummaryPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import { distinctValueLabel } from "../domain/token-usage-distinct-value-summary.js";
import type {
  TokenUsageAccountingSummarySource,
  TokenUsagePricingSummary,
} from "../domain/token-usage-accounting-summary.js";
import type { TokenUsageRunRecord } from "../domain/token-usage-run-record.js";
import { compareAdmissionMarkers } from "../domain/token-usage-snapshot-checkpoint.js";
import {
  buildTokenUsageCostSummaryAggregate,
  tokenUsageSafeNumber,
  TokenUsageSafeIntegerExceededError,
  type TokenUsageCostSummaryAggregate,
} from "./token-usage-cost-summary-aggregate.js";
import {
  emptyTokenUsagePricingSummary,
  mergeTokenUsagePricingSummaries,
} from "./token-usage-pricing-summary.js";

export { TokenUsageSafeIntegerExceededError };

const distinctValues = (summary: TokenUsageRunRecord["identitySummary"][keyof TokenUsageRunRecord["identitySummary"]]): string[] =>
  summary.status === "unknown" ? [] : [distinctValueLabel(summary)];

const asAggregateSource = (record: TokenUsageRunRecord): TokenUsageAccountingSummarySource => ({
  tokenTotals: record.tokenTotals,
  costTotals: record.costTotals,
  cacheState: record.cacheState,
  pricingSummary: record.pricingSummary,
  usageReportCount: record.usageReportCount,
  latestObservedAt: record.latestObservedAt,
  observedRuntimeKinds: distinctValues(record.identitySummary.runtimeKinds),
  observedModelProviders: distinctValues(record.identitySummary.modelProviders),
  observedModelIdentifiers: record.identitySummary.modelIdentifiers.status === "unknown"
    ? distinctValues(record.identitySummary.modelValues)
    : distinctValues(record.identitySummary.modelIdentifiers),
});

const latestRecord = (records: readonly TokenUsageRunRecord[]): TokenUsageRunRecord | null =>
  records.reduce<TokenUsageRunRecord | null>((latest, record) => (
    !latest || compareAdmissionMarkers(record.latestObservation, latest.latestObservation) > 0 ? record : latest
  ), null);

export const buildTokenUsageRunAggregate = (
  records: readonly TokenUsageRunRecord[],
): TokenUsageCostSummaryAggregate => buildTokenUsageCostSummaryAggregate(records.map(asAggregateSource));

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
    gross_input_tokens: aggregate.gross_input_tokens,
    standard_input_tokens: aggregate.standard_input_tokens,
    cache_miss_input_tokens: aggregate.cache_miss_input_tokens,
    cache_read_input_tokens: aggregate.cache_read_input_tokens,
    cache_creation_input_tokens: aggregate.cache_creation_input_tokens,
    cache_creation_5m_input_tokens: aggregate.cache_creation_5m_input_tokens,
    cache_creation_1h_input_tokens: aggregate.cache_creation_1h_input_tokens,
    output_tokens: aggregate.output_tokens,
    reasoning_output_tokens: aggregate.reasoning_output_tokens,
    billable_output_tokens: aggregate.billable_output_tokens,
    total_tokens: aggregate.total_tokens,
    cache_read_input_token_rate: aggregate.cache_read_input_token_rate,
    standard_input_token_rate: aggregate.standard_input_token_rate,
    cache_creation_input_token_rate: aggregate.cache_creation_input_token_rate,
    cache_state: aggregate.cache_state,
    estimated_api_input_cost: aggregate.estimated_api_input_cost,
    estimated_api_standard_input_cost: aggregate.estimated_api_standard_input_cost,
    estimated_api_cache_read_input_cost: aggregate.estimated_api_cache_read_input_cost,
    estimated_api_cache_creation_input_cost: aggregate.estimated_api_cache_creation_input_cost,
    estimated_api_cache_creation_5m_input_cost: aggregate.estimated_api_cache_creation_5m_input_cost,
    estimated_api_cache_creation_1h_input_cost: aggregate.estimated_api_cache_creation_1h_input_cost,
    estimated_api_output_cost: aggregate.estimated_api_output_cost,
    estimated_api_reasoning_output_cost: aggregate.estimated_api_reasoning_output_cost,
    estimated_api_total_cost: aggregate.estimated_api_total_cost,
    currency: aggregate.currency,
    api_cost_status: aggregate.api_cost_status,
    missing_price_dimensions: aggregate.missing_price_dimensions,
    pricing_policy_key: aggregate.pricing_policy_key,
    selected_pricing_tier_id: aggregate.selected_pricing_tier_id,
    unit_prices: aggregate.unit_prices,
    usage_report_count: aggregate.usage_report_count,
    updated_at: aggregate.updated_at,
    latest_prompt_tokens: latest?.latestPromptTokens == null ? null : tokenUsageSafeNumber(latest.latestPromptTokens, "latest_prompt_tokens"),
    effective_context_window_tokens: latest?.effectiveContextWindowTokens == null
      ? null : tokenUsageSafeNumber(latest.effectiveContextWindowTokens, "effective_context_window_tokens"),
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

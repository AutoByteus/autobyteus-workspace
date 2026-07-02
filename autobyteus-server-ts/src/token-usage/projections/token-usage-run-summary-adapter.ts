import type {
  TokenUsageRunSummaryPayload,
  TokenUsageUpdatedPayload,
} from "../../agent-execution/domain/agent-run-token-usage.js";
import { buildTokenUsageCostSummaryAggregate } from "./token-usage-cost-summary-aggregate.js";

export interface BuildTokenUsageRunSummaryInput {
  runId: string;
  events: TokenUsageUpdatedPayload[];
  rootTeamRunIdOverride?: string | null;
}

const latestEvent = (events: TokenUsageUpdatedPayload[]): TokenUsageUpdatedPayload | null => (
  events.reduce<TokenUsageUpdatedPayload | null>((latest, event) => {
    if (!latest) return event;
    return event.observed_at.localeCompare(latest.observed_at) >= 0 ? event : latest;
  }, null)
);

export const buildTokenUsageRunSummary = (
  input: BuildTokenUsageRunSummaryInput,
): TokenUsageRunSummaryPayload => {
  const latest = latestEvent(input.events);
  const aggregate = buildTokenUsageCostSummaryAggregate(input.events);

  return {
    run_id: input.runId,
    root_team_run_id: input.rootTeamRunIdOverride ?? latest?.root_team_run_id ?? null,
    team_run_path: latest?.team_run_path ?? null,
    member_agent_run_id: latest?.member_agent_run_id ?? null,
    member_path: latest?.member_path ?? null,
    member_route_key: latest?.member_route_key ?? null,
    agent_definition_id: latest?.agent_definition_id ?? null,
    workspace_id: latest?.workspace_id ?? null,
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
    latest_prompt_tokens: latest?.latest_prompt_tokens ?? null,
    effective_context_window_tokens: latest?.effective_context_window_tokens ?? null,
    context_window_usage_percent: latest?.context_window_usage_percent ?? null,
    latest_model_provider: latest?.model_provider ?? null,
    latest_model_identifier: latest?.model_identifier ?? null,
    latest_runtime_kind: latest?.runtime_kind ?? null,
    usage_report_count: aggregate.usage_report_count,
    updated_at: aggregate.updated_at,
  };
};

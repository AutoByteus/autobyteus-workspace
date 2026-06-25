import type {
  TokenUsageApiCostStatus,
  TokenUsageRunSummaryPayload,
  TokenUsageUpdatedPayload,
} from "../../agent-execution/domain/agent-run-token-usage.js";
import { summarizeCacheState } from "../domain/token-usage-component-basis.js";
import { SqlTokenUsageLedgerRepository } from "../repositories/sql/token-usage-ledger-repository.js";

const add = (a: number, b: number | null): number => a + (b ?? 0);
const addNullableCost = (a: number | null, b: number | null): number | null => {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
};

const summarizeCostStatus = (statuses: string[]): TokenUsageApiCostStatus => {
  const relevant = statuses.filter(Boolean);
  if (relevant.length === 0) return "price_missing";
  const unique = new Set(relevant);
  if (unique.size === 1) return relevant[0] as TokenUsageApiCostStatus;
  return "mixed";
};

const currencySummary = (events: TokenUsageUpdatedPayload[]): { currency: string | null; mixed: boolean } => {
  const currencies = Array.from(new Set(events.map((event) => event.currency).filter((value): value is string => Boolean(value))));
  if (currencies.length > 1) return { currency: null, mixed: true };
  return { currency: currencies[0] ?? null, mixed: false };
};

const sumCost = (
  events: TokenUsageUpdatedPayload[],
  select: (event: TokenUsageUpdatedPayload) => number | null,
): number | null => events.reduce((sum, event) => addNullableCost(sum, select(event)), null as number | null);

const rate = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? numerator / denominator : null;

const uniqueStrings = (values: Array<string | null | undefined>): string[] =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();

export class TokenUsageLedgerStore {
  constructor(private readonly repository = new SqlTokenUsageLedgerRepository()) {}

  async appendTokenUsageEvent(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    return this.repository.appendUsageEvent(payload);
  }

  async getLatestCumulativeSnapshot(input: {
    runId: string;
    snapshotSeriesKey: string;
  }): Promise<TokenUsageUpdatedPayload | null> {
    return this.repository.findLatestCumulativeSnapshot(input);
  }

  async getAgentRunSummary(runId: string): Promise<TokenUsageRunSummaryPayload> {
    const events = await this.repository.listEventsByRunId(runId);
    return this.buildSummary(runId, events);
  }

  async getTeamRunSummary(rootTeamRunId: string): Promise<TokenUsageRunSummaryPayload> {
    const events = await this.repository.listEventsByTeamRunId(rootTeamRunId);
    return this.buildSummary(events[0]?.run_id ?? rootTeamRunId, events, rootTeamRunId);
  }

  async getTeamMemberSummary(input: {
    rootTeamRunId: string;
    memberAgentRunId?: string | null;
    memberRouteKey?: string | null;
  }): Promise<TokenUsageRunSummaryPayload> {
    const events = (await this.repository.listEventsByTeamRunId(input.rootTeamRunId)).filter((event) => {
      if (input.memberAgentRunId && event.member_agent_run_id !== input.memberAgentRunId) return false;
      if (input.memberRouteKey && event.member_route_key !== input.memberRouteKey) return false;
      return true;
    });
    return this.buildSummary(events[0]?.run_id ?? input.memberAgentRunId ?? input.rootTeamRunId, events, input.rootTeamRunId);
  }

  async listEventsInPeriod(startDate: Date, endDate: Date): Promise<TokenUsageUpdatedPayload[]> {
    return this.repository.listEventsInPeriod({ startDate, endDate });
  }

  private buildSummary(
    runId: string,
    events: TokenUsageUpdatedPayload[],
    rootTeamRunIdOverride?: string | null,
  ): TokenUsageRunSummaryPayload {
    const latest = events.at(-1) ?? null;
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
    const costStatus = mixed ? "mixed" : summarizeCostStatus(events.map((event) => event.api_cost_status));

    return {
      run_id: runId,
      root_team_run_id: rootTeamRunIdOverride ?? latest?.root_team_run_id ?? null,
      team_run_path: latest?.team_run_path ?? null,
      member_agent_run_id: latest?.member_agent_run_id ?? null,
      member_path: latest?.member_path ?? null,
      member_route_key: latest?.member_route_key ?? null,
      agent_definition_id: latest?.agent_definition_id ?? null,
      workspace_id: latest?.workspace_id ?? null,
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
      api_cost_status: costStatus,
      missing_price_dimensions: uniqueStrings(events.flatMap((event) => event.missing_price_dimensions)),
      pricing_policy_key: uniqueStrings(events.map((event) => event.pricing_policy_key)).length === 1
        ? uniqueStrings(events.map((event) => event.pricing_policy_key))[0] ?? null
        : null,
      selected_pricing_tier_id: uniqueStrings(events.map((event) => event.selected_pricing_tier_id)).length === 1
        ? uniqueStrings(events.map((event) => event.selected_pricing_tier_id))[0] ?? null
        : null,
      latest_prompt_tokens: latest?.latest_prompt_tokens ?? null,
      effective_context_window_tokens: latest?.effective_context_window_tokens ?? null,
      context_window_usage_percent: latest?.context_window_usage_percent ?? null,
      latest_model_provider: latest?.model_provider ?? null,
      latest_model_identifier: latest?.model_identifier ?? null,
      latest_runtime_kind: latest?.runtime_kind ?? null,
      usage_report_count: events.length,
      updated_at: latest?.observed_at ?? null,
    };
  }
}

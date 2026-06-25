import type {
  TokenUsageApiCostStatus,
  TokenUsageRunSummaryPayload,
  TokenUsageUpdatedPayload,
} from "../../agent-execution/domain/agent-run-token-usage.js";
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
    const inputTokens = events.reduce((sum, event) => add(sum, event.accounting_input_tokens), 0);
    const outputTokens = events.reduce((sum, event) => add(sum, event.accounting_output_tokens), 0);
    const totalTokens = events.reduce((sum, event) => add(sum, event.accounting_total_tokens), 0);
    const inputCost = events.reduce((sum, event) => addNullableCost(sum, event.estimated_api_input_cost), null as number | null);
    const outputCost = events.reduce((sum, event) => addNullableCost(sum, event.estimated_api_output_cost), null as number | null);
    const totalCost = events.reduce((sum, event) => addNullableCost(sum, event.estimated_api_total_cost), null as number | null);
    return {
      run_id: runId,
      root_team_run_id: rootTeamRunIdOverride ?? latest?.root_team_run_id ?? null,
      team_run_path: latest?.team_run_path ?? null,
      member_agent_run_id: latest?.member_agent_run_id ?? null,
      member_path: latest?.member_path ?? null,
      member_route_key: latest?.member_route_key ?? null,
      agent_definition_id: latest?.agent_definition_id ?? null,
      workspace_id: latest?.workspace_id ?? null,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      estimated_api_input_cost: inputCost,
      estimated_api_output_cost: outputCost,
      estimated_api_total_cost: totalCost,
      currency: latest?.currency ?? null,
      api_cost_status: summarizeCostStatus(events.map((event) => event.api_cost_status)),
      latest_context_input_tokens: latest?.latest_context_input_tokens ?? null,
      effective_context_budget_tokens: latest?.effective_context_budget_tokens ?? null,
      context_pressure_percent: latest?.context_pressure_percent ?? null,
      latest_model_provider: latest?.model_provider ?? null,
      latest_model_identifier: latest?.model_identifier ?? null,
      latest_runtime_kind: latest?.runtime_kind ?? null,
      event_count: events.length,
      updated_at: latest?.observed_at ?? null,
    };
  }
}

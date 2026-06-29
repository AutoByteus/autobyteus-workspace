import type {
  TokenUsageRunSummaryPayload,
  TokenUsageUpdatedPayload,
} from "../../agent-execution/domain/agent-run-token-usage.js";
import { buildTokenUsageRunSummary } from "../projections/token-usage-run-summary-adapter.js";
import { SqlTokenUsageLedgerRepository } from "../repositories/sql/token-usage-ledger-repository.js";

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
    return buildTokenUsageRunSummary({ runId, events });
  }

  async getTeamRunSummary(rootTeamRunId: string): Promise<TokenUsageRunSummaryPayload> {
    const events = await this.repository.listEventsByTeamRunId(rootTeamRunId);
    return buildTokenUsageRunSummary({
      runId: events[0]?.run_id ?? rootTeamRunId,
      events,
      rootTeamRunIdOverride: rootTeamRunId,
    });
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
    return buildTokenUsageRunSummary({
      runId: events[0]?.run_id ?? input.memberAgentRunId ?? input.rootTeamRunId,
      events,
      rootTeamRunIdOverride: input.rootTeamRunId,
    });
  }

  async listEventsInPeriod(startDate: Date, endDate: Date): Promise<TokenUsageUpdatedPayload[]> {
    return this.repository.listEventsInPeriod({ startDate, endDate });
  }
}

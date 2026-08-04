import type {
  TokenUsageRunSummaryPayload,
  TokenUsageUpdatedPayload,
} from "../../agent-execution/domain/agent-run-token-usage.js";
import { buildTokenUsageRunSummary } from "../projections/token-usage-run-summary-adapter.js";
import { SqlTokenUsageLedgerRepository } from "../repositories/sql/token-usage-ledger-repository.js";
import { TokenUsageDisplayFieldCapturer } from "./token-usage-display-field-capturer.js";
import type { TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";
import { serializeTeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";

const hasMissingDisplayField = (event: TokenUsageUpdatedPayload): boolean => (
  event.root_team_run_id
    ? !event.team_name ||
      !event.run_created_at ||
      Boolean(event.execution_address && !event.member_display_name)
    : !event.agent_name || !event.run_created_at
);

const hasDisplayFieldChange = (
  original: TokenUsageUpdatedPayload,
  captured: TokenUsageUpdatedPayload,
): boolean => (
  original.team_name !== captured.team_name ||
  original.agent_name !== captured.agent_name ||
  original.run_summary !== captured.run_summary ||
  original.run_created_at !== captured.run_created_at ||
  original.member_display_name !== captured.member_display_name
);

export class TokenUsageLedgerStore {
  constructor(
    private readonly repository = new SqlTokenUsageLedgerRepository(),
    private readonly displayFieldCapturer = new TokenUsageDisplayFieldCapturer(),
  ) {}

  async appendTokenUsageEvent(payload: TokenUsageUpdatedPayload): Promise<TokenUsageUpdatedPayload> {
    const capturedPayload = await this.displayFieldCapturer.capture(payload);
    return this.repository.appendUsageEvent(capturedPayload);
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
    executionAddress: TeamExecutionAddress;
  }): Promise<TokenUsageRunSummaryPayload> {
    const events = (await this.repository.listEventsByTeamRunId(input.rootTeamRunId)).filter((event) => {
      return !!event.execution_address &&
        serializeTeamExecutionAddress(event.execution_address) === serializeTeamExecutionAddress(input.executionAddress);
    });
    return buildTokenUsageRunSummary({
      runId: events[0]?.run_id ?? input.rootTeamRunId,
      events,
      rootTeamRunIdOverride: input.rootTeamRunId,
    });
  }

  async listEventsInPeriod(startDate: Date, endDate: Date): Promise<TokenUsageUpdatedPayload[]> {
    const events = await this.repository.listEventsInPeriod({ startDate, endDate });
    return this.backfillMissingDisplayFields(events);
  }

  private async backfillMissingDisplayFields(
    events: TokenUsageUpdatedPayload[],
  ): Promise<TokenUsageUpdatedPayload[]> {
    const backfilledEvents: TokenUsageUpdatedPayload[] = [];
    for (const event of events) {
      if (!hasMissingDisplayField(event)) {
        backfilledEvents.push(event);
        continue;
      }
      try {
        const captured = await this.displayFieldCapturer.capture(event);
        if (!hasDisplayFieldChange(event, captured)) {
          backfilledEvents.push(event);
          continue;
        }
        backfilledEvents.push(await this.repository.updateUsageEventDisplayFields(captured));
      } catch (error) {
        console.warn("Failed to backfill token usage display fields:", error);
        backfilledEvents.push(event);
      }
    }
    return backfilledEvents;
  }
}

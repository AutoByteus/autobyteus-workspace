import type {
  TokenUsageRunSummaryPayload,
  TokenUsageUpdatedPayload,
} from "../../agent-execution/domain/agent-run-token-usage.js";
import { buildTokenUsageRunSummary } from "../projections/token-usage-run-summary-adapter.js";
import { SqlTokenUsageLedgerRepository } from "../repositories/sql/token-usage-ledger-repository.js";
import { TokenUsageDisplayFieldCapturer } from "./token-usage-display-field-capturer.js";
import {
  TokenUsageTeamRunV1MigrationRepository,
  type TokenUsageRuntimeSchemaSnapshot,
  type TokenUsageTeamRunV1ApplyResult,
  type TokenUsageTeamRunV1RootUpdate,
} from "../repositories/sql/token-usage-team-run-v1-migration-repository.js";

const hasMissingDisplayField = (event: TokenUsageUpdatedPayload): boolean => (
  event.root_team_run_id
    ? !event.team_name ||
      !event.run_created_at ||
      Boolean(event.root_team_run_id && !event.member_display_name)
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
    private readonly teamRunV1Migration = new TokenUsageTeamRunV1MigrationRepository(),
  ) {}

  inspectTeamRunV1Migration(): Promise<TokenUsageRuntimeSchemaSnapshot> {
    return this.teamRunV1Migration.inspectRuntimeSchemaAndEvidence();
  }

  applyTeamRunV1RootUpdates(
    updates: readonly TokenUsageTeamRunV1RootUpdate[],
    snapshot: TokenUsageRuntimeSchemaSnapshot,
  ): Promise<TokenUsageTeamRunV1ApplyResult> {
    return this.teamRunV1Migration.applyResolvedRootUpdates(updates, snapshot);
  }

  disconnectTeamRunV1Migration(): Promise<void> {
    return this.teamRunV1Migration.disconnect();
  }

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
    });
  }

  async getTeamMemberSummary(input: {
    rootTeamRunId: string;
    agentRunId: string;
  }): Promise<TokenUsageRunSummaryPayload> {
    const events = (await this.repository.listEventsByTeamRunId(input.rootTeamRunId))
      .filter((event) => event.run_id === input.agentRunId);
    return buildTokenUsageRunSummary({
      runId: input.agentRunId,
      events,
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

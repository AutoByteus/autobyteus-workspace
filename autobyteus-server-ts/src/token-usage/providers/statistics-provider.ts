import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import type {
  TokenUsageRuntimeModelStatisticsRow,
  TokenUsageTaskMemberStatisticsRow,
  TokenUsageTaskStatisticsResult,
  TokenUsageTaskStatisticsRow,
} from "../domain/statistics-models.js";
import {
  buildTokenUsageCostSummaryAggregate,
  normalizeTokenUsageModelIdentifier,
  normalizeTokenUsageRuntimeKind,
} from "../projections/token-usage-cost-summary-aggregate.js";
import { TokenUsageRunHistoryEnricher } from "./token-usage-run-history-enricher.js";
import { TokenUsageLedgerStore } from "./token-usage-ledger-store.js";

type EventGroups = Map<string, TokenUsageUpdatedPayload[]>;

const pushGroupedEvent = (
  groups: EventGroups,
  key: string,
  event: TokenUsageUpdatedPayload,
): void => {
  const events = groups.get(key) ?? [];
  events.push(event);
  groups.set(key, events);
};

const firstObservedAt = (events: TokenUsageUpdatedPayload[]): string => (
  events.reduce<string | null>((earliest, event) => {
    if (!earliest) return event.observed_at;
    return event.observed_at.localeCompare(earliest) < 0 ? event.observed_at : earliest;
  }, null) ?? new Date(0).toISOString()
);

const latestEvent = (events: TokenUsageUpdatedPayload[]): TokenUsageUpdatedPayload | null => (
  events.reduce<TokenUsageUpdatedPayload | null>((latest, event) => {
    if (!latest) return event;
    return event.observed_at.localeCompare(latest.observed_at) >= 0 ? event : latest;
  }, null)
);

const memberGroupKey = (event: TokenUsageUpdatedPayload): string => (
  event.member_agent_run_id ?? event.member_route_key ?? event.run_id
);

const sortRowsByCreatedAtDesc = <T extends { createdAt: string; rowId: string }>(rows: T[]): T[] => (
  [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.rowId.localeCompare(b.rowId))
);

export class TokenUsageStatisticsProvider {
  constructor(
    private readonly store = new TokenUsageLedgerStore(),
    private readonly enricher = new TokenUsageRunHistoryEnricher(),
  ) {}

  async getTotalCost(startDate: Date, endDate: Date): Promise<number | null> {
    const records = await this.store.listEventsInPeriod(startDate, endDate);
    return buildTokenUsageCostSummaryAggregate(records).estimated_api_total_cost;
  }

  async getTaskStatisticsInPeriod(
    startDate: Date,
    endDate: Date,
  ): Promise<TokenUsageTaskStatisticsResult> {
    const records = await this.store.listEventsInPeriod(startDate, endDate);
    const teamGroups: EventGroups = new Map();
    const standaloneAgentGroups: EventGroups = new Map();

    for (const record of records) {
      if (record.root_team_run_id) {
        pushGroupedEvent(teamGroups, record.root_team_run_id, record);
      } else {
        pushGroupedEvent(standaloneAgentGroups, record.run_id, record);
      }
    }

    const rows = await Promise.all([
      ...Array.from(teamGroups.entries()).map(([teamRunId, events]) => this.buildTeamRow(teamRunId, events)),
      ...Array.from(standaloneAgentGroups.entries()).map(([runId, events]) => this.buildStandaloneAgentRow(runId, events)),
    ]);

    return { rows: sortRowsByCreatedAtDesc(rows) };
  }

  async getStatisticsPerRuntimeModel(
    startDate: Date,
    endDate: Date,
  ): Promise<TokenUsageRuntimeModelStatisticsRow[]> {
    const records = await this.store.listEventsInPeriod(startDate, endDate);
    const groups: EventGroups = new Map();

    for (const record of records) {
      const runtimeKind = normalizeTokenUsageRuntimeKind(record.runtime_kind);
      const modelIdentifier = normalizeTokenUsageModelIdentifier(record);
      pushGroupedEvent(groups, `${runtimeKind}\u0000${modelIdentifier}`, record);
    }

    return Array.from(groups.entries()).map(([key, events]) => {
      const [runtimeKind = "Unknown", modelIdentifier = "Unknown"] = key.split("\u0000");
      return {
        rowId: `runtime-model:${runtimeKind}:${modelIdentifier}`,
        runtimeKind,
        modelIdentifier,
        aggregate: buildTokenUsageCostSummaryAggregate(events),
      };
    }).sort((a, b) => (
      (b.aggregate.estimated_api_total_cost ?? -1) - (a.aggregate.estimated_api_total_cost ?? -1) ||
      a.runtimeKind.localeCompare(b.runtimeKind) ||
      a.modelIdentifier.localeCompare(b.modelIdentifier)
    ));
  }

  private async buildStandaloneAgentRow(
    runId: string,
    events: TokenUsageUpdatedPayload[],
  ): Promise<TokenUsageTaskStatisticsRow> {
    const aggregate = buildTokenUsageCostSummaryAggregate(events);
    const latest = latestEvent(events);
    const metadata = await this.enricher.enrichAgentRun({
      runId,
      firstObservedAt: firstObservedAt(events),
      fallbackAgentDefinitionId: latest?.agent_definition_id ?? null,
      fallbackWorkspaceId: latest?.workspace_id ?? null,
    });

    return {
      rowId: `agent:${runId}`,
      rowKind: "AGENT_RUN",
      runId,
      rootTeamRunId: null,
      ...metadata,
      models: aggregate.observed_model_identifiers,
      runtimeKinds: aggregate.observed_runtime_kinds,
      aggregate,
      members: [],
    };
  }

  private async buildTeamRow(
    teamRunId: string,
    events: TokenUsageUpdatedPayload[],
  ): Promise<TokenUsageTaskStatisticsRow> {
    const aggregate = buildTokenUsageCostSummaryAggregate(events);
    const metadata = await this.enricher.enrichTeamRun({
      teamRunId,
      firstObservedAt: firstObservedAt(events),
    });
    const memberGroups = new Map<string, TokenUsageUpdatedPayload[]>();
    for (const event of events) {
      pushGroupedEvent(memberGroups, memberGroupKey(event), event);
    }
    const members = await Promise.all(
      Array.from(memberGroups.entries()).map(([key, memberEvents]) => this.buildTeamMemberRow(teamRunId, key, memberEvents)),
    );

    return {
      rowId: `team:${teamRunId}`,
      rowKind: "TEAM_RUN",
      runId: null,
      rootTeamRunId: teamRunId,
      ...metadata,
      models: aggregate.observed_model_identifiers,
      runtimeKinds: aggregate.observed_runtime_kinds,
      aggregate,
      members: sortRowsByCreatedAtDesc(members),
    };
  }

  private async buildTeamMemberRow(
    teamRunId: string,
    groupKey: string,
    events: TokenUsageUpdatedPayload[],
  ): Promise<TokenUsageTaskMemberStatisticsRow> {
    const aggregate = buildTokenUsageCostSummaryAggregate(events);
    const latest = latestEvent(events);
    const metadata = await this.enricher.enrichMember({
      rootTeamRunId: teamRunId,
      memberAgentRunId: latest?.member_agent_run_id ?? latest?.run_id ?? null,
      memberRouteKey: latest?.member_route_key ?? null,
      memberPath: latest?.member_path ?? null,
      fallbackAgentDefinitionId: latest?.agent_definition_id ?? null,
      firstObservedAt: firstObservedAt(events),
    });

    return {
      rowId: `team:${teamRunId}:member:${groupKey}`,
      memberRouteKey: latest?.member_route_key ?? null,
      memberAgentRunId: latest?.member_agent_run_id ?? latest?.run_id ?? null,
      ...metadata,
      models: aggregate.observed_model_identifiers,
      runtimeKinds: aggregate.observed_runtime_kinds,
      aggregate,
    };
  }
}

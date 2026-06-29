import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import type {
  TokenUsageCreatedTimeSource,
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
import { TokenUsageLedgerStore } from "./token-usage-ledger-store.js";

type EventGroups = Map<string, TokenUsageUpdatedPayload[]>;

const UNKNOWN_AGENT_LABEL = "Unknown agent run";
const UNKNOWN_TEAM_LABEL = "Unknown team run";
const UNKNOWN_MEMBER_LABEL = "Unknown member";

const pushGroupedEvent = (
  groups: EventGroups,
  key: string,
  event: TokenUsageUpdatedPayload,
): void => {
  const events = groups.get(key) ?? [];
  events.push(event);
  groups.set(key, events);
};

const compactOptional = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const orderedEvents = (events: TokenUsageUpdatedPayload[]): TokenUsageUpdatedPayload[] => (
  [...events].sort((a, b) => a.observed_at.localeCompare(b.observed_at) || a.usage_event_id.localeCompare(b.usage_event_id))
);

const firstObservedAt = (events: TokenUsageUpdatedPayload[]): string => (
  orderedEvents(events)[0]?.observed_at ?? new Date(0).toISOString()
);

const latestEvent = (events: TokenUsageUpdatedPayload[]): TokenUsageUpdatedPayload | null => (
  events.reduce<TokenUsageUpdatedPayload | null>((latest, event) => {
    if (!latest) return event;
    return event.observed_at.localeCompare(latest.observed_at) >= 0 ? event : latest;
  }, null)
);

const firstNonEmptyDisplayValue = (
  events: TokenUsageUpdatedPayload[],
  select: (event: TokenUsageUpdatedPayload) => string | null | undefined,
): string | null => {
  for (const event of orderedEvents(events)) {
    const value = compactOptional(select(event));
    if (value) return value;
  }
  return null;
};

const normalizeIsoDateString = (value: string | null | undefined): string | null => {
  const normalized = compactOptional(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const capturedRunCreatedAt = (events: TokenUsageUpdatedPayload[]): string | null => {
  for (const event of orderedEvents(events)) {
    const createdAt = normalizeIsoDateString(event.run_created_at);
    if (createdAt) return createdAt;
  }
  return null;
};

const runCreatedMetadata = (events: TokenUsageUpdatedPayload[]): {
  createdAt: string;
  createdTimeSource: TokenUsageCreatedTimeSource;
} => {
  const runCreatedAt = capturedRunCreatedAt(events);
  return runCreatedAt
    ? { createdAt: runCreatedAt, createdTimeSource: "RUN_HISTORY" }
    : { createdAt: firstObservedAt(events), createdTimeSource: "FIRST_USAGE_OBSERVED" };
};

const memberGroupKey = (event: TokenUsageUpdatedPayload): string => (
  event.member_agent_run_id ?? event.member_route_key ?? event.run_id
);

const sortRowsByCreatedAtDesc = <T extends { createdAt: string; rowId: string }>(rows: T[]): T[] => (
  [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.rowId.localeCompare(b.rowId))
);

const sortMemberGroupsByFirstObservedDesc = (
  groups: EventGroups,
): Array<[string, TokenUsageUpdatedPayload[]]> => (
  Array.from(groups.entries()).sort(([keyA, eventsA], [keyB, eventsB]) => (
    firstObservedAt(eventsB).localeCompare(firstObservedAt(eventsA)) || keyA.localeCompare(keyB)
  ))
);

export class TokenUsageStatisticsProvider {
  constructor(private readonly store = new TokenUsageLedgerStore()) {}

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

    const rows = [
      ...Array.from(teamGroups.entries()).map(([teamRunId, events]) => this.buildTeamRow(teamRunId, events)),
      ...Array.from(standaloneAgentGroups.entries()).map(([runId, events]) => this.buildStandaloneAgentRow(runId, events)),
    ];

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

  private buildStandaloneAgentRow(
    runId: string,
    events: TokenUsageUpdatedPayload[],
  ): TokenUsageTaskStatisticsRow {
    const aggregate = buildTokenUsageCostSummaryAggregate(events);
    const latest = latestEvent(events);

    return {
      rowId: `agent:${runId}`,
      rowKind: "AGENT_RUN",
      runId,
      rootTeamRunId: null,
      displayName: firstNonEmptyDisplayValue(events, (event) => event.agent_name) ??
        latest?.agent_definition_id ??
        UNKNOWN_AGENT_LABEL,
      summary: firstNonEmptyDisplayValue(events, (event) => event.run_summary),
      ...runCreatedMetadata(events),
      models: aggregate.observed_model_identifiers,
      runtimeKinds: aggregate.observed_runtime_kinds,
      aggregate,
      members: [],
    };
  }

  private buildTeamRow(
    teamRunId: string,
    events: TokenUsageUpdatedPayload[],
  ): TokenUsageTaskStatisticsRow {
    const aggregate = buildTokenUsageCostSummaryAggregate(events);
    const memberGroups = new Map<string, TokenUsageUpdatedPayload[]>();
    for (const event of events) {
      pushGroupedEvent(memberGroups, memberGroupKey(event), event);
    }
    const members = sortMemberGroupsByFirstObservedDesc(memberGroups)
      .map(([key, memberEvents]) => this.buildTeamMemberRow(teamRunId, key, memberEvents));

    return {
      rowId: `team:${teamRunId}`,
      rowKind: "TEAM_RUN",
      runId: null,
      rootTeamRunId: teamRunId,
      displayName: firstNonEmptyDisplayValue(events, (event) => event.team_name) ?? UNKNOWN_TEAM_LABEL,
      summary: firstNonEmptyDisplayValue(events, (event) => event.run_summary),
      ...runCreatedMetadata(events),
      models: aggregate.observed_model_identifiers,
      runtimeKinds: aggregate.observed_runtime_kinds,
      aggregate,
      members,
    };
  }

  private buildTeamMemberRow(
    teamRunId: string,
    groupKey: string,
    events: TokenUsageUpdatedPayload[],
  ): TokenUsageTaskMemberStatisticsRow {
    const aggregate = buildTokenUsageCostSummaryAggregate(events);
    const latest = latestEvent(events);
    const memberName = firstNonEmptyDisplayValue(events, (event) => event.member_name) ??
      latest?.member_route_key ??
      latest?.member_agent_run_id ??
      latest?.run_id ??
      UNKNOWN_MEMBER_LABEL;

    return {
      rowId: `team:${teamRunId}:member:${groupKey}`,
      memberRouteKey: latest?.member_route_key ?? null,
      memberAgentRunId: latest?.member_agent_run_id ?? null,
      memberName,
      memberPath: latest?.member_path ?? [],
      models: aggregate.observed_model_identifiers,
      runtimeKinds: aggregate.observed_runtime_kinds,
      aggregate,
    };
  }
}

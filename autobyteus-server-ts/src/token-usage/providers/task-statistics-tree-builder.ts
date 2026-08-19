import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import type { TokenUsageCreatedTimeSource, TokenUsageTaskStatisticsRow } from "../domain/statistics-models.js";
import { buildTokenUsageModelDisplayEntries, EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT, type TokenUsageModelDisplayContext } from "../projections/token-usage-model-display-projection.js";
import { buildTokenUsageCostSummaryAggregate } from "../projections/token-usage-cost-summary-aggregate.js";

type EventGroups = Map<string, TokenUsageUpdatedPayload[]>;
const UNKNOWN_AGENT_LABEL = "Unknown agent run";
const UNKNOWN_TEAM_LABEL = "Unknown team run";
const compact = (value: string | null | undefined): string | null => value?.trim() || null;
const ordered = (events: TokenUsageUpdatedPayload[]) => [...events].sort((a, b) => a.observed_at.localeCompare(b.observed_at) || a.usage_event_id.localeCompare(b.usage_event_id));
const first = (events: TokenUsageUpdatedPayload[], pick: (event: TokenUsageUpdatedPayload) => string | null | undefined) => {
  for (const event of ordered(events)) { const value = compact(pick(event)); if (value) return value; }
  return null;
};
const push = (groups: EventGroups, key: string, event: TokenUsageUpdatedPayload) => groups.set(key, [...(groups.get(key) ?? []), event]);
const created = (events: TokenUsageUpdatedPayload[]): { createdAt: string; createdTimeSource: TokenUsageCreatedTimeSource } => {
  for (const event of ordered(events)) {
    const value = compact(event.run_created_at);
    if (value && !Number.isNaN(new Date(value).getTime())) return { createdAt: new Date(value).toISOString(), createdTimeSource: "RUN_HISTORY" };
  }
  return { createdAt: ordered(events)[0]?.observed_at ?? new Date(0).toISOString(), createdTimeSource: "FIRST_USAGE_OBSERVED" };
};
const sortRows = (rows: TokenUsageTaskStatisticsRow[]) => [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.rowId.localeCompare(b.rowId));
const displayFields = (events: TokenUsageUpdatedPayload[], context: TokenUsageModelDisplayContext) => {
  const entries = buildTokenUsageModelDisplayEntries(events, context);
  return { models: entries.map((entry) => entry.modelIdentifier), modelDisplayNames: entries.map((entry) => entry.modelDisplayName) };
};

/** Token usage groups by exact run IDs only; execution topology remains owned by the Team execution tree. */
export class TokenUsageTaskStatisticsTreeBuilder {
  buildRows(records: TokenUsageUpdatedPayload[], context: TokenUsageModelDisplayContext = EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT): TokenUsageTaskStatisticsRow[] {
    const teams: EventGroups = new Map();
    const standalone: EventGroups = new Map();
    records.forEach((record) => record.root_team_run_id
      ? push(teams, record.root_team_run_id, record)
      : push(standalone, record.run_id, record));
    return sortRows([
      ...[...teams].map(([rootTeamRunId, events]) => this.teamRow(rootTeamRunId, events, context)),
      ...[...standalone].map(([runId, events]) => this.runRow(runId, null, events, context, "AGENT_RUN")),
    ]);
  }

  private teamRow(rootTeamRunId: string, events: TokenUsageUpdatedPayload[], context: TokenUsageModelDisplayContext): TokenUsageTaskStatisticsRow {
    const runs: EventGroups = new Map();
    events.forEach((event) => push(runs, event.run_id, event));
    const aggregate = buildTokenUsageCostSummaryAggregate(events);
    return {
      rowId: `team:${rootTeamRunId}`, rowKind: "TEAM_RUN", runId: null, rootTeamRunId,
      taskId: null, displayName: first(events, (event) => event.team_name) ?? UNKNOWN_TEAM_LABEL,
      summary: first(events, (event) => event.run_summary), ...created(events), ...displayFields(events, context),
      runtimeKinds: aggregate.observed_runtime_kinds, aggregate,
      children: sortRows([...runs].map(([runId, rows]) => this.runRow(runId, rootTeamRunId, rows, context, "MEMBER_RUN"))),
    };
  }

  private runRow(runId: string, rootTeamRunId: string | null, events: TokenUsageUpdatedPayload[], context: TokenUsageModelDisplayContext, rowKind: "AGENT_RUN" | "MEMBER_RUN"): TokenUsageTaskStatisticsRow {
    const aggregate = buildTokenUsageCostSummaryAggregate(events);
    return {
      rowId: rootTeamRunId ? `team:${rootTeamRunId}:agent:${runId}` : `agent:${runId}`,
      rowKind, runId, rootTeamRunId, taskId: first(events, (event) => event.task_id),
      displayName: first(events, (event) => event.member_display_name) ?? first(events, (event) => event.agent_name) ?? latestDefinition(events) ?? UNKNOWN_AGENT_LABEL,
      summary: first(events, (event) => event.run_summary), ...created(events), ...displayFields(events, context),
      runtimeKinds: aggregate.observed_runtime_kinds, aggregate, children: [],
    };
  }
}

const latestDefinition = (events: TokenUsageUpdatedPayload[]): string | null =>
  ordered(events).at(-1)?.agent_definition_id ?? null;

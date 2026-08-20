import type { TokenUsageRunRecord } from "../domain/token-usage-run-record.js";
import type { TokenUsageCreatedTimeSource, TokenUsageTaskStatisticsRow } from "../domain/statistics-models.js";
import { distinctValueLabel } from "../domain/token-usage-distinct-value-summary.js";
import { resolveTokenUsageModelDisplayName, EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT, type TokenUsageModelDisplayContext } from "../projections/token-usage-model-display-projection.js";
import { buildTokenUsageRunAggregate } from "../projections/token-usage-run-aggregate.js";

const UNKNOWN_AGENT_LABEL = "Unknown agent run";
const UNKNOWN_TEAM_LABEL = "Unknown team run";
type RecordGroups = Map<string, TokenUsageRunRecord[]>;
const group = (groups: RecordGroups, key: string, record: TokenUsageRunRecord): void => {
  groups.set(key, [...(groups.get(key) ?? []), record]);
};
const created = (record: TokenUsageRunRecord): { createdAt: string; createdTimeSource: TokenUsageCreatedTimeSource } =>
  record.runCreatedAt
    ? { createdAt: record.runCreatedAt.toISOString(), createdTimeSource: "RUN_HISTORY" }
    : { createdAt: record.firstObservedAt.toISOString(), createdTimeSource: "FIRST_USAGE_OBSERVED" };
const sortRows = (rows: TokenUsageTaskStatisticsRow[]): TokenUsageTaskStatisticsRow[] =>
  [...rows].sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.rowId.localeCompare(right.rowId));
const identity = (record: TokenUsageRunRecord) => ({
  runtime_kind: distinctValueLabel(record.identitySummary.runtimeKinds),
  model_provider: record.identitySummary.modelProviders.status === "single" ? record.identitySummary.modelProviders.value : null,
  provider_name: record.identitySummary.providerNames.status === "single" ? record.identitySummary.providerNames.value : null,
  model_identifier: distinctValueLabel(record.identitySummary.modelIdentifiers.status === "unknown"
    ? record.identitySummary.modelValues
    : record.identitySummary.modelIdentifiers),
  model_value: record.identitySummary.modelValues.status === "single" ? record.identitySummary.modelValues.value : null,
});
const displayFields = (records: TokenUsageRunRecord[], context: TokenUsageModelDisplayContext) => {
  const identities = records.map(identity);
  const models = [...new Set(identities.map((value) => value.model_identifier))].sort();
  const modelDisplayNames = [...new Set(identities.map((value) => resolveTokenUsageModelDisplayName(value, context)))].sort();
  return { models, modelDisplayNames };
};

/** Groups current cumulative records by exact run IDs; execution topology remains owned by TeamRun. */
export class TokenUsageTaskStatisticsTreeBuilder {
  buildRows(records: TokenUsageRunRecord[], context: TokenUsageModelDisplayContext = EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT): TokenUsageTaskStatisticsRow[] {
    const teams: RecordGroups = new Map();
    const standalone: RecordGroups = new Map();
    records.forEach((record) => record.rootTeamRunId
      ? group(teams, record.rootTeamRunId, record)
      : group(standalone, record.runId, record));
    return sortRows([
      ...[...teams].map(([rootTeamRunId, rows]) => this.teamRow(rootTeamRunId, rows, context)),
      ...[...standalone].map(([runId, rows]) => this.runRow(runId, null, rows[0]!, context, "AGENT_RUN")),
    ]);
  }

  private teamRow(rootTeamRunId: string, records: TokenUsageRunRecord[], context: TokenUsageModelDisplayContext): TokenUsageTaskStatisticsRow {
    const first = [...records].sort((left, right) => left.firstObservedAt.getTime() - right.firstObservedAt.getTime())[0]!;
    return {
      rowId: `team:${rootTeamRunId}`,
      rowKind: "TEAM_RUN",
      runId: null,
      rootTeamRunId,
      taskId: null,
      displayName: records.find((record) => record.teamName)?.teamName ?? UNKNOWN_TEAM_LABEL,
      summary: records.find((record) => record.runSummary)?.runSummary ?? null,
      ...created(first),
      ...displayFields(records, context),
      runtimeKinds: buildTokenUsageRunAggregate(records).observed_runtime_kinds,
      aggregate: buildTokenUsageRunAggregate(records),
      children: sortRows(records.map((record) => this.runRow(record.runId, rootTeamRunId, record, context, "MEMBER_RUN"))),
    };
  }

  private runRow(
    runId: string,
    rootTeamRunId: string | null,
    record: TokenUsageRunRecord,
    context: TokenUsageModelDisplayContext,
    rowKind: "AGENT_RUN" | "MEMBER_RUN",
  ): TokenUsageTaskStatisticsRow {
    const aggregate = buildTokenUsageRunAggregate([record]);
    return {
      rowId: rootTeamRunId ? `team:${rootTeamRunId}:agent:${runId}` : `agent:${runId}`,
      rowKind,
      runId,
      rootTeamRunId,
      taskId: record.taskId,
      displayName: record.memberDisplayName ?? record.agentName ?? record.agentDefinitionId ?? UNKNOWN_AGENT_LABEL,
      summary: record.runSummary,
      ...created(record),
      ...displayFields([record], context),
      runtimeKinds: aggregate.observed_runtime_kinds,
      aggregate,
      children: [],
    };
  }
}

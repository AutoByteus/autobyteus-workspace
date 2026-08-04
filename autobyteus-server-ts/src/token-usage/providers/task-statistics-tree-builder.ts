import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import { createTeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";
import type { TokenUsageExecutionAddress } from "../domain/execution-address.js";
import { hashedTokenUsageExecutionAddressKey } from "../domain/execution-address.js";
import type { TokenUsageCreatedTimeSource, TokenUsageTaskStatisticsRow, TokenUsageTaskStatisticsRowKind } from "../domain/statistics-models.js";
import { buildTokenUsageModelDisplayEntries, EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT, type TokenUsageModelDisplayContext } from "../projections/token-usage-model-display-projection.js";
import { buildTokenUsageCostSummaryAggregate } from "../projections/token-usage-cost-summary-aggregate.js";
import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";

type EventGroups = Map<string, TokenUsageUpdatedPayload[]>;
type ExecutionNode = {
  key: string;
  rowKind: Exclude<TokenUsageTaskStatisticsRowKind, "TEAM_RUN" | "AGENT_RUN">;
  address: TokenUsageExecutionAddress;
  taskTeamRunId: string | null;
  taskAgentRunId: string | null;
  events: TokenUsageUpdatedPayload[];
  children: Map<string, ExecutionNode>;
};
const UNKNOWN_AGENT_LABEL = "Unknown agent run";
const UNKNOWN_TEAM_LABEL = "Unknown team run";
const compact = (value: string | null | undefined): string | null => value?.trim() || null;
const ordered = (events: TokenUsageUpdatedPayload[]) => [...events].sort((a, b) => a.observed_at.localeCompare(b.observed_at) || a.usage_event_id.localeCompare(b.usage_event_id));
const latest = (events: TokenUsageUpdatedPayload[]) => events.reduce<TokenUsageUpdatedPayload | null>((a, b) => !a || b.observed_at >= a.observed_at ? b : a, null);
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
const node = (rowKind: ExecutionNode["rowKind"], address: TokenUsageExecutionAddress, taskTeamRunId: string | null, taskAgentRunId: string | null): ExecutionNode => ({
  key: hashedTokenUsageExecutionAddressKey(address), rowKind, address, taskTeamRunId, taskAgentRunId, events: [], children: new Map(),
});
const hierarchy = (address: TokenUsageExecutionAddress): ExecutionNode[] => {
  const output = [node("MEMBER_RUN", createTeamExecutionAddress({
    rootTeamRunId: address.rootTeamRunId, memberAddress: address.memberAddress,
  }), null, null)];
  address.taskTeamRunIds.forEach((taskTeamRunId, index) => output.push(node("TASK_TEAM_RUN", createTeamExecutionAddress({
    rootTeamRunId: address.rootTeamRunId,
    taskTeamRunIds: address.taskTeamRunIds.slice(0, index + 1),
    memberAddress: address.memberAddress,
  }), taskTeamRunId, null)));
  if (address.taskAgentRunId) output.push(node("TASK_AGENT_RUN", address, null, address.taskAgentRunId));
  return output;
};

export class TokenUsageTaskStatisticsTreeBuilder {
  buildRows(records: TokenUsageUpdatedPayload[], context: TokenUsageModelDisplayContext = EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT): TokenUsageTaskStatisticsRow[] {
    const teams: EventGroups = new Map();
    const agents: EventGroups = new Map();
    records.forEach((record) => record.root_team_run_id ? push(teams, record.root_team_run_id, record) : push(agents, record.run_id, record));
    return sortRows([
      ...[...teams].map(([runId, events]) => this.teamRow(runId, events, context)),
      ...[...agents].map(([runId, events]) => this.agentRow(runId, events, context)),
    ]);
  }

  private agentRow(runId: string, events: TokenUsageUpdatedPayload[], context: TokenUsageModelDisplayContext): TokenUsageTaskStatisticsRow {
    return {
      rowId: `agent:${runId}`, rowKind: "AGENT_RUN", runId, rootTeamRunId: null, memberAddress: null,
      memberAgentRunId: null, taskAgentRunId: null, taskTeamRunId: null, taskId: null, executionAddress: null,
      displayName: first(events, (event) => event.agent_name) ?? latest(events)?.agent_definition_id ?? UNKNOWN_AGENT_LABEL,
      summary: first(events, (event) => event.run_summary), ...created(events), ...displayFields(events, context),
      runtimeKinds: buildTokenUsageCostSummaryAggregate(events).observed_runtime_kinds,
      aggregate: buildTokenUsageCostSummaryAggregate(events), children: [],
    };
  }

  private teamRow(teamRunId: string, events: TokenUsageUpdatedPayload[], context: TokenUsageModelDisplayContext): TokenUsageTaskStatisticsRow {
    const rootChildren = new Map<string, ExecutionNode>();
    for (const event of events) {
      if (!event.execution_address) continue;
      let children = rootChildren;
      for (const identity of hierarchy(event.execution_address)) {
        const current = children.get(identity.key) ?? identity;
        current.events.push(event);
        children.set(current.key, current);
        children = current.children;
      }
    }
    const aggregate = buildTokenUsageCostSummaryAggregate(events);
    return {
      rowId: `team:${teamRunId}`, rowKind: "TEAM_RUN", runId: null, rootTeamRunId: teamRunId,
      memberAddress: null, memberAgentRunId: null, taskAgentRunId: null, taskTeamRunId: null,
      taskId: null, executionAddress: null,
      displayName: first(events, (event) => event.team_name) ?? UNKNOWN_TEAM_LABEL,
      summary: first(events, (event) => event.run_summary), ...created(events), ...displayFields(events, context),
      runtimeKinds: aggregate.observed_runtime_kinds, aggregate,
      children: sortRows([...rootChildren.values()].map((child) => this.executionRow(teamRunId, child, context))),
    };
  }

  private executionRow(teamRunId: string, current: ExecutionNode, context: TokenUsageModelDisplayContext): TokenUsageTaskStatisticsRow {
    const aggregate = buildTokenUsageCostSummaryAggregate(current.events);
    const recent = latest(current.events);
    return {
      rowId: `team:${teamRunId}:address:${current.key}`, rowKind: current.rowKind,
      runId: current.taskAgentRunId ?? current.taskTeamRunId ?? recent?.member_agent_run_id ?? recent?.run_id ?? null,
      rootTeamRunId: teamRunId, memberAddress: current.address.memberAddress,
      memberAgentRunId: current.rowKind === "MEMBER_RUN" ? recent?.member_agent_run_id ?? null : null,
      taskAgentRunId: current.taskAgentRunId, taskTeamRunId: current.taskTeamRunId,
      taskId: first(current.events, (event) => event.task_id), executionAddress: current.address,
      displayName: first(current.events, (event) => event.member_display_name) ??
        getAgentTeamAddressBasename(current.address.memberAddress) ?? "Unknown member",
      summary: null, ...created(current.events), ...displayFields(current.events, context),
      runtimeKinds: aggregate.observed_runtime_kinds, aggregate,
      children: sortRows([...current.children.values()].map((child) => this.executionRow(teamRunId, child, context))),
    };
  }
}

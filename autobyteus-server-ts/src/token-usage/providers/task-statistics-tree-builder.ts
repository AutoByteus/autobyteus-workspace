import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import type {
  TokenUsageExecutionAddress,
  TokenUsageExecutionAddressSegment,
} from "../domain/execution-address.js";
import {
  buildTokenUsageExecutionAddress,
  hashedTokenUsageExecutionAddressKey,
} from "../domain/execution-address.js";
import type {
  TokenUsageCreatedTimeSource,
  TokenUsageTaskStatisticsRow,
  TokenUsageTaskStatisticsRowKind,
} from "../domain/statistics-models.js";
import {
  buildTokenUsageModelDisplayEntries,
  EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT,
  type TokenUsageModelDisplayContext,
} from "../projections/token-usage-model-display-projection.js";
import {
  buildTokenUsageCostSummaryAggregate,
} from "../projections/token-usage-cost-summary-aggregate.js";

type EventGroups = Map<string, TokenUsageUpdatedPayload[]>;

type ExecutionNodeIdentity = {
  rowKind: Exclude<TokenUsageTaskStatisticsRowKind, "TEAM_RUN" | "AGENT_RUN">;
  memberRouteKey: string | null;
  taskAgentRunId: string | null;
  taskTeamRunId: string | null;
  executionAddress: TokenUsageExecutionAddress;
};

type ExecutionNode = ExecutionNodeIdentity & {
  key: string;
  events: TokenUsageUpdatedPayload[];
  children: Map<string, ExecutionNode>;
};

const UNKNOWN_AGENT_LABEL = "Unknown agent run";
const UNKNOWN_TEAM_LABEL = "Unknown team run";
const UNKNOWN_MEMBER_LABEL = "Unknown member";

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

const runCreatedMetadata = (events: TokenUsageUpdatedPayload[]): {
  createdAt: string;
  createdTimeSource: TokenUsageCreatedTimeSource;
} => {
  for (const event of orderedEvents(events)) {
    const createdAt = normalizeIsoDateString(event.run_created_at);
    if (createdAt) return { createdAt, createdTimeSource: "RUN_HISTORY" };
  }
  return { createdAt: firstObservedAt(events), createdTimeSource: "FIRST_USAGE_OBSERVED" };
};

const sortRowsByCreatedAtDesc = <T extends { createdAt: string; rowId: string }>(rows: T[]): T[] => (
  [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.rowId.localeCompare(b.rowId))
);

const pushGroupedEvent = (
  groups: EventGroups,
  key: string,
  event: TokenUsageUpdatedPayload,
): void => {
  const events = groups.get(key) ?? [];
  events.push(event);
  groups.set(key, events);
};

const memberGroupKey = (event: TokenUsageUpdatedPayload): string => (
  event.member_agent_run_id ?? event.member_route_key ?? event.run_id
);

const addressPrefix = (
  segments: readonly TokenUsageExecutionAddressSegment[],
  length: number,
): TokenUsageExecutionAddress => buildTokenUsageExecutionAddress(segments.slice(0, length));

const nodeKey = (address: TokenUsageExecutionAddress): string =>
  hashedTokenUsageExecutionAddressKey(address);

const scanAddress = (
  address: TokenUsageExecutionAddress,
): ExecutionNodeIdentity[] => {
  const nodes: ExecutionNodeIdentity[] = [];
  const segments = address.segments;
  let index = 0;
  while (index < segments.length) {
    const segment = segments[index];
    if (!segment || segment.kind !== "member") return [];
    const next = segments[index + 1] ?? null;
    if (next?.kind === "task_team") {
      const executionAddress = addressPrefix(segments, index + 2);
      nodes.push({
        rowKind: "TASK_TEAM_RUN",
        memberRouteKey: segment.memberRouteKey,
        taskAgentRunId: null,
        taskTeamRunId: next.taskTeamRunId,
        executionAddress,
      });
      index += 2;
      continue;
    }
    if (next?.kind === "task_agent") {
      const executionAddress = addressPrefix(segments, index + 2);
      nodes.push({
        rowKind: "TASK_AGENT_RUN",
        memberRouteKey: segment.memberRouteKey,
        taskAgentRunId: next.taskAgentRunId,
        taskTeamRunId: null,
        executionAddress,
      });
      index += 2;
      continue;
    }
    const executionAddress = addressPrefix(segments, index + 1);
    nodes.push({
      rowKind: "MEMBER_RUN",
      memberRouteKey: segment.memberRouteKey,
      taskAgentRunId: null,
      taskTeamRunId: null,
      executionAddress,
    });
    index += 1;
  }
  return nodes;
};

const createNode = (identity: ExecutionNodeIdentity): ExecutionNode => ({
  ...identity,
  key: nodeKey(identity.executionAddress),
  events: [],
  children: new Map(),
});

const nodeDisplayName = (node: ExecutionNode, events: TokenUsageUpdatedPayload[]): string => {
  if (node.rowKind === "TASK_TEAM_RUN") {
    return node.memberRouteKey ?? node.taskTeamRunId ?? "Unknown task team";
  }
  if (node.rowKind === "TASK_AGENT_RUN") {
    return firstNonEmptyDisplayValue(events, (event) => event.member_name) ??
      node.memberRouteKey ??
      node.taskAgentRunId ??
      "Unknown task agent";
  }
  return firstNonEmptyDisplayValue(events, (event) => event.member_name) ??
    node.memberRouteKey ??
    latestEvent(events)?.member_agent_run_id ??
    UNKNOWN_MEMBER_LABEL;
};

export class TokenUsageTaskStatisticsTreeBuilder {
  buildRows(
    records: TokenUsageUpdatedPayload[],
    displayContext: TokenUsageModelDisplayContext = EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT,
  ): TokenUsageTaskStatisticsRow[] {
    const teamGroups: EventGroups = new Map();
    const standaloneAgentGroups: EventGroups = new Map();
    for (const record of records) {
      if (record.root_team_run_id) {
        pushGroupedEvent(teamGroups, record.root_team_run_id, record);
      } else {
        pushGroupedEvent(standaloneAgentGroups, record.run_id, record);
      }
    }
    return sortRowsByCreatedAtDesc([
      ...Array.from(teamGroups.entries()).map(([teamRunId, events]) => this.buildTeamRow(teamRunId, events, displayContext)),
      ...Array.from(standaloneAgentGroups.entries()).map(([runId, events]) => this.buildStandaloneAgentRow(runId, events, displayContext)),
    ]);
  }

  private buildStandaloneAgentRow(
    runId: string,
    events: TokenUsageUpdatedPayload[],
    displayContext: TokenUsageModelDisplayContext,
  ): TokenUsageTaskStatisticsRow {
    const aggregate = buildTokenUsageCostSummaryAggregate(events);
    const displayFields = modelDisplayFields(events, displayContext);
    const latest = latestEvent(events);
    return {
      rowId: `agent:${runId}`,
      rowKind: "AGENT_RUN",
      runId,
      rootTeamRunId: null,
      memberRouteKey: null,
      memberAgentRunId: null,
      taskAgentRunId: null,
      taskTeamRunId: null,
      taskId: null,
      executionAddress: null,
      displayName: firstNonEmptyDisplayValue(events, (event) => event.agent_name) ??
        latest?.agent_definition_id ??
        UNKNOWN_AGENT_LABEL,
      summary: firstNonEmptyDisplayValue(events, (event) => event.run_summary),
      ...runCreatedMetadata(events),
      ...displayFields,
      runtimeKinds: aggregate.observed_runtime_kinds,
      aggregate,
      children: [],
    };
  }

  private buildTeamRow(
    teamRunId: string,
    events: TokenUsageUpdatedPayload[],
    displayContext: TokenUsageModelDisplayContext,
  ): TokenUsageTaskStatisticsRow {
    const aggregate = buildTokenUsageCostSummaryAggregate(events);
    const displayFields = modelDisplayFields(events, displayContext);
    const root = createNode({
      rowKind: "MEMBER_RUN",
      memberRouteKey: null,
      taskAgentRunId: null,
      taskTeamRunId: null,
      executionAddress: buildTokenUsageExecutionAddress([]),
    });
    const fallbackGroups: EventGroups = new Map();
    for (const event of events) {
      const nodes = event.execution_address ? scanAddress(event.execution_address) : [];
      if (nodes.length === 0) {
        pushGroupedEvent(fallbackGroups, memberGroupKey(event), event);
        continue;
      }
      this.insertEvent(root, nodes, event);
    }
    const children = [
      ...Array.from(root.children.values()).map((node) => this.toRow(teamRunId, node, displayContext)),
      ...Array.from(fallbackGroups.entries()).map(([key, groupEvents]) => this.buildLegacyMemberRow(teamRunId, key, groupEvents, displayContext)),
    ];
    return {
      rowId: `team:${teamRunId}`,
      rowKind: "TEAM_RUN",
      runId: null,
      rootTeamRunId: teamRunId,
      memberRouteKey: null,
      memberAgentRunId: null,
      taskAgentRunId: null,
      taskTeamRunId: null,
      taskId: null,
      executionAddress: null,
      displayName: firstNonEmptyDisplayValue(events, (event) => event.team_name) ?? UNKNOWN_TEAM_LABEL,
      summary: firstNonEmptyDisplayValue(events, (event) => event.run_summary),
      ...runCreatedMetadata(events),
      ...displayFields,
      runtimeKinds: aggregate.observed_runtime_kinds,
      aggregate,
      children: sortRowsByCreatedAtDesc(children),
    };
  }

  private insertEvent(
    root: ExecutionNode,
    identities: ExecutionNodeIdentity[],
    event: TokenUsageUpdatedPayload,
  ): void {
    let current = root;
    for (const identity of identities) {
      const key = nodeKey(identity.executionAddress);
      const child = current.children.get(key) ?? createNode(identity);
      child.events.push(event);
      current.children.set(key, child);
      current = child;
    }
  }

  private toRow(
    teamRunId: string,
    node: ExecutionNode,
    displayContext: TokenUsageModelDisplayContext,
  ): TokenUsageTaskStatisticsRow {
    const aggregate = buildTokenUsageCostSummaryAggregate(node.events);
    const displayFields = modelDisplayFields(node.events, displayContext);
    const latest = latestEvent(node.events);
    return {
      rowId: `team:${teamRunId}:address:${node.key}`,
      rowKind: node.rowKind,
      runId: node.taskAgentRunId ?? node.taskTeamRunId ?? latest?.member_agent_run_id ?? latest?.run_id ?? null,
      rootTeamRunId: teamRunId,
      memberRouteKey: node.memberRouteKey,
      memberAgentRunId: node.rowKind === "MEMBER_RUN" ? latest?.member_agent_run_id ?? null : null,
      taskAgentRunId: node.taskAgentRunId,
      taskTeamRunId: node.taskTeamRunId,
      taskId: firstNonEmptyDisplayValue(node.events, (event) => event.task_id),
      executionAddress: node.executionAddress,
      displayName: nodeDisplayName(node, node.events),
      summary: null,
      ...runCreatedMetadata(node.events),
      ...displayFields,
      runtimeKinds: aggregate.observed_runtime_kinds,
      aggregate,
      children: sortRowsByCreatedAtDesc(
        Array.from(node.children.values()).map((child) => this.toRow(teamRunId, child, displayContext)),
      ),
    };
  }

  private buildLegacyMemberRow(
    teamRunId: string,
    groupKey: string,
    events: TokenUsageUpdatedPayload[],
    displayContext: TokenUsageModelDisplayContext,
  ): TokenUsageTaskStatisticsRow {
    const aggregate = buildTokenUsageCostSummaryAggregate(events);
    const displayFields = modelDisplayFields(events, displayContext);
    const latest = latestEvent(events);
    const memberName = firstNonEmptyDisplayValue(events, (event) => event.member_name) ??
      latest?.member_route_key ??
      latest?.member_agent_run_id ??
      latest?.run_id ??
      UNKNOWN_MEMBER_LABEL;
    return {
      rowId: `team:${teamRunId}:legacy-member:${groupKey}`,
      rowKind: "MEMBER_RUN",
      runId: latest?.member_agent_run_id ?? latest?.run_id ?? null,
      rootTeamRunId: teamRunId,
      memberRouteKey: latest?.member_route_key ?? null,
      memberAgentRunId: latest?.member_agent_run_id ?? null,
      taskAgentRunId: null,
      taskTeamRunId: null,
      taskId: null,
      executionAddress: null,
      displayName: memberName,
      summary: null,
      ...runCreatedMetadata(events),
      ...displayFields,
      runtimeKinds: aggregate.observed_runtime_kinds,
      aggregate,
      children: [],
    };
  }
}

const modelDisplayFields = (
  events: TokenUsageUpdatedPayload[],
  displayContext: TokenUsageModelDisplayContext,
): Pick<TokenUsageTaskStatisticsRow, "models" | "modelDisplayNames"> => {
  const entries = buildTokenUsageModelDisplayEntries(events, displayContext);
  return {
    models: entries.map((entry) => entry.modelIdentifier),
    modelDisplayNames: entries.map((entry) => entry.modelDisplayName),
  };
};

import {
  createAgentTeamAddress,
  getAgentTeamAddressSegments,
  isAgentTeamAddressAncestor,
} from "../../agent-collaboration/domain/agent-team-address.js";
import {
  createTeamExecutionAddress,
  parseTeamExecutionAddress,
  type TeamExecutionAddress,
} from "../legacy/team-execution-address.js";
import type { AppDataMigrationItemDetail } from "../domain/app-data-migration-types.js";
import type {
  TokenUsageTaskTeamRunIndex,
  TokenUsageTaskTeamRunIndexEntry,
} from "./token-usage-task-team-run-index.js";

export type RawTokenUsageLedgerBackfillRow = {
  id: number;
  usage_event_id: string;
  run_id: string;
  root_team_run_id: string | null;
  execution_address_json: string | null;
  member_route_key: string | null;
  task_agent_run_id: string | null;
  task_id: string | null;
};

type LegacyRowAddress = Readonly<{
  taskTeamRunIds: readonly string[];
  taskTeamMemberSegments: readonly string[];
  memberSegments: readonly string[] | null;
  taskAgentRunId: string | null;
}>;

type RowPlan =
  | { kind: "skip"; detail: AppDataMigrationItemDetail }
  | { kind: "fail"; detail: AppDataMigrationItemDetail }
  | { kind: "migrate"; detail: AppDataMigrationItemDetail; address: TeamExecutionAddress };

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const routeSegments = (value: unknown, label: string): readonly string[] | null => {
  if (value === null || value === undefined) return null;
  const route = text(value);
  if (!route) throw new Error(`${label} must be a non-empty route.`);
  const rooted = route.startsWith("/") ? route : `/${route}`;
  return getAgentTeamAddressSegments(rooted);
};

const memberSegment = (value: unknown, label: string): readonly string[] => {
  const record = object(value);
  if (!record || record.kind !== "member") throw new Error(`${label} is not a member segment.`);
  const route = routeSegments(record.memberRouteKey ?? record.member_route_key, `${label}.memberRouteKey`);
  const rawPath = record.memberPath ?? record.member_path;
  let memberPath: readonly string[] | null = null;
  if (rawPath !== undefined) {
    if (!Array.isArray(rawPath) || rawPath.length === 0) throw new Error(`${label}.memberPath must be a non-empty array.`);
    memberPath = getAgentTeamAddressSegments(createAgentTeamAddress(rawPath.map((part, index) => {
      const segment = text(part);
      if (!segment) throw new Error(`${label}.memberPath[${index}] is required.`);
      return segment;
    })));
  }
  if (route && memberPath && JSON.stringify(route) !== JSON.stringify(memberPath)) {
    throw new Error(`${label} has conflicting memberRouteKey and memberPath values.`);
  }
  const resolved = route ?? memberPath;
  if (!resolved) throw new Error(`${label} has no member route.`);
  return resolved;
};

const parseLegacyAddress = (
  value: unknown,
  row: RawTokenUsageLedgerBackfillRow,
): LegacyRowAddress => {
  const rowMember = routeSegments(row.member_route_key, "member_route_key");
  const rowTaskAgentRunId = text(row.task_agent_run_id);
  if (value === null) {
    return Object.freeze({
      taskTeamRunIds: Object.freeze([]),
      taskTeamMemberSegments: Object.freeze([]),
      memberSegments: rowMember ? Object.freeze([...rowMember]) : null,
      taskAgentRunId: rowTaskAgentRunId,
    });
  }
  const record = object(value);
  if (!record || !Array.isArray(record.segments)) {
    throw new Error("execution_address_json is neither an exact TeamExecutionAddress nor a legacy segment address.");
  }
  const taskTeamRunIds: string[] = [];
  const parsedSegments: Array<
    | { kind: "member"; segments: readonly string[] }
    | { kind: "task_team"; taskTeamRunId: string }
    | { kind: "task_agent"; taskAgentRunId: string }
  > = [];
  for (const [index, raw] of record.segments.entries()) {
    const segment = object(raw);
    if (segment?.kind === "member") {
      parsedSegments.push({ kind: "member", segments: memberSegment(segment, `segments[${index}]`) });
      continue;
    }
    if (segment?.kind === "task_team") {
      const taskTeamRunId = text(segment.taskTeamRunId ?? segment.task_team_run_id);
      if (!taskTeamRunId) throw new Error(`segments[${index}].taskTeamRunId is required.`);
      taskTeamRunIds.push(taskTeamRunId);
      parsedSegments.push({ kind: "task_team", taskTeamRunId });
      continue;
    }
    if (segment?.kind === "task_agent") {
      const taskAgentRunId = text(segment.taskAgentRunId ?? segment.task_agent_run_id);
      if (!taskAgentRunId) throw new Error(`segments[${index}].taskAgentRunId is required.`);
      parsedSegments.push({ kind: "task_agent", taskAgentRunId });
      continue;
    }
    throw new Error(`segments[${index}] has an unsupported kind.`);
  }
  if (new Set(taskTeamRunIds).size !== taskTeamRunIds.length) {
    throw new Error("Legacy execution address contains a repeated task TeamRun ID.");
  }
  const taskAgentSegments = parsedSegments.filter((segment) => segment.kind === "task_agent");
  if (taskAgentSegments.length > 1) throw new Error("Legacy execution address contains more than one task Agent run ID.");
  const storedTaskAgentRunId = taskAgentSegments[0]?.kind === "task_agent"
    ? taskAgentSegments[0].taskAgentRunId
    : null;
  if (storedTaskAgentRunId && rowTaskAgentRunId && storedTaskAgentRunId !== rowTaskAgentRunId) {
    throw new Error("Legacy execution address conflicts with task_agent_run_id.");
  }
  let lastTaskTeamIndex = -1;
  for (let index = 0; index < parsedSegments.length; index += 1) {
    if (parsedSegments[index]?.kind === "task_team") lastTaskTeamIndex = index;
  }
  const beforeTask = lastTaskTeamIndex < 0 ? [] : parsedSegments.slice(0, lastTaskTeamIndex);
  const afterTask = lastTaskTeamIndex < 0 ? parsedSegments : parsedSegments.slice(lastTaskTeamIndex + 1);
  const taskTeamMemberSegments = beforeTask
    .filter((segment) => segment.kind === "member")
    .flatMap((segment) => segment.kind === "member" ? [...segment.segments] : []);
  const finalMembers = afterTask.filter((segment) => segment.kind === "member");
  const memberSegments = lastTaskTeamIndex < 0
    ? finalMembers.flatMap((segment) => segment.kind === "member" ? [...segment.segments] : [])
    : finalMembers.length === 1 && finalMembers[0]?.kind === "member"
      ? [...finalMembers[0].segments]
      : rowMember ? [...rowMember] : null;
  if (lastTaskTeamIndex >= 0 && finalMembers.length > 1) {
    throw new Error("Legacy task Team execution address contains more than one final member segment.");
  }
  const comparableStoredMember = finalMembers.at(-1);
  if (
    rowMember
    && comparableStoredMember?.kind === "member"
    && JSON.stringify(rowMember) !== JSON.stringify(comparableStoredMember.segments)
  ) {
    throw new Error("Legacy execution address conflicts with member_route_key.");
  }
  return Object.freeze({
    taskTeamRunIds: Object.freeze(taskTeamRunIds),
    taskTeamMemberSegments: Object.freeze(taskTeamMemberSegments),
    memberSegments: memberSegments?.length ? Object.freeze(memberSegments) : null,
    taskAgentRunId: storedTaskAgentRunId ?? rowTaskAgentRunId,
  });
};

const composeTaskTeamAddress = (
  entry: TokenUsageTaskTeamRunIndexEntry,
  memberSegments: readonly string[],
  taskAgentRunId: string | null,
): TeamExecutionAddress => createTeamExecutionAddress({
  rootTeamRunId: entry.rootTeamRunId,
  taskTeamRunIds: entry.taskTeamRunIds,
  memberAddress: createAgentTeamAddress([
    ...getAgentTeamAddressSegments(entry.teamAddress),
    ...memberSegments,
  ]),
  taskAgentRunId,
});

const taskTeamEntryForLegacy = (
  rowRootTeamRunId: string,
  legacy: LegacyRowAddress,
  index: TokenUsageTaskTeamRunIndex,
): TokenUsageTaskTeamRunIndexEntry | null => {
  const explicitId = legacy.taskTeamRunIds.at(-1) ?? null;
  const explicit = explicitId ? index.entries.get(explicitId) ?? null : null;
  if (explicitId && !explicit) throw new Error(`Task TeamRun mapping '${explicitId}' is missing from strict current task records.`);
  const byRowRoot = index.entries.get(rowRootTeamRunId) ?? null;
  if (explicit && byRowRoot && explicit !== byRowRoot) {
    throw new Error(`Token row root '${rowRootTeamRunId}' conflicts with task TeamRun mapping '${explicitId}'.`);
  }
  const entry = explicit ?? byRowRoot;
  if (!entry) return null;
  if (rowRootTeamRunId !== entry.rootTeamRunId && rowRootTeamRunId !== entry.taskTeamRunIds.at(-1)) {
    throw new Error(`Token row root '${rowRootTeamRunId}' conflicts with task TeamRun '${entry.taskTeamRunIds.at(-1)}'.`);
  }
  if (
    legacy.taskTeamRunIds.length > 0
    && JSON.stringify(legacy.taskTeamRunIds) !== JSON.stringify(entry.taskTeamRunIds)
  ) {
    throw new Error(`Legacy ordered task TeamRun chain conflicts with mapping '${entry.taskTeamRunIds.at(-1)}'.`);
  }
  if (
    legacy.taskTeamMemberSegments.length > 0
    && JSON.stringify(legacy.taskTeamMemberSegments)
      !== JSON.stringify(getAgentTeamAddressSegments(entry.teamAddress))
  ) {
    throw new Error(`Legacy logical Team address conflicts with mapping '${entry.taskTeamRunIds.at(-1)}'.`);
  }
  return entry;
};

export const planTokenUsageExecutionAddressBackfillRow = (
  row: RawTokenUsageLedgerBackfillRow,
  index: TokenUsageTaskTeamRunIndex,
): RowPlan => {
  const itemId = row.usage_event_id || `token-row:${row.id}`;
  const rootTeamRunId = text(row.root_team_run_id);
  if (!rootTeamRunId) {
    return { kind: "skip", detail: { itemId, status: "SKIPPED", message: "Standalone Agent token row." } };
  }
  try {
    let parsed: unknown = null;
    let current: TeamExecutionAddress | null = null;
    if (row.execution_address_json) {
      parsed = JSON.parse(row.execution_address_json) as unknown;
      try { current = parseTeamExecutionAddress(row.execution_address_json); } catch { current = null; }
    }
    const rowRootTaskTeamEntry = index.entries.get(rootTeamRunId) ?? null;
    if (current && !rowRootTaskTeamEntry) {
      if (current.rootTeamRunId !== rootTeamRunId) {
        throw new Error(`Exact execution address root '${current.rootTeamRunId}' conflicts with row root '${rootTeamRunId}'.`);
      }
      return { kind: "skip", detail: { itemId, status: "SKIPPED", message: "Already canonical." } };
    }
    if (current && rowRootTaskTeamEntry) {
      if (
        current.rootTeamRunId === rowRootTaskTeamEntry.rootTeamRunId
        && JSON.stringify(current.taskTeamRunIds) === JSON.stringify(rowRootTaskTeamEntry.taskTeamRunIds)
        && isAgentTeamAddressAncestor(rowRootTaskTeamEntry.teamAddress, current.memberAddress)
      ) {
        return {
          kind: "migrate",
          address: current,
          detail: { itemId, status: "MIGRATED", message: "Corrected historical task TeamRun root from strict current task records." },
        };
      }
      if (current.rootTeamRunId !== rootTeamRunId || current.taskTeamRunIds.length > 0) {
        throw new Error(`Exact execution address conflicts with task TeamRun mapping '${rootTeamRunId}'.`);
      }
      const address = composeTaskTeamAddress(
        rowRootTaskTeamEntry,
        getAgentTeamAddressSegments(current.memberAddress),
        current.taskAgentRunId,
      );
      return {
        kind: "migrate",
        address,
        detail: { itemId, status: "MIGRATED", message: "Corrected historical task TeamRun root and ordered chain from strict current task records." },
      };
    }

    const legacy = parseLegacyAddress(parsed, row);
    const taskTeamEntry = taskTeamEntryForLegacy(rootTeamRunId, legacy, index);
    if (taskTeamEntry) {
      if (!legacy.memberSegments?.length) throw new Error("Task Team token row has no final member suffix.");
      const address = composeTaskTeamAddress(taskTeamEntry, legacy.memberSegments, legacy.taskAgentRunId);
      return {
        kind: "migrate",
        address,
        detail: { itemId, status: "MIGRATED", message: "Reconstructed task TeamRun root, ordered chain, and member address from strict current task records." },
      };
    }
    if (legacy.taskTeamRunIds.length > 0) {
      throw new Error(`Task TeamRun mapping '${legacy.taskTeamRunIds.at(-1)}' is missing from strict current task records.`);
    }
    if (!legacy.memberSegments?.length) throw new Error("Team token row has no member address.");
    const address = createTeamExecutionAddress({
      rootTeamRunId,
      memberAddress: createAgentTeamAddress(legacy.memberSegments),
      taskAgentRunId: legacy.taskAgentRunId,
    });
    return {
      kind: "migrate",
      address,
      detail: { itemId, status: "MIGRATED", message: "Canonical execution address persisted." },
    };
  } catch (error) {
    return {
      kind: "fail",
      detail: {
        itemId,
        status: "FAILED",
        message: `Team token row lacks a reconstructable canonical execution address: ${errorMessage(error)}`,
      },
    };
  }
};

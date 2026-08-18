import {
  createAgentTeamAddress,
  getAgentTeamAddressSegments,
  isAgentTeamAddressAncestor,
} from "../../../agent-collaboration/domain/agent-team-address.js";
import {
  createTeamExecutionAddress,
  parseTeamExecutionAddress,
  type TeamExecutionAddress,
} from "../../legacy/team-execution-address.js";
import type { AppDataMigrationItemDetail } from "../../domain/app-data-migration-types.js";
import type { TokenUsageTeamRunV1EvidenceRow } from "../../../token-usage/repositories/sql/token-usage-team-run-v1-migration-repository.js";
import type {
  TokenUsageTaskTeamRunIndex,
  TokenUsageTaskTeamRunIndexEntry,
} from "../token-usage-task-team-run-index.js";

type LegacyAddress = Readonly<{
  taskTeamRunIds: readonly string[];
  taskTeamMemberSegments: readonly string[];
  finalMemberSegments: readonly string[] | null;
  combinedMemberSegments: readonly string[] | null;
  taskAgentRunId: string | null;
}>;

export type TeamRunV1TokenRowDisposition =
  | Readonly<{
      kind: "STANDALONE";
      row: TokenUsageTeamRunV1EvidenceRow;
      detail: AppDataMigrationItemDetail;
    }>
  | Readonly<{
      kind: "CURRENT";
      row: TokenUsageTeamRunV1EvidenceRow;
      detail: AppDataMigrationItemDetail;
    }>
  | Readonly<{
      kind: "RESOLVED";
      row: TokenUsageTeamRunV1EvidenceRow;
      finalRootTeamRunId: string;
      address: TeamExecutionAddress;
      authority: "RETAINED_TOPOLOGY" | "DIRECT_ROW" | "RETIRED_ROW";
      detail: AppDataMigrationItemDetail;
    }>
  | Readonly<{
      kind: "PRESERVED_WARNING";
      row: TokenUsageTeamRunV1EvidenceRow;
      detail: AppDataMigrationItemDetail;
    }>;

const string = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const itemId = (row: TokenUsageTeamRunV1EvidenceRow): string =>
  row.usageEventId || `token-row:${row.id}`;

const detail = (
  row: TokenUsageTeamRunV1EvidenceRow,
  status: AppDataMigrationItemDetail["status"],
  message: string,
): AppDataMigrationItemDetail => ({ itemId: itemId(row), status, message });

const routeSegments = (value: unknown, label: string): readonly string[] | null => {
  if (value === null || value === undefined) return null;
  const route = string(value);
  if (!route) throw new Error(`${label} must be a non-empty route.`);
  return getAgentTeamAddressSegments(route.startsWith("/") ? route : `/${route}`);
};

const memberSegments = (value: unknown, label: string): readonly string[] => {
  const record = object(value);
  if (!record || record.kind !== "member") throw new Error(`${label} is not a member segment.`);
  const route = routeSegments(
    record.memberRouteKey ?? record.member_route_key,
    `${label}.memberRouteKey`,
  );
  const rawPath = record.memberPath ?? record.member_path;
  const memberPath = rawPath === undefined
    ? null
    : Array.isArray(rawPath) && rawPath.length
      ? getAgentTeamAddressSegments(createAgentTeamAddress(rawPath.map((part, index) => {
        const segment = string(part);
        if (!segment) throw new Error(`${label}.memberPath[${index}] is required.`);
        return segment;
      })))
      : (() => { throw new Error(`${label}.memberPath must be a non-empty array.`); })();
  if (route && memberPath && JSON.stringify(route) !== JSON.stringify(memberPath)) {
    throw new Error(`${label} has conflicting member route/path values.`);
  }
  const resolved = route ?? memberPath;
  if (!resolved) throw new Error(`${label} has no member route.`);
  return resolved;
};

const parseReleasedAddress = (
  value: unknown,
  row: TokenUsageTeamRunV1EvidenceRow,
): LegacyAddress => {
  const rowMember = routeSegments(row.memberRouteKey, "member_route_key");
  const rowTaskAgentRunId = string(row.taskAgentRunId);
  const record = object(value);
  if (!record || !Array.isArray(record.segments) || !record.segments.length) {
    throw new Error("execution_address_json is not a released segment address.");
  }
  const parsed: Array<
    | { kind: "member"; segments: readonly string[] }
    | { kind: "task_team"; taskTeamRunId: string }
    | { kind: "task_agent"; taskAgentRunId: string }
  > = [];
  let previousKind: string | null = null;
  for (const [index, raw] of record.segments.entries()) {
    const segment = object(raw);
    const label = `segments[${index}]`;
    if (segment?.kind === "member") {
      if (parsed.some((entry) => entry.kind === "task_agent")) {
        throw new Error(`${label} occurs after the task Agent segment.`);
      }
      parsed.push({ kind: "member", segments: memberSegments(segment, label) });
    } else if (segment?.kind === "task_team") {
      if (previousKind !== "member") throw new Error(`${label} must follow a member segment.`);
      const taskTeamRunId = string(segment.taskTeamRunId ?? segment.task_team_run_id);
      if (!taskTeamRunId) throw new Error(`${label}.taskTeamRunId is required.`);
      parsed.push({ kind: "task_team", taskTeamRunId });
    } else if (segment?.kind === "task_agent") {
      if (previousKind !== "member" || index !== record.segments.length - 1) {
        throw new Error(`${label} must be terminal and follow a member segment.`);
      }
      const taskAgentRunId = string(segment.taskAgentRunId ?? segment.task_agent_run_id);
      if (!taskAgentRunId) throw new Error(`${label}.taskAgentRunId is required.`);
      parsed.push({ kind: "task_agent", taskAgentRunId });
    } else {
      throw new Error(`${label} has an unsupported kind.`);
    }
    previousKind = String(segment?.kind ?? "");
  }
  const taskTeamRunIds = parsed.flatMap((entry) =>
    entry.kind === "task_team" ? [entry.taskTeamRunId] : []);
  if (new Set(taskTeamRunIds).size !== taskTeamRunIds.length) {
    throw new Error("Released execution address repeats a task TeamRun ID.");
  }
  const taskAgents = parsed.flatMap((entry) =>
    entry.kind === "task_agent" ? [entry.taskAgentRunId] : []);
  if (taskAgents.length > 1) throw new Error("Released execution address repeats task Agent identity.");
  if (taskAgents[0] && rowTaskAgentRunId && taskAgents[0] !== rowTaskAgentRunId) {
    throw new Error("Released execution address conflicts with task_agent_run_id.");
  }
  let lastTaskTeamIndex = -1;
  for (let index = parsed.length - 1; index >= 0; index -= 1) {
    if (parsed[index]?.kind === "task_team") {
      lastTaskTeamIndex = index;
      break;
    }
  }
  const beforeTask = lastTaskTeamIndex < 0 ? [] : parsed.slice(0, lastTaskTeamIndex);
  const afterTask = lastTaskTeamIndex < 0 ? parsed : parsed.slice(lastTaskTeamIndex + 1);
  const taskTeamMemberSegments = beforeTask.flatMap((entry) =>
    entry.kind === "member" ? [...entry.segments] : []);
  const finalMembers = afterTask.filter((entry) => entry.kind === "member");
  if (lastTaskTeamIndex >= 0 && finalMembers.length === 0) {
    throw new Error("Released task-Team address must have a final member segment.");
  }
  const finalMemberSegments = finalMembers.flatMap((entry) =>
    entry.kind === "member" ? [...entry.segments] : []);
  const terminalMemberSegments = finalMembers.at(-1)?.kind === "member"
    ? finalMembers.at(-1)!.segments
    : null;
  if (rowMember && terminalMemberSegments
      && JSON.stringify(rowMember) !== JSON.stringify(terminalMemberSegments)) {
    throw new Error("Released execution address conflicts with member_route_key.");
  }
  const combined = parsed.flatMap((entry) =>
    entry.kind === "member" ? [...entry.segments] : []);
  return Object.freeze({
    taskTeamRunIds: Object.freeze(taskTeamRunIds),
    taskTeamMemberSegments: Object.freeze(taskTeamMemberSegments),
    finalMemberSegments: finalMemberSegments.length
      ? Object.freeze(finalMemberSegments)
      : rowMember ? Object.freeze([...rowMember]) : null,
    combinedMemberSegments: combined.length ? Object.freeze(combined) : null,
    taskAgentRunId: taskAgents[0] ?? rowTaskAgentRunId,
  });
};

const topologyEntry = (
  rowRootTeamRunId: string,
  legacy: LegacyAddress,
  index: TokenUsageTaskTeamRunIndex,
): TokenUsageTaskTeamRunIndexEntry | null => {
  const unusableId = legacy.taskTeamRunIds.find((taskTeamRunId) =>
    index.unusableTaskTeamRunIds.has(taskTeamRunId));
  if (unusableId) {
    throw new Error(`Retained task topology '${unusableId}' is conflicting or incomplete.`);
  }
  const lastTaskTeamRunId = legacy.taskTeamRunIds.at(-1) ?? null;
  const byTask = lastTaskTeamRunId ? index.entries.get(lastTaskTeamRunId) ?? null : null;
  const byStoredRoot = index.entries.get(rowRootTeamRunId) ?? null;
  if (byTask && byStoredRoot && byTask !== byStoredRoot) {
    throw new Error("Stored root and task-Team evidence select different retained topology.");
  }
  const entry = byTask ?? byStoredRoot;
  if (!entry) return null;
  if (
    rowRootTeamRunId !== entry.rootTeamRunId
    && rowRootTeamRunId !== entry.taskTeamRunIds.at(-1)
  ) {
    throw new Error(`Stored root '${rowRootTeamRunId}' contradicts retained task topology.`);
  }
  if (JSON.stringify(legacy.taskTeamRunIds) !== JSON.stringify(entry.taskTeamRunIds)) {
    throw new Error("Ordered task TeamRun IDs contradict retained task topology.");
  }
  if (
    legacy.taskTeamMemberSegments.length
    && JSON.stringify(legacy.taskTeamMemberSegments)
      !== JSON.stringify(getAgentTeamAddressSegments(entry.teamAddress))
  ) {
    throw new Error("Logical task-Team address contradicts retained task topology.");
  }
  return entry;
};

const fromRetainedTopology = (
  row: TokenUsageTeamRunV1EvidenceRow,
  legacy: LegacyAddress,
  entry: TokenUsageTaskTeamRunIndexEntry,
): TeamRunV1TokenRowDisposition => {
  if (!legacy.finalMemberSegments?.length) throw new Error("Task-Team row has no final member suffix.");
  const address = createTeamExecutionAddress({
    rootTeamRunId: entry.rootTeamRunId,
    taskTeamRunIds: entry.taskTeamRunIds,
    memberAddress: createAgentTeamAddress([
      ...getAgentTeamAddressSegments(entry.teamAddress),
      ...legacy.finalMemberSegments,
    ]),
    taskAgentRunId: legacy.taskAgentRunId,
  });
  return Object.freeze({
    kind: "RESOLVED" as const,
    row,
    finalRootTeamRunId: entry.rootTeamRunId,
    address,
    authority: "RETAINED_TOPOLOGY" as const,
    detail: detail(row, row.rootTeamRunId === entry.rootTeamRunId ? "SKIPPED" : "MIGRATED",
      "Resolved final root from retained task topology."),
  });
};

export const planTeamRunV1TokenRow = (
  row: TokenUsageTeamRunV1EvidenceRow,
  index: TokenUsageTaskTeamRunIndex,
): TeamRunV1TokenRowDisposition => {
  const storedRoot = string(row.rootTeamRunId);
  if (!storedRoot) {
    const hasTeamEvidence = Boolean(row.executionAddressJson || row.memberAgentRunId || row.memberRouteKey);
    return hasTeamEvidence
      ? Object.freeze({
        kind: "PRESERVED_WARNING" as const,
        row,
        detail: detail(row, "FAILED", "Token row has Team evidence but no stored root; left unchanged."),
      })
      : Object.freeze({
        kind: "STANDALONE" as const,
        row,
        detail: detail(row, "SKIPPED", "Standalone Agent token row."),
      });
  }
  try {
    const rowRunId = string(row.runId);
    if (!rowRunId) throw new Error("Team token row has no AgentRun ID.");
    const memberAgentRunId = string(row.memberAgentRunId);
    if (memberAgentRunId && memberAgentRunId !== rowRunId) {
      throw new Error("member_agent_run_id contradicts run_id.");
    }
    const taskAgentRunId = string(row.taskAgentRunId);
    if (taskAgentRunId && taskAgentRunId !== rowRunId) {
      throw new Error("task_agent_run_id contradicts run_id.");
    }
    if (!row.executionAddressJson) {
      if (
        row.memberAgentRunId === null
        && row.memberRouteKey === null
        && row.taskAgentRunId === null
      ) {
        return Object.freeze({
          kind: "CURRENT" as const,
          row,
          detail: detail(
            row,
            "SKIPPED",
            "Current Team token row has root attribution and no predecessor identity evidence.",
          ),
        });
      }
      throw new Error("Team token row has incomplete predecessor execution-address evidence.");
    }
    let raw: unknown;
    try { raw = JSON.parse(row.executionAddressJson) as unknown; }
    catch (error) { throw new Error(`execution_address_json is invalid JSON: ${String(error)}`); }

    let exact: TeamExecutionAddress | null = null;
    try { exact = parseTeamExecutionAddress(row.executionAddressJson); } catch { exact = null; }
    if (exact) {
      const unusableId = exact.taskTeamRunIds.find((taskTeamRunId) =>
        index.unusableTaskTeamRunIds.has(taskTeamRunId));
      if (unusableId) {
        throw new Error(`Retained task topology '${unusableId}' is conflicting or incomplete.`);
      }
      const lastTask = exact.taskTeamRunIds.at(-1);
      const retained = lastTask ? index.entries.get(lastTask) ?? null : index.entries.get(storedRoot) ?? null;
      if (retained) {
        if (
          exact.rootTeamRunId !== retained.rootTeamRunId
          || JSON.stringify(exact.taskTeamRunIds) !== JSON.stringify(retained.taskTeamRunIds)
          || !isAgentTeamAddressAncestor(retained.teamAddress, exact.memberAddress)
        ) {
          throw new Error("Exact address contradicts retained task topology.");
        }
        return Object.freeze({
          kind: "RESOLVED" as const,
          row,
          finalRootTeamRunId: retained.rootTeamRunId,
          address: exact,
          authority: "RETAINED_TOPOLOGY" as const,
          detail: detail(row, storedRoot === retained.rootTeamRunId ? "SKIPPED" : "MIGRATED",
            "Validated exact address against retained task topology."),
        });
      }
      if (exact.rootTeamRunId !== storedRoot) {
        throw new Error("Exact execution root contradicts stored root.");
      }
      return Object.freeze({
        kind: "RESOLVED" as const,
        row,
        finalRootTeamRunId: storedRoot,
        address: exact,
        authority: "DIRECT_ROW" as const,
        detail: detail(row, "SKIPPED", "Token row already has exact current root identity."),
      });
    }

    const legacy = parseReleasedAddress(raw, row);
    const retained = topologyEntry(storedRoot, legacy, index);
    if (retained) return fromRetainedTopology(row, legacy, retained);
    if (!legacy.combinedMemberSegments?.length) throw new Error("Team token row has no member address.");
    if (legacy.taskTeamRunIds.length) {
      if (!string(row.memberAgentRunId) || string(row.memberAgentRunId) !== string(row.runId)) {
        throw new Error("Retired task-Team row member_agent_run_id does not equal run_id.");
      }
      if (!legacy.finalMemberSegments?.length) {
        throw new Error("Retired task-Team row has no final member evidence.");
      }
    }
    const address = createTeamExecutionAddress({
      rootTeamRunId: storedRoot,
      taskTeamRunIds: legacy.taskTeamRunIds,
      memberAddress: createAgentTeamAddress(legacy.combinedMemberSegments),
      taskAgentRunId: legacy.taskAgentRunId,
    });
    return Object.freeze({
      kind: "RESOLVED" as const,
      row,
      finalRootTeamRunId: storedRoot,
      address,
      authority: legacy.taskTeamRunIds.length ? "RETIRED_ROW" as const : "DIRECT_ROW" as const,
      detail: detail(row, "SKIPPED", legacy.taskTeamRunIds.length
        ? "Validated self-contained retired task-Team ledger evidence."
        : "Validated direct Team ledger evidence."),
    });
  } catch (error) {
    return Object.freeze({
      kind: "PRESERVED_WARNING" as const,
      row,
      detail: detail(row, "FAILED", `Token identity is unresolved and remains unchanged: ${
        error instanceof Error ? error.message : String(error)
      }`),
    });
  }
};

export const invalidateConflictingTokenEvidence = (
  dispositions: readonly TeamRunV1TokenRowDisposition[],
): readonly TeamRunV1TokenRowDisposition[] => {
  const runIdsByAddress = new Map<string, Set<string>>();
  for (const disposition of dispositions) {
    if (disposition.kind !== "RESOLVED") continue;
    const key = JSON.stringify(disposition.address);
    const runIds = runIdsByAddress.get(key) ?? new Set<string>();
    runIds.add(disposition.row.runId);
    runIdsByAddress.set(key, runIds);
  }
  const conflicts = new Set(
    [...runIdsByAddress].filter(([, runIds]) => runIds.size > 1).map(([key]) => key),
  );
  if (!conflicts.size) return Object.freeze([...dispositions]);
  return Object.freeze(dispositions.map((disposition): TeamRunV1TokenRowDisposition => {
    if (disposition.kind !== "RESOLVED" || !conflicts.has(JSON.stringify(disposition.address))) {
      return disposition;
    }
    return Object.freeze({
      kind: "PRESERVED_WARNING" as const,
      row: disposition.row,
      detail: detail(
        disposition.row,
        "FAILED",
        "Token address group names more than one AgentRun; row remains unchanged.",
      ),
    });
  }));
};

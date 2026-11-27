import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { SEALED_JSONL_ROTATION_LIMIT_BYTES, SealedJsonlLog } from "../../utils/sealed-jsonl-log.js";
import type {
  DecisionLaunchSource,
  RoutingDecisionRecord,
  RoutingDecisionRecorder,
} from "../domain/model-routing-types.js";

/** The active file is sealed once it holds at least this many bytes (the message-log pattern). */
export const ROUTING_DECISION_LOG_ROTATION_LIMIT_BYTES = SEALED_JSONL_ROTATION_LIMIT_BYTES;
const SOURCES: ReadonlySet<DecisionLaunchSource> = new Set(["agent_default", "team_default", "model_router", "agent_history", "node_fallback", "inherited"]);

/** Which records a Decisions list shows: all, those the Model Router chose, or the others. */
export type DecisionSourceFilter = "router" | "not_router";

/** One delegation of a Task group: one copy, its agents' records. */
export type RoutingDecisionDelegation = Readonly<{
  recordedAt: string;
  delegatingRunId: string | null;
  delegatingAgentName: string | null;
  fromNode: string | null;
  copyAddress: string;
  copyKind: "agent" | "agent_team";
  records: readonly RoutingDecisionRecord[];
}>;

/** One Task with its delegations, newest first (design § SR-014 D1, D10). */
export type RoutingDecisionTaskGroup = Readonly<{
  taskId: string | null;
  taskKey: string | null;
  projectId: string | null;
  taskTitle: string;
  latestAt: string;
  delegations: readonly RoutingDecisionDelegation[];
}>;

export type RoutingDecisionPage = Readonly<{ groups: readonly RoutingDecisionTaskGroup[]; totalTasks: number }>;

const nullableString = (value: unknown): value is string | null => value === null || typeof value === "string";

const parseSkipped = (value: unknown): RoutingDecisionRecord["skipped"] | null => {
  if (!Array.isArray(value)) return null;
  const layers = value.map((item) => {
    const layer = item as Record<string, unknown> | null;
    if (!layer || (layer.layer !== "agent_default" && layer.layer !== "team_default") || typeof layer.detail !== "string"
      || !nullableString(layer.runtimeKind) || !nullableString(layer.llmModelIdentifier)) return null;
    return Object.freeze({ layer: layer.layer, runtimeKind: layer.runtimeKind, llmModelIdentifier: layer.llmModelIdentifier, detail: layer.detail });
  });
  return layers.every(Boolean) ? Object.freeze(layers as NonNullable<(typeof layers)[number]>[]) : null;
};

/** One line as a record; null (with the reason) when it is not one. */
const parseRecord = (value: unknown): RoutingDecisionRecord | string => {
  const record = value as Record<string, unknown> | null;
  if (!record || typeof record !== "object") return "not an object";
  for (const key of ["recordedAt", "taskTitle", "copyAddress", "agentAddress", "runtimeKind", "llmModelIdentifier"]) {
    if (typeof record[key] !== "string") return `${key} is not text`;
  }
  for (const key of ["taskId", "taskKey", "projectId", "delegatingRunId", "delegatingAgentName", "fromNode", "taskKind", "choiceReason", "routerFailure"]) {
    if (!nullableString(record[key])) return `${key} is not text or null`;
  }
  if (record.copyKind !== "agent" && record.copyKind !== "agent_team") return "copyKind is unknown";
  if (!SOURCES.has(record.source as DecisionLaunchSource)) return "source is unknown";
  const skipped = parseSkipped(record.skipped);
  if (!skipped) return "skipped is not a list of skipped defaults";
  return Object.freeze({
    recordedAt: record.recordedAt as string, taskId: record.taskId as string | null, taskKey: record.taskKey as string | null,
    projectId: record.projectId as string | null, taskTitle: record.taskTitle as string,
    delegatingRunId: record.delegatingRunId as string | null, delegatingAgentName: record.delegatingAgentName as string | null,
    fromNode: record.fromNode as string | null, copyAddress: record.copyAddress as string, copyKind: record.copyKind,
    agentAddress: record.agentAddress as string, runtimeKind: record.runtimeKind as string,
    llmModelIdentifier: record.llmModelIdentifier as string, source: record.source as DecisionLaunchSource,
    taskKind: record.taskKind as string | null, choiceReason: record.choiceReason as string | null,
    routerFailure: record.routerFailure as string | null, skipped,
  });
};

/** A record's Task: its ID; a peer's copy whose Task did not exist yet is its own group. */
const taskGroupKey = (record: RoutingDecisionRecord): string => record.taskId
  ? `task:${record.taskId}` : `delegation:${delegationKey(record)}`;
/** One delegation's records share their time, delegating run (or node) and copy. */
const delegationKey = (record: RoutingDecisionRecord): string =>
  `${record.recordedAt}\u0000${record.delegatingRunId ?? record.fromNode ?? ""}\u0000${record.copyAddress}`;

const matches = (record: RoutingDecisionRecord, filter: DecisionSourceFilter | null): boolean =>
  !filter || (filter === "router") === (record.source === "model_router");

/**
 * The node's decision log (REQ-012): one record per agent of a fresh delegated copy resolved here while Model Routing
 * was on, append-only in `<appData>/model-routing/` as `decisions_active.jsonl` plus sealed `decisions_NNNNNN.jsonl`
 * (the message-log pattern, A-24). A line counts only when its `\n` is present; an unreadable line is skipped with a
 * warning (DESIGN.md rule 7). The files are a `SealedJsonlLog`'s. Readers never parse files themselves.
 */
export class RoutingDecisionLog implements RoutingDecisionRecorder {
  private readonly log: SealedJsonlLog;

  constructor(options: Readonly<{ dir?: string; rotationLimitBytes?: number }> = {}) {
    this.log = new SealedJsonlLog({ dir: options.dir ?? path.join(appConfigProvider.config.getAppDataDir(), "model-routing"),
      baseName: "decisions", rotationLimitBytes: options.rotationLimitBytes ?? ROUTING_DECISION_LOG_ROTATION_LIMIT_BYTES });
  }

  /** Appends the records as one write (one delegation's records stay together). */
  record(records: readonly RoutingDecisionRecord[]): Promise<void> {
    return this.log.append(records);
  }

  /** Every readable record, oldest first. */
  async readAll(): Promise<readonly RoutingDecisionRecord[]> {
    const records: RoutingDecisionRecord[] = [];
    for (const name of await this.log.fileNames()) {
      (await this.log.completeLines(name)).forEach((line, index) => {
        let parsed: RoutingDecisionRecord | string;
        try { parsed = parseRecord(JSON.parse(line)); } catch { parsed = "not valid JSON"; }
        if (typeof parsed === "string") console.warn(`Model Routing: decision log ${name} line ${index + 1} is skipped (${parsed}).`);
        else records.push(parsed);
      });
    }
    return Object.freeze(records.sort((left, right) => left.recordedAt.localeCompare(right.recordedAt)));
  }

  /**
   * Task groups, newest delegation first (D1, D2): the source filter is applied before paging, so a group or delegation
   * with no matching record is left out. `before` (an ISO time) continues after the groups already shown.
   */
  async listTaskGroups(input: Readonly<{ before?: string | null; limit: number; source?: DecisionSourceFilter | null }>): Promise<RoutingDecisionPage> {
    const records = (await this.readAll()).filter((record) => matches(record, input.source ?? null));
    const groups = new Map<string, { group: Omit<RoutingDecisionTaskGroup, "delegations" | "latestAt">; delegations: Map<string, RoutingDecisionRecord[]> }>();
    for (const record of records) {
      const key = taskGroupKey(record);
      const entry = groups.get(key) ?? { group: { taskId: record.taskId, taskKey: record.taskKey, projectId: record.projectId, taskTitle: record.taskTitle }, delegations: new Map() };
      groups.set(key, entry);
      const delegation = entry.delegations.get(delegationKey(record)) ?? [];
      delegation.push(record);
      entry.delegations.set(delegationKey(record), delegation);
    }
    const ordered = [...groups.values()].map(({ group, delegations }): RoutingDecisionTaskGroup => {
      const list = [...delegations.values()].map((agents): RoutingDecisionDelegation => {
        const first = agents[0]!;
        return Object.freeze({ recordedAt: first.recordedAt, delegatingRunId: first.delegatingRunId, delegatingAgentName: first.delegatingAgentName,
          fromNode: first.fromNode, copyAddress: first.copyAddress, copyKind: first.copyKind, records: Object.freeze(agents) });
      }).sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
      return Object.freeze({ ...group, latestAt: list[0]!.recordedAt, delegations: Object.freeze(list) });
    }).sort((left, right) => right.latestAt.localeCompare(left.latestAt));
    const after = input.before ? ordered.filter((group) => group.latestAt < input.before!) : ordered;
    return Object.freeze({ groups: Object.freeze(after.slice(0, Math.max(0, input.limit))), totalTasks: ordered.length });
  }
}

import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type {
  DecisionLaunchSource,
  RoutingDecisionRecord,
  RoutingDecisionRecorder,
} from "../domain/model-routing-types.js";

/** The active file is sealed once it holds at least this many bytes (the message-log pattern). */
export const ROUTING_DECISION_LOG_ROTATION_LIMIT_BYTES = 4 * 1024 * 1024;
const BASE_NAME = "decisions";
const SEALED = new RegExp(`^${BASE_NAME}_(\\d{6})\\.jsonl$`);
const SOURCES: ReadonlySet<DecisionLaunchSource> = new Set(["agent_default", "team_default", "model_router", "inherited"]);

/** Which records a Decisions list shows: all, those the Model Router chose, or the others. */
export type DecisionSourceFilter = "router" | "not_router";

/** One delegation of a Task group: one copy, its agents' records. */
export type RoutingDecisionDelegation = Readonly<{
  recordedAt: string;
  delegatingRunId: string | null;
  delegatingAgentName: string;
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

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const nullableString = (value: unknown): value is string | null => value === null || typeof value === "string";

/** One line as a record; null (with the reason) when it is not one. */
const parseRecord = (value: unknown): RoutingDecisionRecord | string => {
  const record = value as Record<string, unknown> | null;
  if (!record || typeof record !== "object") return "not an object";
  for (const key of ["recordedAt", "taskTitle", "delegatingAgentName", "copyAddress", "agentAddress", "runtimeKind", "llmModelIdentifier"]) {
    if (typeof record[key] !== "string") return `${key} is not text`;
  }
  for (const key of ["taskId", "taskKey", "projectId", "delegatingRunId", "fromNode", "taskKind", "choiceReason", "routerFailure"]) {
    if (!nullableString(record[key])) return `${key} is not text or null`;
  }
  if (record.copyKind !== "agent" && record.copyKind !== "agent_team") return "copyKind is unknown";
  if (!SOURCES.has(record.source as DecisionLaunchSource)) return "source is unknown";
  if (!Array.isArray(record.notes) || record.notes.some((note) => typeof note !== "string")) return "notes are not texts";
  return Object.freeze({
    recordedAt: record.recordedAt as string, taskId: record.taskId as string | null, taskKey: record.taskKey as string | null,
    projectId: record.projectId as string | null, taskTitle: record.taskTitle as string,
    delegatingRunId: record.delegatingRunId as string | null, delegatingAgentName: record.delegatingAgentName as string,
    fromNode: record.fromNode as string | null, copyAddress: record.copyAddress as string, copyKind: record.copyKind,
    agentAddress: record.agentAddress as string, runtimeKind: record.runtimeKind as string,
    llmModelIdentifier: record.llmModelIdentifier as string, source: record.source as DecisionLaunchSource,
    taskKind: record.taskKind as string | null, choiceReason: record.choiceReason as string | null,
    routerFailure: record.routerFailure as string | null, notes: Object.freeze([...(record.notes as string[])]),
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
 * warning (DESIGN.md rule 7). Appends are serialized in this process. Readers never parse files themselves.
 */
export class RoutingDecisionLog implements RoutingDecisionRecorder {
  private readonly dir: string;
  private writes: Promise<void> = Promise.resolve();

  constructor(options: Readonly<{ dir?: string; rotationLimitBytes?: number }> = {}) {
    this.dir = options.dir ?? path.join(appConfigProvider.config.getAppDataDir(), "model-routing");
    this.rotationLimitBytes = options.rotationLimitBytes ?? ROUTING_DECISION_LOG_ROTATION_LIMIT_BYTES;
  }

  private readonly rotationLimitBytes: number;

  private get activePath(): string { return path.join(this.dir, `${BASE_NAME}_active.jsonl`); }

  /** Appends the records as one write (one delegation's records stay together). */
  record(records: readonly RoutingDecisionRecord[]): Promise<void> {
    if (!records.length) return Promise.resolve();
    const text = records.map((record) => `${JSON.stringify(record)}\n`).join("");
    const write = this.writes.then(() => this.append(text));
    this.writes = write.catch(() => undefined);
    return write;
  }

  /** Every readable record, oldest first. */
  async readAll(): Promise<readonly RoutingDecisionRecord[]> {
    const names = await fs.readdir(this.dir).catch((error: unknown) => {
      if (isMissing(error)) return [] as string[];
      throw error;
    });
    const files = [...names.filter((name) => SEALED.test(name)).sort(), ...(names.includes(path.basename(this.activePath)) ? [path.basename(this.activePath)] : [])];
    const records: RoutingDecisionRecord[] = [];
    for (const name of files) {
      const lines = (await fs.readFile(path.join(this.dir, name), "utf8")).split("\n");
      lines.pop(); // the text after the last `\n` is an unfinished line
      lines.forEach((line, index) => {
        if (!line.trim()) return;
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

  private async append(text: string): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const handle = await fs.open(this.activePath, "a+");
    try {
      // An unfinished last line (a write that never returned) is cut off before the next one.
      const { size } = await handle.stat();
      if (size > 0) {
        const last = Buffer.alloc(1);
        await handle.read(last, 0, 1, size - 1);
        if (last[0] !== 0x0a) {
          const content = await handle.readFile("utf8");
          await handle.truncate(Buffer.byteLength(content.slice(0, content.lastIndexOf("\n") + 1)));
        }
      }
      await handle.appendFile(text, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    if ((await fs.stat(this.activePath)).size >= this.rotationLimitBytes) await this.rotate();
  }

  private async rotate(): Promise<void> {
    const names = await fs.readdir(this.dir);
    const last = names.map((name) => SEALED.exec(name)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b).at(-1) ?? 0;
    await fs.rename(this.activePath, path.join(this.dir, `${BASE_NAME}_${String(last + 1).padStart(6, "0")}.jsonl`));
  }
}

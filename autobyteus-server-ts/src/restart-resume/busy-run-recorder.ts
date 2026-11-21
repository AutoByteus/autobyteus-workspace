import type { AgentRunManager } from "../agent-execution/services/agent-run-manager.js";
import { busyStatusOf, inspectBackgroundWork } from "../agent-execution/services/busy-runs.js";
import type { ActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { removeBusyRunRecord, writeBusyRunRecord, type BusyRunEntry } from "./busy-run-record.js";

/** How often the live record is checked for a change (a crash loses at most this much). */
const BUSY_RUN_RECORD_INTERVAL_MS = 2_000;
/** The longest the graceful final write waits for the runs that answer only through their background-task view (Codex). */
const BACKGROUND_TASK_INSPECTION_BUDGET_MS = 1_000;


/**
 * Keeps the node's live list of runs to tell after a restart (autobyteus-448 DS-001): the runs held by a collaboration
 * root (DEC-005 of autobyteus-285: no application-owned runs) that are mid-turn or have a running background task.
 * `startSession()` checks the list every 2 s and rewrites `busy-runs.json` only when it changed (removing it when
 * empty), so the record is at most 2 s old after a crash. `record()`, at a graceful stop, stops the checks, takes a
 * final list (Codex idle runs asked through their background-task view, bounded) and writes it with `shutdownAt`.
 * Nothing is written before `startSession()`: the previous session's record is taken first. It never throws.
 */
export class BusyRunRecorder {
  private timer: NodeJS.Timeout | null = null;
  private started = false;
  private finished = false;
  /** The last written list (without `recordedAt`); an absent record is the empty list. */
  private written = "[]";
  private writing: Promise<void> | null = null;

  constructor(private readonly dependencies: Readonly<{
    liveRuns: Pick<AgentRunManager, "listActiveRuns" | "getActiveRun">;
    roots: Pick<ActiveCollaborationRootDirectory, "placeOf">;
    recordPath: string;
    version: () => string | null;
    now?: () => Date;
    intervalMs?: number;
    inspectionBudgetMs?: number;
  }>) {}

  startSession(): void {
    if (this.started) return;
    this.started = true;
    this.timer = setInterval(() => this.tick(), this.dependencies.intervalMs ?? BUSY_RUN_RECORD_INTERVAL_MS);
    this.timer.unref();
  }

  /** The graceful end of the session: the final list, with `shutdownAt`. Waits for a write in progress. */
  async record(): Promise<void> {
    if (!this.started || this.finished) return;
    this.finished = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    try {
      await this.writing;
      const entries = await this.withInspectedBackgroundTasks(this.entries());
      const shutdownAt = this.now().toISOString();
      if (entries.length) await writeBusyRunRecord(this.dependencies.recordPath, { entries, shutdownAt });
      else await removeBusyRunRecord(this.dependencies.recordPath);
      if (entries.length) console.info(`Recorded ${entries.length} busy run(s) for the restart reminder`);
    } catch (error) {
      console.warn(`Busy runs could not be recorded for the restart reminder: ${String(error)}`);
    }
  }

  /** One check: writes only when the list changed; a check during a write is skipped. */
  private tick(): void {
    if (this.finished || this.writing) return;
    try {
      const entries = this.entries();
      const key = keyOf(entries);
      if (key === this.written) return;
      const write = entries.length
        ? writeBusyRunRecord(this.dependencies.recordPath, { entries, shutdownAt: null })
        : removeBusyRunRecord(this.dependencies.recordPath);
      this.writing = write.then(
        () => { this.written = key; },
        (error) => console.warn(`The busy-run record could not be updated: ${String(error)}`),
      ).finally(() => { this.writing = null; });
    } catch (error) {
      console.warn(`The busy-run record could not be updated: ${String(error)}`);
    }
  }

  private entries(): BusyRunEntry[] {
    const recordedAt = this.now().toISOString();
    const version = this.dependencies.version();
    return [...this.dependencies.liveRuns.listActiveRuns()].sort().flatMap((agentRunId) => {
      const run = this.dependencies.liveRuns.getActiveRun(agentRunId);
      if (!run) return [];
      const { status, backgroundTasks, busy } = busyStatusOf(run);
      if (!busy || (status !== "initializing" && status !== "running" && status !== "idle")) return [];
      const placed = this.dependencies.roots.placeOf(agentRunId);
      if (!placed) return [];
      return [Object.freeze({ root: placed.root, agentRunId, place: placed.place, status, backgroundTasks, recordedAt, version })];
    });
  }

  /**
   * Adds the idle runs whose runtime reports background tasks only through its background-task view (Codex), asked
   * all at once and bounded; a run that does not answer in time is not added.
   */
  private async withInspectedBackgroundTasks(entries: BusyRunEntry[]): Promise<BusyRunEntry[]> {
    const listed = new Set(entries.map((entry) => entry.agentRunId));
    const recordedAt = this.now().toISOString();
    const version = this.dependencies.version();
    const candidates = [...this.dependencies.liveRuns.listActiveRuns()].sort().flatMap((agentRunId) => {
      const run = this.dependencies.liveRuns.getActiveRun(agentRunId);
      if (listed.has(agentRunId) || !run || run.getStatusSnapshot().status !== "idle") return [];
      const placed = this.dependencies.roots.placeOf(agentRunId);
      return placed ? [{ agentRunId, run, placed }] : [];
    });
    const observed = await inspectBackgroundWork(candidates.map(c => c.run), this.dependencies.inspectionBudgetMs ?? BACKGROUND_TASK_INSPECTION_BUDGET_MS);
    return [...entries, ...candidates.flatMap(({ agentRunId, placed, run }) => observed.get(run) === "running"
      ? [Object.freeze({ root: placed.root, agentRunId, place: placed.place, status: "idle" as const, backgroundTasks: true, recordedAt, version })] : [])];
  }

  private now(): Date {
    return this.dependencies.now?.() ?? new Date();
  }
}

/** The list as compared between checks: everything but `recordedAt`, in a stable order. */
const keyOf = (entries: readonly BusyRunEntry[]): string =>
  JSON.stringify(entries.map(({ recordedAt: _recordedAt, ...rest }) => rest));

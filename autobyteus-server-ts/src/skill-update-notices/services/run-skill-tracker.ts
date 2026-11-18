import path from "node:path";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentRunActivationKind } from "../../agent-execution/domain/agent-run-lifecycle-observer.js";
import type { ResolvedSkill, SeenSkillVersions, SkillFolderSnapshot } from "../domain/skill-update-notice-types.js";
import type { SeenSkillVersionsStore } from "../providers/seen-skill-versions-store.js";
import type { SkillFolderSnapshotter } from "../providers/skill-folder-snapshotter.js";

/**
 * How a run's skills are found: its agent definition (read by ID when the run is tracked, null when it no longer
 * exists) and the definition's effective skills through the current catalog (`ALL_INSTALLED` and application
 * bundles included), as its runtime resolves them at activation.
 */
export type RunSkillResolution = Readonly<{
  readDefinition(run: AgentRun): Promise<AgentDefinition | null>;
  resolveSkills(definition: AgentDefinition | null): readonly ResolvedSkill[];
}>;

/** The skill names a definition change gave or took from a run (in `skillDirs` terms). */
export type RunSkillNameChanges = Readonly<{ added: readonly string[]; removed: readonly string[] }>;

/** One tracked run: its current definition, the skill names it uses, the folder each resolves to now, and what it has seen. */
export type TrackedRun = {
  readonly run: AgentRun;
  readonly activationKind: AgentRunActivationKind;
  /** The run's agent definition now (replaced on every definition change). */
  definition: AgentDefinition | null;
  /** Skill name → the folder it resolves to now for this run (null: it no longer resolves). */
  readonly skillDirs: Map<string, string | null>;
  /** Skill name → its description, as last resolved (for the "now available" notice). */
  readonly descriptions: Map<string, string>;
  readonly seen: Map<string, SkillFolderSnapshot>;
};

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

/**
 * Tracks which skills each active or restored run uses (those of its current definition), the folder
 * each resolves to now (the watch set), and the versions the run has seen. It is the only writer of
 * seen versions.
 *
 * - A **new** run was just given the current skills: their snapshots are recorded as seen.
 * - A **restored** run keeps the record in its memory folder, because its conversation still holds
 *   what it saw then: it hears what changed since. Skills it saw that no longer resolve stay tracked
 *   (it is told they are gone); skills it uses now but never saw stay unseen (it is told they are
 *   available). A missing record is re-created from current files (no retroactive notice).
 * - A **definition change** replaces the run's definition (`applyDefinition`).
 */
export const DEFAULT_SEEN_VERSIONS_RETRY_DELAYS_MS: readonly number[] = [1_000, 5_000, 15_000, 60_000];

type RunWrites = {
  /** The run's writes, one after another. */
  chain: Promise<void>;
  /** A write is waiting for the run's memory folder to exist (retried on a timer). */
  retry: NodeJS.Timeout | null;
  retryAttempt: number;
};

export class RunSkillTracker {
  private readonly runs = new Map<string, TrackedRun>();
  private readonly tracking = new Map<string, Readonly<{ run: AgentRun; promise: Promise<TrackedRun | null> }>>();
  private readonly writes = new Map<TrackedRun, RunWrites>();
  private readonly inFlight = new Set<Promise<unknown>>();
  private readonly retryDelaysMs: readonly number[];
  private closed = false;

  constructor(private readonly deps: Readonly<{
    resolution: RunSkillResolution;
    snapshotter: Pick<SkillFolderSnapshotter, "snapshot">;
    store: Pick<SeenSkillVersionsStore, "read" | "write" | "forget">;
    /** Delays between attempts to write a record whose memory folder does not exist yet (the last repeats). */
    seenVersionsRetryDelaysMs?: readonly number[];
  }>) {
    this.retryDelaysMs = deps.seenVersionsRetryDelaysMs ?? DEFAULT_SEEN_VERSIONS_RETRY_DELAYS_MS;
  }

  /** Starts tracking a published run. Resolves when its used skills and seen versions are known. */
  trackRun(run: AgentRun, activationKind: AgentRunActivationKind): Promise<TrackedRun | null> {
    const existing = this.tracking.get(run.runId);
    if (existing && existing.run === run) return existing.promise;
    if (this.closed) return Promise.resolve(null);
    const promise = this.loadRun(run, activationKind).catch((error) => {
      logger.warn(`SKILL_UPDATE_TRACKING_FAILED:${run.runId}: ${String(error)}`);
      return null;
    });
    this.tracking.set(run.runId, { run, promise });
    this.hold(promise);
    return promise;
  }

  /** The tracked run once its tracking has completed (null when it is not tracked). */
  whenTracked(runId: string): Promise<TrackedRun | null> {
    return this.tracking.get(runId)?.promise ?? Promise.resolve(null);
  }

  getTrackedRun(runId: string): TrackedRun | null {
    return this.runs.get(runId) ?? null;
  }

  /**
   * Stops tracking a released run. Nothing more is written for it from now on: a write in
   * progress stops before its next step, and a waiting retry is cancelled (the run may be deleted
   * next, and its memory folder must not come back).
   */
  untrackRun(run: AgentRun): void {
    const tracked = this.runs.get(run.runId);
    if (tracked && tracked.run !== run) return;
    if (this.tracking.get(run.runId)?.run === run) this.tracking.delete(run.runId);
    if (tracked) {
      this.runs.delete(run.runId);
      this.cancelRetry(tracked);
      this.writes.delete(tracked);
    }
    this.deps.store.forget({ runId: run.runId, memoryDir: run.config.memoryDir });
  }

  /** Stops all tracking and waits for tracking and writes in progress to finish or stop. */
  async close(): Promise<void> {
    this.closed = true;
    for (const tracked of this.runs.values()) this.cancelRetry(tracked);
    this.runs.clear();
    this.tracking.clear();
    this.writes.clear();
    while (this.inFlight.size > 0) await Promise.allSettled([...this.inFlight]);
  }

  /** Each tracked run with the names it uses whose current folder is one of these. */
  runsWithSkillsAt(skillDirs: ReadonlySet<string>): Array<Readonly<{ tracked: TrackedRun; names: string[] }>> {
    return [...this.runs.values()].flatMap((tracked) => {
      const names = [...tracked.skillDirs.entries()].flatMap(([name, dir]) => dir && skillDirs.has(dir) ? [name] : []);
      return names.length > 0 ? [{ tracked, names }] : [];
    });
  }

  /** Every tracked run, once the tracking of each run published so far has completed. */
  async trackedRuns(): Promise<TrackedRun[]> {
    await Promise.all([...this.tracking.values()].map((entry) => entry.promise));
    return [...this.runs.values()];
  }

  /** Whether this tracked run is still tracked (not released, not closed). */
  isCurrent(tracked: TrackedRun): boolean {
    return !this.closed && this.runs.get(tracked.run.runId) === tracked;
  }

  /**
   * Gives a tracked run its definition now and re-resolves its skills by name:
   * - **added**: a name that resolves now and had no folder before (absent from `skillDirs`, or null);
   * - **removed**: a name that had a folder before and no longer resolves (its folder becomes null).
   * A name that resolved before and still does keeps its folder here; a moved folder is the watcher's
   * (`refreshSkillDirs`). Whether the run hears anything is decided at delivery, against what it saw.
   */
  applyDefinition(runId: string, definition: AgentDefinition): RunSkillNameChanges {
    const tracked = this.runs.get(runId);
    if (!tracked) return { added: [], removed: [] };
    const resolved = new Map(this.deps.resolution.resolveSkills(definition).map((skill) => [skill.name, skill] as const));
    tracked.definition = definition;
    const added: string[] = [];
    const removed: string[] = [];
    for (const [name, skill] of resolved) {
      tracked.descriptions.set(name, skill.description);
      if ((tracked.skillDirs.get(name) ?? null) !== null) continue;
      tracked.skillDirs.set(name, path.resolve(skill.rootPath));
      added.push(name);
    }
    for (const [name, dir] of tracked.skillDirs) {
      if (dir !== null && !resolved.has(name)) {
        tracked.skillDirs.set(name, null);
        removed.push(name);
      }
    }
    return { added, removed };
  }

  /**
   * Re-resolves a run's used skill names through its current definition (a name may now resolve to a
   * new folder, such as a new GitHub source generation, or not at all: no longer installed).
   * Returns the names whose folder changed.
   */
  refreshSkillDirs(runId: string): string[] {
    const tracked = this.runs.get(runId);
    if (!tracked) return [];
    const resolved = new Map(this.deps.resolution.resolveSkills(tracked.definition)
      .map((skill) => [skill.name, path.resolve(skill.rootPath)] as const));
    const moved: string[] = [];
    for (const [name, dir] of tracked.skillDirs) {
      const next = resolved.get(name) ?? null;
      if (next !== dir) {
        tracked.skillDirs.set(name, next);
        moved.push(name);
      }
    }
    return moved;
  }

  /** The folders of every skill name a tracked run uses that resolves now (the watch set). */
  watchedSkillDirs(): string[] {
    const dirs = new Set<string>();
    for (const tracked of this.runs.values()) {
      for (const dir of tracked.skillDirs.values()) if (dir) dirs.add(dir);
    }
    return [...dirs].sort();
  }

  /** Records what a run was just given (a delivered notice): updated snapshots and removed names. */
  async recordSeen(runId: string, snapshots: readonly SkillFolderSnapshot[], removedNames: readonly string[]): Promise<void> {
    const tracked = this.runs.get(runId);
    if (!tracked) return;
    for (const snapshot of snapshots) tracked.seen.set(snapshot.skillName, snapshot);
    for (const name of removedNames) tracked.seen.delete(name);
    await this.persist(tracked);
  }

  private async loadRun(run: AgentRun, activationKind: AgentRunActivationKind): Promise<TrackedRun | null> {
    const definition = await this.deps.resolution.readDefinition(run);
    const used = this.deps.resolution.resolveSkills(definition);
    const current = new Map<string, SkillFolderSnapshot>();
    const descriptions = new Map<string, string>();
    for (const skill of used) {
      descriptions.set(skill.name, skill.description);
      const snapshot = await this.deps.snapshotter.snapshot(skill);
      if (snapshot) current.set(skill.name, snapshot);
    }
    const owner = { runId: run.runId, memoryDir: run.config.memoryDir };
    const stored = activationKind === "new" ? null : await this.deps.store.read(owner);
    // A restored run's record is what it saw; without one (or for a new run) it has seen its current skills.
    const seen = new Map<string, SkillFolderSnapshot>(stored ?? current);
    const skillDirs = new Map<string, string | null>();
    for (const name of [...current.keys(), ...(stored ? stored.keys() : [])]) {
      skillDirs.set(name, current.get(name)?.skillDir ?? null);
    }
    if (this.closed || this.tracking.get(run.runId)?.run !== run) return null; // released meanwhile
    const tracked: TrackedRun = { run, activationKind, definition, skillDirs, descriptions, seen };
    this.runs.set(run.runId, tracked);
    void this.persist(tracked);
    return tracked;
  }

  /**
   * Writes the run's record after any write before it. A record whose memory folder does not
   * exist yet (the runtime creates it with its first trace) is retried on a timer while the run
   * is tracked; the store never creates the folder.
   */
  private persist(tracked: TrackedRun): Promise<void> {
    const writes = this.writesOf(tracked);
    this.cancelRetry(tracked);
    const next = writes.chain.then(() => this.writeNow(tracked));
    writes.chain = next;
    this.hold(next);
    return next;
  }

  private async writeNow(tracked: TrackedRun): Promise<void> {
    if (!this.isCurrent(tracked)) return;
    let result: Awaited<ReturnType<SeenSkillVersionsStore["write"]>>;
    try {
      result = await this.deps.store.write({ runId: tracked.run.runId, memoryDir: tracked.run.config.memoryDir },
        new Map(tracked.seen) as SeenSkillVersions, () => this.isCurrent(tracked));
    } catch (error) {
      logger.warn(`SEEN_SKILL_VERSIONS_WRITE_FAILED:${tracked.run.runId}: ${String(error)}`);
      return;
    }
    const writes = this.writes.get(tracked);
    if (!writes || !this.isCurrent(tracked)) return;
    if (result === "written") {
      writes.retryAttempt = 0;
      return;
    }
    if (result !== "folder_missing" || writes.retry) return;
    const delays = this.retryDelaysMs;
    const delay = delays[Math.min(writes.retryAttempt, delays.length - 1)] ?? 60_000;
    writes.retryAttempt += 1;
    writes.retry = setTimeout(() => {
      writes.retry = null;
      if (this.isCurrent(tracked)) void this.persist(tracked);
    }, delay);
    writes.retry.unref?.();
  }

  private writesOf(tracked: TrackedRun): RunWrites {
    let writes = this.writes.get(tracked);
    if (!writes) {
      writes = { chain: Promise.resolve(), retry: null, retryAttempt: 0 };
      this.writes.set(tracked, writes);
    }
    return writes;
  }

  private cancelRetry(tracked: TrackedRun): void {
    const writes = this.writes.get(tracked);
    if (writes?.retry) {
      clearTimeout(writes.retry);
      writes.retry = null;
    }
  }

  /** Keeps a promise until it settles, so `close()` can wait for it. */
  private hold(promise: Promise<unknown>): void {
    this.inFlight.add(promise);
    void promise.finally(() => { this.inFlight.delete(promise); }).catch(() => undefined);
  }
}

import path from "node:path";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentRunActivationKind } from "../../agent-execution/domain/agent-run-lifecycle-observer.js";
import type { ResolvedSkill, SeenSkillVersions, SkillFolderSnapshot } from "../domain/skill-update-notice-types.js";
import type { SeenSkillVersionsStore } from "../providers/seen-skill-versions-store.js";
import type { SkillFolderSnapshotter } from "../providers/skill-folder-snapshotter.js";

/**
 * Resolves the skills a run uses, exactly as its runtime resolved them at activation (from its
 * agent definition through the skill catalog, `ALL_INSTALLED` and application bundles included).
 */
export type RunUsedSkillsResolver = (run: AgentRun) => Promise<readonly ResolvedSkill[]>;

/** One tracked run: the skill names it uses, the folder each resolves to now, and what it has seen. */
export type TrackedRun = {
  readonly run: AgentRun;
  readonly activationKind: AgentRunActivationKind;
  /** Skill name → the folder it resolves to now for this run (null: it no longer resolves). */
  readonly skillDirs: Map<string, string | null>;
  readonly seen: Map<string, SkillFolderSnapshot>;
};

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

/**
 * Tracks which skills each active or restored run uses, the folder each resolves to now (the
 * watch set), and the versions the run has seen. It is the only writer of seen versions.
 *
 * - A **new** run was just given the current skills: their snapshots are recorded as seen.
 * - A **restored** run keeps the record in its memory folder, because its conversation still holds
 *   what it saw then. Skills it saw that no longer resolve stay tracked (it is told they are gone);
 *   skills it uses now but never saw are recorded as seen (its runtime just advertised them). A
 *   missing record is re-created from current files (no retroactive notice).
 */
export class RunSkillTracker {
  private readonly runs = new Map<string, TrackedRun>();
  private readonly tracking = new Map<string, Promise<TrackedRun | null>>();

  constructor(private readonly deps: Readonly<{
    resolveUsedSkills: RunUsedSkillsResolver;
    snapshotter: Pick<SkillFolderSnapshotter, "snapshot">;
    store: Pick<SeenSkillVersionsStore, "read" | "write" | "forget">;
  }>) {}

  /** Starts tracking a published run. Resolves when its used skills and seen versions are known. */
  trackRun(run: AgentRun, activationKind: AgentRunActivationKind): Promise<TrackedRun | null> {
    const existing = this.tracking.get(run.runId);
    if (existing) return existing;
    const tracking = this.loadRun(run, activationKind).catch((error) => {
      logger.warn(`SKILL_UPDATE_TRACKING_FAILED:${run.runId}: ${String(error)}`);
      return null;
    });
    this.tracking.set(run.runId, tracking);
    return tracking;
  }

  /** The tracked run once its tracking has completed (null when it is not tracked). */
  whenTracked(runId: string): Promise<TrackedRun | null> {
    return this.tracking.get(runId) ?? Promise.resolve(null);
  }

  getTrackedRun(runId: string): TrackedRun | null {
    return this.runs.get(runId) ?? null;
  }

  untrackRun(run: AgentRun): void {
    const tracked = this.runs.get(run.runId);
    if (tracked && tracked.run !== run) return;
    this.runs.delete(run.runId);
    this.tracking.delete(run.runId);
    this.deps.store.forget({ runId: run.runId, memoryDir: run.config.memoryDir });
  }

  /** Each tracked run with the names it uses whose current folder is one of these. */
  runsWithSkillsAt(skillDirs: ReadonlySet<string>): Array<Readonly<{ tracked: TrackedRun; names: string[] }>> {
    return [...this.runs.values()].flatMap((tracked) => {
      const names = [...tracked.skillDirs.entries()].flatMap(([name, dir]) => dir && skillDirs.has(dir) ? [name] : []);
      return names.length > 0 ? [{ tracked, names }] : [];
    });
  }

  /**
   * Re-resolves a run's used skill names (a name may now resolve to a new folder, such as a new
   * GitHub source generation, or not at all). Returns the names whose folder changed.
   */
  async refreshSkillDirs(runId: string): Promise<string[]> {
    const tracked = this.runs.get(runId);
    if (!tracked) return [];
    const resolved = new Map((await this.deps.resolveUsedSkills(tracked.run))
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
    const used = await this.deps.resolveUsedSkills(run);
    const current = new Map<string, SkillFolderSnapshot>();
    for (const skill of used) {
      const snapshot = await this.deps.snapshotter.snapshot(skill);
      if (snapshot) current.set(skill.name, snapshot);
    }
    const owner = { runId: run.runId, memoryDir: run.config.memoryDir };
    const stored = activationKind === "new" ? null : await this.deps.store.read(owner);
    const seen = new Map<string, SkillFolderSnapshot>(stored ?? []);
    for (const [name, snapshot] of current) if (!seen.has(name)) seen.set(name, snapshot);
    const skillDirs = new Map<string, string | null>();
    for (const name of [...current.keys(), ...(stored ? stored.keys() : [])]) {
      skillDirs.set(name, current.get(name)?.skillDir ?? null);
    }
    if (!this.tracking.has(run.runId)) return null; // released meanwhile
    const tracked: TrackedRun = { run, activationKind, skillDirs, seen };
    this.runs.set(run.runId, tracked);
    await this.persist(tracked);
    return tracked;
  }

  private async persist(tracked: TrackedRun): Promise<void> {
    try {
      await this.deps.store.write({ runId: tracked.run.runId, memoryDir: tracked.run.config.memoryDir },
        new Map(tracked.seen) as SeenSkillVersions);
    } catch (error) {
      logger.warn(`SEEN_SKILL_VERSIONS_WRITE_FAILED:${tracked.run.runId}: ${String(error)}`);
    }
  }
}

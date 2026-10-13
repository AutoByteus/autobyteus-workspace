import { randomUUID } from "node:crypto";
import path from "node:path";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentRunInputPreface, AgentRunPreface } from "../../agent-execution/domain/agent-run-input-preface.js";
import type { AgentRunActivationKind, AgentRunLifecycleObserver } from "../../agent-execution/domain/agent-run-lifecycle-observer.js";
import type { AgentRunInputLifecycle } from "../../agent-execution/input/agent-run-input-contract.js";
import { SKILL_UPDATE_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";
import type { SkillChange, SkillFolderSnapshot } from "../domain/skill-update-notice-types.js";
import type { SkillFolderSnapshotter } from "../providers/skill-folder-snapshotter.js";
import type { SkillFolderWatcher } from "../monitor/skill-folder-watcher.js";
import type { RunSkillTracker, TrackedRun } from "./run-skill-tracker.js";
import { diffSkillVersion } from "./skill-version-diff.js";
import {
  buildSkillUpdateNoticeEvent,
  buildSkillUpdateNoticeMessage,
  buildSkillUpdateNoticeText,
} from "./skill-update-notice-builder.js";

/**
 * What a run should hear about some changed skill names: the notice text (null: nothing it needs
 * to hear) and what the run will have seen once that is settled.
 */
type ComputedNotice = Readonly<{
  text: string | null;
  snapshots: readonly SkillFolderSnapshot[];
  removedNames: readonly string[];
}>;

type RunNoticeState = {
  /** Used skill names that changed since the run last saw them, not yet delivered. */
  dirty: Set<string>;
  /** A notice handed to a dispatch or posted, until its delivery settles. */
  inFlight: { id: string; notice: ComputedNotice; names: ReadonlySet<string> } | null;
};

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

/**
 * Tells runs that a skill they use changed on disk (the governing owner of DS-002/DS-003).
 *
 * - **Busy** runs (a turn in progress) get one notice now, through `AgentRun.postUserMessage`,
 *   the call agent messages use: inside the current turn where the runtime appends, otherwise
 *   as the next turn, exactly as an agent message.
 * - **Idle and restored** runs are only marked; the notice is combined into the provider message
 *   of their next external input (one turn) through the `AgentRunInputPreface` port.
 *
 * What a run hears is always the difference between the versions it saw and the files now, by
 * skill name (re-resolved for the run the way its runtime resolves it), so a burst yields one
 * notice and a revert or identical save none.
 * A failed delivery keeps the change pending for the run's next input (REQ-013).
 */
export class SkillUpdateNoticeService implements AgentRunInputPreface, AgentRunLifecycleObserver {
  private readonly states = new Map<string, RunNoticeState>();
  private readonly unsubscribeWatcher: () => void;
  private closed = false;

  constructor(private readonly deps: Readonly<{
    tracker: RunSkillTracker;
    watcher: Pick<SkillFolderWatcher, "onSettledChange" | "syncWatchedFolders">;
    snapshotter: Pick<SkillFolderSnapshotter, "snapshot">;
  }>) {
    this.unsubscribeWatcher = deps.watcher.onSettledChange((dirs) => { void this.onSkillFoldersChanged(dirs); });
  }

  // --- run lifecycle (AgentRunLifecycleObserver) ---

  runPublished(run: AgentRun, activationKind: AgentRunActivationKind): void {
    if (this.closed) return;
    void this.deps.tracker.trackRun(run, activationKind).then((tracked) => {
      if (!tracked || this.closed) return;
      // A restored run is checked against what it saw before (changes made while it was stopped).
      if (activationKind !== "new") for (const name of tracked.skillDirs.keys()) this.stateOf(run.runId).dirty.add(name);
      this.syncWatchSet();
    });
  }

  runReleased(run: AgentRun): void {
    if (this.deps.tracker.getTrackedRun(run.runId)?.run !== run) {
      // Not (yet) tracked: drop a tracking that is still in progress.
      void this.deps.tracker.whenTracked(run.runId).then((tracked) => {
        if (tracked?.run === run) this.untrack(run);
      });
      return;
    }
    this.untrack(run);
  }

  // --- the next external input (AgentRunInputPreface) ---

  async takePreface(run: AgentRun): Promise<AgentRunPreface | null> {
    if (this.closed) return null;
    // A restored run's first input waits for its check against what it saw before.
    const tracked = await this.deps.tracker.whenTracked(run.runId);
    if (!tracked || tracked.run !== run) return null;
    const state = this.states.get(run.runId);
    if (!state || state.dirty.size === 0 || state.inFlight) return null;
    const names = new Set(state.dirty);
    const notice = await this.computeNotice(tracked, names);
    for (const name of names) state.dirty.delete(name);
    if (notice.text === null) {
      await this.recordDelivered(run.runId, notice);
      return null;
    }
    const id = randomUUID();
    state.inFlight = { id, notice, names };
    return Object.freeze({
      id,
      text: notice.text,
      presentation: Object.freeze({ senderId: SKILL_UPDATE_NOTICE_SENDER_ID, content: notice.text }),
    });
  }

  prefaceDelivered(run: AgentRun, preface: AgentRunPreface, _turnId: string | null): void {
    const state = this.states.get(run.runId);
    if (!state?.inFlight || state.inFlight.id !== preface.id) return;
    const { notice } = state.inFlight;
    state.inFlight = null;
    void this.recordDelivered(run.runId, notice);
  }

  prefaceReturned(run: AgentRun, preface: AgentRunPreface): void {
    const state = this.states.get(run.runId);
    if (!state?.inFlight || state.inFlight.id !== preface.id) return;
    for (const name of state.inFlight.names) state.dirty.add(name);
    state.inFlight = null;
  }

  // --- skill folder changes (DS-002) ---

  async onSkillFoldersChanged(skillDirs: readonly string[]): Promise<void> {
    if (this.closed) return;
    const dirs = new Set(skillDirs.map((dir) => path.resolve(dir)));
    const affected: string[] = [];
    for (const { tracked, names } of this.deps.tracker.runsWithSkillsAt(dirs)) {
      const runId = tracked.run.runId;
      // Re-resolve the run's skills by name: a moved folder (a new GitHub source generation) is
      // the same skill with a new path; a name that no longer resolves is gone.
      let moved: string[] = [];
      try {
        moved = await this.deps.tracker.refreshSkillDirs(runId);
      } catch (error) {
        logger.warn(`SKILL_UPDATE_RESOLVE_FAILED:${runId}: ${String(error)}`);
      }
      const state = this.stateOf(runId);
      for (const name of [...names, ...moved]) state.dirty.add(name);
      affected.push(runId);
    }
    this.syncWatchSet();
    await Promise.all(affected.map((runId) => this.deliverIfBusy(runId)));
  }

  /** Stops listening; runs keep any pending notice in memory only for as long as this process lives. */
  close(): void {
    this.closed = true;
    this.unsubscribeWatcher();
    this.states.clear();
  }

  /** Sends a busy run its notice now through the agent-message path; an idle run stays marked. */
  private async deliverIfBusy(runId: string): Promise<void> {
    const tracked = this.deps.tracker.getTrackedRun(runId);
    const state = this.states.get(runId);
    if (!tracked || !state || state.dirty.size === 0 || state.inFlight) return;
    if (tracked.run.getStatusSnapshot().status !== "running") return;
    const names = new Set(state.dirty);
    const notice = await this.computeNotice(tracked, names);
    if (state.inFlight || this.deps.tracker.getTrackedRun(runId)?.run !== tracked.run) return;
    for (const name of names) state.dirty.delete(name);
    if (notice.text === null) {
      await this.recordDelivered(runId, notice);
      return;
    }
    const text = notice.text;
    const id = randomUUID();
    state.inFlight = { id, notice, names };
    const settle = (delivered: boolean, turnId: string | null): void => {
      if (state.inFlight?.id !== id) return;
      state.inFlight = null;
      if (!delivered) {
        for (const name of names) state.dirty.add(name);
        return;
      }
      void tracked.run.publishEvent(buildSkillUpdateNoticeEvent(runId, text, turnId))
        .catch((error) => logger.warn(`SKILL_UPDATE_NOTICE_EVENT_FAILED:${runId}: ${String(error)}`));
      void this.recordDelivered(runId, notice).then(() => this.deliverIfBusy(runId));
    };
    try {
      const result = await tracked.run.postUserMessage(buildSkillUpdateNoticeMessage(text), {
        lifecycleObserver: (fact: AgentRunInputLifecycle) => {
          if (fact.kind === "forwarded") settle(true, fact.turnId);
          else if (fact.kind === "failed" || fact.kind === "cancelled") settle(false, null);
        },
      });
      if (!result.accepted) settle(false, null);
    } catch (error) {
      logger.warn(`SKILL_UPDATE_NOTICE_POST_FAILED:${runId}: ${String(error)}`);
      settle(false, null);
    }
  }

  /**
   * What the run should hear about these names, diffing the versions it saw against the files
   * in the folder each name resolves to now. Unchanged versions in a new folder are recorded
   * without a notice.
   */
  private async computeNotice(tracked: TrackedRun, names: ReadonlySet<string>): Promise<ComputedNotice> {
    const changes: SkillChange[] = [];
    const snapshots: SkillFolderSnapshot[] = [];
    const removedNames: string[] = [];
    for (const name of [...names].sort()) {
      let current: SkillFolderSnapshot | null = null;
      const dir = tracked.skillDirs.get(name) ?? null;
      try {
        current = dir ? await this.deps.snapshotter.snapshot({ name, rootPath: dir }) : null;
      } catch (error) {
        logger.warn(`SKILL_UPDATE_SNAPSHOT_FAILED:${name}: ${String(error)}`);
        continue;
      }
      const change = diffSkillVersion(name, tracked.seen.get(name), current);
      if (change) changes.push(change);
      if (change?.kind === "removed") removedNames.push(name);
      else if (current) snapshots.push(current);
    }
    return Object.freeze({ text: changes.length > 0 ? buildSkillUpdateNoticeText(changes) : null, snapshots, removedNames });
  }

  private async recordDelivered(runId: string, notice: ComputedNotice): Promise<void> {
    await this.deps.tracker.recordSeen(runId, notice.snapshots, notice.removedNames);
  }

  private untrack(run: AgentRun): void {
    this.deps.tracker.untrackRun(run);
    this.states.delete(run.runId);
    this.syncWatchSet();
  }

  private stateOf(runId: string): RunNoticeState {
    let state = this.states.get(runId);
    if (!state) {
      state = { dirty: new Set(), inFlight: null };
      this.states.set(runId, state);
    }
    return state;
  }

  private syncWatchSet(): void {
    try {
      this.deps.watcher.syncWatchedFolders(this.deps.tracker.watchedSkillDirs());
    } catch (error) {
      logger.warn("SKILL_UPDATE_WATCH_SYNC_FAILED", error);
    }
  }
}

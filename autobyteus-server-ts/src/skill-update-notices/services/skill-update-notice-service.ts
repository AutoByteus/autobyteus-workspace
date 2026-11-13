import { randomUUID } from "node:crypto";
import path from "node:path";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentRunInputPreface, AgentRunPreface } from "../../agent-execution/domain/agent-run-input-preface.js";
import type { AgentRunActivationKind, AgentRunLifecycleObserver } from "../../agent-execution/domain/agent-run-lifecycle-observer.js";
import type { AgentRunInputLifecycle } from "../../agent-execution/input/agent-run-input-contract.js";
import { SKILL_UPDATE_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";
import type { IntegrationRunAccess } from "../../credential-proxy/integration-run-access.js";
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
  /**
   * Skill names a definition change gave the run while it was active: the run was prepared without them, so an
   * integration they grant may not be held yet. (A name the run hears about at restore came with its activation.)
   */
  addedWhileActive: Set<string>;
};

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

/**
 * Tells runs that a skill they use changed: on disk, or in their agent definition (added or no longer
 * available). It also drives the setup of a skill added to a running agent's definition, before the
 * notice (`AgentRun.applyDefinitionSkills`): the same sequence the tool list updates own for tools.
 *
 * - On every agent definition change, one coalesced pass re-reads each tracked run's definition by
 *   ID; the tracker reports the names added and removed; an added name is set up on the run's
 *   runtime first (a failure is logged), then the names are marked for the run.
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
  /** Restored runs whose check against what they saw before is still being prepared. */
  private readonly restoring = new Set<AgentRun>();
  private readonly unsubscribeWatcher: () => void;
  private passRunning: Promise<void> | null = null;
  private passRequested = false;
  private closed = false;

  constructor(private readonly deps: Readonly<{
    tracker: RunSkillTracker;
    watcher: Pick<SkillFolderWatcher, "onSettledChange" | "syncWatchedFolders">;
    snapshotter: Pick<SkillFolderSnapshotter, "snapshot">;
    agentDefinitionService: Readonly<{ getAgentDefinitionById(definitionId: string): Promise<AgentDefinition | null> }>;
    /** Which integrations an added skill grants that the run does not hold yet (`null`: this host has none). */
    integrationRunAccess: Pick<IntegrationRunAccess, "integrationsStartingOnRestart"> | null;
  }>) {
    this.unsubscribeWatcher = deps.watcher.onSettledChange((dirs) => { void this.onSkillFoldersChanged(dirs); });
  }

  // --- run lifecycle (AgentRunLifecycleObserver) ---

  runPublished(run: AgentRun, activationKind: AgentRunActivationKind): void {
    if (this.closed) return;
    // Only a restored run can have a notice waiting for its first input; a new run was just given
    // the current skills, so its inputs never wait for its tracking.
    if (activationKind !== "new") this.restoring.add(run);
    void this.deps.tracker.trackRun(run, activationKind).then((tracked) => {
      if (!tracked || this.closed) return;
      // A restored run is checked against what it saw before (changes made while it was stopped).
      if (activationKind !== "new") for (const name of tracked.skillDirs.keys()) this.stateOf(run.runId).dirty.add(name);
      this.syncWatchSet();
    }).finally(() => { this.restoring.delete(run); });
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

  /** Any dispatch kind can carry a skill notice: the runtime reads skill files when it needs them. */
  async takePreface(run: AgentRun): Promise<AgentRunPreface | null> {
    if (this.closed) return null;
    // A restored run's first input waits for its check against what it saw before; any other
    // input is only carried a notice that is already pending.
    if (this.restoring.has(run)) await this.deps.tracker.whenTracked(run.runId);
    const tracked = this.deps.tracker.getTrackedRun(run.runId);
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
        moved = this.deps.tracker.refreshSkillDirs(runId);
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

  // --- agent definition changes (DS-001) ---

  /**
   * One coalesced pass over the tracked runs per change: a change during a pass asks for exactly
   * one more pass after it, so a burst of saves applies each run's latest definition once or twice.
   */
  onDefinitionsChanged(): Promise<void> {
    if (this.closed) return Promise.resolve();
    if (this.passRunning) {
      this.passRequested = true;
      return this.passRunning;
    }
    const pass = (async () => {
      do {
        this.passRequested = false;
        await this.applyToTrackedRuns();
      } while (this.passRequested && !this.closed);
    })().finally(() => { this.passRunning = null; });
    this.passRunning = pass;
    return pass;
  }

  /**
   * Stops listening and waits for a definition pass in progress; runs keep any pending notice in
   * memory only for as long as this process lives.
   */
  async close(): Promise<void> {
    this.closed = true;
    this.unsubscribeWatcher();
    this.states.clear();
    this.restoring.clear();
    await this.passRunning;
  }

  private async applyToTrackedRuns(): Promise<void> {
    // Runs whose tracking is still in progress are included once it completes.
    for (const tracked of await this.deps.tracker.trackedRuns()) {
      if (this.closed) return;
      if (!this.deps.tracker.isCurrent(tracked)) continue;
      await this.applyToRun(tracked);
    }
  }

  private async applyToRun(tracked: TrackedRun): Promise<void> {
    const { run } = tracked;
    let definition: AgentDefinition | null;
    try {
      definition = await this.deps.agentDefinitionService.getAgentDefinitionById(run.config.agentDefinitionId);
    } catch (error) {
      logger.warn(`SKILL_UPDATE_DEFINITION_READ_FAILED:${run.runId}: ${String(error)}`);
      return;
    }
    // A definition that no longer exists leaves the run with the skills it has.
    if (!definition || !this.deps.tracker.isCurrent(tracked)) return;
    let changes: ReturnType<RunSkillTracker["applyDefinition"]>;
    try {
      changes = this.deps.tracker.applyDefinition(run.runId, definition);
    } catch (error) {
      logger.warn(`SKILL_UPDATE_RESOLVE_FAILED:${run.runId}: ${String(error)}`);
      return;
    }
    if (changes.added.length === 0 && changes.removed.length === 0) return;
    // Set up first, so the runtime has the skill when the agent hears about it; a failure never stops the notice.
    if (changes.added.length > 0 && run.isActive()) {
      try {
        await run.applyDefinitionSkills(definition);
      } catch (error) {
        logger.warn(`SKILL_UPDATE_SETUP_FAILED:${run.runId}: ${String(error)}`);
      }
    }
    if (this.closed || !this.deps.tracker.isCurrent(tracked)) return;
    const state = this.stateOf(run.runId);
    for (const name of changes.added) state.addedWhileActive.add(name);
    for (const name of [...changes.added, ...changes.removed]) state.dirty.add(name);
    this.syncWatchSet();
    await this.deliverIfBusy(run.runId);
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
    const addedWhileActive = this.states.get(tracked.run.runId)?.addedWhileActive;
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
      const versionChange = diffSkillVersion(name, tracked.seen.get(name), current);
      const change: SkillChange | null = versionChange?.kind === "added"
        ? {
            ...versionChange,
            description: tracked.descriptions.get(name) ?? "",
            integrationNames: addedWhileActive?.has(name) ? await this.integrationsStartingOnRestart(tracked, name) : [],
          }
        : versionChange;
      if (change) changes.push(change);
      if (change?.kind === "removed") removedNames.push(name);
      else if (current) snapshots.push(current);
    }
    return Object.freeze({ text: changes.length > 0 ? buildSkillUpdateNoticeText(changes) : null, snapshots, removedNames });
  }

  /** The integrations an added skill grants whose access the run does not hold yet; a failed read names none. */
  private async integrationsStartingOnRestart(tracked: TrackedRun, skillName: string): Promise<readonly string[]> {
    if (!this.deps.integrationRunAccess) return [];
    const { run } = tracked;
    try {
      return await this.deps.integrationRunAccess.integrationsStartingOnRestart(
        { runId: run.runId, agentDefinitionId: run.config.agentDefinitionId }, [skillName]);
    } catch (error) {
      logger.warn(`SKILL_UPDATE_INTEGRATION_READ_FAILED:${run.runId}: ${String(error)}`);
      return [];
    }
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
      state = { dirty: new Set(), inFlight: null, addedWhileActive: new Set() };
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

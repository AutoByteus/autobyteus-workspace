import { randomUUID } from "node:crypto";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type {
  AgentRunInputPreface,
  AgentRunPreface,
  AgentRunPrefaceContext,
} from "../../agent-execution/domain/agent-run-input-preface.js";
import type { AgentRunActivationKind, AgentRunLifecycleObserver } from "../../agent-execution/domain/agent-run-lifecycle-observer.js";
import type { AgentRunInputLifecycle } from "../../agent-execution/input/agent-run-input-contract.js";
import { TOOL_LIST_UPDATE_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";
import type { SeenToolNamesStore } from "../providers/seen-tool-names-store.js";
import { diffToolNames } from "./tool-list-diff.js";
import {
  buildToolListUpdateNoticeEvent,
  buildToolListUpdateNoticeMessage,
  buildToolListUpdateNoticeText,
} from "./tool-list-update-notice-builder.js";

export const DEFAULT_SEEN_TOOL_NAMES_RETRY_DELAYS_MS: readonly number[] = [1_000, 5_000, 15_000, 60_000];

/** One tracked run: what it saw, what it has (or will have at its next turn start) and its notice state. */
type TrackedRun = {
  readonly run: AgentRun;
  /** The tool names the run was last told about (its seen record). */
  seen: readonly string[];
  /** The tool names the agent has now, or will have at its next turn start. */
  current: readonly string[];
  /** Its runtime takes the change only at the next turn start (a reopen): so does the notice. */
  waitForTurnStart: boolean;
  /** A notice handed to a dispatch or posted, until its delivery settles. */
  inFlight: { id: string; toolNames: readonly string[] } | null;
  /** The run's seen-record writes, one after another, and a retry waiting for its memory folder. */
  writes: { chain: Promise<void>; retry: NodeJS.Timeout | null; retryAttempt: number };
};

type ToolListUpdateServiceDeps = Readonly<{
  agentDefinitionService: Readonly<{
    getAgentDefinitionById(definitionId: string): Promise<AgentDefinition | null>;
  }>;
  store: Pick<SeenToolNamesStore, "read" | "write" | "forget">;
  /** Delays between attempts to write a record whose memory folder does not exist yet (the last repeats). */
  seenToolNamesRetryDelaysMs?: readonly number[];
}>;

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

/**
 * Gives running agents the tools their definition has now (the governing owner of DS-001/DS-005).
 *
 * On every agent definition change, each tracked run's own definition is re-read by ID and handed
 * to `AgentRun.applyDefinitionTools`; the runtime says which tool names the agent has (or will
 * have at its next turn start). What the agent hears is the difference between the names it was
 * last told about and those, so a revert or a save without tool changes yields nothing.
 *
 * - A run whose runtime took the change at once and is **busy** gets the notice now, through
 *   `AgentRun.postUserMessage`, as skill notices do.
 * - Otherwise the notice is combined into its next external input through the
 *   `AgentRunInputPreface` port. A run waiting for a reopen (Codex, Grok) gets it only with a
 *   turn-start dispatch, the one that reopens its runtime session.
 * - A restored run whose record differs from its tools hears what changed with its first input.
 */
export class ToolListUpdateService implements AgentRunInputPreface, AgentRunLifecycleObserver {
  private readonly runs = new Map<string, TrackedRun>();
  /** Runs whose tracking (reading their seen record) is still in progress. */
  private readonly tracking = new Map<string, Readonly<{ run: AgentRun; promise: Promise<TrackedRun | null> }>>();
  private readonly inFlightWork = new Set<Promise<unknown>>();
  private readonly retryDelaysMs: readonly number[];
  private passRunning: Promise<void> | null = null;
  private passRequested = false;
  private closed = false;

  constructor(private readonly deps: ToolListUpdateServiceDeps) {
    this.retryDelaysMs = deps.seenToolNamesRetryDelaysMs ?? DEFAULT_SEEN_TOOL_NAMES_RETRY_DELAYS_MS;
  }

  // --- run lifecycle (AgentRunLifecycleObserver) ---

  runPublished(run: AgentRun, activationKind: AgentRunActivationKind): void {
    if (this.closed) return;
    const existing = this.tracking.get(run.runId);
    if (existing?.run === run) return;
    // The entry exists before tracking starts, so tracking can tell whether the run was released meanwhile.
    let settleTracking!: (tracked: TrackedRun | null) => void;
    const promise = new Promise<TrackedRun | null>((resolve) => { settleTracking = resolve; });
    this.tracking.set(run.runId, { run, promise });
    this.hold(promise);
    void this.trackRun(run, activationKind).then(settleTracking, (error: unknown) => {
      logger.warn(`TOOL_LIST_UPDATE_TRACKING_FAILED:${run.runId}: ${String(error)}`);
      settleTracking(null);
    });
  }

  runReleased(run: AgentRun): void {
    if (this.tracking.get(run.runId)?.run === run) this.tracking.delete(run.runId);
    const tracked = this.runs.get(run.runId);
    if (tracked && tracked.run !== run) return;
    if (tracked) {
      this.runs.delete(run.runId);
      this.cancelRetry(tracked);
    }
    this.deps.store.forget({ runId: run.runId, memoryDir: run.config.memoryDir });
  }

  // --- the next external input (AgentRunInputPreface) ---

  async takePreface(run: AgentRun, context: AgentRunPrefaceContext): Promise<AgentRunPreface | null> {
    if (this.closed) return null;
    // A restored run's first input waits for its check against what it saw before.
    const pending = this.tracking.get(run.runId);
    if (pending?.run === run) await pending.promise;
    const tracked = this.runs.get(run.runId);
    if (!tracked || tracked.run !== run || tracked.inFlight) return null;
    // The agent gets its new tools at a turn start only: so does the notice.
    if (tracked.waitForTurnStart && context.dispatchKind !== "start_turn") return null;
    const diff = diffToolNames(tracked.seen, tracked.current);
    if (!diff) return null;
    const id = randomUUID();
    const text = buildToolListUpdateNoticeText(diff);
    tracked.inFlight = { id, toolNames: tracked.current };
    return Object.freeze({
      id,
      text,
      presentation: Object.freeze({ senderId: TOOL_LIST_UPDATE_NOTICE_SENDER_ID, content: text }),
    });
  }

  prefaceDelivered(run: AgentRun, preface: AgentRunPreface, _turnId: string | null): void {
    const tracked = this.runs.get(run.runId);
    if (!tracked || tracked.run !== run || tracked.inFlight?.id !== preface.id) return;
    const { toolNames } = tracked.inFlight;
    tracked.inFlight = null;
    // Delivered with a turn start: the runtime now has the names it was given at the reopen.
    tracked.waitForTurnStart = false;
    this.recordSeen(tracked, toolNames);
  }

  prefaceReturned(run: AgentRun, preface: AgentRunPreface): void {
    const tracked = this.runs.get(run.runId);
    if (!tracked || tracked.run !== run || tracked.inFlight?.id !== preface.id) return;
    tracked.inFlight = null;
  }

  // --- definition changes (DS-001) ---

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
    const run = (async () => {
      do {
        this.passRequested = false;
        await this.applyToTrackedRuns();
      } while (this.passRequested && !this.closed);
    })().finally(() => { this.passRunning = null; });
    this.passRunning = run;
    this.hold(run);
    return run;
  }

  /** Stops listening and waits for passes, tracking and record writes in progress to finish or stop. */
  async close(): Promise<void> {
    this.closed = true;
    for (const tracked of this.runs.values()) this.cancelRetry(tracked);
    this.runs.clear();
    this.tracking.clear();
    while (this.inFlightWork.size > 0) await Promise.allSettled([...this.inFlightWork]);
  }

  private async applyToTrackedRuns(): Promise<void> {
    // Runs whose tracking is still in progress are included once it completes.
    await Promise.all([...this.tracking.values()].map((entry) => entry.promise));
    for (const tracked of [...this.runs.values()]) {
      if (this.closed) return;
      if (!this.isCurrent(tracked)) continue;
      await this.applyToRun(tracked);
    }
  }

  private async applyToRun(tracked: TrackedRun): Promise<void> {
    const { run } = tracked;
    let definition: AgentDefinition | null;
    try {
      definition = await this.deps.agentDefinitionService.getAgentDefinitionById(run.config.agentDefinitionId);
    } catch (error) {
      logger.warn(`TOOL_LIST_UPDATE_DEFINITION_READ_FAILED:${run.runId}: ${String(error)}`);
      return;
    }
    // A definition that no longer exists leaves the run with the tools it has.
    if (!definition || !this.isCurrent(tracked)) return;
    let result: Awaited<ReturnType<AgentRun["applyDefinitionTools"]>>;
    try {
      result = await run.applyDefinitionTools(definition);
    } catch (error) {
      logger.warn(`TOOL_LIST_UPDATE_APPLY_FAILED:${run.runId}: ${String(error)}`);
      return;
    }
    if (!this.isCurrent(tracked)) return;
    tracked.current = Object.freeze([...result.toolNames]);
    if (result.kind === "on_next_turn") tracked.waitForTurnStart = true;
    else if (result.kind === "applied") tracked.waitForTurnStart = false;
    if (result.kind === "applied") await this.deliverIfBusy(tracked);
  }

  /** Sends a busy run its notice now through the agent-message path; an idle run waits for its next input. */
  private async deliverIfBusy(tracked: TrackedRun): Promise<void> {
    const { run } = tracked;
    if (tracked.inFlight || tracked.waitForTurnStart) return;
    if (run.getStatusSnapshot().status !== "running") return;
    const diff = diffToolNames(tracked.seen, tracked.current);
    if (!diff) return;
    const text = buildToolListUpdateNoticeText(diff);
    const id = randomUUID();
    const toolNames = tracked.current;
    tracked.inFlight = { id, toolNames };
    const settle = (delivered: boolean, turnId: string | null): void => {
      if (tracked.inFlight?.id !== id) return;
      tracked.inFlight = null;
      if (!delivered || !this.isCurrent(tracked)) return;
      void run.publishEvent(buildToolListUpdateNoticeEvent(run.runId, text, turnId))
        .catch((error) => logger.warn(`TOOL_LIST_UPDATE_NOTICE_EVENT_FAILED:${run.runId}: ${String(error)}`));
      this.recordSeen(tracked, toolNames);
      // A change that arrived while this notice was on its way.
      void this.deliverIfBusy(tracked);
    };
    try {
      const result = await run.postUserMessage(buildToolListUpdateNoticeMessage(text), {
        lifecycleObserver: (fact: AgentRunInputLifecycle) => {
          if (fact.kind === "forwarded") settle(true, fact.turnId);
          else if (fact.kind === "failed" || fact.kind === "cancelled") settle(false, null);
        },
      });
      if (!result.accepted) settle(false, null);
    } catch (error) {
      logger.warn(`TOOL_LIST_UPDATE_NOTICE_POST_FAILED:${run.runId}: ${String(error)}`);
      settle(false, null);
    }
  }

  /**
   * A **new** run was just given its current tools: they are its seen record. A **restored** run
   * keeps the record from when it last ran; its first input hears what changed since. A restored
   * run without a record is treated as having seen its current tools (no retroactive notice).
   */
  private async trackRun(run: AgentRun, activationKind: AgentRunActivationKind): Promise<TrackedRun | null> {
    const current = Object.freeze([...run.getToolNames()]);
    const owner = { runId: run.runId, memoryDir: run.config.memoryDir };
    const stored = activationKind === "new" ? null : await this.deps.store.read(owner);
    if (this.closed || this.tracking.get(run.runId)?.run !== run) return null; // released meanwhile
    const tracked: TrackedRun = {
      run,
      seen: stored ?? current,
      current,
      waitForTurnStart: false,
      inFlight: null,
      writes: { chain: Promise.resolve(), retry: null, retryAttempt: 0 },
    };
    this.runs.set(run.runId, tracked);
    this.tracking.delete(run.runId);
    if (!stored) this.recordSeen(tracked, current);
    return tracked;
  }

  private recordSeen(tracked: TrackedRun, toolNames: readonly string[]): void {
    tracked.seen = Object.freeze([...toolNames]);
    void this.persist(tracked);
  }

  /**
   * Writes the run's record after any write before it. A record whose memory folder does not
   * exist yet (the runtime creates it with its first trace) is retried on a timer while the run
   * is tracked; the store never creates the folder.
   */
  private persist(tracked: TrackedRun): Promise<void> {
    this.cancelRetry(tracked);
    const next = tracked.writes.chain.then(() => this.writeNow(tracked));
    tracked.writes.chain = next;
    this.hold(next);
    return next;
  }

  private async writeNow(tracked: TrackedRun): Promise<void> {
    if (!this.isCurrent(tracked)) return;
    let result: Awaited<ReturnType<SeenToolNamesStore["write"]>>;
    try {
      result = await this.deps.store.write(
        { runId: tracked.run.runId, memoryDir: tracked.run.config.memoryDir },
        tracked.seen,
        () => this.isCurrent(tracked),
      );
    } catch (error) {
      logger.warn(`SEEN_TOOL_NAMES_WRITE_FAILED:${tracked.run.runId}: ${String(error)}`);
      return;
    }
    if (!this.isCurrent(tracked)) return;
    if (result === "written") {
      tracked.writes.retryAttempt = 0;
      return;
    }
    if (result !== "folder_missing" || tracked.writes.retry) return;
    const delays = this.retryDelaysMs;
    const delay = delays[Math.min(tracked.writes.retryAttempt, delays.length - 1)] ?? 60_000;
    tracked.writes.retryAttempt += 1;
    tracked.writes.retry = setTimeout(() => {
      tracked.writes.retry = null;
      if (this.isCurrent(tracked)) void this.persist(tracked);
    }, delay);
    tracked.writes.retry.unref?.();
  }

  private cancelRetry(tracked: TrackedRun): void {
    if (tracked.writes.retry) {
      clearTimeout(tracked.writes.retry);
      tracked.writes.retry = null;
    }
  }

  private isCurrent(tracked: TrackedRun): boolean {
    return !this.closed && this.runs.get(tracked.run.runId) === tracked;
  }

  /** Keeps a promise until it settles, so `close()` can wait for it. */
  private hold(promise: Promise<unknown>): void {
    this.inFlightWork.add(promise);
    void promise.finally(() => { this.inFlightWork.delete(promise); }).catch(() => undefined);
  }
}

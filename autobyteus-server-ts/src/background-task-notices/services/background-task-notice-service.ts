import { randomUUID } from "node:crypto";
import type { BackgroundTaskEnd } from "autobyteus-ts";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type {
  AgentRunInputPreface,
  AgentRunPreface,
  AgentRunPrefaceContext,
} from "../../agent-execution/domain/agent-run-input-preface.js";
import type { AgentRunActivationKind, AgentRunLifecycleObserver } from "../../agent-execution/domain/agent-run-lifecycle-observer.js";
import type { AgentRunInputLifecycle } from "../../agent-execution/input/agent-run-input-contract.js";
import { BACKGROUND_TASK_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";
import {
  buildBackgroundTaskNoticeEvent,
  buildBackgroundTaskNoticeMessage,
  buildBackgroundTaskNoticeText,
} from "./background-task-notice-builder.js";

/** How long an idle run waits for more ends before its notice is delivered (REQ-004). */
export const DEFAULT_BACKGROUND_TASK_NOTICE_SETTLE_MS = 2_000;

/**
 * One tracked run (DS-006). `pending`: an end was recorded, waiting for the run to be idle; `settling`: idle, the
 * settle timer runs; `inFlight`: a notice is on its way and `held` are its ends, until delivered.
 */
type TrackedRun = {
  readonly run: AgentRun;
  state: "idle" | "pending" | "settling" | "inFlight";
  /** Ends taken from the run but not yet delivered: the service is their only holder. */
  held: readonly BackgroundTaskEnd[];
  inFlightId: string | null;
  /** An end arrived while a notice was in flight: the next flush takes it. */
  endedWhileInFlight: boolean;
  timer: NodeJS.Timeout | null;
  unsubscribe: () => void;
};

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

/**
 * Delivers background-task completion notices to native runs (DS-004): the governing owner of when a notice goes
 * out and what it carries. An end of a run's background task schedules a flush; a busy run waits for its turn to
 * end; an idle run waits a short settle period so near-simultaneous ends arrive together; the flush takes every
 * unreported end (ends the agent's own run_bash already reported are gone) and posts one SYSTEM notice, which
 * starts a turn on the idle run. If an external input comes first, the notice rides on it as its preface.
 * A notice that is not delivered keeps its ends for the next one; a cancelled one or a released run drops them.
 */
export class BackgroundTaskNoticeService implements AgentRunInputPreface, AgentRunLifecycleObserver {
  private readonly runs = new Map<string, TrackedRun>();
  private readonly settleMs: number;
  private closed = false;

  constructor(options: Readonly<{ settleMs?: number }> = {}) {
    this.settleMs = options.settleMs ?? DEFAULT_BACKGROUND_TASK_NOTICE_SETTLE_MS;
  }

  // --- run lifecycle (AgentRunLifecycleObserver) ---

  /** Every activation starts with nothing to report: a restored run's commands did not survive (448 tells it). */
  runPublished(run: AgentRun, _activationKind: AgentRunActivationKind): void {
    if (this.closed || !run.backgroundTaskNoticesSupported || this.runs.get(run.runId)?.run === run) return;
    this.untrack(this.runs.get(run.runId));
    const tracked: TrackedRun = {
      run, state: "idle", held: [], inFlightId: null, endedWhileInFlight: false, timer: null, unsubscribe: () => {},
    };
    this.runs.set(run.runId, tracked);
    tracked.unsubscribe = run.subscribeToEvents((event) => this.onEvent(tracked, event));
  }

  runReleased(run: AgentRun): void {
    const tracked = this.runs.get(run.runId);
    if (tracked?.run === run) this.untrack(tracked);
  }

  // --- the next external input (AgentRunInputPreface) ---

  async takePreface(run: AgentRun, _context: AgentRunPrefaceContext): Promise<AgentRunPreface | null> {
    const tracked = this.current(run);
    if (!tracked || (tracked.state !== "pending" && tracked.state !== "settling")) return null;
    const ends = this.takeEnds(tracked);
    if (ends.length === 0) return null;
    const text = buildBackgroundTaskNoticeText(ends, run.listRunningBackgroundTasks());
    const id = this.goInFlight(tracked, ends);
    return Object.freeze({ id, text, presentation: Object.freeze({ senderId: BACKGROUND_TASK_NOTICE_SENDER_ID, content: text }) });
  }

  /** The run publishes the system notice of a delivered preface itself. */
  prefaceDelivered(run: AgentRun, preface: AgentRunPreface): void {
    const tracked = this.current(run);
    if (tracked?.inFlightId === preface.id) this.delivered(tracked);
  }

  prefaceReturned(run: AgentRun, preface: AgentRunPreface): void {
    const tracked = this.current(run);
    if (tracked?.inFlightId === preface.id) this.returned(tracked);
  }

  close(): void {
    this.closed = true;
    for (const tracked of [...this.runs.values()]) this.untrack(tracked);
  }

  // --- DS-006 ---

  private onEvent(tracked: TrackedRun, event: AgentRunEvent): void {
    if (!this.isCurrent(tracked)) return;
    if (event.eventType === AgentRunEventType.BACKGROUND_TASK_UPDATED && event.payload.status !== "running") {
      if (tracked.state === "inFlight") tracked.endedWhileInFlight = true;
      else if (tracked.state === "idle") tracked.state = "pending";
      this.settleIfIdle(tracked);
    } else if (event.eventType === AgentRunEventType.AGENT_STATUS) {
      this.settleIfIdle(tracked);
    }
  }

  /** A pending run that is idle starts its settle period; a busy one waits for its next status change. */
  private settleIfIdle(tracked: TrackedRun): void {
    if (tracked.state !== "pending" || tracked.run.getStatusSnapshot().status !== "idle") return;
    tracked.state = "settling";
    tracked.timer = setTimeout(() => {
      tracked.timer = null;
      void this.flush(tracked);
    }, this.settleMs);
    tracked.timer.unref?.();
  }

  private async flush(tracked: TrackedRun): Promise<void> {
    if (!this.isCurrent(tracked) || tracked.state !== "settling") return;
    const { run } = tracked;
    if (run.getStatusSnapshot().status !== "idle") {
      tracked.state = "pending";
      return;
    }
    const ends = this.takeEnds(tracked);
    if (ends.length === 0) {
      tracked.state = "idle";
      return;
    }
    const text = buildBackgroundTaskNoticeText(ends, run.listRunningBackgroundTasks());
    const id = this.goInFlight(tracked, ends);
    const settle = (fact: "forwarded" | "returned" | "cancelled", turnId: string | null = null): void => {
      if (!this.isCurrent(tracked) || tracked.inFlightId !== id) return;
      if (fact === "forwarded") {
        void run.publishEvent(buildBackgroundTaskNoticeEvent(run.runId, text, turnId))
          .catch((error) => logger.warn(`BACKGROUND_TASK_NOTICE_EVENT_FAILED:${run.runId}: ${String(error)}`));
        this.delivered(tracked);
      } else if (fact === "returned") {
        this.returned(tracked);
      } else {
        tracked.held = [];
        this.afterInFlight(tracked);
      }
    };
    try {
      const result = await run.postUserMessage(buildBackgroundTaskNoticeMessage(text), {
        lifecycleObserver: (fact: AgentRunInputLifecycle) => {
          if (fact.kind === "forwarded") settle("forwarded", fact.turnId);
          else if (fact.kind === "failed") settle("returned");
          else if (fact.kind === "cancelled") settle("cancelled");
        },
      });
      if (!result.accepted) settle("returned");
    } catch (error) {
      logger.warn(`BACKGROUND_TASK_NOTICE_POST_FAILED:${run.runId}: ${String(error)}`);
      settle("returned");
    }
  }

  private takeEnds(tracked: TrackedRun): BackgroundTaskEnd[] {
    if (tracked.timer) clearTimeout(tracked.timer);
    tracked.timer = null;
    const ends = [...tracked.held, ...tracked.run.takeUnreportedBackgroundTaskEnds()];
    tracked.held = [];
    if (ends.length === 0) tracked.state = "idle";
    return ends;
  }

  private goInFlight(tracked: TrackedRun, ends: readonly BackgroundTaskEnd[]): string {
    const id = randomUUID();
    tracked.state = "inFlight";
    tracked.inFlightId = id;
    tracked.held = ends;
    tracked.endedWhileInFlight = false;
    return id;
  }

  private delivered(tracked: TrackedRun): void {
    tracked.held = [];
    this.afterInFlight(tracked);
  }

  /** Not delivered: its ends wait for the next notice, merged with newer ones. */
  private returned(tracked: TrackedRun): void {
    tracked.inFlightId = null;
    tracked.state = "pending";
    this.settleIfIdle(tracked);
  }

  private afterInFlight(tracked: TrackedRun): void {
    tracked.inFlightId = null;
    tracked.state = tracked.endedWhileInFlight ? "pending" : "idle";
    tracked.endedWhileInFlight = false;
    this.settleIfIdle(tracked);
  }

  private untrack(tracked: TrackedRun | undefined): void {
    if (!tracked) return;
    if (tracked.timer) clearTimeout(tracked.timer);
    tracked.unsubscribe();
    if (this.runs.get(tracked.run.runId) === tracked) this.runs.delete(tracked.run.runId);
  }

  private current(run: AgentRun): TrackedRun | null {
    const tracked = this.runs.get(run.runId);
    return tracked && tracked.run === run && !this.closed ? tracked : null;
  }

  private isCurrent(tracked: TrackedRun): boolean {
    return !this.closed && this.runs.get(tracked.run.runId) === tracked;
  }
}

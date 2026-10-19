import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import { AgentRunEventType, isAgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { AgentRunMemoryRecorder } from "../../agent-memory/services/agent-run-memory-recorder.js";
import type { WorkJournalTarget } from "../domain/work-journal-models.js";
import type { WorkJournalService } from "./work-journal-service.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

/** A turn's records are complete, or a compaction closed the raw file. */
const UPDATE_EVENTS: ReadonlySet<AgentRunEventType> = new Set([
  AgentRunEventType.TURN_COMPLETED,
  AgentRunEventType.TURN_INTERRUPTED,
  AgentRunEventType.COMPACTION_STATUS,
]);

type RunState = {
  target: WorkJournalTarget;
  running: Promise<void> | null;
  pending: boolean;
  detached: boolean;
};

const noop = (): void => undefined;

/**
 * Keeps a live run's journal current (DS-001): one update per turn end or compaction, bursts
 * merged into at most one more, after the memory recorder has written the turn's records.
 * Journal errors are logged and never reach the run.
 */
export class WorkJournalRunUpdater {
  private readonly states = new Map<string, RunState>();

  constructor(private readonly deps: {
    memoryRecorder: Pick<AgentRunMemoryRecorder, "waitForIdle">;
    journalService: Pick<WorkJournalService, "ensureCurrent">;
  }) {}

  attachToRun(run: AgentRun): () => void {
    const memoryDir = run.config.memoryDir?.trim();
    if (!memoryDir) return noop;
    const state: RunState = {
      target: { runId: run.runId, memoryDir, runtimeKind: run.runtimeKind },
      running: null,
      pending: false,
      detached: false,
    };
    this.states.set(run.runId, state);
    const unsubscribe = run.subscribeToEvents((event) => {
      if (isAgentRunEvent(event) && UPDATE_EVENTS.has(event.eventType)) this.schedule(state);
    });
    return () => {
      unsubscribe();
      state.detached = true;
      if (this.states.get(run.runId) === state) this.states.delete(run.runId);
    };
  }

  /** Resolves when the run's scheduled updates have finished (tests and orderly shutdown). */
  async waitForIdle(runId: string): Promise<void> {
    const state = this.states.get(runId);
    while (state?.running) await state.running;
  }

  private schedule(state: RunState): void {
    if (state.running) {
      state.pending = true;
      return;
    }
    // Called from the event listener: `update` asks the recorder for its queue synchronously, so
    // the records the recorder enqueued for this same event are included (N1).
    state.running = this.update(state).finally(() => {
      state.running = null;
      // An event that arrived after the loop's last check.
      if (state.pending && !state.detached) this.schedule(state);
    });
  }

  private async update(state: RunState): Promise<void> {
    do {
      state.pending = false;
      try {
        await this.deps.memoryRecorder.waitForIdle(state.target.runId);
        await this.deps.journalService.ensureCurrent(state.target);
      } catch (error) {
        logger.error(`[WorkJournalRunUpdater] journal update failed for run '${state.target.runId}': ${String(error)}`);
      }
    } while (state.pending && !state.detached);
  }
}

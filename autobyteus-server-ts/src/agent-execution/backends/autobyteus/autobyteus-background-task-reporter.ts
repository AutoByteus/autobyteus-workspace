import type { BackgroundProcessManager, BackgroundTaskOutcome, BackgroundTaskState } from "autobyteus-ts";
import {
  buildBackgroundTaskUpdatedPayload,
  type AgentBackgroundTask,
} from "../../domain/agent-background-task.js";
import { AgentRunEventType, type AgentRunEvent } from "../../domain/agent-run-event.js";

type NativeTaskEnd = Pick<AgentBackgroundTask, "status" | "summary" | "endReason" | "exitCode">;

/**
 * How a native task ended. An exit code is a field, not summary text. While the run is ending, every end without an
 * exit code (the run's stop signal, or the manager's "Stopped when the run ended") is the run's end; otherwise a
 * signal is a plain stop (for example the agent's own `kill <pid>`) and an error a failure.
 */
const toNativeTaskEnd = (outcome: BackgroundTaskOutcome | null, runEnding: boolean): NativeTaskEnd => {
  if (!outcome) return { status: "running", summary: null, endReason: null, exitCode: null };
  if ("exitCode" in outcome) {
    return { status: outcome.exitCode === 0 ? "completed" : "failed", summary: null, endReason: null, exitCode: outcome.exitCode };
  }
  const summary = "signal" in outcome ? `signal ${outcome.signal}` : outcome.error;
  if (runEnding) return { status: "stopped", summary, endReason: "run_ended", exitCode: null };
  return { status: "signal" in outcome ? "stopped" : "failed", summary, endReason: null, exitCode: null };
};

/** A native background task (a `run_bash` background command or `&` job) in the runtime-neutral vocabulary. */
export const toAgentBackgroundTask = ({ task, end }: BackgroundTaskState, runEnding: boolean): AgentBackgroundTask =>
  Object.freeze({
    taskId: String(task.pid),
    kind: "shell",
    description: task.command,
    command: task.command,
    ...toNativeTaskEnd(end?.outcome ?? null, runEnding),
    startedAt: task.startedAt,
  });

/**
 * Publishes a native run's background tasks: every start and end its `BackgroundProcessManager` records becomes a
 * `BACKGROUND_TASK_UPDATED` event for the run's source listeners (the Background Tasks panel, idle-shutdown
 * re-arming, the notice service), in the order the manager recorded them. Once the backend marks the run as ending,
 * the ends it records are the run's end (`run_ended`).
 */
export class AutoByteusBackgroundTaskReporter {
  private delivery: Promise<void> = Promise.resolve();
  private readonly unsubscribe: () => void;
  private runEnding = false;

  constructor(
    private readonly runId: string,
    private readonly manager: BackgroundProcessManager,
    private readonly deliver: (event: AgentRunEvent) => Promise<void>,
  ) {
    this.unsubscribe = manager.onChange((change) => this.publish(change));
  }

  /** The run's tasks now, running and ended (a late viewer starts from them). */
  list(): AgentBackgroundTask[] {
    return this.manager.list().map((state) => toAgentBackgroundTask(state, this.runEnding));
  }

  /** The backend is about to end the run: the ends recorded from now on are the run's end. Called once, before it stops the run's commands. */
  markRunEnding(): void {
    this.runEnding = true;
  }

  stop(): void {
    this.unsubscribe();
  }

  private publish(change: BackgroundTaskState): void {
    const event: AgentRunEvent = {
      eventType: AgentRunEventType.BACKGROUND_TASK_UPDATED,
      runId: this.runId,
      payload: buildBackgroundTaskUpdatedPayload(toAgentBackgroundTask(change, this.runEnding)),
      statusHint: null,
    };
    this.delivery = this.delivery.then(() => this.deliver(event)).catch((error) => {
      console.warn(`Native background task event failed for '${this.runId}'.`, error);
    });
  }
}

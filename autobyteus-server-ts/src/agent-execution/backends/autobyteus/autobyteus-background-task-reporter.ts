import type { BackgroundProcessManager, BackgroundTaskState } from "autobyteus-ts";
import {
  buildBackgroundTaskUpdatedPayload,
  type AgentBackgroundTask,
} from "../../domain/agent-background-task.js";
import { AgentRunEventType, type AgentRunEvent } from "../../domain/agent-run-event.js";

/** A native background task (a `run_bash` background command or `&` job) in the runtime-neutral vocabulary. */
export const toAgentBackgroundTask = ({ task, end }: BackgroundTaskState): AgentBackgroundTask => {
  const outcome = end?.outcome ?? null;
  const status = !outcome ? "running"
    : "exitCode" in outcome ? (outcome.exitCode === 0 ? "completed" : "failed")
      : "signal" in outcome ? "stopped" : "failed";
  const summary = !outcome ? null
    : "exitCode" in outcome ? `exit code ${outcome.exitCode}`
      : "signal" in outcome ? `signal ${outcome.signal}` : outcome.error;
  return Object.freeze({
    taskId: String(task.pid),
    kind: "shell",
    description: task.command,
    command: task.command,
    status,
    summary,
    startedAt: task.startedAt,
  });
};

/**
 * Publishes a native run's background tasks: every start and end its `BackgroundProcessManager` records becomes a
 * `BACKGROUND_TASK_UPDATED` event for the run's source listeners (the Background Tasks panel, idle-shutdown
 * re-arming, the notice service), in the order the manager recorded them.
 */
export class AutoByteusBackgroundTaskReporter {
  private delivery: Promise<void> = Promise.resolve();
  private readonly unsubscribe: () => void;

  constructor(
    private readonly runId: string,
    manager: BackgroundProcessManager,
    private readonly deliver: (event: AgentRunEvent) => Promise<void>,
  ) {
    this.unsubscribe = manager.onChange((change) => this.publish(change));
  }

  stop(): void {
    this.unsubscribe();
  }

  private publish(change: BackgroundTaskState): void {
    const event: AgentRunEvent = {
      eventType: AgentRunEventType.BACKGROUND_TASK_UPDATED,
      runId: this.runId,
      payload: buildBackgroundTaskUpdatedPayload(toAgentBackgroundTask(change)),
      statusHint: null,
    };
    this.delivery = this.delivery.then(() => this.deliver(event)).catch((error) => {
      console.warn(`Native background task event failed for '${this.runId}'.`, error);
    });
  }
}

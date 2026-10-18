import type { TaskExecutionReleaseRequest } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionGroup } from "../services/task-execution-resource-service.js";

/**
 * The runtime side effect of DONE or CANCELLED: asks each host root to stop exactly the Task's closed agent runs.
 * Nothing is persisted (Q-1): failures are logged and repeating DONE or CANCELLED requests the stop again.
 */
export class TaskExecutionResourceRelease {
  private readonly inFlight = new Set<Promise<void>>();
  constructor(private readonly request?: TaskExecutionReleaseRequest) {}

  release(taskId: string, groups: readonly TaskExecutionGroup[]): void {
    for (const group of groups) {
      const attempt = this.stop(taskId, group);
      this.inFlight.add(attempt);
      void attempt.finally(() => this.inFlight.delete(attempt));
    }
  }
  /** Settles the stops already requested (tests and orderly shutdown). */
  async drain(): Promise<void> { await Promise.all([...this.inFlight]); }

  private async stop(taskId: string, { hostRoot, executions }: TaskExecutionGroup): Promise<void> {
    try {
      const pending = this.request?.(hostRoot, executions) ?? null;
      if (!pending) {
        // No active root holds any authority in this process (none survives a restart).
        console.debug("TASK_AGENT_RESOURCE_ROOT_NOT_ACTIVE", { taskId, hostRoot });
        return;
      }
      for (const result of await pending) {
        if (!result.stopped) console.error("TASK_AGENT_RESOURCE_STOP_FAILED", { taskId, hostRoot, execution: result.execution, error: result.error });
      }
    } catch (error) {
      console.error("TASK_AGENT_RESOURCE_STOP_FAILED", { taskId, hostRoot, executions, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

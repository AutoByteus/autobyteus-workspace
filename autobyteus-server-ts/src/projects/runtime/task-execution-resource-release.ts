import type { TaskExecutionReleaseRequest, UnfinishedAdoptionRevertRequest } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionGroup } from "../services/task-execution-resource-service.js";

/**
 * The runtime side effects of DONE or CANCELLED: asks each host root to stop exactly the Task's closed agent runs,
 * and to undo the unfinished adoption of a run the user started (also after a Task or Project delete). Nothing is
 * persisted (Q-1): failures are logged and repeating DONE or CANCELLED requests them again.
 */
export class TaskExecutionResourceRelease {
  private readonly inFlight = new Set<Promise<void>>();
  constructor(private readonly request?: TaskExecutionReleaseRequest, private readonly revert?: UnfinishedAdoptionRevertRequest) {}

  release(taskId: string, groups: readonly TaskExecutionGroup[]): void {
    for (const group of groups) {
      const attempt = this.stop(taskId, group);
      this.inFlight.add(attempt);
      void attempt.finally(() => this.inFlight.delete(attempt));
    }
  }
  /**
   * Asks the runtime to undo each entry's adoption when it is an unfinished one (design SR-008); `onReverted`
   * follows each one undone (closing its entry when its Task was deleted).
   */
  revertUnfinishedAdoptions(taskId: string, entries: readonly Readonly<{ hostRoot: RootExecutionIdentity; execution: TaskExecutionReference }>[],
    onReverted?: (execution: TaskExecutionReference) => Promise<void>): void {
    for (const { hostRoot, execution } of entries) {
      const attempt = (async () => {
        try {
          if (await this.revert?.(hostRoot, execution) && onReverted) await onReverted(execution);
        } catch (error) {
          console.error("TASK_ADOPTION_REVERT_FAILED", { taskId, hostRoot, execution, error: error instanceof Error ? error.message : String(error) });
        }
      })();
      this.inFlight.add(attempt);
      void attempt.finally(() => this.inFlight.delete(attempt));
    }
  }
  /** Settles the stops and undos already requested (tests and orderly shutdown). */
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

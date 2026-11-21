import type { PeerRunStateNotice, TaskExecutionReleaseRequest } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { ReleasableRun } from "../services/task-execution-resource-service.js";

/**
 * The runtime side effect of DONE or CANCELLED (DS-5): asks each closed run, by its own identity, to stop in its own
 * root. A run on a peer node is stopped by its node, which its notice tells (autobyteus-591 DN-1; the notice is owed
 * until its node confirms). A local stop persists nothing: failures are logged and repeating DONE or CANCELLED requests
 * the stop again.
 */
export class TaskExecutionResourceRelease {
  /** The composition's stop request (autobyteus-500 FU-018: required in every host). */
  constructor(private readonly request: TaskExecutionReleaseRequest, private readonly notice: PeerRunStateNotice) {}

  release(taskId: string, runs: readonly ReleasableRun[]): void {
    for (const run of runs) void this.stop(taskId, run);
  }

  private async stop(taskId: string, { run, nodeId }: ReleasableRun): Promise<void> {
    if (nodeId !== undefined) {
      await this.notice({ run, nodeId });
      return;
    }
    try {
      const pending = this.request(run);
      // Not active: nothing runs, and its next message is refused by the closed Task.
      if (!pending) return;
      const result = await pending;
      // A reopen or a new assignment committed while the stop waited: the run keeps running (CR-461-001).
      if (!result.stopped && result.error?.code === "TASK_AGENT_RESOURCE_NOT_CLOSED") console.info("TASK_AGENT_RESOURCE_NOT_CLOSED", { taskId, execution: run });
      else if (!result.stopped) console.error("TASK_AGENT_RESOURCE_STOP_FAILED", { taskId, execution: run, error: result.error });
    } catch (error) {
      console.error("TASK_AGENT_RESOURCE_STOP_FAILED", { taskId, execution: run, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

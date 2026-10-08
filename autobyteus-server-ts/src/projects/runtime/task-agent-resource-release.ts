import type { TaskAgentResourceReleaseRequest } from "../../agent-collaboration/execution/task/task-agent-resource-port.js";
import type { TaskAgentResourceGroup } from "../services/task-agent-resource-service.js";

/**
 * The runtime side effect of DONE or CANCELLED: asks each host root to stop exactly the Task's closed agent runs.
 * Nothing is persisted (Q-1): failures are logged and repeating DONE or CANCELLED requests the stop again.
 */
export class TaskAgentResourceRelease {
  private readonly inFlight = new Set<Promise<void>>();
  constructor(private readonly request?: TaskAgentResourceReleaseRequest) {}

  release(taskId: string, groups: readonly TaskAgentResourceGroup[]): void {
    for (const group of groups) {
      const attempt = this.stop(taskId, group);
      this.inFlight.add(attempt);
      void attempt.finally(() => this.inFlight.delete(attempt));
    }
  }
  /** Settles the stops already requested (tests and orderly shutdown). */
  async drain(): Promise<void> { await Promise.all([...this.inFlight]); }

  private async stop(taskId: string, { hostRoot, agentRuns }: TaskAgentResourceGroup): Promise<void> {
    try {
      const pending = this.request?.(hostRoot, agentRuns) ?? null;
      if (!pending) {
        // No active root holds any authority in this process (none survives a restart).
        console.debug("TASK_AGENT_RESOURCE_ROOT_NOT_ACTIVE", { taskId, hostRoot });
        return;
      }
      for (const result of await pending) {
        if (!result.stopped) console.error("TASK_AGENT_RESOURCE_STOP_FAILED", { taskId, hostRoot, agentRun: result.agentRun, error: result.error });
      }
    } catch (error) {
      console.error("TASK_AGENT_RESOURCE_STOP_FAILED", { taskId, hostRoot, agentRuns, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

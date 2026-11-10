import { taskExecutionReferenceKey } from "@autobyteus/collaboration-stream-contracts";
import type { RootTaskExecutionAdapter } from "./root-task-execution-adapter.js";
import { TaskDelegationError } from "./task-delegation-command.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";
import type { ClosedTaskExecution, TaskExecutionReleaseResult, TaskExecutionResourcePort } from "./task-execution-resource-port.js";

/** A closed copy's own file could not give its record back (D-4): the copy can't continue. */
export const taskExecutionContextUnavailable = (cause: unknown): TaskDelegationError => new TaskDelegationError(
  "TASK_EXECUTION_CONTEXT_UNAVAILABLE",
  `The task agent can't continue: its saved run could not be read (${cause instanceof Error ? cause.message : String(cause)}).`,
  { cause },
);

/**
 * Which local delegated runs a loaded root's tree holds (design D-4): the tree follows the Task records. A copy whose
 * Task closed leaves the loaded tree once it is stopped; a closed copy its assigner continues, or gives another Task,
 * comes back from its own file. Asked of the Task side explicitly, never inferred from a failed lookup. Used only by
 * the lifecycle, inside its queue steps; it acts on the root through its adapter.
 */
export class TaskExecutionTreeMembership<TPlacement> {
  constructor(
    private readonly adapter: RootTaskExecutionAdapter<TPlacement>,
    private readonly port: () => TaskExecutionResourcePort | undefined,
  ) {}

  /** The closed copy of this root named by its ingress agent run or its reference; `null` when there is none. */
  closedExecutionFor(by: Readonly<{ ingressAgentRunId: string }> | TaskExecutionReference): ClosedTaskExecution | null {
    return this.port()?.closedTaskExecutionOf(this.adapter.root, by) ?? null;
  }

  /**
   * The release step's last part: every copy the release reports stopped that is still closed and in the loaded tree
   * leaves it. A stop that is not confirmed leaves the copy in the tree, hidden, until a later release confirms it.
   */
  async dropStopped(results: readonly TaskExecutionReleaseResult[]): Promise<void> {
    const port = this.port();
    if (!port) return;
    const leaving = results.filter((result) => result.stopped && !port.isOpen(result.execution)
      && this.adapter.containsTaskExecution(result.execution)).map((result) => result.execution);
    if (!leaving.length) return;
    try { await this.adapter.dropTaskExecutions(leaving); }
    catch (error) {
      // The copies stay in the loaded tree, hidden as closed; a fresh load composes without them.
      console.warn(`Closed task executions ${leaving.map(taskExecutionReferenceKey).join(", ")} stay in the loaded tree:`, error);
    }
  }

  /**
   * The reopen step's first part: a copy that is not in the loaded tree is added from its own file. Returns the undo
   * the step runs when its commit fails after the add (the copy leaves again); a no-op when nothing was added.
   */
  async addAtHead(execution: TaskExecutionReference): Promise<() => Promise<void>> {
    if (this.adapter.containsTaskExecution(execution)) return async () => undefined;
    await this.adapter.addTaskExecution(execution);
    return async () => {
      try { await this.adapter.dropTaskExecutions([execution]); }
      catch (error) { console.warn(`Task execution ${taskExecutionReferenceKey(execution)} stays in the loaded tree after a failed reopen:`, error); }
    };
  }
}

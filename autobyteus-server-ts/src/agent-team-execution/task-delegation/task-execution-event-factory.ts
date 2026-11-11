import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { findTeamTaskExecution } from "../domain/team-task-execution-lookup.js";

/** A delegated child was committed to the execution tree under its host TeamRun. */
export const taskExecutionStartedEvent = (input: {
  taskExecution: TaskExecutionReference;
  parentTeamRunId: string;
}): TeamRunEvent => ({
  eventSourceType: TeamRunEventSourceType.TASK_EXECUTION,
  taskExecution: input.taskExecution,
  payload: {
    eventType: "TASK_EXECUTION_STARTED",
    details: { parentTeamRunId: input.parentTeamRunId },
  },
});

/** These task executions' Task became DONE or CANCELLED (before they are stopped). */
export const taskExecutionsClosedEvent = (taskExecutions: readonly TaskExecutionReference[]): TeamRunEvent => ({
  eventSourceType: TeamRunEventSourceType.TASK_EXECUTIONS_CLOSED,
  taskExecutions,
});

/**
 * These closed task executions were reactivated by their assigner, or given another Task (after the Task-side commit),
 * each with its record and host Team run from the loaded tree, which holds them again (D-4, D-8).
 */
export const taskExecutionsReopenedEvent = (tree: TeamRunExecutionTreeSnapshot, taskExecutions: readonly TaskExecutionReference[]): TeamRunEvent => ({
  eventSourceType: TeamRunEventSourceType.TASK_EXECUTIONS_REOPENED,
  executions: taskExecutions.map((reference) => {
    const located = findTeamTaskExecution(tree, reference);
    if (!located) throw new Error("A reopened task execution is not in the current execution tree.");
    return located;
  }),
});

import type { RootTaskExecutionAdapter, TaskExecutionTarget } from "./root-task-execution-adapter.js";
import { TaskDelegationError } from "./task-delegation-command.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";
import type { ClosedTaskExecution } from "./task-execution-resource-port.js";

/** A closed copy of this root that left its tree (autobyteus-469 D-4), by its ingress agent run or its reference. */
export type ClosedCopyLookup = (by: Readonly<{ ingressAgentRunId: string }> | TaskExecutionReference) => ClosedTaskExecution | null;

const refuse = (message: string) => new TaskDelegationError("TASK_COPY_NOT_ASSIGNABLE", message);

/** The refusal for an ID that is not a copy of this run (unknown, or hosted by another root). */
export const notACopyOfThisRun = (copy: TaskExecutionReference): TaskDelegationError => refuse(
  `${"agentRunId" in copy ? copy.agentRunId : copy.teamRunId} is not one of your task agents. Use a run id that delegate_task returned to you, `
  + "or delegate to a new task agent with recipient_address.");

/**
 * The existing copy a delegator names by its own ID: in this root's tree, or a closed copy of this root the Task
 * records name (it left the tree when its Task closed, autobyteus-469). An ID of the other kind is refused naming the
 * field to use, and a Team copy's coordinator or member (in the tree) naming the Team's run ID. `null` when it is
 * neither: not a copy of this run. A copy whose start failed is a closed copy too; whether a found copy may take the
 * Task is the Task side's decision.
 */
export const resolveExistingCopy = <T>(adapter: RootTaskExecutionAdapter<T>, copy: TaskExecutionReference, closedCopyOf: ClosedCopyLookup): TaskExecutionTarget | null => {
  const closedTarget = (closed: ClosedTaskExecution | null): TaskExecutionTarget | null => closed && Object.freeze({ root: adapter.root, ...closed });
  const found = adapter.taskExecutionTargetOf(copy) ?? closedTarget(closedCopyOf(copy));
  if (found) return found;
  const known = (reference: TaskExecutionReference) => adapter.taskExecutionTargetOf(reference) !== null || closedCopyOf(reference) !== null;
  if ("agentRunId" in copy) {
    const id = copy.agentRunId;
    const coordinated = adapter.taskExecutionWithIngress(id) ?? closedCopyOf({ ingressAgentRunId: id })?.execution ?? null;
    if (coordinated && "teamRunId" in coordinated) {
      throw refuse(`${id} is the coordinator of task agent team ${coordinated.teamRunId}; use target_team_run_id "${coordinated.teamRunId}".`);
    }
    if (known({ teamRunId: id })) throw refuse(`${id} is a task agent team's run id; use target_team_run_id "${id}".`);
    const container = adapter.taskExecutionChainFor(id)[0];
    if (container && "teamRunId" in container) {
      throw refuse(`${id} is a member of task agent team ${container.teamRunId}; to give that team a Task, use target_team_run_id "${container.teamRunId}".`);
    }
  } else if (known({ agentRunId: copy.teamRunId })) {
    throw refuse(`${copy.teamRunId} is a task agent's run id; use target_agent_run_id "${copy.teamRunId}".`);
  }
  return null;
};

import type { RootTaskExecutionAdapter, TaskExecutionTarget } from "./root-task-execution-adapter.js";
import { TaskDelegationError } from "./task-delegation-command.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";

const refuse = (message: string) => new TaskDelegationError("TASK_COPY_NOT_ASSIGNABLE", message);

/** The refusal for an ID that is not a copy of this run (unknown, or hosted by another root). */
export const notACopyOfThisRun = (copy: TaskExecutionReference): TaskDelegationError => refuse(
  `${"agentRunId" in copy ? copy.agentRunId : copy.teamRunId} is not one of your task agents. Use a run id that delegate_task returned to you, `
  + "or delegate to a new task agent with recipient_address.");

/**
 * The existing copy a delegator names by its own ID, found in this root's tree. An ID of the other
 * kind is refused naming the field to use, and a Team copy's coordinator or member naming the Team's
 * run ID. `null` when the copy is not in the tree at all: a copy whose start failed never reached it
 * (the caller asks the Task side), and anything else is not a copy of this run. Whether a found copy
 * may take the Task is the Task side's decision.
 */
export const resolveExistingCopy = <T>(adapter: RootTaskExecutionAdapter<T>, copy: TaskExecutionReference): TaskExecutionTarget | null => {
  const found = adapter.taskExecutionTargetOf(copy);
  if (found) return found;
  if ("agentRunId" in copy) {
    const id = copy.agentRunId;
    const coordinated = adapter.taskExecutionWithIngress(id);
    if (coordinated && "teamRunId" in coordinated) {
      throw refuse(`${id} is the coordinator of task agent team ${coordinated.teamRunId}; use target_team_run_id "${coordinated.teamRunId}".`);
    }
    if (adapter.taskExecutionTargetOf({ teamRunId: id })) throw refuse(`${id} is a task agent team's run id; use target_team_run_id "${id}".`);
    const container = adapter.taskExecutionChainFor(id)[0];
    if (container && "teamRunId" in container) {
      throw refuse(`${id} is a member of task agent team ${container.teamRunId}; to give that team a Task, use target_team_run_id "${container.teamRunId}".`);
    }
  } else if (adapter.taskExecutionTargetOf({ agentRunId: copy.teamRunId })) {
    throw refuse(`${copy.teamRunId} is a task agent's run id; use target_agent_run_id "${copy.teamRunId}".`);
  }
  return null;
};

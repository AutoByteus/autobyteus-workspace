import type { RootTaskExecutionAdapter, TaskExecutionTarget } from "./root-task-execution-adapter.js";
import { TaskDelegationError } from "./task-delegation-command.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";

const refuse = (message: string) => new TaskDelegationError("TASK_COPY_NOT_ASSIGNABLE", message);

/**
 * The existing copy a delegator names by its own ID, found in this root's tree. A miss is refused
 * with its specific reason: an ID of the other kind names the field to use, a Team copy's coordinator
 * or member names the Team's run ID, and anything else is not a copy of this run (unknown, or hosted
 * by another root). Whether the found copy may take the Task is the Task side's decision.
 */
export const resolveExistingCopy = <T>(adapter: RootTaskExecutionAdapter<T>, copy: TaskExecutionReference): TaskExecutionTarget => {
  const found = adapter.taskExecutionTargetOf(copy);
  if (found) return found;
  if ("agentRunId" in copy) {
    const id = copy.agentRunId;
    const coordinated = adapter.taskExecutionWithIngress(id);
    if (coordinated && "teamRunId" in coordinated) {
      throw refuse(`${id} is the coordinator of Team copy ${coordinated.teamRunId}; use target_team_run_id "${coordinated.teamRunId}".`);
    }
    if (adapter.taskExecutionTargetOf({ teamRunId: id })) throw refuse(`${id} is a Team copy's team run ID; use target_team_run_id "${id}".`);
    const container = adapter.taskExecutionChainFor(id)[0];
    if (container && "teamRunId" in container) {
      throw refuse(`${id} is a member of Team copy ${container.teamRunId}, not a copy itself; to assign that Team copy, use target_team_run_id "${container.teamRunId}".`);
    }
  } else if (adapter.taskExecutionTargetOf({ agentRunId: copy.teamRunId })) {
    throw refuse(`${copy.teamRunId} is an Agent copy's agent run ID; use target_agent_run_id "${copy.teamRunId}".`);
  }
  const id = "agentRunId" in copy ? copy.agentRunId : copy.teamRunId;
  throw refuse(`${id} is not a delegated copy in this run. Use the ID delegate_task returned for a copy delegated in this run, `
    + "or delegate to a new copy with recipient_address.");
};

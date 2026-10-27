import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import type { TaskExecutionOwner } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";

/**
 * Which Project Tasks a caller of `get_project_task` may read (REQ-015, DEC-022): a caller that works on a Task (a task
 * agent, every member of a task team, and the agents a worker delegated to) reads only that Task, its copy's current
 * Task; a caller that works on no Task reads any Project Task, as `list_project_tasks` lists them.
 */
export type TaskReadScope = Readonly<{ kind: "any" }> | Readonly<{ kind: "owned"; owner: TaskExecutionOwner }>;

export const ANY_TASK_READ_SCOPE: TaskReadScope = Object.freeze({ kind: "any" });

/**
 * The caller's scope, from its member's Task capability (`ownedTaskOf`, the root's `ownerOf`). No member context, or an
 * explicit "works on no Task" answer, is `any`. It fails closed: an error (for example damaged run data,
 * `TASK_AGENT_RESOURCES_UNAVAILABLE`) propagates and ends the call as a refusal, never as `any`.
 */
export const taskReadScopeOf = (memberExecutionContext: MemberExecutionContext | null | undefined): TaskReadScope => {
  if (!memberExecutionContext) return ANY_TASK_READ_SCOPE;
  const owner = memberExecutionContext.tasks.ownedTaskOf(memberExecutionContext.identity);
  return owner ? Object.freeze({ kind: "owned", owner }) : ANY_TASK_READ_SCOPE;
};

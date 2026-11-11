import type { TaskExecutionOwner } from "../execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../execution/task/task-execution-reference.js";
import type { DelegationTree } from "./delegation-tree.js";

/**
 * The Task a run works on (`get_project_task`'s read scope, contract §2.4): its current entry (its newest open one,
 * else its newest), by the run's own identity; `null` for a run no Task names (it reads any Task).
 */
export const runOwnTaskOf = (run: TaskExecutionReference, tree: Pick<DelegationTree, "currentTaskOf">): TaskExecutionOwner | null => {
  const entry = tree.currentTaskOf(run);
  return entry ? Object.freeze({ taskId: entry.taskId, execution: run, open: entry.open }) : null;
};

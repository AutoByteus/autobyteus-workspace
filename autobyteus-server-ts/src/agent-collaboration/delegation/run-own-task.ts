import type { TaskExecutionOwner } from "../execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../execution/task/task-execution-reference.js";
import { findDelegationTree } from "./delegation-tree-binding.js";

/**
 * The Task a run works on (`get_project_task`'s read scope, contract §2.4): its current entry (its newest open one,
 * else its newest), by the run's own identity; `null` for a run no Task names (it reads any Task).
 */
export const runOwnTaskOf = (run: TaskExecutionReference): TaskExecutionOwner | null => {
  const entry = findDelegationTree()?.currentTaskOf(run) ?? null;
  return entry ? Object.freeze({ taskId: entry.taskId, execution: run, open: entry.open }) : null;
};

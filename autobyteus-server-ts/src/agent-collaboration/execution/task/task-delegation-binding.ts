import type { TaskDelegation } from "./task-delegation.js";

let bound: TaskDelegation | null = null;

/** The composition binds the process `TaskDelegation` once its run services, roots and Task side exist. */
export const bindTaskDelegation = (delegation: TaskDelegation): void => { bound = delegation; };
export const unbindTaskDelegation = (delegation: TaskDelegation): void => { if (bound === delegation) bound = null; };

/** The process `TaskDelegation`; a delegation before the server is composed is a programming error. */
export const getTaskDelegation = (): TaskDelegation => {
  if (!bound) throw new Error("A delegation was requested before the delegation services were composed.");
  return bound;
};

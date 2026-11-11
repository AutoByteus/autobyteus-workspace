import type { TaskDelegation } from "./task-delegation.js";
import type { TaskDelegationOutcome } from "./task-delegation-command.js";

/** Today's answer where no Task side is composed (an application host's runs): nothing can be recorded. */
export const TASKS_UNAVAILABLE_TEXT = "Tasks are not available here, so this delegation can't be recorded.";

let bound: TaskDelegation | null = null;

/** The composition binds the process `TaskDelegation` once its run services, roots and Task side exist. */
export const bindTaskDelegation = (delegation: TaskDelegation): void => { bound = delegation; };
export const unbindTaskDelegation = (delegation: TaskDelegation): void => { if (bound === delegation) bound = null; };

/** Runs a delegation through the process `TaskDelegation`; without one (no Task side here) it is refused with today's text. */
export const delegateThrough = (operation: (delegation: TaskDelegation) => Promise<TaskDelegationOutcome>): Promise<TaskDelegationOutcome> =>
  bound ? operation(bound) : Promise.resolve({ delegated: false, message: TASKS_UNAVAILABLE_TEXT });

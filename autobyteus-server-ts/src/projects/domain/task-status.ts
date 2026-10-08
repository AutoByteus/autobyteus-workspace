import { ProjectError } from "./project-errors.js";

/**
 * The Task status vocabulary (Project Tasks and Tasks with no Project). Only agents change it.
 * - `TODO`, `IN_PROGRESS`: open; the work has not ended.
 * - `DONE`: the work is finished.
 * - `CLOSED`: the Task was dropped as not needed, not completed. It ends the work exactly like DONE.
 * DONE and CLOSED are terminal: the Task's agent runs are closed and stopped, and new assignment or
 * reactivation is refused until an agent reopens the Task (TODO or IN_PROGRESS). Any explicit status
 * may follow any other.
 */
export const PROJECT_TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE", "CLOSED"] as const;
export type ProjectTaskStatus = (typeof PROJECT_TASK_STATUSES)[number];

const STATUSES: ReadonlySet<unknown> = new Set(PROJECT_TASK_STATUSES);

export const isProjectTaskStatus = (value: unknown): value is ProjectTaskStatus => STATUSES.has(value);

export const validateTaskStatus = (value: unknown): ProjectTaskStatus => {
  if (!isProjectTaskStatus(value)) throw new ProjectError("TASK_STATUS_INVALID", "Task status must be TODO, IN_PROGRESS, DONE or CLOSED.");
  return value;
};

/** DONE or CLOSED: the Task's work has ended. */
export const isTerminalTaskStatus = (status: ProjectTaskStatus): boolean => status === "DONE" || status === "CLOSED";

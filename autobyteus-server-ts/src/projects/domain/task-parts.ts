import { ProjectError } from "./project-errors.js";

/**
 * "Part of": a Project Task's optional parent, another Task of the same Project, stored on the part as
 * `partOfTaskId`. A parent's parts are derived by readers and never stored. One level only: a part has no
 * parts and a Task with parts is no part. It informs only; its one effect is that a parent's DONE or
 * CANCELLED closes its open parts the same way (ProjectTaskService).
 */
type PartTask = Readonly<{ taskId: string; taskKey: string; partOfTaskId: string | null }>;

const invalid = (message: string): ProjectError => new ProjectError("TASK_PARENT_INVALID", message);
/** The rejection of a parent that names no current Task of this Project (an unknown, another Project's or a Temp task). */
export const notAProjectParent = (reference: string): ProjectError => invalid(`Task '${reference}' is not a current Task of this Project.`);

/** A supplied parent: a trimmed Task ID or reference, or null (null or "") for none. */
export const normalizePartOf = (raw: unknown): string | null => {
  if (raw === null) return null;
  if (typeof raw !== "string") throw invalid("The parent must be a Task ID.");
  return raw.trim() || null;
};

/**
 * Rejects, with no change, a parent that is the Task itself, is not a current Task of this Project (`tasks`
 * are the Project's current Tasks), is itself a part, or is given to a Task that has parts. A parent whose own
 * `partOfTaskId` names no current Task counts as having no parent. Clearing (null) always passes. `taskId` is
 * null for a new Task, which has no parts yet.
 */
export const assertParentValid = (taskId: string | null, parentId: string | null, tasks: readonly PartTask[]): void => {
  if (parentId === null) return;
  if (parentId === taskId) throw invalid("A Task cannot be part of itself.");
  const byId = new Map(tasks.map((task) => [task.taskId, task]));
  const parent = byId.get(parentId);
  if (!parent) throw notAProjectParent(parentId);
  const grandparent = parent.partOfTaskId === null ? undefined : byId.get(parent.partOfTaskId);
  if (grandparent) {
    throw invalid(`${parent.taskKey} is itself part of ${grandparent.taskKey}; a part can't have parts of its own.`);
  }
  if (taskId !== null && tasks.some((task) => task.taskId !== taskId && task.partOfTaskId === taskId)) {
    throw invalid("This Task has parts, so it can't be part of another Task.");
  }
};

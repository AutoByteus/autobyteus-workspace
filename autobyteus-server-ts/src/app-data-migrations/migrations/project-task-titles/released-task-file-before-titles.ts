/**
 * FROZEN validator of a Project Task file as released before Tasks had titles (`<projectId>/tasks/<taskId>/task.json`,
 * written by `projects-per-folder-v1` and then keyed by `project-task-keys-v1`). Only `project-task-titles` reads it,
 * to classify what it may title; current runtime code never imports this file. Do not change it to follow current shapes.
 *
 * `taskKey` is optional on purpose (SR-012, CR-001): a Project that `project-task-keys-v1` could not key keeps unkeyed
 * Task files, preserved and hidden until a later start keys them. The title depends only on the description, so those
 * Tasks are titled too, and keep their title when keys-v1 later writes `{...raw, taskKey}`.
 */
export type ReleasedTaskBeforeTitles = Readonly<{ taskId: string; description: string }>;

const RELEASED_TASK_STATUSES: ReadonlySet<unknown> = new Set(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]);
const isNonBlankString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

/** The released Task file's identity and description, or null when the file is not a released Task file. */
export const readReleasedTaskFileBeforeTitles = (raw: unknown, projectId: string, taskId: string): ReleasedTaskBeforeTitles | null => {
  const c = raw as Record<string, unknown> | null;
  if (!c || typeof c !== "object" || Array.isArray(c) || c.taskId !== taskId || c.projectId !== projectId
    || !isNonBlankString(c.description) || !RELEASED_TASK_STATUSES.has(c.status)
    || !isNonBlankString(c.createdAt) || !isNonBlankString(c.updatedAt)) return null;
  return { taskId, description: c.description };
};

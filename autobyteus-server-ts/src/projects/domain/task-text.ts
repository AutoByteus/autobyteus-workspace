import { ProjectError } from "./project-errors.js";

/**
 * A Project Task's text rules: its title (its one-line name, given by its writer) and its description (its content).
 * Both are trimmed and must not be blank; a title has no length or line limit. Used by every create and update path
 * and by the agent tool contract, so one rule refuses a missing or blank value everywhere.
 */

/** A Task's title: trimmed and non-blank; otherwise TASK_TITLE_REQUIRED. */
export const normalizeTaskTitle = (raw: unknown): string => {
  if (typeof raw !== "string" || !raw.trim()) throw new ProjectError("TASK_TITLE_REQUIRED", "Task title is required.");
  return raw.trim();
};

/** A Task's description: trimmed and non-blank; otherwise TASK_DESCRIPTION_REQUIRED. */
export const normalizeTaskDescription = (raw: unknown): string => {
  if (typeof raw !== "string" || !raw.trim()) throw new ProjectError("TASK_DESCRIPTION_REQUIRED", "Task description is required.");
  return raw.trim();
};

/** The text an update supplies, normalized: a field is present only when the update supplies it. */
export type TaskTextPatch = { title?: string; description?: string };

/** Both update paths' text patch: each supplied field normalized, in order title then description. */
export const taskTextPatchOf = (command: { title?: unknown; description?: unknown }): TaskTextPatch => ({
  ...(Object.hasOwn(command, "title") ? { title: normalizeTaskTitle(command.title) } : {}),
  ...(Object.hasOwn(command, "description") ? { description: normalizeTaskDescription(command.description) } : {}),
});

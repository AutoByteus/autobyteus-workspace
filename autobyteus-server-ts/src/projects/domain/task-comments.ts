import type { ProjectTaskComment } from "./models.js";
import { ProjectError } from "./project-errors.js";

/**
 * A Project Task's comment thread: comments are only added (no edit, no delete), each with its number within the
 * Task and the server time. The text is the only input; the number and time are set here, under the Task's lock.
 */

/** A comment's text: trimmed and non-empty; otherwise TASK_COMMENT_INVALID. */
export const normalizeCommentText = (raw: unknown): string => {
  if (typeof raw !== "string" || !raw.trim()) throw new ProjectError("TASK_COMMENT_INVALID", "Comment text is required.");
  return raw.trim();
};

/** The Task with one new comment at the end: the next number (the highest + 1, 1 for the first) and `createdAt`. */
export const appendComment = <T extends { comments: readonly ProjectTaskComment[] }>(task: T, text: string, createdAt: string): T => ({
  ...task,
  comments: [...task.comments, { id: task.comments.reduce((highest, comment) => Math.max(highest, comment.id), 0) + 1, createdAt, text }],
});

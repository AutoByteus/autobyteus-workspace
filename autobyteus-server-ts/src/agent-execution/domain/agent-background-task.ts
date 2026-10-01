/**
 * Runtime-neutral background-task vocabulary.
 *
 * A background task is work a runtime runs beyond its current turn and reports separately
 * (a Claude task in the CLI background set, an Antigravity daemon step). Each
 * `BACKGROUND_TASK_UPDATED` event carries the complete current snapshot of one task and is
 * applied as an upsert keyed by `task_id`. Runtime-specific task types never leave their
 * backend; backends map them onto this vocabulary and build payloads only through
 * `buildBackgroundTaskUpdatedPayload`.
 */
export const AGENT_BACKGROUND_TASK_KINDS = ["shell", "subagent", "monitor", "workflow", "other"] as const;
export const AGENT_BACKGROUND_TASK_STATUSES = ["running", "completed", "failed", "stopped"] as const;

export type AgentBackgroundTaskKind = (typeof AGENT_BACKGROUND_TASK_KINDS)[number];
export type AgentBackgroundTaskStatus = (typeof AGENT_BACKGROUND_TASK_STATUSES)[number];

export type AgentBackgroundTask = Readonly<{
  taskId: string;
  kind: AgentBackgroundTaskKind;
  description: string;
  status: AgentBackgroundTaskStatus;
  /** Final summary the runtime reported; null while running or when none was reported. */
  summary: string | null;
  /** ISO-8601 time at which the owning runtime first saw the task. */
  startedAt: string;
}>;

const isKind = (value: unknown): value is AgentBackgroundTaskKind =>
  typeof value === "string" && (AGENT_BACKGROUND_TASK_KINDS as readonly string[]).includes(value);

const isStatus = (value: unknown): value is AgentBackgroundTaskStatus =>
  typeof value === "string" && (AGENT_BACKGROUND_TASK_STATUSES as readonly string[]).includes(value);

/** Wire (snake_case) payload of `AgentRunEventType.BACKGROUND_TASK_UPDATED`. */
export const buildBackgroundTaskUpdatedPayload = (task: AgentBackgroundTask): Record<string, unknown> => ({
  task_id: task.taskId,
  kind: task.kind,
  description: task.description,
  status: task.status,
  summary: task.summary,
  started_at: task.startedAt,
});

/** Strictly parses a `BACKGROUND_TASK_UPDATED` payload; throws on any invalid field. */
export const parseBackgroundTaskUpdatedPayload = (payload: Record<string, unknown>): AgentBackgroundTask => {
  const { task_id: taskId, kind, description, status, summary, started_at: startedAt } = payload;
  if (typeof taskId !== "string" || taskId.trim().length === 0) {
    throw new Error("background task task_id is required");
  }
  if (!isKind(kind)) {
    throw new Error("background task kind is invalid");
  }
  if (typeof description !== "string") {
    throw new Error("background task description is invalid");
  }
  if (!isStatus(status)) {
    throw new Error("background task status is invalid");
  }
  if (summary !== null && typeof summary !== "string") {
    throw new Error("background task summary is invalid");
  }
  if (typeof startedAt !== "string" || startedAt.trim().length === 0) {
    throw new Error("background task started_at is required");
  }
  return Object.freeze({ taskId, kind, description, status, summary, startedAt });
};

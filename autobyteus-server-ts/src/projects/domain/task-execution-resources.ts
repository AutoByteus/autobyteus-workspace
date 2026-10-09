import { taskExecutionReferenceKey, type TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { NewTaskExecutionLinkInput, TaskExecutionRole } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { ProjectError } from "./project-errors.js";

/**
 * One Task's record of one task execution (a delegated Agent or Team copy). Never stores liveness,
 * shutdown state, lineage or descriptions. Persisted names differ (only the schema module knows them).
 */
export type TaskExecutionResource = Readonly<{
  role: TaskExecutionRole;
  /** Only on `assigned`: the run that made the assignment. */
  assignedBy?: string;
  /**
   * Only on `assigned`: the address the assigner delegated to (e.g. `/product_team`), the root's
   * display name. Absent on assignments recorded before it was kept.
   */
  recipientAddress?: string;
  hostRoot: RootExecutionIdentity;
  execution: TaskExecutionReference;
  /** Only for a Team copy: its coordinator agent run (the Team's ingress). */
  teamCoordinatorAgentRunId?: string;
  linkedAt: string;
  start: "starting" | "started" | "failed";
  /** Only when `start` is `failed`. */
  startError?: Readonly<{ code: string; message: string }>;
  closedAt: string | null;
}>;
/** `<projectId>/tasks/<taskId>/agent_run_resources.json`. */
export type TaskExecutionResourceFile = Readonly<{ taskId: string; executionResources: readonly TaskExecutionResource[] }>;

export type TaskAssignmentOutcome = "accepted" | "not_confirmed" | "failed";
export type TaskAssignment = Readonly<{
  targetAgentRunId: string; kind: "agent" | "team"; assignedBy: string; outcome: TaskAssignmentOutcome;
}>;

export const emptyTaskExecutionResourceFile = (taskId: string): TaskExecutionResourceFile => ({ taskId, executionResources: [] });
const find = (file: TaskExecutionResourceFile, execution: TaskExecutionReference) =>
  file.executionResources.find(r => taskExecutionReferenceKey(r.execution) === taskExecutionReferenceKey(execution));
export const boundedError = (error: { code: string; message: string }) => ({
  code: error.code.replace(/[^A-Z0-9_]/gi, "_").slice(0, 80),
  message: error.message.replace(/[\x00-\x1f]/g, " ").slice(0, 500),
});

/**
 * Adds a `starting` entry. Preconditions are evaluated against the file content read under its
 * lock: the task execution is new in the file, and an inherited entry's creator is present and open.
 */
export const linkNewTaskExecution = (file: TaskExecutionResourceFile, link: NewTaskExecutionLinkInput, now: string): TaskExecutionResourceFile => {
  if (find(file, link.execution)) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is already linked to this Task.");
  if (link.role !== "assigned") {
    const creator = find(file, link.creator);
    if (!creator || creator.closedAt !== null) throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", "The creating Task agent run is closed (its Task is DONE or CANCELLED).");
  }
  const team = "teamRunId" in link.execution;
  if (team && !link.teamCoordinatorAgentRunId) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "A Team agent run needs its coordinator.");
  const entry: TaskExecutionResource = {
    role: link.role,
    ...(link.role === "assigned" ? { assignedBy: link.assignedBy, ...(link.recipientAddress ? { recipientAddress: link.recipientAddress } : {}) } : {}),
    hostRoot: { rootSubjectKind: link.hostRoot.rootSubjectKind, rootRunId: link.hostRoot.rootRunId },
    execution: "agentRunId" in link.execution ? { agentRunId: link.execution.agentRunId } : { teamRunId: link.execution.teamRunId },
    ...(team ? { teamCoordinatorAgentRunId: link.teamCoordinatorAgentRunId } : {}),
    linkedAt: now, start: "starting", closedAt: null,
  };
  return { taskId: file.taskId, executionResources: [...file.executionResources, entry] };
};

/** `start` is set once; an entry that already started or failed is left unchanged. */
export const settleTaskExecutionStart = (file: TaskExecutionResourceFile, execution: TaskExecutionReference,
  outcome: { start: "started" } | { start: "failed"; error: { code: string; message: string } }): TaskExecutionResourceFile => {
  if (!find(file, execution)) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is not linked to this Task.");
  return { taskId: file.taskId, executionResources: file.executionResources.map(r =>
    taskExecutionReferenceKey(r.execution) !== taskExecutionReferenceKey(execution) || r.start !== "starting" ? r
      : outcome.start === "started" ? { ...r, start: "started" } : { ...r, start: "failed", startError: boundedError(outcome.error) }) };
};

/**
 * DONE or CANCELLED: every open entry is closed. A closed entry stays closed until its assigner reactivates it
 * (`reopenTaskExecution`); helper entries never reopen.
 */
export const closeTaskExecutionResources = (file: TaskExecutionResourceFile, now: string): TaskExecutionResourceFile =>
  ({ taskId: file.taskId, executionResources: file.executionResources.map(r => r.closedAt === null ? { ...r, closedAt: now } : r) });

export const ASSIGNER_ONLY_REACTIVATION_MESSAGE = "This Task work is closed. Only the run that assigned it can reactivate it: "
  + "move the Task to TODO or IN_PROGRESS with create_or_update_task, then message the run ID delegate_task returned.";
/**
 * Reactivation preconditions on the file content: the entry is an `assigned` entry of this Task,
 * `requestedBy` is its assigner, and it started. Task status is the caller's concern.
 */
export const assertTaskExecutionReopenable = (file: TaskExecutionResourceFile, execution: TaskExecutionReference, requestedBy: string): TaskExecutionResource => {
  const entry = find(file, execution);
  if (!entry) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is not linked to this Task.");
  if (entry.role !== "assigned" || entry.assignedBy !== requestedBy) {
    throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", ASSIGNER_ONLY_REACTIVATION_MESSAGE);
  }
  if (entry.start !== "started") {
    throw new ProjectError("TASK_REACTIVATION_UNAVAILABLE", "This assignment never started, so there is nothing to reactivate. Delegate the work again.");
  }
  return entry;
};
/** Reactivation: the one assigned entry is open again; every other entry is unchanged. An open entry returns the same file. */
export const reopenTaskExecution = (file: TaskExecutionResourceFile, execution: TaskExecutionReference, requestedBy: string): TaskExecutionResourceFile => {
  if (assertTaskExecutionReopenable(file, execution, requestedBy).closedAt === null) return file;
  return { taskId: file.taskId, executionResources: file.executionResources.map(r =>
    taskExecutionReferenceKey(r.execution) === taskExecutionReferenceKey(execution) ? { ...r, closedAt: null } : r) };
};

const outcomes: Record<TaskExecutionResource["start"], TaskAssignmentOutcome> = { started: "accepted", starting: "not_confirmed", failed: "failed" };
/** The Manager's read: open `assigned` entries only. */
export const currentAssignments = (file: TaskExecutionResourceFile): TaskAssignment[] => file.executionResources
  .filter(r => r.role === "assigned" && r.closedAt === null)
  .map(r => ({
    targetAgentRunId: "agentRunId" in r.execution ? r.execution.agentRunId : r.teamCoordinatorAgentRunId!,
    kind: "agentRunId" in r.execution ? "agent" as const : "team" as const,
    assignedBy: r.assignedBy!, outcome: outcomes[r.start],
  }));

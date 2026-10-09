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
/** A Task's assignment of an Agent copy, by its agent run ID. */
export type AgentAssignmentView = Readonly<{ kind: "agent"; agentRunId: string; assignedBy: string; outcome: TaskAssignmentOutcome }>;
/** A Task's assignment of a Team copy: its team run ID and its coordinator's agent run ID. */
export type TeamAssignmentView = Readonly<{
  kind: "team"; teamRunId: string; teamCoordinatorAgentRunId: string; assignedBy: string; outcome: TaskAssignmentOutcome;
}>;
export type TaskAssignmentView = AgentAssignmentView | TeamAssignmentView;

export const emptyTaskExecutionResourceFile = (taskId: string): TaskExecutionResourceFile => ({ taskId, executionResources: [] });
/**
 * The copy's last entry in this file. A copy may have several entries in one file (one per
 * assignment period, A → B → A); only its last entry can be open, so every rule acts on it.
 */
export const latestEntryIndexOf = (file: TaskExecutionResourceFile, execution: TaskExecutionReference): number => {
  const key = taskExecutionReferenceKey(execution);
  for (let index = file.executionResources.length - 1; index >= 0; index -= 1) {
    if (taskExecutionReferenceKey(file.executionResources[index]!.execution) === key) return index;
  }
  return -1;
};
export const latestEntryOf = (file: TaskExecutionResourceFile, execution: TaskExecutionReference): TaskExecutionResource | undefined =>
  file.executionResources[latestEntryIndexOf(file, execution)];
/** Replaces only the copy's last entry in the file. */
const updateLatestEntry = (file: TaskExecutionResourceFile, execution: TaskExecutionReference,
  update: (entry: TaskExecutionResource) => TaskExecutionResource): TaskExecutionResourceFile => {
  const index = latestEntryIndexOf(file, execution);
  return { taskId: file.taskId, executionResources: file.executionResources.map((entry, at) => at === index ? update(entry) : entry) };
};
export const boundedError = (error: { code: string; message: string }) => ({
  code: error.code.replace(/[^A-Z0-9_]/gi, "_").slice(0, 80),
  message: error.message.replace(/[\x00-\x1f]/g, " ").slice(0, 500),
});

const entryOf = (input: Readonly<{
  role: TaskExecutionRole; assignedBy?: string; recipientAddress?: string; hostRoot: RootExecutionIdentity;
  execution: TaskExecutionReference; teamCoordinatorAgentRunId?: string;
}>, now: string): TaskExecutionResource => {
  const team = "teamRunId" in input.execution;
  if (team && !input.teamCoordinatorAgentRunId) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "A Team agent run needs its coordinator.");
  return {
    role: input.role,
    ...(input.role === "assigned" ? { assignedBy: input.assignedBy, ...(input.recipientAddress ? { recipientAddress: input.recipientAddress } : {}) } : {}),
    hostRoot: { rootSubjectKind: input.hostRoot.rootSubjectKind, rootRunId: input.hostRoot.rootRunId },
    execution: "agentRunId" in input.execution ? { agentRunId: input.execution.agentRunId } : { teamRunId: input.execution.teamRunId },
    ...(team ? { teamCoordinatorAgentRunId: input.teamCoordinatorAgentRunId } : {}),
    linkedAt: now, start: "starting", closedAt: null,
  };
};

/**
 * Adds a `starting` entry for a new copy. Preconditions are evaluated against the file content read
 * under its lock: the copy is absent from the file, and an inherited entry's creator is present and open.
 */
export const linkNewTaskExecution = (file: TaskExecutionResourceFile, link: NewTaskExecutionLinkInput, now: string): TaskExecutionResourceFile => {
  if (latestEntryOf(file, link.execution)) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is already linked to this Task.");
  if (link.role !== "assigned") {
    const creator = latestEntryOf(file, link.creator);
    if (!creator || creator.closedAt !== null) throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", "The creating Task agent run is closed (its Task is DONE or CANCELLED).");
  }
  return { taskId: file.taskId, executionResources: [...file.executionResources, entryOf(link, now)] };
};

/**
 * Assigns an existing copy to this Task: appends a new `starting` `assigned` entry (one entry per
 * assignment period). Precondition on the content read under the lock: every entry of the copy in
 * this file is closed. Earlier entries of the copy are kept exactly as they are.
 */
export const linkExistingTaskExecution = (file: TaskExecutionResourceFile, link: Readonly<{
  assignedBy: string; recipientAddress?: string; hostRoot: RootExecutionIdentity; execution: TaskExecutionReference; teamCoordinatorAgentRunId?: string;
}>, now: string): TaskExecutionResourceFile => {
  if (latestEntryOf(file, link.execution)?.closedAt === null) {
    throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "This copy already works on this Task.");
  }
  return { taskId: file.taskId, executionResources: [...file.executionResources, entryOf({ ...link, role: "assigned" }, now)] };
};

/** `start` is set once on the copy's last entry; an entry that already started or failed is left unchanged. */
export const settleTaskExecutionStart = (file: TaskExecutionResourceFile, execution: TaskExecutionReference,
  outcome: { start: "started" } | { start: "failed"; error: { code: string; message: string } }): TaskExecutionResourceFile => {
  if (!latestEntryOf(file, execution)) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is not linked to this Task.");
  return updateLatestEntry(file, execution, r => r.start !== "starting" ? r
    : outcome.start === "started" ? { ...r, start: "started" } : { ...r, start: "failed", startError: boundedError(outcome.error) });
};

/**
 * DONE or CANCELLED: every open entry is closed. A closed entry stays closed until its assigner reactivates it
 * (`reopenTaskExecution`); helper entries never reopen.
 */
export const closeTaskExecutionResources = (file: TaskExecutionResourceFile, now: string): TaskExecutionResourceFile =>
  ({ taskId: file.taskId, executionResources: file.executionResources.map(r => r.closedAt === null ? { ...r, closedAt: now } : r) });

export const ASSIGNER_ONLY_REACTIVATION_MESSAGE = "This Task work is closed. Only the run that assigned it can reactivate it: "
  + "move the Task to TODO or IN_PROGRESS with create_or_update_task, then message the copy's agent run ID (for a Team copy, its coordinator's).";
/**
 * Reactivation preconditions on the copy's last entry in the file: it is an `assigned` entry,
 * `requestedBy` is its assigner, and it started. Task status and "is it the copy's current Task" are
 * the caller's concern.
 */
export const assertTaskExecutionReopenable = (file: TaskExecutionResourceFile, execution: TaskExecutionReference, requestedBy: string): TaskExecutionResource => {
  const entry = latestEntryOf(file, execution);
  if (!entry) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is not linked to this Task.");
  if (entry.role !== "assigned" || entry.assignedBy !== requestedBy) {
    throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", ASSIGNER_ONLY_REACTIVATION_MESSAGE);
  }
  if (entry.start !== "started") {
    throw new ProjectError("TASK_REACTIVATION_UNAVAILABLE", "This assignment never started, so there is nothing to reactivate. Delegate the work again.");
  }
  return entry;
};
/** Reactivation: the copy's last entry is open again; every other entry is unchanged. An open entry returns the same file. */
export const reopenTaskExecution = (file: TaskExecutionResourceFile, execution: TaskExecutionReference, requestedBy: string): TaskExecutionResourceFile => {
  if (assertTaskExecutionReopenable(file, execution, requestedBy).closedAt === null) return file;
  return updateLatestEntry(file, execution, r => ({ ...r, closedAt: null }));
};

/**
 * What the Task side knows about one copy across every Task: its current entry (open, else the
 * latest linked) with that Task, and whether any of its entries ever started.
 */
export type TaskExecutionHistory = Readonly<{ currentTaskId: string; current: TaskExecutionResource; everStarted: boolean }>;
const copyIdField = (execution: TaskExecutionReference): string => "agentRunId" in execution
  ? `target_agent_run_id "${execution.agentRunId}"` : `target_team_run_id "${execution.teamRunId}"`;
const newCopyHint = (taskId: string) => `or delegate Task ${taskId} to a new copy with recipient_address.`;
/**
 * Assign-existing eligibility on the copy's history (items 3-6 of the design's list; Task readability
 * and status are the caller's). Only an `assigned` copy, by its most recent assigner, whose current
 * Task is closed, that ever started, and not to the Task it already has.
 */
export const assertTaskExecutionAssignable = (history: TaskExecutionHistory | null,
  input: Readonly<{ requestedBy: string; taskId: string; currentTaskStatus?: string }>): void => {
  if (!history) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", `This copy belongs to no Task; delegate Task ${input.taskId} with recipient_address instead.`);
  const { current, currentTaskId } = history;
  if (current.role !== "assigned") {
    throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "This copy is sub-work or a helper of a Task worker, not an assignment; "
      + `only an assigned copy can be given a new Task. Delegate Task ${input.taskId} to a new copy with recipient_address.`);
  }
  if (current.assignedBy !== input.requestedBy) {
    throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "Only the run that made this copy's most recent assignment can give it a new Task; "
      + newCopyHint(input.taskId));
  }
  if (current.closedAt === null) {
    throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", `This copy still works on Task ${currentTaskId}`
      + `${input.currentTaskStatus ? ` (${input.currentTaskStatus})` : ""}. Mark it DONE or CANCELLED first, ${newCopyHint(input.taskId)}`);
  }
  if (currentTaskId === input.taskId) {
    throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", `This copy's most recent assignment is already Task ${input.taskId}. To continue it, `
      + `move Task ${input.taskId} to TODO or IN_PROGRESS with create_or_update_task, then message the copy (for a Team, its coordinator).`);
  }
  if (!history.everStarted) {
    throw new ProjectError("TASK_REACTIVATION_UNAVAILABLE", `This copy never started, so it has no conversation to resume; ${newCopyHint(input.taskId)}`);
  }
};
/** The reopen refusal when the reopened Task is not the copy's current Task (REQ-007): names it and the working next step. */
export const notCurrentTaskMessage = (execution: TaskExecutionReference, current: Readonly<{ taskId: string; status: string }>, reopenedTaskId: string): string =>
  `This copy's current Task is ${current.taskId} (${current.status}); reopening Task ${reopenedTaskId} does not reach it. `
  + `To have this copy continue Task ${reopenedTaskId}, call delegate_task with ${copyIdField(execution)} and task_id "${reopenedTaskId}".`;

const outcomes: Record<TaskExecutionResource["start"], TaskAssignmentOutcome> = { started: "accepted", starting: "not_confirmed", failed: "failed" };
const assignmentView = (r: TaskExecutionResource): TaskAssignmentView => "agentRunId" in r.execution
  ? { kind: "agent", agentRunId: r.execution.agentRunId, assignedBy: r.assignedBy!, outcome: outcomes[r.start] }
  : { kind: "team", teamRunId: r.execution.teamRunId, teamCoordinatorAgentRunId: r.teamCoordinatorAgentRunId!, assignedBy: r.assignedBy!, outcome: outcomes[r.start] };
/** The Manager's read of open assignments (`assigned` entries not closed). */
export const openAssignments = (file: TaskExecutionResourceFile): TaskAssignmentView[] =>
  file.executionResources.filter(r => r.role === "assigned" && r.closedAt === null).map(assignmentView);
/** Every closed assignment period, in link order (a returning copy appears once per earlier period). */
export const closedAssignments = (file: TaskExecutionResourceFile): TaskAssignmentView[] =>
  file.executionResources.filter(r => r.role === "assigned" && r.closedAt !== null).map(assignmentView);

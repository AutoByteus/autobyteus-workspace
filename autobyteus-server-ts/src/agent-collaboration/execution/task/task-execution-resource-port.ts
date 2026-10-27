import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";

/**
 * Neutral contract between collaboration runtime and the business Task side. "Task" means the
 * business Task; `taskId` is opaque to the runtime (equality/dedupe only). The runtime stores no
 * Task facts: it asks this port, which answers from the Task side's loaded agent run resources.
 */
/** Refusal text when someone other than the assigner tries to continue a closed task agent (wording §7.3). */
export const ASSIGNER_ONLY_REACTIVATION_MESSAGE = "This task agent's Task is closed. Only the agent that assigned the Task can continue it: "
  + "set the Task to TODO or IN_PROGRESS, then message the task agent's run id (for a task agent team, its coordinator's run id).";
export type TaskExecutionRole = "assigned" | "delegated" | "broughtIn";
export type TaskExecutionOwner = Readonly<{ taskId: string; execution: TaskExecutionReference; open: boolean }>;
/** The text of a Task with no Project that an assignment creates (description-only delegation by an unowned sender). */
export type AdHocTaskContent = Readonly<{ description: string; referenceFiles: readonly string[] }>;
/** What an assignment joins: an existing Task, or a new Task with no Project created by the link itself. */
export type TaskExecutionAssignmentTarget =
  | Readonly<{ taskId: string; adHocTask?: never }>
  | Readonly<{ adHocTask: AdHocTaskContent; taskId?: never }>;
export type NewTaskExecutionLinkInput = Readonly<{
  hostRoot: RootExecutionIdentity; execution: TaskExecutionReference; teamCoordinatorAgentRunId?: string;
}> & (
  | (Readonly<{ role: "assigned"; assignedBy: string; /** The address delegated to (the root's display name). */ recipientAddress: string }>
    & TaskExecutionAssignmentTarget)
  | Readonly<{ role: "delegated"; creator: TaskExecutionReference }>
);

/**
 * Assigning a Task to an existing copy (DS-002): the copy found in the sender's root, with its host
 * root and (for a Team) its coordinator, and the run asking for it.
 */
export type ExistingTaskExecutionAssignInput = Readonly<{
  hostRoot: RootExecutionIdentity; execution: TaskExecutionReference; teamCoordinatorAgentRunId?: string; taskId: string; assignedBy: string;
}>;

export interface TaskExecutionResourcePort {
  /**
   * Saved work for a non-owned assignment of a Project Task named by `reference` (the agent's `task_id`: its key
   * or ID): its `taskId` (the only identity used afterwards), its agent-facing `taskReference` (for texts), and
   * its description and files. Unknown, DONE, CANCELLED or unreadable Tasks, and Tasks with no Project, reject.
   */
  resolveAssignment(reference: string): Promise<Readonly<{ taskId: string; taskReference: string;
    /** The Project the Task belongs to (it names the Task in the worker's first message). */ projectId: string;
    /** Its title (routing requests and decision records name the Task by it). */ title: string; description: string;
    /** The Task's comment texts, oldest first (they follow the description in the delegated work). */ comments: string[]; referenceFiles: string[] }>>;
  /**
   * Records the agent run `starting` before any of its resources are acquired; returns the Task it
   * joined. An `adHocTask` assignment first creates that Task (no Project) and returns its new ID.
   */
  linkNewTaskExecution(input: NewTaskExecutionLinkInput): Promise<Readonly<{ taskId: string }>>;
  /** A Task's identity by its ID (a task agent's own Task, when it delegates part of its work; autobyteus-32 D1). */
  describeTask(taskId: string): Promise<DelegatedTaskIdentityView>;
  markStarted(execution: TaskExecutionReference): Promise<void>;
  markFailed(execution: TaskExecutionReference, error: Readonly<{ code: string; message: string }>): Promise<void>;
  /**
   * Owner of a containment chain (innermost first): the innermost element that belongs to a Task
   * decides, by its current Task (the copy's open entry, else its latest one). `null` when no element
   * belongs to a Task and all Task resource data is readable; an unknown chain while any Task's data is
   * unreadable rejects TASK_AGENT_RESOURCES_UNAVAILABLE.
   */
  ownerOf(chain: readonly TaskExecutionReference[]): TaskExecutionOwner | null;
  /** The copy's current Task entry is open. */
  isOpen(execution: TaskExecutionReference): boolean;
  /** Every copy hosted by this root whose current Task entry is closed; an unreadable Task contributes none. Never throws. */
  closedTaskExecutionsIn(hostRoot: RootExecutionIdentity): readonly TaskExecutionReference[];
  /** Rejects TASK_AGENT_RESOURCES_UNAVAILABLE while any Task's resource data is unreadable. */
  assertResourceDataReadable(): void;
  /**
   * Read-only, advisory reactivation eligibility of a copy's current assignment: its Task exists and is
   * not DONE or CANCELLED, `requestedBy` is the entry's assigner and the assignment started. When the
   * current Task is closed but an earlier Task of the copy was reopened, the refusal names the current
   * Task and points to `delegate_task` with the copy's ID. Rejects with a coded error (one of
   * TASK_REACTIVATION_REJECTION_CODES).
   */
  assertReopenable(input: TaskExecutionReopenInput): Promise<void>;
  /**
   * Reopens that one entry under the copy's and then the Task's ordering (DONE or CANCELLED is entirely
   * before or after), re-validating every condition. Never writes the Task status. `reopened: false`
   * when the entry was already open.
   */
  reopenAssignment(input: TaskExecutionReopenInput): Promise<TaskExecutionReopenResult>;
  /**
   * Read-only, advisory eligibility of assigning Task `taskId` to an existing copy (run before any
   * runtime step): all Task resource data readable; the Task exists, is unique and is not DONE or
   * CANCELLED; the copy's current entry is an `assigned` entry made by `requestedBy` (it may hold other open
   * Tasks); some entry of the copy ever started; and `taskId` is not its closed current Task. Rejects with a
   * coded error.
   */
  assertAssignable(input: Readonly<{ execution: TaskExecutionReference; requestedBy: string; taskId: string }>): Promise<void>;
  /** The agent-facing references of the copy's open Tasks other than `exceptTaskId`, oldest first (for the given-Task message). */
  openTaskReferencesOf(execution: TaskExecutionReference, exceptTaskId: string): Promise<string[]>;
  /**
   * The commit: re-checks every eligibility condition under the copy's and then the Task's ordering
   * and appends the copy's new `starting` assignment entry to the Task (earlier entries are kept).
   */
  assignExistingTaskExecution(input: ExistingTaskExecutionAssignInput): Promise<void>;
  /**
   * The live status of these task executions of a root may have changed (an agent in them changed
   * status, or the root stopped admitting). Synchronous; never throws and never reads files.
   */
  taskExecutionsStatusChanged(hostRoot: RootExecutionIdentity, references: readonly TaskExecutionReference[]): void;
}

/** A Task's key and Project (both null for a Task with no Project) and its title (else its description's first line). */
export type DelegatedTaskIdentityView = Readonly<{ taskKey: string | null; projectId: string | null; title: string }>;

/** A reactivation request: the assignment's agent run and the run asking for it. */
export type TaskExecutionReopenInput = Readonly<{ execution: TaskExecutionReference; requestedBy: string }>;
export type TaskExecutionReopenResult = Readonly<{ taskId: string; reopened: boolean }>;

/** Task → runtime: stop exactly these closed agent runs in one host root. `null`: the root is not active. */
export type TaskExecutionReleaseRequest = (hostRoot: RootExecutionIdentity, executions: readonly TaskExecutionReference[])
  => Promise<readonly TaskExecutionStopResult[]> | null;
/** The release of a run this root hosts: `stopped`, or why not. */
export type TaskExecutionReleaseResult = Readonly<{
  execution: TaskExecutionReference; stopped: boolean; error?: Readonly<{ code: string; message: string }>;
}>;
/** A run on a peer node (AR-007): fenced by the closed Task, not stopped; `message` says where it keeps running. */
export type TaskExecutionRemoteFence = Readonly<{ execution: TaskExecutionReference; outcome: "fenced_remote"; stopped: false; message: string }>;
export type TaskExecutionStopResult = TaskExecutionReleaseResult | TaskExecutionRemoteFence;

/** Coded port rejections; implementations throw errors carrying one of these `code`s. */
export const TASK_EXECUTION_RESOURCE_REJECTION_CODES = ["TASK_AGENT_RESOURCE_CLOSED", "TASK_AGENT_RESOURCE_CONFLICT", "TASK_AGENT_RESOURCES_UNAVAILABLE", "TASK_AGENT_RESOURCE_OWNED_SENDER"] as const;
export type TaskExecutionResourceRejectionCode = typeof TASK_EXECUTION_RESOURCE_REJECTION_CODES[number];
export const taskExecutionResourceRejectionCode = (error: unknown): TaskExecutionResourceRejectionCode | null => {
  const code = (error as { code?: unknown } | null)?.code;
  return (TASK_EXECUTION_RESOURCE_REJECTION_CODES as readonly unknown[]).includes(code) ? code as TaskExecutionResourceRejectionCode : null;
};
/** Coded reactivation rejections: the port rejections plus a deleted Task and an assignment that never started. */
export const TASK_REACTIVATION_REJECTION_CODES = [...TASK_EXECUTION_RESOURCE_REJECTION_CODES, "TASK_NOT_FOUND", "TASK_REACTIVATION_UNAVAILABLE"] as const;
export type TaskReactivationRejectionCode = typeof TASK_REACTIVATION_REJECTION_CODES[number];
export const taskReactivationRejectionCode = (error: unknown): TaskReactivationRejectionCode | null => {
  const code = (error as { code?: unknown } | null)?.code;
  return (TASK_REACTIVATION_REJECTION_CODES as readonly unknown[]).includes(code) ? code as TaskReactivationRejectionCode : null;
};

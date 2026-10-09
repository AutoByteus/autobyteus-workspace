import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";

/**
 * Neutral contract between collaboration runtime and the business Task side. "Task" means the
 * business Task; `taskId` is opaque to the runtime (equality/dedupe only). The runtime stores no
 * Task facts: it asks this port, which answers from the Task side's loaded agent run resources.
 */
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
  | Readonly<{ role: "delegated" | "broughtIn"; creator: TaskExecutionReference }>
);

export interface TaskExecutionResourcePort {
  /** Saved work for a non-owned assignment of a Project Task; unknown, DONE, CANCELLED or unreadable Tasks reject. */
  resolveAssignment(taskId: string): Promise<Readonly<{ description: string; referenceFiles: string[] }>>;
  /**
   * Records the agent run `starting` before any of its resources are acquired; returns the Task it
   * joined. An `adHocTask` assignment first creates that Task (no Project) and returns its new ID.
   */
  linkNewTaskExecution(input: NewTaskExecutionLinkInput): Promise<Readonly<{ taskId: string }>>;
  markStarted(execution: TaskExecutionReference): Promise<void>;
  markFailed(execution: TaskExecutionReference, error: Readonly<{ code: string; message: string }>): Promise<void>;
  /**
   * Innermost linked owner of a containment chain. `null` when no element belongs to a Task and
   * all Task resource data is readable. Mixed Tasks reject TASK_AGENT_RESOURCE_CONFLICT; an unknown chain
   * while any Task's data is unreadable rejects TASK_AGENT_RESOURCES_UNAVAILABLE.
   */
  ownerOf(chain: readonly TaskExecutionReference[]): TaskExecutionOwner | null;
  isOpen(execution: TaskExecutionReference): boolean;
  openTaskExecutions(taskId: string, role: TaskExecutionRole): readonly TaskExecutionReference[];
  /** Every closed (Task DONE or CANCELLED) agent run hosted by this root; an unreadable Task contributes none. Never throws. */
  closedTaskExecutionsIn(hostRoot: RootExecutionIdentity): readonly TaskExecutionReference[];
  /** Rejects TASK_AGENT_RESOURCES_UNAVAILABLE while any Task's resource data is unreadable. */
  assertResourceDataReadable(): void;
  /**
   * Read-only, advisory reactivation eligibility of one closed assignment: the Task exists and is not
   * DONE or CANCELLED, `requestedBy` is the entry's assigner and the assignment started. Rejects with a coded error
   * (one of TASK_REACTIVATION_REJECTION_CODES).
   */
  assertReopenable(input: TaskExecutionReopenInput): Promise<void>;
  /**
   * Reopens that one entry under the Task's ordering with DONE or CANCELLED, re-validating every condition. Never
   * writes the Task status. `reopened: false` when the entry was already open.
   */
  reopenAssignment(input: TaskExecutionReopenInput): Promise<TaskExecutionReopenResult>;
  /**
   * The live status of these task executions of a root may have changed (an agent in them changed
   * status, or the root stopped admitting). Synchronous; never throws and never reads files.
   */
  taskExecutionsStatusChanged(hostRoot: RootExecutionIdentity, references: readonly TaskExecutionReference[]): void;
}

/** A reactivation request: the assignment's agent run and the run asking for it. */
export type TaskExecutionReopenInput = Readonly<{ execution: TaskExecutionReference; requestedBy: string }>;
export type TaskExecutionReopenResult = Readonly<{ taskId: string; reopened: boolean }>;

/** Task → runtime: stop exactly these closed agent runs in one host root. `null`: the root is not active. */
export type TaskExecutionReleaseRequest = (hostRoot: RootExecutionIdentity, executions: readonly TaskExecutionReference[])
  => Promise<readonly TaskExecutionStopResult[]> | null;
export type TaskExecutionStopResult = Readonly<{
  execution: TaskExecutionReference; stopped: boolean; error?: Readonly<{ code: string; message: string }>;
}>;

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

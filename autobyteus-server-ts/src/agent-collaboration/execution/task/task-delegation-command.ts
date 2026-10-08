import type { CollaborationMemberExecutionIdentity, RootSubjectKind } from "../domain/root-execution-identity.js";

export type TaskDelegationContext = Readonly<{ identity: CollaborationMemberExecutionIdentity }>;

export type DelegateTaskInput =
  | Readonly<{ recipient_address: string; task_id: string; description?: never; reference_files?: never }>
  | Readonly<{ recipient_address: string; description: string; reference_files?: string[]; task_id?: never }>;

/**
 * A delegation is a spawn: success names the child ingress and whether the copy is an Agent or a
 * Team (whose ingress is its coordinator); failure means nothing was started. `task_id` is present
 * only when the delegation created a Task with no Project for the copy.
 */
export type DelegateTaskTargetKind = "agent" | "team";
export type DelegateTaskResult =
  | Readonly<{ target_agent_run_id: string; target_kind: DelegateTaskTargetKind; task_id?: string }>
  | Readonly<{ target_agent_run_id: null; message: string }>;

export type TaskDelegationErrorCode =
  | "TASK_AGENT_RESOURCE_CLOSED"
  | "TASK_AGENT_RESOURCE_CONFLICT"
  | "TASK_AGENT_RESOURCES_UNAVAILABLE"
  | "TASK_AGENT_RESOURCE_OWNED_SENDER"
  | "VALIDATION_ERROR"
  | "INVALID_REFERENCE_FILE"
  | "ROOT_RUN_NOT_ACTIVE"
  | "TASK_EXECUTION_CONTEXT_UNAVAILABLE"
  | "TASK_EXECUTION_RESTORE_FAILED"
  | "TASK_REACTIVATION_STOP_PENDING";

export class TaskDelegationError extends Error {
  constructor(readonly code: TaskDelegationErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TaskDelegationError";
  }
}

export class RootTaskPersistenceFinalizationIndeterminateError extends Error {
  constructor(
    readonly rootSubjectKind: RootSubjectKind,
    readonly fileRole: string,
    readonly stage: string,
    message = `${rootSubjectKind} task persistence '${fileRole}' is indeterminate at '${stage}'.`,
  ) {
    super(message);
    this.name = "RootTaskPersistenceFinalizationIndeterminateError";
  }
}

/** Durable/publication/accepted-input uncertainty must not masquerade as a proven no-work failure. */
export class TaskDispatchIndeterminateError extends Error {
  readonly code = "TASK_DISPATCH_INDETERMINATE";
  constructor(readonly execution: import("./task-execution-reference.js").TaskExecutionReference, cause: unknown) {
    super("Task dispatch has durable or accepted-work uncertainty; inspect its exact link before retrying.", { cause });
    this.name = "TaskDispatchIndeterminateError";
  }
}

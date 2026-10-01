import type { CollaborationMemberExecutionIdentity, RootSubjectKind } from "../domain/root-execution-identity.js";

export type TaskDelegationContext = Readonly<{ identity: CollaborationMemberExecutionIdentity }>;

export type DelegateTaskInput = Readonly<{
  recipient_address: string;
  description: string;
  reference_files?: string[];
}>;

/** A delegation is a spawn: success names the child ingress; failure means nothing was started. */
export type DelegateTaskResult =
  | Readonly<{ target_agent_run_id: string }>
  | Readonly<{ target_agent_run_id: null; message: string }>;

export type TaskDelegationErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_REFERENCE_FILE"
  | "ROOT_RUN_NOT_ACTIVE"
  | "TASK_EXECUTION_CONTEXT_UNAVAILABLE"
  | "TASK_EXECUTION_RESTORE_FAILED";

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

/** A committed local teardown of a quiet task execution did not finish; the root must fail-stop. */
export class TaskExecutionTeardownIndeterminateError extends Error {
  constructor(readonly taskExecutionRunId: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TaskExecutionTeardownIndeterminateError";
  }
}

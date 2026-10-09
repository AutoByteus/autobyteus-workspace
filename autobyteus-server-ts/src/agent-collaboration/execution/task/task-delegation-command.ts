import type { CollaborationMemberExecutionIdentity, RootSubjectKind } from "../domain/root-execution-identity.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";

export type TaskDelegationContext = Readonly<{ identity: CollaborationMemberExecutionIdentity }>;

/** `delegate_task` with an address: spawns a new copy for a saved Task (`task_id`) or for described work. */
export type SpawnTaskInput =
  | Readonly<{ recipient_address: string; task_id: string; description?: never; reference_files?: never }>
  | Readonly<{ recipient_address: string; description: string; reference_files?: string[]; task_id?: never }>;

/** `delegate_task` with a copy's own ID: assigns saved Task `taskId` to that existing copy in the sender's root. */
export type AssignToExistingCopyInput = Readonly<{ copy: TaskExecutionReference; taskId: string }>;

/** The copy a delegation reached, named for what it is: an Agent copy, or a Team copy and its coordinator. */
export type DelegatedCopy =
  | Readonly<{ kind: "agent"; agentRunId: string }>
  | Readonly<{ kind: "team"; teamRunId: string; teamCoordinatorAgentRunId: string }>;
/**
 * Internal result of both delegation commands. Success names the copy; `taskId` is present only when the
 * delegation created a Task with no Project. Failure means nothing was started (or, after an existing-copy
 * commit, that its work was not delivered) and carries the reason.
 */
export type TaskDelegationOutcome =
  | Readonly<{ delegated: true; copy: DelegatedCopy; taskId?: string }>
  | Readonly<{ delegated: false; message: string }>;

/** The copy at a target: its reference and ingress (the Agent itself, or the Team's coordinator). */
export const delegatedCopyOf = (target: Readonly<{ execution: TaskExecutionReference; ingressAgentRunId: string }>): DelegatedCopy =>
  "agentRunId" in target.execution
    ? { kind: "agent", agentRunId: target.execution.agentRunId }
    : { kind: "team", teamRunId: target.execution.teamRunId, teamCoordinatorAgentRunId: target.ingressAgentRunId };
/** The reverse: a delegated copy's reference and ingress. */
export const copyTargetOf = (copy: DelegatedCopy): Readonly<{ execution: TaskExecutionReference; ingressAgentRunId: string }> =>
  copy.kind === "agent"
    ? { execution: { agentRunId: copy.agentRunId }, ingressAgentRunId: copy.agentRunId }
    : { execution: { teamRunId: copy.teamRunId }, ingressAgentRunId: copy.teamCoordinatorAgentRunId };

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
  | "TASK_REACTIVATION_STOP_PENDING"
  | "TASK_COPY_NOT_ASSIGNABLE";

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

/** Durable/publication/accepted-input uncertainty must not masquerade as a proven no-work failure. */
export class TaskDispatchIndeterminateError extends Error {
  readonly code = "TASK_DISPATCH_INDETERMINATE";
  constructor(readonly execution: TaskExecutionReference, cause: unknown) {
    super("Task dispatch has durable or accepted-work uncertainty; inspect its exact link before retrying.", { cause });
    this.name = "TaskDispatchIndeterminateError";
  }
}

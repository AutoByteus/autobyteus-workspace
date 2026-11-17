import type { CollaborationMemberExecutionIdentity, RootSubjectKind } from "../domain/root-execution-identity.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";
import type { RoutingDecisionDraft } from "../../../model-routing/domain/model-routing-types.js";

export type TaskDelegationContext = Readonly<{ identity: CollaborationMemberExecutionIdentity }>;

/**
 * `delegate_task` with an address: starts a new delegated run for a saved Task (`task_id`) or for described work.
 * `node` names a registered peer node (DEC-111): the address is then an Agent's catalog address there.
 */
export type SpawnTaskInput =
  | Readonly<{ recipient_address: string; task_id: string; node?: string; description?: never; reference_files?: never }>
  | Readonly<{ recipient_address: string; description: string; reference_files?: string[]; node?: string; task_id?: never }>;

/** `delegate_task` with a delegated run's own ID: assigns saved Task `taskId` to that existing delegated run of the sender's run. */
export type AssignToExistingDelegatedRunInput = Readonly<{ delegatedRun: TaskExecutionReference; taskId: string }>;

/**
 * What dispatch reads from a root's placement: the launch notes of a fresh catalog admission (DS-003).
 * Structural, so task execution never depends on catalog admission.
 */
export type TaskDelegatedRunPlacementLaunchNotes = Readonly<{
  launchNotes?: readonly string[];
  /** A fresh catalog admission resolved while Model Routing was on: its decision records (REQ-012). */
  routingDecision?: RoutingDecisionDraft;
}>;

/** The delegated run a delegation reached, named for what it is: an Agent run, or a Team run and its coordinator. */
export type DelegatedRun =
  | Readonly<{ kind: "agent"; agentRunId: string }>
  | Readonly<{ kind: "team"; teamRunId: string; teamCoordinatorAgentRunId: string }>;
/**
 * Internal result of both delegation commands. Success names the delegated run, and `node` the peer it runs on when
 * it is a remote run (CM-11); `taskId` is present only when the delegation created a Task with no Project; `launchNotes` only when a new delegated run's freshly resolved launch
 * skipped a configured layer (REQ-008). Failure means nothing was started (or, after an existing delegated run's
 * commit, that its work was not delivered) and carries the reason.
 */
export type TaskDelegationOutcome =
  | Readonly<{ delegated: true; delegatedRun: DelegatedRun; taskId?: string; launchNotes?: readonly string[]; node?: string }>
  | Readonly<{ delegated: false; message: string }>;

/** The delegated run at a target: its reference and ingress (the Agent itself, or the Team's coordinator). */
export const delegatedRunOf = (target: Readonly<{ execution: TaskExecutionReference; ingressAgentRunId: string }>): DelegatedRun =>
  "agentRunId" in target.execution
    ? { kind: "agent", agentRunId: target.execution.agentRunId }
    : { kind: "team", teamRunId: target.execution.teamRunId, teamCoordinatorAgentRunId: target.ingressAgentRunId };
/** The reverse: a delegated run's reference and ingress. */
export const delegatedRunTargetOf = (run: DelegatedRun): Readonly<{ execution: TaskExecutionReference; ingressAgentRunId: string }> =>
  run.kind === "agent"
    ? { execution: { agentRunId: run.agentRunId }, ingressAgentRunId: run.agentRunId }
    : { execution: { teamRunId: run.teamRunId }, ingressAgentRunId: run.teamCoordinatorAgentRunId };

export type TaskDelegationErrorCode =
  | "TASK_AGENT_RESOURCE_CLOSED"
  | "TASK_AGENT_RESOURCE_CONFLICT"
  | "TASK_AGENT_RESOURCES_UNAVAILABLE"
  | "TASK_AGENT_RESOURCE_OWNED_SENDER"
  | "TASK_PROJECT_FOLDER_UNAVAILABLE"
  | "VALIDATION_ERROR"
  | "INVALID_REFERENCE_FILE"
  | "ROOT_RUN_NOT_ACTIVE"
  | "TASK_EXECUTION_CONTEXT_UNAVAILABLE"
  | "TASK_EXECUTION_RESTORE_FAILED"
  | "TASK_REACTIVATION_STOP_PENDING"
  | "TASK_EXECUTION_STOPPING"
  | "TASK_DELEGATED_RUN_NOT_ASSIGNABLE";

/** Refusal text when the root no longer accepts messages or delegations (wording §7.3). */
export const ROOT_NOT_ACTIVE_MESSAGE = "This work is stopping or has stopped, so the message or delegation was not sent.";

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

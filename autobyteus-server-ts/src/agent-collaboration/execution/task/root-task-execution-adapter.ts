import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { TaskExecutionPreparationOperation } from "../../../agent-team-execution/domain/prepared-task-execution.js";
import type { CollaborationMemberExecutionIdentity, RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";
import type { AgentExecutionStatus } from "@autobyteus/collaboration-stream-contracts";

export type TaskExecutionActivationCommitResult = Readonly<{ committed: true }> | Readonly<{ committed: false; message: string }>;
export type PreparedTaskExecutionActivation = Readonly<{
  targetAgentRunId: string;
  commit(): Promise<TaskExecutionActivationCommitResult>;
  acceptSeed(assertOpen: () => void): Promise<AgentOperationResult>;
}>;
/** Described work always has a packet; a seedless copy is a brought-in helper started by its first message. */
export type TaskExecutionActivationPreparation<TPlacement> = Readonly<{
  identity: CollaborationMemberExecutionIdentity; placement: TPlacement; startedAt: string;
  workPacket?: AgentInputUserMessage;
}>;
/** The exact planned copy: its root, reference and ingress (the Agent, or the Team's coordinator). */
export type TaskExecutionTarget = Readonly<{
  root: RootExecutionIdentity; execution: TaskExecutionReference; ingressAgentRunId: string;
}>;
export type TaskExecutionActivationPlan<TPlacement> = TaskExecutionActivationPreparation<TPlacement> & Readonly<{
  target: TaskExecutionTarget;
  ownedAgentRunIds: readonly string[];
  /** The canonical address the copy was delegated to (recorded on an assignment as its display name). */
  recipientAddress: string;
}>;
export interface TaskExecutionActivationOperation {
  prepare(): Promise<PreparedTaskExecutionActivation>;
  cancel(): void;
  release(): Promise<AgentOperationResult>;
}
/** A registered copy: retained exact activation authority plus its planned members (for pre-commit ownership). */
export type RegisteredTaskActivation = Readonly<{
  target: TaskExecutionTarget; ownedAgentRunIds: readonly string[]; operation: TaskExecutionActivationOperation;
}>;

/** Root-private aggregate retains the local authority even when its prepare rejects. */
export function beginRootTaskActivation(input: {
  prepare(assertAccepting: () => void, ownLocal: (local: TaskExecutionPreparationOperation) => void): Promise<PreparedTaskExecutionActivation>;
}): TaskExecutionActivationOperation {
  let local: TaskExecutionPreparationOperation | null = null;
  let callbacks: typeof input | null = input;
  let cancelled = false;
  let settled = false;
  let released = false;
  let attempt: Promise<PreparedTaskExecutionActivation> | null = null;
  let releasing: Promise<AgentOperationResult> | null = null;
  const control: TaskExecutionActivationOperation = Object.freeze({
    cancel: () => { cancelled = true; local?.cancel(); },
    prepare: () => {
      if (attempt) return attempt;
      const assertAccepting = () => { if (cancelled) throw new Error("Task activation is closed."); };
      try { assertAccepting(); } catch (error) { return Promise.reject(error); }
      attempt = callbacks!.prepare(assertAccepting, (value) => {
        local = value;
        if (cancelled) value.cancel();
      }).finally(() => {
        settled = true;
        if (cancelled) void control.release().catch((error) => console.warn("ROOT_TASK_RELEASE_FAILED", error));
      });
      return attempt;
    },
    release: () => {
      control.cancel();
      if (released) return Promise.resolve({ accepted: true as const });
      if (releasing) return releasing;
      const release = (async () => {
        const result = local ? await local.release() : { accepted: true };
        if (!result.accepted || (attempt && !settled)) return { accepted: false, code: "RUNTIME_RELEASE_PENDING" };
        released = true;
        callbacks = null; input = null as never; local = null; attempt = null;
        return { accepted: true };
      })();
      releasing = release;
      void release.finally(() => { if (releasing === release) releasing = null; }).catch(() => undefined);
      return release;
    },
  });
  return control;
}

/** Subject adapter alone owns physical hosts, trees, indexes and retained preparation maps. */
export interface RootTaskExecutionAdapter<TPlacement> {
  readonly root: RootExecutionIdentity;
  isOpen(): boolean;
  authorize(identity: CollaborationMemberExecutionIdentity): void;
  assertCurrentSchemaReady(): void;
  planActivation(input: TaskExecutionActivationPreparation<TPlacement>): Promise<TaskExecutionActivationPlan<TPlacement>>;
  beginActivation(plan: TaskExecutionActivationPlan<TPlacement>): TaskExecutionActivationOperation;
  /** The registered activation of an exact copy, retained for exact release. */
  registrationFor(reference: TaskExecutionReference): RegisteredTaskActivation | null;
  /**
   * Containment chain used for ownership questions: the index chain (innermost first) or, for an
   * agent of a copy not yet committed, the registered copies whose planned members include it.
   */
  ownershipChainFor(agentRunId: string): readonly TaskExecutionReference[];
  /** The committed copy at `address` among the given references, with its ingress. */
  taskExecutionAt(address: string, among: readonly TaskExecutionReference[]): TaskExecutionTarget | null;
  /** The copy with exactly this reference in this root's current tree (any depth), with its ingress; `null` otherwise. */
  taskExecutionTargetOf(reference: TaskExecutionReference): TaskExecutionTarget | null;
  cancelOwnedExecution(reference: TaskExecutionReference): void;
  /** Exact release of a committed copy; `EXACT_RELEASE_AUTHORITY_UNAVAILABLE` when the root holds none. */
  releaseOwnedExecution(reference: TaskExecutionReference): Promise<AgentOperationResult>;
  /**
   * Reactivation, after the exact release settled: drops the released (fenced or terminated)
   * authority and retained registration of exactly this copy, so restore builds a fresh one.
   */
  discardReleasedExecution(reference: TaskExecutionReference): void;
  /** The task execution whose ingress (the Agent itself, or a Team's coordinator) is this agent run; `null` otherwise. */
  taskExecutionWithIngress(agentRunId: string): TaskExecutionReference | null;
  /** The reference is a task execution node of this root's current tree (at any depth). */
  containsTaskExecution(reference: TaskExecutionReference): boolean;
  /** Publishes the root's sequenced "task executions closed" event (Task DONE or CANCELLED) into its publisher. */
  publishTaskExecutionsClosed(references: readonly TaskExecutionReference[]): void;
  /** Publishes the root's sequenced "task executions reopened" event (reactivation) into its publisher. */
  publishTaskExecutionsReopened(references: readonly TaskExecutionReference[]): void;
  /** Index-only containment chain for idle shutdown and restore. */
  taskExecutionChainFor(agentRunId: string): readonly TaskExecutionReference[];
  /** Every task execution node of the root's current tree (any depth). */
  listTaskExecutions(): readonly TaskExecutionReference[];
  isLive(reference: TaskExecutionReference): boolean;
  /**
   * The copy's own live status, read without waking anything: an Agent's status, or a Team's folded
   * member status; `offline` when it is not live.
   */
  taskExecutionStatus(reference: TaskExecutionReference): AgentExecutionStatus;
  assertRestorableChain(agentRunId: string): void;
  restoreChain(agentRunId: string, assertOpen: () => void): Promise<void>;
  tryShutDownIfQuiet(reference: TaskExecutionReference): Promise<boolean>;
}

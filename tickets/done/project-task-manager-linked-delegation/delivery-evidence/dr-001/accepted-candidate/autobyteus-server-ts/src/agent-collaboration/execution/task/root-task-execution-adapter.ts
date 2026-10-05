import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { TaskExecutionPreparationOperation } from "../../../agent-team-execution/domain/prepared-task-execution.js";
import type { CollaborationMemberExecutionIdentity, RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";
import type { TaskExecutionLifetimeStamp, TaskExecutionLinkIdentity } from "./task-execution-lifetime.js";

export type TaskExecutionActivationCommitResult = Readonly<{ committed: true }> | Readonly<{ committed: false; message: string }>;
export type PreparedTaskExecutionActivation = Readonly<{
  targetAgentRunId: string;
  commit(): Promise<TaskExecutionActivationCommitResult>;
  acceptSeed(assertOpen: () => void): Promise<AgentOperationResult>;
}>;
/** A seedless helper is always Task-owned; described/assignment work always has a packet. */
export type TaskExecutionActivationWork =
  | Readonly<{ workPacket: AgentInputUserMessage; taskLifetime?: TaskExecutionLifetimeStamp & { purpose: "assignment" | "delegation" } }>
  | Readonly<{ workPacket?: never; taskLifetime: TaskExecutionLifetimeStamp & { purpose: "helper" } }>;
export type TaskExecutionActivationPreparation<TPlacement> = Readonly<{
  identity: CollaborationMemberExecutionIdentity; placement: TPlacement; startedAt: string;
}> & TaskExecutionActivationWork;
export type TaskExecutionActivationPlan<TPlacement> = TaskExecutionActivationPreparation<TPlacement> & Readonly<{
  link: TaskExecutionLinkIdentity;
  ownedAgentRunIds: readonly string[];
}>;
export interface TaskExecutionActivationOperation {
  prepare(): Promise<PreparedTaskExecutionActivation>;
  cancel(): void;
  release(): Promise<AgentOperationResult>;
}
export type RegisteredTaskActivation<TPlacement> = Readonly<{
  plan: Pick<TaskExecutionActivationPlan<TPlacement>, "link" | "ownedAgentRunIds" | "taskLifetime">; operation: TaskExecutionActivationOperation;
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
  registeredActivations(lifetimeId: string): readonly RegisteredTaskActivation<TPlacement>[];
  ownedExecutions(lifetimeId: string): readonly TaskExecutionReference[];
  findLifetimeHelper(lifetimeId: string, address: string): TaskExecutionLinkIdentity | null;
  lifetimeForAgent(agentRunId: string): TaskExecutionLifetimeStamp | undefined;
  linkForExecution(reference: TaskExecutionReference): TaskExecutionLinkIdentity | null;
  cancelOwnedExecution(reference: TaskExecutionReference): void;
  releaseOwnedExecution(reference: TaskExecutionReference): Promise<AgentOperationResult>;
  taskExecutionChainFor(agentRunId: string): readonly TaskExecutionReference[];
  isLive(reference: TaskExecutionReference): boolean;
  assertRestorableChain(agentRunId: string): void;
  restoreChain(agentRunId: string, assertOpen: () => void): Promise<void>;
  tryShutDownIfQuiet(reference: TaskExecutionReference): Promise<boolean>;
}

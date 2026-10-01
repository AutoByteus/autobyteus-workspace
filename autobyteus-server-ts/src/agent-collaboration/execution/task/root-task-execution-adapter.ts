import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";
import type { TaskExecutionReference } from "./task-execution-reference.js";

export type TaskExecutionActivationCommitResult =
  | Readonly<{ committed: true }>
  | Readonly<{ committed: false; message: string }>;

export type PreparedTaskExecutionActivation = Readonly<{
  /** The spawned child ingress: the task Agent, or the task Team's coordinator. */
  targetAgentRunId: string;
  /** One durable tree mutation (execution + delegator), then the first message is released. */
  commit(): Promise<TaskExecutionActivationCommitResult>;
  abort(): Promise<void>;
}>;

export type TaskExecutionActivationPreparation<TPlacement> = Readonly<{
  identity: CollaborationMemberExecutionIdentity;
  placement: TPlacement;
  startedAt: string;
  workPacket: AgentInputUserMessage;
}>;

/**
 * Subject-private port (Team / Org). The root-neutral lifecycle never sees a
 * subject tree, index, registry or persistence coordinator.
 */
export interface RootTaskExecutionAdapter<TPlacement> {
  isOpen(): boolean;
  authorize(identity: CollaborationMemberExecutionIdentity): void;
  assertCurrentSchemaReady(): void;
  prepareActivation(input: TaskExecutionActivationPreparation<TPlacement>): Promise<PreparedTaskExecutionActivation>;
  /**
   * Task executions that contain the agent: the innermost execution first, then
   * each enclosing task Team outward. Empty for agents outside any task execution.
   */
  taskExecutionChainFor(agentRunId: string): readonly TaskExecutionReference[];
  isLive(reference: TaskExecutionReference): boolean;
  /**
   * Read-only precheck before any restore: every shut-down execution in the
   * chain must have a readable ingress conversation. Throws
   * `TASK_EXECUTION_CONTEXT_UNAVAILABLE` otherwise.
   */
  assertRestorableChain(agentRunId: string): void;
  /** Restores shut-down executions in the chain in `restore` mode, outermost first. */
  restoreChain(agentRunId: string): Promise<void>;
  /** Shuts the execution down only if it is quiet; returns whether it was shut down. */
  tryShutDownIfQuiet(reference: TaskExecutionReference): Promise<boolean>;
}

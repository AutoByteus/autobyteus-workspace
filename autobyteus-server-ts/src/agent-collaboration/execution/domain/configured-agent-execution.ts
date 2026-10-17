import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";

export type ConfiguredAgentExecutionSpec = Readonly<{
  agentDefinitionId: string;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  runtimeKind: RuntimeKind;
  workspaceRootPath: string | null;
  platformAgentRunId: string | null;
}>;

export type ConfiguredAgentActivationMode = "fresh" | "restore";

/** The part of an agent's launch a user selection replaces (DEC-005); the runtime stays. */
export type AgentModelChoice = Readonly<{
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
}>;

/**
 * User control of one retained agent execution of a delegated copy (DS-001,
 * DS-002): whether it is stopped, a fence that holds its activation, a restorable forced stop
 * (input stays open, so the next message restores it), and the model swap for its next activation.
 */
export interface RetainedAgentExecutionControl {
  /** No active run, no readiness attempt and no pending activation. */
  isStopped(): boolean;
  /** Runs `operation` while no activation of this agent can start (a pending one is awaited first). */
  withActivationFence<T>(operation: () => Promise<T> | T): Promise<T>;
  /** Interrupts the turn and releases the runtime; the agent stays restorable. */
  releaseRuntimeForUserStop(): Promise<AgentOperationResult>;
  /** The next activation runs on `choice`; throws unless stopped. */
  replaceModelChoice(choice: AgentModelChoice): void;
}

export class CollaborationAgentActivationError extends Error {
  readonly indeterminate: boolean;
  constructor(
    readonly code: string,
    message: string,
    options: { cause?: unknown; indeterminate?: boolean } = {},
  ) {
    super(message);
    this.name = "CollaborationAgentActivationError";
    this.indeterminate = options.indeterminate ?? false;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

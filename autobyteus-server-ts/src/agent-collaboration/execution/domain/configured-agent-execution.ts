import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type { PendingRuntimeSwitch } from "../../../run-history/store/agent-run-metadata-types.js";

export type ConfiguredAgentExecutionSpec = Readonly<{
  agentDefinitionId: string;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  runtimeKind: RuntimeKind;
  workspaceRootPath: string | null;
  platformAgentRunId: string | null;
  /** autobyteus-348: set until the next activation makes the member's agent runtime switch real; absent means none. */
  pendingRuntimeSwitch?: PendingRuntimeSwitch;
}>;

export type ConfiguredAgentActivationMode = "fresh" | "restore";

/**
 * What a stopped member's next activation runs with, as the copy's effective launch or the saved member says (autobyteus-348):
 * the agent runtime, model and settings (DEC-005 and the runtime), the session ID and the pending switch. A node of a Team,
 * Org or copy satisfies it as it is.
 */
export type ConfiguredAgentSelection = Readonly<
  Pick<ConfiguredAgentExecutionSpec, "runtimeKind" | "llmModelIdentifier" | "llmConfig" | "platformAgentRunId" | "pendingRuntimeSwitch">
>;

/**
 * User control of one retained agent execution of a delegated copy (DS-001,
 * DS-002): whether it is stopped, a fence that holds its activation, a restorable forced stop
 * (input stays open, so the next message restores it), and the selection swap for its next activation.
 */
export interface RetainedAgentExecutionControl {
  /** No active run, no readiness attempt and no pending activation. */
  isStopped(): boolean;
  /** Runs `operation` while no activation of this agent can start (a pending one is awaited first). */
  withActivationFence<T>(operation: () => Promise<T> | T): Promise<T>;
  /** Interrupts the turn and releases the runtime; the agent stays restorable. */
  releaseRuntimeForUserStop(): Promise<AgentOperationResult>;
  /** The next activation runs on `selection` (a restore refreshes a retained handle with the node's current state); throws unless stopped. */
  replaceSelection(selection: ConfiguredAgentSelection): void;
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

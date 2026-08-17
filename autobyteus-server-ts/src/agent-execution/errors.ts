export class AgentExecutionError extends Error {
  constructor(message = "Agent execution error") {
    super(message);
    this.name = "AgentExecutionError";
  }
}

export class AgentCreationError extends AgentExecutionError {
  constructor(message = "Agent creation error") {
    super(message);
    this.name = "AgentCreationError";
  }
}

export class AgentTerminationError extends AgentExecutionError {
  constructor(message = "Agent termination error") {
    super(message);
    this.name = "AgentTerminationError";
  }
}

export type AgentRunActivationErrorCode =
  | "AGENT_RUN_ACTIVATION_IN_PROGRESS_CONFLICT"
  | "AGENT_RUN_ACTIVATION_CLEANUP_FAILED"
  | "STANDALONE_AGENT_RUN_ACTIVATION_COMMIT_INDETERMINATE"
  | "PLATFORM_AGENT_RUN_RESTORE_FAILED"
  | "PLATFORM_AGENT_RUN_BINDING_INVALID";

export class AgentRunActivationError extends AgentExecutionError {
  constructor(
    readonly code: AgentRunActivationErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message);
    this.name = "AgentRunActivationError";
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

export class PlatformAgentRunRestoreError extends AgentRunActivationError {
  constructor(message = "The persisted provider conversation could not be restored.", cause?: unknown) {
    super("PLATFORM_AGENT_RUN_RESTORE_FAILED", message, { cause });
    this.name = "PlatformAgentRunRestoreError";
  }
}

export const isAgentRunActivationQuarantineError = (error: unknown): boolean =>
  error instanceof AgentRunActivationError &&
  (error.code === "AGENT_RUN_ACTIVATION_CLEANUP_FAILED" ||
    error.code === "STANDALONE_AGENT_RUN_ACTIVATION_COMMIT_INDETERMINATE");

export type ApplicationAgentToolErrorCode =
  | "APPLICATION_TOOL_INVALID_INPUT"
  | "APPLICATION_TOOL_UNAVAILABLE"
  | "APPLICATION_TOOL_STALE_ROUTE"
  | "APPLICATION_TOOL_EXECUTION_FAILED"
  | "APPLICATION_TOOL_INVALID_RESULT";

export class ApplicationAgentToolError extends Error {
  constructor(
    readonly code: ApplicationAgentToolErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ApplicationAgentToolError";
  }
}

export const applicationAgentToolSafeFailure = (
  error: unknown,
): ApplicationAgentToolError => error instanceof ApplicationAgentToolError
  ? error
  : new ApplicationAgentToolError(
      "APPLICATION_TOOL_EXECUTION_FAILED",
      "Application tool execution failed.",
      { cause: error },
    );

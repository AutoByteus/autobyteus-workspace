export class AgentTeamExecutionError extends Error {
  constructor(message = "Agent team execution error") {
    super(message);
    this.name = "AgentTeamExecutionError";
  }
}

export class AgentTeamCreationError extends AgentTeamExecutionError {
  constructor(message = "Agent team creation error") {
    super(message);
    this.name = "AgentTeamCreationError";
  }
}

export class AgentTeamTerminationError extends AgentTeamExecutionError {
  constructor(message = "Agent team termination error") {
    super(message);
    this.name = "AgentTeamTerminationError";
  }
}

export type TeamAgentActivationErrorCode =
  | "TEAM_AGENT_NATIVE_RESTORE_FAILED"
  | "TEAM_AGENT_WORKSPACE_ACTIVATION_FAILED";

export class TeamAgentActivationError extends AgentTeamExecutionError {
  readonly code: TeamAgentActivationErrorCode;

  constructor(
    code: TeamAgentActivationErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message);
    this.name = "TeamAgentActivationError";
    this.code = code;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

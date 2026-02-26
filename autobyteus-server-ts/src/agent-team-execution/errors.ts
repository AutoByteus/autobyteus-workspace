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

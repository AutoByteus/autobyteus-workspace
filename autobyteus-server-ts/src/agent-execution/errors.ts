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

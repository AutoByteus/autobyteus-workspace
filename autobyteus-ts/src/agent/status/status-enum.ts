export enum AgentStatus {
  UNINITIALIZED = 'uninitialized',
  BOOTSTRAPPING = 'bootstrapping',
  IDLE = 'idle',
  PROCESSING_USER_INPUT = 'processing_user_input',
  AWAITING_LLM_RESPONSE = 'awaiting_llm_response',
  ANALYZING_LLM_RESPONSE = 'analyzing_llm_response',
  AWAITING_TOOL_APPROVAL = 'awaiting_tool_approval',
  TOOL_DENIED = 'tool_denied',
  EXECUTING_TOOL = 'executing_tool',
  PROCESSING_TOOL_RESULT = 'processing_tool_result',
  SHUTTING_DOWN = 'shutting_down',
  SHUTDOWN_COMPLETE = 'shutdown_complete',
  ERROR = 'error'
}

export namespace AgentStatus {
  export function isInitializing(status: AgentStatus): boolean {
    return status === AgentStatus.BOOTSTRAPPING;
  }

  export function isProcessing(status: AgentStatus): boolean {
    return [
      AgentStatus.PROCESSING_USER_INPUT,
      AgentStatus.AWAITING_LLM_RESPONSE,
      AgentStatus.ANALYZING_LLM_RESPONSE,
      AgentStatus.AWAITING_TOOL_APPROVAL,
      AgentStatus.TOOL_DENIED,
      AgentStatus.EXECUTING_TOOL,
      AgentStatus.PROCESSING_TOOL_RESULT
    ].includes(status);
  }

  export function isTerminal(status: AgentStatus): boolean {
    return status === AgentStatus.SHUTDOWN_COMPLETE || status === AgentStatus.ERROR;
  }
}

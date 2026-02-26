export enum AgentStatus {
  Uninitialized = 'uninitialized',
  Bootstrapping = 'bootstrapping',
  Idle = 'idle',
  ProcessingUserInput = 'processing_user_input',
  AwaitingLlmResponse = 'awaiting_llm_response',
  AnalyzingLlmResponse = 'analyzing_llm_response',
  AwaitingToolApproval = 'awaiting_tool_approval',
  ToolDenied = 'tool_denied',
  ExecutingTool = 'executing_tool',
  ProcessingToolResult = 'processing_tool_result',
  ShuttingDown = 'shutting_down',
  ShutdownComplete = 'shutdown_complete',
  Error = 'error',
}

export const DEFAULT_AGENT_STATUS = AgentStatus.Uninitialized

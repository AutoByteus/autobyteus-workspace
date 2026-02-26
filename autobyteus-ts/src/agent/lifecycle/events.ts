export enum LifecycleEvent {
  AGENT_READY = 'agent_ready',
  BEFORE_LLM_CALL = 'before_llm_call',
  AFTER_LLM_RESPONSE = 'after_llm_response',
  BEFORE_TOOL_EXECUTE = 'before_tool_execute',
  AFTER_TOOL_EXECUTE = 'after_tool_execute',
  AGENT_SHUTTING_DOWN = 'agent_shutting_down'
}

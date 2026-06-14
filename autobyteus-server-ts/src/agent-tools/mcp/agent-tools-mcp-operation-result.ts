import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";

export const createAgentToolsMcpSuccessResult = (message: string): AgentOperationResult => ({
  accepted: true,
  code: "success",
  message,
});

export const createAgentToolsMcpErrorResult = (
  message: string,
  code = "tool_execution_failed",
): AgentOperationResult => ({
  accepted: false,
  code,
  message,
});

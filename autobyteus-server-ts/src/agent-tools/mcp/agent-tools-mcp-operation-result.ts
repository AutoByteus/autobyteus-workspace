import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import {
  toAgentToolMcpOperationResult,
  type AgentToolMcpOperationExecutionResult,
} from "./agent-tool-mcp-adapter.js";

export const createAgentToolsMcpSuccessOperationResult = (message: string): AgentOperationResult => ({
  accepted: true,
  code: "success",
  message,
});

export const createAgentToolsMcpErrorOperationResult = (
  message: string,
  code = "tool_execution_failed",
): AgentOperationResult => ({
  accepted: false,
  code,
  message,
});

export const createAgentToolsMcpSuccessResult = (message: string): AgentToolMcpOperationExecutionResult =>
  toAgentToolMcpOperationResult(createAgentToolsMcpSuccessOperationResult(message));

export const createAgentToolsMcpErrorResult = (
  message: string,
  code = "tool_execution_failed",
): AgentToolMcpOperationExecutionResult =>
  toAgentToolMcpOperationResult(createAgentToolsMcpErrorOperationResult(message, code));

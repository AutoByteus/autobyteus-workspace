import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunMessageSenderContext } from "../../agent-communication/domain/agent-run-message-sender.js";
import type { ConfiguredAgentToolExposure } from "../../agent-execution/shared/configured-agent-tool-exposure.js";
import type {
  AgentToolMcpExecutionContext,
  AgentToolMcpSession,
} from "./agent-tool-mcp-session.js";
import type { AgentToolMcpSupportedToolDefinition } from "./agent-tool-mcp-definition-provider.js";
import type { McpToolResult } from "./agent-tools-mcp-result-mapper.js";

export type AgentToolMcpAvailabilityContext = {
  configuredExposure: ConfiguredAgentToolExposure;
  sender: AgentRunMessageSenderContext | null;
  executionContext: AgentToolMcpExecutionContext;
};

export type AgentToolMcpOperationExecutionResult = {
  kind: "operation_result";
  result: AgentOperationResult;
};

export type AgentToolMcpMcpToolExecutionResult = {
  kind: "mcp_tool_result";
  result: McpToolResult;
};

export type AgentToolMcpExecutionResult =
  | AgentToolMcpOperationExecutionResult
  | AgentToolMcpMcpToolExecutionResult;

export type AgentToolMcpToolAdapterExecuteInput = {
  session: AgentToolMcpSession;
  rawArguments: Record<string, unknown>;
};

export type AgentToolMcpToolAdapter = {
  definition: AgentToolMcpSupportedToolDefinition;
  isAvailable: (context: AgentToolMcpAvailabilityContext) => boolean;
  execute: (input: AgentToolMcpToolAdapterExecuteInput) => Promise<AgentToolMcpExecutionResult>;
};

export type AgentToolMcpAdapterProvider = {
  getAdapters(): AgentToolMcpToolAdapter[];
};

export const toAgentToolMcpOperationResult = (
  result: AgentOperationResult,
): AgentToolMcpOperationExecutionResult => ({
  kind: "operation_result",
  result,
});

export const toAgentToolMcpToolResult = (
  result: McpToolResult,
): AgentToolMcpMcpToolExecutionResult => ({
  kind: "mcp_tool_result",
  result,
});

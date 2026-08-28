import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunMessageSenderContext } from "../../agent-communication/domain/agent-run-message-sender.js";
import type { RuntimeAgentToolExposure } from "../../agent-execution/shared/runtime-agent-tool-exposure.js";
import type {
  AgentToolMcpExecutionContext,
  AgentToolMcpSession,
} from "./agent-tool-mcp-session.js";
import type { AgentToolMcpSupportedToolDefinition } from "./agent-tool-mcp-definition-provider.js";
import type { McpToolResult } from "./agent-tools-mcp-result-mapper.js";
import type { ApplicationAgentToolCapability } from "../../application-agent-tools/services/application-agent-tool-capability.js";

export type AgentToolMcpAvailabilityContext = {
  runtimeExposure: RuntimeAgentToolExposure;
  sender: AgentRunMessageSenderContext | null;
  executionContext: AgentToolMcpExecutionContext;
  applicationAgentTools: ApplicationAgentToolCapability | null;
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

export type AgentToolMcpConfiguredMcpCollisionPolicy =
  | "protect_static_adapter"
  | "prefer_configured_mcp";

export type AgentToolMcpToolAdapter = {
  definition: AgentToolMcpSupportedToolDefinition;
  configuredMcpCollisionPolicy?: AgentToolMcpConfiguredMcpCollisionPolicy;
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

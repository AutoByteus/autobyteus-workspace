import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunMessageSenderContext } from "../../agent-communication/domain/agent-run-message-sender.js";
import type { ConfiguredAgentToolExposure } from "../../agent-execution/shared/configured-agent-tool-exposure.js";
import type {
  AgentToolMcpExecutionContext,
  AgentToolMcpSession,
} from "./agent-tool-mcp-session.js";
import type { AgentToolMcpSupportedToolDefinition } from "./agent-tool-mcp-definition-provider.js";

export type AgentToolMcpAvailabilityContext = {
  configuredExposure: ConfiguredAgentToolExposure;
  sender: AgentRunMessageSenderContext | null;
  executionContext: AgentToolMcpExecutionContext;
};

export type AgentToolMcpToolAdapterExecuteInput = {
  session: AgentToolMcpSession;
  rawArguments: Record<string, unknown>;
};

export type AgentToolMcpToolAdapter = {
  definition: AgentToolMcpSupportedToolDefinition;
  isAvailable: (context: AgentToolMcpAvailabilityContext) => boolean;
  execute: (input: AgentToolMcpToolAdapterExecuteInput) => Promise<AgentOperationResult>;
};

export type AgentToolMcpAdapterProvider = {
  getAdapters(): AgentToolMcpToolAdapter[];
};

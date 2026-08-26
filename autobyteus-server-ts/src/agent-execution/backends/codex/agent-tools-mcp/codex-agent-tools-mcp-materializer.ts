import {
  SEND_MESSAGE_TO_TOOL_NAME,
} from "../../../../agent-communication/services/send-message-to-tool-contract.js";
import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import {
  AGENT_TOOLS_MCP_SERVER_NAME,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import {
  buildAgentToolsMcpWireToolName,
  normalizeAgentToolsMcpToolNameForEvent,
} from "../../../../agent-tools/mcp/agent-tools-mcp-tool-name.js";
import type { JsonObject } from "../codex-app-server-json.js";

export type CodexAgentToolsMcpServerConfig = {
  url: string;
  http_headers: AgentToolMcpDescriptor["headers"];
  enabled_tools: string[];
  startup_timeout_sec: 5;
};

export type CodexAgentToolsMcpConfig = JsonObject & {
  mcp_servers: {
    [AGENT_TOOLS_MCP_SERVER_NAME]: CodexAgentToolsMcpServerConfig;
  };
};

export const CODEX_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME =
  buildAgentToolsMcpWireToolName(SEND_MESSAGE_TO_TOOL_NAME);

export const materializeCodexAgentToolsMcpThreadConfig = (
  descriptor: AgentToolMcpDescriptor,
): CodexAgentToolsMcpConfig => ({
  mcp_servers: {
    [AGENT_TOOLS_MCP_SERVER_NAME]: {
      url: descriptor.serverUrl,
      http_headers: { ...descriptor.headers },
      enabled_tools: [...descriptor.enabledTools],
      startup_timeout_sec: 5,
    },
  },
});

export const normalizeCodexAgentToolsToolNameForEvent = (
  value: string | null,
): string | null => normalizeAgentToolsMcpToolNameForEvent(value);

export const isCodexAgentToolsSendMessageToolName = (
  value: string | null,
): boolean => normalizeCodexAgentToolsToolNameForEvent(value) === SEND_MESSAGE_TO_TOOL_NAME;

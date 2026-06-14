import {
  SEND_MESSAGE_TO_TOOL_NAME,
} from "../../../../agent-communication/services/send-message-to-tool-contract.js";
import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import {
  AGENT_TOOLS_MCP_SERVER_NAME,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import type { JsonObject } from "../codex-app-server-json.js";

export type CodexAgentToolsMcpServerConfig = {
  url: string;
  http_headers: AgentToolMcpDescriptor["headers"];
  enabled_tools: string[];
  startup_timeout_sec: 5;
};

export type CodexAgentToolsMcpThreadConfig = JsonObject & {
  mcp_servers: {
    [AGENT_TOOLS_MCP_SERVER_NAME]: CodexAgentToolsMcpServerConfig;
  };
};

export const CODEX_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME =
  `mcp__${AGENT_TOOLS_MCP_SERVER_NAME}__${SEND_MESSAGE_TO_TOOL_NAME}`;

const CODEX_AGENT_TOOLS_SEND_MESSAGE_QUALIFIED_TOOL_NAME =
  `${AGENT_TOOLS_MCP_SERVER_NAME}.${SEND_MESSAGE_TO_TOOL_NAME}`;

const CODEX_AGENT_TOOLS_SEND_MESSAGE_DOUBLE_UNDERSCORE_TOOL_NAME =
  `${AGENT_TOOLS_MCP_SERVER_NAME}__${SEND_MESSAGE_TO_TOOL_NAME}`;

export const materializeCodexAgentToolsMcpThreadConfig = (
  descriptor: AgentToolMcpDescriptor,
): CodexAgentToolsMcpThreadConfig => ({
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
): string | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const lower = normalized.toLowerCase();
  if (
    lower === SEND_MESSAGE_TO_TOOL_NAME ||
    lower === CODEX_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME ||
    lower === CODEX_AGENT_TOOLS_SEND_MESSAGE_QUALIFIED_TOOL_NAME ||
    lower === CODEX_AGENT_TOOLS_SEND_MESSAGE_DOUBLE_UNDERSCORE_TOOL_NAME
  ) {
    return SEND_MESSAGE_TO_TOOL_NAME;
  }
  return value;
};

export const isCodexAgentToolsSendMessageToolName = (
  value: string | null,
): boolean => normalizeCodexAgentToolsToolNameForEvent(value) === SEND_MESSAGE_TO_TOOL_NAME;

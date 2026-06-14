import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../../agent-communication/services/send-message-to-tool-contract.js";
import { AGENT_TOOLS_MCP_SERVER_NAME } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";

export const CLAUDE_SEND_MESSAGE_TOOL_NAME = SEND_MESSAGE_TO_TOOL_NAME;
export const CLAUDE_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME =
  `mcp__${AGENT_TOOLS_MCP_SERVER_NAME}__${SEND_MESSAGE_TO_TOOL_NAME}`;

const normalizeToolName = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const isClaudeAgentToolsSendMessageMcpToolName = (value: string | null): boolean =>
  normalizeToolName(value)?.toLowerCase() === CLAUDE_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME;

export const normalizeClaudeAgentToolsToolNameForEvent = (value: string | null): string | null => {
  const normalized = normalizeToolName(value);
  if (!normalized) {
    return null;
  }
  if (isClaudeAgentToolsSendMessageMcpToolName(normalized)) {
    return CLAUDE_SEND_MESSAGE_TOOL_NAME;
  }
  return normalized;
};

import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../../agent-communication/services/send-message-to-tool-contract.js";
import {
  buildAgentToolsMcpWireToolName,
  isAgentToolsMcpProviderToolName,
  normalizeAgentToolsMcpToolNameForEvent,
} from "../../../../agent-tools/mcp/agent-tools-mcp-tool-name.js";

export const CLAUDE_SEND_MESSAGE_TOOL_NAME = SEND_MESSAGE_TO_TOOL_NAME;
export const CLAUDE_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME =
  buildAgentToolsMcpWireToolName(SEND_MESSAGE_TO_TOOL_NAME);

export const buildClaudeAgentToolsMcpToolName = buildAgentToolsMcpWireToolName;

export const isClaudeAgentToolsMcpToolName = isAgentToolsMcpProviderToolName;

export const isClaudeAgentToolsSendMessageMcpToolName = (value: string | null): boolean =>
  normalizeAgentToolsMcpToolNameForEvent(value) === SEND_MESSAGE_TO_TOOL_NAME;

export const normalizeClaudeAgentToolsToolNameForEvent = (
  value: string | null,
): string | null => normalizeAgentToolsMcpToolNameForEvent(value);

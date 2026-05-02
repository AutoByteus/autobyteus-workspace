export const CLAUDE_SEND_MESSAGE_TOOL_NAME = "send_message_to";
export const CLAUDE_SEND_MESSAGE_MCP_TOOL_NAME = "mcp__autobyteus_team__send_message_to";

const normalizeToolName = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const CLAUDE_SEND_MESSAGE_TOOL_NAMES = new Set([
  CLAUDE_SEND_MESSAGE_TOOL_NAME,
  CLAUDE_SEND_MESSAGE_MCP_TOOL_NAME,
]);

export const isClaudeCanonicalSendMessageToolName = (value: string | null): boolean =>
  normalizeToolName(value) === CLAUDE_SEND_MESSAGE_TOOL_NAME;

export const isClaudeSendMessageMcpToolName = (value: string | null): boolean =>
  normalizeToolName(value) === CLAUDE_SEND_MESSAGE_MCP_TOOL_NAME;

export const isClaudeSendMessageToolName = (value: string | null): boolean => {
  const normalized = normalizeToolName(value);
  return !!normalized && CLAUDE_SEND_MESSAGE_TOOL_NAMES.has(normalized);
};

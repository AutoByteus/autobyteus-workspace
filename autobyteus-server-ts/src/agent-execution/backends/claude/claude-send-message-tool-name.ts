export const CLAUDE_SEND_MESSAGE_TOOL_NAME = "send_message_to";
export const CLAUDE_SEND_MESSAGE_MCP_TOOL_NAME = "mcp__autobyteus_team__send_message_to";

const CLAUDE_SEND_MESSAGE_TOOL_NAMES = new Set([
  CLAUDE_SEND_MESSAGE_TOOL_NAME,
  CLAUDE_SEND_MESSAGE_MCP_TOOL_NAME,
]);

export const isClaudeSendMessageToolName = (value: string | null): boolean => {
  if (!value) {
    return false;
  }
  return CLAUDE_SEND_MESSAGE_TOOL_NAMES.has(value.trim().toLowerCase());
};

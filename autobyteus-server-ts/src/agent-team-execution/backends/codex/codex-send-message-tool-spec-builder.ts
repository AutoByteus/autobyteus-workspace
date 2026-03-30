import type { JsonObject } from "../../../agent-execution/backends/codex/codex-app-server-json.js";

export const SEND_MESSAGE_TO_TOOL_NAME = "send_message_to";

export const buildSendMessageToToolSpec = (options?: {
  allowedRecipientNames?: string[] | null;
}): JsonObject => {
  const allowedRecipientNames = Array.isArray(options?.allowedRecipientNames)
    ? options.allowedRecipientNames.filter(
        (name): name is string => typeof name === "string" && name.trim().length > 0,
      )
    : [];

  return {
    name: SEND_MESSAGE_TO_TOOL_NAME,
    description: "Send a message to another member in the same team run.",
    inputSchema: {
      type: "object",
      properties: {
        recipient_name: {
          type: "string",
          description: "Recipient team member name.",
          ...(allowedRecipientNames.length > 0
            ? {
                enum: allowedRecipientNames,
              }
            : {}),
        },
        content: {
          type: "string",
          description: "Message content to deliver.",
        },
        message_type: {
          type: "string",
          description: "Optional message type label.",
        },
      },
      required: ["recipient_name", "content"],
      additionalProperties: false,
    },
  };
};

type SendMessageToValidationError = {
  code: "RECIPIENT_NOT_FOUND_OR_AMBIGUOUS" | "INVALID_MESSAGE_CONTENT";
  message: string;
};

export type SendMessageToToolArguments = {
  recipientName: string | null;
  content: string | null;
  messageType: string;
};

const readString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

export const parseSendMessageToToolArguments = (
  toolArguments: Record<string, unknown>,
): SendMessageToToolArguments => ({
  recipientName:
    readString(toolArguments.recipient_name) ??
    readString(toolArguments.recipientName) ??
    readString(toolArguments.recipient),
  content: readString(toolArguments.content),
  messageType:
    readString(toolArguments.message_type) ??
    readString(toolArguments.messageType) ??
    "agent_message",
});

export const validateParsedSendMessageToToolArguments = (
  toolName: string,
  input: SendMessageToToolArguments,
): SendMessageToValidationError | null => {
  if (!input.recipientName?.trim()) {
    return {
      code: "RECIPIENT_NOT_FOUND_OR_AMBIGUOUS",
      message: `${toolName} requires a non-empty recipient_name.`,
    };
  }
  if (!input.content?.trim()) {
    return {
      code: "INVALID_MESSAGE_CONTENT",
      message: `${toolName} requires a non-empty content field.`,
    };
  }
  return null;
};

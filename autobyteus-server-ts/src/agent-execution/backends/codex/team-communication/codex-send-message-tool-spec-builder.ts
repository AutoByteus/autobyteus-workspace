export const SEND_MESSAGE_TO_TOOL_NAME = "send_message_to";

export const buildSendMessageToToolSpec = (options: {
  allowedRecipientNames?: string[] | null;
}) => {
  const allowedRecipientNames = Array.isArray(options?.allowedRecipientNames)
    ? options.allowedRecipientNames.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
    : [];

  return {
    name: SEND_MESSAGE_TO_TOOL_NAME,
    description: "Send a self-contained message to another member in the same team run. When sharing files, keep content as the detailed email-like body and also list those absolute paths in reference_files so they appear under Team Communication messages.",
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
          description: "Self-contained message body to deliver. Explain the handoff like an email body; you may naturally mention important absolute paths here, and also put files that should appear under the Team Communication message in reference_files. Example: 'Implementation is ready. The handoff is at /Users/me/project/implementation-handoff.md and the test log is at /Users/me/project/test.log; please review the risks below.'",
        },
        message_type: {
          type: "string",
          description: "Optional message type label.",
        },
        reference_files: {
          type: "array",
          description: "Optional attachment/reference list of absolute local file paths the recipient may need to inspect and that should appear in Team Communication messages. Use this in addition to self-contained content, not instead of explaining the handoff. Example: ['/Users/me/project/implementation-handoff.md', '/Users/me/project/test.log'].",
          items: { type: "string" },
        },
      },
      required: ["recipient_name", "content"],
      additionalProperties: false,
    },
  };
};

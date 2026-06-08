import {
  SEND_MESSAGE_TO_FIELD_DESCRIPTIONS,
  SEND_MESSAGE_TO_TOOL_DESCRIPTION,
  SEND_MESSAGE_TO_TOOL_NAME,
} from "../../../../agent-team-execution/services/send-message-to-tool-contract.js";

export { SEND_MESSAGE_TO_TOOL_NAME };

export const buildSendMessageToToolSpec = () => ({
  name: SEND_MESSAGE_TO_TOOL_NAME,
  description: SEND_MESSAGE_TO_TOOL_DESCRIPTION,
  inputSchema: {
    type: "object",
    properties: {
      recipient_name: {
        type: "string",
        description: SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.recipientName,
      },
      target_agent_run_id: {
        type: "string",
        description: SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.targetAgentRunId,
      },
      content: {
        type: "string",
        description: SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.content,
      },
      message_type: {
        type: "string",
        description: SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.messageType,
      },
      reference_files: {
        type: "array",
        description: SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.referenceFiles,
        items: { type: "string" },
      },
    },
    required: ["content"],
    additionalProperties: false,
  },
});

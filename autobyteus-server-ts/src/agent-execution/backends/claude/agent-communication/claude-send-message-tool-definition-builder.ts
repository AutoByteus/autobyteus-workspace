import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import { z } from "zod";
import {
  ClaudeSendMessageToolCallHandler,
} from "./claude-send-message-tool-call-handler.js";
import { CLAUDE_SEND_MESSAGE_TOOL_NAME } from "../claude-send-message-tool-name.js";
import {
  SEND_MESSAGE_TO_FIELD_DESCRIPTIONS,
  SEND_MESSAGE_TO_TOOL_DESCRIPTION,
} from "../../../../agent-communication/services/send-message-to-tool-contract.js";

export const buildClaudeSendMessageToolDefinition = async (options: {
  runContext: ClaudeRunContext;
  sdkClient: ClaudeSdkClient;
  handler: ClaudeSendMessageToolCallHandler;
}): Promise<Record<string, unknown> | null> => {
  const inputSchema = {
    recipient_name: z
      .string()
      .optional()
      .describe(SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.recipientName),
    target_agent_run_id: z
      .string()
      .optional()
      .describe(SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.targetAgentRunId),
    content: z.string().min(1, "content is required").describe(SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.content),
    message_type: z.string().optional().describe(SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.messageType),
    reference_files: z.array(z.string()).optional().describe(
      SEND_MESSAGE_TO_FIELD_DESCRIPTIONS.referenceFiles,
    ),
  };

  return options.sdkClient.createToolDefinition({
    name: CLAUDE_SEND_MESSAGE_TOOL_NAME,
    description: SEND_MESSAGE_TO_TOOL_DESCRIPTION,
    inputSchema,
    handler: (rawArguments) =>
      options.handler.handle({
        runContext: options.runContext,
        rawArguments,
      }),
  });
};

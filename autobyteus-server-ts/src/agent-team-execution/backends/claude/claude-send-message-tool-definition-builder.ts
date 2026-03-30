import type { ClaudeRunContext } from "../../../agent-execution/backends/claude/backend/claude-agent-run-context.js";
import {
  getRuntimeMemberContexts,
  resolveRuntimeMemberContext,
} from "../../domain/team-run-context.js";
import type { ClaudeSdkClient } from "../../../runtime-management/claude/client/claude-sdk-client.js";
import { z } from "zod";
import {
  ClaudeSendMessageToolCallHandler,
} from "./claude-send-message-tool-call-handler.js";
import { CLAUDE_SEND_MESSAGE_TOOL_NAME } from "../../../agent-execution/backends/claude/claude-send-message-tool-name.js";

export const buildClaudeSendMessageToolDefinition = async (options: {
  runContext: ClaudeRunContext;
  sdkClient: ClaudeSdkClient;
  handler: ClaudeSendMessageToolCallHandler;
}): Promise<Record<string, unknown> | null> => {
  const teamContext = options.runContext.runtimeContext.teamContext;
  const currentMemberName =
    resolveRuntimeMemberContext(teamContext, options.runContext.runId)?.memberName ?? null;
  const allowedRecipientNames = getRuntimeMemberContexts(teamContext?.runtimeContext ?? null)
    .map((memberContext) => memberContext.memberName)
    .filter((memberName) => memberName !== currentMemberName);
  if (
    !teamContext ||
    !teamContext.runId ||
    allowedRecipientNames.length === 0
  ) {
    return null;
  }

  const inputSchema = {
    recipient_name: z
      .string()
      .min(1, "recipient_name is required")
      .refine(
        (value) => allowedRecipientNames.includes(value),
        "recipient_name must match an allowed teammate name",
      )
      .describe("Recipient team member name."),
    content: z.string().min(1, "content is required").describe("Message content to deliver."),
    message_type: z.string().optional().describe("Optional message type label."),
  };

  return options.sdkClient.createToolDefinition({
    name: CLAUDE_SEND_MESSAGE_TOOL_NAME,
    description: "Send a message to another member in the same team run.",
    inputSchema,
    handler: (rawArguments) =>
      options.handler.handle({
        runContext: options.runContext,
        rawArguments,
      }),
  });
};

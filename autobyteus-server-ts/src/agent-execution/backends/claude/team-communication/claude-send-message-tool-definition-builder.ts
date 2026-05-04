import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import { z } from "zod";
import {
  ClaudeSendMessageToolCallHandler,
} from "./claude-send-message-tool-call-handler.js";
import { CLAUDE_SEND_MESSAGE_TOOL_NAME } from "../claude-send-message-tool-name.js";

export const buildClaudeSendMessageToolDefinition = async (options: {
  runContext: ClaudeRunContext;
  sdkClient: ClaudeSdkClient;
  handler: ClaudeSendMessageToolCallHandler;
}): Promise<Record<string, unknown> | null> => {
  const memberTeamContext = options.runContext.runtimeContext.memberTeamContext;
  const allowedRecipientNames = memberTeamContext?.allowedRecipientNames ?? [];
  if (!memberTeamContext?.teamRunId || allowedRecipientNames.length === 0) {
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
    content: z.string().min(1, "content is required").describe("Self-contained message body to deliver. Explain the handoff like an email body; you may naturally mention important absolute paths here, and also put files that should appear in Sent/Received Artifacts in reference_files. Example: 'Implementation is ready. The handoff is at /Users/me/project/implementation-handoff.md and the test log is at /Users/me/project/test.log; please review the risks below.'"),
    message_type: z.string().optional().describe("Optional message type label."),
    reference_files: z.array(z.string()).optional().describe(
      "Optional attachment/reference list of absolute local file paths the recipient may need to inspect and that should appear in Sent/Received Artifacts. Use this in addition to self-contained content, not instead of explaining the handoff. Example: ['/Users/me/project/implementation-handoff.md', '/Users/me/project/test.log'].",
    ),
  };

  return options.sdkClient.createToolDefinition({
    name: CLAUDE_SEND_MESSAGE_TOOL_NAME,
    description: "Send a self-contained message to another member in the same team run. When sharing files, keep content as the detailed email-like body and also list those absolute paths in reference_files so they appear in Sent/Received Artifacts.",
    inputSchema,
    handler: (rawArguments) =>
      options.handler.handle({
        runContext: options.runContext,
        rawArguments,
      }),
  });
};

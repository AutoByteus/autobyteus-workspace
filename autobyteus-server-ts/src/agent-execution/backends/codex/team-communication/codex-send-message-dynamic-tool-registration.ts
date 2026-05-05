import {
  createCodexDynamicToolTextResult,
  type CodexDynamicToolRegistration,
} from "../codex-dynamic-tool.js";
import {
  buildSendMessageToToolSpec,
} from "./codex-send-message-tool-spec-builder.js";
import {
  parseSendMessageToToolArguments,
  validateParsedSendMessageToToolArguments,
} from "../../../../agent-team-execution/services/send-message-to-tool-argument-parser.js";
import type { InterAgentMessageDeliveryHandler } from "../../../../agent-team-execution/domain/inter-agent-message-delivery.js";

export const buildSendMessageToDynamicToolRegistrations = (input: {
  deliverInterAgentMessage: InterAgentMessageDeliveryHandler | null;
  senderRunId: string;
  teamRunId: string;
  allowedRecipientNames?: string[] | null;
}): CodexDynamicToolRegistration[] | null => {
  const deliverInterAgentMessage = input.deliverInterAgentMessage;
  if (!deliverInterAgentMessage) {
    return null;
  }

  return [
    {
      spec: buildSendMessageToToolSpec({
        allowedRecipientNames: input.allowedRecipientNames,
      }),
      handler: async ({ toolName, arguments: toolArguments }) => {
        const parsed = parseSendMessageToToolArguments(toolArguments);
        const validationError = validateParsedSendMessageToToolArguments(toolName, parsed);
        if (validationError) {
          return createCodexDynamicToolTextResult(
            validationError.message,
            false,
          );
        }
        if (!parsed.recipientName || !parsed.content) {
          return createCodexDynamicToolTextResult(
            `${toolName} requires non-empty recipientMemberName and content.`,
            false,
          );
        }
        const recipientMemberName = parsed.recipientName.trim();
        const content = parsed.content.trim();

        const result = await deliverInterAgentMessage({
          senderRunId: input.senderRunId,
          teamRunId: input.teamRunId,
          recipientMemberName,
          content,
          messageType: parsed.messageType,
          referenceFiles: parsed.referenceFiles,
        });
        if (!result.accepted) {
          return createCodexDynamicToolTextResult(
            result.message ?? `${toolName} failed.`,
            false,
          );
        }

        return createCodexDynamicToolTextResult(
          `Delivered message to ${recipientMemberName}.`,
          true,
        );
      },
    },
  ];
};

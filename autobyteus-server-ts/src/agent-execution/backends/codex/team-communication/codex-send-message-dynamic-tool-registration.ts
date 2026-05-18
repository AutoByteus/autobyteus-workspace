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
import type { MemberTeamContext } from "../../../../agent-team-execution/domain/member-team-context.js";
import { buildInterAgentMessageDeliveryRequestFromRecipientName } from "../../../../agent-team-execution/services/inter-agent-message-delivery-request-builder.js";

export const buildSendMessageToDynamicToolRegistrations = (input: {
  deliverInterAgentMessage: InterAgentMessageDeliveryHandler | null;
  memberTeamContext: MemberTeamContext;
}): CodexDynamicToolRegistration[] | null => {
  const deliverInterAgentMessage = input.deliverInterAgentMessage;
  if (!deliverInterAgentMessage) {
    return null;
  }

  return [
    {
      spec: buildSendMessageToToolSpec({
        allowedRecipientNames: input.memberTeamContext.allowedRecipientNames,
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
        const requestResult = buildInterAgentMessageDeliveryRequestFromRecipientName({
          memberTeamContext: input.memberTeamContext,
          recipientName: recipientMemberName,
          content,
          messageType: parsed.messageType,
          referenceFiles: parsed.referenceFiles,
        });
        if (!requestResult.ok) {
          return createCodexDynamicToolTextResult(requestResult.message, false);
        }
        const result = await deliverInterAgentMessage(requestResult.request);
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

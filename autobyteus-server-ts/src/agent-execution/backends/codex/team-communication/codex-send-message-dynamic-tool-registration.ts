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
import {
  selectorFromMemberName,
  selectorFromMemberPath,
} from "../../../../agent-team-execution/domain/team-run-member-identity.js";
import type { InterAgentMessageDeliveryHandler } from "../../../../agent-team-execution/domain/inter-agent-message-delivery.js";

export const buildSendMessageToDynamicToolRegistrations = (input: {
  deliverInterAgentMessage: InterAgentMessageDeliveryHandler | null;
  senderRunId: string;
  teamRunId: string;
  senderMemberName?: string | null;
  senderMemberPath?: string[] | null;
  senderMemberRouteKey?: string | null;
  allowedRecipientNames?: string[] | null;
  members?: Array<{
    memberName: string;
    memberPath: string[];
    memberRouteKey: string;
  }> | null;
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
        const recipient = input.members?.find(
          (member) => member.memberName === recipientMemberName || member.memberRouteKey === recipientMemberName,
        ) ?? null;

        const result = await deliverInterAgentMessage({
          senderRunId: input.senderRunId,
          senderSelector: input.senderMemberPath?.length
            ? selectorFromMemberPath(input.senderMemberPath)
            : null,
          senderMemberName: input.senderMemberName ?? null,
          senderPath: input.senderMemberPath ?? null,
          senderRouteKey: input.senderMemberRouteKey ?? null,
          teamRunId: input.teamRunId,
          recipientSelector: recipient
            ? selectorFromMemberPath(recipient.memberPath)
            : selectorFromMemberName(recipientMemberName),
          recipientMemberName: recipient?.memberName ?? recipientMemberName,
          recipientPath: recipient?.memberPath ?? null,
          recipientRouteKey: recipient?.memberRouteKey ?? null,
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

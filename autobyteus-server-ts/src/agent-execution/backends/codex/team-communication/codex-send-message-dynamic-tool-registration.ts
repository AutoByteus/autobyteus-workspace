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
import { buildInterAgentMessageDeliveryIntent } from "../../../../agent-team-execution/services/inter-agent-message-delivery-intent-builder.js";
import { describeTeamMessageTargetSelector } from "../../../../agent-team-execution/domain/team-message-target-selector.js";

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
      spec: buildSendMessageToToolSpec(),
      handler: async ({ toolName, arguments: toolArguments }) => {
        const parsed = parseSendMessageToToolArguments(toolArguments);
        const validationError = validateParsedSendMessageToToolArguments(toolName, parsed);
        if (validationError) {
          return createCodexDynamicToolTextResult(
            validationError.message,
            false,
          );
        }
        if (!parsed.target || !parsed.content) {
          return createCodexDynamicToolTextResult(
            `${toolName} requires exactly one target selector and non-empty content.`,
            false,
          );
        }
        const targetDescription = describeTeamMessageTargetSelector(parsed.target);
        const content = parsed.content.trim();
        const intentResult = buildInterAgentMessageDeliveryIntent({
          memberTeamContext: input.memberTeamContext,
          target: parsed.target,
          content,
          messageType: parsed.messageType,
          referenceFiles: parsed.referenceFiles,
        });
        if (!intentResult.ok) {
          return createCodexDynamicToolTextResult(intentResult.message, false);
        }
        const result = await deliverInterAgentMessage(intentResult.intent);
        if (!result.accepted) {
          return createCodexDynamicToolTextResult(
            result.message ?? `${toolName} failed.`,
            false,
          );
        }

        return createCodexDynamicToolTextResult(
          `Delivered message to ${targetDescription}.`,
          true,
        );
      },
    },
  ];
};

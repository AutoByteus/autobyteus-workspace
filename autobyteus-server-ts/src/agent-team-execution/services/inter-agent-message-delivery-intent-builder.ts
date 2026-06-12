import type { MemberTeamContext } from "../domain/member-team-context.js";
import {
  buildDeliveryEndpointForParticipant,
  buildTeamMemberAddress,
  type InterAgentMessageDeliveryIntent,
  type InterAgentMessageParticipant,
} from "../domain/inter-agent-message-delivery.js";
import type { SendMessageTargetSelector } from "../../agent-communication/domain/send-message-target-selector.js";
import { selectorFromMemberPath } from "../domain/team-run-member-identity.js";

export type InterAgentMessageDeliveryIntentBuildResult =
  | { ok: true; intent: InterAgentMessageDeliveryIntent }
  | { ok: false; code: "INVALID_DELIVERY_INTENT"; message: string };

const buildSenderParticipant = (
  memberTeamContext: MemberTeamContext,
): InterAgentMessageParticipant => ({
  memberKind: "agent",
  memberName: memberTeamContext.memberName,
  memberPath: [...memberTeamContext.memberPath],
  memberRouteKey: memberTeamContext.memberRouteKey,
  memberRunId: memberTeamContext.memberRunId,
  address: buildTeamMemberAddress({
    teamRunId: memberTeamContext.teamRunId,
    memberPath: memberTeamContext.memberPath,
    memberRouteKey: memberTeamContext.memberRouteKey,
  }),
  platformRunId: null,
  teamDefinitionId: null,
  ...(memberTeamContext.taskAgentInstance
    ? {
        taskAgentRunId: memberTeamContext.taskAgentInstance.taskAgentRunId,
        taskId: memberTeamContext.taskAgentInstance.taskId,
        logicalMemberRouteKey: memberTeamContext.taskAgentInstance.logicalMember.memberRouteKey,
      }
    : {}),
});

export const buildInterAgentMessageDeliveryIntent = (input: {
  memberTeamContext: MemberTeamContext;
  target: SendMessageTargetSelector;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
}): InterAgentMessageDeliveryIntentBuildResult => {
  const sender = buildSenderParticipant(input.memberTeamContext);
  const senderEndpoint = buildDeliveryEndpointForParticipant(
    sender,
    selectorFromMemberPath(sender.address.memberPath),
  );

  return {
    ok: true,
    intent: {
      teamRunId: input.memberTeamContext.teamRunId,
      target: input.target,
      sender: senderEndpoint,
      content: input.content,
      messageType: input.messageType,
      referenceFiles: input.referenceFiles,
    },
  };
};

export const buildInterAgentMessageDeliveryIntentFromRecipientName = (input: {
  memberTeamContext: MemberTeamContext;
  recipientName: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
}): InterAgentMessageDeliveryIntentBuildResult => buildInterAgentMessageDeliveryIntent({
  memberTeamContext: input.memberTeamContext,
  target: { kind: "recipient_name", recipientName: input.recipientName.trim() },
  content: input.content,
  messageType: input.messageType,
  referenceFiles: input.referenceFiles,
});

import type { MemberTeamContext, MemberTeamRecipientDescriptor } from "../domain/member-team-context.js";
import {
  buildDeliveryEndpointForParticipant,
  buildTeamMemberAddress,
  type InterAgentMessageDeliveryRequest,
  type InterAgentMessageParticipant,
} from "../domain/inter-agent-message-delivery.js";
import { selectorFromMemberPath } from "../domain/team-run-member-identity.js";

export type InterAgentMessageDeliveryRequestBuildResult =
  | { ok: true; request: InterAgentMessageDeliveryRequest; recipient: MemberTeamRecipientDescriptor }
  | { ok: false; code: "RECIPIENT_NOT_FOUND_OR_AMBIGUOUS"; message: string };

const findCommunicationRecipient = (
  memberTeamContext: MemberTeamContext,
  recipientName: string,
): MemberTeamRecipientDescriptor | null => {
  const normalized = recipientName.trim();
  return memberTeamContext.communicationRecipients.find(
    (recipient) =>
      recipient.recipientName === normalized ||
      recipient.participant.memberRouteKey === normalized,
  ) ?? null;
};

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
});

export const buildInterAgentMessageDeliveryRequestFromRecipientName = (input: {
  memberTeamContext: MemberTeamContext;
  recipientName: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
}): InterAgentMessageDeliveryRequestBuildResult => {
  const recipient = findCommunicationRecipient(input.memberTeamContext, input.recipientName);
  if (!recipient) {
    return {
      ok: false,
      code: "RECIPIENT_NOT_FOUND_OR_AMBIGUOUS",
      message: `Recipient '${input.recipientName}' is not in the current member communication roster or is ambiguous.`,
    };
  }

  const sender = buildSenderParticipant(input.memberTeamContext);
  return {
    ok: true,
    recipient,
    request: {
      teamRunId: recipient.delivery.teamRunId,
      sender: buildDeliveryEndpointForParticipant(
        sender,
        selectorFromMemberPath(sender.address.memberPath),
      ),
      recipient: buildDeliveryEndpointForParticipant(
        recipient.participant,
        recipient.delivery.selector,
      ),
      content: input.content,
      messageType: input.messageType,
      referenceFiles: input.referenceFiles,
    },
  };
};

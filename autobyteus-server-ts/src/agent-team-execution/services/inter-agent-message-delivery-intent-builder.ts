import type { MemberTeamContext } from "../domain/member-team-context.js";
import {
  buildDeliveryEndpointForParticipant,
  buildTeamMemberAddress,
  type InterAgentMessageDeliveryIntent,
  type InterAgentMessageParticipant,
} from "../domain/inter-agent-message-delivery.js";
import { selectorFromMemberPath } from "../domain/team-run-member-identity.js";
import {
  buildConversationAddressFromSegments,
  normalizeConversationTargetAddress,
  type ConversationTargetAddress,
  type ConversationTargetSegment,
} from "../domain/conversation-target-address.js";

export type InterAgentMessageDeliveryIntentBuildResult =
  | { ok: true; intent: InterAgentMessageDeliveryIntent }
  | { ok: false; code: "INVALID_DELIVERY_INTENT"; message: string };

const buildSenderParticipant = (
  memberTeamContext: MemberTeamContext,
): InterAgentMessageParticipant => ({
  memberKind: "agent",
  memberName: memberTeamContext.memberName,
  memberPath: [...memberTeamContext.collaboration.addressing.memberPath],
  memberRouteKey: memberTeamContext.collaboration.addressing.memberPath.join("/"),
  memberRunId: memberTeamContext.memberRunId,
  address: buildTeamMemberAddress({
    teamRunId: memberTeamContext.collaboration.addressing.rootTeamRunId,
    memberPath: memberTeamContext.collaboration.addressing.memberPath,
    memberRouteKey: memberTeamContext.collaboration.addressing.memberPath.join("/"),
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

const buildSenderConversationAddress = (
  memberTeamContext: MemberTeamContext,
): ConversationTargetAddress => {
  const addressing = memberTeamContext.collaboration.addressing;
  const taskAgentRunId = memberTeamContext.taskAgentInstance?.taskAgentRunId?.trim() || null;
  const segments: ConversationTargetSegment[] = memberTeamContext.taskTeamInstance
    ? [
        { kind: "member", memberRouteKey: addressing.immediateTeamPath.join("/") },
        {
          kind: "task_team",
          taskTeamRunId: memberTeamContext.taskTeamInstance.taskTeamRunId,
        },
        { kind: "member", memberRouteKey: memberTeamContext.memberRouteKey },
      ]
    : [{ kind: "member", memberRouteKey: addressing.memberPath.join("/") }];
  if (taskAgentRunId) {
    segments.push({ kind: "task_agent", taskAgentRunId });
  }
  return normalizeConversationTargetAddress(buildConversationAddressFromSegments(segments));
};

export const buildInterAgentMessageDeliveryIntent = (input: {
  memberTeamContext: MemberTeamContext;
  recipientName: string;
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
      teamRunId: input.memberTeamContext.collaboration.addressing.rootTeamRunId,
      callerAddressing: input.memberTeamContext.collaboration.addressing,
      recipientName: input.recipientName,
      sender: senderEndpoint,
      senderAddress: buildSenderConversationAddress(input.memberTeamContext),
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
  recipientName: input.recipientName,
  content: input.content,
  messageType: input.messageType,
  referenceFiles: input.referenceFiles,
});

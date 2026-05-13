import type { InterAgentMessageRequestEvent } from "autobyteus-ts/agent-team/events/agent-team-events.js";
import type {
  TeamCommunicationContext,
  TeamCommunicationMember,
} from "autobyteus-ts/agent-team/context/team-communication-context.js";
import type { MemberTeamContext } from "../../../agent-team-execution/domain/member-team-context.js";
import { buildInterAgentMessageDeliveryRequestFromRecipientName } from "../../../agent-team-execution/services/inter-agent-message-delivery-request-builder.js";

export type AutoByteusStandaloneTeamContext = {
  teamRunId: string;
  teamDefinitionId: string;
  currentMemberName: string;
  communicationContext: TeamCommunicationContext;
};

export const buildAutoByteusStandaloneTeamContext = (
  memberTeamContext: MemberTeamContext,
): AutoByteusStandaloneTeamContext => {
  const members: TeamCommunicationMember[] = memberTeamContext.communicationRecipients.map((recipient) => ({
    memberName: recipient.recipientName,
    memberRunId: recipient.participant.memberRunId,
    agentId: recipient.participant.memberRunId,
    role: recipient.role,
    description: recipient.description,
  }));

  const memberNameByAgentId = new Map<string, string>();
  for (const recipient of memberTeamContext.communicationRecipients) {
    memberNameByAgentId.set(recipient.participant.memberRunId, recipient.recipientName);
  }

  const communicationContext: TeamCommunicationContext = {
    members,
    dispatchInterAgentMessageRequest: async (event: InterAgentMessageRequestEvent) => {
      if (!memberTeamContext.deliverInterAgentMessage) {
        throw new Error("Team communication is not configured for this standalone AutoByteus run.");
      }
      const requestResult = buildInterAgentMessageDeliveryRequestFromRecipientName({
        memberTeamContext,
        recipientName: event.recipientName,
        content: event.content,
        messageType: event.messageType,
        referenceFiles: event.referenceFiles,
      });
      if (!requestResult.ok) {
        throw new Error(requestResult.message);
      }
      const result = await memberTeamContext.deliverInterAgentMessage(requestResult.request);
      if (!result.accepted) {
        const failureMessage =
          (typeof result.message === "string" && result.message.trim().length > 0
            ? result.message.trim()
            : null) ??
          `Failed delivering message to teammate '${event.recipientName}'.`;
        throw new Error(failureMessage);
      }
    },
    resolveMemberNameByAgentId: (agentId: string): string | null =>
      memberNameByAgentId.get(agentId) ?? null,
  };

  return {
    teamRunId: memberTeamContext.teamRunId,
    teamDefinitionId: memberTeamContext.teamDefinitionId,
    currentMemberName: memberTeamContext.memberName,
    communicationContext,
  };
};

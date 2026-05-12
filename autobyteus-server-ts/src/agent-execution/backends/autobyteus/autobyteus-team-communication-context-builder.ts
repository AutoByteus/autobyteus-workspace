import type { InterAgentMessageRequestEvent } from "autobyteus-ts/agent-team/events/agent-team-events.js";
import type {
  TeamCommunicationContext,
  TeamCommunicationMember,
} from "autobyteus-ts/agent-team/context/team-communication-context.js";
import {
  selectorFromMemberName,
  selectorFromMemberPath,
} from "../../../agent-team-execution/domain/team-run-member-identity.js";
import type { MemberTeamContext } from "../../../agent-team-execution/domain/member-team-context.js";

export type AutoByteusStandaloneTeamContext = {
  teamRunId: string;
  teamDefinitionId: string;
  currentMemberName: string;
  communicationContext: TeamCommunicationContext;
};

export const buildAutoByteusStandaloneTeamContext = (
  memberTeamContext: MemberTeamContext,
): AutoByteusStandaloneTeamContext => {
  const members: TeamCommunicationMember[] = memberTeamContext.members.map((member) => ({
    memberName: member.memberName,
    memberRunId: member.memberRunId,
    agentId: member.memberRunId,
    role: member.role,
    description: member.description,
  }));

  const memberNameByAgentId = new Map<string, string>();
  for (const member of memberTeamContext.members) {
    memberNameByAgentId.set(member.memberRunId, member.memberName);
  }

  const communicationContext: TeamCommunicationContext = {
    members,
    dispatchInterAgentMessageRequest: async (event: InterAgentMessageRequestEvent) => {
      if (!memberTeamContext.deliverInterAgentMessage) {
        throw new Error("Team communication is not configured for this standalone AutoByteus run.");
      }
      const result = await memberTeamContext.deliverInterAgentMessage({
        senderRunId: event.senderAgentId,
        senderSelector: selectorFromMemberPath(memberTeamContext.memberPath),
        senderMemberName:
          memberNameByAgentId.get(event.senderAgentId) ??
          (event.senderAgentId === memberTeamContext.memberRunId
            ? memberTeamContext.memberName
            : null),
        senderPath: memberTeamContext.memberPath,
        senderRouteKey: memberTeamContext.memberRouteKey,
        teamRunId: memberTeamContext.teamRunId,
        recipientSelector: memberTeamContext.members.find((member) => member.memberName === event.recipientName)
          ? selectorFromMemberPath(memberTeamContext.members.find((member) => member.memberName === event.recipientName)!.memberPath)
          : selectorFromMemberName(event.recipientName),
        recipientMemberName:
          memberTeamContext.members.find((member) => member.memberName === event.recipientName)?.memberName ??
          event.recipientName,
        recipientPath:
          memberTeamContext.members.find((member) => member.memberName === event.recipientName)?.memberPath ??
          null,
        recipientRouteKey:
          memberTeamContext.members.find((member) => member.memberName === event.recipientName)?.memberRouteKey ??
          null,
        content: event.content,
        messageType: event.messageType,
        referenceFiles: event.referenceFiles,
      });
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

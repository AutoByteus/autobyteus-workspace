import type {
  AgentMemberTeamDescriptor,
  MemberTeamDescriptor,
  MemberTeamRecipientDescriptor,
  ParentBoundaryCommunicationContext,
  SubTeamMemberTeamDescriptor,
} from "../domain/member-team-context.js";
import {
  buildDeliveryEndpointForParticipant,
  buildTeamMemberAddress,
  type InterAgentMessageParticipant,
  type TeamRepresentedSubTeam,
} from "../domain/inter-agent-message-delivery.js";
import { selectorFromMemberRouteKey } from "../domain/team-run-member-identity.js";

const normalizeRouteKey = (value: string): string => value.trim();

const buildAgentParticipant = (input: {
  teamRunId: string;
  member: AgentMemberTeamDescriptor | SubTeamMemberTeamDescriptor["representative"];
  representedSubTeam?: TeamRepresentedSubTeam | null;
}): InterAgentMessageParticipant => {
  if (!input.member) {
    throw new Error("Cannot build participant without a member descriptor.");
  }
  const address = buildTeamMemberAddress({
    teamRunId: input.teamRunId,
    memberPath: input.member.memberPath,
    memberRouteKey: input.member.memberRouteKey,
  });
  return {
    memberKind: "agent",
    memberName: input.member.memberName,
    memberPath: [...input.member.memberPath],
    memberRouteKey: input.member.memberRouteKey,
    memberRunId: input.member.memberRunId,
    address,
    platformRunId: null,
    teamDefinitionId: null,
    representedSubTeam: input.representedSubTeam ?? null,
  };
};

const buildRepresentedSubTeam = (
  teamRunId: string,
  member: SubTeamMemberTeamDescriptor,
): TeamRepresentedSubTeam => ({
  memberKind: "agent_team",
  memberName: member.memberName,
  memberPath: [...member.memberPath],
  memberRouteKey: member.memberRouteKey,
  memberRunId: member.memberRunId,
  teamDefinitionId: member.teamDefinitionId,
  childTeamRunId: member.childTeamRunId ?? null,
  address: buildTeamMemberAddress({
    teamRunId,
    memberPath: member.memberPath,
    memberRouteKey: member.memberRouteKey,
  }),
});

const buildRouteDelivery = (
  participant: InterAgentMessageParticipant,
): MemberTeamRecipientDescriptor["delivery"] => ({
  teamRunId: participant.address.teamRunId,
  selector: buildDeliveryEndpointForParticipant(
    participant,
    selectorFromMemberRouteKey(participant.address.memberRouteKey),
  ).selector,
});

export class MemberCommunicationRosterBuilder {
  build(input: {
    teamRunId: string;
    currentMemberRouteKey: string;
    currentMemberIsParentBoundaryRepresentative?: boolean;
    members: MemberTeamDescriptor[];
    parentBoundary?: ParentBoundaryCommunicationContext | null;
  }): MemberTeamRecipientDescriptor[] {
    const recipients: MemberTeamRecipientDescriptor[] = [];
    const currentRoute = normalizeRouteKey(input.currentMemberRouteKey);

    for (const member of input.members) {
      if (normalizeRouteKey(member.memberRouteKey) === currentRoute) {
        continue;
      }
      if (member.memberKind === "agent") {
        recipients.push(this.buildLocalAgentRecipient(input.teamRunId, member));
        continue;
      }
      const representative = member.representative;
      if (representative) {
        recipients.push(this.buildSubTeamRepresentativeRecipient(input.teamRunId, member, representative));
      }
    }

    if (input.parentBoundary && input.currentMemberIsParentBoundaryRepresentative) {
      for (const parentMember of input.parentBoundary.parentMembers) {
        recipients.push(this.buildParentBoundaryRecipient(input.parentBoundary.parentTeamRunId, parentMember));
      }
    }

    this.assertUniqueVisibleNames(recipients);
    return recipients;
  }

  private buildLocalAgentRecipient(
    teamRunId: string,
    member: AgentMemberTeamDescriptor,
  ): MemberTeamRecipientDescriptor {
    const participant = buildAgentParticipant({ teamRunId, member });
    return {
      recipientName: member.memberName,
      scope: "local_agent",
      participant,
      delivery: buildRouteDelivery(participant),
      role: member.role,
      description: member.description,
    };
  }

  private buildSubTeamRepresentativeRecipient(
    teamRunId: string,
    subTeam: SubTeamMemberTeamDescriptor,
    representative: NonNullable<SubTeamMemberTeamDescriptor["representative"]>,
  ): MemberTeamRecipientDescriptor {
    const representedSubTeam = buildRepresentedSubTeam(teamRunId, subTeam);
    const participant = buildAgentParticipant({
      teamRunId,
      member: representative,
      representedSubTeam,
    });
    return {
      recipientName: representative.memberName,
      scope: "subteam_representative",
      participant,
      delivery: buildRouteDelivery(participant),
      role: representative.role,
      description: representative.description,
    };
  }

  private buildParentBoundaryRecipient(
    parentTeamRunId: string,
    parentMember: AgentMemberTeamDescriptor,
  ): MemberTeamRecipientDescriptor {
    const participant = buildAgentParticipant({
      teamRunId: parentTeamRunId,
      member: parentMember,
    });
    return {
      recipientName: parentMember.memberName,
      scope: "parent_boundary_agent",
      participant,
      delivery: buildRouteDelivery(participant),
      role: parentMember.role,
      description: parentMember.description,
    };
  }

  private assertUniqueVisibleNames(recipients: MemberTeamRecipientDescriptor[]): void {
    const byName = new Map<string, MemberTeamRecipientDescriptor[]>();
    for (const recipient of recipients) {
      const key = recipient.recipientName.trim().toLowerCase();
      if (!key) {
        throw new Error("Communication recipient name cannot be empty.");
      }
      byName.set(key, [...(byName.get(key) ?? []), recipient]);
    }

    for (const [name, matches] of byName) {
      if (matches.length > 1) {
        const routes = matches.map((match) => match.participant.memberRouteKey).join(", ");
        throw new Error(`Ambiguous communication recipient '${name}' resolves to multiple members: ${routes}.`);
      }
    }
  }
}

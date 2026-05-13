import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { InterAgentMessageDeliveryHandler } from "../domain/inter-agent-message-delivery.js";
import {
  MemberTeamContext,
  type AgentMemberTeamDescriptor,
  type MemberTeamDescriptor,
  type ParentBoundaryCommunicationContext,
  type SubTeamRepresentativeDescriptor,
} from "../domain/member-team-context.js";
import type { TeamBackendKind } from "../domain/team-backend-kind.js";
import { buildTeamMemberAddress } from "../domain/inter-agent-message-delivery.js";
import { MemberCommunicationRosterBuilder } from "./member-communication-roster-builder.js";

export type MemberTeamContextMemberInput =
  | {
      memberKind?: "agent" | null;
      memberName: string;
      memberPath?: string[] | null;
      memberRouteKey: string;
      memberRunId: string;
      runtimeKind: RuntimeKind;
      role?: string | null;
      description?: string | null;
    }
  | {
      memberKind: "agent_team";
      memberName: string;
      memberPath?: string[] | null;
      memberRouteKey: string;
      memberRunId: string;
      teamDefinitionId: string;
      childTeamRunId?: string | null;
      coordinatorMemberRouteKey?: string | null;
      representative?: SubTeamRepresentativeDescriptor | null;
      role?: string | null;
      description?: string | null;
    };

export type ParentBoundaryCommunicationContextInput = Omit<ParentBoundaryCommunicationContext, "parentMembers"> & {
  parentMembers: AgentMemberTeamDescriptor[];
};

export class MemberTeamContextBuilder {
  private readonly teamDefinitionService: AgentTeamDefinitionService;
  private readonly rosterBuilder: MemberCommunicationRosterBuilder;
  private readonly teamInstructionCache = new Map<string, Promise<string | null>>();

  constructor(
    teamDefinitionService: AgentTeamDefinitionService = AgentTeamDefinitionService.getInstance(),
    rosterBuilder: MemberCommunicationRosterBuilder = new MemberCommunicationRosterBuilder(),
  ) {
    this.teamDefinitionService = teamDefinitionService;
    this.rosterBuilder = rosterBuilder;
  }

  async build(input: {
    teamRunId: string;
    teamDefinitionId: string;
    teamBackendKind: TeamBackendKind;
    currentMemberName: string;
    currentMemberPath?: string[] | null;
    currentMemberRouteKey: string;
    currentMemberRunId: string;
    coordinatorMemberRouteKey?: string | null;
    members: MemberTeamContextMemberInput[];
    parentBoundary?: ParentBoundaryCommunicationContextInput | null;
    deliverInterAgentMessage?: InterAgentMessageDeliveryHandler | null;
  }): Promise<MemberTeamContext> {
    const members = input.members.map((member) => this.buildMemberDescriptor(input.teamRunId, member));
    const currentMemberRouteKey = input.currentMemberRouteKey.trim();
    const currentMemberIsParentBoundaryRepresentative =
      Boolean(input.parentBoundary) &&
      Boolean(input.coordinatorMemberRouteKey?.trim()) &&
      input.coordinatorMemberRouteKey?.trim() === currentMemberRouteKey;
    const communicationRecipients = this.rosterBuilder.build({
      teamRunId: input.teamRunId,
      currentMemberRouteKey,
      currentMemberIsParentBoundaryRepresentative,
      members,
      parentBoundary: input.parentBoundary ?? null,
    });
    const allowedRecipientNames = communicationRecipients.map((recipient) => recipient.recipientName);
    const deliverInterAgentMessage = input.deliverInterAgentMessage ?? null;

    return new MemberTeamContext({
      teamRunId: input.teamRunId,
      teamDefinitionId: input.teamDefinitionId,
      teamBackendKind: input.teamBackendKind,
      memberName: input.currentMemberName,
      memberPath: input.currentMemberPath ?? [input.currentMemberName],
      memberRouteKey: input.currentMemberRouteKey,
      memberRunId: input.currentMemberRunId,
      teamInstruction: await this.resolveTeamInstruction(input.teamDefinitionId),
      members,
      communicationRecipients,
      allowedRecipientNames,
      sendMessageToEnabled:
        Boolean(deliverInterAgentMessage) && allowedRecipientNames.length > 0,
      deliverInterAgentMessage,
    });
  }

  private buildMemberDescriptor(
    teamRunId: string,
    member: MemberTeamContextMemberInput,
  ): MemberTeamDescriptor {
    const memberPath = member.memberPath?.length ? [...member.memberPath] : [member.memberName];
    const address = buildTeamMemberAddress({
      teamRunId,
      memberPath,
      memberRouteKey: member.memberRouteKey,
    });
    if (member.memberKind === "agent_team") {
      return {
        memberKind: "agent_team",
        memberName: member.memberName,
        memberPath,
        memberRouteKey: member.memberRouteKey,
        memberRunId: member.memberRunId,
        teamDefinitionId: member.teamDefinitionId,
        childTeamRunId: member.childTeamRunId ?? null,
        coordinatorMemberRouteKey: member.coordinatorMemberRouteKey ?? null,
        representative: member.representative ?? null,
        role: member.role ?? null,
        description: member.description ?? null,
        address,
      };
    }
    return {
      memberKind: "agent",
      memberName: member.memberName,
      memberPath,
      memberRouteKey: member.memberRouteKey,
      memberRunId: member.memberRunId,
      runtimeKind: member.runtimeKind,
      role: member.role ?? null,
      description: member.description ?? null,
      address,
    };
  }

  private async resolveTeamInstruction(teamDefinitionId: string): Promise<string | null> {
    if (!this.teamInstructionCache.has(teamDefinitionId)) {
      this.teamInstructionCache.set(
        teamDefinitionId,
        this.teamDefinitionService
          .getDefinitionById(teamDefinitionId)
          .then((definition) => {
            const instructions = definition?.instructions?.trim() ?? "";
            return instructions.length > 0 ? instructions : null;
          })
          .catch(() => null),
      );
    }
    return this.teamInstructionCache.get(teamDefinitionId) ?? null;
  }
}

let cachedMemberTeamContextBuilder: MemberTeamContextBuilder | null = null;

export const getMemberTeamContextBuilder = (): MemberTeamContextBuilder => {
  if (!cachedMemberTeamContextBuilder) {
    cachedMemberTeamContextBuilder = new MemberTeamContextBuilder();
  }
  return cachedMemberTeamContextBuilder;
};

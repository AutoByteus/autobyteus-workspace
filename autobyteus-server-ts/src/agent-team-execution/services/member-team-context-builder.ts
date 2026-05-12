import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { InterAgentMessageDeliveryHandler } from "../domain/inter-agent-message-delivery.js";
import {
  MemberTeamContext,
  type MemberTeamDescriptor,
} from "../domain/member-team-context.js";
import type { TeamBackendKind } from "../domain/team-backend-kind.js";

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
      coordinatorMemberRouteKey?: string | null;
      role?: string | null;
      description?: string | null;
    };

export class MemberTeamContextBuilder {
  private readonly teamDefinitionService: AgentTeamDefinitionService;
  private readonly teamInstructionCache = new Map<string, Promise<string | null>>();

  constructor(
    teamDefinitionService: AgentTeamDefinitionService = AgentTeamDefinitionService.getInstance(),
  ) {
    this.teamDefinitionService = teamDefinitionService;
  }

  async build(input: {
    teamRunId: string;
    teamDefinitionId: string;
    teamBackendKind: TeamBackendKind;
    currentMemberName: string;
    currentMemberPath?: string[] | null;
    currentMemberRouteKey: string;
    currentMemberRunId: string;
    members: MemberTeamContextMemberInput[];
    deliverInterAgentMessage?: InterAgentMessageDeliveryHandler | null;
  }): Promise<MemberTeamContext> {
    const members = input.members.map<MemberTeamDescriptor>((member) => {
      const memberPath = member.memberPath?.length ? [...member.memberPath] : [member.memberName];
      if (member.memberKind === "agent_team") {
        return {
          memberKind: "agent_team",
          memberName: member.memberName,
          memberPath,
          memberRouteKey: member.memberRouteKey,
          memberRunId: member.memberRunId,
          teamDefinitionId: member.teamDefinitionId,
          coordinatorMemberRouteKey: member.coordinatorMemberRouteKey ?? null,
          role: member.role ?? null,
          description: member.description ?? null,
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
      };
    });
    const currentMemberRouteKeyLower = input.currentMemberRouteKey.trim().toLowerCase();
    const allowedRecipientNames = members
      .filter((member) => member.memberRouteKey.trim().toLowerCase() !== currentMemberRouteKeyLower)
      .map((member) => member.memberName);
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
      allowedRecipientNames,
      sendMessageToEnabled:
        Boolean(deliverInterAgentMessage) && allowedRecipientNames.length > 0,
      deliverInterAgentMessage,
    });
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

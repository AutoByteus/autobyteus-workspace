import type { MemberTeamContext } from "../../../agent-team-execution/domain/member-team-context.js";

export type AutoByteusManagedTeamContext = {
  teamRunId: string;
  teamDefinitionId: string;
  teamName: string;
  currentMemberName: string;
  currentMemberPath: string[];
  currentMemberRouteKey: string;
  currentMemberRunId: string;
  taskAgentInstanceId?: string | null;
  taskAgentRunId?: string | null;
  taskId?: string | null;
  logicalMemberRouteKey?: string | null;
  coordinatorMemberRouteKey: string | null;
  members: Array<{
    memberName: string;
    memberPath: string[];
    memberRouteKey: string;
    memberRunId: string;
  }>;
};

export const buildAutoByteusManagedTeamContext = (
  memberTeamContext: MemberTeamContext,
): AutoByteusManagedTeamContext => ({
  teamRunId: memberTeamContext.teamRunId,
  teamDefinitionId: memberTeamContext.teamDefinitionId,
  teamName: memberTeamContext.teamName,
  currentMemberName: memberTeamContext.memberName,
  currentMemberPath: [...memberTeamContext.memberPath],
  currentMemberRouteKey: memberTeamContext.memberRouteKey,
  currentMemberRunId: memberTeamContext.memberRunId,
  taskAgentInstanceId: memberTeamContext.taskAgentInstance?.taskAgentInstanceId ?? null,
  taskAgentRunId: memberTeamContext.taskAgentInstance?.taskAgentRunId ?? null,
  taskId: memberTeamContext.taskAgentInstance?.taskId ?? null,
  logicalMemberRouteKey:
    memberTeamContext.taskAgentInstance?.logicalMember.memberRouteKey ?? null,
  coordinatorMemberRouteKey: memberTeamContext.coordinatorMemberRouteKey,
  members: memberTeamContext.members.map((member) => ({
    memberName: member.memberName,
    memberPath: [...member.memberPath],
    memberRouteKey: member.memberRouteKey,
    memberRunId: member.memberRunId,
  })),
});

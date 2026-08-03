import type { MemberTeamContext } from "../../../agent-team-execution/domain/member-team-context.js";
import { cloneMemberLogicalAddressContext, type MemberLogicalAddressContext } from "../../../agent-team-execution/domain/member-logical-address-context.js";
import {
  cloneTaskTeamInstanceIdentity,
  type TaskTeamInstanceIdentity,
} from "../../../agent-team-execution/domain/task-team-instance.js";

export type AutoByteusManagedTeamContext = {
  teamRunId: string;
  teamDefinitionId: string;
  teamName: string;
  currentMemberName: string;
  currentMemberPath: string[];
  currentMemberRouteKey: string;
  currentMemberRunId: string;
  addressing: MemberLogicalAddressContext;
  taskAgentInstanceId?: string | null;
  taskAgentRunId?: string | null;
  taskId?: string | null;
  logicalMemberRouteKey?: string | null;
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
  coordinatorMemberRouteKey: string | null;
};

export const buildAutoByteusManagedTeamContext = (
  context: MemberTeamContext,
): AutoByteusManagedTeamContext => ({
  teamRunId: context.teamRunId,
  teamDefinitionId: context.teamDefinitionId,
  teamName: context.teamName,
  currentMemberName: context.memberName,
  currentMemberPath: [...context.memberPath],
  currentMemberRouteKey: context.memberRouteKey,
  currentMemberRunId: context.memberRunId,
  addressing: cloneMemberLogicalAddressContext(context.collaboration.addressing),
  taskAgentInstanceId: context.taskAgentInstance?.taskAgentInstanceId ?? null,
  taskAgentRunId: context.taskAgentInstance?.taskAgentRunId ?? null,
  taskId: context.taskAgentInstance?.taskId ?? null,
  logicalMemberRouteKey: context.taskAgentInstance?.logicalMember.memberRouteKey ?? null,
  taskTeamInstance: context.taskTeamInstance
    ? cloneTaskTeamInstanceIdentity(context.taskTeamInstance)
    : null,
  coordinatorMemberRouteKey: context.coordinatorMemberRouteKey,
});

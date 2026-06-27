import type { MemberTeamContext } from "../../../agent-team-execution/domain/member-team-context.js";
import {
  cloneTaskTeamInstanceIdentity,
  type TaskTeamInstanceIdentity,
} from "../../../agent-team-execution/domain/task-team-instance.js";
import type { TaskDelegationContextMember } from "../../../agent-team-execution/task-delegation/task-delegation-target.js";
import { toTaskDelegationContextMember } from "../../../agent-tools/task-delegation/task-delegation-context-member-mapper.js";

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
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
  coordinatorMemberRouteKey: string | null;
  members: TaskDelegationContextMember[];
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
  taskTeamInstance: memberTeamContext.taskTeamInstance
    ? cloneTaskTeamInstanceIdentity(memberTeamContext.taskTeamInstance)
    : null,
  coordinatorMemberRouteKey: memberTeamContext.coordinatorMemberRouteKey,
  members: memberTeamContext.members.map(toTaskDelegationContextMember),
});

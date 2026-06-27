import type {
  AgentMemberTeamDescriptor,
  MemberTeamDescriptor,
} from "../../agent-team-execution/domain/member-team-context.js";
import type {
  TaskDelegationContextMember,
  TaskDelegationMemberIdentity,
  TaskDelegationTeamIngressIdentity,
  TaskDelegationTeamIdentity,
} from "../../agent-team-execution/task-delegation/task-delegation-target.js";

export const toTaskDelegationMemberIdentity = (member: {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind?: TaskDelegationMemberIdentity["runtimeKind"];
  role?: string | null;
  description?: string | null;
}): TaskDelegationMemberIdentity => ({
  memberKind: "agent",
  memberName: member.memberName,
  memberPath: [...member.memberPath],
  memberRouteKey: member.memberRouteKey,
  memberRunId: member.memberRunId,
  runtimeKind: member.runtimeKind ?? null,
  role: member.role ?? null,
  description: member.description ?? null,
});

const toTaskDelegationTeamIngressIdentity = (member: {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind?: TaskDelegationTeamIngressIdentity["runtimeKind"];
  role?: string | null;
  description?: string | null;
}): TaskDelegationTeamIngressIdentity => ({
  memberName: member.memberName,
  memberPath: [...member.memberPath],
  memberRouteKey: member.memberRouteKey,
  memberRunId: member.memberRunId,
  runtimeKind: member.runtimeKind ?? null,
  role: member.role ?? null,
  description: member.description ?? null,
});

export const toTaskDelegationTeamIdentity = (
  member: Extract<MemberTeamDescriptor, { memberKind: "agent_team" }>,
): TaskDelegationTeamIdentity => ({
  memberKind: "agent_team",
  memberName: member.memberName,
  memberPath: [...member.memberPath],
  memberRouteKey: member.memberRouteKey,
  memberRunId: member.memberRunId,
  teamDefinitionId: member.teamDefinitionId,
  childTeamRunId: member.childTeamRunId ?? null,
  coordinatorMemberRouteKey: member.coordinatorMemberRouteKey ?? null,
  ingress: member.representative
    ? toTaskDelegationTeamIngressIdentity(member.representative)
    : null,
  role: member.role ?? null,
  description: member.description ?? null,
});

export const toTaskDelegationContextMember = (
  member: MemberTeamDescriptor,
): TaskDelegationContextMember =>
  member.memberKind === "agent_team"
    ? toTaskDelegationTeamIdentity(member)
    : toTaskDelegationMemberIdentity(member as AgentMemberTeamDescriptor);

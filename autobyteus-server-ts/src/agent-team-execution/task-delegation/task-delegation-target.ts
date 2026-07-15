import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export type TaskDelegationMemberIdentity = {
  memberKind?: "agent" | null;
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind?: RuntimeKind | null;
  role?: string | null;
  description?: string | null;
};

export type TaskDelegationTeamIngressIdentity = {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind?: RuntimeKind | null;
  role?: string | null;
  description?: string | null;
};

export type TaskDelegationTeamIdentity = {
  memberKind: "agent_team";
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  teamDefinitionId: string;
  childTeamRunId?: string | null;
  coordinatorMemberRouteKey: string | null;
  ingress: TaskDelegationTeamIngressIdentity | null;
  role?: string | null;
  description?: string | null;
};

export type TaskDelegationTarget =
  | { kind: "member"; member: TaskDelegationMemberIdentity }
  | { kind: "team"; team: TaskDelegationTeamIdentity };

export type TaskDelegationContextMember =
  | TaskDelegationMemberIdentity
  | TaskDelegationTeamIdentity;

export const cloneTaskDelegationMemberIdentity = (
  identity: TaskDelegationMemberIdentity,
): TaskDelegationMemberIdentity => ({
  memberKind: "agent",
  memberName: identity.memberName,
  memberPath: [...identity.memberPath],
  memberRouteKey: identity.memberRouteKey,
  memberRunId: identity.memberRunId,
  runtimeKind: identity.runtimeKind ?? null,
  role: identity.role ?? null,
  description: identity.description ?? null,
});

export const cloneTaskDelegationTeamIngressIdentity = (
  identity: TaskDelegationTeamIngressIdentity,
): TaskDelegationTeamIngressIdentity => ({
  memberName: identity.memberName,
  memberPath: [...identity.memberPath],
  memberRouteKey: identity.memberRouteKey,
  memberRunId: identity.memberRunId,
  runtimeKind: identity.runtimeKind ?? null,
  role: identity.role ?? null,
  description: identity.description ?? null,
});

export const cloneTaskDelegationTeamIdentity = (
  identity: TaskDelegationTeamIdentity,
): TaskDelegationTeamIdentity => ({
  memberKind: "agent_team",
  memberName: identity.memberName,
  memberPath: [...identity.memberPath],
  memberRouteKey: identity.memberRouteKey,
  memberRunId: identity.memberRunId,
  teamDefinitionId: identity.teamDefinitionId,
  childTeamRunId: identity.childTeamRunId ?? null,
  coordinatorMemberRouteKey: identity.coordinatorMemberRouteKey ?? null,
  ingress: identity.ingress ? cloneTaskDelegationTeamIngressIdentity(identity.ingress) : null,
  role: identity.role ?? null,
  description: identity.description ?? null,
});

export const cloneTaskDelegationTarget = (
  target: TaskDelegationTarget,
): TaskDelegationTarget => target.kind === "member"
  ? { kind: "member", member: cloneTaskDelegationMemberIdentity(target.member) }
  : { kind: "team", team: cloneTaskDelegationTeamIdentity(target.team) };

export const getTaskDelegationTargetName = (target: TaskDelegationTarget): string =>
  target.kind === "member" ? target.member.memberName : target.team.memberName;

export const getTaskDelegationTargetRouteKey = (target: TaskDelegationTarget): string =>
  target.kind === "member" ? target.member.memberRouteKey : target.team.memberRouteKey;

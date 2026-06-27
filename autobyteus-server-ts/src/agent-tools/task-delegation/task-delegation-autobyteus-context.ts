import {
  cloneTaskTeamInstanceIdentity,
  type TaskTeamInstanceIdentity,
} from "../../agent-team-execution/domain/task-team-instance.js";
import { TaskDelegationError } from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import type {
  TaskDelegationContextMember,
  TaskDelegationMemberIdentity,
  TaskDelegationTeamIngressIdentity,
  TaskDelegationTeamIdentity,
} from "../../agent-team-execution/task-delegation/task-delegation-target.js";
import { runtimeKindFromString } from "../../runtime-management/runtime-kind-enum.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";

type NativeTaskDelegationTeamIngressContext = {
  memberName?: unknown;
  memberPath?: unknown;
  memberRouteKey?: unknown;
  memberRunId?: unknown;
  runtimeKind?: unknown;
  role?: unknown;
  description?: unknown;
};

type NativeTaskDelegationMemberContext = {
  memberKind?: unknown;
  memberName?: unknown;
  memberPath?: unknown;
  memberRouteKey?: unknown;
  memberRunId?: unknown;
  runtimeKind?: unknown;
  role?: unknown;
  description?: unknown;
  teamDefinitionId?: unknown;
  childTeamRunId?: unknown;
  coordinatorMemberRouteKey?: unknown;
  ingress?: NativeTaskDelegationTeamIngressContext | null;
  representative?: NativeTaskDelegationTeamIngressContext | null;
};

type NativeTaskDelegationTeamContext = {
  teamRunId?: string;
  teamDefinitionId?: string | null;
  teamName?: string | null;
  currentMemberName?: string;
  memberName?: string;
  currentMemberPath?: string[];
  memberPath?: string[];
  currentMemberRouteKey?: string;
  memberRouteKey?: string;
  currentMemberRunId?: string;
  memberRunId?: string;
  taskAgentInstanceId?: string | null;
  taskAgentRunId?: string | null;
  taskId?: string | null;
  logicalMemberRouteKey?: string | null;
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
  coordinatorMemberRouteKey?: string | null;
  members?: NativeTaskDelegationMemberContext[];
};

export type NativeTaskDelegationToolExecutionContext = {
  config?: { name?: string };
  customData?: {
    teamContext?: NativeTaskDelegationTeamContext;
  };
};

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new TaskDelegationError(
      "TEAM_RUN_CONTEXT_REQUIRED",
      `Task delegation tools require ${fieldName} in team context.`,
    );
  }
  return normalized;
};

const normalizeOptionalString = (value: unknown): string | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
};

const normalizePath = (
  value: unknown,
  fallbackMemberName: string,
  fieldName: string,
): string[] => {
  if (value === undefined || value === null) return [fallbackMemberName];
  if (!Array.isArray(value)) {
    throw new TaskDelegationError(
      "TEAM_RUN_CONTEXT_REQUIRED",
      `Task delegation tools require ${fieldName} to be an array in team context.`,
    );
  }
  if (value.length === 0) return [fallbackMemberName];
  return value.map((segment, index) =>
    normalizeRequiredString(segment, `${fieldName}[${index}]`),
  );
};

const normalizeIngress = (
  ingress: NativeTaskDelegationTeamIngressContext | null | undefined,
  fieldName: string,
): TaskDelegationTeamIngressIdentity => {
  if (!ingress) {
    throw new TaskDelegationError(
      "TEAM_RUN_CONTEXT_REQUIRED",
      `Task delegation tools require ${fieldName} in team context.`,
    );
  }
  const memberName = normalizeRequiredString(ingress.memberName, `${fieldName}.memberName`);
  return {
    memberName,
    memberPath: normalizePath(ingress.memberPath, memberName, `${fieldName}.memberPath`),
    memberRouteKey: normalizeRequiredString(
      ingress.memberRouteKey,
      `${fieldName}.memberRouteKey`,
    ),
    memberRunId: normalizeRequiredString(ingress.memberRunId, `${fieldName}.memberRunId`),
    runtimeKind: runtimeKindFromString(ingress.runtimeKind, null),
    role: normalizeOptionalString(ingress.role),
    description: normalizeOptionalString(ingress.description),
  };
};

const normalizeNativeMember = (
  member: NativeTaskDelegationMemberContext,
  index: number,
): TaskDelegationContextMember => {
  const memberKind = normalizeRequiredString(member.memberKind, `members[${index}].memberKind`);
  if (memberKind !== "agent" && memberKind !== "agent_team") {
    throw new TaskDelegationError(
      "TEAM_RUN_CONTEXT_REQUIRED",
      `Task delegation tools require members[${index}].memberKind to be 'agent' or 'agent_team'.`,
    );
  }
  const memberName = normalizeRequiredString(member.memberName, `members[${index}].memberName`);
  const baseMember = {
    memberName,
    memberPath: normalizePath(member.memberPath, memberName, `members[${index}].memberPath`),
    memberRouteKey: normalizeRequiredString(
      member.memberRouteKey,
      `members[${index}].memberRouteKey`,
    ),
    memberRunId: normalizeRequiredString(member.memberRunId, `members[${index}].memberRunId`),
    role: normalizeOptionalString(member.role),
    description: normalizeOptionalString(member.description),
  };
  if (memberKind === "agent_team") {
    return {
      ...baseMember,
      memberKind: "agent_team",
      teamDefinitionId: normalizeRequiredString(
        member.teamDefinitionId,
        `members[${index}].teamDefinitionId`,
      ),
      childTeamRunId: normalizeOptionalString(member.childTeamRunId),
      coordinatorMemberRouteKey: normalizeOptionalString(member.coordinatorMemberRouteKey),
      ingress: normalizeIngress(
        member.ingress ?? member.representative,
        `members[${index}].ingress`,
      ),
    } satisfies TaskDelegationTeamIdentity;
  }
  return {
    ...baseMember,
    memberKind: "agent",
    runtimeKind: runtimeKindFromString(member.runtimeKind, null),
  } satisfies TaskDelegationMemberIdentity;
};

export const buildTaskDelegationToolContextFromNativeContext = (
  context: NativeTaskDelegationToolExecutionContext,
): TaskDelegationToolContext => {
  const teamContext = context.customData?.teamContext ?? null;
  if (!teamContext) {
    throw new TaskDelegationError(
      "TEAM_RUN_CONTEXT_REQUIRED",
      "Task delegation tools require an active team context.",
    );
  }
  const memberName = normalizeRequiredString(
    teamContext.currentMemberName ?? teamContext.memberName ?? context.config?.name,
    "currentMemberName",
  );
  const memberPath = normalizePath(
    teamContext.currentMemberPath ?? teamContext.memberPath,
    memberName,
    "currentMemberPath",
  );
  const caller = {
    memberName,
    memberPath,
    memberRouteKey: normalizeRequiredString(
      teamContext.currentMemberRouteKey ?? teamContext.memberRouteKey,
      "currentMemberRouteKey",
    ),
    memberRunId: normalizeRequiredString(
      teamContext.currentMemberRunId ?? teamContext.memberRunId,
      "currentMemberRunId",
    ),
    taskAgentInstanceId: teamContext.taskAgentInstanceId ?? null,
    taskAgentRunId: teamContext.taskAgentRunId ?? null,
    taskId: teamContext.taskId ?? null,
    logicalMemberRouteKey: teamContext.logicalMemberRouteKey ?? null,
    taskTeamInstance: teamContext.taskTeamInstance
      ? cloneTaskTeamInstanceIdentity(teamContext.taskTeamInstance)
      : null,
  };
  const members = (teamContext.members ?? []).map(normalizeNativeMember);
  return {
    teamRunId: normalizeRequiredString(teamContext.teamRunId, "teamRunId"),
    teamDefinitionId: normalizeOptionalString(teamContext.teamDefinitionId),
    teamName: normalizeOptionalString(teamContext.teamName),
    caller,
    coordinatorMemberRouteKey: normalizeOptionalString(teamContext.coordinatorMemberRouteKey),
    members,
  };
};

import { TaskDelegationError } from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";

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
  coordinatorMemberRouteKey?: string | null;
  members?: Array<{
    memberName: string;
    memberPath?: string[];
    memberRouteKey: string;
    memberRunId: string;
  }>;
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
  const memberPath = Array.isArray(teamContext.currentMemberPath)
    ? teamContext.currentMemberPath
    : Array.isArray(teamContext.memberPath)
      ? teamContext.memberPath
      : [memberName];
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
  };
  const members = (teamContext.members ?? []).map((member) => ({
    memberName: member.memberName,
    memberPath: member.memberPath?.length ? [...member.memberPath] : [member.memberName],
    memberRouteKey: member.memberRouteKey,
    memberRunId: member.memberRunId,
  }));
  if (!members.some((member) => member.memberRouteKey === caller.memberRouteKey)) {
    members.unshift(caller);
  }
  return {
    teamRunId: normalizeRequiredString(teamContext.teamRunId, "teamRunId"),
    teamDefinitionId: teamContext.teamDefinitionId ?? null,
    teamName: teamContext.teamName ?? null,
    caller,
    coordinatorMemberRouteKey: teamContext.coordinatorMemberRouteKey ?? null,
    members,
  };
};

import {
  cloneTaskTeamInstanceIdentity,
  type TaskTeamInstanceIdentity,
} from "../../agent-team-execution/domain/task-team-instance.js";
import { createMemberLogicalAddressContext } from "../../agent-team-execution/domain/member-logical-address-context.js";
import { TaskDelegationError } from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";

type NativeTeamContext = {
  teamRunId?: unknown;
  teamDefinitionId?: unknown;
  teamName?: unknown;
  currentMemberName?: unknown;
  currentMemberPath?: unknown;
  currentMemberRouteKey?: unknown;
  currentMemberRunId?: unknown;
  addressing?: {
    rootTeamRunId?: unknown;
    memberAddress?: unknown;
  };
  taskAgentInstanceId?: string | null;
  taskAgentRunId?: string | null;
  taskId?: string | null;
  logicalMemberRouteKey?: string | null;
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
  coordinatorMemberRouteKey?: unknown;
};

export type NativeTaskDelegationToolExecutionContext = {
  config?: { name?: string };
  customData?: { teamContext?: NativeTeamContext };
};

const required = (value: unknown, fieldName: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new TaskDelegationError(
      "TEAM_RUN_CONTEXT_REQUIRED",
      `Task delegation tools require ${fieldName} in team context.`,
    );
  }
  return normalized;
};

const optional = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const path = (value: unknown, fieldName: string): string[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TaskDelegationError("TEAM_RUN_CONTEXT_REQUIRED", `${fieldName} must be a non-empty array.`);
  }
  return value.map((segment, index) => required(segment, `${fieldName}[${index}]`));
};

export const buildTaskDelegationToolContextFromNativeContext = (
  context: NativeTaskDelegationToolExecutionContext,
): TaskDelegationToolContext => {
  const team = context.customData?.teamContext;
  if (!team?.addressing) {
    throw new TaskDelegationError(
      "TEAM_RUN_CONTEXT_REQUIRED",
      "Task delegation tools require an active Team collaboration context.",
    );
  }
  const memberName = required(team.currentMemberName ?? context.config?.name, "currentMemberName");
  const memberPath = path(team.currentMemberPath, "currentMemberPath");
  const addressingKeys = Object.keys(team.addressing).sort();
  if (
    addressingKeys.length !== 2 ||
    addressingKeys[0] !== "memberAddress" ||
    addressingKeys[1] !== "rootTeamRunId"
  ) {
    throw new TaskDelegationError(
      "TEAM_RUN_CONTEXT_REQUIRED",
      "Task delegation addressing accepts only rootTeamRunId and memberAddress.",
    );
  }
  const addressing = createMemberLogicalAddressContext({
    rootTeamRunId: required(team.addressing.rootTeamRunId, "addressing.rootTeamRunId"),
    memberAddress: required(team.addressing.memberAddress, "addressing.memberAddress"),
  });
  return {
    teamRunId: required(team.teamRunId, "teamRunId"),
    teamDefinitionId: optional(team.teamDefinitionId),
    teamName: optional(team.teamName),
    caller: {
      memberKind: "agent",
      memberName,
      memberPath,
      memberRouteKey: required(team.currentMemberRouteKey, "currentMemberRouteKey"),
      memberRunId: required(team.currentMemberRunId, "currentMemberRunId"),
      logicalAddress: addressing.memberAddress,
      taskAgentInstanceId: team.taskAgentInstanceId ?? null,
      taskAgentRunId: team.taskAgentRunId ?? null,
      taskId: team.taskId ?? null,
      logicalMemberRouteKey: team.logicalMemberRouteKey ?? null,
      taskTeamInstance: team.taskTeamInstance
        ? cloneTaskTeamInstanceIdentity(team.taskTeamInstance)
        : null,
    },
    coordinatorMemberRouteKey: optional(team.coordinatorMemberRouteKey),
    addressing,
  };
};

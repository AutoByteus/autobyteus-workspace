import { cloneTaskAgentInstanceIdentity, type TaskAgentInstanceIdentity } from "../../agent-team-execution/domain/task-agent-instance.js";
import { cloneTaskTeamInstanceIdentity, type TaskTeamInstanceIdentity } from "../../agent-team-execution/domain/task-team-instance.js";
import {
  createMemberLogicalAddressContext,
  type MemberLogicalAddressContext,
} from "../../agent-team-execution/domain/member-logical-address-context.js";
import { createTeamExecutionAddress, type TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";
import { TaskDelegationError } from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import { assertAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";

type NativeTeamContext = {
  teamRunId?: unknown;
  teamDefinitionId?: unknown;
  teamName?: unknown;
  memberAddress?: unknown;
  agentRunId?: unknown;
  coordinatorAddress?: unknown;
  executionAddress?: TeamExecutionAddress | null;
  addressing?: unknown;
  taskAgentInstance?: TaskAgentInstanceIdentity | null;
  taskTeamInstance?: TaskTeamInstanceIdentity | null;
};
export type NativeTaskDelegationToolExecutionContext = {
  customData?: { teamContext?: NativeTeamContext };
};
const required = (value: unknown, field: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new TaskDelegationError("TEAM_RUN_CONTEXT_REQUIRED", `Task delegation tools require ${field} in team context.`);
  return normalized;
};
const optional = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;

const buildNativeAddressing = (value: unknown): MemberLogicalAddressContext => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TaskDelegationError("TEAM_RUN_CONTEXT_REQUIRED", "Task delegation tools require an active Team collaboration context.");
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== 2 || keys[0] !== "memberAddress" || keys[1] !== "rootTeamRunId") {
    throw new TaskDelegationError(
      "TEAM_RUN_CONTEXT_REQUIRED",
      "Task delegation Team addressing accepts only rootTeamRunId and memberAddress.",
    );
  }
  const addressing = value as Record<string, unknown>;
  return createMemberLogicalAddressContext({
    rootTeamRunId: required(addressing.rootTeamRunId, "addressing.rootTeamRunId"),
    memberAddress: required(addressing.memberAddress, "addressing.memberAddress"),
  });
};

export const buildTaskDelegationToolContextFromNativeContext = (
  context: NativeTaskDelegationToolExecutionContext,
): TaskDelegationToolContext => {
  const team = context.customData?.teamContext;
  if (!team || !team.executionAddress) {
    throw new TaskDelegationError("TEAM_RUN_CONTEXT_REQUIRED", "Task delegation tools require an active Team collaboration context.");
  }
  const addressing = buildNativeAddressing(team.addressing);
  return {
    teamRunId: required(team.teamRunId, "teamRunId"),
    teamDefinitionId: optional(team.teamDefinitionId),
    teamName: optional(team.teamName),
    caller: {
      executionAddress: createTeamExecutionAddress(team.executionAddress),
      agentRunId: required(team.agentRunId, "agentRunId"),
      taskAgentInstance: team.taskAgentInstance ? cloneTaskAgentInstanceIdentity(team.taskAgentInstance) : null,
      taskTeamInstance: team.taskTeamInstance ? cloneTaskTeamInstanceIdentity(team.taskTeamInstance) : null,
    },
    coordinatorAddress: optional(team.coordinatorAddress) ? assertAgentTeamAddress(optional(team.coordinatorAddress)!) : null,
    addressing,
  };
};

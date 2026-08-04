import { cloneTaskAgentInstanceIdentity, type TaskAgentInstanceIdentity } from "../../agent-team-execution/domain/task-agent-instance.js";
import { cloneTaskTeamInstanceIdentity, type TaskTeamInstanceIdentity } from "../../agent-team-execution/domain/task-team-instance.js";
import { createMemberLogicalAddressContext } from "../../agent-team-execution/domain/member-logical-address-context.js";
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
  addressing?: { rootTeamRunId?: unknown; memberAddress?: unknown };
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

export const buildTaskDelegationToolContextFromNativeContext = (
  context: NativeTaskDelegationToolExecutionContext,
): TaskDelegationToolContext => {
  const team = context.customData?.teamContext;
  if (!team?.addressing || !team.executionAddress) {
    throw new TaskDelegationError("TEAM_RUN_CONTEXT_REQUIRED", "Task delegation tools require an active Team collaboration context.");
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
      executionAddress: createTeamExecutionAddress(team.executionAddress),
      agentRunId: required(team.agentRunId, "agentRunId"),
      taskAgentInstance: team.taskAgentInstance ? cloneTaskAgentInstanceIdentity(team.taskAgentInstance) : null,
      taskTeamInstance: team.taskTeamInstance ? cloneTaskTeamInstanceIdentity(team.taskTeamInstance) : null,
    },
    coordinatorAddress: optional(team.coordinatorAddress) ? assertAgentTeamAddress(optional(team.coordinatorAddress)!) : null,
    addressing,
  };
};

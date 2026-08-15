import { createTeamMemberExecutionIdentity } from "../../agent-team-execution/domain/team-member-execution-identity.js";
import { TaskDelegationError } from "../../agent-team-execution/task-delegation/task-delegation-record.js";
import type { TaskDelegationToolContext } from "./task-delegation-tool-contract.js";

type NativeTeamContext = { rootTeamRunId?: unknown; memberAddress?: unknown; agentRunId?: unknown };
export type NativeTaskDelegationToolExecutionContext = { customData?: { teamContext?: NativeTeamContext } };
const text = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new TaskDelegationError("TEAM_RUN_CONTEXT_REQUIRED", `Task delegation requires ${field} in Team context.`);
  }
  return value;
};

export const buildTaskDelegationToolContextFromNativeContext = (
  context: NativeTaskDelegationToolExecutionContext,
): TaskDelegationToolContext => {
  const team = context.customData?.teamContext;
  if (!team) throw new TaskDelegationError("TEAM_RUN_CONTEXT_REQUIRED", "Task delegation requires an active Team context.");
  const keys = Object.keys(team).sort();
  const expected = ["agentRunId", "memberAddress", "rootTeamRunId"];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new TaskDelegationError("TEAM_RUN_CONTEXT_REQUIRED", "Task delegation Team context accepts only rootTeamRunId, memberAddress, and agentRunId.");
  }
  return Object.freeze({
    identity: createTeamMemberExecutionIdentity({
      rootTeamRunId: text(team.rootTeamRunId, "rootTeamRunId"),
      memberAddress: text(team.memberAddress, "memberAddress"),
      agentRunId: text(team.agentRunId, "agentRunId"),
    }),
  });
};

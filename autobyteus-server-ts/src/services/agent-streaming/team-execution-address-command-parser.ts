import {
  createTeamExecutionAddress,
  type TeamExecutionAddress,
} from "../../agent-team-execution/domain/team-execution-address.js";

export const TEAM_COMMAND_INVALID_TARGET_CODE = "INVALID_TARGET";
export const TEAM_COMMAND_INVALID_TARGET_MESSAGE =
  "The command requires one exact execution_address object.";

export const parseCommandExecutionAddress = (
  payload: Record<string, unknown>,
  rootTeamRunId: string,
): TeamExecutionAddress | null => {
  const value = payload.execution_address;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = ["rootTeamRunId", "taskTeamRunIds", "memberAddress", "taskAgentRunId"];
  if (Object.keys(record).length !== keys.length || !keys.every((key) => Object.hasOwn(record, key))) return null;
  if (!Array.isArray(record.taskTeamRunIds) || !record.taskTeamRunIds.every((id) => typeof id === "string")) return null;
  if (record.taskAgentRunId !== null && typeof record.taskAgentRunId !== "string") return null;
  try {
    const address = createTeamExecutionAddress({
      rootTeamRunId: record.rootTeamRunId as string,
      taskTeamRunIds: record.taskTeamRunIds as string[],
      memberAddress: record.memberAddress as string,
      taskAgentRunId: record.taskAgentRunId as string | null,
    });
    return address.rootTeamRunId === rootTeamRunId ? address : null;
  } catch { return null; }
};

import {
  createTeamExecutionAddress,
  type TeamExecutionAddress,
} from "../../agent-team-execution/domain/team-execution-address.js";

export const TEAM_COMMAND_INVALID_TARGET_CODE = "INVALID_TARGET";
export const TEAM_COMMAND_INVALID_TARGET_MESSAGE =
  "The command requires one exact execution_address object.";

export const parseCommandExecutionAddress = (
  payload: Readonly<Record<string, unknown>>,
  rootTeamRunId: string,
): TeamExecutionAddress | null => {
  const value = payload.execution_address;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = ["root_team_run_id", "task_team_run_ids", "member_address", "task_agent_run_id"];
  if (Object.keys(record).length !== keys.length || !keys.every((key) => Object.hasOwn(record, key))) return null;
  if (!Array.isArray(record.task_team_run_ids) || !record.task_team_run_ids.every((id) => typeof id === "string")) return null;
  if (record.task_agent_run_id !== null && typeof record.task_agent_run_id !== "string") return null;
  try {
    const address = createTeamExecutionAddress({
      rootTeamRunId: record.root_team_run_id as string,
      taskTeamRunIds: record.task_team_run_ids as string[],
      memberAddress: record.member_address as string,
      taskAgentRunId: record.task_agent_run_id as string | null,
    });
    return address.rootTeamRunId === rootTeamRunId ? address : null;
  } catch { return null; }
};

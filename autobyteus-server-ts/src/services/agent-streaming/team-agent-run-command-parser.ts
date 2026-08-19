export const TEAM_COMMAND_INVALID_TARGET_CODE = "INVALID_TARGET";
export const TEAM_COMMAND_INVALID_TARGET_MESSAGE =
  "The command requires one exact agent_run_id in the connected root TeamRun.";

export const parseCommandAgentRunId = (
  payload: Readonly<Record<string, unknown>>,
): string | null => {
  const value = payload.agent_run_id;
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) return null;
  return value;
};

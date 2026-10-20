import type { PreparedTaskExecution } from "../domain/prepared-task-execution.js";
import type { TeamRunAgentTeamNode } from "../domain/team-run-config.js";

export const requirePreparedTaskTeamNode = (
  prepared: PreparedTaskExecution,
): TeamRunAgentTeamNode => {
  const binding = prepared.binding;
  if (binding.kind !== "team") throw new Error("Prepared execution is not a Team.");
  const preparedRoot = prepared.preparedTeamRuns.find((run) => run.teamRunId === binding.teamRunId);
  if (!preparedRoot) throw new Error(`Prepared TeamRun '${binding.teamRunId}' was not found.`);
  return preparedRoot.context.teamNode;
};

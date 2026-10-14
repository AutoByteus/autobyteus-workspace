import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { TeamRun } from "./team-run.js";

/**
 * User Stop of a task Team copy's TeamRun (DS-002): fences and interrupts every agent in it (and in
 * the copies it hosts), then finishes its termination whether or not it is quiet. The TeamRun is not
 * reused: the next message restores the copy from its records, as after idle shutdown.
 */
export const stopTaskTeamRunForUser = async (
  run: Pick<TeamRun, "freezeForRootTermination">,
): Promise<AgentOperationResult> => {
  const scope = run.freezeForRootTermination();
  const fenced = await scope.fenceAgentRunsForRootShutdown();
  return fenced.accepted ? scope.finish() : fenced;
};

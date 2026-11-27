import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TeamExecutionIndex } from "../services/team-execution-index.js";
import { createTeamAgentStatusDetails, createTeamAgentStatusSnapshot, type TeamAgentStatusSnapshot } from "./team-agent-status.js";

/**
 * A Team run's leaf statuses: its live leaves, plus `offline` for every agent of its tree without a live execution
 * (shut-down children). Moved out of `RootTeamRun` unchanged (autobyteus-646, its size).
 */
export const teamLeafAgentStatusSnapshots = (
  teamRunId: string,
  live: readonly TeamAgentStatusSnapshot[],
  index: Pick<TeamExecutionIndex, "listAgentExecutions">,
): readonly TeamAgentStatusSnapshot[] => {
  const reported = new Set(live.map((snapshot) => snapshot.execution.agentRunId));
  const root = createTeamRootExecutionIdentity(teamRunId);
  const dormant = index.listAgentExecutions()
    .filter((agent) => !reported.has(agent.agentRunId))
    .map((agent) => createTeamAgentStatusSnapshot({
      execution: createCollaborationMemberExecutionIdentity({ root, memberAddress: agent.address, agentRunId: agent.agentRunId }),
      details: createTeamAgentStatusDetails({ status: "offline", backgroundTasksRunning: 0 }),
    }));
  return Object.freeze([...live, ...dormant]);
};

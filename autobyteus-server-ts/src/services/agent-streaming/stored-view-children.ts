import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { createTeamAgentStatusDetails, createTeamAgentStatusSnapshot, type TeamAgentStatusSnapshot } from "../../agent-team-execution/domain/team-agent-status.js";
import type { TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamExecutionIndex } from "../../agent-team-execution/services/team-execution-index.js";

/** A stopped team run's own agents in its view: each member offline (it runs nothing). */
export const storedTeamPackageSnapshot = (tree: TeamRunExecutionTreeSnapshot): Readonly<{
  tree: TeamRunExecutionTreeSnapshot; statuses: readonly TeamAgentStatusSnapshot[]; inputStates: readonly [];
}> => {
  const root = createTeamRootExecutionIdentity(tree.rootTeam.teamRunId);
  return Object.freeze({ tree, inputStates: Object.freeze([]) as readonly [], statuses: Object.freeze(new TeamExecutionIndex(tree).listAgentExecutions()
    .map((agent) => createTeamAgentStatusSnapshot({
      execution: createCollaborationMemberExecutionIdentity({ root, memberAddress: agent.address, agentRunId: agent.agentRunId }),
      details: createTeamAgentStatusDetails({ status: "offline" }),
    }))) });
};

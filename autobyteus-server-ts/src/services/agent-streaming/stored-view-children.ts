import { LocalChildObservation, type LocalChildRootEvent } from "../../agent-collaboration/execution/delegation/local-child-observation.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { createCollaborationMemberExecutionIdentity, createTeamRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { createTeamAgentStatusDetails, createTeamAgentStatusSnapshot, type TeamAgentStatusSnapshot } from "../../agent-team-execution/domain/team-agent-status.js";
import type { TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamExecutionIndex } from "../../agent-team-execution/services/team-execution-index.js";

/**
 * A stopped run's view session (autobyteus-461 SR-046, stored mode) follows the run's children's output itself, as a
 * live root does for its viewers, and numbers it from the stored snapshot's base. Returns the stop.
 */
export const followStoredChildren = (
  run: RootExecutionIdentity,
  base: number,
  send: (changeSequence: number, event: LocalChildRootEvent) => void,
): (() => void) => {
  let sequence = base;
  const observation = new LocalChildObservation({ run, publish: (event) => send(++sequence, event) });
  observation.viewerAttached();
  return () => observation.dispose();
};

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

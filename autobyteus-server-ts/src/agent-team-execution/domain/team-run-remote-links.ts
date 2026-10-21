import type { RemoteRunLinksOptions } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import type { RemoteTeamMember } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRunExecutionTreeSnapshot } from "./team-run-execution-tree.js";

/**
 * The members of a Team run a peer started (autobyteus-247): every configured agent of its (flat) layout.
 * The delegating node gets this list in the start answer, and the Team root's
 * back-link pairs the delegator with the same agents, so both sides use one member set.
 */
export const peerStartedTeamMembers = (tree: TeamRunExecutionTreeSnapshot): readonly RemoteTeamMember[] =>
  Object.freeze(tree.rootTeam.members.map((member) => Object.freeze({ address: member.address, agentRunId: member.agentRunId })));

/**
 * A Team root's remote links, read from its tree at call time: the remote runs its agents delegated to, and the
 * back-link when a peer started it (`delegatedFrom` on the tree), paired with every member. The live root and
 * the stored-link check before a restore (N-303) build them the same way.
 */
export const teamRunRemoteLinks = (getTree: () => TeamRunExecutionTreeSnapshot): Omit<RemoteRunLinksOptions, "channel"> => {
  const delegatedFrom = getTree().delegatedFrom;
  return Object.freeze({
    remoteRuns: () => getTree().rootTeam.remoteTaskExecutions ?? [],
    backLink: delegatedFrom
      ? Object.freeze({ pairedAgentRunIds: () => peerStartedTeamMembers(getTree()).map((member) => member.agentRunId), delegatedFrom })
      : null,
  });
};

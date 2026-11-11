import type { RemoteRunLinksOptions } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import type { RemoteTeamMember } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRunExecutionTreeSnapshot } from "./team-run-execution-tree.js";
import { peerDelegatedFromOf } from "../../run-history/store/agent-run-metadata-types.js";
import { peerRunLinksOf } from "../../agent-collaboration/execution/remote/peer-run-link.js";
import type { DelegationTree } from "../../agent-collaboration/delegation/delegation-tree.js";

/**
 * The members of a Team run a peer started (autobyteus-247): every configured agent of its (flat) layout.
 * The delegating node gets this list in the start answer, and the Team root's
 * back-link pairs the delegator with the same agents, so both sides use one member set.
 */
export const peerStartedTeamMembers = (tree: TeamRunExecutionTreeSnapshot): readonly RemoteTeamMember[] =>
  Object.freeze(tree.rootTeam.members.map((member) => Object.freeze({ address: member.address, agentRunId: member.agentRunId })));

/**
 * A Team root's remote links, read at call time: the peer runs its agents delegated to (their Task entries), and the
 * back-link when a peer started it (`delegatedFrom` on the tree), paired with every member. The live root and
 * the stored-link check before a restore (N-303) build them the same way.
 */
export const teamRunRemoteLinks = (getTree: () => TeamRunExecutionTreeSnapshot, delegations: Pick<DelegationTree, "peerChildrenOf">): Omit<RemoteRunLinksOptions, "channel"> => {
  // Only a team run a peer started has a delegator endpoint on a peer (AR-016, `isPeerStarted`).
  const delegatedFrom = peerDelegatedFromOf(getTree());
  return Object.freeze({
    peerRuns: () => peerRunLinksOf({ rootSubjectKind: "agent_team", rootRunId: getTree().rootTeam.teamRunId }, delegations),
    backLink: delegatedFrom
      ? Object.freeze({ pairedAgentRunIds: () => peerStartedTeamMembers(getTree()).map((member) => member.agentRunId), delegatedFrom })
      : null,
  });
};

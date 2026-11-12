import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import { peerRunLinksOf } from "../../agent-collaboration/execution/remote/peer-run-link.js";
import type { RunProjection } from "../../run-history/services/agent-run-view-projection-service.js";
import { remoteChildOf, remoteMemberProjection } from "../../agent-collaboration/execution/remote/remote-child-commands.js";
import { CollaborationMemberNotFoundError } from "../../agent-collaboration/execution/domain/collaboration-member-not-found-error.js";

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export interface StandaloneRootMemberRunProjection {
  agentRunId: string;
  memberAddress: string;
  conversation: RunProjection["conversation"];
  activities: RunProjection["activities"];
  summary: string | null;
  lastActivityAt: string | null;
  hasEarlierActiveTraceEvents: boolean;
}

/**
 * A child row of a standalone run that runs on a peer node (autobyteus-278): its stored conversation, read from its
 * node through the run that delegated to it. A child on this node is a run of its own and is read by its own identity
 * (its run, or its team run's member; autobyteus-461 DS-8, CR-461-022), never through the delegating run; this answers
 * only the run's peer children, as the team and org member reads do (CR-461-014). A peer child's trace and files stay
 * on its node.
 */
export class StandaloneRootMemberViewProjectionService {
  private readonly tree: Pick<DelegationIndex, "peerChildrenOf">;

  constructor(options: Readonly<{
    /** The relationships between runs, from the Task entries (SR-047): the runs this run delegated to peers. */
    tree: Pick<DelegationIndex, "peerChildrenOf">;
  }>) {
    this.tree = options.tree;
  }

  async getProjection(hostRunId: string, memberAddress: string, agentRunId: string): Promise<StandaloneRootMemberRunProjection> {
    const host = required(hostRunId, "hostRunId");
    const run = required(agentRunId, "agentRunId");
    const remote = remoteChildOf(peerRunLinksOf({ rootSubjectKind: "agent", rootRunId: host }, this.tree), run);
    if (!remote) {
      throw new CollaborationMemberNotFoundError(`AgentRun '${run}' is not a run Agent run '${host}' delegated to a peer node.`);
    }
    return await remoteMemberProjection(remote, required(memberAddress, "memberAddress")) as StandaloneRootMemberRunProjection;
  }
}

let processService: StandaloneRootMemberViewProjectionService | null = null;
/** The composition root sets the process service it created with the tree (SR-047 step 8); the returned function releases it. */
export const setProcessStandaloneRootMemberViewProjectionService = (service: StandaloneRootMemberViewProjectionService): (() => void) => {
  processService = service;
  return () => { if (processService === service) processService = null; };
};
/** The process service; its callers are older lookups (FU-011). */
export const getStandaloneRootMemberViewProjectionService = (): StandaloneRootMemberViewProjectionService => {
  if (!processService) throw new Error("StandaloneRootMemberViewProjectionService is created by the composition root.");
  return processService;
};

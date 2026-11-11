import type { DelegationTree } from "../../delegation/delegation-tree.js";
import type { AgentTeamAddress } from "../../domain/agent-team-address.js";
import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { PeerRunMember } from "../task/task-execution-resource-port.js";

type PeerRunLinkCore = Readonly<{
  /** The address it was delegated to (its Task entry's `recipientAddress`). */
  address: AgentTeamAddress;
  nodeId: string;
  delegatorAgentRunId: string;
  /** When its entry was linked. */
  startedAt: string;
  /** Its Task entry is open; a closed one is fenced (AR-020). */
  open: boolean;
}>;
export type PeerAgentRunLink = PeerRunLinkCore & Readonly<{ kind: "agent"; agentRunId: string }>;
export type PeerTeamRunLink = PeerRunLinkCore & Readonly<{
  kind: "agent_team";
  teamRunId: string;
  /** The members' own addresses in the team run on its node (SR-030). */
  members: readonly PeerRunMember[];
  /** The coordinator's own address there. */
  coordinatorAddress: AgentTeamAddress;
}>;
/**
 * A run on a peer node that a run of this node delegated to, read from its Task entry (contract §3.1, E3; design
 * DS-1). It replaces the hosting tree's stored `remoteTaskExecutions` link: the Task entry is the one record.
 */
export type PeerRunLink = PeerAgentRunLink | PeerTeamRunLink;

/** The peer runs `run` delegated to, open or closed, from the `DelegationTree`. */
export const peerRunLinksOf = (run: RootExecutionIdentity, tree: Pick<DelegationTree, "peerChildrenOf">): readonly PeerRunLink[] =>
  tree.peerChildrenOf(run).map((child): PeerRunLink => {
    const core = { address: child.recipientAddress as AgentTeamAddress, nodeId: child.nodeId, delegatorAgentRunId: child.delegatorAgentRunId,
      startedAt: child.linkedAt, open: child.open };
    if ("agentRunId" in child.run) return { kind: "agent", agentRunId: child.run.agentRunId, ...core };
    const members = child.members ?? [];
    const coordinator = members.find((member) => member.agentRunId === child.entryAgentRunId);
    return { kind: "agent_team", teamRunId: child.run.teamRunId, members, coordinatorAddress: (coordinator?.address ?? "/") as AgentTeamAddress, ...core };
  });

/** The run ID a peer link names on its node: the agent run, or the team run. */
export const peerRunIdOf = (link: PeerRunLink): string => link.kind === "agent" ? link.agentRunId : link.teamRunId;

/** The coordinator's run ID of a peer team link. */
export const peerTeamCoordinatorRunId = (link: PeerTeamRunLink): string =>
  link.members.find((member) => member.address === link.coordinatorAddress)?.agentRunId ?? link.members[0]!.agentRunId;

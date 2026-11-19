import type { PeerAgentRunLink, PeerTeamRunLink } from "./peer-run-link.js";
import type { PeerDelegatedFrom } from "../../../run-history/store/agent-run-metadata-types.js";
import { getAgentTeamAddressBasename } from "../../domain/agent-team-address.js";
import type { CollaborationCommunicationMessage } from "../communication/collaboration-communication-message.js";
import type { RemoteMessageTransmission, RemoteTargetRoot } from "./remote-run-channel.js";
import type { RemoteRunReference } from "./remote-run-reference.js";

/** What every remote endpoint of a root has: the run on the peer and its own rules (design § Remote Messaging). */
type RemoteEndpointCore = Readonly<{
  /** The run on the peer. */
  reference: RemoteRunReference;
  /**
   * The local agents of this root the run is paired with (CM-11): the one representation of the pair rule
   * (autobyteus-247 N-301); `allowsSender` and `allowsTarget` are derived from it.
   */
  pairedAgentRunIds: ReadonlySet<string>;
  /** The name a local agent sees in results: the target address's name, or the run ID. */
  displayName: string;
  /**
   * The pair rule, outbound: does this local agent message the endpoint through its link? Any other agent messages the
   * same run by its run ID only (`unlinked_run`, autobyteus-492 DS-006).
   */
  allowsSender(agentRunId: string): boolean;
  /** The pair rule, inbound: may the endpoint send to this local agent? */
  allowsTarget(agentRunId: string): boolean;
  /** The request that carries a prepared message from a paired agent to the endpoint. */
  transmission(message: CollaborationCommunicationMessage): RemoteMessageTransmission;
}>;

/**
 * On the delegating node (A): an Agent run this root delegated to a peer, built from its Task entry (`PeerRunLink`).
 * Its delegator messages it through the link; it belongs to the Task the link was recorded under (item 5).
 */
export type DelegatedRunEndpoint = RemoteEndpointCore & Readonly<{
  kind: "delegated_run";
  link: PeerAgentRunLink;
}>;

/**
 * On the delegating node (A): one member of a Team run this root delegated to a peer (autobyteus-247), one endpoint
 * per member run ID of the Team link (the coordinator included). Its delegator messages it through the link; it belongs
 * to the Team's Task.
 */
export type DelegatedTeamEndpoint = RemoteEndpointCore & Readonly<{
  kind: "delegated_team";
  link: PeerTeamRunLink;
}>;

/**
 * On the node that runs a delegated run (B): its delegator on the peer, built from the root's `delegatedFrom`.
 * Its rules apply to every local agent the back-link pairs with (the agent of a standalone run; every member of
 * a Team root); there is no Task on this node (N-11). Its messages name the coordinating run as their root.
 */
export type DelegatorEndpoint = RemoteEndpointCore & Readonly<{
  kind: "delegator";
  delegatedFrom: PeerDelegatedFrom;
  /** N-6: the work packet comes from the delegator on its node, for a paired agent (a run's own agent, or the coordinator). */
  admitsWorkPacket(fromNodeId: string, senderAgentRunId: string, targetAgentRunId: string): boolean;
}>;

/**
 * autobyteus-492: a running agent of a peer node named only by `{nodeId, agentRunId}`, with no Task link (the run ID is
 * the address, CM-13). Built for one message, outbound or inbound, and paired with that message's local agent only;
 * never stored, so a root's links never return it. Its request names no root: the peer finds the running agent itself
 * (`run_message`), and never wakes it.
 */
export type UnlinkedRunEndpoint = RemoteEndpointCore & Readonly<{ kind: "unlinked_run" }>;

/** A root's own endpoints, built from its Task entries and its back-link (`RemoteRunLinks`). */
export type LinkedRemoteEndpoint = DelegatedRunEndpoint | DelegatedTeamEndpoint | DelegatorEndpoint;
export type RemoteEndpoint = LinkedRemoteEndpoint | UnlinkedRunEndpoint;

/** The pair rule from the one representation (N-301). */
const pairRule = (paired: readonly string[]) => {
  const pairedAgentRunIds: ReadonlySet<string> = new Set(paired);
  const isPaired = (agentRunId: string) => pairedAgentRunIds.has(agentRunId);
  return { pairedAgentRunIds, allowsSender: isPaired, allowsTarget: isPaired };
};

const messageRequest = (nodeId: string, targetRoot: RemoteTargetRoot, message: CollaborationCommunicationMessage): RemoteMessageTransmission => Object.freeze({
  nodeId,
  kind: "message",
  messageId: message.messageId,
  senderAgentRunId: message.senderAgentRunId,
  targetRoot,
  targetAgentRunId: message.receiverAgentRunId,
  content: message.content,
  messageType: message.messageType,
  createdAt: message.createdAt,
});


export const delegatedRunEndpoint = (link: PeerAgentRunLink): DelegatedRunEndpoint => {
  const targetRoot: RemoteTargetRoot = Object.freeze({ kind: "agent", runId: link.agentRunId });
  return Object.freeze({
    kind: "delegated_run" as const,
    link,
    reference: Object.freeze({ nodeId: link.nodeId, agentRunId: link.agentRunId }),
    ...pairRule([link.delegatorAgentRunId]),
    displayName: getAgentTeamAddressBasename(link.address) ?? link.agentRunId,
    transmission: (message: CollaborationCommunicationMessage) => messageRequest(link.nodeId, targetRoot, message),
  });
};

/** The endpoints of a remote Team link: one per member (the coordinator included). */
export const delegatedTeamEndpoints = (link: PeerTeamRunLink): readonly DelegatedTeamEndpoint[] => {
  const targetRoot: RemoteTargetRoot = Object.freeze({ kind: "agent_team", runId: link.teamRunId });
  const rule = pairRule([link.delegatorAgentRunId]);
  return Object.freeze(link.members.map((member): DelegatedTeamEndpoint => Object.freeze({
    kind: "delegated_team" as const,
    link,
    reference: Object.freeze({ nodeId: link.nodeId, agentRunId: member.agentRunId }),
    ...rule,
    displayName: getAgentTeamAddressBasename(member.address) ?? member.agentRunId,
    transmission: (message: CollaborationCommunicationMessage) => messageRequest(link.nodeId, targetRoot, message),
  })));
};

export const delegatorEndpoint = (pairedAgentRunIds: readonly string[], delegatedFrom: PeerDelegatedFrom): DelegatorEndpoint => {
  const rule = pairRule(pairedAgentRunIds);
  return Object.freeze({
    kind: "delegator" as const,
    delegatedFrom,
    reference: Object.freeze({ nodeId: delegatedFrom.nodeId, agentRunId: delegatedFrom.delegatorAgentRunId }),
    ...rule,
    displayName: delegatedFrom.delegatorAgentRunId,
    // The delegating node receives it in the delegating run it named at start.
    transmission: (message: CollaborationCommunicationMessage) => messageRequest(delegatedFrom.nodeId, delegatedFrom.delegatingRun, message),
    admitsWorkPacket: (fromNodeId: string, senderAgentRunId: string, targetAgentRunId: string) =>
      fromNodeId === delegatedFrom.nodeId && senderAgentRunId === delegatedFrom.delegatorAgentRunId && rule.allowsTarget(targetAgentRunId),
  });
};

/**
 * The one-message endpoint of a peer's running agent (autobyteus-492 DS-004 … DS-006): `{nodeId, agentRunId}` is the run
 * on the peer; `pairedAgentRunId` the local agent that sends (outbound) or receives (inbound) this message.
 */
export const unlinkedRunEndpoint = (input: Readonly<{ nodeId: string; agentRunId: string; pairedAgentRunId: string }>): UnlinkedRunEndpoint =>
  Object.freeze({
    kind: "unlinked_run" as const,
    reference: Object.freeze({ nodeId: input.nodeId, agentRunId: input.agentRunId }),
    ...pairRule([input.pairedAgentRunId]),
    displayName: input.agentRunId,
    transmission: (message: CollaborationCommunicationMessage): RemoteMessageTransmission => Object.freeze({
      nodeId: input.nodeId,
      kind: "run_message",
      messageId: message.messageId,
      senderAgentRunId: message.senderAgentRunId,
      targetAgentRunId: message.receiverAgentRunId,
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt,
    }),
  });

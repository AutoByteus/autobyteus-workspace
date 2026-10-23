import type {
  RemoteTaskAgentExecution,
  RemoteTaskExecution,
  RemoteTaskTeamExecution,
} from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { DelegatedFrom } from "../../../run-history/store/agent-run-metadata-types.js";
import type { CollaborationCommunicationMessage } from "../communication/collaboration-communication-message.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "./remote-refusal-codes.js";
import { delegatedRunEndpoint, delegatedTeamEndpoints, delegatorEndpoint, type RemoteEndpoint } from "./remote-endpoint.js";
import {
  resolveRemoteRunChannel,
  type RemoteChannelRefusal,
  type RemoteDeliveryReceipt,
  type RemoteOwnerCommand,
  type RemoteRunChannel,
} from "./remote-run-channel.js";

/** A message a peer node sends to this root's linked agent, as its peer gateway admitted it. */
export type RemoteInboundMessage = Readonly<{
  fromNodeId: string;
  /** This owner's label for the sending node, named in the receiver's header. */
  fromNodeName: string;
  message: CollaborationCommunicationMessage;
}>;

/** The work packet that starts a remote run on its own node (N-6); not a message-log entry. */
export type RemoteInboundWorkPacket = Readonly<{
  fromNodeId: string;
  fromNodeName: string;
  senderAgentRunId: string;
  targetAgentRunId: string;
  description: string;
}>;

/**
 * What a peer sends, without its content: the link check asks only who sends it from which node, to which local
 * agent. Used for the check against stored links before an inactive root is restored (autobyteus-247 N-303).
 */
export type RemoteInboundQuery = Readonly<{
  kind: "message" | "work_packet";
  fromNodeId: string;
  senderAgentRunId: string;
  targetAgentRunId: string;
}> | Readonly<{
  /**
   * autobyteus-278: the owner of the node whose delegation started this run reads or drives it: about one of the
   * agents the back-link pairs with, or about the whole run (`null`: its summary, its observation).
   */
  kind: "owner";
  fromNodeId: string;
  targetAgentRunId: string | null;
}>;

/**
 * N-303: a peer's request checked against a root's stored links before the root is restored. `proceed` when the
 * stored links admit it, or when the root is already active (it checks in memory); `not_found` without a root.
 * An `owner` query (autobyteus-278) is always checked against the back-link, which never changes for a run.
 */
export type StoredRemoteLinkCheck = "proceed" | "not_linked" | "not_found";

/** The stored check, by the same rules as the restored root: the root managers pass their stored links. */
export const storedRemoteLinkCheck = (
  stored: Omit<RemoteRunLinksOptions, "channel"> | null,
  query: RemoteInboundQuery,
): StoredRemoteLinkCheck => !stored ? "not_found" : new RemoteRunLinks(stored).admitsInbound(query) ? "proceed" : "not_linked";

/** The peer accepted the message; `peerName` is this owner's label for it, named in the sender's result. */
export type RemoteDeliveryAnswer = Readonly<{ accepted: true; peerName: string }> | RemoteChannelRefusal;

export type RemoteRunLinksOptions = Readonly<{
  /** Delegating node: the root's remote links (the tree's in-memory `remoteTaskExecutions`), read at call time. */
  remoteRuns(): readonly RemoteTaskExecution[];
  /**
   * Receiving node: the back-link of a root a peer delegated to (`delegatedFrom`) and the local agents it pairs
   * with (a standalone root's host; every member of a Team root); `null` otherwise.
   */
  backLink?: Readonly<{ pairedAgentRunIds(): readonly string[]; delegatedFrom: DelegatedFrom }> | null;
  channel?(): RemoteRunChannel | null;
}>;

/**
 * The shared core of a root's remote endpoints (design § Remote Messaging, AR-006): membership and transmit.
 * It has no side-dependent rule; each endpoint kind carries its own (`remote-endpoint.ts`). It is the only reader
 * of the tree's `remoteTaskExecutions` outside the store (AR-001). It never touches message state: the root's
 * message delivery orders the pair rule, the engine and `deliver` (AR-005).
 */
export class RemoteRunLinks {
  constructor(private readonly options: RemoteRunLinksOptions) {}

  endpoints(): readonly RemoteEndpoint[] {
    const delegated = this.options.remoteRuns().flatMap((link): readonly RemoteEndpoint[] =>
      link.kind === "agent" ? [delegatedRunEndpoint(link)] : delegatedTeamEndpoints(link));
    const back = this.options.backLink;
    return back ? [...delegated, delegatorEndpoint(back.pairedAgentRunIds(), back.delegatedFrom)] : delegated;
  }

  /**
   * The remote Team link with this team run ID (autobyteus-247): the existing-copy refusal (G-3), the closure fence
   * (G-4) and the team-run-ID guidance (G-6) look Teams up by their team run ID, as local Team copies are.
   */
  teamLinkFor(teamRunId: string): RemoteTaskTeamExecution | null {
    return this.options.remoteRuns().find((link): link is RemoteTaskTeamExecution => link.kind === "agent_team" && link.teamRunId === teamRunId) ?? null;
  }

  /** The remote Agent link with this agent run ID (autobyteus-278: the user's Stop of a remote Agent copy). */
  agentLinkFor(agentRunId: string): RemoteTaskAgentExecution | null {
    return this.options.remoteRuns().find((link): link is RemoteTaskAgentExecution => link.kind === "agent" && link.agentRunId === agentRunId) ?? null;
  }

  /** The remote endpoint with this run ID; `null` when the run ID is not one (today's local path). */
  endpointFor(agentRunId: string): RemoteEndpoint | null {
    return this.endpoints().find((endpoint) => endpoint.reference.agentRunId === agentRunId) ?? null;
  }

  /** Run-ID membership: the run ID names a remote endpoint of this root (not a hosted agent). */
  has(agentRunId: string): boolean {
    return this.endpointFor(agentRunId) !== null;
  }

  /** The inbound link check: the sender is this root's endpoint on that peer, and its kind allows the target. */
  inboundEndpoint(fromNodeId: string, senderAgentRunId: string, targetAgentRunId: string): RemoteEndpoint | null {
    const endpoint = this.endpointFor(senderAgentRunId);
    return endpoint && endpoint.reference.nodeId === fromNodeId && endpoint.allowsTarget(targetAgentRunId) ? endpoint : null;
  }

  /** N-6: the work packet comes from this root's delegator on its node, for an agent the back-link pairs with. */
  admitsWorkPacket(fromNodeId: string, senderAgentRunId: string, targetAgentRunId: string): boolean {
    const endpoint = this.endpointFor(senderAgentRunId);
    return endpoint?.kind === "delegator" && endpoint.admitsWorkPacket(fromNodeId, senderAgentRunId, targetAgentRunId);
  }

  /**
   * autobyteus-278: the caller is the node whose delegation started this root (its back-link), about one of the
   * agents the back-link pairs with, or about the whole run (`null`).
   */
  admitsOwner(fromNodeId: string, targetAgentRunId: string | null): boolean {
    const back = this.options.backLink;
    if (!back || back.delegatedFrom.nodeId !== fromNodeId) return false;
    return targetAgentRunId === null || back.pairedAgentRunIds().includes(targetAgentRunId);
  }

  /** The link check for every kind of inbound request: the same rules the root applies once it is active. */
  admitsInbound(query: RemoteInboundQuery): boolean {
    if (query.kind === "owner") return this.admitsOwner(query.fromNodeId, query.targetAgentRunId);
    return query.kind === "work_packet"
      ? this.admitsWorkPacket(query.fromNodeId, query.senderAgentRunId, query.targetAgentRunId)
      : this.inboundEndpoint(query.fromNodeId, query.senderAgentRunId, query.targetAgentRunId) !== null;
  }

  /** Transmits a prepared message to the endpoint's node (the channel only; no state changes here). */
  async deliver(endpoint: RemoteEndpoint, message: CollaborationCommunicationMessage): Promise<RemoteDeliveryAnswer> {
    const channel = this.channel();
    if (!channel) return { accepted: false, code: REMOTE_REFUSAL.OFF, message: REMOTE_ROOT_REFUSAL_TEXT.off };
    const receipt = await channel.deliverMessage(endpoint.transmission(message));
    return receipt.accepted ? { accepted: true, peerName: await channel.peerName(endpoint.reference.nodeId) } : receipt;
  }

  /**
   * autobyteus-278 (DS-004): a command of this node's owner for an agent of a run this root delegated to a peer (the
   * Agent run, or a Team member), passed to its node, which applies it to the linked run. Never for the delegator.
   */
  async ownerCommand(agentRunId: string, command: RemoteOwnerCommand): Promise<RemoteDeliveryReceipt> {
    const endpoint = this.endpointFor(agentRunId);
    if (!endpoint || endpoint.kind === "delegator") {
      return { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not a run this root delegated to another node.` };
    }
    const channel = this.channel();
    if (!channel) return { accepted: false, code: REMOTE_REFUSAL.OFF, message: REMOTE_ROOT_REFUSAL_TEXT.off };
    const targetRoot = endpoint.kind === "delegated_run"
      ? { kind: "agent" as const, runId: endpoint.link.agentRunId }
      : { kind: "agent_team" as const, runId: endpoint.link.teamRunId };
    return channel.ownerCommand(endpoint.reference.nodeId, targetRoot, agentRunId, command);
  }

  /** The node name a local agent sees for a remote endpoint (this owner's label for the peer). */
  async peerName(nodeId: string): Promise<string> {
    return (await this.channel()?.peerName(nodeId)) ?? nodeId;
  }

  private channel(): RemoteRunChannel | null {
    return resolveRemoteRunChannel(this.options.channel);
  }
}

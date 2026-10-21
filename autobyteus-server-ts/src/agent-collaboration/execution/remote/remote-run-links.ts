import type { RemoteTaskExecution } from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { DelegatedFrom } from "../../../run-history/store/agent-run-metadata-types.js";
import type { CollaborationCommunicationMessage } from "../communication/collaboration-communication-message.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "./remote-refusal-codes.js";
import { delegatedRunEndpoint, delegatorEndpoint, type RemoteEndpoint } from "./remote-endpoint.js";
import { resolveRemoteRunChannel, type RemoteChannelRefusal, type RemoteRunChannel } from "./remote-run-channel.js";

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

/** The peer accepted the message; `peerName` is this owner's label for it, named in the sender's result. */
export type RemoteDeliveryAnswer = Readonly<{ accepted: true; peerName: string }> | RemoteChannelRefusal;

export type RemoteRunLinksOptions = Readonly<{
  /** Delegating node: the root's remote links (the tree's in-memory `remoteTaskExecutions`), read at call time. */
  remoteRuns(): readonly RemoteTaskExecution[];
  /** Receiving node: the back-link of a root whose host a peer delegated to (`delegatedFrom`); `null` otherwise. */
  backLink?: Readonly<{ hostRunId: string; delegatedFrom: DelegatedFrom }> | null;
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
    const delegated = this.options.remoteRuns().flatMap((link) => link.kind === "agent" ? [delegatedRunEndpoint(link)] : []);
    const back = this.options.backLink;
    return back ? [...delegated, delegatorEndpoint(back.hostRunId, back.delegatedFrom)] : delegated;
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

  /** Transmits a prepared message to the endpoint's node (the channel only; no state changes here). */
  async deliver(endpoint: RemoteEndpoint, message: CollaborationCommunicationMessage): Promise<RemoteDeliveryAnswer> {
    const channel = this.channel();
    if (!channel) return { accepted: false, code: REMOTE_REFUSAL.OFF, message: REMOTE_ROOT_REFUSAL_TEXT.off };
    const receipt = await channel.deliverMessage(endpoint.transmission(message));
    return receipt.accepted ? { accepted: true, peerName: await channel.peerName(endpoint.reference.nodeId) } : receipt;
  }

  /** The node name a local agent sees for a remote endpoint (this owner's label for the peer). */
  async peerName(nodeId: string): Promise<string> {
    return (await this.channel()?.peerName(nodeId)) ?? nodeId;
  }

  private channel(): RemoteRunChannel | null {
    return resolveRemoteRunChannel(this.options.channel);
  }
}

import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { RootCommunicationEngine } from "../communication/root-communication-engine.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";
import { unlinkedRunEndpoint, type LinkedRemoteEndpoint, type RemoteEndpoint } from "./remote-endpoint.js";
import { remoteDeliveredText } from "./remote-refusal-codes.js";
import type { RemoteRunLinks } from "./remote-run-links.js";

/** The engine steps of an outbound remote message (the engine owns message state; it never sends). */
export type RemoteSendEngine = Pick<RootCommunicationEngine, "prepareRemoteSend" | "commitSentToRemote">;

type RemoteMessageContent = Readonly<{
  sender: CollaborationMemberExecutionIdentity;
  content: string;
  messageType?: string | null;
  referenceFiles?: readonly string[] | null;
}>;

/** `send_message_to(run ID)` to one of the root's linked run IDs (no `node`). */
export type RemoteMessageSendInput = RemoteMessageContent & Readonly<{ endpoint: LinkedRemoteEndpoint }>;
/** `send_message_to(node, run ID)` (autobyteus-492 DS-004): a peer's agent by its node ID and run ID. */
export type PeerRunSendInput = RemoteMessageContent & Readonly<{ nodeId: string; targetAgentRunId: string }>;

/**
 * The outbound remote send of one root (DS-002 on the delegating node, DS-003 on the receiving node; AR-005,
 * AR-008), built once and shared by every root kind. It is the one governing owner of the order:
 * the endpoint choice → `engine.prepareRemoteSend` (no state change) → `RemoteRunLinks.deliver` (the channel
 * only) → `engine.commitSentToRemote` (the sender's log), so nothing is written unless the peer accepted. A
 * root's message delivery only decides that the target is remote and holds the sender's lease.
 * The endpoint choice (autobyteus-492, CM-13): the root's link when the sender is paired with that run (it may wake it
 * there), else a one-message `unlinked_run` endpoint to the same run on the same node, which reaches it only while it
 * runs (DS-006: any agent, not only the delegator).
 */
export class RemoteMessageSend {
  constructor(private readonly options: Readonly<{
    /** The root's engine, read at send time (a root may create its engine with its package). */
    engine(): RemoteSendEngine;
    links: RemoteRunLinks;
  }>) {}

  send(input: RemoteMessageSendInput): Promise<AgentOperationResult> {
    const { nodeId, agentRunId } = input.endpoint.reference;
    return this.deliver(input, this.choose(input.sender, nodeId, agentRunId, input.endpoint));
  }

  sendToPeerRun(input: PeerRunSendInput): Promise<AgentOperationResult> {
    return this.deliver(input, this.choose(input.sender, input.nodeId, input.targetAgentRunId, this.options.links.endpointFor(input.targetAgentRunId)));
  }

  private choose(sender: CollaborationMemberExecutionIdentity, nodeId: string, agentRunId: string, linked: LinkedRemoteEndpoint | null): RemoteEndpoint {
    return linked && linked.reference.nodeId === nodeId && linked.allowsSender(sender.agentRunId)
      ? linked : unlinkedRunEndpoint({ nodeId, agentRunId, pairedAgentRunId: sender.agentRunId });
  }

  private async deliver(input: RemoteMessageContent, endpoint: RemoteEndpoint): Promise<AgentOperationResult> {
    const engine = this.options.engine();
    const prepared = engine.prepareRemoteSend({
      senderIdentity: input.sender, endpoint, content: input.content, messageType: input.messageType, referenceFiles: input.referenceFiles,
    });
    if (!prepared.ok) return prepared.refusal;
    const answer = await this.options.links.deliver(endpoint, prepared.message);
    if (!answer.accepted) return answer;
    // The result names the remote run's node (CM-11).
    const result = await engine.commitSentToRemote(prepared);
    return { ...result, message: remoteDeliveredText(endpoint.reference.agentRunId, answer.peerName) };
  }
}

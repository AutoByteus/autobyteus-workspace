import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { RootCommunicationEngine } from "../communication/root-communication-engine.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";
import { unlinkedRunEndpoint, type RemoteEndpoint } from "./remote-endpoint.js";
import { nodeMismatch, remoteDeliveredText } from "./remote-refusal-codes.js";
import type { RemoteRunLinks } from "./remote-run-links.js";
import type { OutgoingFiles } from "./outgoing-files.js";

/** The engine steps of an outbound remote message (the engine owns message state; it never sends). */
export type RemoteSendEngine = Pick<RootCommunicationEngine, "prepareRemoteSend" | "commitSentToRemote">;

/** `send_message_to(node, run ID)` (autobyteus-492 DS-004; every message to another node, autobyteus-587 RF-14). */
export type PeerRunSendInput = Readonly<{
  sender: CollaborationMemberExecutionIdentity;
  nodeId: string;
  targetAgentRunId: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: readonly string[] | null;
}>;

/**
 * The outbound remote send of one root (DS-002 on the delegating node, DS-003 on the receiving node; AR-005,
 * AR-008), built once and shared by every root kind. It is the one governing owner of the order:
 * the endpoint choice → `OutgoingFiles.send` (the reference files uploaded to that node, autobyteus-587 DS-002) →
 * `engine.prepareRemoteSend` (no state change) → `RemoteRunLinks.deliver` (the channel only) →
 * `engine.commitSentToRemote` (the sender's log), so nothing is written unless the peer accepted. A root's message
 * delivery only decides that the target is remote and holds the sender's lease.
 * The endpoint choice (autobyteus-492, CM-13): the root's link when the sender is paired with that run (it may wake it
 * there), else a one-message `unlinked_run` endpoint to the same run on the same node, which reaches it only while it
 * runs (DS-006: any agent, not only the delegator). A run this root links on another node than `node` is refused with
 * the node it runs on (RF-14), before any file is sent.
 */
export class RemoteMessageSend {
  constructor(private readonly options: Readonly<{
    /** The root's engine, read at send time (a root may create its engine with its package). */
    engine(): RemoteSendEngine;
    links: RemoteRunLinks;
    outgoing: Pick<OutgoingFiles, "send">;
  }>) {}

  async sendToPeerRun(input: PeerRunSendInput): Promise<AgentOperationResult> {
    const { links } = this.options;
    const linked = links.endpointFor(input.targetAgentRunId);
    if (linked && linked.reference.nodeId !== input.nodeId) {
      return nodeMismatch(await links.peerName(linked.reference.nodeId), await links.peerName(input.nodeId));
    }
    const endpoint: RemoteEndpoint = linked && linked.allowsSender(input.sender.agentRunId)
      ? linked : unlinkedRunEndpoint({ nodeId: input.nodeId, agentRunId: input.targetAgentRunId, pairedAgentRunId: input.sender.agentRunId });
    const sent = await this.options.outgoing.send({ senderAgentRunId: input.sender.agentRunId, nodeId: input.nodeId,
      peerName: await links.peerName(input.nodeId), referenceFiles: input.referenceFiles });
    if (!sent.ok) return sent.refusal;
    const engine = this.options.engine();
    // The sender's own line keeps its own paths (RF-9); the message carries the files as the other node holds them.
    const prepared = engine.prepareRemoteSend({
      senderIdentity: input.sender, endpoint, content: input.content, messageType: input.messageType, referenceFiles: input.referenceFiles,
    });
    if (!prepared.ok) return prepared.refusal;
    // The sender's address goes with the message; the receiving node answers its agent's (autobyteus-565).
    const answer = await links.deliver(endpoint, prepared.message, prepared.senderAddress, sent.files);
    if (!answer.accepted) return answer;
    // The result names the remote run's node (CM-11) and the files sent (RF-6); the sender's line records the receiver.
    const result = await engine.commitSentToRemote(prepared, { address: answer.receiverAddress, nodeName: answer.peerName });
    return { ...result, message: remoteDeliveredText(endpoint.reference.agentRunId, answer.peerName),
      ...(sent.files.length ? { filesSent: sent.files.length } : {}) };
  }
}

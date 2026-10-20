import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { RootCommunicationEngine } from "../communication/root-communication-engine.js";
import type { CollaborationMemberExecutionIdentity } from "../domain/root-execution-identity.js";
import type { RemoteEndpoint } from "./remote-endpoint.js";
import { remoteDeliveredText } from "./remote-refusal-codes.js";
import type { RemoteRunLinks } from "./remote-run-links.js";

/** The engine steps of an outbound remote message (the engine owns message state; it never sends). */
export type RemoteSendEngine = Pick<RootCommunicationEngine, "prepareRemoteSend" | "commitSentToRemote">;

export type RemoteMessageSendInput = Readonly<{
  sender: CollaborationMemberExecutionIdentity;
  endpoint: RemoteEndpoint;
  content: string;
  messageType?: string | null;
  referenceFiles?: readonly string[] | null;
}>;

/**
 * The outbound remote send of one root (DS-002 on the delegating node, DS-003 on the receiving node; AR-005,
 * AR-008), built once and shared by every root kind. It is the one governing owner of the order:
 * the endpoint's pair rule → `engine.prepareRemoteSend` (no state change) → `RemoteRunLinks.deliver` (the channel
 * only) → `engine.commitSentToRemote` (the sender's log), so nothing is written unless the peer accepted. A
 * root's message delivery only decides that the target is a remote endpoint and holds the sender's lease.
 */
export class RemoteMessageSend {
  constructor(private readonly options: Readonly<{
    /** The root's engine, read at send time (a root may create its engine with its package). */
    engine(): RemoteSendEngine;
    links: RemoteRunLinks;
  }>) {}

  async send(input: RemoteMessageSendInput): Promise<AgentOperationResult> {
    const { sender, endpoint } = input;
    if (!endpoint.allowsSender(sender.agentRunId)) return endpoint.refusals.notPermitted;
    const engine = this.options.engine();
    const prepared = engine.prepareRemoteSend({
      senderIdentity: sender, endpoint, content: input.content, messageType: input.messageType, referenceFiles: input.referenceFiles,
    });
    if (!prepared.ok) return prepared.refusal;
    const answer = await this.options.links.deliver(endpoint, prepared.message);
    if (!answer.accepted) return answer;
    // The result names the remote run's node (CM-11).
    const result = await engine.commitSentToRemote(prepared);
    return { ...result, message: remoteDeliveredText(endpoint.reference.agentRunId, answer.peerName) };
  }
}

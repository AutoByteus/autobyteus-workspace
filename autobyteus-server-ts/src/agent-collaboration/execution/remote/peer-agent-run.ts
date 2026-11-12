import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { PeerAgentRunLink } from "./peer-run-link.js";
import { peerObserve, peerOwnerCommand, peerReadConversation, peerStatuses, type PeerChannel, type PeerRunStatus } from "./peer-run-calls.js";
import type { RemoteAgentProjection, RemoteRunObservationStream, RemoteRunObserver } from "./remote-run-channel.js";

/** A message from this node's owner, with its window identity (`message_id`, `dedupe_key`); text only. */
export type PeerMessage = Readonly<{ content: string; messageId: string; dedupeKey: string }>;

/**
 * An Agent run on a peer node, as the user acts on it (autobyteus-461 SR-066, REQ-013): a stateless handle built from
 * the tree's `PeerRunLink` and the process channel. Its state is on its node; a handle is made when needed. It shares
 * no base with the local run: it has no tool approval, no Settings and no files here (autobyteus-278).
 */
export class PeerAgentRun {
  readonly kind = "agent" as const;

  constructor(readonly link: PeerAgentRunLink, private readonly channel: PeerChannel) {}

  get runId(): string { return this.link.agentRunId; }

  /** Ends the run on its node, keeping its history. */
  terminate(): Promise<AgentOperationResult> {
    return peerOwnerCommand(this.link, this.channel, this.runId, { kind: "terminate" });
  }

  postMessage(message: PeerMessage): Promise<AgentOperationResult> {
    return peerOwnerCommand(this.link, this.channel, this.runId, { kind: "post_message", ...message });
  }

  interrupt(): Promise<AgentOperationResult> {
    return peerOwnerCommand(this.link, this.channel, this.runId, { kind: "interrupt" });
  }

  readConversation(): Promise<RemoteAgentProjection> {
    return peerReadConversation(this.link, this.channel, this.runId);
  }

  observe(observer: RemoteRunObserver): RemoteRunObservationStream | null {
    return peerObserve(this.link, this.channel, observer);
  }

  /** What its node answers about it now (SR-067 G-1); `reachable: false` when it does not answer. */
  async status(): Promise<PeerRunStatus> {
    return (await peerStatuses([this.link], this.channel))[0]!;
  }
}

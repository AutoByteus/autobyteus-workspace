import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import { peerTeamCoordinatorRunId, type PeerTeamRunLink } from "./peer-run-link.js";
import type { PeerMessage } from "./peer-agent-run.js";
import { peerObserve, peerOwnerCommand, peerReadConversation, peerStatuses, type PeerChannel, type PeerRunStatus } from "./peer-run-calls.js";
import type { RemoteAgentProjection, RemoteRunObservationStream, RemoteRunObserver } from "./remote-run-channel.js";

/**
 * A Team run on a peer node, as the user acts on it (autobyteus-461 SR-066, REQ-013): a stateless handle built from the
 * tree's `PeerRunLink` and the process channel. A message, an interrupt and a conversation read go to one of its
 * members; a Stop ends the whole run through its coordinator, as at base (autobyteus-278).
 */
export class PeerTeamRun {
  readonly kind = "agent_team" as const;

  constructor(readonly link: PeerTeamRunLink, private readonly channel: PeerChannel) {}

  get runId(): string { return this.link.teamRunId; }

  hasMember(agentRunId: string): boolean {
    return this.link.members.some((member) => member.agentRunId === agentRunId);
  }

  /** Ends the whole run on its node through its coordinator, keeping its history. */
  terminate(): Promise<AgentOperationResult> {
    return peerOwnerCommand(this.link, this.channel, peerTeamCoordinatorRunId(this.link), { kind: "terminate" });
  }

  postMessage(agentRunId: string, message: PeerMessage): Promise<AgentOperationResult> {
    return peerOwnerCommand(this.link, this.channel, agentRunId, { kind: "post_message", ...message });
  }

  interrupt(agentRunId: string): Promise<AgentOperationResult> {
    return peerOwnerCommand(this.link, this.channel, agentRunId, { kind: "interrupt" });
  }

  readConversation(agentRunId: string): Promise<RemoteAgentProjection> {
    return peerReadConversation(this.link, this.channel, agentRunId);
  }

  observe(observer: RemoteRunObserver): RemoteRunObservationStream | null {
    return peerObserve(this.link, this.channel, observer);
  }

  /** What its node answers about it now (SR-067 G-1); `reachable: false` when it does not answer. */
  async status(): Promise<PeerRunStatus> {
    return (await peerStatuses([this.link], this.channel))[0]!;
  }
}

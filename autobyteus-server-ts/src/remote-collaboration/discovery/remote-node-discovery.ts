import type { AvailableCollaboratorEntry } from "../../agent-collaboration/collaborators/available-collaborator-entry.js";
import type { AvailableNode, RemoteDiscoveryChannel } from "../../agent-collaboration/execution/remote/remote-discovery-channel.js";
import type { RemoteChannelRefusal } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { PeerClient } from "../channel/peer-client.js";
import type { PeerNode } from "../domain/peer-node.js";
import type { PeerRefusal } from "../domain/peer-refusal.js";
import { localRefusalText, REMOTE_REFUSAL } from "../domain/remote-refusals.js";

/**
 * This node's discovery of its peers (autobyteus-261 DS-001, DS-002), the `RemoteDiscoveryChannel`. Nothing is
 * stored: every call asks the peers now (REQ-407).
 * - `listNodes`: with the switch on, every registered peer in registration order, all asked for *availability*
 *   at the same time, each within the peer request bound. `available` is an accepted answer; anything else
 *   (a refusal by the peer, the wrong node, an HTTP error such as an older build's 404, a transport failure or a
 *   timeout) is `unavailable`: `listAvailableAgents` with that node says why.
 * - `listAvailableAgents`: the peer by name (the same refusals as `delegate_task`), then its *available agents*.
 * - `listAvailableAgentsOf`, `checkAvailabilityOf`: one peer by its node ID, for the Nodes page (autobyteus-267,
 *   one-nodes-tab DS-004); an unreachable peer's refusal carries the classified `reason`.
 */
export class RemoteNodeDiscovery implements RemoteDiscoveryChannel {
  constructor(private readonly dependencies: Readonly<{
    capability: Readonly<{ isEnabled(): boolean }>;
    peers: Readonly<{ list(): Promise<readonly PeerNode[]> }>;
    client: Pick<PeerClient, "findPeer" | "checkAvailability" | "listAvailableAgents">;
  }>) {}

  async listNodes(): Promise<readonly AvailableNode[] | RemoteChannelRefusal> {
    if (!this.dependencies.capability.isEnabled()) return Object.freeze({ accepted: false, code: REMOTE_REFUSAL.OFF, message: localRefusalText.off() });
    const peers = await this.dependencies.peers.list();
    const statuses = await Promise.all(peers.map((peer) => this.dependencies.client.checkAvailability(peer.nodeId)
      .then((answer) => answer.accepted ? "available" as const : "unavailable" as const, () => "unavailable" as const)));
    return Object.freeze(peers.map((peer, index) => Object.freeze({ name: peer.name, status: statuses[index]! })));
  }

  async listAvailableAgents(node: string): Promise<readonly AvailableCollaboratorEntry[] | RemoteChannelRefusal> {
    const peer = await this.dependencies.client.findPeer(node);
    if ("accepted" in peer) return peer;
    return this.listAvailableAgentsOf(peer.nodeId);
  }

  /**
   * A peer's offer by its node ID (autobyteus-267): the one path for the agent tools (after the name lookup above)
   * and for the Nodes page. The client applies the switch, the registration, the 20 s bound and the refusal codes.
   */
  async listAvailableAgentsOf(nodeId: string): Promise<readonly AvailableCollaboratorEntry[] | PeerRefusal> {
    const answer = await this.dependencies.client.listAvailableAgents(nodeId);
    return answer.accepted ? answer.agents : answer;
  }

  /**
   * Whether a peer admits this node's requests now (one-nodes-tab DS-004: asked on the other node for the direction
   * "it → this node"). The same question `listNodes` asks, for one peer, with the refusal that says why not.
   */
  checkAvailabilityOf(nodeId: string): Promise<Readonly<{ accepted: true }> | PeerRefusal> {
    return this.dependencies.client.checkAvailability(nodeId);
  }
}

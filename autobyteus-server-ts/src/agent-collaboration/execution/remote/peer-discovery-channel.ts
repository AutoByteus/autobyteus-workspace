import type { AvailableCollaboratorEntry } from "../../collaborators/available-collaborator-entry.js";
import type { RemoteChannelRefusal } from "./remote-run-channel.js";
import type { RunningAgentEntry } from "../../running/running-agent-entry.js";

/** A registered peer as an agent reads it (autobyteus-261 DEC-402): its name (the `node` value) and its status now. */
export type PeerNodeStatus = Readonly<{ name: string; status: "available" | "unavailable" }>;

/**
 * What collaboration code may ask about peer nodes (autobyteus-261): read-only, node-level queries with no run,
 * link or Task. Owned here, implemented by `remote-collaboration`'s `PeerNodeDiscovery`; each host passes its own
 * (autobyteus-500 FU-011): the studio's, or `REMOTE_COLLABORATION_OFF_DISCOVERY`. Every call returns a refusal instead of throwing.
 */
export interface PeerDiscoveryChannel {
  /** Registered peers in registration order, each checked now; the refusal when this node's switch is off. */
  listPeerNodes(): Promise<readonly PeerNodeStatus[] | RemoteChannelRefusal>;
  /** What the peer named `node` offers for delegation; a refusal with the same texts as `delegate_task`. */
  listAvailableAgents(node: string): Promise<readonly AvailableCollaboratorEntry[] | RemoteChannelRefusal>;
  /**
   * autobyteus-492 DS-002: the running runs a person started on the peer named `node`, asked now, each entry with `node`;
   * the same refusals as `listAvailableAgents`.
   */
  listRunningAgents(node: string): Promise<readonly RunningAgentEntry[] | RemoteChannelRefusal>;
}

/**
 * A host's discovery, as its composition passes it to the discovery tools: the studio composes remote collaboration
 * after the tools' owners, so they read it on use (a call happens only once the server serves).
 */
export type PeerDiscoveryAccess = () => PeerDiscoveryChannel;

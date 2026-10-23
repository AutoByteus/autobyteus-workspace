import type { AvailableCollaboratorEntry } from "../../collaborators/available-collaborator-entry.js";
import type { RemoteChannelRefusal } from "./remote-run-channel.js";

/** A registered peer as an agent reads it (autobyteus-261 DEC-402): its name (the `node` value) and its status now. */
export type AvailableNode = Readonly<{ name: string; status: "available" | "unavailable" }>;

/**
 * What collaboration code may ask about peer nodes (autobyteus-261): read-only, node-level queries with no run,
 * link or Task. Owned here, implemented by `remote-collaboration`'s `RemoteNodeDiscovery`, bound at composition,
 * as `RemoteRunChannel` is. Every call returns a refusal instead of throwing.
 */
export interface RemoteDiscoveryChannel {
  /** Registered peers in registration order, each checked now; the refusal when this node's switch is off. */
  listNodes(): Promise<readonly AvailableNode[] | RemoteChannelRefusal>;
  /** What the peer named `node` offers for delegation; a refusal with the same texts as `delegate_task`. */
  listAvailableAgents(node: string): Promise<readonly AvailableCollaboratorEntry[] | RemoteChannelRefusal>;
}

let processChannel: RemoteDiscoveryChannel | null = null;

/** Binds the process's discovery once at composition (remote collaboration is composed in the studio server). */
export const bindProcessRemoteDiscoveryChannel = (channel: RemoteDiscoveryChannel): void => {
  if (!channel) throw new Error("A process RemoteDiscoveryChannel is required.");
  if (processChannel) throw new Error("The process RemoteDiscoveryChannel is already initialized.");
  processChannel = channel;
};

export const releaseProcessRemoteDiscoveryChannel = (channel: RemoteDiscoveryChannel): void => {
  if (processChannel === channel) processChannel = null;
};

/** The process's discovery; `null` where remote collaboration is not composed (nothing is ever sent then). */
export const findProcessRemoteDiscoveryChannel = (): RemoteDiscoveryChannel | null => processChannel;

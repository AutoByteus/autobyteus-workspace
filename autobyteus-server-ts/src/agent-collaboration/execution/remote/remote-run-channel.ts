import type { TaskAgentCoordinatingRun } from "../../../run-history/store/agent-run-metadata-types.js";

/** A registered peer as roots see it: its pinned server ID and this owner's label for it. */
export type RemotePeer = Readonly<{ nodeId: string; name: string }>;

/** A refusal by this node's channel or by the peer; `message` is the text the agent reads. */
export type RemoteChannelRefusal = Readonly<{ accepted: false; code: string; message: string }>;

export type RemoteStartedRun = Readonly<{ accepted: true; agentRunId: string }> | RemoteChannelRefusal;
export type RemoteDeliveryReceipt = Readonly<{ accepted: true }> | RemoteChannelRefusal;

export type RemoteMessageTransmission = Readonly<{
  nodeId: string;
  kind: "work_packet" | "message";
  messageId?: string;
  senderAgentRunId: string;
  targetAgentRunId: string;
  /** Set when the remote run sends to its delegator's node: the run there that holds the link. */
  coordinatingRun?: TaskAgentCoordinatingRun;
  content: string;
  messageType: string;
  createdAt: string;
}>;

/**
 * The outbound channel to peer nodes, as collaboration roots use it (owned here, implemented by
 * `remote-collaboration`'s `PeerClient`). Roots reach it only through `RemoteRunLinks` and `RemoteDelegation`; it never
 * exposes HTTP.
 * Every call applies this node's switch and peer registration and returns a refusal instead of throwing.
 */
export interface RemoteRunChannel {
  /** The registered peer with this name (DEC-111: the `node` of `delegate_task`), or a refusal. */
  findPeer(name: string): Promise<RemotePeer | RemoteChannelRefusal>;
  /** This owner's label for a peer, for headers and texts; the node ID itself when it is no longer registered. */
  peerName(nodeId: string): Promise<string>;
  startDelegatedRun(input: Readonly<{
    nodeId: string;
    publishedAddress: string;
    delegatorAgentRunId: string;
    coordinatingRun: TaskAgentCoordinatingRun;
  }>): Promise<RemoteStartedRun>;
  deliverMessage(input: RemoteMessageTransmission): Promise<RemoteDeliveryReceipt>;
}

let processChannel: RemoteRunChannel | null = null;

/** Binds the process's channel once at composition (remote collaboration is composed in the studio server). */
export const bindProcessRemoteRunChannel = (channel: RemoteRunChannel): void => {
  if (!channel) throw new Error("A process RemoteRunChannel is required.");
  if (processChannel) throw new Error("The process RemoteRunChannel is already initialized.");
  processChannel = channel;
};

export const releaseProcessRemoteRunChannel = (channel: RemoteRunChannel): void => {
  if (processChannel === channel) processChannel = null;
};

/** The process's channel; `null` where remote collaboration is not composed (nothing is ever sent then). */
export const findProcessRemoteRunChannel = (): RemoteRunChannel | null => processChannel;

/** A root's channel: the one it was given (tests, isolated roots), else the process's channel. */
export const resolveRemoteRunChannel = (given?: () => RemoteRunChannel | null): RemoteRunChannel | null =>
  given ? given() : findProcessRemoteRunChannel();

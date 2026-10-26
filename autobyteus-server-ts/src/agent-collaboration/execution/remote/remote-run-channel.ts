import type { AgentPresentationMessage, RemoteAgentStatus } from "@autobyteus/agent-presentation-contracts";
import type { TaskAgentCoordinatingRun } from "../../../run-history/store/agent-run-metadata-types.js";

/** A registered peer as roots see it: its pinned server ID and this owner's label for it. */
export type PeerNodeRef = Readonly<{ nodeId: string; name: string }>;

/** A refusal by this node's channel or by the peer; `message` is the text the agent reads. */
export type RemoteChannelRefusal = Readonly<{ accepted: false; code: string; message: string }>;

/** The root that receives a message on the other node: a standalone, Team or Org run, by its run ID. */
export type RemoteTargetRoot = TaskAgentCoordinatingRun;

/** A member of a Team run the peer started: its address and the run ID the peer allocated. */
export type RemoteStartedTeamMember = Readonly<{ address: string; agentRunId: string }>;

/** What the peer started: an Agent run, or a Team run with its coordinator and every member. */
export type RemoteStartedRun =
  | Readonly<{ accepted: true; kind: "agent"; agentRunId: string }>
  | Readonly<{ accepted: true; kind: "agent_team"; teamRunId: string; coordinatorAddress: string; members: readonly RemoteStartedTeamMember[] }>
  | RemoteChannelRefusal;
export type RemoteDeliveryReceipt = Readonly<{ accepted: true }> | RemoteChannelRefusal;

export type RemoteMessageTransmission = Readonly<{
  nodeId: string;
  kind: "work_packet" | "message";
  messageId?: string;
  senderAgentRunId: string;
  /** The root that receives it on that node (autobyteus-247 G-2): the remote run's, or the coordinating run. */
  targetRoot: RemoteTargetRoot;
  targetAgentRunId: string;
  content: string;
  messageType: string;
  createdAt: string;
}>;

/** A run this node's delegation started on a peer (autobyteus-278): an Agent run, or a Team run. */
export type RemoteStartedRunRef = Readonly<{ kind: "agent" | "agent_team"; runId: string }>;

/** What the peer answered about one such run: its stored title and the live statuses of its own agents. */
export type RemoteRunSummary = RemoteStartedRunRef & Readonly<{
  title: string | null;
  /** Only the run's live agents (an Agent's host, a Team's members); an agent without one is offline. */
  statuses: readonly Readonly<{ agentRunId: string; status: RemoteAgentStatus }>[];
}>;
export type RemoteRunSummaries = Readonly<{ accepted: true; runs: readonly RemoteRunSummary[] }> | RemoteChannelRefusal;

/** One agent's stored conversation on the peer, as that node's own window reads it (the run-view projection). */
export type RemoteAgentProjection = Readonly<{
  agentRunId: string;
  conversation: readonly unknown[];
  activities: readonly unknown[];
  summary: string | null;
  lastActivityAt: string | null;
  hasEarlierActiveTraceEvents: boolean;
}>;
export type RemoteAgentProjectionAnswer = Readonly<{ accepted: true; projection: RemoteAgentProjection }> | RemoteChannelRefusal;

/** A command from this node's owner for an agent of a run its delegation started (DEC-803, DEC-804). */
export type RemoteOwnerCommand =
  | Readonly<{ kind: "post_message"; content: string; messageId: string; dedupeKey: string }>
  | Readonly<{ kind: "interrupt" }>
  /** Ends the whole remote run (the Agent run, or the Team run), keeping its history. */
  | Readonly<{ kind: "terminate" }>;

/** Receives an observed run's live output: one presentation message of one of its own agents at a time. */
export type RemoteRunObserver = Readonly<{
  onFrame(agentRunId: string, message: AgentPresentationMessage): void;
  /** The stream ended without `close()` (the peer closed it, the connection failed, or it was refused). Called once. */
  onEnd(): void;
}>;
export type RemoteRunObservationStream = Readonly<{ close(): void }>;

/**
 * The outbound channel to peer nodes, as collaboration roots use it (owned here, implemented by
 * `remote-collaboration`'s `PeerClient`). Roots reach it only through `RemoteRunLinks` and `RemoteDelegation`; it never
 * exposes HTTP.
 * Every call applies this node's switch and peer registration and returns a refusal instead of throwing.
 */
export interface RemoteRunChannel {
  /** The registered peer with this name (DEC-111: the `node` of `delegate_task`), or a refusal. */
  findPeer(name: string): Promise<PeerNodeRef | RemoteChannelRefusal>;
  /** This owner's label for a peer, for headers and texts; the node ID itself when it is no longer registered. */
  peerName(nodeId: string): Promise<string>;
  startDelegatedRun(input: Readonly<{
    nodeId: string;
    /** The target's catalog address on that node. */
    address: string;
    delegatorAgentRunId: string;
    coordinatingRun: TaskAgentCoordinatingRun;
  }>): Promise<RemoteStartedRun>;
  deliverMessage(input: RemoteMessageTransmission): Promise<RemoteDeliveryReceipt>;
  /** autobyteus-278: the titles and statuses of these runs on that node (one request per node). */
  runSummaries(nodeId: string, runs: readonly RemoteStartedRunRef[]): Promise<RemoteRunSummaries>;
  /** autobyteus-278: one agent's stored conversation in a run this node's delegation started. */
  agentProjection(nodeId: string, targetRoot: RemoteTargetRoot, agentRunId: string): Promise<RemoteAgentProjectionAnswer>;
  /** autobyteus-278: a command of this node's owner for one agent of such a run. */
  ownerCommand(nodeId: string, targetRoot: RemoteTargetRoot, agentRunId: string, command: RemoteOwnerCommand): Promise<RemoteDeliveryReceipt>;
  /** autobyteus-278: the run's live output while the stream is open; it never reconnects (DEC-807). */
  observeRun(nodeId: string, targetRoot: RemoteTargetRoot, observer: RemoteRunObserver): RemoteRunObservationStream;
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

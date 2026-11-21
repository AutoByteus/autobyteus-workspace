import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { RunAgentStatusEntry } from "./run-agent-access.js";
import type { DelegatingRunRef } from "../../../run-history/store/agent-run-metadata-types.js";
import type { RemoteAgentLaunch } from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { DelegationWork } from "../../../model-routing/domain/model-routing-types.js";

/** A registered peer as roots see it: its pinned server ID and this owner's label for it. */
export type PeerNodeRef = Readonly<{ nodeId: string; name: string }>;

/** A refusal by this node's channel or by the peer; `message` is the text the agent reads. */
export type RemoteChannelRefusal = Readonly<{ accepted: false; code: string; message: string }>;

/** The root that receives a message on the other node: a standalone, Team or Org run, by its run ID. */
export type RemoteTargetRoot = DelegatingRunRef;

/** A member of a Team run the peer started: its address and the run ID the peer allocated. */
export type RemoteStartedTeamMember = Readonly<{ address: string; agentRunId: string }>;

export type { RemoteAgentLaunch };

/** What the peer started: an Agent run, or a Team run with its coordinator and every member; each agent's launch. */
export type RemoteStartedRun =
  | Readonly<{ accepted: true; kind: "agent"; agentRunId: string; launches: readonly RemoteAgentLaunch[] }>
  | Readonly<{
      accepted: true; kind: "agent_team"; teamRunId: string; coordinatorAddress: string; members: readonly RemoteStartedTeamMember[];
      launches: readonly RemoteAgentLaunch[];
    }>
  | RemoteChannelRefusal;
export type RemoteDeliveryReceipt = Readonly<{ accepted: true }> | RemoteChannelRefusal;
/**
 * A message the peer accepted (autobyteus-565): `receiverAddress` is the receiving agent's address in its own run, as that
 * node answers it (null for a work packet, or when it has none).
 */
export type RemoteMessageReceipt = Readonly<{ accepted: true; receiverAddress: string | null }> | RemoteChannelRefusal;

export type RemoteMessageTransmission = Readonly<{
  nodeId: string;
  kind: "work_packet" | "message";
  messageId?: string;
  senderAgentRunId: string;
  /** The sending agent's address in its own run (autobyteus-565), so the receiving node records and shows who sent it. */
  senderAddress: string | null;
  /** The root that receives it on that node (autobyteus-247 G-2): the remote run's, or the coordinating run. */
  targetRoot: RemoteTargetRoot;
  targetAgentRunId: string;
  content: string;
  messageType: string;
  createdAt: string;
}> | Readonly<{
  nodeId: string;
  /**
   * autobyteus-492: a message to a running agent of that node by its run ID only, with no link (`unlinked_run`); it
   * names no root: that node finds the agent's live root itself and never wakes it.
   */
  kind: "run_message";
  messageId: string;
  senderAgentRunId: string;
  senderAddress: string | null;
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
  /** Only the run's live agents (an Agent run's own agent, a Team's members); an agent without one is offline. */
  statuses: readonly RunAgentStatusEntry[];
  /** Each agent's launch, from the run's own file on its node (SR-038). */
  launches: readonly RemoteAgentLaunch[];
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
 * One agent's own stream snapshot on its node (autobyteus-461 SR-088): its stored part, its unconfirmed turns' frames,
 * its base and sequence (null: a stopped agent), in the `/ws/agent` shape, with the agent's current status message.
 */
export type RemoteAgentStreamSnapshotAnswer =
  | Readonly<{ accepted: true; snapshot: Readonly<Record<string, unknown>>; status: Readonly<Record<string, unknown>> }>
  | RemoteChannelRefusal;
/** Receives one agent's own numbered frames, each with the sequence it is numbered in (a new one after a restore). */
export type RemoteAgentStreamObserver = Readonly<{
  onFrame(liveSequenceId: string, frame: Readonly<Record<string, unknown>>): void;
  /** The stream ended without `close()`. Called once. */
  onEnd(): void;
}>;

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
    delegatingRun: DelegatingRunRef;
    /** The work and its Task: the peer's Model Router is told it (DS-002). */
    work: DelegationWork;
  }>): Promise<RemoteStartedRun>;
  deliverMessage(input: RemoteMessageTransmission): Promise<RemoteMessageReceipt>;
  /** autobyteus-278: the titles and statuses of these runs on that node (one request per node). */
  runSummaries(nodeId: string, runs: readonly RemoteStartedRunRef[]): Promise<RemoteRunSummaries>;
  /** autobyteus-278: one agent's stored conversation in a run this node's delegation started. */
  agentProjection(nodeId: string, targetRoot: RemoteTargetRoot, agentRunId: string): Promise<RemoteAgentProjectionAnswer>;
  /**
   * autobyteus-591 DN-2: tells the run's node its Task state on this node (closed: every Task entry naming it closed;
   * open: one opened again). Accepted once applied there: a closed run is stopped before the answer.
   */
  deliveredRunState(nodeId: string, run: RemoteStartedRunRef, open: boolean): Promise<RemoteDeliveryReceipt>;
  /** autobyteus-278: a command of this node's owner for one agent of such a run. */
  ownerCommand(nodeId: string, targetRoot: RemoteTargetRoot, agentRunId: string, command: RemoteOwnerCommand): Promise<RemoteDeliveryReceipt>;
  /** autobyteus-278: the run's live output while the stream is open; it never reconnects (DEC-807). */
  observeRun(nodeId: string, targetRoot: RemoteTargetRoot, observer: RemoteRunObserver): RemoteRunObservationStream;
  /** autobyteus-461 SR-088: one agent's own stream snapshot, by its node's rule (3b). */
  agentStreamSnapshot(nodeId: string, targetRoot: RemoteTargetRoot, agentRunId: string): Promise<RemoteAgentStreamSnapshotAnswer>;
  /** autobyteus-461 SR-088: one agent's own numbered frames, following it across restores, while the stream is open. */
  observeAgentStream(nodeId: string, targetRoot: RemoteTargetRoot, agentRunId: string, observer: RemoteAgentStreamObserver): RemoteRunObservationStream;
}

/**
 * A host's channel to its peer nodes, as its composition passes it (autobyteus-500 FU-011): the studio's peer client
 * once remote collaboration is composed; `null` in a host that composes none (nothing is ever sent then).
 */
export type RemoteRunChannelAccess = () => RemoteRunChannel | null;

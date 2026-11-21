import type { AvailableCollaboratorEntry } from "../../agent-collaboration/collaborators/available-collaborator-entry.js";
import type {
  RemoteAgentLaunch,
  RemoteAgentProjection,
  RemoteOwnerCommand,
  RemoteRunSummary,
  RemoteStartedRunRef,
} from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { DelegatingRunRef } from "../../run-history/store/agent-run-metadata-types.js";
import type { RunningAgentEntry } from "../../agent-collaboration/running/running-agent-entry.js";
import type { TransferredFile } from "../../agent-collaboration/execution/remote/transferred-files.js";

/**
 * The inter-node contract (design § Contract Between Nodes; CM-12). Every request carries the envelope; every
 * answer names the responder. A domain refusal is HTTP 200 with `accepted: false`; a malformed body is 400.
 * There is no version field and no request ID: both nodes run the same release (DESIGN.md rule 9), nothing
 * retries, and a message's `messageId` is its identity. No credential is ever part of a request (REQ-113).
 */
export const REMOTE_DELEGATED_RUNS_PATH = "/rest/remote/delegated-runs";
export const REMOTE_MESSAGES_PATH = "/rest/remote/messages";
/** autobyteus-261: does the called node take this node's requests now (the envelope only)? */
export const REMOTE_AVAILABILITY_PATH = "/rest/remote/availability";
/** autobyteus-261: what the called node offers for delegation (the envelope only). */
export const REMOTE_AVAILABLE_AGENTS_PATH = "/rest/remote/available-agents";
/**
 * autobyteus-492: a message to a running agent of the called node by its run ID only (no link; `run_message`). Unlike
 * `messages` (a linked run, its root named, which may wake it), it names no root and reaches only an agent that runs now.
 */
export const REMOTE_RUN_MESSAGES_PATH = "/rest/remote/run-messages";
/** autobyteus-492: the running runs a person started on the called node (the envelope only). */
export const REMOTE_RUNNING_AGENTS_PATH = "/rest/remote/running-agents";

/** autobyteus-278: the titles and statuses of runs the caller's delegation started (one request per node). */
export const REMOTE_RUN_SUMMARIES_PATH = "/rest/remote/run-summaries";
/** autobyteus-278: one agent's stored conversation in such a run. */
export const REMOTE_AGENT_PROJECTION_PATH = "/rest/remote/agent-projection";
/** autobyteus-278: a command of the caller's owner for one agent of such a run. */
export const REMOTE_OWNER_COMMANDS_PATH = "/rest/remote/owner-commands";
/**
 * autobyteus-278: a WebSocket. The caller's first frame is the envelope with `targetRoot`; the answer is a first
 * frame `{nodeId}` (or a refusal, then close), then `{agentRunId, message}` frames for the run's own agents only.
 */
export const REMOTE_RUN_OBSERVATIONS_PATH = "/rest/remote/run-observations";
/**
 * autobyteus-591 DN-2: the delegating node's Task state of a run its delegation started here: `open: false` once every
 * Task entry naming it closed there (this node records it, then stops the run), `open: true` once one opened again.
 */
export const REMOTE_DELEGATED_RUN_STATES_PATH = "/rest/remote/delegated-run-states";
/** autobyteus-461 SR-088: one agent's own stream snapshot. */
export const REMOTE_AGENT_STREAM_SNAPSHOT_PATH = "/rest/remote/agent-stream-snapshot";
/**
 * autobyteus-587 (RFC-001 § 6): what the called node holds of these files, and its per-file limit; then the pieces, raw
 * bytes at `received-files/<sha256>?fromNodeId=&toNodeId=&offset=&size=` (the envelope in the signed query: the body is
 * the piece).
 */
export const REMOTE_RECEIVED_FILES_STATUS_PATH = "/rest/remote/received-files/status";
export const REMOTE_RECEIVED_FILES_PATH = "/rest/remote/received-files";
/** autobyteus-437: the pairing exchange (exempt from credentials: the accepting node has no peer secret yet). */
export const REMOTE_PEER_PAIRING_EXCHANGES_PATH = "/rest/remote/peer-pairing-exchanges";

/** `toNodeId` is the pinned server ID of the peer being called; `fromNodeId` the caller's own. */
export type RemoteEnvelope = Readonly<{ fromNodeId: string; toNodeId: string }>;

/**
 * Start (prepare, without work) a run of the Agent at the catalog `address` on the called node, for a delegating
 * run on the caller.
 */
export type StartDelegatedRunRequest = RemoteEnvelope & Readonly<{
  address: string;
  delegator: Readonly<{ agentRunId: string }>;
  delegatingRun: DelegatingRunRef;
  /**
   * The work and its Task (autobyteus-32 DS-002): the called node's Model Router is told the text; its decision records
   * name the Task. `taskId` is null when the caller creates the Task only after the start.
   */
  task: Readonly<{ text: string; title: string; taskKey: string | null; projectId: string | null; taskId: string | null }>;
}>;

/**
 * One message between a delegating run and its remote run (or Team), or the work packet that starts it.
 * `messageId` is present for `kind: "message"` (a work packet is not a message-log entry). `targetRoot` names the
 * root on the called node that receives it, in both directions (autobyteus-247 G-2): the remote run's root
 * (`agent` or `agent_team`), or the coordinating run of the delegating node.
 */
export type DeliverRemoteMessageRequest = RemoteEnvelope & Readonly<{
  kind: "work_packet" | "message";
  messageId?: string;
  /** `address`: the sending agent's address in its own run (autobyteus-565); null when it has none. */
  sender: Readonly<{ agentRunId: string; address: string | null }>;
  targetRoot: DelegatingRunRef;
  target: Readonly<{ agentRunId: string }>;
  content: string;
  messageType: string;
  createdAt: string;
  /** autobyteus-587: the reference files, each already complete on the called node (uploaded first). */
  files: readonly TransferredFile[];
}>;

/** autobyteus-492: one message from an agent of the caller to a running agent of the called node, by run IDs only. */
export type DeliverRunMessageRequest = RemoteEnvelope & Readonly<{
  messageId: string;
  /** `address`: the sending agent's address in its own run (autobyteus-565); null when it has none. */
  sender: Readonly<{ agentRunId: string; address: string | null }>;
  target: Readonly<{ agentRunId: string }>;
  content: string;
  messageType: string;
  createdAt: string;
  files: readonly TransferredFile[];
}>;

/** autobyteus-587: what the called node holds of each of these files (by SHA-256 and size). */
export type ReceivedFilesStatusRequest = RemoteEnvelope & Readonly<{ files: readonly Readonly<{ sha256: string; size: number }>[] }>;
export type ReceivedFilesStatusAnswer = Readonly<{
  accepted: true; nodeId: string; maxFileBytes: number;
  files: readonly Readonly<{ sha256: string; receivedBytes: number; complete: boolean }>[];
}> | RemoteRefusalAnswer;
/** One piece of one file (the bytes are the request body). */
export type ReceivedFilePieceRequest = RemoteEnvelope & Readonly<{ sha256: string; offset: number; size: number; bytes: Buffer }>;
export type ReceivedFilePieceAnswer = Readonly<{ accepted: true; nodeId: string; receivedBytes: number; complete: boolean }> | RemoteRefusalAnswer;

/** The target definition a refusal is about, on the responder: its kind and its name (autobyteus-261 DEC-407). */
export type RemoteRefusalTarget = Readonly<{ kind: "agent" | "agent_team"; name: string }>;

/**
 * A refusal: `message` is the responder's detail (the reason); `target` is the target definition, present for
 * `NO_DEFAULT_RUNTIME` and `AGENT_CANNOT_RUN`.
 */
export type RemoteRefusalAnswer = Readonly<{
  accepted: false; nodeId: string; code: string; message: string; target?: RemoteRefusalTarget;
  /**
   * `NO_DEFAULT_RUNTIME` / `AGENT_CANNOT_RUN` for a target no default covers: why the called node's Model Router did not
   * choose either (autobyteus-32 supplement § 6); the caller words it with its own name for the node.
   */
  modelRouting?: RemoteModelRoutingState;
  /** `MODEL_ROUTER_FAILED`: the agent the router could not choose for. */
  agentName?: string;
}>;

/** The called node's Model Routing for a refused target: off, or on but not active (with why). */
export type RemoteModelRoutingState = Readonly<{ state: "off" }> | Readonly<{ state: "not_active"; reason: string }>;
/**
 * What the called node started (autobyteus-247 G-7): an Agent run, or a Team run with its coordinator's address and
 * every member (address and run ID, as the Team tree has them).
 */
export type StartDelegatedRunAnswer =
  | Readonly<{ accepted: true; nodeId: string; kind: "agent"; agentRunId: string; launches: readonly RemoteAgentLaunch[] }>
  | Readonly<{ accepted: true; nodeId: string; kind: "agent_team"; teamRunId: string; coordinatorAddress: string;
      members: readonly Readonly<{ address: string; agentRunId: string }>[]; launches: readonly RemoteAgentLaunch[] }>
  | RemoteRefusalAnswer;
/** `receiverAddress`: the receiving agent's address in its own run (autobyteus-565); null for a work packet, or none. */
export type DeliverRemoteMessageAnswer = Readonly<{ accepted: true; nodeId: string; receiverAddress: string | null }> | RemoteRefusalAnswer;
/** The called node admitted this node's request: it is available to this node now. */
export type AvailabilityAnswer = Readonly<{ accepted: true; nodeId: string }> | RemoteRefusalAnswer;
/**
 * What the called node offers for delegation: exactly what a delegation there accepts, each entry with only its
 * name, kind, address and description (when it has one; REQ-403, REQ-405).
 */
export type AvailableAgentsAnswer = Readonly<{ accepted: true; nodeId: string; agents: readonly AvailableCollaboratorEntry[] }> | RemoteRefusalAnswer;
/** autobyteus-492: the called node's running runs a person started, each entry without `node` (REQ-002, REQ-007). */
export type RunningAgentsAnswer = Readonly<{ accepted: true; nodeId: string; agents: readonly RunningAgentEntry[] }> | RemoteRefusalAnswer;

/** autobyteus-278: runs the caller's delegation started; the answer omits every other run. */
export type RunSummariesRequest = RemoteEnvelope & Readonly<{ runs: readonly RemoteStartedRunRef[] }>;
export type RunSummariesAnswer = Readonly<{ accepted: true; nodeId: string; runs: readonly RemoteRunSummary[] }> | RemoteRefusalAnswer;

/** autobyteus-278: `targetRoot` is the run the caller's delegation started; `agentRunId` one of its own agents. */
export type AgentProjectionRequest = RemoteEnvelope & Readonly<{ targetRoot: DelegatingRunRef; agentRunId: string }>;
export type AgentProjectionAnswer = Readonly<{ accepted: true; nodeId: string; projection: RemoteAgentProjection }> | RemoteRefusalAnswer;

export type OwnerCommandRequest = RemoteEnvelope & Readonly<{
  targetRoot: DelegatingRunRef;
  agentRunId: string;
  command: RemoteOwnerCommand;
}>;
export type OwnerCommandAnswer = Readonly<{ accepted: true; nodeId: string }> | RemoteRefusalAnswer;

/** autobyteus-591 DN-2: `run` is a run the caller's delegation started; answered once its state applied (closed: stopped). */
export type DelegatedRunStateRequest = RemoteEnvelope & Readonly<{ run: RemoteStartedRunRef; open: boolean }>;
export type DelegatedRunStateAnswer = Readonly<{ accepted: true; nodeId: string; open: boolean }> | RemoteRefusalAnswer;

/** The first frame of an observation stream from the caller. */
export type RunObservationOpening = RemoteEnvelope & Readonly<{ targetRoot: DelegatingRunRef }>;

import type { AvailableCollaboratorEntry } from "../../agent-collaboration/collaborators/available-collaborator-entry.js";
import type {
  RemoteAgentLaunch,
  RemoteAgentProjection,
  RemoteOwnerCommand,
  RemoteRunSummary,
  RemoteStartedRunRef,
} from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { TaskAgentCoordinatingRun } from "../../run-history/store/agent-run-metadata-types.js";

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

/** `toNodeId` is the pinned server ID of the peer being called; `fromNodeId` the caller's own. */
export type RemoteEnvelope = Readonly<{ fromNodeId: string; toNodeId: string }>;

/**
 * Start (prepare, without work) a run of the Agent at the catalog `address` on the called node, for a delegating
 * run on the caller.
 */
export type StartDelegatedRunRequest = RemoteEnvelope & Readonly<{
  address: string;
  delegator: Readonly<{ agentRunId: string }>;
  coordinatingRun: TaskAgentCoordinatingRun;
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
  sender: Readonly<{ agentRunId: string }>;
  targetRoot: TaskAgentCoordinatingRun;
  target: Readonly<{ agentRunId: string }>;
  content: string;
  messageType: string;
  createdAt: string;
}>;

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
export type DeliverRemoteMessageAnswer = Readonly<{ accepted: true; nodeId: string }> | RemoteRefusalAnswer;
/** The called node admitted this node's request: it is available to this node now. */
export type AvailabilityAnswer = Readonly<{ accepted: true; nodeId: string }> | RemoteRefusalAnswer;
/**
 * What the called node offers for delegation: exactly what a delegation there accepts, each entry with only its
 * name, kind, address and description (when it has one; REQ-403, REQ-405).
 */
export type AvailableAgentsAnswer = Readonly<{ accepted: true; nodeId: string; agents: readonly AvailableCollaboratorEntry[] }> | RemoteRefusalAnswer;

/** autobyteus-278: runs the caller's delegation started; the answer omits every other run. */
export type RunSummariesRequest = RemoteEnvelope & Readonly<{ runs: readonly RemoteStartedRunRef[] }>;
export type RunSummariesAnswer = Readonly<{ accepted: true; nodeId: string; runs: readonly RemoteRunSummary[] }> | RemoteRefusalAnswer;

/** autobyteus-278: `targetRoot` is the run the caller's delegation started; `agentRunId` one of its own agents. */
export type AgentProjectionRequest = RemoteEnvelope & Readonly<{ targetRoot: TaskAgentCoordinatingRun; agentRunId: string }>;
export type AgentProjectionAnswer = Readonly<{ accepted: true; nodeId: string; projection: RemoteAgentProjection }> | RemoteRefusalAnswer;

export type OwnerCommandRequest = RemoteEnvelope & Readonly<{
  targetRoot: TaskAgentCoordinatingRun;
  agentRunId: string;
  command: RemoteOwnerCommand;
}>;
export type OwnerCommandAnswer = Readonly<{ accepted: true; nodeId: string }> | RemoteRefusalAnswer;

/** The first frame of an observation stream from the caller. */
export type RunObservationOpening = RemoteEnvelope & Readonly<{ targetRoot: TaskAgentCoordinatingRun }>;

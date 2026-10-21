import type { TaskAgentCoordinatingRun } from "../../run-history/store/agent-run-metadata-types.js";

/**
 * The inter-node contract (design § Contract Between Nodes; CM-12). Every request carries the envelope; every
 * answer names the responder. A domain refusal is HTTP 200 with `accepted: false`; a malformed body is 400.
 * There is no version field and no request ID: both nodes run the same release (DESIGN.md rule 9), nothing
 * retries, and a message's `messageId` is its identity. No credential is ever part of a request (REQ-113).
 */
export const REMOTE_DELEGATED_RUNS_PATH = "/rest/remote/delegated-runs";
export const REMOTE_MESSAGES_PATH = "/rest/remote/messages";

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

/**
 * A refusal: `message` is the responder's detail (the reason); `targetName` is the target definition's name on the
 * responder, present for `NO_DEFAULT_RUNTIME` and `AGENT_CANNOT_RUN`.
 */
export type RemoteRefusalAnswer = Readonly<{ accepted: false; nodeId: string; code: string; message: string; targetName?: string }>;
/**
 * What the called node started (autobyteus-247 G-7): an Agent run, or a Team run with its coordinator's address and
 * every member (address and run ID, as the Team tree has them).
 */
export type StartDelegatedRunAnswer =
  | Readonly<{ accepted: true; nodeId: string; kind: "agent"; agentRunId: string }>
  | Readonly<{ accepted: true; nodeId: string; kind: "agent_team"; teamRunId: string; coordinatorAddress: string;
      members: readonly Readonly<{ address: string; agentRunId: string }>[] }>
  | RemoteRefusalAnswer;
export type DeliverRemoteMessageAnswer = Readonly<{ accepted: true; nodeId: string }> | RemoteRefusalAnswer;

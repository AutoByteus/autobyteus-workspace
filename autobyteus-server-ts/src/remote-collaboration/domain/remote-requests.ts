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
 * One message between a delegating run and its remote run, or the work packet that starts the remote run.
 * `messageId` is present for `kind: "message"` (a work packet is not a message-log entry); `coordinatingRun`
 * is present when the remote run sends to its delegator's node.
 */
export type DeliverRemoteMessageRequest = RemoteEnvelope & Readonly<{
  kind: "work_packet" | "message";
  messageId?: string;
  sender: Readonly<{ agentRunId: string }>;
  target: Readonly<{ agentRunId: string }>;
  coordinatingRun?: TaskAgentCoordinatingRun;
  content: string;
  messageType: string;
  createdAt: string;
}>;

/**
 * A refusal: `message` is the responder's detail (the reason); `targetName` is the target definition's name on the
 * responder, present for `REMOTE_TEAMS_NOT_SUPPORTED`, `NO_DEFAULT_RUNTIME` and `AGENT_CANNOT_RUN`.
 */
export type RemoteRefusalAnswer = Readonly<{ accepted: false; nodeId: string; code: string; message: string; targetName?: string }>;
export type StartDelegatedRunAnswer = Readonly<{ accepted: true; nodeId: string; agentRunId: string }> | RemoteRefusalAnswer;
export type DeliverRemoteMessageAnswer = Readonly<{ accepted: true; nodeId: string }> | RemoteRefusalAnswer;

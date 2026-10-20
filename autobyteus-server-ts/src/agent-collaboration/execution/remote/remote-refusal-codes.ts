/**
 * The one list of refusal codes of remote collaboration (REQ-109). It lives with the channel port so that
 * roots (here) and `remote-collaboration` (the port's implementation) share it without a reverse dependency;
 * the agent-facing texts of refusals decided by the channel or a peer are in `remote-collaboration`.
 */
export const REMOTE_REFUSAL = Object.freeze({
  OFF: "REMOTE_COLLABORATION_OFF",
  PEER_NOT_REGISTERED: "PEER_NOT_REGISTERED",
  PEER_UNREACHABLE: "PEER_UNREACHABLE",
  PEER_IDENTITY_MISMATCH: "PEER_IDENTITY_MISMATCH",
  AGENT_NOT_PUBLISHED: "AGENT_NOT_PUBLISHED",
  AGENT_CANNOT_RUN: "PUBLISHED_AGENT_CANNOT_RUN",
  ATTACHMENTS_NOT_SUPPORTED: "REMOTE_ATTACHMENTS_NOT_SUPPORTED",
  SAVED_TASK_NOT_SUPPORTED: "REMOTE_SAVED_TASK_NOT_SUPPORTED",
  TARGET_NOT_PERMITTED: "REMOTE_TARGET_NOT_PERMITTED",
  TARGET_NOT_FOUND: "REMOTE_TARGET_NOT_FOUND",
  BAD_REQUEST: "REMOTE_REQUEST_INVALID",
} as const);

/** Texts of refusals a root decides before anything is sent, and of its results for remote runs. */
export const REMOTE_ROOT_REFUSAL_TEXT = Object.freeze({
  off: "Remote collaboration is turned off on this node, so nothing was sent to another node.",
  attachments: "Files (reference_files) can't be sent to an agent on another node yet, so nothing was sent.",
  savedTask: "A saved Task (task_id) can't be given to an agent on another node yet, so nothing was started. Delegate with a description instead.",
  notPermitted: "That run is on another node and is not linked with you: only the agent that delegated to it, and the run itself, can message each other. The message was not sent.",
});

/** The result of a message a peer accepted (CM-11: results name the other run's node). */
export const remoteDeliveredText = (agentRunId: string, peerName: string): string =>
  `Delivered message to ${agentRunId} on node "${peerName}".`;

/** AR-007: DONE or CANCELLED fences a remote run; it is not stopped from this node (S3). */
export const remoteRunClosureText = (address: string, peerName: string): string =>
  `${address} runs on node "${peerName}". This Task sends it no more messages; it stops there when it goes idle.`;

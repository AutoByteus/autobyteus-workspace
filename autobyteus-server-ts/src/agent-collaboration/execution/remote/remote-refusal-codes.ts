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
  AGENT_NOT_FOUND: "AGENT_NOT_FOUND",
  NO_DEFAULT_RUNTIME: "NO_DEFAULT_RUNTIME",
  AGENT_CANNOT_RUN: "AGENT_CANNOT_RUN",
  /** autobyteus-32: the peer's Model Router could not choose a runtime for an agent of the target. */
  MODEL_ROUTER_FAILED: "MODEL_ROUTER_FAILED",
  SAVED_TASK_NOT_SUPPORTED: "REMOTE_SAVED_TASK_NOT_SUPPORTED",
  TARGET_NOT_PERMITTED: "REMOTE_TARGET_NOT_PERMITTED",
  TARGET_NOT_FOUND: "REMOTE_TARGET_NOT_FOUND",
  /** autobyteus-492: no running agent of that node has the run ID of a message sent by run ID only (`run_message`). */
  TARGET_NOT_RUNNING: "REMOTE_TARGET_NOT_RUNNING",
  BAD_REQUEST: "REMOTE_REQUEST_INVALID",
  /** autobyteus-290: this node's or the peer's identity is waiting for its data migration (capability `node_identity`). */
  NODE_IDENTITY_NOT_MIGRATED: "NODE_IDENTITY_NOT_MIGRATED",
  /** autobyteus-437: the two nodes do not share a peer secret (paired before peers paired, or unpaired on one side). */
  PEER_NOT_PAIRED: "PEER_NOT_PAIRED",
  /** autobyteus-587 (RFC-001 § 5): reference files sent to another node, refused before anything is delivered. */
  REFERENCE_FILE_OUTSIDE_WORKSPACE: "REFERENCE_FILE_OUTSIDE_WORKSPACE",
  REFERENCE_FILE_NOT_A_FILE: "REFERENCE_FILE_NOT_A_FILE",
  /** Two different files of one call have the same file name: on the receiving node the second would replace the first (RF-7). */
  REFERENCE_FILE_NAME_REPEATED: "REFERENCE_FILE_NAME_REPEATED",
  REFERENCE_FILE_TOO_LARGE: "REFERENCE_FILE_TOO_LARGE",
  NO_WORKSPACE: "NO_WORKSPACE",
  REFERENCE_FILE_TRANSFER_FAILED: "REFERENCE_FILE_TRANSFER_FAILED",
  /** A file did not arrive complete: its size or SHA-256 did not match, or the receiving node does not hold it. */
  REFERENCE_FILE_CHECK_FAILED: "REFERENCE_FILE_CHECK_FAILED",
  /** autobyteus-587 RF-14: every send to an agent on another node names the node. */
  NODE_REQUIRED: "NODE_REQUIRED",
  NODE_MISMATCH: "NODE_MISMATCH",
} as const);

/** Texts of refusals a root decides before anything is sent, and of its results for remote runs. */
export const REMOTE_ROOT_REFUSAL_TEXT = Object.freeze({
  off: "Remote collaboration is turned off on this node, so nothing was sent to another node.",
  savedTask: "A saved Task (task_id) can't be given to an agent on another node yet, so nothing was started. Delegate with a description instead.",
});

/**
 * autobyteus-492: a root's answer to a message by run ID only (`run_message`) for an agent of its own that does not run
 * now (never woken, DEC-003); the sending node words it with this node's name.
 */
export const remoteTargetNotRunning = (agentRunId: string): Readonly<{ accepted: false; code: string; message: string }> =>
  Object.freeze({ accepted: false as const, code: REMOTE_REFUSAL.TARGET_NOT_RUNNING, message: `No running agent has the run id '${agentRunId}'.` });

/** The result of a message a peer accepted (CM-11: results name the other run's node). */
export const remoteDeliveredText = (agentRunId: string, peerName: string): string =>
  `Delivered message to ${agentRunId} on node "${peerName}".`;

/** autobyteus-587 RF-14: a message to a run on another node without `node`. */
export const nodeRequired = (nodeName: string): Readonly<{ accepted: false; code: string; message: string }> => Object.freeze({
  accepted: false as const, code: REMOTE_REFUSAL.NODE_REQUIRED,
  message: `This agent runs on node "${nodeName}"; pass node: "${nodeName}" with its run id.` });

/** autobyteus-587 RF-14: `node` names a node the run is not on; `nodeName` is the node it runs on. */
export const nodeMismatch = (nodeName: string, givenNodeName: string): Readonly<{ accepted: false; code: string; message: string }> => Object.freeze({
  accepted: false as const, code: REMOTE_REFUSAL.NODE_MISMATCH,
  message: `This agent runs on node "${nodeName}", not "${givenNodeName}"; pass node: "${nodeName}".` });

const KiB = 1024;
const MiB = 1024 ** 2;
const GiB = 1024 ** 3;
/** A size as the agent reads it, in the largest unit it reaches (bytes, KiB, MiB or GiB), to one decimal. */
export const readableSize = (bytes: number): string => {
  const [unit, size] = bytes >= GiB ? ["GiB", GiB] : bytes >= MiB ? ["MiB", MiB] : bytes >= KiB ? ["KiB", KiB] : ["bytes", 1];
  return `${Number((bytes / (size as number)).toFixed(1))} ${unit}`;
};

/** autobyteus-587 (RFC-001 § 5): the texts of reference files refused for another node; nothing is ever delivered then. */
export const REFERENCE_FILE_REFUSAL_TEXT = Object.freeze({
  outsideWorkspace: (file: string, workspace: string) =>
    `${file} is outside your workspace, so nothing was sent. Only files in your workspace (${workspace}) can go to another node; copy the file there first.`,
  folder: (file: string) => `${file} is a folder, so nothing was sent. Send files, not folders (zip it first).`,
  notAFile: (file: string) => `${file} is not a file that can be sent (it is missing, or a socket or device), so nothing was sent.`,
  nameRepeated: (name: string) =>
    `Two files named ${name} were attached, so nothing was sent: on the other node the second would replace the first. Rename one, or send them one at a time.`,
  tooLarge: (name: string, size: number, nodeName: string, maxFileBytes: number) =>
    `${name} is ${readableSize(size)}; node "${nodeName}" accepts files up to ${readableSize(maxFileBytes)}, so nothing was sent.`,
  totalTooLarge: (total: number, maxTotalBytes: number) =>
    `The files total ${readableSize(total)}; one message or delegation carries at most ${readableSize(maxTotalBytes)} of files, so nothing was sent.`,
  noWorkspace: () => "You have no workspace folder, so no file can go to another node.",
  transferFailed: (name: string, nodeName: string, reason: string) =>
    `${name} could not be sent to node "${nodeName}" (${reason.replace(/\.$/, "")}), so nothing was delivered. Try again.`,
  damaged: (name: string, nodeName: string) => `${name} arrived damaged on node "${nodeName}", so nothing was delivered. Try again.`,
  /** The receiving node's own refusal: a file the message names is not complete there. */
  notReceived: (name: string) => `The file ${name} has not been received complete on this node, so the message was not delivered.`,
  /**
   * A saved Task given to a run on another node (autobyteus-591 DN-8) carries no files: its reference files are the Task's,
   * not files of the sender's workspace (RF-3); send them with send_message_to and node instead.
   */
  savedTaskFiles: "A saved Task with reference files can't be given to an agent on another node, so nothing was given. Give it a Task without files, and send the files with send_message_to and node.",
});

import type { OutgoingFiles } from "./outgoing-files.js";

/**
 * One file a cross-node message or delegation carries (autobyteus-587, RFC-001 § 6): its content's SHA-256 (64 lowercase
 * hex), its size in bytes and its original file name. The receiving node already holds the content when the message
 * or work packet naming it arrives (the sending node uploads every file first).
 */
export type TransferredFile = Readonly<{ sha256: string; size: number; name: string }>;

/** The numbers both nodes share (RF-4, RFC-001 § 6): a piece is at most 8 MiB; one call carries at most 4 GiB of files. */
export const TRANSFERRED_FILE_PIECE_MAX_BYTES = 8 * 1024 * 1024;
export const TRANSFERRED_FILES_MAX_TOTAL_BYTES = 4 * 1024 * 1024 * 1024;
/** A file's content as named on the wire and in the node's received files. */
export const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

/** A file of a message or work packet is not complete in the receiving node's received files. */
export type TransferredFileMissing = Readonly<{ ok: false; name: string }>;

/**
 * Where the files of one accepted message or work packet land for the agent that receives it (RF-7): their paths are
 * known first, so the agent's input can name them, and the files are placed only once every admission check passed.
 */
export type ReceivedFilesPlan = Readonly<{
  /** The received paths, in the order of the files: `<agent folder>/received_files/<sender's run ID>/<file name>`. */
  paths: readonly string[];
  /**
   * Puts every file at its path, read-only; the same sender's file of the same name is replaced at once (never seen half
   * written). A file no longer held fails (`name`).
   */
  place(): Promise<Readonly<{ ok: true }> | TransferredFileMissing>;
}>;

/**
 * The node's received files as a receiving root uses them (implemented by `remote-collaboration`'s `ReceivedFiles`, so
 * roots never depend on that module): the plan of one delivery into one agent's own folder.
 */
export type ReceivedFilesPlacement = Readonly<{
  planFor(input: Readonly<{ agentFolder: string; senderAgentRunId: string; files: readonly TransferredFile[] }>): ReceivedFilesPlan;
}>;

/**
 * A host's file transfer between nodes, as its roots use it (autobyteus-587): a root's remote send uploads its files
 * (`outgoing`), and its accept steps place the files it receives (`received`). Built by the host's composition root.
 */
export type RemoteFiles = Readonly<{ outgoing: Pick<OutgoingFiles, "send">; received: ReceivedFilesPlacement }>;

/**
 * The receiving agent's own folder, where its received files land (RF-7): the folder its run was configured with
 * (`memory/agents/<runId>`, a Team member's or an Org agent's own). Every collaboration agent has one.
 */
export const receivingAgentFolder = (run: Readonly<{ runId: string; config: Readonly<{ memoryDir: string | null }> }> | null, agentRunId: string): string => {
  const folder = run?.config.memoryDir;
  if (!folder) throw new Error(`Agent '${agentRunId}' has no own folder to receive files into.`);
  return folder;
};

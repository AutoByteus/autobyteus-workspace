import { createHash } from "node:crypto";
import fs, { type FileHandle } from "node:fs/promises";
import path from "node:path";
import type { AgentRunManager } from "../../../agent-execution/services/agent-run-manager.js";
import type { WorkspaceManager } from "../../../workspaces/workspace-manager.js";
import { REFERENCE_FILE_REFUSAL_TEXT, REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "./remote-refusal-codes.js";
import type { RemoteRunChannelAccess } from "./remote-run-channel.js";
import { TRANSFERRED_FILE_PIECE_MAX_BYTES, TRANSFERRED_FILES_MAX_TOTAL_BYTES, type TransferredFile } from "./transferred-files.js";

type Refusal = Readonly<{ accepted: false; code: string; message: string }>;
export type OutgoingFilesResult = Readonly<{ ok: true; files: readonly TransferredFile[] }> | Readonly<{ ok: false; refusal: Refusal }>;

type OpenedFile = Readonly<{ handle: FileHandle; name: string; size: number }>;
type FileCheck = Readonly<{ opened: OpenedFile }> | Readonly<{ refusal: Refusal }>;

const refused = (code: string, message: string): OutgoingFilesResult =>
  Object.freeze({ ok: false as const, refusal: Object.freeze({ accepted: false as const, code, message }) });
const check = (code: string, message: string): FileCheck => Object.freeze({ refusal: Object.freeze({ accepted: false as const, code, message }) });
const isInside = (root: string, target: string): boolean => target === root || target.startsWith(`${root}${path.sep}`);

/** `length` bytes of the opened file at `position` (a piece, or the next part of the hash). */
const readAt = async (handle: FileHandle, position: number, length: number): Promise<Buffer> => {
  const buffer = Buffer.alloc(length);
  let filled = 0;
  while (filled < length) {
    const { bytesRead } = await handle.read(buffer, filled, length - filled, position + filled);
    if (bytesRead === 0) break;
    filled += bytesRead;
  }
  return filled === length ? buffer : buffer.subarray(0, filled);
};

/** SHA-256 of the opened file's `size` bytes, read in pieces: memory use does not grow with the file. */
const hashOpened = async (file: OpenedFile): Promise<string> => {
  const hash = createHash("sha256");
  for (let position = 0; position < file.size; position += TRANSFERRED_FILE_PIECE_MAX_BYTES) {
    hash.update(await readAt(file.handle, position, Math.min(TRANSFERRED_FILE_PIECE_MAX_BYTES, file.size - position)));
  }
  return hash.digest("hex");
};

/**
 * The files of one cross-node message or delegation, sent to the receiving node before the message or work packet
 * (autobyteus-587, RFC-001 RF-3 … RF-6, RF-11; DS-001, DS-002), for both tools. In order:
 * 1. RF-3: every file is a regular file inside the sending agent's workspace once links are resolved; only a saved Task's
 *    own context files (`taskContextFiles`, as the Task service resolved them; DEC-009) may lie outside it. Each is opened
 *    once at the path given; the opened file must be the file the resolved path names (same device and inode) before the
 *    containment check, and its hash and every piece are read from that one opening (CR-587-04);
 * 2. RF-4: the total is at most 4 GiB; the receiving node's status names its per-file limit, which every file is checked
 *    against before anything is uploaded;
 * 3. RF-11: a file the receiving node holds complete is not uploaded again; one it holds in part resumes there;
 * 4. every other file is uploaded in pieces of at most 8 MiB. The node answers the bytes it holds after each piece, and
 *    the upload goes on from there (another sender of the same content may be uploading it too).
 * Any refusal comes before the message or work packet is sent, so nothing is delivered (RF-5). The result names each
 * file by its content, size and name, as the message or work packet does.
 */
export class OutgoingFiles {
  constructor(private readonly dependencies: Readonly<{
    /** The sending agent's live run: its configuration names its workspace. */
    runs: Pick<AgentRunManager, "getActiveRun">;
    workspaces: Pick<WorkspaceManager, "getWorkspaceRootPathForHistory">;
    channel: RemoteRunChannelAccess;
  }>) {}

  async send(input: Readonly<{
    senderAgentRunId: string;
    nodeId: string;
    /** This node's name for the receiving node, in the refusals the agent reads. */
    peerName: string;
    referenceFiles: readonly string[] | null | undefined;
    /**
     * DEC-009 (RF-3's one exception): a saved Task's own context files, exactly as the Task service resolved them
     * (`validateTaskReferenceFiles`); only these may lie outside the workspace. Every other check applies to them.
     */
    taskContextFiles?: readonly string[];
  }>): Promise<OutgoingFilesResult> {
    const paths = [...new Set((input.referenceFiles ?? []).map((file) => file.trim()).filter(Boolean))];
    if (!paths.length) return Object.freeze({ ok: true as const, files: Object.freeze([]) });
    const taskContextFiles = new Set(input.taskContextFiles ?? []);
    // A workspace is needed only for a file that is not one of the Task's own.
    const workspace = paths.every((filePath) => taskContextFiles.has(filePath)) ? null : await this.workspaceOf(input.senderAgentRunId);
    if (workspace === undefined) return refused(REMOTE_REFUSAL.NO_WORKSPACE, REFERENCE_FILE_REFUSAL_TEXT.noWorkspace());
    const opened: OpenedFile[] = [];
    try {
      for (const filePath of paths) {
        const checked = await this.open(filePath, taskContextFiles.has(filePath) ? null : workspace!);
        if ("refusal" in checked) return Object.freeze({ ok: false as const, refusal: checked.refusal });
        opened.push(checked.opened);
      }
      return await this.transfer(opened, input);
    } finally {
      await Promise.all(opened.map((file) => file.handle.close().catch(() => undefined)));
    }
  }

  private async transfer(opened: readonly OpenedFile[], input: Readonly<{ nodeId: string; peerName: string }>): Promise<OutgoingFilesResult> {
    const repeated = opened.find((file, index) => opened.findIndex((other) => other.name === file.name) !== index);
    if (repeated) return refused(REMOTE_REFUSAL.REFERENCE_FILE_NAME_REPEATED, REFERENCE_FILE_REFUSAL_TEXT.nameRepeated(repeated.name));
    const total = opened.reduce((sum, file) => sum + file.size, 0);
    if (total > TRANSFERRED_FILES_MAX_TOTAL_BYTES) {
      return refused(REMOTE_REFUSAL.REFERENCE_FILE_TOO_LARGE, REFERENCE_FILE_REFUSAL_TEXT.totalTooLarge(total, TRANSFERRED_FILES_MAX_TOTAL_BYTES));
    }
    const channel = this.dependencies.channel();
    if (!channel) return refused(REMOTE_REFUSAL.OFF, REMOTE_ROOT_REFUSAL_TEXT.off);
    const files: TransferredFile[] = [];
    for (const file of opened) files.push(Object.freeze({ sha256: await hashOpened(file), size: file.size, name: file.name }));
    const failed = (name: string, reason: string) =>
      refused(REMOTE_REFUSAL.REFERENCE_FILE_TRANSFER_FAILED, REFERENCE_FILE_REFUSAL_TEXT.transferFailed(name, input.peerName, reason));
    const status = await channel.receivedFilesStatus(input.nodeId, files);
    if (!status.accepted) return failed(files[0]!.name, status.message);
    const tooLarge = files.find((file) => file.size > status.maxFileBytes);
    if (tooLarge) {
      return refused(REMOTE_REFUSAL.REFERENCE_FILE_TOO_LARGE,
        REFERENCE_FILE_REFUSAL_TEXT.tooLarge(tooLarge.name, tooLarge.size, input.peerName, status.maxFileBytes));
    }
    for (const [index, file] of files.entries()) {
      const held = status.files[index]!;
      if (held.complete) continue;
      let offset = Math.min(held.receivedBytes, file.size);
      for (;;) {
        const bytes = await readAt(opened[index]!.handle, offset, Math.min(TRANSFERRED_FILE_PIECE_MAX_BYTES, file.size - offset));
        const piece = await channel.putReceivedFilePiece({ nodeId: input.nodeId, sha256: file.sha256, offset, size: file.size, bytes });
        if (!piece.accepted) {
          if (piece.code === REMOTE_REFUSAL.REFERENCE_FILE_CHECK_FAILED) return refused(piece.code, REFERENCE_FILE_REFUSAL_TEXT.damaged(file.name, input.peerName));
          // CR-587-02: the node answered this call's status, so the pairing holds; a piece its gate refuses (its signed body
          // did not match) was damaged or changed on the way, not unpaired (NA-9's codes are the gate's, unchanged).
          if (piece.code === REMOTE_REFUSAL.PEER_NOT_PAIRED) {
            return refused(REMOTE_REFUSAL.REFERENCE_FILE_TRANSFER_FAILED, REFERENCE_FILE_REFUSAL_TEXT.inTransit(file.name, input.peerName));
          }
          return failed(file.name, piece.message);
        }
        if (piece.complete) break;
        offset = piece.receivedBytes;
      }
    }
    return Object.freeze({ ok: true as const, files: Object.freeze(files) });
  }

  /**
   * RF-3 on one file (CR-587-04): the path given is opened once (non-blocking: a FIFO never holds the call); the opened
   * file must be a regular file and the very file its resolved path names (same device and inode), so no component
   * swapped in between can lead outside; then the resolved path must be inside `workspace` (null: a saved Task's own
   * context file, DEC-009). The hash and every piece are read from this handle.
   */
  private async open(filePath: string, workspace: string | null): Promise<FileCheck> {
    const notAFile = () => check(REMOTE_REFUSAL.REFERENCE_FILE_NOT_A_FILE, REFERENCE_FILE_REFUSAL_TEXT.notAFile(filePath));
    let handle: FileHandle;
    try { handle = await fs.open(filePath, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK); }
    catch { return notAFile(); }
    const refuse = async (refusal: FileCheck): Promise<FileCheck> => { await handle.close().catch(() => undefined); return refusal; };
    const opened = await handle.stat();
    if (!opened.isFile()) {
      return refuse(opened.isDirectory() ? check(REMOTE_REFUSAL.REFERENCE_FILE_NOT_A_FILE, REFERENCE_FILE_REFUSAL_TEXT.folder(filePath)) : notAFile());
    }
    let resolved: string;
    let named: Awaited<ReturnType<typeof fs.stat>>;
    try { resolved = await fs.realpath(filePath); named = await fs.stat(resolved); }
    catch { return refuse(notAFile()); }
    if (named.dev !== opened.dev || named.ino !== opened.ino) return refuse(notAFile());
    if (workspace !== null && !isInside(workspace, resolved)) {
      return refuse(check(REMOTE_REFUSAL.REFERENCE_FILE_OUTSIDE_WORKSPACE, REFERENCE_FILE_REFUSAL_TEXT.outsideWorkspace(filePath, workspace)));
    }
    return Object.freeze({ opened: Object.freeze({ handle, name: path.basename(filePath), size: opened.size }) });
  }

  /** The sending agent's workspace folder, links resolved; undefined without one. */
  private async workspaceOf(senderAgentRunId: string): Promise<string | undefined> {
    const workspaceId = this.dependencies.runs.getActiveRun(senderAgentRunId)?.config.workspaceId ?? null;
    const root = workspaceId ? await this.dependencies.workspaces.getWorkspaceRootPathForHistory(workspaceId) : null;
    return root ? fs.realpath(root).catch(() => undefined) : undefined;
  }
}

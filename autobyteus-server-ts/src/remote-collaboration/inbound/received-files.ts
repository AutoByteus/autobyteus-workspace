import fs from "node:fs/promises";
import path from "node:path";
import { hashFile } from "../../memory-sync/shared/memory-sync-file-hash.js";
import { withFilePathLock } from "../../persistence/file/store-utils.js";
import {
  SHA256_HEX_PATTERN,
  type ReceivedFilesPlacement,
  type ReceivedFilesPlan,
  type TransferredFile,
  type TransferredFileMissing,
} from "../../agent-collaboration/execution/remote/transferred-files.js";
import { REMOTE_REFUSAL, readableSize } from "../../agent-collaboration/execution/remote/remote-refusal-codes.js";

/** An entry no agent folder links to, and a `.partial` no upload touched, for this long is removed by the sweep (RF-10). */
export const RECEIVED_FILE_GRACE_MS = 24 * 60 * 60 * 1000;
const PARTIAL_SUFFIX = ".partial";

export type ReceivedFileStatus = Readonly<{ sha256: string; receivedBytes: number; complete: boolean }>;
export type ReceivedFilesStatus = Readonly<{ maxFileBytes: number; files: readonly ReceivedFileStatus[] }>;
export type ReceivedPiece = Readonly<{ receivedBytes: number; complete: boolean }>;
export type ReceivedPieceRefusal = Readonly<{ accepted: false; code: string; message: string }>;

/** A delivery without files: nothing to name or place. */
const NO_FILES: ReceivedFilesPlan = Object.freeze({ paths: Object.freeze([]), place: async () => Object.freeze({ ok: true as const }) });
const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === "ENOENT";
const refusal = (code: string, message: string): ReceivedPieceRefusal => Object.freeze({ accepted: false as const, code, message });

/**
 * A received file's name in an agent's folder (RF-7): the original file name, made safe: only its last segment, without
 * control characters; never `.`, `..` or empty.
 */
export const safeReceivedFileName = (name: string): string => {
  const leaf = name.split(/[\\/]/).at(-1) ?? "";
  // eslint-disable-next-line no-control-regex
  const cleaned = leaf.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return cleaned && cleaned !== "." && cleaned !== ".." ? cleaned : "file";
};

/** `target` resolved inside `root`, or an error: nothing here ever writes outside the folder it was given. */
const inside = (root: string, ...segments: string[]): string => {
  const base = path.resolve(root);
  const target = path.resolve(base, ...segments);
  if (!target.startsWith(`${base}${path.sep}`)) throw new Error(`${target} is not inside ${base}.`);
  return target;
};

/**
 * The node's received files (autobyteus-587, RFC-001 § 3): the bytes of every file another node sent, once per content,
 * at `<data>/received_files/<sha256>` (`.partial` while it arrives), and their names in the agents that received them.
 * - `status` and `appendPiece` serve the sending node (DS-003): pieces append at the bytes held; a piece at another
 *   offset writes nothing and answers the bytes held, so the sender resumes there (two uploads of one content); the last
 *   piece is checked (size and SHA-256) and the file moved into place. Each content's file is changed under its own lock.
 * - `verify` (no writes) and `planFor` serve the receiving root: the files are complete, then placed for the agent as
 *   read-only hard links at `<agent folder>/received_files/<sender's run ID>/<name>` (a copy where a link cannot be made).
 * - `sweep` (DS-004): an entry whose only name is its own and that nothing touched for 24 hours, and a `.partial` no
 *   upload touched for 24 hours, are removed. `status`, completion and placement touch an entry, so a file a call in
 *   flight uses (being deduplicated, or waiting for the call's other files) is never removed.
 */
export class ReceivedFiles implements ReceivedFilesPlacement {
  constructor(private readonly dependencies: Readonly<{
    /** `<data>/received_files`. */
    storeDir: string;
    /** `<data>/memory`: every agent folder files are placed into is inside it (RF-12). */
    memoryDir: string;
    /** This node's per-file limit (`AUTOBYTEUS_RECEIVED_FILE_MAX_MB`), read at each request. */
    maxFileBytes(): number;
    now?(): number;
  }>) {}

  /** What this node holds of each file, and its per-file limit (RF-4, RF-11). A complete file is touched. */
  async status(files: readonly Readonly<{ sha256: string; size: number }>[]): Promise<ReceivedFilesStatus> {
    const answers = await Promise.all(files.map(async ({ sha256 }) => {
      const complete = await this.statOf(this.entryPath(sha256));
      if (complete) {
        await this.touch(this.entryPath(sha256));
        return Object.freeze({ sha256, receivedBytes: complete.size, complete: true });
      }
      const partial = await this.statOf(this.partialPath(sha256));
      return Object.freeze({ sha256, receivedBytes: partial?.size ?? 0, complete: false });
    }));
    return Object.freeze({ maxFileBytes: this.dependencies.maxFileBytes(), files: Object.freeze(answers) });
  }

  /**
   * One piece of the file `sha256` of `size` bytes at `offset`. The limit is enforced on every piece (RF-4). The last
   * piece completes the file: checked, then moved into place; a file that fails the check is removed.
   */
  async appendPiece(piece: Readonly<{ sha256: string; offset: number; size: number; bytes: Buffer }>): Promise<ReceivedPiece | ReceivedPieceRefusal> {
    const { sha256, offset, size, bytes } = piece;
    const maxFileBytes = this.dependencies.maxFileBytes();
    if (size > maxFileBytes) {
      return refusal(REMOTE_REFUSAL.REFERENCE_FILE_TOO_LARGE, `This node accepts files up to ${readableSize(maxFileBytes)}; the file is ${readableSize(size)}.`);
    }
    if (offset + bytes.byteLength > size) return refusal(REMOTE_REFUSAL.BAD_REQUEST, "The piece goes past the file's size.");
    const entryPath = this.entryPath(sha256);
    return withFilePathLock(entryPath, async () => {
      if (await this.statOf(entryPath)) {
        await this.touch(entryPath);
        return Object.freeze({ receivedBytes: size, complete: true });
      }
      const partialPath = this.partialPath(sha256);
      await fs.mkdir(this.dependencies.storeDir, { recursive: true });
      const handle = await fs.open(partialPath, "a");
      let received: number;
      try {
        received = (await handle.stat()).size;
        if (received !== offset) return Object.freeze({ receivedBytes: received, complete: false });
        await handle.write(bytes, 0, bytes.byteLength);
        received += bytes.byteLength;
      } finally {
        await handle.close();
      }
      if (received < size) {
        await this.touch(partialPath);
        return Object.freeze({ receivedBytes: received, complete: false });
      }
      if (await hashFile(partialPath) !== sha256) {
        await fs.rm(partialPath, { force: true });
        return refusal(REMOTE_REFUSAL.REFERENCE_FILE_CHECK_FAILED, "The file's content does not match its SHA-256.");
      }
      await fs.rename(partialPath, entryPath);
      await this.touch(entryPath);
      return Object.freeze({ receivedBytes: received, complete: true });
    });
  }

  /** Every file is complete here with its size (a message or work packet that names one that is not is refused). No writes. */
  async verify(files: readonly TransferredFile[]): Promise<Readonly<{ ok: true }> | TransferredFileMissing> {
    for (const file of files) {
      const stat = SHA256_HEX_PATTERN.test(file.sha256) ? await this.statOf(this.entryPath(file.sha256)) : null;
      if (stat?.size !== file.size) return Object.freeze({ ok: false as const, name: file.name });
    }
    return Object.freeze({ ok: true as const });
  }

  planFor(input: Readonly<{ agentFolder: string; senderAgentRunId: string; files: readonly TransferredFile[] }>): ReceivedFilesPlan {
    if (!input.files.length) return NO_FILES;
    const agentFolder = inside(this.dependencies.memoryDir, path.relative(this.dependencies.memoryDir, input.agentFolder));
    const senderFolder = inside(agentFolder, "received_files", safeReceivedFileName(input.senderAgentRunId));
    const targets = input.files.map((file) => Object.freeze({ file, target: inside(senderFolder, safeReceivedFileName(file.name)) }));
    return Object.freeze({
      paths: Object.freeze(targets.map(({ target }) => target)),
      place: async () => {
        await fs.mkdir(senderFolder, { recursive: true });
        for (const { file, target } of targets) {
          const placed = await this.placeOne(file.sha256, target);
          if (!placed) return Object.freeze({ ok: false as const, name: file.name });
        }
        return Object.freeze({ ok: true as const });
      },
    });
  }

  /** Removes the entries no agent folder links to and nothing touched for 24 h, and `.partial`s untouched for 24 h (RF-10). */
  async sweep(): Promise<void> {
    let names: string[];
    try { names = await fs.readdir(this.dependencies.storeDir); } catch (error) {
      if (isMissing(error)) return;
      throw error;
    }
    const cutoff = this.now() - RECEIVED_FILE_GRACE_MS;
    for (const name of names) {
      const partial = name.endsWith(PARTIAL_SUFFIX) && SHA256_HEX_PATTERN.test(name.slice(0, -PARTIAL_SUFFIX.length));
      if (!partial && !SHA256_HEX_PATTERN.test(name)) continue;
      const entryPath = path.join(this.dependencies.storeDir, name);
      // Under the content's lock: never between a piece's write and its completion, or between a status and its upload.
      await withFilePathLock(partial ? entryPath.slice(0, -PARTIAL_SUFFIX.length) : entryPath, async () => {
        const stat = await this.statOf(entryPath);
        if (stat && stat.mtimeMs < cutoff && (partial || stat.nlink === 1)) await fs.rm(entryPath, { force: true });
      });
    }
  }

  /** A temporary name beside the target, then the new name at once over any older one (RF-7). */
  private async placeOne(sha256: string, target: string): Promise<boolean> {
    const entryPath = this.entryPath(sha256);
    return withFilePathLock(entryPath, async () => {
      if (!await this.statOf(entryPath)) return false;
      const temporary = `${target}.${process.pid}.${this.now()}.${Math.random().toString(16).slice(2)}.tmp`;
      try {
        await fs.link(entryPath, temporary);
      } catch {
        // A separately mounted memory folder: a copy, which loses the deduplication on this node (RF-7).
        await fs.copyFile(entryPath, temporary);
      }
      // Read-only: a hard link is one file under two names, so an edit through one would change every name's file.
      await fs.chmod(temporary, 0o444);
      await fs.rename(temporary, target);
      await this.touch(entryPath);
      return true;
    });
  }

  private entryPath(sha256: string): string {
    if (!SHA256_HEX_PATTERN.test(sha256)) throw new Error("sha256 must be 64 lowercase hex characters.");
    return path.join(this.dependencies.storeDir, sha256);
  }

  private partialPath(sha256: string): string {
    return `${this.entryPath(sha256)}${PARTIAL_SUFFIX}`;
  }

  private async statOf(filePath: string) {
    try { return await fs.stat(filePath); } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  private async touch(filePath: string): Promise<void> {
    const now = new Date(this.now());
    await fs.utimes(filePath, now, now);
  }

  private now(): number {
    return this.dependencies.now?.() ?? Date.now();
  }
}

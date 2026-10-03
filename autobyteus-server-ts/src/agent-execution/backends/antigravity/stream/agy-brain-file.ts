import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Safe access to AGY's per-conversation brain directory
 * (`<brainRoot>/<conversation>/…`, an undocumented AGY-internal layout). Every AGY brain
 * read goes through here: conversation ids are validated, files are opened without following
 * a final symlink, only regular files within the caller's size bound are read, and resolved
 * paths must stay inside the conversation directory.
 */
export const AGY_DEFAULT_BRAIN_ROOT = path.join(os.homedir(), ".gemini", "antigravity-cli", "brain");

const CONVERSATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isAgyConversationId = (value: string): boolean => CONVERSATION_ID.test(value);

export const agyConversationDir = (brainRoot: string, conversationId: string): string =>
  path.join(brainRoot, conversationId);

export type AgyBrainFileUnreadableReason = "MISSING" | "UNSAFE" | "TOO_LARGE" | "READ_FAILED";

export type AgyBrainFileRead = { text: string } | { reason: AgyBrainFileUnreadableReason };

export const agyFsErrorCode = (error: unknown): string | undefined =>
  (error as NodeJS.ErrnoException | null)?.code;

/** One bounded read of a regular, non-symlink file; never throws. */
export const readAgyBrainFile = (file: string, maxBytes: number): AgyBrainFileRead => {
  let fd: number;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  } catch (error) {
    const code = agyFsErrorCode(error);
    return { reason: code === "ENOENT" || code === "ENOTDIR" ? "MISSING" : code === "ELOOP" ? "UNSAFE" : "READ_FAILED" };
  }
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) return { reason: "UNSAFE" };
    if (stat.size > maxBytes) return { reason: "TOO_LARGE" };
    const buffer = Buffer.alloc(maxBytes);
    const bytes = fs.readSync(fd, buffer, 0, maxBytes, 0);
    return { text: buffer.subarray(0, bytes).toString("utf8") };
  } catch {
    return { reason: "READ_FAILED" };
  } finally {
    fs.closeSync(fd);
  }
};

/**
 * Real path of `candidate` when it lies strictly inside the real conversation directory,
 * otherwise null. Throws when either path cannot be resolved.
 */
export const resolveWithinAgyConversation = (conversationDir: string, candidate: string): string | null => {
  const realCandidate = fs.realpathSync(candidate);
  const realConversation = fs.realpathSync(conversationDir);
  return realCandidate.startsWith(realConversation + path.sep) ? realCandidate : null;
};

const REVERSE_CHUNK_BYTES = 64 * 1024;
const MAX_JSONL_ROW_BYTES = 2 * 1024 * 1024;

/**
 * Visit complete UTF-8 JSONL rows newest first, from one guarded descriptor snapshot.
 * Returning false stops visitation. False from the scan means evidence was unreadable,
 * aborted, oversized or changed inconsistently; callers must discard visited evidence.
 * An appended suffix is outside the snapshot; an unterminated final row is ignored.
 */
export const scanAgyBrainJsonLinesReverse = async (
  brainRoot: string, conversationId: string, relativeFile: string,
  visit: (line: string) => boolean, signal?: AbortSignal,
): Promise<boolean> => {
  let handle: fs.promises.FileHandle | undefined;
  try {
    if (signal?.aborted || !isAgyConversationId(conversationId)) return false;
    const root = await fs.promises.realpath(brainRoot);
    const conversationDir = agyConversationDir(root, conversationId);
    if (!(await fs.promises.lstat(conversationDir)).isDirectory() ||
        await fs.promises.realpath(conversationDir) !== conversationDir) return false;
    const file = path.resolve(conversationDir, relativeFile);
    if (!file.startsWith(conversationDir + path.sep)) return false;
    const realFile = await fs.promises.realpath(file);
    if (!realFile.startsWith(conversationDir + path.sep)) return false;
    const entry = await fs.promises.lstat(file);
    if (!entry.isFile() || signal?.aborted) return false;
    handle = await fs.promises.open(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const snapshot = await handle.stat();
    if (!snapshot.isFile() || snapshot.ino !== entry.ino || snapshot.dev !== entry.dev || signal?.aborted) return false;

    const chunk = Buffer.alloc(REVERSE_CHUNK_BYTES);
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let parts: Buffer[] = [];
    let rowBytes = 0;
    let discardTail = true;
    let stopped = false;
    const addPart = (part: Buffer) => {
      rowBytes += part.length;
      if (rowBytes > MAX_JSONL_ROW_BYTES) throw new Error("AGY_JSONL_ROW_TOO_LARGE");
      if (part.length) parts.unshift(Buffer.from(part));
    };
    const visitRow = () => {
      if (signal?.aborted) throw new Error("AGY_JSONL_SCAN_ABORTED");
      const row = decoder.decode(Buffer.concat(parts, rowBytes));
      stopped = !visit(row.endsWith("\r") ? row.slice(0, -1) : row);
      parts = []; rowBytes = 0;
    };
    let position = snapshot.size;
    while (position > 0 && !stopped) {
      if (signal?.aborted) return false;
      const length = Math.min(position, REVERSE_CHUNK_BYTES);
      position -= length;
      const { bytesRead } = await handle.read(chunk, 0, length, position);
      if (bytesRead !== length || signal?.aborted) return false;
      let end = length;
      for (let i = length - 1; i >= 0 && !stopped; i -= 1) {
        if (chunk[i] !== 10) continue;
        if (discardTail) discardTail = false;
        else { addPart(chunk.subarray(i + 1, end)); visitRow(); }
        end = i;
      }
      if (!discardTail && !stopped) addPart(chunk.subarray(0, end));
    }
    if (!stopped && !discardTail) visitRow();
    // Replacements, truncation and same-size edits invalidate the scan; append-only growth
    // is normal provider behavior and does not change the opened snapshot's complete rows.
    const current = await handle.stat();
    const finalEntry = await fs.promises.lstat(file);
    const finalFile = await fs.promises.realpath(file);
    const finalConversation = await fs.promises.realpath(conversationDir);
    return finalEntry.isFile() && finalFile === realFile && finalConversation === conversationDir &&
      current.ino === snapshot.ino && current.dev === snapshot.dev && current.size >= snapshot.size &&
      finalEntry.ino === snapshot.ino && finalEntry.dev === snapshot.dev && finalEntry.size >= snapshot.size &&
      !(current.size === snapshot.size && current.mtimeMs !== snapshot.mtimeMs) &&
      !(finalEntry.size === snapshot.size && finalEntry.mtimeMs !== snapshot.mtimeMs) && !signal?.aborted;
  } catch {
    return false;
  } finally {
    await handle?.close().catch(() => undefined);
  }
};

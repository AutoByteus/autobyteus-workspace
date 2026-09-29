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

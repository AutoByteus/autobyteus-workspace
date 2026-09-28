import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type AgyNativeImagePathUnresolvedReason =
  | "INVALID_IDENTITY" | "OUTPUT_MISSING" | "OUTPUT_UNSAFE" | "OUTPUT_TOO_LARGE"
  | "PATH_NOT_FOUND_IN_OUTPUT" | "PATH_OUTSIDE_CONVERSATION" | "IMAGE_MISSING" | "READ_FAILED";

export type AgyNativeImagePathResolution =
  | { path: string; outputText: string; reason: null }
  | { path: null; outputText: null; reason: AgyNativeImagePathUnresolvedReason };

const MAX_OUTPUT_BYTES = 16 * 1024;
const CONVERSATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAVED_AT = /^Generated image is saved at (.+)$/m;
const DEFAULT_BRAIN_ROOT = path.join(os.homedir(), ".gemini", "antigravity-cli", "brain");

const unresolved = (reason: AgyNativeImagePathUnresolvedReason): AgyNativeImagePathResolution =>
  ({ path: null, outputText: null, reason });
const errorCode = (error: unknown): string | undefined => (error as NodeJS.ErrnoException | null)?.code;

type BoundedOutput = { text: string } | { reason: AgyNativeImagePathUnresolvedReason };

const readBoundedOutput = (file: string): BoundedOutput => {
  let fd: number;
  try { fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW); }
  catch (error) {
    const code = errorCode(error);
    return { reason: code === "ENOENT" || code === "ENOTDIR" ? "OUTPUT_MISSING" : code === "ELOOP" ? "OUTPUT_UNSAFE" : "READ_FAILED" };
  }
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) return { reason: "OUTPUT_UNSAFE" };
    if (stat.size > MAX_OUTPUT_BYTES) return { reason: "OUTPUT_TOO_LARGE" };
    const buffer = Buffer.alloc(MAX_OUTPUT_BYTES);
    const bytes = fs.readSync(fd, buffer, 0, MAX_OUTPUT_BYTES, 0);
    return { text: buffer.subarray(0, bytes).toString("utf8") };
  } finally { fs.closeSync(fd); }
};

/**
 * Reads AGY's persisted native `generate_image` step output
 * (`<brainRoot>/<conversation>/.system_generated/steps/<step>/output.txt`) and returns the reported image path
 * only when it is a regular, non-symlink file whose realpath lies inside that conversation's brain directory.
 * Synchronous, single bounded read, never throws.
 */
export const readAgyNativeImagePath = (
  conversationId: string, stepIndex: number, brainRoot: string = DEFAULT_BRAIN_ROOT,
): AgyNativeImagePathResolution => {
  try {
    if (!CONVERSATION_ID.test(conversationId) || !Number.isSafeInteger(stepIndex) || stepIndex < 0)
      return unresolved("INVALID_IDENTITY");
    const conversationDir = path.join(brainRoot, conversationId);
    const output = readBoundedOutput(path.join(conversationDir, ".system_generated", "steps", String(stepIndex), "output.txt"));
    if ("reason" in output) return unresolved(output.reason);
    let reported = SAVED_AT.exec(output.text)?.[1]?.trim() ?? "";
    if (reported.endsWith(".")) reported = reported.slice(0, -1);
    if (!reported || !path.isAbsolute(reported)) return unresolved("PATH_NOT_FOUND_IN_OUTPUT");
    let reportedStat: fs.Stats;
    try { reportedStat = fs.lstatSync(reported); }
    catch (error) { return unresolved(errorCode(error) === "ENOENT" ? "IMAGE_MISSING" : "READ_FAILED"); }
    // A symlink or non-regular entry is not an AGY-generated image file.
    if (!reportedStat.isFile()) return unresolved("IMAGE_MISSING");
    const realImage = fs.realpathSync(reported);
    const realConversation = fs.realpathSync(conversationDir);
    if (!realImage.startsWith(realConversation + path.sep)) return unresolved("PATH_OUTSIDE_CONVERSATION");
    if (!fs.lstatSync(realImage).isFile()) return unresolved("IMAGE_MISSING");
    return { path: realImage, outputText: output.text.trim(), reason: null };
  } catch {
    return unresolved("READ_FAILED");
  }
};

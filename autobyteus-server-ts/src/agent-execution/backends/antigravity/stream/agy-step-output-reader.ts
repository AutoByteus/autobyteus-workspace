import fs from "node:fs";
import path from "node:path";
import {
  AGY_DEFAULT_BRAIN_ROOT,
  agyConversationDir,
  agyFsErrorCode,
  isAgyConversationId,
  readAgyBrainFile,
  resolveWithinAgyConversation,
  type AgyBrainFileUnreadableReason,
} from "./agy-brain-file.js";

export type AgyNativeImagePathUnresolvedReason =
  | "INVALID_IDENTITY" | "OUTPUT_MISSING" | "OUTPUT_UNSAFE" | "OUTPUT_TOO_LARGE"
  | "PATH_NOT_FOUND_IN_OUTPUT" | "PATH_OUTSIDE_CONVERSATION" | "IMAGE_MISSING" | "READ_FAILED";

export type AgyNativeImagePathResolution =
  | { path: string; outputText: string; reason: null }
  | { path: null; outputText: null; reason: AgyNativeImagePathUnresolvedReason };

const MAX_OUTPUT_BYTES = 16 * 1024;
const SAVED_AT = /^Generated image is saved at (.+)$/m;
const OUTPUT_UNREADABLE: Readonly<Record<AgyBrainFileUnreadableReason, AgyNativeImagePathUnresolvedReason>> = {
  MISSING: "OUTPUT_MISSING", UNSAFE: "OUTPUT_UNSAFE", TOO_LARGE: "OUTPUT_TOO_LARGE", READ_FAILED: "READ_FAILED",
};

const unresolved = (reason: AgyNativeImagePathUnresolvedReason): AgyNativeImagePathResolution =>
  ({ path: null, outputText: null, reason });

/**
 * Reads AGY's persisted native `generate_image` step output
 * (`<brainRoot>/<conversation>/.system_generated/steps/<step>/output.txt`) and returns the reported image path
 * only when it is a regular, non-symlink file whose realpath lies inside that conversation's brain directory.
 * Synchronous, single bounded read, never throws.
 */
export const readAgyNativeImagePath = (
  conversationId: string, stepIndex: number, brainRoot: string = AGY_DEFAULT_BRAIN_ROOT,
): AgyNativeImagePathResolution => {
  try {
    if (!isAgyConversationId(conversationId) || !Number.isSafeInteger(stepIndex) || stepIndex < 0)
      return unresolved("INVALID_IDENTITY");
    const conversationDir = agyConversationDir(brainRoot, conversationId);
    const output = readAgyBrainFile(
      path.join(conversationDir, ".system_generated", "steps", String(stepIndex), "output.txt"), MAX_OUTPUT_BYTES);
    if ("reason" in output) return unresolved(OUTPUT_UNREADABLE[output.reason]);
    let reported = SAVED_AT.exec(output.text)?.[1]?.trim() ?? "";
    if (reported.endsWith(".")) reported = reported.slice(0, -1);
    if (!reported || !path.isAbsolute(reported)) return unresolved("PATH_NOT_FOUND_IN_OUTPUT");
    let reportedStat: fs.Stats;
    try { reportedStat = fs.lstatSync(reported); }
    catch (error) { return unresolved(agyFsErrorCode(error) === "ENOENT" ? "IMAGE_MISSING" : "READ_FAILED"); }
    // A symlink or non-regular entry is not an AGY-generated image file.
    if (!reportedStat.isFile()) return unresolved("IMAGE_MISSING");
    const realImage = resolveWithinAgyConversation(conversationDir, reported);
    if (!realImage) return unresolved("PATH_OUTSIDE_CONVERSATION");
    if (!fs.lstatSync(realImage).isFile()) return unresolved("IMAGE_MISSING");
    return { path: realImage, outputText: output.text.trim(), reason: null };
  } catch {
    return unresolved("READ_FAILED");
  }
};

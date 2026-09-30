import fs from "node:fs";
import path from "node:path";
import {
  AGY_DEFAULT_BRAIN_ROOT,
  agyConversationDir,
  agyFsErrorCode,
  isAgyConversationId,
  readAgyBrainFile,
  resolveWithinAgyConversation,
} from "./agy-brain-file.js";

/**
 * AGY writes `<brain>/<conversation>/.system_generated/messages/<uuid>.json` when a background
 * (daemon) command exits (AGY CLI 1.2.13, probes P3/P4). The layout is undocumented, so this
 * reader only recognizes the exact exit-message shape and treats everything else as unrelated.
 */
export const AGY_TASK_EXIT_MESSAGE_MAX_BYTES = 64 * 1024;
const SUMMARY_MAX_CHARS = 1_000;
const EXIT_CODE = /exited with code (-?\d+)/;
const RESULT_MARKER = "finished with result:";
const LOG_MARKER = "\nLog:";

export type AgyTaskExitMessage = Readonly<{ stepIndex: number; exitCode: number; summary: string | null }>;

export type AgyTaskExitMessageScan = Readonly<{
  /** Files whose content is final (exit messages, other shapes, unsafe or oversized files); not read again. */
  settledFiles: readonly string[];
  exits: readonly AgyTaskExitMessage[];
  /** First list or read problem of this scan, if any; the scan still reports every other file. */
  problem: string | null;
}>;

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const summaryOf = (content: string): string | null => {
  const start = content.indexOf(RESULT_MARKER);
  const from = start < 0 ? 0 : start + RESULT_MARKER.length;
  const end = content.lastIndexOf(LOG_MARKER);
  const summary = content.slice(from, end > from ? end : content.length).trim();
  if (!summary) return null;
  return summary.length > SUMMARY_MAX_CHARS ? `${summary.slice(0, SUMMARY_MAX_CHARS - 1)}…` : summary;
};

/** The exit message of one AGY tool step, or null when the JSON has any other shape. */
export const parseAgyTaskExitMessage = (value: unknown): AgyTaskExitMessage | null => {
  const message = record(value);
  const stepIndex = record(record(message?.sourceMetadata)?.tool)?.stepIndex;
  const content = message?.content;
  if (typeof stepIndex !== "number" || !Number.isSafeInteger(stepIndex) || stepIndex < 0) return null;
  if (typeof content !== "string") return null;
  const summary = summaryOf(content);
  const exitCode = EXIT_CODE.exec(summary ?? "")?.[1];
  if (exitCode === undefined) return null;
  return Object.freeze({ stepIndex, exitCode: Number(exitCode), summary });
};

const EMPTY_SCAN: AgyTaskExitMessageScan = Object.freeze({ settledFiles: [], exits: [], problem: null });

/**
 * Lists `messages/*.json` not in `skipFiles` and parses each one. A file that is not valid
 * JSON yet (a partial write) is left unsettled so the next scan retries it. Never throws.
 */
export const scanAgyTaskExitMessages = (
  conversationId: string,
  skipFiles: ReadonlySet<string>,
  brainRoot: string = AGY_DEFAULT_BRAIN_ROOT,
): AgyTaskExitMessageScan => {
  if (!isAgyConversationId(conversationId)) return { ...EMPTY_SCAN, problem: "INVALID_CONVERSATION_ID" };
  const conversationDir = agyConversationDir(brainRoot, conversationId);
  let messagesDir: string | null;
  let names: string[];
  try {
    messagesDir = resolveWithinAgyConversation(conversationDir, path.join(conversationDir, ".system_generated", "messages"));
    if (!messagesDir) return { ...EMPTY_SCAN, problem: "MESSAGES_DIR_OUTSIDE_CONVERSATION" };
    names = fs.readdirSync(messagesDir).filter((name) => name.endsWith(".json") && !skipFiles.has(name)).sort();
  } catch (error) {
    const code = agyFsErrorCode(error);
    // AGY creates the folder only when it writes its first message.
    return code === "ENOENT" || code === "ENOTDIR" ? EMPTY_SCAN : { ...EMPTY_SCAN, problem: `LIST_FAILED:${code ?? "UNKNOWN"}` };
  }
  const settledFiles: string[] = [];
  const exits: AgyTaskExitMessage[] = [];
  let problem: string | null = null;
  for (const name of names) {
    const read = readAgyBrainFile(path.join(messagesDir, name), AGY_TASK_EXIT_MESSAGE_MAX_BYTES);
    if ("reason" in read) {
      if (read.reason === "UNSAFE" || read.reason === "TOO_LARGE") settledFiles.push(name);
      if (read.reason !== "MISSING") problem ??= `READ_${read.reason}:${name}`;
      continue;
    }
    let parsed: unknown;
    try { parsed = JSON.parse(read.text); } catch { continue; }
    settledFiles.push(name);
    const exit = parseAgyTaskExitMessage(parsed);
    if (exit) exits.push(exit);
  }
  return { settledFiles, exits, problem };
};

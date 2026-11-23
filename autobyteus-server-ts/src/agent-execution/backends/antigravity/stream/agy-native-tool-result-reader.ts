import { AGY_DEFAULT_BRAIN_ROOT, isAgyConversationId, scanAgyBrainJsonLinesReverse } from "./agy-brain-file.js";
import { agyRecord } from "./agy-stream-message.js";

/**
 * AGY's stream sends a tool step's result as a size summary only (`"40 lines, 1005 bytes"`, the whole file's size even for a ranged
 * read) or nothing at all (`grep_search`, `find_by_name`), while the CLI persists every step's full result text as the `content` of
 * the step's `MODEL`/`GENERIC`/`DONE` row of `.system_generated/logs/transcript_full.jsonl` (autobyteus-377). This reads that row, the
 * same file and guarded scan `readAgyNativeToolArguments` uses for the lossy call arguments. A step is identified by position and name,
 * never by guess: its row, the consecutive `GENERIC` rows of its batch below it, and the batch's `PLANNER_RESPONSE`, whose
 * `tool_calls[offset].name` must be the step's tool (parallel calls make batches of 2 or more).
 */
export type AgyNativeToolResultLookup = { stepIndex: number; toolName: string };

export type AgyToolResultUnrecoveredReason =
  | "INVALID_IDENTITY"
  | "TRANSCRIPT_UNREADABLE"
  | "ROW_NOT_FOUND"
  | "ROW_NOT_CORROBORATED";

export type AgyNativeToolResultRead = { text: string } | { reason: AgyToolResultUnrecoveredReason };

/** The most of one recovered result that is kept (the CLI bounds its own content at about 50 KB; the cap is the guard). */
export const AGY_RESULT_MAX_BYTES = 256 * 1024;

const capText = (text: string, maxBytes: number): string => {
  const bytes = Buffer.from(text, "utf8");
  if (bytes.length <= maxBytes) return text;
  let end = maxBytes;
  // Never cut inside a character: back off to the start of the one that straddles the limit.
  while (end > 0 && (bytes[end]! & 0xc0) === 0x80) end -= 1;
  return `${bytes.subarray(0, end).toString("utf8")}\n…[${bytes.length - end} bytes of this result were not recorded]`;
};

/**
 * The CLI writes a step's row about when it sends the step's DONE event: in the live measurement of autobyteus-377 (123 steps of the real
 * agy 1.5.15) 122 rows were readable at once and one within 5 ms. A row that is not there yet is read again, a few times, and then given up.
 */
export const AGY_RESULT_REREAD_ATTEMPTS = 5;
export const AGY_RESULT_REREAD_DELAY_MS = 40;

const pause = (ms: number, signal?: AbortSignal): Promise<void> => new Promise((resolve) => {
  if (signal?.aborted) { resolve(); return; }
  const timer = setTimeout(done, ms);
  function done() { clearTimeout(timer); signal?.removeEventListener("abort", done); resolve(); }
  signal?.addEventListener("abort", done, { once: true });
});

/** Never throws: every miss is a reason, and the caller keeps the stream's result. A row not yet written is read again a few times. */
export const readAgyNativeToolResult = async (
  conversationId: string, lookup: AgyNativeToolResultLookup,
  options: { signal?: AbortSignal; brainRoot?: string; maxBytes?: number; rereadAttempts?: number; rereadDelayMs?: number } = {},
): Promise<AgyNativeToolResultRead> => {
  let read = await readOnce(conversationId, lookup, options);
  for (let attempt = 0; "reason" in read && read.reason === "ROW_NOT_FOUND" && attempt < (options.rereadAttempts ?? AGY_RESULT_REREAD_ATTEMPTS)
    && !options.signal?.aborted; attempt += 1) {
    await pause(options.rereadDelayMs ?? AGY_RESULT_REREAD_DELAY_MS, options.signal);
    read = await readOnce(conversationId, lookup, options);
  }
  return read;
};

const readOnce = async (
  conversationId: string, lookup: AgyNativeToolResultLookup,
  options: { signal?: AbortSignal; brainRoot?: string; maxBytes?: number },
): Promise<AgyNativeToolResultRead> => {
  if (!isAgyConversationId(conversationId) || !Number.isSafeInteger(lookup.stepIndex) || lookup.stepIndex < 1 ||
      !lookup.toolName.trim() || lookup.toolName === "call_mcp_tool") return { reason: "INVALID_IDENTITY" };
  let previous = Infinity;
  let content = null as string | null; // assigned inside the scan callback: no flow narrowing
  let outcome = "searching" as "searching" | "found" | "missing" | "uncorroborated" | "unreadable";
  try {
    const scanned = await scanAgyBrainJsonLinesReverse(options.brainRoot ?? AGY_DEFAULT_BRAIN_ROOT, conversationId,
      ".system_generated/logs/transcript_full.jsonl", (line) => {
        let record: Record<string, unknown> | null;
        try { record = agyRecord(JSON.parse(line)); } catch { outcome = "unreadable"; return false; }
        const index = record?.step_index;
        // Rows are in strictly increasing order; a duplicate or a step out of order is evidence this file is not what we know.
        if (!record || typeof index !== "number" || !Number.isSafeInteger(index) || index < 0 || index >= previous) {
          outcome = "uncorroborated"; return false;
        }
        const adjacent = previous === Infinity || index === previous - 1;
        previous = index;
        if (index > lookup.stepIndex) return true;
        if (index === lookup.stepIndex) {
          if (record.source !== "MODEL" || record.type !== "GENERIC" || record.status !== "DONE" || typeof record.content !== "string") {
            outcome = "uncorroborated"; return false;
          }
          content = record.content;
          return true;
        }
        // Below the step: its batch's consecutive GENERIC rows, then the planner row that issued the calls.
        if (content === null) { outcome = "missing"; return false; }
        if (!adjacent) { outcome = "uncorroborated"; return false; }
        if (record.type === "GENERIC") return true;
        const calls = record.type === "PLANNER_RESPONSE" && record.source === "MODEL" ? record.tool_calls : null;
        const offset = lookup.stepIndex - index - 1;
        const call = Array.isArray(calls) && offset < calls.length ? agyRecord(calls[offset]) : null;
        outcome = call?.name === lookup.toolName ? "found" : "uncorroborated";
        return false;
      }, options.signal);
    if (!scanned || outcome === "unreadable") return { reason: "TRANSCRIPT_UNREADABLE" };
    if (outcome === "found" && content !== null) return { text: capText(content, options.maxBytes ?? AGY_RESULT_MAX_BYTES) };
    return { reason: content === null && (outcome === "searching" || outcome === "missing") ? "ROW_NOT_FOUND" : "ROW_NOT_CORROBORATED" };
  } catch {
    return { reason: "TRANSCRIPT_UNREADABLE" };
  }
};

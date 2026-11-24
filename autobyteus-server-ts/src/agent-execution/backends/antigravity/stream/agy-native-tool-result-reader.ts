import { identifyAgyToolCall } from "./agy-transcript-step.js";

/**
 * AGY's stream sends a tool step's result as a size summary only (`"40 lines, 1005 bytes"`, the whole file's size even for a ranged
 * read) or nothing at all (`grep_search`, `find_by_name`), while the CLI persists every step's full result text as the `content` of
 * the step's `MODEL`/`GENERIC`/`DONE` row of `.system_generated/logs/transcript_full.jsonl` (autobyteus-377). This reads that row, the
 * same file and identification (`identifyAgyToolCall`) `readAgyNativeToolArguments` uses for the lossy call arguments.
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

const REASONS = { invalid_identity: "INVALID_IDENTITY", unreadable: "TRANSCRIPT_UNREADABLE", not_found: "ROW_NOT_FOUND",
  uncorroborated: "ROW_NOT_CORROBORATED" } as const;

const readOnce = async (
  conversationId: string, lookup: AgyNativeToolResultLookup,
  options: { signal?: AbortSignal; brainRoot?: string; maxBytes?: number },
): Promise<AgyNativeToolResultRead> => {
  const identified = await identifyAgyToolCall(conversationId, lookup, { ...options, requireRow: true });
  if (identified.status !== "identified") return { reason: REASONS[identified.status] };
  return { text: capText(String(identified.row!.content), options.maxBytes ?? AGY_RESULT_MAX_BYTES) };
};

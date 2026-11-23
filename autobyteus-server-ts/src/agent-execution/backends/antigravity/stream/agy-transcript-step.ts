import { AGY_DEFAULT_BRAIN_ROOT, isAgyConversationId, scanAgyBrainJsonLinesReverse } from "./agy-brain-file.js";
import { agyRecord } from "./agy-stream-message.js";

/**
 * The one way the backend identifies a native tool step in the CLI's `transcript_full.jsonl` (autobyteus-377). The CLI writes a
 * `PLANNER_RESPONSE` row with the batch's `tool_calls` (one call, or several parallel calls), then one `GENERIC` row per call at the next
 * step indexes, in call order. A step is therefore identified by position and name, never by guess: the planner row is the nearest
 * `PLANNER_RESPONSE` row below the step, the step's position is `stepIndex − plannerIndex − 1`, and the call at that position must carry
 * the step's tool name. Sibling rows need not be written yet (a step is observed when it starts, and parallel calls finish in any order);
 * the rows that are there must be `GENERIC` rows of the same source, in strictly decreasing order without duplicates.
 *
 * Reads from the end of the file and stops at the planner row plus the one older row that proves no duplicate index.
 */
export type AgyTranscriptStepLookup = { stepIndex: number; toolName: string };

export type AgyTranscriptStepIdentification =
  | { status: "identified"; call: Record<string, unknown>; row: Record<string, unknown> | null }
  | { status: "invalid_identity" | "not_found" | "unreadable" | "uncorroborated" };

const isResultRow = (row: Record<string, unknown>): boolean =>
  row.source === "MODEL" && row.type === "GENERIC" && row.status === "DONE" && typeof row.content === "string";

/**
 * `requireRow`: the step's own row must be there and be a finished `GENERIC` row with text (the results reader); without it the row is
 * reported when present (the arguments reader needs only the planner row). Never throws.
 */
export const identifyAgyToolCall = async (
  conversationId: string, lookup: AgyTranscriptStepLookup,
  options: { signal?: AbortSignal; brainRoot?: string; requireRow?: boolean } = {},
): Promise<AgyTranscriptStepIdentification> => {
  if (!isAgyConversationId(conversationId) || !Number.isSafeInteger(lookup.stepIndex) || lookup.stepIndex < 1 ||
      !lookup.toolName.trim() || lookup.toolName === "call_mcp_tool") return { status: "invalid_identity" };
  let previous = Infinity;
  let row: Record<string, unknown> | null = null;
  let call: Record<string, unknown> | null = null;
  // Assigned inside the scan callback: no flow narrowing.
  let failure = null as "not_found" | "unreadable" | "uncorroborated" | null;
  try {
    const scanned = await scanAgyBrainJsonLinesReverse(options.brainRoot ?? AGY_DEFAULT_BRAIN_ROOT, conversationId,
      ".system_generated/logs/transcript_full.jsonl", (line) => {
        let record: Record<string, unknown> | null;
        try { record = agyRecord(JSON.parse(line)); } catch { failure = "unreadable"; return false; }
        const index = record?.step_index;
        if (!record || typeof index !== "number" || !Number.isSafeInteger(index) || index < 0 || index >= previous) {
          failure = "uncorroborated"; return false;
        }
        previous = index;
        if (call) return false; // the older row after the planner: its order was the only thing to prove
        if (index > lookup.stepIndex) return true;
        if (index === lookup.stepIndex) { row = record; return true; }
        if (options.requireRow && !row) { failure = "not_found"; return false; }
        if (record.type === "PLANNER_RESPONSE") {
          const calls = record.tool_calls;
          const position = lookup.stepIndex - index - 1;
          const candidate = record.source === "MODEL" && record.status === "DONE" && Array.isArray(calls) && position < calls.length
            ? agyRecord(calls[position]) : null;
          if (!candidate || candidate.name !== lookup.toolName || (options.requireRow && !isResultRow(row!))) { failure = "uncorroborated"; return false; }
          call = candidate;
          return true;
        }
        if (record.type !== "GENERIC" || record.source !== "MODEL") { failure = "uncorroborated"; return false; }
        return true;
      }, options.signal);
    if (!scanned || failure === "unreadable") return { status: "unreadable" };
    if (failure) return { status: failure };
    if (call) return { status: "identified", call, row };
    // The file ended before any row below the step: a row not written yet, or no planner row at all.
    return { status: options.requireRow && !row ? "not_found" : "uncorroborated" };
  } catch {
    return { status: "unreadable" };
  }
};

import { isDeepStrictEqual } from "node:util";
import { AGY_DEFAULT_BRAIN_ROOT, isAgyConversationId, scanAgyBrainJsonLinesReverse } from "./agy-brain-file.js";
import { agyRecord } from "./agy-stream-message.js";

/** Original native identity and typed stream summary, never a projected MCP call. */
export type AgyNativeToolArgumentLookup = {
  stepIndex: number;
  toolName: string;
  summary: Record<string, unknown>;
};

const corroboratesSummary = (lookup: AgyNativeToolArgumentLookup, args: Record<string, unknown>): boolean =>
  Object.entries(lookup.summary).every(([key, summary]) => {
    if (!Object.hasOwn(args, key)) return false;
    const actual = args[key];
    if (isDeepStrictEqual(summary, actual)) return true;
    // The only evidenced lossy summary: a literal command prefix plus Unicode ellipsis.
    if (lookup.toolName !== "run_command" || key !== "CommandLine" ||
        typeof summary !== "string" || typeof actual !== "string" || !summary.endsWith("…")) return false;
    const prefix = summary.slice(0, -1);
    return prefix.length > 0 && actual.length > summary.length && actual.startsWith(prefix);
  });

/**
 * Strict recognition of AGY's observed single-call, adjacent DONE planner shape.
 * Internal source changes or ambiguous evidence yield null, never guessed inputs.
 */
export const readAgyNativeToolArguments = async (
  conversationId: string, lookup: AgyNativeToolArgumentLookup,
  options: { signal?: AbortSignal; brainRoot?: string } = {},
): Promise<Record<string, unknown> | null> => {
  if (!isAgyConversationId(conversationId) || !Number.isSafeInteger(lookup.stepIndex) || lookup.stepIndex < 1 ||
      !lookup.toolName.trim() || lookup.toolName === "call_mcp_tool" || !agyRecord(lookup.summary)) return null;
  const target = lookup.stepIndex - 1;
  let previous = Infinity;
  let found: Record<string, unknown> | null = null;
  let invalid = false;
  const scanned = await scanAgyBrainJsonLinesReverse(options.brainRoot ?? AGY_DEFAULT_BRAIN_ROOT, conversationId,
    ".system_generated/logs/transcript_full.jsonl", (line) => {
      let record: Record<string, unknown> | null;
      try { record = agyRecord(JSON.parse(line)); } catch { invalid = true; return false; }
      const index = record?.step_index;
      if (!record || typeof index !== "number" || !Number.isSafeInteger(index) || index < 0 || index >= previous) {
        invalid = true; return false;
      }
      previous = index;
      // Read one older ordinal boundary after the candidate to reject duplicate indices.
      if (index < target) return false;
      if (index !== target) return true;
      const calls = record.tool_calls;
      const call = Array.isArray(calls) && calls.length === 1 ? agyRecord(calls[0]) : null;
      const args = agyRecord(call?.args);
      if (record.source !== "MODEL" || record.type !== "PLANNER_RESPONSE" || record.status !== "DONE" ||
          call?.name !== lookup.toolName || !args || !corroboratesSummary(lookup, args)) {
        invalid = true; return false;
      }
      found = args;
      return true;
    }, options.signal);
  return scanned && !invalid ? found : null;
};

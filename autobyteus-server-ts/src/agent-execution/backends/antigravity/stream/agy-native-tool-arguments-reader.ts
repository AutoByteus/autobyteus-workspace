import { isDeepStrictEqual } from "node:util";
import { agyRecord } from "./agy-stream-message.js";
import { identifyAgyToolCall } from "./agy-transcript-step.js";

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
 * The call's full arguments, from its call in the planner row of its batch (one call or several parallel calls: `identifyAgyToolCall`),
 * under the typed agreement with every stream summary field. Internal source changes or ambiguous evidence yield null, never guessed inputs.
 */
export const readAgyNativeToolArguments = async (
  conversationId: string, lookup: AgyNativeToolArgumentLookup,
  options: { signal?: AbortSignal; brainRoot?: string } = {},
): Promise<Record<string, unknown> | null> => {
  if (!agyRecord(lookup.summary)) return null;
  const identified = await identifyAgyToolCall(conversationId, lookup, options);
  const args = identified.status === "identified" ? agyRecord(identified.call.args) : null;
  return args && corroboratesSummary(lookup, args) ? args : null;
};

import { splitLines } from "./output-shortener.js";
import { compactJson } from "./result-envelopes.js";
import type { BodyPart, BuiltInLine, RecordedCall } from "./runtimes/runtime-translation.js";
import { NO_RESULT, type NormalizedToolResult } from "./tool-outcome.js";

/**
 * Contract §5, the generic rule for every tool that is not one of the run's built-ins:
 * `Tool: <name as recorded> <key>=<value> …`, long arguments on their own lines, then the result.
 */

const INLINE_VALUE_CHARS = 200;

const cutJson = (json: string): string => {
  const characters = Array.from(json);
  return characters.length <= INLINE_VALUE_CHARS
    ? json
    : `${characters.slice(0, INLINE_VALUE_CHARS).join("")}…[+${characters.length - INLINE_VALUE_CHARS} chars]`;
};

const isInlineString = (value: string): boolean =>
  splitLines(value).length <= 1 && Array.from(value).length <= INLINE_VALUE_CHARS;

/** Arguments in recorded order: inline `key=value` pairs, and long or multi-line strings as blocks. */
const formatArguments = (args: Readonly<Record<string, unknown>>): { inline: string[]; blocks: BodyPart[] } => {
  const inline: string[] = [];
  const blocks: BodyPart[] = [];
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined) continue;
    if (typeof value === "string") {
      if (isInlineString(value)) inline.push(`${key}=${JSON.stringify(value)}`);
      else blocks.push({ kind: "argument", key, text: value });
    } else if (value === null || typeof value === "number" || typeof value === "boolean") {
      inline.push(`${key}=${String(value)}`);
    } else {
      inline.push(`${key}=${cutJson(compactJson(value))}`);
    }
  }
  return { inline, blocks };
};

/** `server` is set for a server-qualified name: `Tool: <tool> (via <server>) …`. */
export const genericToolLine = (
  call: RecordedCall,
  result: NormalizedToolResult | null,
  server: string | null = null,
): BuiltInLine => {
  const name = call.name.trim() ? call.name : "(name not recorded)";
  const { inline, blocks } = formatArguments(call.args);
  const recorded = result ?? NO_RESULT;
  const output = recorded.output !== null && recorded.output.length > 0 ? recorded.output : null;
  const resultPart: BodyPart[] = output === null ? []
    : blocks.length ? [{ kind: "labeled_result", text: output }] : [{ kind: "output", text: output }];
  return {
    head: [`Tool: ${name}`, ...(server ? [`(via ${server})`] : []), ...inline].join(" "),
    outcome: recorded.outcome,
    parts: [...blocks, ...resultPart],
  };
};

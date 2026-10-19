import { splitLines } from "./output-shortener.js";
import type { BodyPart, BuiltInLine } from "./runtimes/runtime-translation.js";
import type { TextDiff } from "./text-diff.js";
import { NO_RESULT, OK, type NormalizedToolResult, type ToolOutcome } from "./tool-outcome.js";

/**
 * Contract §2 action lines shared by every runtime translation, so equivalent built-in calls
 * from different runtimes give the same journal line.
 */

export const pathText = (path: string | null): string => path ?? "(path not recorded)";

const withNotes = (text: string, notes: readonly string[]): string =>
  [text, ...notes.map((note) => `(${note})`)].join(" ");

const outputParts = (output: string | null): BodyPart[] =>
  output !== null && output.length > 0 ? [{ kind: "output", text: output }] : [];

/** `Command: <command> (in <cwd>) (background)`, with further command lines and the output below. */
export const commandLine = (
  command: string | null,
  notes: readonly string[],
  result: NormalizedToolResult | null,
): BuiltInLine => {
  const lines = command === null ? [] : splitLines(command);
  const first = lines[0] ?? "(command not recorded)";
  const parts: BodyPart[] = lines.length > 1 ? [{ kind: "command", lines: lines.slice(1) }] : [];
  const normalized = result ?? NO_RESULT;
  return { head: withNotes(`Command: ${first}`, notes), outcome: normalized.outcome, parts: [...parts, ...outputParts(normalized.output)] };
};

/**
 * Outcome of a write or edit: a runtime's own success confirmation is not shown (`→ ok`), a
 * failure keeps its text.
 */
const changeOutcome = (result: NormalizedToolResult | null): { outcome: ToolOutcome; parts: BodyPart[] } => {
  if (!result) return { outcome: NO_RESULT.outcome, parts: [] };
  if (result.outcome.kind === "ok") return { outcome: OK, parts: [] };
  return { outcome: result.outcome, parts: outputParts(result.output) };
};

/** `Write file: <path> (<n> lines)` with the first lines of the content. */
export const writeFileLine = (
  path: string | null,
  content: string | null,
  notes: readonly string[],
  result: NormalizedToolResult | null,
): BuiltInLine => {
  const { outcome, parts } = changeOutcome(result);
  if (content === null) {
    return { head: withNotes(`Write file: ${pathText(path)}`, [...notes, "content not recorded"]), outcome, parts };
  }
  return {
    head: withNotes(`Write file: ${pathText(path)} (${splitLines(content).length} lines)`, notes),
    outcome,
    parts: [{ kind: "content", text: content }, ...parts],
  };
};

/** `Edit file: <path> (+<added> −<removed>)` with the diff. */
export const editFileLine = (
  path: string | null,
  diff: TextDiff | null,
  notes: readonly string[],
  result: NormalizedToolResult | null,
): BuiltInLine => {
  const { outcome, parts } = changeOutcome(result);
  if (diff === null) {
    return { head: withNotes(`Edit file: ${pathText(path)}`, [...notes, "change not recorded"]), outcome, parts };
  }
  return {
    head: withNotes(`Edit file: ${pathText(path)} (+${diff.added} −${diff.removed})`, notes),
    outcome,
    parts: [{ kind: "diff", lines: diff.lines }, ...parts],
  };
};

/** `Search web: "<query>"` (several queries comma-separated) with the result. */
export const searchWebLine = (queries: readonly string[], result: NormalizedToolResult | null): BuiltInLine => {
  const normalized = result ?? NO_RESULT;
  const head = queries.length
    ? `Search web: ${queries.map((query) => JSON.stringify(query)).join(", ")}`
    : "Search web: (query not recorded)";
  return { head, outcome: normalized.outcome, parts: outputParts(normalized.output) };
};

/** A line whose output is shown as recorded (converted commands such as `cat`, `grep`, `curl`). */
export const convertedCommandLine = (command: string, result: NormalizedToolResult | null): BuiltInLine =>
  commandLine(command, [], result);

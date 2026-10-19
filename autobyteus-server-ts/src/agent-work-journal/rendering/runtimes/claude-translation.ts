import {
  asInteger,
  asText,
  catCommand,
  curlCommand,
  isTrue,
  offsetLimitRange,
  ripgrepCommand,
  shellQuoted,
  shellWord,
  toCatNumberedLinesLoose,
} from "../command-text.js";
import { commandLine, convertedCommandLine, editFileLine, searchWebLine, writeFileLine } from "../journal-actions.js";
import { splitLines } from "../output-shortener.js";
import { normalizeRecordedResult } from "../result-envelopes.js";
import { diffTexts, type TextDiff } from "../text-diff.js";
import type { NormalizedToolResult } from "../tool-outcome.js";
import type { BuiltInConverter, RecordedResult, RuntimeTranslation } from "./runtime-translation.js";

/** Claude Agent SDK: contract §4 (Claude table) and §6 (Claude runtime texts). */

const PERSISTED_OUTPUT = /<persisted-output>\s*Output too large \(([^)]*)\)\.\s*Full output saved to: ([^\n]+)\n+Preview \([^)]*\):\n([\s\S]*?)\s*<\/persisted-output>/;
const TOOL_USE_ERROR = /<tool_use_error>([\s\S]*?)<\/tool_use_error>/g;
const FILE_STATE_NOTE = / ?\(file state is current in your context — no need to Read it back\)/g;
const USER_REJECTION = "The user doesn't want to proceed with this tool use";
const EXIT_CODE_PREFIX = /^Exit code (-?\d+)\n?([\s\S]*)$/;

const normalizeClaudeText = (text: string): string => {
  let normalized = text.replace(PERSISTED_OUTPUT, (_match, size: string, path: string, preview: string) =>
    `${preview.replace(/\n?\.\.\.$/, "")}\n…[full output (${size}) was saved outside the raw trace: ${path.trim()}]`);
  normalized = normalized.replace(TOOL_USE_ERROR, (_match, inner: string) => inner);
  return normalized.replace(FILE_STATE_NOTE, "");
};

const normalizeClaudeResult = (result: RecordedResult): NormalizedToolResult => normalizeRecordedResult(result, {
  normalizeText: normalizeClaudeText,
  interpretError: (error) => error.includes(USER_REJECTION) ? { kind: "rejected" } : null,
});

const normalized = (result: RecordedResult | null): NormalizedToolResult | null =>
  result ? normalizeClaudeResult(result) : null;

/** Bash: an error starting `Exit code <n>` is that exit, with the rest as output. */
const withExitCode = (result: NormalizedToolResult | null): NormalizedToolResult | null => {
  if (!result || result.outcome.kind !== "failed" || !result.outcome.error) return result;
  const match = EXIT_CODE_PREFIX.exec(result.outcome.error);
  if (!match) return result;
  const rest = [match[2], result.output].filter((part): part is string => !!part && part.length > 0).join("\n");
  return { outcome: { kind: "exit", code: Number(match[1]) }, output: rest.length ? rest : null };
};

const bash: BuiltInConverter = (call, result) => commandLine(
  asText(call.args.command),
  isTrue(call.args.run_in_background) ? ["background"] : [],
  withExitCode(normalized(result)),
);

const monitor: BuiltInConverter = (call, result) =>
  commandLine(asText(call.args.command), ["background"], normalized(result));

/** Read: Claude numbers every line, so the command is `cat -n`, in the common number layout. */
const read: BuiltInConverter = (call, result) => {
  const command = catCommand(asText(call.args.file_path) ?? "(path not recorded)", true,
    offsetLimitRange(call.args.offset, call.args.limit));
  const readResult = normalized(result);
  const output = readResult?.output ?? null;
  return convertedCommandLine(command, readResult && {
    ...readResult,
    output: output === null ? null : toCatNumberedLinesLoose(splitLines(output)).join("\n"),
  });
};

const grep: BuiltInConverter = (call, result) =>
  convertedCommandLine(ripgrepCommand(call.args, "files_with_matches"), normalized(result));

const glob: BuiltInConverter = (call, result) => convertedCommandLine(
  `find ${shellWord(asText(call.args.path) ?? ".")} -path ${shellQuoted(typeof call.args.pattern === "string" ? call.args.pattern : "")}`,
  normalized(result),
);

/** WebFetch records Claude's summary of the page, not the page (D3). */
const webFetch: BuiltInConverter = (call, result) => {
  const prompt = asText(call.args.prompt);
  const offset = asInteger(call.args.offset);
  const notes = [
    ...(prompt ? [`(summarized: ${JSON.stringify(prompt)})`] : []),
    ...(offset !== null ? [`(from offset ${offset})`] : []),
  ];
  return convertedCommandLine([curlCommand(asText(call.args.url)), ...notes].join(" "), normalized(result));
};

const write: BuiltInConverter = (call, result) => writeFileLine(
  asText(call.args.file_path),
  typeof call.args.content === "string" ? call.args.content : null,
  [],
  normalized(result),
);

const editDiff = (edit: Readonly<Record<string, unknown>>): TextDiff | null =>
  typeof edit.old_string === "string" && typeof edit.new_string === "string"
    ? diffTexts(edit.old_string, edit.new_string)
    : null;

const combineDiffs = (diffs: readonly TextDiff[]): TextDiff => ({
  lines: diffs.flatMap((diff, index) => index === 0 ? diff.lines : ["…", ...diff.lines]),
  added: diffs.reduce((sum, diff) => sum + diff.added, 0),
  removed: diffs.reduce((sum, diff) => sum + diff.removed, 0),
});

/** Edit, and MultiEdit's list of edits (one diff, edits separated by `…`). */
const edit: BuiltInConverter = (call, result) => {
  const edits = Array.isArray(call.args.edits)
    ? call.args.edits.filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    : [call.args];
  const diffs = edits.map(editDiff);
  const diff = diffs.length && diffs.every((item): item is TextDiff => item !== null) ? combineDiffs(diffs) : null;
  const allOccurrences = edits.some((item) => item.replace_all === true);
  return editFileLine(asText(call.args.file_path), diff, allOccurrences ? ["all occurrences"] : [], normalized(result));
};

const notebookEdit: BuiltInConverter = (call, result) => {
  const cell = asText(call.args.cell_id);
  const source = typeof call.args.new_source === "string" ? call.args.new_source : null;
  return editFileLine(
    asText(call.args.notebook_path),
    source === null ? null : diffTexts("", source),
    cell ? [`notebook cell ${cell}`] : ["notebook cell"],
    normalized(result),
  );
};

const webSearch: BuiltInConverter = (call, result) => {
  const query = asText(call.args.query);
  return searchWebLine(query ? [query] : [], normalized(result));
};

export const claudeTranslation: RuntimeTranslation = Object.freeze({
  label: "Claude",
  builtInTools: new Map<string, BuiltInConverter>([
    ["Bash", bash],
    ["Monitor", monitor],
    ["Read", read],
    ["Grep", grep],
    ["Glob", glob],
    ["WebFetch", webFetch],
    ["Write", write],
    ["Edit", edit],
    ["MultiEdit", edit],
    ["NotebookEdit", notebookEdit],
    ["WebSearch", webSearch],
  ]),
  normalizeResult: normalizeClaudeResult,
});

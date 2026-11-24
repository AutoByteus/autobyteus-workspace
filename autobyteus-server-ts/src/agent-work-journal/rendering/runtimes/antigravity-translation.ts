import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import {
  asInteger,
  asText,
  catCommand,
  curlCommand,
  globList,
  isTrue,
  shellQuoted,
  shellWord,
  startEndRange,
  toCatNumberedLinesLoose,
} from "../command-text.js";
import { commandLine, convertedCommandLine, editFileLine, searchWebLine, writeFileLine } from "../journal-actions.js";
import { interruptedFromError, normalizeRecordedResult } from "../result-envelopes.js";
import { diffTexts } from "../text-diff.js";
import { isAntigravityMcpSchemaRead } from "./antigravity-mcp-schema-read.js";
import { okWith, type NormalizedToolResult } from "../tool-outcome.js";
import type {
  BuiltInConverter,
  QualifiedToolName,
  RecordedCall,
  RecordedResult,
  RuntimeTranslation,
} from "./runtime-translation.js";

/** Antigravity CLI: contract §4 (Antigravity table) and §6 (AGY envelope and texts). */

/** Notes AGY adds to its calls; they are not shown. */
const AGY_CALL_NOTES = new Set(["toolAction", "toolSummary", "WaitMsBeforeAsync"]);
const TRUNCATED = /<truncated (\d+) lines>/g;
const SIZE_ONLY = /^(\d+) lines, (\d+) bytes$/;
/**
 * AGY records a long result as this runtime sentence, naming the file that holds the full output, then a preview (autobyteus-561).
 * Anchored at the start of the text: any other wording, or the sentence quoted inside other text, stays as recorded.
 */
const SPILLED_OUTPUT = /^The tool's output was truncated due to being too long\. You can find the full output in a file at file:\/\/([^\n]+)\n+Here is a preview with the middle of the output truncated:\n?([\s\S]*)$/;

/** The timestamp lines AGY puts first in a result (autobyteus-377); they are not the tool's output. The raw trace keeps them. */
const AGY_RESULT_HEADER = /^(?:(?:Created At|Completed At):[^\n]*\n)+\n?/;
const withoutHeader = (text: string): string => text.replace(AGY_RESULT_HEADER, "");

/** The preview, then the marker every runtime's spill gets (Claude's `PERSISTED_OUTPUT` has the same words, with a size AGY does not give). */
const normalizeAgyText = (text: string): string => withoutHeader(text)
  .replace(SPILLED_OUTPUT, (_match, path: string, preview: string) =>
    `${withoutHeader(preview).trimEnd()}\n…[full output was saved outside the raw trace: ${path.trim()}]`)
  .replace(TRUNCATED, (_match, count: string) => `…[${count} lines not recorded]`);

const normalizeAgyResult = (result: RecordedResult): NormalizedToolResult => normalizeRecordedResult(result, {
  normalizeText: normalizeAgyText,
  interpretError: interruptedFromError,
});

const normalized = (result: RecordedResult | null): NormalizedToolResult | null =>
  result ? normalizeAgyResult(result) : null;

const withoutNotes = (args: Readonly<Record<string, unknown>>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(args).filter(([key]) => !AGY_CALL_NOTES.has(key)));

/** Older records hold `call_mcp_tool {ServerName, ToolName, Arguments}`; they read as the inner call. */
const unwrapCall = (call: RecordedCall): RecordedCall => {
  if (call.name === "call_mcp_tool" && typeof call.args.ToolName === "string" && call.args.ToolName.trim()) {
    const inner = call.args.Arguments;
    return {
      name: call.args.ToolName,
      args: inner && typeof inner === "object" && !Array.isArray(inner) ? inner as Record<string, unknown> : {},
    };
  }
  return { name: call.name, args: withoutNotes(call.args) };
};

/** AGY's `run_command` result: its exit code and the output after a label (autobyteus-377). Another wording is shown as recorded. */
const RUN_COMMAND_RESULT = /^Command exited with code (-?\d+)\.\n+Command output:\n?([\s\S]*)$/;

/** The exit code as the outcome (`ok` for 0), with the command's output alone. */
const withExitCode = (result: NormalizedToolResult | null): NormalizedToolResult | null => {
  if (!result || result.outcome.kind !== "ok" || result.output === null) return result;
  const match = RUN_COMMAND_RESULT.exec(result.output);
  if (!match) return result;
  const code = Number(match[1]);
  const output = match[2]!.trimEnd();
  return { outcome: code === 0 ? result.outcome : { kind: "exit", code }, output: output.length ? output : null };
};

const runCommand: BuiltInConverter = (call, result) => {
  const cwd = asText(call.args.Cwd);
  const background = isTrue(call.args.IsDaemon) || isTrue(call.args.RunPersistent);
  return commandLine(asText(call.args.CommandLine), [...(cwd ? [`in ${cwd}`] : []), ...(background ? ["background"] : [])],
    withExitCode(normalized(result)));
};

/** AGY's own lines before the numbered file lines of a read (autobyteus-377). */
const READ_WRAPPER_LINE = /^(?:Showing lines\b.*|File Path:.*|Total Lines:.*|Total Bytes:.*|The following code has been modified to include a line number.*|\s*)$/;

/** The numbered lines of a read in the common `cat -n` layout, without AGY's wrapper lines. */
const readLines = (output: string): string => {
  const lines = output.split("\n");
  let first = 0;
  while (first < lines.length && READ_WRAPPER_LINE.test(lines[first]!)) first += 1;
  return toCatNumberedLinesLoose(lines.slice(first)).join("\n");
};

/**
 * The file read is `view_file {AbsolutePath}` in older records and `read_file {Path}` in current ones (autobyteus-561). A record that
 * holds the content shows its lines; a record that holds only the size says the content was not recorded (autobyteus-377).
 */
const readFile: BuiltInConverter = (call, result) => {
  const offset = asInteger(call.args.ContentOffset);
  const command = catCommand(asText(call.args.AbsolutePath) ?? asText(call.args.Path) ?? "(path not recorded)", false,
    startEndRange(call.args.StartLine, call.args.EndLine)) + (offset !== null ? ` (from byte ${offset})` : "");
  const read = normalized(result);
  const sizeOnly = read?.outcome.kind === "ok" && read.output !== null ? SIZE_ONLY.exec(read.output.trim()) : null;
  if (sizeOnly) return convertedCommandLine(command,
    { outcome: okWith(`content not recorded: ${sizeOnly[1]} lines, ${sizeOnly[2]} bytes`), output: null });
  return convertedCommandLine(command, read && read.output !== null ? { ...read, output: readLines(read.output) } : read);
};

const includeOptions = (value: unknown): string[] => globList(value).map((glob) => glob.startsWith("!")
  ? `--exclude=${shellQuoted(glob.slice(1))}`
  : `--include=${shellQuoted(glob)}`);

/** AGY prints `file:text` without line numbers; its query is literal unless `IsRegex`. */
const grepSearch: BuiltInConverter = (call, result) => {
  const options = ["-r", ...(isTrue(call.args.CaseInsensitive) ? ["-i"] : []), isTrue(call.args.IsRegex) ? "-E" : "-F",
    ...includeOptions(call.args.Includes)];
  const query = typeof call.args.Query === "string" ? call.args.Query : "";
  return convertedCommandLine(
    `grep ${options.join(" ")} ${shellQuoted(query)} ${shellWord(asText(call.args.SearchPath) ?? ".")}`,
    normalized(result),
  );
};

const FIND_TYPES: Readonly<Record<string, string>> = { file: "f", directory: "d", dir: "d", f: "f", d: "d" };

const findByName: BuiltInConverter = (call, result) => {
  const parts = [`find ${shellWord(asText(call.args.SearchDirectory) ?? ".")}`];
  const pattern = asText(call.args.Pattern);
  if (pattern) parts.push(`-name ${shellQuoted(pattern)}`);
  const type = asText(call.args.Type);
  if (type && FIND_TYPES[type.toLowerCase()]) parts.push(`-type ${FIND_TYPES[type.toLowerCase()]}`);
  const extensions = globList(call.args.Extensions).map((extension) => `-name ${shellQuoted(`*.${extension.replace(/^\./, "")}`)}`);
  if (extensions.length === 1) parts.push(extensions[0]!);
  if (extensions.length > 1) parts.push(`\\( ${extensions.join(" -o ")} \\)`);
  for (const exclude of globList(call.args.Excludes)) parts.push(`-not -name ${shellQuoted(exclude)}`);
  return convertedCommandLine(parts.join(" "), normalized(result));
};

/** AGY marks folders with a trailing `/`, as `ls -p` does. */
const listDir: BuiltInConverter = (call, result) =>
  convertedCommandLine(`ls -p ${shellWord(asText(call.args.DirectoryPath) ?? ".")}`, normalized(result));

const writeToFile: BuiltInConverter = (call, result) => writeFileLine(
  asText(call.args.TargetFile),
  typeof call.args.CodeContent === "string" ? call.args.CodeContent : null,
  isTrue(call.args.Append) ? ["append"] : [],
  normalized(result),
);

/** The current CLI's `write_file {Path, Content, Append}`. */
const writeFile: BuiltInConverter = (call, result) => writeFileLine(
  asText(call.args.Path),
  typeof call.args.Content === "string" ? call.args.Content : null,
  isTrue(call.args.Append) ? ["append"] : [],
  normalized(result),
);

const replaceFileContent: BuiltInConverter = (call, result) => editFileLine(
  asText(call.args.TargetFile),
  typeof call.args.TargetContent === "string" && typeof call.args.ReplacementContent === "string"
    ? diffTexts(call.args.TargetContent, call.args.ReplacementContent)
    : null,
  [],
  normalized(result),
);

/** The current CLI's `edit_file {Path, Target, Replacement}`. */
const editFile: BuiltInConverter = (call, result) => editFileLine(
  asText(call.args.Path),
  typeof call.args.Target === "string" && typeof call.args.Replacement === "string"
    ? diffTexts(call.args.Target, call.args.Replacement)
    : null,
  [],
  normalized(result),
);

const readUrlContent: BuiltInConverter = (call, result) =>
  convertedCommandLine(curlCommand(asText(call.args.Url)), normalized(result));

const searchWeb: BuiltInConverter = (call, result) => {
  const query = asText(call.args.query);
  return searchWebLine(query ? [query] : [], normalized(result));
};

/** A shell tool recorded under the name `Bash`: the same command line as `run_command`. */
const bash: BuiltInConverter = (call, result) => commandLine(asText(call.args.command), [], normalized(result));

/** Antigravity qualifies another server's tool as `mcp__<server>__<tool>`. */
const QUALIFIED = /^mcp__(.+?)__(.+)$/;
const splitToolName = (name: string): QualifiedToolName | null => {
  const match = QUALIFIED.exec(name);
  return match ? { server: match[1]!, tool: match[2]! } : null;
};

export const antigravityTranslation: RuntimeTranslation = Object.freeze({
  label: agentRuntimeName(RuntimeKind.ANTIGRAVITY_CLI),
  builtInTools: new Map<string, BuiltInConverter>([
    ["run_command", runCommand],
    ["view_file", readFile],
    ["read_file", readFile],
    ["grep_search", grepSearch],
    ["find_by_name", findByName],
    ["list_dir", listDir],
    ["write_to_file", writeToFile],
    ["replace_file_content", replaceFileContent],
    ["write_file", writeFile],
    ["edit_file", editFile],
    ["read_url_content", readUrlContent],
    ["search_web", searchWeb],
    ["Bash", bash],
  ]),
  normalizeResult: normalizeAgyResult,
  unwrapCall,
  isRuntimePlumbing: isAntigravityMcpSchemaRead,
  splitToolName,
});

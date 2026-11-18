import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import {
  asInteger,
  asText,
  catCommand,
  globList,
  isTrue,
  shellQuoted,
  shellWord,
  startEndRange,
} from "../command-text.js";
import { commandLine, convertedCommandLine, editFileLine, writeFileLine } from "../journal-actions.js";
import { interruptedFromError, normalizeRecordedResult } from "../result-envelopes.js";
import { diffTexts } from "../text-diff.js";
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

const normalizeAgyResult = (result: RecordedResult): NormalizedToolResult => normalizeRecordedResult(result, {
  normalizeText: (text) => text.replace(TRUNCATED, (_match, count: string) => `…[${count} lines not recorded]`),
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

const runCommand: BuiltInConverter = (call, result) => {
  const cwd = asText(call.args.Cwd);
  const background = isTrue(call.args.IsDaemon) || isTrue(call.args.RunPersistent);
  return commandLine(asText(call.args.CommandLine), [...(cwd ? [`in ${cwd}`] : []), ...(background ? ["background"] : [])],
    normalized(result));
};

/** AGY usually records only the size of a read: the line says the content was not recorded. */
const viewFile: BuiltInConverter = (call, result) => {
  const offset = asInteger(call.args.ContentOffset);
  const command = catCommand(asText(call.args.AbsolutePath) ?? "(path not recorded)", false,
    startEndRange(call.args.StartLine, call.args.EndLine)) + (offset !== null ? ` (from byte ${offset})` : "");
  const read = normalized(result);
  const sizeOnly = read?.outcome.kind === "ok" && read.output !== null ? SIZE_ONLY.exec(read.output.trim()) : null;
  return convertedCommandLine(command, sizeOnly
    ? { outcome: okWith(`content not recorded: ${sizeOnly[1]} lines, ${sizeOnly[2]} bytes`), output: null }
    : read);
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

const replaceFileContent: BuiltInConverter = (call, result) => editFileLine(
  asText(call.args.TargetFile),
  typeof call.args.TargetContent === "string" && typeof call.args.ReplacementContent === "string"
    ? diffTexts(call.args.TargetContent, call.args.ReplacementContent)
    : null,
  [],
  normalized(result),
);

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
    ["view_file", viewFile],
    ["grep_search", grepSearch],
    ["find_by_name", findByName],
    ["list_dir", listDir],
    ["write_to_file", writeToFile],
    ["replace_file_content", replaceFileContent],
    ["Bash", bash],
  ]),
  normalizeResult: normalizeAgyResult,
  unwrapCall,
  splitToolName,
});

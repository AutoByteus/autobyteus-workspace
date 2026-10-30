import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import {
  asText,
  catCommand,
  curlCommand,
  offsetLimitRange,
  ripgrepCommand,
  shellWord,
  toCatNumberedLines,
} from "../command-text.js";
import { commandLine, convertedCommandLine, editFileLine, searchWebLine, writeFileLine } from "../journal-actions.js";
import { splitLines } from "../output-shortener.js";
import { normalizeRecordedResult } from "../result-envelopes.js";
import { diffTexts } from "../text-diff.js";
import type { NormalizedToolResult } from "../tool-outcome.js";
import type { BuiltInConverter, RecordedResult, RuntimeTranslation } from "./runtime-translation.js";

/** Grok Build (default toolset): contract §4 (Grok table). */

const EXIT_CODE_SUFFIX = /^([\s\S]*?)\n?Exit code: (-?\d+)\s*$/;

const normalized = (result: RecordedResult | null): NormalizedToolResult | null =>
  result ? normalizeRecordedResult(result) : null;

/** A failure's error ends with `Exit code: <n>`: that exit, with the rest as output. */
const withExitCode = (result: NormalizedToolResult | null): NormalizedToolResult | null => {
  if (!result || result.outcome.kind !== "failed" || !result.outcome.error) return result;
  const match = EXIT_CODE_SUFFIX.exec(result.outcome.error);
  if (!match) return result;
  const rest = [match[1], result.output].filter((part): part is string => !!part && part.length > 0).join("\n");
  return { outcome: { kind: "exit", code: Number(match[2]) }, output: rest.length ? rest : null };
};

const filePath = (args: Readonly<Record<string, unknown>>): string | null =>
  asText(args.file_path) ?? asText(args.path) ?? asText(args.target_file);

const runBash: BuiltInConverter = (call, result) => {
  const cwd = asText(call.args.cwd);
  return commandLine(asText(call.args.command), cwd ? [`in ${cwd}`] : [], withExitCode(normalized(result)));
};

/** `cat <path>`, or `cat -n` in the common number layout when the output is numbered. */
const readFile: BuiltInConverter = (call, result) => {
  const read = normalized(result);
  const numbered = read?.output ? toCatNumberedLines(splitLines(read.output)) : null;
  const command = catCommand(filePath(call.args) ?? "(path not recorded)", numbered !== null,
    offsetLimitRange(call.args.offset, call.args.limit));
  return convertedCommandLine(command, read && numbered ? { ...read, output: numbered.join("\n") } : read);
};

const grep: BuiltInConverter = (call, result) => convertedCommandLine(ripgrepCommand(call.args, "content"), normalized(result));

/** Grok prints a tree, shown as recorded. */
const listDir: BuiltInConverter = (call, result) => convertedCommandLine(
  `ls ${shellWord(asText(call.args.target_directory) ?? asText(call.args.path) ?? ".")}`,
  normalized(result),
);

const webFetch: BuiltInConverter = (call, result) =>
  convertedCommandLine(curlCommand(asText(call.args.url)), normalized(result));

const writeFile: BuiltInConverter = (call, result) => writeFileLine(
  filePath(call.args),
  typeof call.args.content === "string" ? call.args.content : null,
  [],
  normalized(result),
);

const editFile: BuiltInConverter = (call, result) => editFileLine(
  filePath(call.args),
  typeof call.args.old_string === "string" && typeof call.args.new_string === "string"
    ? diffTexts(call.args.old_string, call.args.new_string)
    : null,
  [],
  normalized(result),
);

const webSearch: BuiltInConverter = (call, result) => {
  const query = asText(call.args.query);
  return searchWebLine(query ? [query] : [], normalized(result));
};

export const grokTranslation: RuntimeTranslation = Object.freeze({
  label: agentRuntimeName(RuntimeKind.GROK_BUILD),
  builtInTools: new Map<string, BuiltInConverter>([
    ["run_bash", runBash],
    ["read_file", readFile],
    ["grep", grep],
    ["list_dir", listDir],
    ["web_fetch", webFetch],
    ["write_file", writeFile],
    ["edit_file", editFile],
    ["web_search", webSearch],
  ]),
  normalizeResult: (result: RecordedResult) => normalizeRecordedResult(result),
});

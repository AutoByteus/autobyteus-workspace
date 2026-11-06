import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import {
  asText,
  catCommand,
  curlCommand,
  offsetLimitRange,
  ripgrepCommand,
  shellQuoted,
  shellWord,
  toCatNumberedLines,
} from "../command-text.js";
import { commandLine, convertedCommandLine, editFileLine, loadSkillLine, searchWebLine, writeFileLine } from "../journal-actions.js";
import { splitLines } from "../output-shortener.js";
import { normalizeRecordedResult } from "../result-envelopes.js";
import { diffTexts } from "../text-diff.js";
import type { NormalizedToolResult } from "../tool-outcome.js";
import type { BuiltInConverter, RecordedResult, RuntimeTranslation } from "./runtime-translation.js";

/**
 * DeepSeek Harness (dsh's ACP profile): its tools as the session recorded them, `bash`, `write`, `edit` and
 * `apply_patch` already under `run_bash`, `write_file` and `edit_file` (the dsh tool projection).
 */

const EXIT_CODE_SUFFIX = /^([\s\S]*?)\n?Exit code: (-?\d+)\s*$/;

const normalized = (result: RecordedResult | null): NormalizedToolResult | null =>
  result ? normalizeRecordedResult(result) : null;

/** A failure's error ends with `Exit code: <n>` (the projection's form): that exit, with the rest as output. */
const withExitCode = (result: NormalizedToolResult | null): NormalizedToolResult | null => {
  if (!result || result.outcome.kind !== "failed" || !result.outcome.error) return result;
  const match = EXIT_CODE_SUFFIX.exec(result.outcome.error);
  if (!match) return result;
  const rest = [match[1], result.output].filter((part): part is string => !!part && part.length > 0).join("\n");
  return { outcome: { kind: "exit", code: Number(match[2]) }, output: rest.length ? rest : null };
};

const filePath = (args: Readonly<Record<string, unknown>>): string | null => asText(args.file_path) ?? asText(args.path);

const runBash: BuiltInConverter = (call, result) => {
  const cwd = asText(call.args.cwd);
  return commandLine(asText(call.args.command), cwd ? [`in ${cwd}`] : [], withExitCode(normalized(result)));
};

/** dsh's read result wraps the numbered lines in `<content>…</content>` with an end-of-file note. */
const readContentLines = (output: string): string[] => {
  const content = /<content>\n?([\s\S]*?)\n?<\/content>/.exec(output)?.[1] ?? output;
  return splitLines(content).filter((line) => !/^\(End of file - total \d+ lines\)$/.test(line));
};

/** `cat -n <path>` with dsh's numbered lines in the common layout. */
const read: BuiltInConverter = (call, result) => {
  const recorded = normalized(result);
  const numbered = recorded?.output ? toCatNumberedLines(readContentLines(recorded.output)) : null;
  const command = catCommand(filePath(call.args) ?? "(path not recorded)", numbered !== null,
    offsetLimitRange(call.args.offset, call.args.limit));
  return convertedCommandLine(command, recorded && numbered ? { ...recorded, output: numbered.join("\n") } : recorded);
};

const grep: BuiltInConverter = (call, result) => convertedCommandLine(ripgrepCommand(call.args, "content"), normalized(result));

const glob: BuiltInConverter = (call, result) => convertedCommandLine(
  `find ${shellWord(asText(call.args.path) ?? ".")} -path ${shellQuoted(typeof call.args.pattern === "string" ? call.args.pattern : "")}`,
  normalized(result),
);

const webFetch: BuiltInConverter = (call, result) =>
  convertedCommandLine(curlCommand(asText(call.args.url)), normalized(result));

const webSearch: BuiltInConverter = (call, result) => {
  const query = asText(call.args.query);
  return searchWebLine(query ? [query] : [], normalized(result));
};

const writeFile: BuiltInConverter = (call, result) => writeFileLine(
  filePath(call.args),
  typeof call.args.content === "string" ? call.args.content : null,
  [],
  normalized(result),
);

/** `edit` carries the replaced and new text; `apply_patch` carries a patch, shown without a diff. */
const editFile: BuiltInConverter = (call, result) => editFileLine(
  filePath(call.args),
  typeof call.args.old_string === "string" && typeof call.args.new_string === "string"
    ? diffTexts(call.args.old_string, call.args.new_string)
    : null,
  [],
  normalized(result),
);

/** `skill` loads a skill's instructions: the same line as reading its file. */
const skill: BuiltInConverter = (call, result) =>
  loadSkillLine(asText(call.args.name) ?? "(name not recorded)", normalized(result));

export const deepSeekHarnessTranslation: RuntimeTranslation = Object.freeze({
  label: agentRuntimeName(RuntimeKind.DEEPSEEK_HARNESS),
  builtInTools: new Map<string, BuiltInConverter>([
    ["run_bash", runBash],
    ["read", read],
    ["grep", grep],
    ["glob", glob],
    ["web_fetch", webFetch],
    ["web_search", webSearch],
    ["write_file", writeFile],
    ["edit_file", editFile],
    ["skill", skill],
  ]),
  normalizeResult: (result: RecordedResult) => normalizeRecordedResult(result),
});

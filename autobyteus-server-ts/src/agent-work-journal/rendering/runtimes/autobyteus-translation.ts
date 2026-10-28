import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import path from "node:path";
import {
  asInteger,
  asText,
  catCommand,
  curlCommand,
  shellWord,
  startEndRange,
  toCatNumberedLinesLoose,
} from "../command-text.js";
import { commandLine, convertedCommandLine, editFileLine, searchWebLine, writeFileLine } from "../journal-actions.js";
import { splitLines } from "../output-shortener.js";
import { interruptedFromError, mediaMarker, normalizeRecordedResult } from "../result-envelopes.js";
import { readPatch } from "../text-diff.js";
import type { NormalizedToolResult } from "../tool-outcome.js";
import type { BuiltInConverter, RecordedResult, RuntimeTranslation } from "./runtime-translation.js";

/** AutoByteus native: contract §4 (AutoByteus table) and §6 (AutoByteus texts). */

const ERROR_PREFIX = /^Error executing tool '[^']*' \(ID: [^)]*\): (?:Error: )?/;
const XML_TOOL_BLOCK = /<tool name="[^"]*">[\s\S]*?<\/tool>/g;
const USER_REQUIREMENT_BANNER = /^\*\*\[User Requirement\]\*\*[ \t]*\n?/;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const normalizeAutobyteusResult = (result: RecordedResult): NormalizedToolResult => normalizeRecordedResult(result, {
  normalizeText: (text) => text.replace(ERROR_PREFIX, ""),
  interpretError: interruptedFromError,
});

const normalized = (result: RecordedResult | null): NormalizedToolResult | null =>
  result ? normalizeAutobyteusResult(result) : null;

/** A relative `path` with `base_dir` is the joined path. */
const joinedPath = (args: Readonly<Record<string, unknown>>, key: string): string | null => {
  const value = asText(args[key]);
  const baseDir = asText(args.base_dir);
  return value && baseDir && !path.isAbsolute(value) ? path.join(baseDir, value) : value;
};

/** `exitCode`, `timedOut`, then stdout and stderr (under a `stderr:` line). */
const runBashResult = (result: RecordedResult | null): NormalizedToolResult | null => {
  const value = asRecord(result?.value);
  if (!result || !value || result.error) return normalized(result);
  const stdout = typeof value.stdout === "string" ? value.stdout : "";
  const stderr = typeof value.stderr === "string" ? value.stderr : "";
  const output = [stdout.replace(/\n$/, ""), ...(stderr ? ["stderr:", stderr.replace(/\n$/, "")] : [])]
    .filter((part, index) => index > 0 || part.length > 0).join("\n");
  const exitCode = asInteger(value.exitCode);
  const outcome = value.timedOut === true
    ? { kind: "timed_out" as const }
    : exitCode !== null ? { kind: "exit" as const, code: exitCode } : { kind: "ok" as const, note: null };
  return { outcome, output: output.length ? output : null };
};

const runBash: BuiltInConverter = (call, result) => {
  const cwd = asText(call.args.cwd);
  return commandLine(asText(call.args.command), cwd ? [`in ${cwd}`] : [], runBashResult(result));
};

const startBackgroundProcess: BuiltInConverter = (call, result) => {
  const cwd = asText(call.args.cwd);
  const value = asRecord(result?.value);
  const recorded = result && value && !result.error
    ? { outcome: { kind: "started" as const, pid: asInteger(value.pid) }, output: null }
    : normalized(result);
  return commandLine(asText(call.args.command), [...(cwd ? [`in ${cwd}`] : []), "background"], recorded);
};

/** Recorded as `1: …`; shown as `cat -n` in the common number layout. */
const readFile: BuiltInConverter = (call, result) => {
  const numbered = call.args.include_line_numbers !== false;
  const command = catCommand(asText(call.args.path) ?? "(path not recorded)", numbered,
    startEndRange(call.args.start_line, call.args.end_line));
  const read = normalized(result);
  const output = read?.output ?? null;
  return convertedCommandLine(command, read && numbered && output !== null
    ? { ...read, output: toCatNumberedLinesLoose(splitLines(output)).join("\n") }
    : read);
};

/** The file was loaded for viewing: the media marker, as for a Claude image read. */
const readMediaFile: BuiltInConverter = (call, result) => {
  const value = asRecord(result?.value);
  const recorded = result && value && !result.error
    ? {
      outcome: { kind: "ok" as const, note: null },
      output: mediaMarker(
        asText(value.fileType) ?? asText(value.file_type) ?? "media",
        asText(value.mimeType) ?? asText(value.mime_type),
        asInteger(value.size) ?? asInteger(value.sizeBytes),
      ),
    }
    : normalized(result);
  return convertedCommandLine(`cat ${shellWord(asText(call.args.file_path) ?? "(path not recorded)")}`, recorded);
};

const readUrl: BuiltInConverter = (call, result) =>
  convertedCommandLine(curlCommand(asText(call.args.url)), normalized(result));

const writeFile: BuiltInConverter = (call, result) => writeFileLine(
  joinedPath(call.args, "path"),
  typeof call.args.content === "string" ? call.args.content : null,
  [],
  normalized(result),
);

const editFile: BuiltInConverter = (call, result) => editFileLine(
  joinedPath(call.args, "path"),
  typeof call.args.patch === "string" ? readPatch(call.args.patch) : null,
  [],
  normalized(result),
);

const searchWeb: BuiltInConverter = (call, result) => {
  const query = asText(call.args.query);
  return searchWebLine(query ? [query] : [], normalized(result));
};

export const autobyteusTranslation: RuntimeTranslation = Object.freeze({
  label: agentRuntimeName(RuntimeKind.AUTOBYTEUS),
  builtInTools: new Map<string, BuiltInConverter>([
    ["run_bash", runBash],
    ["start_background_process", startBackgroundProcess],
    ["read_file", readFile],
    ["read_url", readUrl],
    ["write_file", writeFile],
    ["edit_file", editFile],
    ["search_web", searchWeb],
    ["read_media_file", readMediaFile],
  ]),
  normalizeResult: normalizeAutobyteusResult,
  /** XML tool markup in agent text: the same call has its own line. */
  normalizeAgentText: (text: string) => {
    const withoutMarkup = text.replace(XML_TOOL_BLOCK, "");
    return withoutMarkup === text ? text : withoutMarkup.trim();
  },
  /** The legacy `**[User Requirement]**` banner (the web UI hides it too). */
  normalizeUserText: (text: string) => text.replace(USER_REQUIREMENT_BANNER, ""),
});

import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import { asText, curlCommand } from "../command-text.js";
import { commandLine, confirmedOutcome, editFileLine, searchWebLine, writeFileLine } from "../journal-actions.js";
import { normalizeRecordedResult } from "../result-envelopes.js";
import { readPatch } from "../text-diff.js";
import { NO_RESULT, okWith, type NormalizedToolResult } from "../tool-outcome.js";
import type {
  BuiltInConverter,
  BuiltInLine,
  QualifiedToolName,
  RecordedResult,
  RuntimeTranslation,
} from "./runtime-translation.js";

/** Codex App Server: contract §4 (Codex table). Codex records no exit code and no search results. */

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const SHELL_WRAPPER = /^(?:\/bin\/bash|bash|\/bin\/zsh|zsh)\s+-lc\s+([\s\S]+)$/;

const unquote = (value: string): string => {
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/'\\''/g, "'");
  }
  if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1).replace(/\\(["\\$`])/g, "$1");
  }
  return value;
};

/** `/bin/bash -lc '<cmd>'`, `bash -lc …` and `/bin/zsh -lc …` show only `<cmd>`. */
export const removeShellWrapper = (command: string): string => {
  const match = SHELL_WRAPPER.exec(command.trim());
  return match ? unquote(match[1]!.trim()) : command;
};

const normalize = (result: RecordedResult | null): NormalizedToolResult | null =>
  result ? normalizeRecordedResult(result) : null;

const DENIED_STATUSES = new Set(["declined", "denied", "rejected"]);

const runBash: BuiltInConverter = (call, result) => {
  const command = asText(call.args.command);
  const cwd = asText(call.args.cwd);
  const value = asRecord(result?.value);
  const status = typeof value?.status === "string" ? value.status : null;
  const recorded = result && status && DENIED_STATUSES.has(status)
    ? { outcome: { kind: "denied" as const, reason: typeof value?.reason === "string" ? value.reason : null }, output: null }
    : normalize(result);
  return commandLine(command === null ? null : removeShellWrapper(command), cwd ? [`in ${cwd}`] : [], recorded);
};

/**
 * A patch with `@@` hunks is an edit; a patch without hunks is the full content of a new file;
 * a record with only the path did not record the change.
 */
const editFile: BuiltInConverter = (call, result) => {
  const path = asText(call.args.path);
  const patch = typeof call.args.patch === "string" ? call.args.patch : null;
  const recorded = normalize(result);
  const failedBySuccessFlag = asRecord(result?.value)?.success === false;
  const outcome = recorded && failedBySuccessFlag
    ? { outcome: { kind: "failed" as const, error: null }, output: recorded.output }
    : recorded;
  if (patch === null) return editFileLine(path, null, [], outcome);
  const diff = readPatch(patch);
  return diff.hasHunks ? editFileLine(path, diff, [], outcome) : writeFileLine(path, patch, [], outcome);
};

const searchValue = (callArgs: Readonly<Record<string, unknown>>, resultValue: unknown, key: string): unknown =>
  callArgs[key] ?? asRecord(resultValue)?.[key];

/** Codex never records search results or page content. */
const searchOutcome = (result: RecordedResult | null, note: string): NormalizedToolResult => {
  if (!result) return NO_RESULT;
  const recorded = normalizeRecordedResult(result);
  const status = asRecord(result.value)?.status;
  if (recorded.outcome.kind !== "ok" || status === "failed" || status === "error") {
    return recorded.outcome.kind === "ok" ? { outcome: { kind: "failed", error: null }, output: recorded.output } : recorded;
  }
  return { outcome: okWith(note), output: null };
};

/** The query, queries and action come from the call, or from the result when the call has none. */
const searchWeb: BuiltInConverter = (call, result): BuiltInLine => {
  const actionType = asText(searchValue(call.args, result?.value, "action_type"));
  const query = asText(searchValue(call.args, result?.value, "query"));
  if (actionType === "openPage") {
    return commandLine(curlCommand(query ?? asText(searchValue(call.args, result?.value, "url"))), [],
      searchOutcome(result, "page content not recorded"));
  }
  if (actionType === "findInPage") {
    const pattern = asText(searchValue(call.args, result?.value, "pattern")) ?? query;
    const url = asText(searchValue(call.args, result?.value, "url")) ?? "(URL not recorded)";
    const line = searchWebLine([], searchOutcome(result, "results not recorded"));
    return { ...line, head: `Search web: find ${JSON.stringify(pattern ?? "")} in ${url}` };
  }
  const queriesValue = searchValue(call.args, result?.value, "queries");
  const queries = Array.isArray(queriesValue)
    ? queriesValue.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  return searchWebLine(queries.length ? queries : query ? [query] : [], searchOutcome(result, "results not recorded"));
};

/** `js` runs JavaScript in a computer-use environment: its title in the head, the code and the result below. */
const js: BuiltInConverter = (call, result) => {
  const title = asText(call.args.title);
  const recorded = normalize(result) ?? NO_RESULT;
  const code = asText(call.args.code);
  return {
    head: `Run JavaScript${title ? `: ${title}` : ""}`,
    outcome: recorded.outcome,
    parts: [
      ...(code ? [{ kind: "message" as const, text: code }] : []),
      ...(recorded.output ? [{ kind: "output" as const, text: recorded.output }] : []),
    ],
  };
};

const confirmed = (head: string, result: RecordedResult | null): BuiltInLine => {
  const { outcome, parts } = confirmedOutcome(normalize(result));
  return { head, outcome, parts };
};

const jsReset: BuiltInConverter = (_call, result) => confirmed("Reset JavaScript environment", result);

const jsAddNodeModuleDir: BuiltInConverter = (call, result) =>
  confirmed(`Add JavaScript module folder: ${asText(call.args.path) ?? "(path not recorded)"}`, result);

const speak: BuiltInConverter = (call, result) =>
  confirmed(`Speak: ${JSON.stringify(asText(call.args.text) ?? "")}${call.args.play === false || call.args.play === "false" ? " (not played)" : ""}`, result);

/** Codex qualifies another server's tool as `<server>.<tool>`. */
const QUALIFIED = /^([A-Za-z0-9_-]+)\.(.+)$/;
const splitToolName = (name: string): QualifiedToolName | null => {
  const match = QUALIFIED.exec(name);
  return match ? { server: match[1]!, tool: match[2]! } : null;
};

export const codexTranslation: RuntimeTranslation = Object.freeze({
  label: agentRuntimeName(RuntimeKind.CODEX_APP_SERVER),
  builtInTools: new Map<string, BuiltInConverter>([
    ["run_bash", runBash],
    ["edit_file", editFile],
    ["search_web", searchWeb],
    ["js", js],
    ["js_reset", jsReset],
    ["js_add_node_module_dir", jsAddNodeModuleDir],
    ["speak", speak],
  ]),
  normalizeResult: (result: RecordedResult) => normalizeRecordedResult(result),
  splitToolName,
});

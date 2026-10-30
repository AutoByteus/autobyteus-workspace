import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
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
import {
  backgroundOutputLine,
  commandLine,
  confirmedOutcome,
  convertedCommandLine,
  editFileLine,
  loadSkillLine,
  searchWebLine,
  stopBackgroundTaskLine,
  writeFileLine,
} from "../journal-actions.js";
import { splitLines } from "../output-shortener.js";
import { compactJson, normalizeRecordedResult } from "../result-envelopes.js";
import { diffTexts, type TextDiff } from "../text-diff.js";
import { NO_RESULT, type NormalizedToolResult } from "../tool-outcome.js";
import type { BodyPart, BuiltInConverter, RecordedResult, RuntimeTranslation } from "./runtime-translation.js";

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

/** `Skill` loads a skill's instructions: the same line as reading its file (contract §5). */
const skill: BuiltInConverter = (call, result) =>
  loadSkillLine(asText(call.args.skill) ?? "(name not recorded)", normalized(result));

const TODO_STATUS: Readonly<Record<string, string>> = { completed: "done", in_progress: "doing", pending: "todo" };

/** `Update to-do list (<n> items)`, the items below as `[done]`, `[doing]`, `[todo]`. */
const todoWrite: BuiltInConverter = (call, result) => {
  const items = Array.isArray(call.args.todos)
    ? call.args.todos.filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    : [];
  const settled = confirmedOutcome(normalized(result));
  const lines = items.map((item) => `[${TODO_STATUS[asText(item.status) ?? ""] ?? asText(item.status) ?? "todo"}] ${asText(item.content) ?? "(item not recorded)"}`);
  return {
    head: `Update to-do list (${items.length} item${items.length === 1 ? "" : "s"})`,
    outcome: settled.outcome,
    parts: [...(lines.length ? [{ kind: "message" as const, text: lines.join("\n") }] : []), ...settled.parts],
  };
};

/** `Spawn sub-agent: <description>`, the task text and the result below. */
const agent: BuiltInConverter = (call, result) => {
  const prompt = asText(call.args.prompt);
  const recorded = normalized(result) ?? NO_RESULT;
  const description = asText(call.args.description) ?? splitLines(prompt ?? "")[0] ?? "(task not recorded)";
  const parts: BodyPart[] = [
    ...(prompt ? [{ kind: "message" as const, text: prompt }] : []),
    ...(recorded.output ? [{ kind: "output" as const, text: recorded.output }] : []),
  ];
  return { head: `Spawn sub-agent: ${description}${isTrue(call.args.run_in_background) ? " (background)" : ""}`, outcome: recorded.outcome, parts };
};

const toolSearch: BuiltInConverter = (call, result) => {
  const recorded = normalized(result) ?? NO_RESULT;
  return {
    head: `Look up tools: ${JSON.stringify(asText(call.args.query) ?? "")}`,
    outcome: recorded.outcome,
    parts: recorded.output ? [{ kind: "output", text: recorded.output }] : [],
  };
};

/** The agent's own task list (not the project's board). */
const taskCreate: BuiltInConverter = (call, result) => {
  const { outcome, parts } = confirmedOutcome(normalized(result));
  return { head: `Create task: ${asText(call.args.subject) ?? "(subject not recorded)"}`, outcome, parts };
};

const taskUpdate: BuiltInConverter = (call, result) => {
  const { outcome, parts } = confirmedOutcome(normalized(result));
  const status = asText(call.args.status);
  return { head: `Update task ${asText(call.args.taskId) ?? "(id not recorded)"}${status ? `: ${status}` : ""}`, outcome, parts };
};

const taskOutput: BuiltInConverter = (call, result) => backgroundOutputLine(asText(call.args.task_id), normalized(result));

const taskStop: BuiltInConverter = (call, result) => stopBackgroundTaskLine(asText(call.args.task_id), normalized(result));

/** `Run workflow: <name>`, its arguments below. */
const workflow: BuiltInConverter = (call, result) => {
  const { outcome, parts } = confirmedOutcome(normalized(result));
  const args = call.args.args;
  const text = typeof args === "string" ? asText(args) : args === undefined || args === null ? null : compactJson(args);
  return {
    head: `Run workflow: ${asText(call.args.name) ?? "(name not recorded)"}`,
    outcome,
    parts: [...(text ? [{ kind: "message" as const, text }] : []), ...parts],
  };
};

export const claudeTranslation: RuntimeTranslation = Object.freeze({
  label: agentRuntimeName(RuntimeKind.CLAUDE_AGENT_SDK),
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
    ["Skill", skill],
    ["TodoWrite", todoWrite],
    ["Agent", agent],
    ["ToolSearch", toolSearch],
    ["TaskCreate", taskCreate],
    ["TaskUpdate", taskUpdate],
    ["TaskOutput", taskOutput],
    ["TaskStop", taskStop],
    ["Workflow", workflow],
  ]),
  normalizeResult: normalizeClaudeResult,
});

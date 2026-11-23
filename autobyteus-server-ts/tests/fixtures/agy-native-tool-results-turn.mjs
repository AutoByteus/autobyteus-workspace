// Deterministic provider double only (autobyteus-377). Requires a test-owned HOME and workspace.
// The real CLI streams a finished read/search step as a size summary or nothing, and keeps the step's real result in its transcript
// (`<HOME>/.gemini/antigravity-cli/brain/<conversation>/.system_generated/logs/transcript_full.jsonl`): a planner row, then one GENERIC row
// per call with the result as `content`. Synthetic texts only.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const HEADER = "Created At: 2026-01-02T03:04:05+00:00\nCompleted At: 2026-01-02T03:04:06+00:00\n";

/** `streamOutput`: what the stream says; `content`: the transcript row's text (null: no row is written for this call). */
export const nativeToolResultCalls = (workspace) => {
  const file = path.join(workspace, "result.txt");
  return [
    { name: "read_file", args: { Path: file, StartLine: 2, EndLine: 3 }, summary: { Path: file }, streamOutput: "2 lines, 31 bytes",
      content: `${HEADER}Showing lines 2-3 of 3\n2: second line 🙂\n3: third line` },
    { name: "view_file", args: { AbsolutePath: file }, summary: { AbsolutePath: file }, streamOutput: "3 lines, 50 bytes",
      content: `${HEADER}File Path: \`file://${file}\`\nTotal Lines: 3\nTotal Bytes: 50\nShowing lines 1-3 of 3\nThe following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.\n1: first line\n2: second line 🙂\n3: third line` },
    { name: "grep_search", args: { SearchPath: workspace, Query: "third" }, summary: { SearchPath: workspace, Query: "third" }, streamOutput: null,
      content: `${HEADER}${file}:third line` },
    { name: "find_by_name", args: { SearchDirectory: workspace, Pattern: "*.txt" }, summary: { SearchDirectory: workspace, Pattern: "*.txt" },
      streamOutput: "1 lines, 20 bytes", content: `${HEADER}${file}` },
    { name: "write_file", args: { Path: path.join(workspace, "new.txt"), Content: "first\nsecond\n" }, summary: { Path: path.join(workspace, "new.txt") },
      streamOutput: null, content: `${HEADER}Created file.` },
    { name: "edit_file", args: { Path: file, Target: "second line", Replacement: "2nd line" }, summary: { Path: file },
      streamOutput: null, content: `${HEADER}Made 1 replacements in ${file} starting at line 2` },
    // The stream already has this result: no transcript row is used for it.
    { name: "run_command", args: { CommandLine: "echo STREAM_RESULT" }, summary: { CommandLine: "echo STREAM_RESULT" },
      streamOutput: `${HEADER}Command exited with code 2.\n\nCommand output:\nSTREAM_RESULT\n`, content: "ROW_MUST_NOT_BE_USED" },
  ];
};

/**
 * FULL: the calls above, one planner per call. PARALLEL: `write_file`, `edit_file` and `grep_search` issued together (one planner, three rows).
 * NO_TRANSCRIPT: the first call without any transcript file. GAP: the first call's row is missing (a later step's row exists).
 */
export const nativeToolResultsTurn = async ({ line, conversationId, emit }) => {
  const workspace = process.env.AGY_FAKE_RESULT_WORKSPACE;
  if (!workspace || !process.env.AGY_FAKE_RESULT_HOME || os.homedir() !== process.env.AGY_FAKE_RESULT_HOME)
    throw new Error("Native tool result fixture requires an explicitly test-owned HOME and workspace");
  const mode = JSON.parse(line).message.content;
  const root = path.join(os.homedir(), ".gemini", "antigravity-cli", "brain", conversationId);
  const log = path.join(root, ".system_generated", "logs", "transcript_full.jsonl");
  const state = path.join(root, "fixture-next-step.json");
  await fs.mkdir(path.dirname(log), { recursive: true });
  let next = 1;
  try { next = JSON.parse(await fs.readFile(state, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const all = nativeToolResultCalls(workspace);
  const calls = mode === "FULL" ? all : mode === "PARALLEL" ? all.filter(({ name }) => ["write_file", "edit_file", "grep_search"].includes(name)) : all.slice(0, 1);
  const batches = mode === "PARALLEL" ? [calls] : calls.map((call) => [call]);
  const steps = [];
  const rows = [];
  let index = next;
  for (const batch of batches) {
    rows.push({ step_index: index, source: "MODEL", type: "PLANNER_RESPONSE", status: "DONE", tool_calls: batch.map(({ name, args }) => ({ name, args })) });
    for (const [offset, call] of batch.entries()) {
      steps.push({ ...call, step_index: index + 1 + offset });
      if (!(mode === "GAP" && steps.length === 1))
        rows.push({ step_index: index + 1 + offset, source: "MODEL", type: "GENERIC", status: "DONE", content: call.content });
    }
    index += 1 + batch.length;
  }
  if (mode === "GAP") rows.push({ step_index: index, source: "MODEL", type: "PLANNER_RESPONSE", status: "DONE" });
  if (mode !== "NO_TRANSCRIPT") await fs.appendFile(log, rows.map((row) => JSON.stringify(row)).join("\r\n") + "\r\n");
  await fs.writeFile(state, JSON.stringify(index + (mode === "GAP" ? 1 : 0)));
  for (const call of steps) {
    emit({ event: "step_update", step_update: { conversation_id: conversationId, step_index: call.step_index, step_type: "tool",
      tool_name: call.name, state: "ACTIVE", tool_info: { parameters: call.summary } } });
  }
  for (const call of steps) {
    emit({ event: "step_update", step_update: { conversation_id: conversationId, step_index: call.step_index, step_type: "tool",
      tool_name: call.name, state: "DONE", tool_info: { parameters: call.summary, output: call.streamOutput } } });
  }
  emit({ event: "result", result: { conversation_id: conversationId, status: "SUCCESS", response: "NATIVE_RESULTS_DONE" } });
};

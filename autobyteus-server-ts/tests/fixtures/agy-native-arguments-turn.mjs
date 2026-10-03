// Deterministic provider double only. Requires the transport test's disposable HOME.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const nativeArgumentCalls = (workspace) => {
  const target = path.join(workspace, "marker.txt");
  return [
    { name: "write_to_file", args: { TargetFile: target, CodeContent: "BEFORE\nsecond 🙂 line\n", Overwrite: false,
      EmptyFile: false, ArtifactMetadata: { empty: "", count: 0, values: [null, false, 0, ""] } }, summary: { TargetFile: target } },
    { name: "replace_file_content", args: { TargetFile: target, TargetContent: "BEFORE", ReplacementContent: "MIDDLE",
      StartLine: 1, EndLine: 2, AllowMultiple: false, Description: "first edit", Instruction: "replace first marker" }, summary: { TargetFile: target } },
    { name: "replace_file_content", args: { TargetFile: target, TargetContent: "MIDDLE", ReplacementContent: "AFTER",
      StartLine: 1, EndLine: 2, AllowMultiple: false, Description: "second edit", Instruction: "replace second marker" }, summary: { TargetFile: target } },
    { name: "view_file", args: { AbsolutePath: target, StartLine: 1, EndLine: 2 }, summary: { AbsolutePath: target } },
    { name: "grep_search", args: { SearchPath: workspace, Query: "AFTER", CaseInsensitive: false, MatchPerLine: true,
      Includes: ["*.txt"], IsRegex: false }, summary: { SearchPath: workspace, Query: "AFTER" } },
    { name: "find_by_name", args: { SearchDirectory: workspace, Pattern: "*.txt", Type: "file", MaxDepth: 0 },
      summary: { SearchDirectory: workspace, Pattern: "*.txt" } },
    { name: "list_dir", args: { DirectoryPath: workspace }, summary: { DirectoryPath: workspace } },
    { name: "run_command", args: { CommandLine: "printf NATIVE_ARGUMENTS_PREFIX_VERIFIED", Cwd: workspace,
      WaitMsBeforeAsync: 0, IsDaemon: false, SafeToAutoRun: true }, summary: { CommandLine: "printf NATIVE…" } },
    { name: "run_command", args: { CommandLine: "fixture-background-command", Cwd: workspace, IsDaemon: true,
      WaitMsBeforeAsync: 0 }, summary: { CommandLine: "fixture-background-command", IsDaemon: true }, background: true },
  ];
};

export const nativeArgumentsTurn = async ({ line, conversationId, emit }) => {
  const workspace = process.env.AGY_FAKE_ARGUMENT_WORKSPACE;
  if (!workspace || !process.env.AGY_FAKE_ARGUMENT_HOME || os.homedir() !== process.env.AGY_FAKE_ARGUMENT_HOME)
    throw new Error("Native argument fixture requires an explicitly test-owned HOME and workspace");
  const content = JSON.parse(line).message.content;
  const root = path.join(os.homedir(), ".gemini", "antigravity-cli", "brain", conversationId);
  const log = path.join(root, ".system_generated", "logs", "transcript_full.jsonl");
  const state = path.join(root, "fixture-next-step.json");
  await fs.mkdir(path.dirname(log), { recursive: true });
  let next = 1;
  try { next = JSON.parse(await fs.readFile(state, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const summaryOnly = content === "SUMMARY_ONLY";
  const ambiguous = content === "AMBIGUOUS";
  const calls = summaryOnly || ambiguous ? nativeArgumentCalls(workspace).slice(0, 1) : nativeArgumentCalls(workspace);
  const rows = calls.flatMap((call, offset) => {
    const index = next + offset * 2;
    return [
      { step_index: index, source: "MODEL", type: "PLANNER_RESPONSE", status: "DONE",
        tool_calls: ambiguous ? [{ name: call.name, args: call.args }, { name: call.name, args: call.args }]
          : [{ name: call.name, args: call.args }] },
      { step_index: index + 1, source: "MODEL", type: "GENERIC", status: "DONE" },
    ];
  });
  // Real withheld-step shape: complete later source rows exist before earlier steps are delivered.
  if (!summaryOnly) await fs.appendFile(log, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
  await fs.writeFile(state, JSON.stringify(next + calls.length * 2));
  for (const [offset, call] of calls.entries()) {
    const step_index = next + offset * 2 + 1;
    const base = { conversation_id: conversationId, step_index, step_type: "tool", tool_name: call.name };
    emit({ event: "step_update", step_update: { ...base, state: "ACTIVE", tool_info: { parameters: call.summary } } });
    await new Promise((resolve) => setTimeout(resolve, offset === 0 ? 650 : 40));
    if (!call.background) emit({ event: "step_update", step_update: { ...base, state: "DONE",
      tool_info: { parameters: call.summary, output: "unchanged-fixture-result" } } });
  }
  emit({ event: "result", result: { conversation_id: conversationId, status: "SUCCESS", response: "NATIVE_ARGUMENTS_DONE" } });
};

// Temporary API/E2E probe (RR-003 / CAND-001): capture raw Claude CLI task frames on the pinned SDK.
// Usage (from autobyteus-server-ts): node <this file> <workdir> <scenario> [cliPath]
// Scenarios: tools | bg-subagent | monitor | fg-subagent | bash-fail
// Prints the init tool list and every system frame whose subtype is a task frame.
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { query } = await import(require.resolve("@anthropic-ai/claude-agent-sdk"));

const [workdir, scenario, cliPath] = process.argv.slice(2);
for (const key of Object.keys(process.env)) {
  if (/^(CLAUDECODE|CLAUDE_CODE_|CLAUDE_PID$|CLAUDE_EFFORT$|CLAUDE_AGENT_SDK_VERSION$)/u.test(key)) delete process.env[key];
}
const prompts = {
  tools: "Reply only OK.",
  "bg-subagent": "Use the Agent (Task) tool with run_in_background set to true to launch a general-purpose subagent whose task is: 'Run the shell command `sleep 8` with Bash, then reply SUBAGENT_DONE.' Do not wait for it. Reply STARTED and end your turn.",
  monitor: "If you have a Monitor tool, use it to monitor the shell command `for i in 1 2 3; do echo tick $i; sleep 2; done` (a streaming monitor). Otherwise reply NO_MONITOR_TOOL. Then end your turn.",
  "fg-subagent": "Use the Agent (Task) tool in the foreground (do NOT set run_in_background) to launch a general-purpose subagent whose task is: 'Reply FOREGROUND_DONE without using any tools.' Wait for it, then reply with its answer.",
  workflow: "Load the Workflow tool (use ToolSearch with query 'select:Workflow' if needed) and use it to run the smallest possible workflow in the background: one step that runs the shell command `sleep 5; echo WF_DONE`. Do not wait for it. Reply STARTED and end your turn. If the Workflow tool is unavailable reply NO_WORKFLOW_TOOL.",
  "bash-fail":"Use the Bash tool with run_in_background set to true to run exactly: `sleep 3; echo failing; exit 3`. Do not wait for it. Reply STARTED and end your turn.",
};
const TASK_SUBTYPES = new Set(["background_tasks_changed", "task_started", "task_updated", "task_progress", "task_notification"]);
const t0 = Date.now();
const log = (label, value) => console.log(`[${String(((Date.now() - t0) / 1000).toFixed(1)).padStart(6)}] ${label} ${JSON.stringify(value)}`);

let resolveIdle;
const idleUntil = Number(process.env.PROBE_IDLE_MS ?? 45_000);
async function* input() {
  yield { type: "user", message: { role: "user", content: prompts[scenario] }, parent_tool_use_id: null, session_id: "" };
  await new Promise((resolve) => { resolveIdle = resolve; setTimeout(resolve, idleUntil); });
}
const q = query({
  prompt: input(),
  options: {
    cwd: workdir,
    model: "haiku",
    permissionMode: "bypassPermissions",
    ...(cliPath ? { pathToClaudeCodeExecutable: cliPath } : {}),
  },
});
for await (const frame of q) {
  if (frame.type === "system" && frame.subtype === "init") {
    log("INIT", { cli: frame.claude_code_version, tools: frame.tools });
    if (scenario === "tools") { resolveIdle?.(); }
  } else if (frame.type === "system" && TASK_SUBTYPES.has(frame.subtype)) {
    const { uuid, session_id, ...rest } = frame;
    log("TASK", rest);
  } else if (frame.type === "assistant") {
    for (const block of frame.message?.content ?? []) {
      if (block.type === "tool_use") log("TOOL_USE", { name: block.name, input: block.input });
      if (block.type === "tool_result") log("TOOL_RESULT", String(JSON.stringify(block.content)).slice(0, 300));
      if (block.type === "text") log("TEXT", block.text.slice(0, 200));
    }
  } else if (frame.type === "user" && Array.isArray(frame.message?.content)) {
    for (const block of frame.message.content) {
      if (block.type === "tool_result") log("TOOL_RESULT", String(JSON.stringify(block.content)).slice(0, 400));
    }
  } else if (frame.type === "result") {
    log("RESULT", { subtype: frame.subtype, origin: frame.origin ?? null });
  }
}
log("END", {});

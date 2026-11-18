#!/usr/bin/env node
// Antigravity CLI driver (autobyteus-324 probe): ONE agy process (stream-json stdin/stdout, as AutoByteus runs it),
// three turns, the same control steps as drive-claude.mjs. The capsule mirrors agy-run-capsule.ts and
// agy-mcp-config-materializer.ts (agent.md front matter, .agents/mcp_config.json with the run-scoped header).
// Usage: node drive-agy.mjs <probeBaseUrl> <capsuleDir> <workspaceDir> <out.jsonl> [model] [header|noheader]
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline";
const [base, capsule, workspace, outPath, model = "gemini-3.8-flash-low", headerMode = "header"] = process.argv.slice(2);
const out = (e) => fs.appendFileSync(outPath, JSON.stringify({ t: new Date().toISOString(), ...e }) + "\n");
const agentName = "ab324-probe-agent";
fs.mkdirSync(path.join(capsule, ".agents", "agents", agentName), { recursive: true });
fs.writeFileSync(path.join(capsule, ".agents", "agents", agentName, "agent.md"), [
  "---", `name: ${agentName}`, "description: Probe agent.", "mainAgent: true",
  "tools: [view_file, write_to_file, replace_file_content, grep_search, list_dir, find_by_name, run_command, generate_image]", "---", "",
  "You are a probe agent. Follow the user's instructions exactly.", "",
].join("\n"));
fs.writeFileSync(path.join(capsule, ".agents", "mcp_config.json"), JSON.stringify({ mcpServers: { probe: {
  disabled: false, serverUrl: `${base}/mcp`, ...(headerMode === "header" ? { headers: { "X-Autobyteus-MCP-Transport": "streamable-http" } } : {}) } } }, null, 2));
const child = spawn("agy", ["--new-project", "--agent", agentName, "--add-dir", workspace, "--model", model,
  "--input-format", "stream-json", "--output-format", "stream-json", "--dangerously-skip-permissions"], { cwd: capsule, stdio: ["pipe", "pipe", "pipe"] });
let stderr = ""; child.stderr.on("data", (d) => { stderr = (stderr + d).slice(-2000); });
let onInit, onResult; const init = new Promise((r) => { onInit = r; });
readline.createInterface({ input: child.stdout }).on("line", (line) => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.event === "init") { out({ kind: "init", conversation: m.init?.conversation_id ?? m.conversation_id ?? null }); onInit(); }
  else if (m.event === "step_update") {
    const s = m.step_update ?? {};
    if (s.step_type === "tool" || s.tool_name) out({ kind: "tool_step", state: s.state, tool: s.tool_name, mcpTool: s.tool_info?.parameters?.ToolName ?? null, server: s.tool_info?.parameters?.ServerName ?? null, output: JSON.stringify(s.tool_info?.output ?? null).slice(0, 160) });
    else if (s.step_type === "agent_response" && s.state === "DONE") out({ kind: "text", text: String(s.text_delta ?? "").slice(0, 300) });
  } else if (m.event === "result") { out({ kind: "result", status: m.result?.status, response: String(m.result?.response ?? "").slice(0, 200), error: m.result?.error ?? null }); onResult?.(); }
});
const prompts = [
  "Call the MCP tool probe_alpha (no arguments). Then reply with exactly the text it returned, nothing else.",
  "Do you now have an MCP tool named probe_beta? If yes, call it (no arguments) and reply with exactly the text it returned. If you do not have it, reply exactly NO_BETA_TOOL.",
  "Call the MCP tool probe_alpha again (no arguments) and reply with exactly the text it returned. If you do not have that tool, reply exactly NO_ALPHA_TOOL.",
];
const control = [null, "add-beta", "remove-alpha"];
try {
  await Promise.race([init, new Promise((_, rej) => setTimeout(() => rej(new Error(`no init: ${stderr}`)), 90_000))]);
  for (let i = 0; i < prompts.length; i += 1) {
    if (control[i]) { const r = await fetch(`${base}/control/${control[i]}`, { method: "POST" }); out({ kind: "control", action: control[i], state: await r.json() }); await new Promise((r2) => setTimeout(r2, 3000)); }
    out({ kind: "turn", n: i + 1 });
    const done = new Promise((r) => { onResult = r; });
    child.stdin.write(`${JSON.stringify({ event: "user", message: { content: prompts[i] } })}\n`);
    await Promise.race([done, new Promise((r) => setTimeout(() => { out({ kind: "turn_timeout", n: i + 1 }); r(); }, 180_000))]);
  }
} catch (error) { out({ kind: "error", text: String(error).slice(0, 800) }); }
child.kill(); out({ kind: "end", stderrTail: stderr.slice(-400) });

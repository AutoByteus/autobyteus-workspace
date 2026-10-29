#!/usr/bin/env node
// Grok Build driver (autobyteus-324 probe): ONE ACP session over stdio (`grok agent --no-leader --model <m> stdio`,
// as AutoByteus runs it), three turns, the same control steps as drive-claude.mjs. The MCP server is passed in
// session/new as grok-build-session-profile.ts does ({ type: "http", name, url, headers: [] }).
// Usage: node drive-grok.mjs <probeBaseUrl> <workdir> <out.jsonl> [model]
import fs from "node:fs";
import { spawn } from "node:child_process";
import readline from "node:readline";
const [base, workdir, outPath, model = "grok-4.7"] = process.argv.slice(2);
const out = (e) => fs.appendFileSync(outPath, JSON.stringify({ t: new Date().toISOString(), ...e }) + "\n");
const child = spawn("grok", ["agent", "--no-leader", "--model", model, "stdio"], { cwd: workdir, stdio: ["pipe", "pipe", "pipe"] });
let stderr = ""; child.stderr.on("data", (d) => { stderr = (stderr + d).slice(-2000); });
let nextId = 1; const pending = new Map();
const send = (m) => child.stdin.write(JSON.stringify(m) + "\n");
const request = (method, params) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); send({ jsonrpc: "2.0", id, method, params }); });
let text = "";
readline.createInterface({ input: child.stdout }).on("line", (line) => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id !== undefined && pending.has(m.id) && (m.result !== undefined || m.error)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.id !== undefined && m.method === "session/request_permission") {
    const options = m.params?.options ?? []; const allow = options.find((o) => /allow/i.test(o.kind ?? o.optionId ?? "")) ?? options[0];
    out({ kind: "permission", tool: m.params?.toolCall?.title ?? null });
    send({ jsonrpc: "2.0", id: m.id, result: { outcome: { outcome: "selected", optionId: allow?.optionId } } }); return;
  }
  if (m.id !== undefined && m.method) { send({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "not supported" } }); return; }
  if (m.method === "session/update") {
    const u = m.params?.update ?? {};
    if (u.sessionUpdate === "tool_call") out({ kind: "tool_call", title: u.title ?? null, kind2: u.kind ?? null, rawInput: JSON.stringify(u.rawInput ?? null).slice(0, 120) });
    else if (u.sessionUpdate === "tool_call_update" && u.status && u.status !== "in_progress") out({ kind: "tool_call_update", status: u.status, content: JSON.stringify(u.content ?? u.rawOutput ?? null).slice(0, 160) });
    else if (u.sessionUpdate === "agent_message_chunk") text += u.content?.text ?? "";
  }
});
const prompts = [
  "Call the MCP tool probe_alpha (no arguments). Then reply with exactly the text it returned, nothing else.",
  "Do you now have an MCP tool named probe_beta? If yes, call it (no arguments) and reply with exactly the text it returned. If you do not have it, reply exactly NO_BETA_TOOL.",
  "Call the MCP tool probe_alpha again (no arguments) and reply with exactly the text it returned. If you do not have that tool, reply exactly NO_ALPHA_TOOL.",
];
const control = [null, "add-beta", "remove-alpha"];
try {
  await request("initialize", { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } });
  const session = await request("session/new", { cwd: workdir, mcpServers: [{ type: "http", name: "probe", url: `${base}/mcp`, headers: [] }] });
  out({ kind: "session", sessionId: session.sessionId });
  await new Promise((r) => setTimeout(r, 4000));
  for (let i = 0; i < prompts.length; i += 1) {
    if (control[i]) { const r = await fetch(`${base}/control/${control[i]}`, { method: "POST" }); out({ kind: "control", action: control[i], state: await r.json() }); await new Promise((r2) => setTimeout(r2, 3000)); }
    out({ kind: "turn", n: i + 1 }); text = "";
    const result = await Promise.race([request("session/prompt", { sessionId: session.sessionId, prompt: [{ type: "text", text: prompts[i] }] }),
      new Promise((r) => setTimeout(() => r({ stopReason: "probe_timeout" }), 180_000))]);
    out({ kind: "result", stopReason: result?.stopReason, text: text.slice(0, 300) });
  }
} catch (error) { out({ kind: "error", text: String(error).slice(0, 600), stderr: stderr.slice(-400) }); }
child.kill(); out({ kind: "end" });

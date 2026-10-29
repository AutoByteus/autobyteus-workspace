#!/usr/bin/env node
// Codex app-server driver (autobyteus-324 probe): ONE thread (as AutoByteus runs it), three turns, the same
// control steps as drive-claude.mjs. Variant "enabled" passes enabled_tools: ["probe_alpha"] in the thread's
// mcp_servers config, as AutoByteus passes the definition's tools; variant "open" passes no enabled_tools.
// Usage: node drive-codex.mjs <probeBaseUrl> <workdir> <out.jsonl> <open|enabled> [model]
import fs from "node:fs";
import { spawn } from "node:child_process";
import readline from "node:readline";
const [base, workdir, outPath, variant, model = "gpt-5.4-mini"] = process.argv.slice(2);
const out = (e) => fs.appendFileSync(outPath, JSON.stringify({ t: new Date().toISOString(), ...e }) + "\n");
const child = spawn("codex", ["app-server"], { cwd: workdir, stdio: ["pipe", "pipe", "pipe"] });
child.stderr.on("data", (d) => out({ kind: "stderr", text: String(d).slice(0, 300) }));
let nextId = 1; const pending = new Map(); const waiters = [];
const send = (m) => child.stdin.write(JSON.stringify(m) + "\n");
const request = (method, params) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); send({ jsonrpc: "2.0", id, method, params }); });
readline.createInterface({ input: child.stdout }).on("line", (line) => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id !== undefined && pending.has(m.id) && (m.result !== undefined || m.error)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.id !== undefined && m.method) { out({ kind: "server-request", method: m.method }); send({ jsonrpc: "2.0", id: m.id, result: { decision: "accept" } }); return; }
  const p = m.params ?? {};
  if (m.method === "item/completed") {
    const it = p.item ?? {};
    if (it.type === "mcpToolCall") out({ kind: "mcp_tool_call", server: it.server, tool: it.tool, status: it.status, result: JSON.stringify(it.result ?? it.error ?? null).slice(0, 200) });
    else if (it.type === "agentMessage") out({ kind: "text", text: String(it.text ?? "").slice(0, 300) });
  } else if (m.method === "turn/completed") { out({ kind: "turn_completed", status: p.turn?.status, error: JSON.stringify(p.turn?.error ?? null).slice(0, 400) }); waiters.shift()?.(); }
  else if (m.method === "error") out({ kind: "error_notification", params: JSON.stringify(p).slice(0, 400) });
  else if (m.method && /mcp|tool/i.test(m.method)) out({ kind: "notification", method: m.method, params: JSON.stringify(p).slice(0, 300) });
});
const prompts = [
  "Call the MCP tool probe_alpha (no arguments). Then reply with exactly the text it returned, nothing else.",
  "Do you now have an MCP tool named probe_beta? If yes, call it (no arguments) and reply with exactly the text it returned. If you do not have it, reply exactly NO_BETA_TOOL.",
  "Call the MCP tool probe_alpha again (no arguments) and reply with exactly the text it returned. If you do not have that tool, reply exactly NO_ALPHA_TOOL.",
];
const control = [null, "add-beta", "remove-alpha"];
try {
  await request("initialize", { clientInfo: { name: "ab324-probe", version: "0.0.1" }, capabilities: { experimentalApi: true } });
  send({ jsonrpc: "2.0", method: "initialized", params: {} });
  const probe = { url: `${base}/mcp`, startup_timeout_sec: 5, ...(variant === "enabled" ? { enabled_tools: ["probe_alpha"] } : {}) };
  const started = await request("thread/start", { model, modelProvider: null, cwd: workdir, approvalPolicy: "never", sandbox: "read-only",
    config: { mcp_servers: { probe } }, personality: null, ephemeral: true });
  const threadId = started.thread?.id; out({ kind: "thread", threadId, variant, model });
  for (let i = 0; i < prompts.length; i += 1) {
    if (control[i]) { const r = await fetch(`${base}/control/${control[i]}`, { method: "POST" }); out({ kind: "control", action: control[i], state: await r.json() }); await new Promise((r2) => setTimeout(r2, 3000)); }
    out({ kind: "turn", n: i + 1 });
    const done = new Promise((r) => waiters.push(r));
    await request("turn/start", { threadId, input: [{ type: "text", text: prompts[i] }], cwd: workdir, model, effort: "low", summary: "auto", personality: null, outputSchema: null, collaborationMode: null });
    await Promise.race([done, new Promise((r) => setTimeout(() => { out({ kind: "turn_timeout", n: i + 1 }); r(); }, 180_000))]);
  }
} catch (error) { out({ kind: "error", text: String(error).slice(0, 500) }); }
child.kill(); out({ kind: "end" });

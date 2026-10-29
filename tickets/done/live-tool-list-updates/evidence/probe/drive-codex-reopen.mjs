#!/usr/bin/env node
// Codex app-server, no model use (autobyteus-324, ARCH-REV-001 AR-001): does a reopen give a thread a new MCP tool list?
// Starts a persisted thread with the probe server (enabled_tools [probe_alpha]), adds probe_beta on the probe server,
// then either
//   "unsubscribe": thread/unsubscribe (wait for thread/closed), then thread/resume with enabled_tools [alpha, beta], or
//   "loaded":      thread/resume on the still-loaded thread with the new config.
// The probe server log shows whether Codex opened a new MCP connection (initialize + tools/list) after the resume.
// A user message is injected (thread/inject_items, no model use) so the thread has a rollout to resume.
// mcpServerStatus/list is NOT used (it opens its own connections). thread/loaded/list is read before and after.
// Usage: node drive-codex-reopen.mjs <probeBaseUrl> <workdir> <out.jsonl> <unsubscribe|loaded>
import fs from "node:fs";
import { spawn } from "node:child_process";
import readline from "node:readline";
const [base, workdir, outPath, variant] = process.argv.slice(2);
const out = (e) => fs.appendFileSync(outPath, JSON.stringify({ t: new Date().toISOString(), ...e }) + "\n");
const child = spawn("codex", ["app-server"], { cwd: workdir, stdio: ["pipe", "pipe", "pipe"] });
let stderr = ""; child.stderr.on("data", (d) => { stderr = (stderr + d).slice(-2000); });
let nextId = 1; const pending = new Map(); const closed = [];
const send = (m) => child.stdin.write(JSON.stringify(m) + "\n");
const request = (method, params) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); send({ jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) }); });
readline.createInterface({ input: child.stdout }).on("line", (line) => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id !== undefined && pending.has(m.id) && (m.result !== undefined || m.error)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === "thread/closed") { closed.push(m.params?.threadId); out({ kind: "thread_closed", threadId: m.params?.threadId }); }
  else if (m.method && /mcp/i.test(m.method)) out({ kind: "notification", method: m.method, params: JSON.stringify(m.params ?? null).slice(0, 300) });
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const config = (enabled) => ({ mcp_servers: { probe: { url: `${base}/mcp`, startup_timeout_sec: 5, enabled_tools: enabled } } });
const loaded = async (label) => { try { const r = await request("thread/loaded/list", {}); out({ kind: "loaded", label, data: JSON.stringify(r).slice(0, 300) }); } catch (e) { out({ kind: "loaded_error", label, text: String(e).slice(0, 300) }); } };
try {
  await request("initialize", { clientInfo: { name: "ab324-probe", version: "0.0.1" }, capabilities: { experimentalApi: true } });
  send({ jsonrpc: "2.0", method: "initialized", params: {} });
  const base1 = { model: "gpt-6.1-sol", modelProvider: null, cwd: workdir, approvalPolicy: "never", sandbox: "read-only", personality: null };
  const started = await request("thread/start", { ...base1, config: config(["probe_alpha"]), ephemeral: false, persistExtendedHistory: true });
  const threadId = started.thread?.id; out({ kind: "thread", threadId, variant });
  // A thread with no turns has no rollout; inject one user message (no model use) so it is persisted.
  try { await request("thread/inject_items", { threadId, items: [{ type: "message", role: "user", content: [{ type: "input_text", text: "probe history line 7319" }] }] }); out({ kind: "injected" }); }
  catch (e) { out({ kind: "inject_error", text: String(e).slice(0, 300) }); }
  await wait(3000); await loaded("after start");
  const r = await fetch(`${base}/control/add-beta`, { method: "POST" }); out({ kind: "control", state: await r.json() });
  await wait(2000);
  if (variant === "unsubscribe") {
    try { const u = await request("thread/unsubscribe", { threadId }); out({ kind: "unsubscribe", status: u.status }); } catch (e) { out({ kind: "unsubscribe_error", text: String(e).slice(0, 300) }); }
    for (let i = 0; i < 20 && !closed.includes(threadId); i += 1) await wait(250);
    await loaded("after unsubscribe");
  }
  out({ kind: "resume_begin" });
  try {
    const resumed = await request("thread/resume", { threadId, history: null, path: null, ...base1, config: config(["probe_alpha", "probe_beta"]), excludeTurns: true });
    out({ kind: "resumed", threadId: resumed.thread?.id ?? null });
  } catch (e) { out({ kind: "resume_error", text: String(e).slice(0, 400) }); }
  await wait(4000); await loaded("after resume");
} catch (error) { out({ kind: "error", text: String(error).slice(0, 500), stderr: stderr.slice(-300) }); }
child.kill(); out({ kind: "end" });

#!/usr/bin/env node
// Codex app-server, no model use (autobyteus-324 probe): does config/mcpServer/reload re-read the tool list of an
// MCP server that a thread received in its thread/start config? Starts a thread with the probe server
// (optionally with enabled_tools), reads mcpServerStatus/list, adds probe_beta on the probe server
// (list_changed sent), reads the status again, calls config/mcpServer/reload, reads it a third time.
// Usage: node drive-codex-reload.mjs <probeBaseUrl> <workdir> <out.jsonl> <open|enabled>
import fs from "node:fs";
import { spawn } from "node:child_process";
import readline from "node:readline";
const [base, workdir, outPath, variant] = process.argv.slice(2);
const out = (e) => fs.appendFileSync(outPath, JSON.stringify({ t: new Date().toISOString(), ...e }) + "\n");
const child = spawn("codex", ["app-server"], { cwd: workdir, stdio: ["pipe", "pipe", "pipe"] });
let nextId = 1; const pending = new Map();
const send = (m) => child.stdin.write(JSON.stringify(m) + "\n");
const request = (method, params) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); send({ jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) }); });
readline.createInterface({ input: child.stdout }).on("line", (line) => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id !== undefined && pending.has(m.id) && (m.result !== undefined || m.error)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const probeTools = async (label, threadId) => {
  try {
    const status = await request("mcpServerStatus/list", { threadId });
    const servers = status.data ?? status.servers ?? status;
    const probe = (Array.isArray(servers) ? servers : []).find((s) => s.name === "probe");
    out({ kind: "status", label, probeTools: probe ? Object.keys(probe.tools ?? {}) : null, raw: probe ? undefined : JSON.stringify(status).slice(0, 400) });
  } catch (error) { out({ kind: "status_error", label, text: String(error).slice(0, 300) }); }
};
try {
  await request("initialize", { clientInfo: { name: "ab324-probe", version: "0.0.1" }, capabilities: { experimentalApi: true } });
  send({ jsonrpc: "2.0", method: "initialized", params: {} });
  const probe = { url: `${base}/mcp`, startup_timeout_sec: 5, ...(variant === "enabled" ? { enabled_tools: ["probe_alpha", "probe_beta_future_placeholder"] } : {}) };
  const started = await request("thread/start", { model: "gpt-6.1-sol", modelProvider: null, cwd: workdir, approvalPolicy: "never", sandbox: "read-only", config: { mcp_servers: { probe } }, personality: null, ephemeral: true });
  const threadId = started.thread?.id; out({ kind: "thread", threadId, variant });
  await wait(2000); await probeTools("after start", threadId);
  const r = await fetch(`${base}/control/add-beta`, { method: "POST" }); out({ kind: "control", state: await r.json() });
  await wait(3000); await probeTools("after list_changed", threadId);
  try { await request("config/mcpServer/reload"); out({ kind: "reload", ok: true }); } catch (error) { out({ kind: "reload", ok: false, text: String(error).slice(0, 300) }); }
  await wait(4000); await probeTools("after reload", threadId);
} catch (error) { out({ kind: "error", text: String(error).slice(0, 500) }); }
child.kill(); out({ kind: "end" });

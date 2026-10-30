#!/usr/bin/env node
// Grok Build via ACP, no model use (autobyteus-324, ARCH-REV-001 AR-001): does a reopen give a session a new MCP tool list?
// session/new with the probe server; probe_beta added; then
//   "same":    session/load of the same sessionId in the SAME grok process, with the mcpServers again, or
//   "process": end the process, start a new one, session/load (the product's restore path).
// The probe server log shows whether Grok opened a new MCP connection (initialize + tools/list) after the load.
// Usage: node drive-grok-reopen.mjs <probeBaseUrl> <workdir> <out.jsonl> <same|process> [model]
import fs from "node:fs";
import { spawn } from "node:child_process";
import readline from "node:readline";
const [base, workdir, outPath, variant, model = "grok-4.7"] = process.argv.slice(2);
const out = (e) => fs.appendFileSync(outPath, JSON.stringify({ t: new Date().toISOString(), ...e }) + "\n");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const startProcess = (label) => {
  const child = spawn("grok", ["agent", "--no-leader", "--model", model, "stdio"], { cwd: workdir, stdio: ["pipe", "pipe", "pipe"] });
  let nextId = 1; const pending = new Map(); let stderr = "";
  child.stderr.on("data", (d) => { stderr = (stderr + d).slice(-1500); });
  const send = (m) => child.stdin.write(JSON.stringify(m) + "\n");
  readline.createInterface({ input: child.stdout }).on("line", (line) => {
    let m; try { m = JSON.parse(line); } catch { return; }
    if (m.id !== undefined && pending.has(m.id) && (m.result !== undefined || m.error)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
    if (m.id !== undefined && m.method) send({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "not supported" } });
  });
  const request = (method, params) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); send({ jsonrpc: "2.0", id, method, params }); });
  out({ kind: "process", label });
  return { child, request, stderr: () => stderr };
};
const mcpServers = [{ type: "http", name: "probe", url: `${base}/mcp`, headers: [] }];
const init = (p) => p.request("initialize", { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } });
let p = startProcess("first");
try {
  const caps = await init(p); out({ kind: "initialized", loadSession: caps?.agentCapabilities?.loadSession ?? null });
  const s = await p.request("session/new", { cwd: workdir, mcpServers }); out({ kind: "session", sessionId: s.sessionId });
  await wait(4000);
  const r = await fetch(`${base}/control/add-beta`, { method: "POST" }); out({ kind: "control", state: await r.json() });
  await wait(2000);
  if (variant === "process") { p.child.kill(); await wait(1000); p = startProcess("second"); await init(p); }
  out({ kind: "load_begin" });
  try { await p.request("session/load", { sessionId: s.sessionId, cwd: workdir, mcpServers }); out({ kind: "loaded" }); }
  catch (e) { out({ kind: "load_error", text: String(e).slice(0, 400) }); }
  await wait(5000);
} catch (error) { out({ kind: "error", text: String(error).slice(0, 500), stderr: p.stderr().slice(-300) }); }
p.child.kill(); out({ kind: "end" });

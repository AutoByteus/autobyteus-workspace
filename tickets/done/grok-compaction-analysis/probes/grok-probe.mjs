import { spawn } from "node:child_process";
import fs from "node:fs";
const [scenario, ...rest] = process.argv.slice(2);
const out = fs.createWriteStream(`/tmp/grok-probe/raw-${scenario}.jsonl`);
const t0 = Date.now(); const log = (label, data) => out.write(JSON.stringify({ label, dt: Date.now() - t0, data }) + "\n");
const env = { ...process.env, ...(process.env.PROBE_GROK_HOME ? { GROK_HOME: process.env.PROBE_GROK_HOME } : {}), ...(process.env.PROBE_GROK_CONFIG ? { GROK_CONFIG: process.env.PROBE_GROK_CONFIG } : {}) };
const child = spawn("grok", ["agent", "--no-leader", "--model", "grok-4.7", "stdio"], { cwd: "/tmp/grok-probe/work", env, stdio: ["pipe", "pipe", "pipe"] });
let id = 1; const pending = new Map(); const waiters = [];
const send = (o) => child.stdin.write(JSON.stringify(o) + "\n");
const request = (method, params) => new Promise((resolve, reject) => { const i = id++; pending.set(i, { resolve, reject, method }); log("REQ", { id: i, method, params }); send({ jsonrpc: "2.0", id: i, method, params }); });
const waitFor = (pred, ms = 300000) => new Promise((resolve, reject) => { const w = { pred, resolve }; waiters.push(w); setTimeout(() => { reject(new Error("timeout")); }, ms).unref(); });
let buf = ""; child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
child.stderr.on("data", d => log("STDERR", d.slice(0, 1500)));
child.stdout.on("data", (c) => { buf += c; let n; while ((n = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, n).trim(); buf = buf.slice(n + 1); if (!line) continue; let m; try { m = JSON.parse(line); } catch { log("NONJSON", line.slice(0, 500)); continue; }
  if (m.id !== undefined && (m.result !== undefined || m.error !== undefined) && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); log("RES", { id: m.id, method: p.method, result: m.result, error: m.error }); m.error ? p.reject(m.error) : p.resolve(m.result); continue; }
  if (m.id !== undefined && m.method) { log("SERVER_REQ", m); if (m.method === "session/request_permission") { const opt = (m.params?.options || []).find(o => /allow/.test(o.kind)) || m.params?.options?.[0]; send({ jsonrpc: "2.0", id: m.id, result: { outcome: { outcome: "selected", optionId: opt?.optionId } } }); } else send({ jsonrpc: "2.0", id: m.id, error: { code: -32601, message: "not supported by probe" } }); continue; }
  log("NOTE", m); for (const w of [...waiters]) if (w.pred(m)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(m); } } });
const filler = (n) => Array.from({ length: n }, (_, i) => `Record ${i}: the quick brown fox ${i * 7} jumps over lazy dog ${i * 13}; checksum ${(i * 2654435761) % 1000003}.`).join("\n");
try {
  const init = await request("initialize", { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } });
  const s = await request("session/new", { cwd: "/tmp/grok-probe/work", mcpServers: [], _meta: { yoloMode: true } });
  const sessionId = s.sessionId; log("SESSION", { sessionId });
  const prompt = (text) => request("session/prompt", { sessionId, prompt: [{ type: "text", text }] });
  if (scenario === "slash") { await prompt("Reply with exactly: OK ONE"); await prompt("/compact"); await prompt("Reply with exactly: OK AFTER"); }
  if (scenario === "api") { await prompt("Reply with exactly: OK ONE"); const r = await request("_x.ai/compact_conversation", { sessionId }).catch(e => log("ACTION", { apiError: e })); await new Promise(r => setTimeout(r, 3000)); await prompt("Reply with exactly: OK AFTER"); }
  if (scenario === "auto") { const n = Number(rest[0] || 3); for (let i = 1; i <= n; i++) await prompt(`Data dump ${i}. Do not analyze. Reply with exactly: OK DUMP${i}\n${filler(Number(rest[1] || 200))}`); await prompt("Reply with exactly: OK AFTER"); }
  if (scenario === "manualreal") { await prompt(`Data dump A. Do not analyze. Reply with exactly: OK A\n${filler(350)}`); await prompt(`Data dump B. Do not analyze. Reply with exactly: OK B\n${filler(350)}`); await prompt("/compact"); await prompt("Reply with exactly: OK AFTER"); }
  if (scenario === "cancel") { await prompt(`Data dump A. Do not analyze. Reply with exactly: OK A\n${filler(350)}`); await prompt(`Data dump B. Do not analyze. Reply with exactly: OK B\n${filler(350)}`);
    const p = prompt("/compact"); await waitFor(m => m.method === "_x.ai/queue/changed" && m.params?.runningKind === "prompt" && m.params?.runningText === "/compact", 60000).catch(() => null);
    log("ACTION", { cancelAfterMs: 2000 }); await new Promise(r => setTimeout(r, 2000)); send({ jsonrpc: "2.0", method: "session/cancel", params: { sessionId } }); log("ACTION", { cancelSent: true });
    await p.catch(e => log("ACTION", { promptError: e })); await new Promise(r => setTimeout(r, 2000)); await prompt("Reply with exactly: OK AFTER"); }
  if (scenario === "cancelauto") { await prompt(`Data dump A. Do not analyze. Reply with exactly: OK A\n${filler(350)}`);
    const p = prompt(`Data dump B. Do not analyze. Reply with exactly: OK B\n${filler(350)}`); const st = await waitFor(m => m.params?.update?.sessionUpdate === "auto_compact_started", 120000).catch(() => null);
    log("ACTION", { sawStarted: !!st, cancelAfterMs: 3000 }); await new Promise(r => setTimeout(r, 3000)); send({ jsonrpc: "2.0", method: "session/cancel", params: { sessionId } }); log("ACTION", { cancelSent: true });
    await p.catch(e => log("ACTION", { promptError: e })); await new Promise(r => setTimeout(r, 3000)); await prompt("Reply with exactly: OK AFTER"); }
} catch (e) { log("ERROR", String(e?.message ?? JSON.stringify(e))); }
log("END", {}); await new Promise(r => setTimeout(r, 1500)); child.kill(); setTimeout(() => process.exit(0), 500);

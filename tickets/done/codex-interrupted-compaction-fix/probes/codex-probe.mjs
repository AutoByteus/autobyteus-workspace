import { spawn } from "node:child_process";
import fs from "node:fs";
const [scenario, model = "", ...extra] = process.argv.slice(2);
const out = fs.createWriteStream(`/tmp/codex-probe/raw-${scenario}.jsonl`);
const t0 = Date.now(); const log = (label, data) => out.write(JSON.stringify({ label, dt: Date.now() - t0, data }) + "\n");
const filler = (n) => Array.from({ length: n }, (_, i) => `Record ${i}: the quick brown fox ${i * 7} jumps over lazy dog ${i * 13}; checksum ${(i * 2654435761) % 1000003}.`).join("\n");
const cfgArgs = extra.flatMap((kv) => ["-c", kv]);
const child = spawn("codex", ["app-server", ...cfgArgs], { cwd: "/tmp/codex-probe/work", stdio: ["pipe", "pipe", "pipe"] });
let nextId = 1; const pending = new Map(); const waiters = [];
const request = (method, params) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject, method }); log("REQ", { id, method, params: method === "turn/start" ? { ...params, input: params.input.map(i => ({ ...i, text: i.text.slice(0, 80) + `…(${i.text.length})` })) } : params }); child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"); });
const notify = (method, params) => child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
const waitFor = (pred, ms = 600000) => new Promise((resolve, reject) => { const w = { pred, resolve }; waiters.push(w); setTimeout(() => reject(new Error("timeout")), ms).unref(); });
let buf = ""; child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
child.stderr.on("data", d => log("STDERR", d.slice(0, 2000)));
child.stdout.on("data", (c) => { buf += c; let n; while ((n = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, n).trim(); buf = buf.slice(n + 1); if (!line) continue; let m; try { m = JSON.parse(line); } catch { log("NONJSON", line.slice(0, 500)); continue; }
  if (m.id !== undefined && (m.result !== undefined || m.error !== undefined) && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); log("RES", { id: m.id, method: p.method, result: m.result, error: m.error }); m.error ? p.reject(m.error) : p.resolve(m.result); continue; }
  if (m.id !== undefined && m.method) { log("SERVER_REQ", m); child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: m.id, result: { decision: "accept" } }) + "\n"); continue; }
  log("NOTE", m); for (const w of [...waiters]) if (w.pred(m)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(m); } } });
const text = (t) => [{ type: "text", text: t, text_elements: [] }];
const turnDone = () => waitFor(m => m.method === "turn/completed");
try {
  await request("initialize", { clientInfo: { name: "compaction-probe", version: "0.0.1" }, capabilities: { experimentalApi: true } }); notify("initialized", {});
  if (scenario === "models") { const r = await request("model/list", {}); console.log(JSON.stringify(r).slice(0, 3000)); child.kill(); process.exit(0); }
  const th = await request("thread/start", { model: model || null, cwd: "/tmp/codex-probe/work", approvalPolicy: "never", sandbox: "read-only", experimentalRawEvents: true, persistExtendedHistory: true, ephemeral: false });
  const threadId = th?.thread?.id ?? th?.threadId; log("THREAD", { threadId });
  const send = async (t) => { await request("turn/start", { threadId, input: text(t), summary: "auto" }); return turnDone(); };
  if (scenario === "manual-api") { await send("Reply with exactly: OK ONE"); await request("thread/compact/start", { threadId }); await waitFor(m => m.method === "turn/completed" || m.method === "thread/compacted", 600000); await new Promise(r => setTimeout(r, 3000)); await send("Reply with exactly: OK AFTER"); }
  if (scenario === "slash") { await send("Reply with exactly: OK ONE"); await send("/compact"); await send("Reply with exactly: OK AFTER"); }
  if (scenario === "auto") { for (let i = 1; i <= 6; i++) await send(`Data dump ${i}. Do not analyze. Reply with exactly: OK DUMP${i}\n${filler(700)}`); await send("Reply with exactly: OK AFTER"); }
  if (scenario === "interrupt-manual") { await send(`Data dump. Do not analyze. Reply with exactly: OK DUMP\n${filler(1500)}`); await request("thread/compact/start", { threadId });
    const started = await waitFor(m => m.method === "item/started" && /compaction/i.test(JSON.stringify(m.params?.item?.type ?? "")), 120000).catch(() => null);
    const ts = await waitFor(() => true, 1).catch(() => null);
    const turnId = started?.params?.turnId; log("ACTION", { interruptTurnId: turnId, afterMs: 1500 }); await new Promise(r => setTimeout(r, 1500));
    await request("turn/interrupt", { threadId, turnId }).catch(e => log("ACTION", { interruptError: e }));
    await waitFor(m => m.method === "turn/completed", 120000).catch(() => log("ACTION", { noTurnCompleted: true })); await new Promise(r => setTimeout(r, 2000)); await send("Reply with exactly: OK AFTER"); }
  if (scenario === "interrupt-auto") { await send(`Data dump 1. Do not analyze. Reply with exactly: OK DUMP1\n${filler(700)}`);
    await request("turn/start", { threadId, input: text(`Data dump 2. Do not analyze. Reply with exactly: OK DUMP2\n${filler(700)}`), summary: "auto" });
    const started = await waitFor(m => m.method === "item/started" && m.params?.item?.type === "contextCompaction", 120000).catch(() => null);
    const turnId = started?.params?.turnId; log("ACTION", { interruptTurnId: turnId, afterMs: 800 }); await new Promise(r => setTimeout(r, 800));
    await request("turn/interrupt", { threadId, turnId }).catch(e => log("ACTION", { interruptError: e }));
    await waitFor(m => m.method === "turn/completed", 120000).catch(() => log("ACTION", { noTurnCompleted: true })); await new Promise(r => setTimeout(r, 4000)); await send("Reply with exactly: OK AFTER"); }
  if (scenario === "empty-compact") { await request("thread/compact/start", { threadId }).catch(e => log("ACTION", { compactError: e })); await waitFor(m => m.method === "turn/completed" || m.method === "error", 60000).catch(() => log("ACTION", { noTurnCompleted: true })); await new Promise(r => setTimeout(r, 2000)); }
} catch (e) { log("ERROR", String(e?.message ?? JSON.stringify(e))); }
log("END", {}); child.kill(); setTimeout(() => process.exit(0), 500);

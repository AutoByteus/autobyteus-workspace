// Raw JSON-RPC probe of `dsh --profile acp`. Records every frame both ways.
// Usage: node dsh-acp-probe.mjs <dshBin> <cwd> <out.jsonl> <stepsJson>
import { spawn } from "node:child_process";
import fs from "node:fs";
const [bin, cwd, outPath, stepsJson] = process.argv.slice(2);
const steps = JSON.parse(stepsJson);
const out = fs.createWriteStream(outPath);
const t0 = Date.now();
const log = (dir, frame) => out.write(`${JSON.stringify({ t: Date.now() - t0, dir, frame })}\n`);
const child = spawn(bin, ["--profile", "acp", ...JSON.parse(process.env.PROBE_ARGS ?? "[]")], { cwd, env: process.env, stdio: ["pipe", "pipe", "pipe"] });
let buf = ""; let nextId = 1; const pending = new Map(); let sessionId = process.env.PROBE_SESSION ?? null;
child.stderr.setEncoding("utf8"); child.stderr.on("data", (c) => log("stderr", c));
child.on("exit", (code, signal) => { log("exit", { code, signal }); out.end(() => process.exit(0)); });
child.stdout.setEncoding("utf8");
child.stdout.on("data", (c) => {
  buf += c; let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue;
    let f; try { f = JSON.parse(line); } catch { log("in-raw", line); continue; }
    log("in", f);
    if (f.id !== undefined && f.method === undefined && pending.has(f.id)) { pending.get(f.id)(f); pending.delete(f.id); }
    else if (f.method === "session/request_permission") send({ jsonrpc: "2.0", id: f.id, result: { outcome: { outcome: "selected", optionId: process.env.PROBE_PERMISSION ?? "reject-once" } } });
  }
});
const send = (f) => { log("out", f); child.stdin.write(JSON.stringify(f) + "\n"); };
const request = (method, params) => new Promise((r) => { const id = nextId++; pending.set(id, r); send({ jsonrpc: "2.0", id, method, params }); });
const sub = (v) => JSON.parse(JSON.stringify(v).replaceAll('"$session"', JSON.stringify(sessionId)));
const open = [];
const timeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r({ timeout: ms }), ms))]);
for (const s of steps) {
  log("probe", s);
  if (s.op === "sleep") { await new Promise((r) => setTimeout(r, s.ms)); continue; }
  if (s.op === "notify") { send({ jsonrpc: "2.0", method: s.method, params: sub(s.params ?? {}) }); continue; }
  if (s.nowait) { const p = request(s.method, sub(s.params ?? {})); open.push(p); continue; }
  if (s.op === "waitAll") { await timeout(Promise.all(open), s.timeoutMs ?? 60000); continue; }
  const res = await timeout(request(s.method, sub(s.params ?? {})), s.timeoutMs ?? 60000);
  if (res?.result?.sessionId) sessionId = res.result.sessionId;
}
log("probe", "DONE"); child.stdin.end(); setTimeout(() => child.kill("SIGTERM"), 15000);

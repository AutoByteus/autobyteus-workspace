#!/usr/bin/env node
// Temporary ticket probe (autobyteus-139, DESK-01). Not durable coverage.
// Attaches to an isolated AutoByteus instance's CDP control port as an extra client and records:
//  - every WebSocket frame the renderer receives on /ws/agent-team, /ws/agent-org, /ws/agent-collaboration
//    and /ws/agent (Network.webSocketFrameReceived), plus socket create/close events (a reopen shows as a new socket);
//  - console warnings/errors and log entries (gap rejections are logged as "Rejected Team execution message (…GAP)");
//  - renderer long tasks (PerformanceObserver 'longtask', installed now and on every new document).
// Stops when <out>.stop exists, then writes <out> (JSONL), <out>.console.jsonl, <out>.longtasks.json.
// Usage: node cdp-sequenced-recorder.mjs --control-port <n> --out <file.jsonl>
import { existsSync, writeFileSync } from "node:fs";

const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const port = Number(arg("--control-port"));
const out = arg("--out");
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find((t) => t.type === "page" && String(t.url).includes("renderer/index.html"));
if (!page) throw new Error("renderer page not found");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
const sockets = new Map(); const frames = []; const consoleEntries = [];
const LONGTASK = `(() => { if (window.__abtLT) return; window.__abtLT = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__abtLT.push({ start: Math.round(e.startTime), duration: Math.round(e.duration), wall: Math.round(performance.timeOrigin + e.startTime) }); }).observe({ type: 'longtask', buffered: true }); } catch (e) { window.__abtLTError = String(e); } })()`;
const longTasks = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(String(ev.data));
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); return; }
  const p = msg.params;
  if (msg.method === "Network.webSocketCreated") { sockets.set(p.requestId, p.url); frames.push({ ts: null, wall: Date.now(), socket: p.requestId, url: p.url, type: "__CREATED__" }); }
  if (msg.method === "Network.webSocketClosed") frames.push({ ts: p.timestamp, wall: Date.now(), socket: p.requestId, url: sockets.get(p.requestId), type: "__CLOSED__" });
  if (msg.method === "Network.webSocketFrameReceived") {
    const url = sockets.get(p.requestId) ?? "unknown";
    if (!/\/ws\/agent/.test(url)) return;
    let parsed = null; try { parsed = JSON.parse(p.response.payloadData); } catch { /* ignore */ }
    frames.push({ ts: p.timestamp, wall: Date.now(), socket: p.requestId, url, type: parsed?.type ?? "?", payload: parsed?.payload ?? null });
  }
  if (msg.method === "Runtime.consoleAPICalled" && ["warning", "error", "warn"].includes(p.type))
    consoleEntries.push({ wall: Date.now(), level: p.type, text: p.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 1000) });
  if (msg.method === "Log.entryAdded" && ["warning", "error"].includes(p.entry.level))
    consoleEntries.push({ wall: Date.now(), level: `log:${p.entry.level}`, text: String(p.entry.text).slice(0, 1000) });
  if (msg.method === "Page.loadEventFired") frames.push({ ts: null, wall: Date.now(), socket: null, type: "__PAGE_LOAD__" });
});
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
await send("Network.enable"); await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
await send("Page.addScriptToEvaluateOnNewDocument", { source: LONGTASK });
await send("Runtime.evaluate", { expression: LONGTASK });
console.log(JSON.stringify({ attached: page.url, startedAt: new Date().toISOString() }));
const collectLongTasks = async () => {
  const r = await send("Runtime.evaluate", { expression: "JSON.stringify(window.__abtLT || [])", returnByValue: true });
  try { for (const t of JSON.parse(r.result.value)) if (!longTasks.some((x) => x.wall === t.wall)) longTasks.push(t); } catch { /* none */ }
};
let lastLT = 0;
while (!existsSync(`${out}.stop`)) {
  if (existsSync(`${out}.reload`) && !frames.some((f) => f.type === "__RELOAD_REQUESTED__")) {
    await collectLongTasks(); frames.push({ ts: null, wall: Date.now(), socket: null, type: "__RELOAD_REQUESTED__" }); await send("Page.reload", {});
  }
  if (Date.now() - lastLT > 2000) { lastLT = Date.now(); try { await collectLongTasks(); } catch { /* page reloading */ } }
  await new Promise((r) => setTimeout(r, 100));
}
await collectLongTasks();
ws.close();
writeFileSync(out, frames.map((f) => JSON.stringify(f)).join("\n") + "\n");
writeFileSync(`${out}.console.jsonl`, consoleEntries.map((c) => JSON.stringify(c)).join("\n") + "\n");
writeFileSync(`${out}.longtasks.json`, JSON.stringify(longTasks.sort((a, b) => a.wall - b.wall), null, 1));
console.log(JSON.stringify({ frames: frames.length, console: consoleEntries.length, longTasks: longTasks.length }));
process.exit(0);

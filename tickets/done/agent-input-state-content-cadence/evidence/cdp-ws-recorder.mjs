#!/usr/bin/env node
// Temporary ticket probe (PB-001, DESK-01). Not durable coverage.
// Attaches to an isolated AutoByteus instance's control port (Chrome DevTools Protocol) as an
// extra CDP client and records every WebSocket frame the renderer receives on `/ws/agent/…`
// (Network.webSocketFrameReceived), with the renderer's own monotonic timestamps.
// It keeps recording across renderer reloads (new sockets are picked up by request id).
// Stops when <out>.stop exists; then writes <out> (JSONL) and <out>.summary.json.
//
// Usage: node cdp-ws-recorder.mjs --control-port <n> --out <file.jsonl>
import { existsSync, writeFileSync } from "node:fs";

const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const port = Number(arg("--control-port"));
const out = arg("--out");
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find((t) => t.type === "page" && String(t.url).includes("renderer/index.html"));
if (!page) throw new Error(`renderer page not found: ${JSON.stringify(targets.map((t) => t.url))}`);
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const send = (method, params = {}) => ws.send(JSON.stringify({ id: ++id, method, params }));
const sockets = new Map(); // requestId -> url
const frames = [];
ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(String(ev.data));
  if (msg.method === "Network.webSocketCreated") sockets.set(msg.params.requestId, msg.params.url);
  if (msg.method === "Network.webSocketClosed") frames.push({ at: null, socket: msg.params.requestId, url: sockets.get(msg.params.requestId), type: "__CLOSED__", ts: msg.params.timestamp });
  if (msg.method === "Network.webSocketFrameReceived") {
    const url = sockets.get(msg.params.requestId) ?? "unknown";
    if (!url.includes("/ws/agent/")) return;
    let parsed = null; try { parsed = JSON.parse(msg.params.response.payloadData); } catch { /* binary */ }
    frames.push({ ts: msg.params.timestamp, socket: msg.params.requestId, url, type: parsed?.type ?? "?", payload: parsed?.payload ?? null });
  }
});
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
send("Network.enable");
console.log(JSON.stringify({ attached: page.url, startedAt: new Date().toISOString() }));
// `<out>.reload` (created by the operator) makes the recorder reload the renderer through CDP
// (Page.reload, as Cmd+R / View › Reload does); the page's own location.reload() is ignored by the app.
let reloaded = false;
while (!existsSync(`${out}.stop`)) {
  if (!reloaded && existsSync(`${out}.reload`)) {
    reloaded = true;
    send("Page.reload", { ignoreCache: false });
    frames.push({ ts: null, wall: Date.now(), socket: null, type: "__PAGE_RELOAD__" });
    console.log(JSON.stringify({ reloadAtWall: Date.now() }));
  }
  await new Promise((r) => setTimeout(r, 50));
}
ws.close();
writeFileSync(out, frames.map((f) => JSON.stringify(f)).join("\n") + "\n");

const bySocket = {};
for (const f of frames) if (f.socket) (bySocket[f.socket] ??= []).push(f);
const summary = {};
for (const [sock, list] of Object.entries(bySocket)) {
  const live = list.filter((f) => f.type !== "__CLOSED__");
  const revs = live.filter((f) => f.type === "AGENT_INPUT_STATE").map((f) => f.payload.revision);
  const content = live.map((f, i) => ({ f, i })).filter(({ f }) => f.type === "SEGMENT_CONTENT");
  const lastBySeg = new Map();
  const gaps = []; const triggers = {};
  for (const { f, i } of content) {
    const prev = lastBySeg.get(f.payload.id); lastBySeg.set(f.payload.id, f);
    if (prev) gaps.push(Math.round((f.ts - prev.ts) * 1000));
    const next = live[i + 1];
    const trig = next && next.type !== "SEGMENT_CONTENT" && (next.ts - f.ts) * 1000 <= 5 ? next.type : "window";
    triggers[trig] = (triggers[trig] ?? 0) + 1;
  }
  const sorted = [...gaps].sort((a, b) => a - b);
  summary[sock] = { url: list[0]?.url, frames: live.length, closed: list.some((f) => f.type === "__CLOSED__"),
    typeCounts: live.reduce((m, f) => ({ ...m, [f.type]: (m[f.type] ?? 0) + 1 }), {}),
    inputStateRevisions: revs, inputStateRepeats: revs.filter((r, i) => i > 0 && r <= revs[i - 1]).length,
    inputStates: live.filter((f) => f.type === "AGENT_INPUT_STATE").map((f) => ({ ts: f.ts, revision: f.payload.revision,
      entries: (f.payload.entries ?? []).map((e) => ({ state: e.state, content: String(e.content ?? "").slice(0, 40) })) })),
    contentFrames: content.length,
    contentGaps: sorted.length ? { n: sorted.length, min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], max: sorted.at(-1), under350: sorted.filter((g) => g < 350).length } : { n: 0 },
    flushTriggers: triggers };
}
writeFileSync(`${out}.summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
process.exit(0);

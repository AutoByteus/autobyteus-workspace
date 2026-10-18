#!/usr/bin/env node
// Temporary ticket analysis (autobyteus-139, DESK-01). Splits the CDP recording of the renderer's sockets
// (cdp-sequenced-recorder.mjs output) into one probe-format JSONL per sequenced socket and reports, per
// socket: endpoint, created/closed, frame counts, sequence coverage from each snapshot base (gaps), batch
// count, two-agent batches, window gaps between window-closed batches, and the console warnings/errors
// recorded in the same period (gap rejections log "Rejected Team execution message (…)" / reopen errors).
// Usage: node desk-analyze-renderer.mjs <recording.jsonl> <out dir>
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const [rec, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const rows = readFileSync(rec, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const consoleFile = `${rec}.console.jsonl`;
const consoleRows = existsSync(consoleFile) ? readFileSync(consoleFile, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const bySocket = new Map();
for (const r of rows) { if (!r.socket) continue; if (!bySocket.has(r.socket)) bySocket.set(r.socket, []); bySocket.get(r.socket).push(r); }
const seqOf = (f) => {
  if (f.type === "SEGMENT_CONTENT_BATCH") return [f.payload.change_sequence, f.payload.change_sequence_through, true, f.payload.items.map((i) => i.agent_run_id)];
  if (f.type === "ROOT_EXECUTION_EVENT") { const e = f.payload.event; const b = e?.kind === "agent_presentation_batch";
    return [f.payload.change_sequence, f.payload.change_sequence_through ?? f.payload.change_sequence, b, b ? e.items.map((i) => i.agent_run_id) : []]; }
  if (typeof f.payload?.change_sequence === "number") return [f.payload.change_sequence, f.payload.change_sequence, false, []];
  return null;
};
const deepFind = (o, k, d = 0) => { if (!o || typeof o !== "object" || d > 6) return undefined; if (k in o) return o[k]; for (const v of Object.values(o)) { const r = deepFind(v, k, d + 1); if (r !== undefined) return r; } return undefined; };
const report = [];
let n = 0;
for (const [sock, list] of bySocket) {
  const url = list.find((r) => r.url)?.url ?? "unknown";
  if (!/agent-team|agent-org|agent-collaboration/.test(url)) continue;
  n++;
  const frames = list.filter((r) => !r.type.startsWith("__")).map((r) => ({ at: Math.round(r.ts * 1000 * 10) / 10, type: r.type, payload: r.payload }));
  const file = path.join(outDir, `socket-${n}-${url.split("/ws/")[1].split("/")[0]}.jsonl`);
  writeFileSync(file, frames.map((f) => JSON.stringify(f)).join("\n") + "\n");
  let next = null; const gaps = []; const snaps = [];
  const batches = [];
  for (const f of frames) {
    if (f.type === "TEAM_EXECUTION_VIEW_SNAPSHOT" || f.type === "ROOT_EXECUTION_VIEW_SNAPSHOT") { const base = deepFind(f.payload, "base_change_sequence"); snaps.push(base); next = base + 1; continue; }
    const s = seqOf(f); if (!s) continue;
    if (next !== null && s[0] !== next) gaps.push({ expected: next, first: s[0], type: f.type });
    next = s[1] + 1;
    if (s[2]) batches.push({ at: f.at, agents: new Set(s[3]).size });
  }
  const g = []; for (let k = 1; k < batches.length; k++) g.push(Math.round(batches[k].at - batches[k - 1].at));
  const sg = [...g].sort((a, b) => a - b);
  const first = list[0].wall, last = list.at(-1).wall;
  report.push({ socket: n, url, created: list.some((r) => r.type === "__CREATED__"), closed: list.some((r) => r.type === "__CLOSED__"),
    frames: frames.length, snapshots: snaps, gaps, batches: batches.length, twoAgentBatches: batches.filter((b) => b.agents > 1).length,
    batchToBatchGapMs: sg.length ? { n: sg.length, min: sg[0], p10: sg[Math.floor(sg.length * 0.1)], median: sg[Math.floor(sg.length / 2)], under350: sg.filter((x) => x < 350).length } : null,
    plainSegmentContent: frames.filter((f) => f.type === "SEGMENT_CONTENT" || f.payload?.event?.message?.type === "SEGMENT_CONTENT").length,
    consoleInPeriod: consoleRows.filter((c) => c.wall >= first && c.wall <= last + 1000).map((c) => `${c.level}: ${c.text.slice(0, 200)}`), file });
}
const allConsole = consoleRows.map((c) => `${new Date(c.wall).toISOString()} ${c.level}: ${c.text.slice(0, 300)}`);
const gapRejections = consoleRows.filter((c) => /CHANGE_SEQUENCE_GAP|Rejected Team execution message|reopen/i.test(c.text));
console.log(JSON.stringify({ recording: rec, sockets: report, gapOrReopenConsoleLines: gapRejections.length, consoleWarningsAndErrors: allConsole }, null, 1));

#!/usr/bin/env node
// Temporary ticket analysis (autobyteus-139, UNK-001 / REQ-002). Reads one socket's frames JSONL
// (from live-sequenced-probe.mjs) and reports, for the Team or root-execution wire format:
//  - the frames between consecutive batch frames (expected: at most one standalone status per agent);
//  - every standalone status that followed a batch within 5 ms: identical to that agent's last forwarded
//    status or not, and how long after the previous sequenced frame the batch left (≈ window = timer flush,
//    i.e. the status arrived after the flush with no batch pending, which the design forwards);
//  - batch range sizes (sequences covered per batch, including absorbed statuses).
// Usage: node analyze-status-windows.mjs <frames.jsonl>
import { readFileSync } from "node:fs";

const L = readFileSync(process.argv[2], "utf8").trim().split("\n").map((l) => JSON.parse(l));
const norm = (f) => {
  if (f.type === "SEGMENT_CONTENT_BATCH") return { seq: f.payload.change_sequence, through: f.payload.change_sequence_through, batch: true };
  if (f.type === "ROOT_EXECUTION_EVENT") {
    const e = f.payload.event;
    if (e.kind === "agent_presentation_batch") return { seq: f.payload.change_sequence, through: f.payload.change_sequence_through, batch: true };
    if (e.kind === "agent_presentation") return { seq: f.payload.change_sequence, through: f.payload.change_sequence, kind: e.message.type,
      agent: e.agent_run_id, status: e.message.type === "AGENT_STATUS" ? { member: e.member_address, ...e.message.payload } : null };
    return { seq: f.payload.change_sequence, through: f.payload.change_sequence, kind: `event:${e.kind}` };
  }
  if (typeof f.payload?.change_sequence === "number") {
    const { change_sequence, ...rest } = f.payload;
    return { seq: change_sequence, through: change_sequence, kind: f.type, agent: f.payload.agent_run_id, status: f.type === "AGENT_STATUS" ? rest : null };
  }
  return null;
};
const seq = L.map((f) => ({ f, v: norm(f) })).filter((x) => x.v);
const lastForwarded = {};
const between = {}; let cur = [];
const afterBatch = { identical: 0, changedOrNoBaseline: 0, sinceStats: [] };
for (let k = 0; k < seq.length; k++) {
  const { f, v } = seq[k];
  if (v.batch) {
    const key = cur.join(",") || "(none)"; between[key] = (between[key] ?? 0) + 1; cur = [];
    const next = seq[k + 1];
    if (next?.v.status && next.f.at - f.at <= 5) {
      const same = JSON.stringify(lastForwarded[next.v.agent]) === JSON.stringify(next.v.status);
      same ? afterBatch.identical++ : afterBatch.changedOrNoBaseline++;
      if (k > 0) afterBatch.sinceStats.push(Math.round(f.at - seq[k - 1].f.at));
    }
    continue;
  }
  if (v.status) { cur.push(`AGENT_STATUS:${v.status.status}`); lastForwarded[v.agent] = v.status; } else cur.push(v.kind);
}
const st = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? { n: s.length, min: s[0], median: s[Math.floor(s.length / 2)], max: s.at(-1) } : { n: 0 }; };
const ranges = seq.filter((x) => x.v.batch).map((x) => x.v.through - x.v.seq + 1);
const total = Object.values(between).reduce((a, b) => a + b, 0);
console.log(`# frames file: ${process.argv[2]}`);
console.log(`batch frames: ${ranges.length}; sequences per batch: ${JSON.stringify(st(ranges))}`);
console.log(`frames between consecutive batches (top patterns, of ${total} gaps):`);
for (const [k, n] of Object.entries(between).sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`  ${n} × [${k.length > 300 ? k.slice(0, 300) + "…" : k}]`);
console.log(`standalone statuses within 5 ms after a batch: identical-to-last-forwarded=${afterBatch.identical}, changed-or-no-baseline=${afterBatch.changedOrNoBaseline}`);
console.log(`  for those batches, ms since the previous sequenced frame (≈ window means a timer flush): ${JSON.stringify(st(afterBatch.sinceStats))}`);

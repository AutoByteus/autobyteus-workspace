#!/usr/bin/env node
// Temporary ticket check (autobyteus-139, AC-007 "correct final text"). For one probe output folder,
// compares, per agent, the text received on the socket (batch items + any plain content, concatenated
// per segment in arrival order) with the server's persisted projection (projections.json, written by
// live-sequenced-probe.mjs): every reasoning/text entry of the projection, in order, must equal the
// corresponding streamed segment exactly (whitespace-trimmed). A lost tail, an extra delta or a reorder fails.
// Usage: node check-final-text.mjs <probe output folder> [socket name, default S1]
import { readFileSync } from "node:fs";
import path from "node:path";

const dir = process.argv[2]; const socket = process.argv[3] ?? "S1";
const frames = readFileSync(path.join(dir, `frames-${socket}.jsonl`), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const projections = JSON.parse(readFileSync(path.join(dir, "projections.json"), "utf8"));
const segments = new Map(); // agent -> [{segment, type, text}]
const add = (agent, segment, type, delta) => {
  const list = segments.get(agent) ?? []; segments.set(agent, list);
  let entry = list.find((e) => e.segment === segment);
  if (!entry) { entry = { segment, type, text: "" }; list.push(entry); }
  entry.text += delta;
};
for (const f of frames) {
  if (f.type === "SEGMENT_CONTENT_BATCH") for (const i of f.payload.items) add(i.agent_run_id, i.segment_id, i.segment_type, i.delta);
  if (f.type === "SEGMENT_CONTENT") add(f.payload.agent_run_id, f.payload.segment_id, f.payload.segment_type, f.payload.delta);
  if (f.type === "ROOT_EXECUTION_EVENT") {
    const e = f.payload.event;
    if (e.kind === "agent_presentation_batch") for (const i of e.items) add(i.agent_run_id, i.message.payload.segment_id, i.message.payload.segment_type, i.message.payload.delta);
    if (e.kind === "agent_presentation" && e.message.type === "SEGMENT_CONTENT") add(e.agent_run_id, e.message.payload.segment_id, e.message.payload.segment_type, e.message.payload.delta);
  }
}
let allEqual = true;
console.log(`# frames: ${dir}/frames-${socket}.jsonl; projections: ${dir}/projections.json`);
for (const [agent, raw] of Object.entries(projections)) {
  if (typeof raw !== "string" || raw.startsWith("ERROR")) { console.log(`${agent}: projection unavailable (${String(raw).slice(0, 120)})`); allEqual = false; continue; }
  const entries = JSON.parse(raw).filter((e) => e.kind === "reasoning" || (e.kind === "message" && e.role === "assistant") || e.kind === "text");
  const streamed = (segments.get(agent) ?? []).filter((s) => s.type === "reasoning" || s.type === "text");
  const rows = [];
  const n = Math.max(entries.length, streamed.length);
  for (let k = 0; k < n; k++) {
    const p = entries[k]; const s = streamed[k];
    const pt = (p?.content ?? "").trim(); const st = (s?.text ?? "").trim();
    const equal = pt === st; // both empty: an assistant entry with no text yet (e.g. stopped during reasoning)
    if (!equal) allEqual = false;
    rows.push(`  #${k + 1} projection ${p ? `${p.kind}${p.role ? "/" + p.role : ""}` : "-"} (${pt.length} chars) vs streamed ${s ? s.type : "-"} (${st.length} chars): ${equal ? "EQUAL" : "DIFFERENT"}`
      + (equal ? "" : ` | projection tail: ${JSON.stringify(pt.slice(-60))} | streamed tail: ${JSON.stringify(st.slice(-60))}`));
  }
  console.log(`${agent}: ${entries.length} projection entries, ${streamed.length} streamed segments`);
  for (const r of rows) console.log(r);
}
console.log(`RESULT: ${allEqual ? "ALL EQUAL" : "MISMATCH"}`);

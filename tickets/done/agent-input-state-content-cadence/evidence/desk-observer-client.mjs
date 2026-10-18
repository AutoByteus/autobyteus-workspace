#!/usr/bin/env node
// Temporary ticket probe (PB-001, DESK-01). Not durable coverage.
// A second `/ws/agent/:runId` client on an isolated instance's backend (as a second window or a
// remote client is). It records its frames; once the run has streamed content for 1.5 s it sends
// one SEND_MESSAGE (queued behind the running turn) and writes <out>.m2.json with the wall-clock
// send time, so the renderer's "Queued" display can be timed against it.
// Exits after <turns> TURN_COMPLETED frames that follow its own message, or on timeout.
//
// Usage: node desk-observer-client.mjs --backend <http://127.0.0.1:port> --run-id <id> --out <file.jsonl> --message <text>
import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const backend = arg("--backend"), runId = arg("--run-id"), out = arg("--out"), message = arg("--message");
const frames = [];
const ws = new WebSocket(`${backend.replace("http", "ws")}/ws/agent/${runId}`);
let m2 = null;
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(String(ev.data));
  frames.push({ at: Math.round(performance.now() * 10) / 10, wall: Date.now(), type: m.type, payload: m.payload });
});
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
console.log(JSON.stringify({ connected: true, wall: Date.now() }));
const deadline = Date.now() + 15 * 60_000;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
while (Date.now() < deadline) {
  const first = frames.find((f) => f.type === "SEGMENT_CONTENT");
  if (!m2 && first && performance.now() - first.at > 1_500) {
    const messageId = `desk-${randomUUID()}`;
    m2 = { wall: Date.now(), at: Math.round(performance.now() * 10) / 10, messageId };
    ws.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: messageId,
      dedupe_key: `agent_run_input:desk:${messageId}`, context_file_paths: [], image_urls: [], content: message } }));
    writeFileSync(`${out}.m2.json`, JSON.stringify(m2));
    console.log(JSON.stringify({ m2 }));
  }
  // Done when the turn that started after our message (the queued one) has completed.
  const queuedTurnStart = m2 ? frames.find((f) => f.type === "TURN_STARTED" && f.at > m2.at) : null;
  if (queuedTurnStart && frames.some((f) => f.type === "TURN_COMPLETED" && f.at > queuedTurnStart.at)
    && frames.at(-1).at < performance.now() - 2_000) break;
  await wait(200);
}
ws.close();
writeFileSync(out, frames.map((f) => JSON.stringify(f)).join("\n") + "\n");
console.log(JSON.stringify({ done: true, frames: frames.length }));
process.exit(0);

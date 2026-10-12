import { randomUUID } from "node:crypto";
import fs from "node:fs";
const [backendUrl, runId, promptFile] = process.argv.slice(2);
const socket = new WebSocket(backendUrl.replace(/^http/, "ws") + `/ws/agent/${runId}`);
const t0 = Date.now(); const out = []; let stopped = false;
socket.addEventListener("message", (event) => {
  const m = JSON.parse(String(event.data));
  const row = { t: Date.now() - t0, type: m.type, phase: m.payload?.phase ?? m.payload?.status ?? null,
    ingestion: m.payload?.ingestion_kind ?? null, rev: m.payload?.run_summary_after_event?.revision ?? null,
    count: m.payload?.run_summary_after_event?.usage_report_count ?? null, prompt: m.payload?.latest_prompt_tokens ?? null,
    accepted: m.payload?.accepted ?? undefined, code: m.payload?.code ?? undefined };
  if (["COMPACTION_STATUS", "TOKEN_USAGE_UPDATED", "TURN_COMPLETED", "TURN_INTERRUPTED", "ERROR", "AGENT_COMMAND_ACK"].includes(m.type)) out.push(row);
  if (!stopped && m.type === "COMPACTION_STATUS" && m.payload?.phase === "started") {
    stopped = true;
    socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: `client_interrupt_${randomUUID()}`, agent_run_id: runId } }));
    out.push({ t: Date.now() - t0, type: "SENT_INTERRUPT" });
  }
});
await new Promise((r) => socket.addEventListener("open", r));
await new Promise((r) => setTimeout(r, 800));
socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`, context_file_paths: [], image_urls: [], content: fs.readFileSync(promptFile, "utf8") } }));
const deadline = Date.now() + 300000;
while (Date.now() < deadline) {
  const settled = out.some((m) => m.type === "COMPACTION_STATUS" && ["stopped", "failed", "completed", "cancelled", "interrupted"].includes(m.phase))
    || (!stopped && out.some((m) => m.type === "TURN_COMPLETED") && Date.now() - t0 > 20000);
  if (settled) break;
  await new Promise((r) => setTimeout(r, 200));
}
await new Promise((r) => setTimeout(r, 3000));
console.log(JSON.stringify(out, null, 1));
process.exit(0);

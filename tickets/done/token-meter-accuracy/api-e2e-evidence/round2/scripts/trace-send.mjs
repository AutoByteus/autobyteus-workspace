import { randomUUID } from "node:crypto";
const [backendUrl, runId, content] = process.argv.slice(2);
const socket = new WebSocket(backendUrl.replace(/^http/, "ws") + `/ws/agent/${runId}`);
const t0 = Date.now(); const out = [];
socket.addEventListener("message", (event) => { const m = JSON.parse(String(event.data)); out.push({ t: Date.now() - t0, type: m.type,
  phase: m.payload?.phase ?? m.payload?.status ?? null, op: m.payload?.compaction_operation_id ?? m.payload?.provider_event_id ?? null,
  ingestion: m.payload?.ingestion_kind ?? null, rev: m.payload?.run_summary_after_event?.revision ?? null,
  count: m.payload?.run_summary_after_event?.usage_report_count ?? null, prompt: m.payload?.latest_prompt_tokens ?? null, error: m.type === "ERROR" ? JSON.stringify(m.payload).slice(0, 800) : undefined }); });
await new Promise((r) => socket.addEventListener("open", r));
await new Promise((r) => setTimeout(r, 800));
socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`, context_file_paths: [], image_urls: [], content } }));
const deadline = Date.now() + 240000;
while (Date.now() < deadline && !out.some((m) => (m.type === "AGENT_STATUS" && (m.phase === "idle" || m.phase === "error") && m.t > 1500) || m.type === "ERROR")) await new Promise((r) => setTimeout(r, 200));
await new Promise((r) => setTimeout(r, 1000));
console.log(JSON.stringify(out.filter((m) => ["COMPACTION_STATUS", "TOKEN_USAGE_UPDATED", "TURN_COMPLETED", "TURN_STARTED", "ERROR"].includes(m.type)), null, 1));
process.exit(0);

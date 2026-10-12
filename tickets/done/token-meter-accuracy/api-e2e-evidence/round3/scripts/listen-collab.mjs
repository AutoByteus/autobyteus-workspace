// Records token usage + compaction frames of every run under a standalone root (collaboration stream).
const [backendUrl, rootRunId, seconds] = process.argv.slice(2);
const socket = new WebSocket(backendUrl.replace(/^http/, "ws") + `/ws/agent-collaboration/${rootRunId}`);
const t0 = Date.now(); const out = [];
socket.addEventListener("message", (e) => { try { const f = JSON.parse(String(e.data)); const s = JSON.stringify(f);
  if (/TOKEN_USAGE_UPDATED|COMPACTION_STATUS|TASK_EXECUTION_STARTED/.test(s)) {
    const ev = f.payload?.event; const msg = ev?.message; out.push({ t: Date.now() - t0, type: f.type, kind: ev?.kind ?? null,
      agent: ev?.agent_run_id ?? null, msgType: msg?.type ?? null, call: msg?.payload?.reports_model_call ?? null,
      phase: msg?.payload?.phase ?? msg?.payload?.status ?? null, prompt: msg?.payload?.latest_prompt_tokens ?? null }); } } catch {} });
await new Promise((r) => socket.addEventListener("open", r));
await new Promise((r) => setTimeout(r, Number(seconds) * 1000));
socket.close(); console.log(JSON.stringify({ t0, out }, null, 1)); process.exit(0);

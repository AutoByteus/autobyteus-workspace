const [orgRunId, target, content] = process.argv.slice(2);
const ws = new WebSocket(`ws://127.0.0.1:29695/ws/agent-org/${encodeURIComponent(orgRunId)}`);
const t0 = Date.now(); const log = (s) => console.log(`[${((Date.now()-t0)/1000).toFixed(1)}] ${s}`);
let sent = false;
ws.onmessage = (e) => {
  const m = JSON.parse(String(e.data));
  const summary = m.type === "AGENT_COMMAND_ACK" ? JSON.stringify(m.payload) : JSON.stringify(m).slice(0, 220);
  log(`<- ${m.type} ${summary}`);
  if (!sent && /CONNECTED|SNAPSHOT|READY/i.test(m.type)) {
    sent = true;
    const cmd = { type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId,
      target_agent_run_id: target, command_id: crypto.randomUUID(), content, context_file_paths: [], image_urls: [],
      message_id: crypto.randomUUID(), dedupe_key: `probe:${crypto.randomUUID()}` } };
    ws.send(JSON.stringify(cmd)); log("-> SEND_MESSAGE");
  }
};
ws.onerror = (e) => log("error " + (e.message ?? ""));
ws.onclose = (e) => log(`closed ${e.code} ${e.reason}`);
setTimeout(() => { ws.close(); process.exit(0); }, Number(process.argv[5] ?? 60000));

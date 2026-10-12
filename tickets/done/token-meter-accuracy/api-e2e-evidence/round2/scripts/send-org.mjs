import fs from "node:fs";
import { randomUUID } from "node:crypto";
const [backendUrl, content] = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync("/tmp/tma-api-e2e/org2-state.json", "utf8"));
const socket = new WebSocket(backendUrl.replace(/^http/, "ws") + `/ws/agent-org/${state.rootId}`);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve); socket.addEventListener("error", reject); });
await new Promise((r) => setTimeout(r, 1500));
socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: state.rootId,
  target_agent_run_id: state.managerRunId, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content,
  context_file_paths: [], image_urls: [] } }));
await new Promise((r) => setTimeout(r, 1500));
socket.close();
process.exit(0);

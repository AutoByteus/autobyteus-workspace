// Sends one user message to an agent run over the server's agent WebSocket (as the app's composer does), without the UI.
// Usage: node pm-send.mjs <serverPort> <agentRunId> <content>
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const require = createRequire("/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/autobyteus-server-ts/package.json");
const WebSocket = require("ws");
const [port, runId, content] = process.argv.slice(2);
const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/agent/${runId}`);
const timer = setTimeout(() => { console.log(JSON.stringify({ ok: false, reason: "timeout" })); process.exit(1); }, 20000);
socket.on("message", (raw) => {
  const frame = JSON.parse(String(raw));
  if (frame.type === "CONNECTED") {
    const id = `cli-${randomUUID()}`;
    socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { agent_run_id: runId, content, message_id: id, dedupe_key: `agent_run_input:${runId}:${id}`, context_file_paths: [], image_urls: [] } }));
  }
  if (/ACCEPTED|REJECTED|ERROR|COMMAND_RESULT/.test(frame.type)) { console.log(JSON.stringify({ ok: !/REJECTED|ERROR/.test(frame.type), frame: frame.type, payload: JSON.stringify(frame.payload).slice(0, 300) })); clearTimeout(timer); socket.close(); }
});
socket.on("error", (e) => { console.log(JSON.stringify({ ok: false, reason: String(e) })); process.exit(1); });

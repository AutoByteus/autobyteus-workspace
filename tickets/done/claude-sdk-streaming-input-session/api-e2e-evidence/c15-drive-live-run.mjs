import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import WebSocket from "/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/autobyteus-server-ts/node_modules/ws/index.js";
const base = "http://127.0.0.1:8000";
const gql = async (query, variables) => {
  const r = await fetch(`${base}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
};
const unique = randomUUID().slice(0, 8);
const ws_root = fs.mkdtempSync(path.join(os.tmpdir(), "c15-web-claude-"));
const def = await gql(`mutation C($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }`,
  { input: { name: `C15 Background Notice ${unique}`, role: "assistant", description: "API/E2E C15 rendered notice check", instructions: "Do what the user asks with the available tools. Keep replies short.", toolNames: [] } });
const run = await gql(`mutation R($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }`,
  { input: { agentDefinitionId: def.createAgentDefinition.id, workspaceRootPath: ws_root, llmModelIdentifier: "haiku", autoExecuteTools: true, llmConfig: null, skillAccessMode: "NONE", runtimeKind: "claude_agent_sdk" } });
if (!run.createAgentRun.success) throw new Error(run.createAgentRun.message);
const runId = run.createAgentRun.runId;
console.log("RUN", runId, "DEF", def.createAgentDefinition.id, "WS", ws_root);
const socket = new WebSocket(`ws://127.0.0.1:8000/ws/agent/${runId}`);
const seen = [];
socket.on("message", (d) => { try { seen.push(JSON.parse(String(d))); } catch {} });
await new Promise((res, rej) => { socket.once("open", res); socket.once("error", rej); });
const marker = path.join(ws_root, "marker");
const messageId = `c15-${randomUUID()}`;
socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: messageId, dedupe_key: `agent_run_input:c15:${messageId}`, context_file_paths: [], image_urls: [],
  content: [`Use the Bash tool with run_in_background set to true to run this exact command:`, `sleep 15; echo done > ${marker}`, "Do not wait for it. Reply only STARTED and end your turn.", "When you are later notified that it finished, reply with the content of the marker file."].join("\n") } }));
const deadline = Date.now() + 180000;
while (Date.now() < deadline) {
  const ni = seen.findIndex((m) => m.type === "SYSTEM_TASK_NOTIFICATION");
  if (ni >= 0 && seen.slice(ni).some((m) => m.type === "TURN_COMPLETED")) break;
  await new Promise((r) => setTimeout(r, 500));
}
const notice = seen.find((m) => m.type === "SYSTEM_TASK_NOTIFICATION");
console.log("NOTICE", JSON.stringify(notice?.payload));
console.log("TOOLS", JSON.stringify(seen.filter((m) => m.type === "TOOL_EXECUTION_STARTED").map((m) => m.payload?.arguments)));
console.log("TYPES", seen.map((m) => m.type).filter((t) => t.startsWith("TURN") || t.startsWith("SYSTEM")).join(","));
socket.close();
const term = await gql(`mutation T($agentRunId: String!) { terminateAgentRun(agentRunId: $agentRunId) { success message } }`, { agentRunId: runId });
console.log("TERMINATED", JSON.stringify(term));
fs.writeFileSync("/tmp/c15-web/run.json", JSON.stringify({ runId, definitionId: def.createAgentDefinition.id, workspaceRoot: ws_root, notice: notice?.payload }));
process.exit(0);

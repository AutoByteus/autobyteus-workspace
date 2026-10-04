// TEMPORARY API/E2E dev-stack driver (standalone-agent-run-root). Not durable coverage.
// Usage: node devstack-driver.mjs <command> [args...]   (backend http://127.0.0.1:8000)
//   seed                         create helper def + General Agent run (Claude haiku), mention + brief + report; prints ids
//   host-turn <runId> <text>     send one host user turn on /ws/agent/<runId>, wait idle
//   child-turn <hostRunId> <childRunId> <text>   send a child command on /ws/agent-collaboration/<hostRunId>, wait for ack
//   view <runId>                 print the collaboration view
//   tokens <hostRunId>           print standalone roll-up and exact-run summaries
//   stop <runId>                 terminateAgentRun
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
const require = createRequire("/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/autobyteus-server-ts/package.json");
const WebSocket = require("ws");
const BASE = "http://127.0.0.1:8000";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const gql = async (query, variables = {}) => {
  const res = await fetch(`${BASE}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const body = await res.json();
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
  return body.data;
};
const open = async (p) => {
  const socket = new WebSocket(`ws://127.0.0.1:8000${p}`);
  const messages = [];
  socket.on("message", (raw) => { try { const m = JSON.parse(raw.toString()); if (m.type) messages.push(m); } catch {} });
  await new Promise((res, rej) => { socket.once("open", res); socket.once("error", rej); });
  await waitFor(messages, 0, (m) => m.type === "CONNECTED", "CONNECTED");
  return { socket, messages };
};
const waitFor = async (messages, from, pred, label, timeout = 360_000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const f = messages.slice(from).find(pred); if (f) return f; await wait(300); }
  throw new Error(`timeout ${label}: ${messages.slice(-8).map((m) => m.type + ":" + JSON.stringify(m.payload).slice(0, 140)).join(" | ")}`);
};
const ids = () => { const id = `drv-${randomUUID()}`; return { message_id: id, dedupe_key: `agent_run_input:drv:${id}` }; };
const view = async (runId) => (await gql("query($runId: String!) { agentRunCollaboration(runId: $runId) }", { runId })).agentRunCollaboration?.root_agent ?? null;
const hostTurn = async (runId, content, mentions) => {
  const c = await open(`/ws/agent/${runId}`);
  const from = c.messages.length;
  c.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { ...ids(), context_file_paths: [], image_urls: [], content, ...(mentions ? { mentions } : {}) } }));
  const ack = await waitFor(c.messages, from, (m) => m.type === "AGENT_COMMAND_ACK", "ack");
  console.log("ACK", JSON.stringify(ack.payload));
  await waitFor(c.messages, from, (m) => m.type === "AGENT_STATUS" && m.payload.status === "idle", "idle");
  c.socket.close();
};
const SUMMARY = "runId totalTokens grossInputTokens outputTokens latestPromptTokens effectiveContextWindowTokens latestModelIdentifier estimatedApiInputCost";
const tokens = async (hostRunId) => {
  const v = await view(hostRunId);
  const childIds = [];
  for (const c of v?.execution_tree.collaborators ?? []) { if (c.kind === "agent") childIds.push(c.agentRunId); else for (const m of c.members ?? []) childIds.push(m.agentRunId); }
  for (const t of v?.execution_tree.taskExecutions ?? []) if (t.agentRunId) childIds.push(t.agentRunId);
  const rolled = (await gql(`query($id: String!) { getStandaloneRunTokenUsageSummary(runId: $id) { ${SUMMARY} } }`, { id: hostRunId })).getStandaloneRunTokenUsageSummary;
  const exact = [];
  for (const id of [hostRunId, ...childIds]) exact.push((await gql(`query($id: String!) { getAgentRunTokenUsageSummary(runId: $id) { ${SUMMARY} } }`, { id })).getAgentRunTokenUsageSummary);
  const sum = exact.reduce((t, e) => t + e.totalTokens, 0);
  console.log(JSON.stringify({ rolled, exact, sumOfExact: sum, equal: sum === rolled.totalTokens }, null, 1));
};
const [cmd, ...args] = process.argv.slice(2);
if (cmd === "seed") {
  const suffix = randomUUID().slice(0, 4);
  const helperId = (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }", { input: {
    name: `Echo Helper ${suffix}`, description: "API/E2E dev-stack helper.", category: "api-e2e",
    instructions: "When another agent messages you, do what it asks: call send_message_to exactly once with recipient_address set to the sender address (or target_agent_run_id set to the sender id) given in the message and content set to the exact text it asks for. Then reply 'sent' and stop. When the user talks to you directly, do exactly what the user says.",
    toolNames: ["send_message_to", "run_bash"] } })).createAgentDefinition.id;
  const ws = mkdtempSync(path.join(os.tmpdir(), "sar-devstack-ws-"));
  const run = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }", { input: {
    agentDefinitionId: "autobyteus-daily-assistant", workspaceRootPath: ws, llmModelIdentifier: "haiku", autoExecuteTools: true, runtimeKind: "claude_agent_sdk" } })).createAgentRun;
  console.log("RUN", JSON.stringify(run), "helperDef", helperId, "workspace", ws);
  await hostTurn(run.runId, "Use send_message_to to message the mentioned collaborator at its address. Ask it to reply to you with send_message_to and the exact text SEEDED-ONE. After the tool returns, reply with one short sentence.", [{ kind: "agent", definition_id: helperId }]);
  for (let i = 0; i < 60; i++) {
    const v = await view(run.runId);
    if ((v?.communication_messages.messages ?? []).some((m) => m.content.includes("SEEDED-ONE") && m.receiverAgentRunId === run.runId)) break;
    await wait(2000);
  }
  await wait(8000);
  const v = await view(run.runId);
  console.log("VIEW", JSON.stringify({ host: v.execution_tree.host, collaborators: v.execution_tree.collaborators.map((c) => ({ address: c.address, agentRunId: c.agentRunId })), messages: v.communication_messages.messages.map((m) => `${m.senderAgentRunId}→${m.receiverAgentRunId}: ${m.content.slice(0, 80)}`) }));
} else if (cmd === "host-turn") {
  await hostTurn(args[0], args[1]);
} else if (cmd === "child-turn") {
  const [hostRunId, child, content] = args;
  const c = await open(`/ws/agent-collaboration/${hostRunId}`);
  const commandId = randomUUID();
  c.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent", root_run_id: hostRunId, target_agent_run_id: child, command_id: commandId, content, context_file_paths: [], image_urls: [], ...ids() } }));
  const ack = await waitFor(c.messages, 0, (m) => m.type === "AGENT_COMMAND_ACK" && m.payload.command_id === commandId, "child ack");
  console.log("CHILD ACK", JSON.stringify(ack.payload));
  c.socket.close();
} else if (cmd === "view") {
  console.log(JSON.stringify(await view(args[0]), null, 1).slice(0, 6000));
} else if (cmd === "tokens") {
  await tokens(args[0]);
} else if (cmd === "stop") {
  console.log(JSON.stringify(await gql("mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success message } }", { id: args[0] })));
} else { console.log("unknown command"); process.exitCode = 2; }
process.exit();

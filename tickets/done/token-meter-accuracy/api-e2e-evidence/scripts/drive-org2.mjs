#!/usr/bin/env node
// Org member + Org-hosted delegated copy, phased so the UI can watch mid-turn.
// Usage: node drive-org2.mjs <backendUrl> <model> <phase:create|member|delegate> [stateFile]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const [backendUrl, model, phase, stateFile = "/tmp/tma-api-e2e/org2-state.json"] = process.argv.slice(2);
const gql = async (query, variables = {}) => {
  const response = await fetch(`${backendUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
  return body.data;
};
const slowTask = (tag) => "Use the Bash tool to run `sleep 3; echo one`. After you see its output, use the Bash tool again to run `sleep 3; echo two`. " +
  "Then use it again to run `sleep 3; echo three`. Then use it once more to run `sleep 3; echo four`. " + `Then reply with exactly ${tag} and nothing else.`;

if (phase === "create") {
  const unique = randomUUID().slice(0, 8);
  const def = async (name, instructions, toolNames) => (await gql(
    "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
    { input: { name: `tma-org2-${name}-${unique}`, role: "assistant", description: `token meter org ${name}`, instructions, toolNames,
      category: "api-e2e", skillNames: [] } })).createAgentDefinition.id;
  const shell = "When asked to run shell commands, run each one with the Bash tool, one tool call per step, waiting for each result. Then answer briefly.";
  const manager = await def("manager", `You manage. ${shell} When asked to delegate, call delegate_task exactly as instructed.`, ["delegate_task", "send_message_to"]);
  const worker = await def("worker", `You work. ${shell}`, ["send_message_to"]);
  const orgDefinitionId = (await gql("mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}",
    { input: { name: `TMA Org2 ${unique}`, description: "token meter org", instructions: "Follow requests.", handoffs: [], members: [
      { memberName: "manager", ref: manager, refType: "AGENT", refScope: "SHARED" },
      { memberName: "worker", ref: worker, refType: "AGENT", refScope: "SHARED" }] } })).createAgentOrgDefinition.id;
  const workspaceRootPath = fs.mkdtempSync(path.join(os.tmpdir(), "tma-org2-ws-"));
  const created = (await gql("mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}",
    { input: { agentOrgDefinitionId: orgDefinitionId, rootConfiguration: { workspaceRootPath, llmModelIdentifier: model, llmConfig: null,
      autoExecuteTools: true, runtimeKind: "claude_agent_sdk" }, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  if (!created.success) throw new Error(created.message);
  const tree = (await gql("query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}", { id: created.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  const managerRunId = tree.rootOrg.members.find((member) => member.address === "/manager").agentRunId;
  const state = { rootId: created.agentOrgRunId, orgDefinitionId, managerRunId, unique, workspaceRootPath };
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  console.log(JSON.stringify(state, null, 2));
  process.exit(0);
}

const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
const socket = new WebSocket(backendUrl.replace(/^http/, "ws") + `/ws/agent-org/${state.rootId}`);
const frames = [];
const t0 = Date.now();
socket.addEventListener("message", (event) => { try { frames.push({ t: Date.now() - t0, ...JSON.parse(String(event.data)) }); } catch {} });
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve); socket.addEventListener("error", reject); });
const text = (f) => JSON.stringify(f);
const until = async (probe, label, ms = 300_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { const v = probe(); if (v) return v; await new Promise((r) => setTimeout(r, 200)); }
  throw new Error(`Timed out waiting for ${label}`);
};
await until(() => frames.some((f) => f.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"), "snapshot");
const start = frames.length;
const send = (content) => socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: state.rootId,
  target_agent_run_id: state.managerRunId, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content,
  context_file_paths: [], image_urls: [] } }));
const tokenFramesOf = (runId) => frames.slice(start).filter((f) => /TOKEN_USAGE_UPDATED/.test(text(f)) && f.payload?.event?.agent_run_id === runId)
  .map((f) => ({ t: f.t, call: f.payload.event.message.payload.reports_model_call, prompt: f.payload.event.message.payload.latest_prompt_tokens,
    count: f.payload.event.message.payload.run_summary_after_event?.usage_report_count, revision: f.payload.event.message.payload.run_summary_after_event?.revision }));
let result;
if (phase === "member") {
  send(slowTask(`ORG2_MEMBER_${state.unique}`));
  await until(() => tokenFramesOf(state.managerRunId).some((f) => f.call === false), "manager result");
  result = { phase, runId: state.managerRunId, tokenFrames: tokenFramesOf(state.managerRunId) };
} else {
  const delegation = { recipient_address: "/worker", description: slowTask(`ORG2_COPY_${state.unique}`) };
  send(`Call delegate_task exactly once now with these exact JSON arguments: ${JSON.stringify(delegation)}. Do not call any other tool. Then reply DELEGATED.`);
  const started = await until(() => frames.slice(start).find((f) => /TASK_EXECUTION_STARTED/.test(text(f))), "copy started");
  fs.writeFileSync("/tmp/tma-api-e2e/org2-copy-started.json", JSON.stringify(started, null, 1));
  const execution = started.payload?.event?.execution ?? started.payload?.execution ?? started.payload?.event?.payload?.execution ?? null;
  const childRunId = execution?.agent_run_id ?? JSON.stringify(started).match(/"agent_run_id":"([^"]+)"/g)?.map((m) => m.split('"')[3]).find((id) => id !== state.managerRunId);
  console.error(`COPY_STARTED ${childRunId}`);
  await until(() => tokenFramesOf(childRunId).some((f) => f.call === false), "copy result", 400_000);
  result = { phase, childRunId, startedAt: started.t, execution, tokenFrames: tokenFramesOf(childRunId) };
}
socket.close();
fs.writeFileSync(`/tmp/tma-api-e2e/org2-raw-${phase}.json`, JSON.stringify(frames, null, 1));
console.log(JSON.stringify(result, null, 2));
process.exit(0);

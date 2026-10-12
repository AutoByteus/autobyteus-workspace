#!/usr/bin/env node
// Native (autobyteus runtime) team: create, or send one message to the coordinator member and wait for idle.
// Usage: node drive-team-native.mjs <backendUrl> <model> create [stateFile]
//        node drive-team-native.mjs <backendUrl> <model> send <promptFile> [stateFile]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const [backendUrl, model, phase, arg4, arg5] = process.argv.slice(2);
const stateFile = (phase === "create" ? arg4 : arg5) ?? "/tmp/tma-r2/team-native-state.json";
const gql = async (query, variables = {}) => {
  const response = await fetch(`${backendUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
  return body.data;
};
if (phase === "create") {
  const unique = randomUUID().slice(0, 8);
  const def = async (name) => (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
    { input: { name: `tma-native-${name}-${unique}`, role: "assistant", description: `native ${name}`,
      instructions: "You are terse. Follow the user's reply instructions exactly. Do not use tools.", category: "api-e2e", toolNames: [], skillNames: [] } })).createAgentDefinition.id;
  const lead = await def("lead");
  const helper = await def("helper");
  const teamDefinitionId = (await gql("mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
    { input: { name: `tma-native-team-${unique}`, description: "native team", instructions: "Members follow their own instructions.",
      coordinatorMemberName: "lead", nodes: [{ memberName: "lead", ref: lead, refScope: "SHARED" }, { memberName: "helper", ref: helper, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
  const workspaceRootPath = fs.mkdtempSync(path.join(os.tmpdir(), "tma-native-team-ws-"));
  const member = (memberAddress, agentDefinitionId) => ({ memberAddress, agentDefinitionId, llmModelIdentifier: model, autoExecuteTools: true, runtimeKind: "autobyteus", workspaceRootPath });
  const created = (await gql("mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
    { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", llmModelIdentifier: model, autoExecuteTools: true, runtimeKind: "autobyteus", workspaceRootPath }],
      memberConfigs: [member("/lead", lead), member("/helper", helper)] } })).createAgentTeamRun;
  if (!created.success) throw new Error(created.message);
  const tree = (await gql("query($t: String!) { getTeamRunResumeConfig(teamRunId: $t) { executionTree } }", { t: created.teamRunId })).getTeamRunResumeConfig.executionTree;
  const members = Object.fromEntries(tree.root_team.members.filter((m) => m.agent_run_id).map((m) => [m.address, m.agent_run_id]));
  const state = { teamRunId: created.teamRunId, teamDefinitionId, members, unique };
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  console.log(JSON.stringify(state, null, 2));
  process.exit(0);
}
const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
const leadRunId = state.members["/lead"];
const socket = new WebSocket(backendUrl.replace(/^http/, "ws") + `/ws/agent-team/${state.teamRunId}`);
const frames = []; const t0 = Date.now();
socket.addEventListener("message", (e) => { try { frames.push({ t: Date.now() - t0, ...JSON.parse(String(e.data)) }); } catch {} });
await new Promise((r) => socket.addEventListener("open", r));
await new Promise((r) => setTimeout(r, 800));
const start = frames.length;
socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`,
  context_file_paths: [], image_urls: [], agent_run_id: leadRunId, content: fs.readFileSync(arg4, "utf8") } }));
const runIdOf = (m) => m.payload?.agent_run_id ?? m.payload?.run_summary_after_event?.run_id ?? null;
const deadline = Date.now() + 600000;
while (Date.now() < deadline && !frames.slice(start).some((m) => m.type === "TURN_COMPLETED" && runIdOf(m) === leadRunId)) await new Promise((r) => setTimeout(r, 200));
await new Promise((r) => setTimeout(r, 1500));
socket.close();
const out = frames.slice(start).filter((m) => ["TOKEN_USAGE_UPDATED", "COMPACTION_STATUS", "TURN_COMPLETED"].includes(m.type) && runIdOf(m) === leadRunId)
  .map((m) => ({ t: m.t, type: m.type, phase: m.payload.phase ?? null, call: m.payload.reports_model_call ?? null, prompt: m.payload.latest_prompt_tokens ?? null,
    count: m.payload.run_summary_after_event?.usage_report_count ?? null, revision: m.payload.run_summary_after_event?.revision ?? null,
    summaryPrompt: m.payload.run_summary_after_event?.latest_prompt_tokens ?? null }));
console.log(JSON.stringify(out, null, 1));
process.exit(0);

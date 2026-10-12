#!/usr/bin/env node
// Org member live token usage on an isolated AutoByteus backend (collaboration presentation path).
// Usage: node drive-org.mjs <backendUrl> <model>
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const [backendUrl, model] = process.argv.slice(2);
const gql = async (query, variables = {}) => {
  const response = await fetch(`${backendUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
  return body.data;
};
const unique = randomUUID().slice(0, 8);
const def = async (name, instructions, toolNames) => (await gql(
  "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
  { input: { name: `tma-org-${name}-${unique}`, role: "assistant", description: `token meter org ${name}`, instructions, toolNames,
    category: "api-e2e", skillNames: [] } })).createAgentDefinition.id;
const shell = "When asked to run shell commands, run each one with the Bash tool, one tool call per step, waiting for each result. Then answer briefly.";
const manager = await def("manager", `You manage. ${shell}`, ["send_message_to"]);
const worker = await def("worker", `You work. ${shell}`, ["send_message_to"]);
const orgDefinitionId = (await gql("mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}",
  { input: { name: `TMA Org ${unique}`, description: "token meter org", instructions: "Follow requests.", handoffs: [], members: [
    { memberName: "manager", ref: manager, refType: "AGENT", refScope: "SHARED" },
    { memberName: "worker", ref: worker, refType: "AGENT", refScope: "SHARED" }] } })).createAgentOrgDefinition.id;
const workspaceRootPath = fs.mkdtempSync(path.join(os.tmpdir(), "tma-org-ws-"));
const created = (await gql("mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}",
  { input: { agentOrgDefinitionId: orgDefinitionId, rootConfiguration: { workspaceRootPath, llmModelIdentifier: model, llmConfig: null,
    autoExecuteTools: true, runtimeKind: "claude_agent_sdk" }, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
if (!created.success) throw new Error(created.message);
const rootId = created.agentOrgRunId;
const tree = (await gql("query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}", { id: rootId })).getAgentOrgRunConfig.executionTree;
const managerRunId = tree.rootOrg.members.find((member) => member.address === "/manager").agentRunId;

const socket = new WebSocket(backendUrl.replace(/^http/, "ws") + `/ws/agent-org/${rootId}`);
const frames = [];
const t0 = Date.now();
socket.addEventListener("message", (event) => { try { frames.push({ t: Date.now() - t0, ...JSON.parse(String(event.data)) }); } catch {} });
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve); socket.addEventListener("error", reject); });
const until = async (probe, label, ms = 240_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { const v = probe(); if (v) return v; await new Promise((r) => setTimeout(r, 200)); }
  fs.writeFileSync("/tmp/tma-api-e2e/org-raw.json", JSON.stringify(frames, null, 1));
  throw new Error(`Timed out waiting for ${label}; seen ${frames.slice(-25).map((f) => f.type).join(",")}`);
};
await until(() => frames.some((f) => f.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"), "snapshot");
const start = frames.length;
socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: rootId,
  target_agent_run_id: managerRunId, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(),
  content: "Use the Bash tool to run `echo one`. After you see its output, use the Bash tool again to run `echo two`. " +
    `After that, use it once more to run \`echo three\`. Then reply with exactly ORG_DONE_${unique} and nothing else.`,
  context_file_paths: [], image_urls: [] } }));
const text = (f) => JSON.stringify(f);
const tokenFrames = () => frames.slice(start).filter((f) => /TOKEN_USAGE_UPDATED/.test(text(f)) && text(f).includes(managerRunId));
let done = false;
const samples = [];
const sampler = (async () => {
  while (!done) {
    try { samples.push({ t: Date.now() - t0, ...(await gql(`query($runId: String!) { getAgentRunTokenUsageSummary(runId: $runId) {
      usageReportCount revision latestPromptTokens effectiveContextWindowTokens contextCompactionThresholdTokens latestModelIdentifier latestRuntimeKind totalTokens } }`, { runId: managerRunId })).getAgentRunTokenUsageSummary }); }
    catch (error) { samples.push({ t: Date.now() - t0, error: String(error).slice(0, 200) }); }
    await new Promise((r) => setTimeout(r, 1200));
  }
})();
await until(() => tokenFrames().find((f) => /claude_sdk_result/.test(text(f))), "manager result frame");
await new Promise((r) => setTimeout(r, 1500));
done = true;
await sampler;
socket.close();
fs.writeFileSync("/tmp/tma-api-e2e/org-raw.json", JSON.stringify(frames, null, 1));
console.log(JSON.stringify({ rootId, managerRunId, tokenFrameCount: tokenFrames().length,
  tokenFrames: tokenFrames().map((f) => ({ t: f.t, type: f.type, keys: Object.keys(f.payload ?? {}) })), samples,
  frameTypes: [...new Set(frames.slice(start).map((f) => f.type))] }, null, 2));
process.exit(0);

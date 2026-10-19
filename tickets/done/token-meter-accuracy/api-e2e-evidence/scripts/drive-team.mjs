#!/usr/bin/env node
// Team member and delegated-copy live token usage on an isolated AutoByteus backend.
// Usage: node drive-team.mjs <backendUrl> <model> <phase> [stateFile]
//   phase=create  → creates definitions + a Claude Team run, writes stateFile
//   phase=member  → multi-call turn on the coordinator member (team member case)
//   phase=delegate→ coordinator delegates a multi-call task to /worker (delegated copy case)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const [backendUrl, model, phase, stateFile = "/tmp/tma-api-e2e/team-state.json"] = process.argv.slice(2);
const contracts = await import(pathToFileURL(
  "/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy-api-e2e-desktop/autobyteus-team-stream-contracts/dist/index.js").href);
const gql = async (query, variables = {}) => {
  const response = await fetch(`${backendUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
  return body.data;
};
const summaryFields = `runId usageReportCount revision totalTokens latestPromptTokens effectiveContextWindowTokens
  contextWindowUsagePercent contextCompactionThresholdTokens latestModelIdentifier latestRuntimeKind`;

if (phase === "create") {
  const unique = randomUUID().slice(0, 8);
  const def = async (name, instructions, toolNames) => (await gql(
    "mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
    { input: { name: `tma-${name}-${unique}`, role: "assistant", description: `token meter ${name}`, instructions, toolNames,
      category: "api-e2e", skillNames: [] } })).createAgentDefinition.id;
  const shell = "When asked to run shell commands, run each one with the Bash tool, one tool call per step, waiting for each result. Then answer briefly.";
  const coordinator = await def("coordinator", `You coordinate. ${shell} When asked to delegate, call delegate_task exactly as instructed.`, ["delegate_task", "send_message_to"]);
  const worker = await def("worker", `You are a worker. ${shell}`, ["send_message_to"]);
  const teamDefinitionId = (await gql("mutation($input: CreateAgentTeamDefinitionInput!) { createAgentTeamDefinition(input: $input) { id } }",
    { input: { name: `tma-meter-team-${unique}`, description: "token meter team", instructions: "Members follow their own instructions.",
      coordinatorMemberName: "coordinator", nodes: [
        { memberName: "coordinator", ref: coordinator, refScope: "SHARED" },
        { memberName: "worker", ref: worker, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
  const workspaceRootPath = fs.mkdtempSync(path.join(os.tmpdir(), "tma-team-ws-"));
  const member = (memberAddress, agentDefinitionId) => ({ memberAddress, agentDefinitionId, llmModelIdentifier: model,
    autoExecuteTools: true, runtimeKind: "claude_agent_sdk", workspaceRootPath });
  const created = (await gql("mutation($input: CreateAgentTeamRunInput!) { createAgentTeamRun(input: $input) { success message teamRunId } }",
    { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", llmModelIdentifier: model, autoExecuteTools: true,
      runtimeKind: "claude_agent_sdk", workspaceRootPath }], memberConfigs: [member("/coordinator", coordinator), member("/worker", worker)] } })).createAgentTeamRun;
  if (!created.success) throw new Error(created.message);
  const tree = (await gql("query($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { executionTree } }",
    { teamRunId: created.teamRunId })).getTeamRunResumeConfig.executionTree;
  const members = Object.fromEntries((tree.root_team.members ?? []).filter((m) => m.agent_run_id).map((m) => [m.address, m.agent_run_id]));
  const state = { teamRunId: created.teamRunId, members, workspaceRootPath, unique };
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  console.log(JSON.stringify(state, null, 2));
  process.exit(0);
}

const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
const coordinatorRunId = state.members["/coordinator"];
const socket = new WebSocket(backendUrl.replace(/^http/, "ws") + `/ws/agent-team/${state.teamRunId}`);
const messages = [];
const contractFailures = [];
const t0 = Date.now();
socket.addEventListener("message", (event) => {
  const raw = String(event.data);
  try {
    const parsed = JSON.parse(raw);
    if (parsed.type === "TOKEN_USAGE_UPDATED") {
      try { contracts.parseTeamStreamServerMessage(raw); } catch (error) { contractFailures.push(String(error).slice(0, 400)); }
    }
    messages.push({ t: Date.now() - t0, ...parsed });
  } catch {}
});
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve); socket.addEventListener("error", reject); });
const until = async (probe, label, ms = 180_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { const v = probe(); if (v !== undefined && v !== null) return v; await new Promise((r) => setTimeout(r, 200)); }
  fs.writeFileSync(`/tmp/tma-api-e2e/team-raw-${phase}.json`, JSON.stringify(messages, null, 1));
  throw new Error(`Timed out waiting for ${label}; seen ${messages.slice(-25).map((m) => m.type).join(",")}`);
};
await new Promise((r) => setTimeout(r, 1000));
const start = messages.length;
const send = (content) => socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: `e2e-${randomUUID()}`,
  dedupe_key: `agent_run_input:e2e:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: coordinatorRunId, content } }));
const runIdOf = (m) => m.payload?.agent_run_id ?? m.payload?.execution?.agent_run_id ?? m.payload?.run_id ?? m.payload?.run_summary_after_event?.run_id ?? null;
const kindOf = (m) => String(m.payload?.idempotency_key ?? "").split(":")[0];
const usageOf = (runId) => messages.slice(start).filter((m) => m.type === "TOKEN_USAGE_UPDATED" && runIdOf(m) === runId);
const idleOf = (runId, after = 0) => messages.slice(start).find((m) => m.type === "AGENT_STATUS" && runIdOf(m) === runId && m.payload.status === "idle" && m.t > after);
const sample = async (query, variables, stop) => {
  const samples = [];
  while (!stop()) {
    try { samples.push({ t: Date.now() - t0, ...(await gql(query, variables)) }); } catch (error) { samples.push({ t: Date.now() - t0, error: String(error).slice(0, 200) }); }
    await new Promise((r) => setTimeout(r, 1200));
  }
  return samples;
};
const describe = (m) => ({ t: m.t, kind: kindOf(m), call: m.payload.reports_model_call, model: m.payload.model_identifier,
  input: m.payload.standard_input_tokens, cacheRead: m.payload.cache_read_input_tokens, cacheCreation: m.payload.cache_creation_input_tokens,
  output: m.payload.billable_output_tokens, total: m.payload.meter_delta_total_tokens, prompt: m.payload.latest_prompt_tokens,
  window: m.payload.effective_context_window_tokens, threshold: m.payload.context_compaction_threshold_tokens,
  summaryCount: m.payload.run_summary_after_event?.usage_report_count ?? null, summaryRevision: m.payload.run_summary_after_event?.revision ?? null,
  summaryPrompt: m.payload.run_summary_after_event?.latest_prompt_tokens ?? null });
const shellPrompt = (tag) => "Use the Bash tool to run `echo one`. After you see its output, use the Bash tool again to run `echo two`. " +
  `After that, use it once more to run \`echo three\`. Then reply with exactly ${tag} and nothing else.`;

let result;
if (phase === "member") {
  send(shellPrompt(`MEMBER_DONE_${state.unique}`));
  let done = false;
  const samplesPromise = sample(`query($teamRunId: String!, $agentRunId: String!) { getTeamMemberTokenUsageSummary(teamRunId: $teamRunId, agentRunId: $agentRunId) { ${summaryFields} } }`,
    { teamRunId: state.teamRunId, agentRunId: coordinatorRunId }, () => done);
  await until(() => usageOf(coordinatorRunId).find((m) => kindOf(m) === "claude_sdk_result"), "coordinator result");
  const idle = await until(() => idleOf(coordinatorRunId), "coordinator idle");
  done = true;
  const samples = await samplesPromise;
  const teamSummary = (await gql(`query($teamRunId: String!) { getTeamRunTokenUsageSummary(teamRunId: $teamRunId) { ${summaryFields} } }`, { teamRunId: state.teamRunId })).getTeamRunTokenUsageSummary;
  result = { phase, runId: coordinatorRunId, idleAt: idle.t, usage: usageOf(coordinatorRunId).map(describe), samples, teamSummary };
} else if (phase === "delegate") {
  const delegation = { recipient_address: "/worker", description: shellPrompt(`COPY_DONE_${state.unique}`) };
  send(`Call delegate_task exactly once now with these exact JSON arguments: ${JSON.stringify(delegation)}. Do not call any other tool. Then reply DELEGATED.`);
  const started = await until(() => messages.slice(start).find((m) => m.type === "TASK_EXECUTION_STARTED" && m.payload.execution?.delegator_agent_run_id === coordinatorRunId), "TASK_EXECUTION_STARTED");
  const childRunId = String(started.payload.execution.agent_run_id);
  let done = false;
  const samplesPromise = sample(`query($runId: String!) { getAgentRunTokenUsageSummary(runId: $runId) { ${summaryFields} } }`, { runId: childRunId }, () => done);
  await until(() => usageOf(childRunId).find((m) => kindOf(m) === "claude_sdk_result"), "copy result");
  const idle = await until(() => idleOf(childRunId), "copy idle");
  done = true;
  const samples = await samplesPromise;
  result = { phase, childRunId, startedAt: started.t, startedPayloadKeys: Object.keys(started.payload), idleAt: idle.t,
    usage: usageOf(childRunId).map(describe), samples };
}
await new Promise((r) => setTimeout(r, 1000));
socket.close();
fs.writeFileSync(`/tmp/tma-api-e2e/team-raw-${phase}.json`, JSON.stringify(messages, null, 1));
result.contractFailures = contractFailures;
result.tokenFramesChecked = messages.filter((m) => m.type === "TOKEN_USAGE_UPDATED").length;
console.log(JSON.stringify(result, null, 2));
process.exit(0);

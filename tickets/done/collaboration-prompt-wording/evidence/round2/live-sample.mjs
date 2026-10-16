#!/usr/bin/env node
// Repeats an AC-008 journey N times on a running isolated instance and tabulates what the delegated agent did, from its stored trace.
// Usage: node live-sample.mjs <backendUrl> <seeded.json> <dataRoot> <j1|j3> <n> [model] [runtime]
//   j1: Agent root, Research Lead delegates to /research_helper (task agent) which should report to the delegator by its ID.
//   j3: Org root, Project Task Manager delegates to /delivery_squad (task agent team); its coordinator should report by the PTM's ID.
// The workspace is <dataRoot>/workspace. Output: one JSON object per sample on stdout, then a summary line.
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const WebSocket = createRequire(path.resolve(process.cwd(), "autobyteus-server-ts/package.json"))("ws"); // run from the repository root

const [backend, seededPath, dataRoot, journey, nText, model = "claude-haiku-5-5", runtime = "claude_agent_sdk", traceDir = "", label = "run"] = process.argv.slice(2);
const n = Number(nText ?? 1);
const seeded = JSON.parse(readFileSync(seededPath, "utf8"));
const workspace = path.join(dataRoot, "workspace");
const memory = path.join(dataRoot, "server-data", "memory");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const gql = async (query, variables) => {
  const response = await fetch(new URL("/graphql", backend), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length || !body.data) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const config = { workspaceRootPath: workspace, llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, runtimeKind: runtime };
const walk = (dir, name, found = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name.startsWith(name)) found.push(full); walk(full, name, found); }
  }
  return found;
};
const traces = (dir) => {
  const file = path.join(dir, "raw_traces_active.jsonl");
  return existsSync(file) ? readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
};
const calls = (lines) => lines.filter((line) => line.trace_type === "tool_call" || line.trace_type === "tool_result").map((line) => line.trace_type === "tool_call"
  ? { call: line.tool_name, args: (typeof line.tool_args === "string" ? line.tool_args : JSON.stringify(line.tool_args)).slice(0, 300) }
  : { result: line.tool_name, event: line.source_event, text: String(line.tool_error && line.tool_error !== "None" ? line.tool_error : line.tool_result).slice(0, 300) });

const sample = async (index) => {
  const marker = `S${index}-${randomUUID().slice(0, 4)}`;
  let rootDir, agentDir, delegatorDir, delegatorId, send;
  if (journey === "j1") {
    const created = (await gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: { agentDefinitionId: seeded.researchLead.id, ...config } })).createAgentRun;
    if (!created.success) throw new Error(created.message);
    delegatorId = created.runId;
    const socket = new WebSocket(`ws://${new URL(backend).host}/ws/agent/${created.runId}`);
    await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await sleep(1500);
    send = (content) => socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { agent_run_id: created.runId, content, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`, context_file_paths: [], image_urls: [] } }));
    send(`What is ${11 + index} times 23? Have your research helper work it out and tell me its answer. (${marker})`);
    return { marker, delegatorId, wait: async () => { await sleep(100_000); socket.close(); },
      read: () => { rootDir = walk(memory, delegatorId)[0]; agentDir = rootDir ? walk(rootDir, "research_helper")[0] : null; return { delegator: calls(traces(rootDir ?? "/nonexistent")), agent: agentDir ? traces(agentDir) : [] }; } };
  }
  const created = (await gql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
    { input: { agentOrgDefinitionId: seeded.studio.id, rootConfiguration: { ...config, llmModelIdentifier: model === "claude-haiku-5-5" ? "haiku" : model }, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  if (!created.success) throw new Error(created.message);
  const tree = (await gql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: created.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  const ptm = tree.rootOrg.members.find((member) => member.address === "/project_task_manager");
  delegatorId = ptm.agentRunId;
  const socket = new WebSocket(`ws://${new URL(backend).host}/ws/agent-org/${created.agentOrgRunId}`);
  await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
  await sleep(2500);
  socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: created.agentOrgRunId, target_agent_run_id: delegatorId,
    command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content: `Ask the delivery squad: what is ${5 + index} times 7? Tell me its answer. (${marker})`, context_file_paths: [], image_urls: [] } }));
  return { marker, delegatorId, wait: async () => { await sleep(100_000); socket.close(); },
    read: () => { const delegatorDirs = walk(memory, delegatorId); delegatorDir = delegatorDirs[0]; const squad = walk(path.join(memory, "agent_orgs", created.agentOrgRunId), "coordinator")[0];
      return { delegator: calls(traces(delegatorDir ?? "/nonexistent")), agent: squad ? traces(squad) : [] }; } };
};

const summary = [];
for (let index = 1; index <= n; index += 1) {
  const run = await sample(index);
  await run.wait();
  const { delegator, agent } = run.read();
  const agentCalls = calls(agent);
  const sends = agentCalls.filter((entry) => entry.call === "send_message_to");
  const succeeded = agentCalls.filter((entry) => entry.result === "send_message_to" && entry.event === "TOOL_EXECUTION_SUCCEEDED");
  const delegatorName = run.delegatorId.replace(/_[0-9a-f]{32}$/, "");
  const callArgs = sends.map((entry) => { try { return JSON.parse(entry.args); } catch { return {}; } });
  const replyToName = callArgs.some((a) => (a.recipient_address && String(a.recipient_address).replace(/^\//, "") === delegatorName) || a.target_agent_run_id === delegatorName);
  if (traceDir) {
    mkdirSync(traceDir, { recursive: true });
    writeFileSync(path.join(traceDir, `${label}-${journey}-sample${index}-task-agent.jsonl`), agent.map((line) => JSON.stringify(line)).join("\n") + "\n");
    writeFileSync(path.join(traceDir, `${label}-${journey}-sample${index}-delegator-calls.json`), JSON.stringify(delegator, null, 1));
  }
  const result = {
    sample: index, journey, runtime, model, label, replyToName,
    delegated: delegator.some((entry) => entry.call === "delegate_task"),
    delegatorCalls: delegator.map((entry) => entry.call ? `${entry.call} ${entry.args}` : `${entry.result} ${entry.event}: ${entry.text}`),
    agentStarted: agent.length > 0,
    taskMessage: agent.find((line) => line.trace_type === "user")?.content?.slice(0, 160) ?? null,
    sendMessageCalls: sends.map((entry) => entry.args),
    sendMessageResults: agentCalls.filter((entry) => entry.result === "send_message_to").map((entry) => `${entry.event}: ${entry.text}`),
    reportedByIdSucceeded: succeeded.some((entry) => entry.text.includes(run.delegatorId)),
    addressInAnyCall: sends.some((entry) => /recipient_address/.test(entry.args)),
    plainAnswerOnly: agentCalls.length === 0 && agent.some((line) => line.trace_type === "assistant" && line.content),
  };
  summary.push(result);
  console.log(JSON.stringify(result));
}
console.log("SUMMARY " + JSON.stringify({ journey, runtime, model, n, delegated: summary.filter((s) => s.delegated).length,
  reportedByIdSucceeded: summary.filter((s) => s.reportedByIdSucceeded).length, addressInAnyCall: summary.filter((s) => s.addressInAnyCall).length, replyToName: summary.filter((s) => s.replyToName).length,
  plainAnswerOnly: summary.filter((s) => s.plainAnswerOnly).length }));

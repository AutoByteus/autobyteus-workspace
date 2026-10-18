#!/usr/bin/env node
// Temporary ticket setup (autobyteus-139, DESK-02, round 2). Through the instance's public GraphQL and
// WebSocket APIs: the LM Studio catalog, a writer agent ("Desk Essay Worker"), a PM agent, a Project with
// one Task, and a hand-started worker run with one finished turn (as a user who started it by hand).
// Prints the created ids as JSON. The PM run itself is started and driven in the UI.
// Usage: node desk2-setup.mjs --backend http://127.0.0.1:<serverPort> --workspace <abs dir>
import { randomUUID } from "node:crypto";
const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const backend = arg("--backend"); const workspace = arg("--workspace");
const gql = async (query, variables = {}) => {
  const r = await fetch(`${backend}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const b = await r.json(); if (b.errors?.length) throw new Error(JSON.stringify(b.errors).slice(0, 600)); return b.data;
};
const cat = await gql(`mutation{ensureProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`);
const model = cat.ensureProviderModelCatalog.llmModels.map((m) => m.modelIdentifier).find((id) => id.startsWith("qwen/qwen3.6-35b-a3b:lmstudio@"));
const agent = async (name, instructions, toolNames = []) => (await gql(`mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}`,
  { i: { name, role: "assistant", description: `${name} (DESK-02)`, instructions, category: "probe", toolNames, skillNames: [] } })).createAgentDefinition.id;
const worker = await agent("Desk Essay Worker", "Answer in plain prose paragraphs, no headings, no lists. Do not use tools.");
const pm = await agent("Desk PM", "You coordinate work. When asked to delegate, call delegate_task with the given arguments and nothing else.", ["list_available_agents"]);
const projectId = (await gql(`mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}`, { i: { name: "Desk Adoption Project" } })).createProject.projectId;
const taskId = (await gql(`mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}`,
  { i: { projectId, description: "Write a plain-prose essay of about 300 words about how lighthouses work. No headings, no lists." } })).createProjectTask.taskId;
const run = (await gql(`mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}`, { i: {
  agentDefinitionId: worker, workspaceRootPath: workspace, llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, runtimeKind: "autobyteus" } })).createAgentRun;
const ws = new WebSocket(`${backend.replace("http", "ws")}/ws/agent/${run.runId}`);
const frames = []; ws.addEventListener("message", (e) => frames.push(JSON.parse(String(e.data))));
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
ws.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { message_id: `d-${randomUUID()}`, dedupe_key: `agent_run_input:d:${randomUUID()}`,
  context_file_paths: [], image_urls: [], content: "/no_think Hello, this is the start of my own work. Reply with one short sentence." } }));
const deadline = Date.now() + 300_000;
while (!frames.some((f) => f.type === "TURN_COMPLETED") && Date.now() < deadline) await new Promise((r) => setTimeout(r, 250));
ws.close();
console.log(JSON.stringify({ model, worker, pm, projectId, taskId, handStartedRunId: run.runId, handStartedTurnCompleted: frames.some((f) => f.type === "TURN_COMPLETED") }, null, 1));
process.exit(0);

// Creates a Claude host agent (delegate_task) and a worker definition, and a standalone host run.
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { randomUUID } from "node:crypto";
const [backendUrl, model] = process.argv.slice(2);
const gql = async (query, variables = {}) => { const r = await fetch(`${backendUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) }); const b = await r.json(); if (b.errors?.length) throw new Error(JSON.stringify(b.errors)); return b.data; };
const unique = randomUUID().slice(0, 8);
const def = async (name, instructions, toolNames) => (await gql("mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }",
  { input: { name, role: "assistant", description: name, instructions, toolNames, category: "api-e2e", skillNames: [] } })).createAgentDefinition.id;
const workerName = `TMA Worker ${unique}`;
await def(workerName, "When asked to run shell commands, run each one with the Bash tool, one tool call per step, waiting for each result. Then answer briefly.", ["send_message_to"]);
const hostId = await def(`TMA Host ${unique}`, "Reply exactly as asked. When asked to call a tool with exact JSON arguments, call exactly that tool once with exactly those arguments, then reply with the single word DELEGATED.", ["delegate_task", "send_message_to"]);
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "tma-host-ws-"));
const run = (await gql("mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }",
  { input: { agentDefinitionId: hostId, workspaceRootPath: workspace, llmModelIdentifier: model, autoExecuteTools: true, runtimeKind: "claude_agent_sdk", llmConfig: null } })).createAgentRun;
if (!run.success) throw new Error(run.message);
const workerAddress = "/" + workerName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
console.log(JSON.stringify({ hostRunId: run.runId, workerAddress, unique }));

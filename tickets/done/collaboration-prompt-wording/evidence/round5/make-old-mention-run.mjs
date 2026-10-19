// Writes one run with the earlier `@` note on the BASE server (3712cd9bf0): an Agent run that mentions an agent definition.
// Usage (from the repository root): node make-old-mention-run.mjs <baseBackendUrl> <seeded-base.json> <workspace>
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const WebSocket = createRequire(`${process.cwd()}/autobyteus-server-ts/package.json`)("ws");
const [backend, seededPath, workspace] = process.argv.slice(2);
const seeded = JSON.parse(readFileSync(seededPath, "utf8"));
const gql = async (query, variables) => { const r = await (await fetch(new URL("/graphql", backend), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) })).json(); if (r.errors?.length || !r.data) throw new Error(JSON.stringify(r.errors ?? r)); return r.data; };
const created = (await gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: { agentDefinitionId: seeded.researchLead.id, workspaceRootPath: workspace, llmModelIdentifier: "sonnet", llmConfig: null, autoExecuteTools: true, runtimeKind: "claude_agent_sdk" } })).createAgentRun;
if (!created.success) throw new Error(created.message);
const socket = new WebSocket(`ws://${new URL(backend).host}/ws/agent/${created.runId}`);
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
await new Promise((resolve) => setTimeout(resolve, 1500));
socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { agent_run_id: created.runId, content: "Please look into this with @Research Helper and tell me in one sentence.", mentions: [{ kind: "agent", definition_id: seeded.researchHelper.id }], message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`, context_file_paths: [], image_urls: [] } }));
await new Promise((resolve) => setTimeout(resolve, 60000));
socket.close();
console.log(JSON.stringify({ runId: created.runId }));

// Background Tasks on the merged server: a run created without the removed field starts a real background task.
import fs from 'node:fs'; import path from 'node:path'; import { randomUUID } from 'node:crypto';
const [dataRoot, outFile, runtimeKind, model] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gql = async (query, variables = {}) => { const res = await fetch('http://127.0.0.1:8000/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); const b = await res.json(); if (b.errors?.length) throw new Error(`GRAPHQL: ${JSON.stringify(b.errors.map((e) => e.message))}`); return b.data; };
const tag = randomUUID().replace(/-/g, '').slice(0, 8);
const ws = path.join(dataRoot, 'rsam-workspaces', `bg-${runtimeKind}-${tag}`); fs.mkdirSync(ws, { recursive: true });
const agentId = (await gql(`mutation($input: CreateAgentDefinitionInput!){ createAgentDefinition(input:$input){ id } }`, { input: { name: `rsam-bg-${tag}`, role: 'assistant', description: 'RSAM background task agent', instructions: "Follow the user's instructions exactly. Keep replies very short.", category: 'api-e2e', toolNames: [] } })).createAgentDefinition.id;
const created = (await gql(`mutation CreateAgentRun($input: CreateAgentRunInput!){ createAgentRun(input:$input){ success message runId } }`, { input: { agentDefinitionId: agentId, workspaceRootPath: ws, llmModelIdentifier: model, autoExecuteTools: true, runtimeKind } })).createAgentRun;
const out = { runtimeKind, model, created };
if (created.success) {
  const socket = new WebSocket(`ws://127.0.0.1:8000/ws/agent/${created.runId}`); const messages = [];
  socket.addEventListener('message', (e) => { try { messages.push(JSON.parse(String(e.data))); } catch {} });
  await new Promise((r) => socket.addEventListener('open', r)); await sleep(3000);
  const id = `rsam-${randomUUID()}`;
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `agent_run_input:e2e:${id}`, context_file_paths: [], image_urls: [], content: ['Use the Bash tool with run_in_background set to true to run exactly: sleep 15; echo RSAM_BG_DONE', 'Do not wait for it. Reply only STARTED and end your turn.'].join('\n') } }));
  const tasks = () => messages.filter((m) => m.type === 'BACKGROUND_TASK_UPDATED').map((m) => m.payload);
  const until = async (probe, ms) => { const end = Date.now() + ms; while (Date.now() < end) { const v = probe(); if (v) return v; await sleep(250); } return null; };
  const running = await until(() => tasks().find((t) => t.status === 'running'), 150000);
  const completed = running && await until(() => tasks().find((t) => t.task_id === running.task_id && t.status === 'completed'), 120000);
  out.running = running; out.completed = completed;
  out.messageTypes = [...new Set(messages.map((m) => m.type))];
  out.streamErrors = messages.filter((m) => m.type === 'ERROR').map((m) => JSON.stringify(m).slice(0, 300));
  out.fieldOnStream = /skill_?access/i.test(JSON.stringify(messages));
  socket.close();
  out.terminated = (await gql(`mutation($id:String!){ terminateAgentRun(agentRunId:$id){ success message } }`, { id: created.runId })).terminateAgentRun;
  const meta = path.join(dataRoot, 'memory', 'agents', created.runId, 'run_metadata.json');
  out.metadataKeys = fs.existsSync(meta) ? Object.keys(JSON.parse(fs.readFileSync(meta, 'utf8'))).sort() : null;
}
out.pass = !!(out.created.success && out.running && out.completed && !out.fieldOnStream && out.metadataKeys && !out.metadataKeys.includes('skillAccessMode'));
fs.writeFileSync(outFile, JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 1).slice(0, 2500)); process.exit(out.pass ? 0 : 1);

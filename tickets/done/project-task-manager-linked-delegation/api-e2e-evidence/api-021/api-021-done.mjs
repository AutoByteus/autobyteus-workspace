// API-REV-021 temporary DONE force-release smoke on the merged build (owned isolated instance, real model).
// Agent root: Manager assigns Task A → Agent W and Task B → Team T. DONE A and DONE B must stop exactly
// those runs (AgentRun.forceReleaseRuntime → AgentRunTermination.forceTerminate), reject closed input,
// and a repeated DONE must start no worker and change no file. The Manager keeps working.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const E = 'tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence/api-021';
const i = JSON.parse(await fs.readFile(`${E}/api-207-upgraded-instance.json`, 'utf8')).result;
assert.equal(i.dataRoot, (await fs.readFile(`${E}/api-207-data-root.txt`, 'utf8')).trim(), 'only the test-created data root');
const MODEL = { runtimeKind: 'autobyteus', llmModelIdentifier: 'deepseek-v4-flash', llmConfig: { thinking_type: 'disabled' } };
const GUARD = 'Never inspect credentials, HOME or unrelated paths; do not modify files or change any Task status. ';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const projectsDir = path.join(i.dataRoot, 'server-data/projects');
const out = { instanceId: i.instanceId, steps: [] };
let frames = [], ws, hostWs, hostReady = false;
const save = async () => { await fs.writeFile(`${E}/api-021-done.json`, JSON.stringify(out, null, 2) + '\n'); await fs.writeFile(`${E}/api-021-done-frames.json`, JSON.stringify(frames) + '\n'); };
const step = async (name, data = {}) => { out.steps.push({ name, at: new Date().toISOString(), ...data }); await save(); console.log('STEP', name); };
async function gql(query, variables = {}) { const r = await fetch(i.graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); assert.equal(r.status, 200); const j = await r.json(); assert(!j.errors, JSON.stringify(j.errors)); return j.data; }
async function waitFor(check, label, ms = 240_000) { const until = Date.now() + ms; while (Date.now() < until) { if (await check()) return; await sleep(500); } throw new Error('TIMEOUT ' + label); }
const mem = () => path.join(i.dataRoot, 'server-data/memory/agents', out.rootId);
async function traceFiles(dir) { const f = []; for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) { const p = path.join(dir, e.name); if (e.isDirectory()) f.push(...await traceFiles(p)); else if (e.name === 'raw_traces_active.jsonl') f.push(p); } return f; }
const trace = async id => { const f = (await traceFiles(mem())).find(p => path.basename(path.dirname(p)) === id); return f ? (await fs.readFile(f, 'utf8')).split('\n').filter(Boolean).map(l => JSON.parse(l)) : []; };
const assistantSaid = async (id, nonce) => (await trace(id)).some(x => x.trace_type === 'assistant' && String(x.content).includes(nonce));
const received = async (id, text) => (await trace(id)).some(x => x.trace_type === 'user' && String(x.content).includes(text));
const treeIds = async () => [...new Set([...(await fs.readFile(path.join(mem(), 'collaboration/collaboration_tree.json'), 'utf8')).matchAll(/"agentRunId"\s*:\s*"([^"]+)"/g)].map(m => m[1]))].sort();
const resourcesText = async () => { const o = {}; for (const p of await fs.readdir(projectsDir, { withFileTypes: true })) { if (!p.isDirectory()) continue; for (const t of await fs.readdir(path.join(projectsDir, p.name, 'tasks')).catch(() => [])) { try { o[`${p.name}/${t}`] = await fs.readFile(path.join(projectsDir, p.name, 'tasks', t, 'agent_run_resources.json'), 'utf8'); } catch { /* none */ } } } return o; };
const fileOf = async (taskId) => JSON.parse(await fs.readFile(path.join(projectsDir, out.project.projectId, 'tasks', taskId, 'agent_run_resources.json'), 'utf8'));
const runIdOf = e => e.agentRun.kind === 'agent' ? e.agentRun.agentRunId : e.agentRun.coordinatorAgentRunId;
function send(target, content) {
  const id = randomUUID();
  if (target === out.rootId) hostWs.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content, message_id: id, dedupe_key: id, context_file_paths: [], image_urls: [] } }));
  else ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { root_subject_kind: 'agent', root_run_id: out.rootId, target_agent_run_id: target, command_id: id, content, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: id } }));
  return id;
}
async function ask(target, request, label, ms) { const nonce = `API021_${randomUUID()}`; send(target, `${request} Include ${nonce} in your final answer.`); await waitFor(() => assistantSaid(target, nonce), label, ms); return nonce; }
const offline = id => frames.some(f => JSON.stringify(f).includes(id) && /"offline"/.test(JSON.stringify(f.payload ?? {})));
async function expectRejected(target, label) {
  const nonce = `API021_REJECT_${randomUUID()}`, from = frames.length;
  const commandId = send(target, `Reply with ${nonce}.`);
  await waitFor(() => frames.slice(from).some(f => f.type === 'AGENT_COMMAND_ACK' && f.payload?.command_id === commandId), label, 30_000);
  const ack = frames.slice(from).find(f => f.type === 'AGENT_COMMAND_ACK' && f.payload?.command_id === commandId).payload;
  assert.notEqual(ack.state, 'accepted'); assert.equal(ack.code ?? JSON.stringify(ack).match(/TASK_AGENT_RESOURCE_CLOSED/)?.[0], 'TASK_AGENT_RESOURCE_CLOSED', JSON.stringify(ack));
  await sleep(3000); assert(!await received(target, nonce), 'rejected input must not reach the agent');
  return ack;
}

try {
  const make = async (name, instructions) => (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name, description: 'API021 owned validation definition', instructions, toolNames: ['read_file', 'send_message_to'], skillNames: [], defaultLaunchConfig: MODEL } })).createAgentDefinition;
  const agent = await make('API021D Packet Agent', GUARD + 'Report briefly to the requester with send_message_to, then a short final answer. Include any requested nonce in your final answer.');
  const coord = await make('API021D Team Coordinator', GUARD + 'Report briefly to the requester with send_message_to, then a short final answer. Include any requested nonce in your final answer.');
  const reader = await make('API021D Team Reader', GUARD + 'Answer any message briefly, then a short final answer.');
  await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: 'API021D Packet Team', description: 'Two-member Team', instructions: 'Do only the supplied work.',
    nodes: [{ memberName: 'coordinator', ref: coord.id, refScope: 'SHARED' }, { memberName: 'reader', ref: reader.id, refScope: 'SHARED' }], coordinatorMemberName: 'coordinator', defaultLaunchConfig: MODEL } });
  const manager = (await gql('{agentDefinitions{id name}}')).agentDefinitions.find(d => d.name === 'Project Task Manager');
  assert(manager, 'shipped Project Task Manager present after the merge');
  const wsRoot = path.join(i.dataRoot, 'validation-workspace', 'done'); await fs.mkdir(wsRoot, { recursive: true });
  const r = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: manager.id, workspaceRootPath: wsRoot, autoExecuteTools: true, ...MODEL } })).createAgentRun;
  assert(r.success, r.message); out.rootId = r.runId;
  hostWs = new WebSocket(i.backendUrl.replace('http:', 'ws:') + '/ws/agent/' + encodeURIComponent(out.rootId));
  hostWs.addEventListener('message', e => { try { const f = JSON.parse(String(e.data)); if (f.type === 'CONNECTED') hostReady = true; frames.push({ host: true, at: new Date().toISOString(), ...f }); } catch { /* ignore */ } });
  ws = new WebSocket(i.backendUrl.replace('http:', 'ws:') + '/ws/agent-collaboration/' + encodeURIComponent(out.rootId));
  ws.addEventListener('message', e => { try { frames.push({ at: new Date().toISOString(), ...JSON.parse(String(e.data)) }); } catch { /* ignore */ } });
  await waitFor(() => hostReady && ws.readyState === 1, 'streams', 30_000);
  out.project = (await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}', { i: { name: 'API021 done ' + randomUUID().slice(0, 8), description: 'IR-014 force-release smoke' } })).createProject;
  out.tasks = {};
  for (const k of ['A', 'B']) out.tasks[k] = (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}', { i: { projectId: out.project.projectId, description: `API021 Task ${k}: report briefly to the requester. Do not change any Task status.` } })).createProjectTask;
  await step('root, project and tasks created', { rootId: out.rootId });

  await ask(out.rootId, `Authorized validation. In Project ${out.project.projectId}: delegate saved Task A ${out.tasks.A.taskId} once to the listed API021D Packet Agent address and saved Task B ${out.tasks.B.taskId} once to the listed API021D Packet Team address (use list_available_agents), passing only recipient_address and task_id. Then mark both IN_PROGRESS. Do not mark anything DONE.`, 'Manager assigns', 300_000);
  await waitFor(async () => (await fileOf(out.tasks.A.taskId)).agentRunResources[0]?.start === 'started' && (await fileOf(out.tasks.B.taskId)).agentRunResources[0]?.start === 'started', 'assigned started', 60_000);
  out.W = runIdOf((await fileOf(out.tasks.A.taskId)).agentRunResources[0]);
  out.T = (await fileOf(out.tasks.B.taskId)).agentRunResources[0].agentRun;
  out.treeBeforeDone = await treeIds();
  out.teamMembers = out.treeBeforeDone.filter(id => id.startsWith('api021d_team_'));
  assert.equal(out.teamMembers.length, 2, 'Team copy has coordinator + reader');
  await step('assigned A → Agent W, B → Team T (coordinator + reader)', { W: out.W, T: out.T, teamMembers: out.teamMembers });

  out.doneNonce = await ask(out.rootId, `I explicitly instruct you to mark saved Task A ${out.tasks.A.taskId} and saved Task B ${out.tasks.B.taskId} DONE now with create_or_update_task. Nothing else.`, 'Manager DONE A and B', 180_000);
  await waitFor(async () => (await fileOf(out.tasks.A.taskId)).agentRunResources.every(e => e.closedAt) && (await fileOf(out.tasks.B.taskId)).agentRunResources.every(e => e.closedAt), 'A and B closed', 60_000);
  const stopped = [out.W, ...out.teamMembers];
  await waitFor(() => stopped.every(offline), 'owned runs stopped', 90_000);
  out.offlineFrames = frames.filter(f => stopped.some(id => JSON.stringify(f).includes(id)) && /"offline"/.test(JSON.stringify(f.payload ?? {}))).map(f => ({ at: f.at, type: f.type }));
  await step('DONE closed both Tasks and stopped W, T coordinator and T reader (offline)', { stopped });
  out.rejected = { W: await expectRejected(out.W, 'closed W'), coordinator: await expectRejected(out.T.coordinatorAgentRunId, 'closed coordinator') };
  await step('closed input rejected TASK_AGENT_RESOURCE_CLOSED', { rejected: out.rejected });

  const filesBefore = await resourcesText(), treeBefore = await treeIds();
  out.repeatNonce = await ask(out.rootId, `Mark saved Task A ${out.tasks.A.taskId} and saved Task B ${out.tasks.B.taskId} DONE once more with create_or_update_task. Nothing else.`, 'Manager repeat DONE', 180_000);
  await sleep(5000);
  assert.deepEqual(await resourcesText(), filesBefore, 'repeat DONE writes no resource file');
  assert.deepEqual(await treeIds(), treeBefore, 'repeat DONE starts no worker');
  out.statusFramesAfterRepeat = frames.filter(f => stopped.some(id => JSON.stringify(f).includes(id)) && f.at > out.steps.at(-1).at).map(f => ({ at: f.at, type: f.type, status: f.payload?.status ?? f.payload?.statusHint ?? null }));
  await step('repeat DONE: no file change, no new run', { statusFramesAfterRepeat: out.statusFramesAfterRepeat });
  out.managerAlive = await ask(out.rootId, 'Reply with one line confirming you are available. No tools needed.', 'Manager still answers');
  await step('Manager still answers');
  out.result = 'pass';
} catch (error) { out.error = String(error); out.stack = error?.stack; console.error(out.error); process.exitCode = 1; }
finally { await save(); ws?.close(); hostWs?.close(); }

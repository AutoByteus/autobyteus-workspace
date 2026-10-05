// API-REV-020 temporary probe (CRR-028 re-baseline of FAPI-012), owned isolated instance only, real model.
// (a) A Task-owned delegated helper replies to its delegator by run ID → reaches the delegator; no new run/entry.
// (b) Unlinked control: a delegated helper replying to its delegator by ADDRESS brings in a new root-wide run;
//     no Task file is written. DONE of the Task closes/stops exactly its own runs.
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
const save = async () => { await fs.writeFile(`${E}/api-021-reply.json`, JSON.stringify(out, null, 2) + '\n'); await fs.writeFile(`${E}/api-021-reply-frames.json`, JSON.stringify(frames) + '\n'); };
const step = async (name, data = {}) => { out.steps.push({ name, at: new Date().toISOString(), ...data }); await save(); console.log('STEP', name); };
async function gql(query, variables = {}) {
  const r = await fetch(i.graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  assert.equal(r.status, 200); const j = await r.json(); assert(!j.errors, JSON.stringify(j.errors)); return j.data;
}
async function waitFor(check, label, ms = 240_000) { const until = Date.now() + ms; while (Date.now() < until) { if (await check()) return; await sleep(500); } throw new Error('TIMEOUT ' + label); }
const mem = () => path.join(i.dataRoot, 'server-data/memory/agents', out.rootId);
async function traceFiles(dir) { const f = []; for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) { const p = path.join(dir, e.name); if (e.isDirectory()) f.push(...await traceFiles(p)); else if (e.name === 'raw_traces_active.jsonl') f.push(p); } return f; }
const trace = async id => { const f = (await traceFiles(mem())).find(p => path.basename(path.dirname(p)) === id); return f ? (await fs.readFile(f, 'utf8')).split('\n').filter(Boolean).map(l => JSON.parse(l)) : []; };
const allTraceOwners = async () => (await traceFiles(mem())).map(p => path.basename(path.dirname(p)));
const receivedBy = async text => { const owners = []; for (const id of await allTraceOwners()) if ((await trace(id)).some(x => x.trace_type === 'user' && String(x.content).startsWith('You received a message') && String(x.content).includes(text))) owners.push(id); return owners; };
const assistantSaid = async (id, nonce) => (await trace(id)).some(x => x.trace_type === 'assistant' && String(x.content).includes(nonce));
const treeNodes = async () => { const t = JSON.parse(await fs.readFile(path.join(mem(), 'collaboration/collaboration_tree.json'), 'utf8')); const n = []; const walk = v => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { if (v.agentRunId) n.push({ agentRunId: v.agentRunId, address: v.address, delegatorAgentRunId: v.delegatorAgentRunId ?? null }); Object.values(v).forEach(walk); } }; walk(t); return n; };
const resources = async () => { const o = {}; for (const p of await fs.readdir(projectsDir, { withFileTypes: true })) { if (!p.isDirectory()) continue; for (const t of await fs.readdir(path.join(projectsDir, p.name, 'tasks')).catch(() => [])) { try { o[`${p.name}/${t}`] = JSON.parse(await fs.readFile(path.join(projectsDir, p.name, 'tasks', t, 'agent_run_resources.json'), 'utf8')); } catch { /* none */ } } } return o; };
const runIdOf = e => e.agentRun.kind === 'agent' ? e.agentRun.agentRunId : e.agentRun.coordinatorAgentRunId;
function send(target, content) {
  const id = randomUUID();
  if (target === out.rootId) hostWs.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content, message_id: id, dedupe_key: id, context_file_paths: [], image_urls: [] } }));
  else ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { root_subject_kind: 'agent', root_run_id: out.rootId, target_agent_run_id: target, command_id: id, content, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: id } }));
  return id;
}
async function ask(target, request, label, ms) { const nonce = `API020_${randomUUID()}`; send(target, `${request} Include ${nonce} in your final answer.`); await waitFor(() => assistantSaid(target, nonce), label, ms); return nonce; }
const offline = id => frames.some(f => JSON.stringify(f).includes(id) && /"offline"/.test(JSON.stringify(f.payload ?? {})));

const CONTINUE = process.env.API020_CONTINUE === 'done';
try {
  if (CONTINUE) {
    Object.assign(out, JSON.parse(await fs.readFile(`${E}/api-021-reply.json`, 'utf8')), { error: undefined, stack: undefined });
    hostWs = new WebSocket(i.backendUrl.replace('http:', 'ws:') + '/ws/agent/' + encodeURIComponent(out.rootId));
    hostWs.addEventListener('message', e => { try { const f = JSON.parse(String(e.data)); if (f.type === 'CONNECTED') hostReady = true; frames.push({ host: true, at: new Date().toISOString(), ...f }); } catch { /* ignore */ } });
    ws = new WebSocket(i.backendUrl.replace('http:', 'ws:') + '/ws/agent-collaboration/' + encodeURIComponent(out.rootId));
    ws.addEventListener('message', e => { try { frames.push({ at: new Date().toISOString(), ...JSON.parse(String(e.data)) }); } catch { /* ignore */ } });
    await waitFor(() => hostReady && ws.readyState === 1, 'streams ready', 30_000);
    const key = `${out.project.projectId}/${out.task.taskId}`;
    // (b) re-evaluated with the inter-agent-only oracle (attempt 1 counted the operator instruction to Wu).
    out.addrReceivers = await receivedBy(out.addrMarker);
    assert.equal(out.addrReceivers.length, 1); out.collaborator = out.addrReceivers[0];
    assert.notEqual(out.collaborator, out.Wu, 'the delegated worker is not address-reachable (released semantics)');
    out.collaboratorNode = out.newRunsB.find(n => n.agentRunId === out.collaborator);
    assert(out.collaboratorNode && out.collaboratorNode.delegatorAgentRunId === null, 'a new root-wide run with no delegator');
    const files = await resources();
    assert.deepEqual(Object.keys(files), [key], 'the only Task file is Task R');
    assert.deepEqual(files[key].agentRunResources.map(e => [e.role, runIdOf(e)]), [['assigned', out.W], ['delegated', out.H]], 'no entry for Wu, Hu or the collaborator');
    await step('(b) unlinked control (corrected oracle): address reply brought in a new root-wide run; Wu not reached; no Task entry', { collaborator: out.collaboratorNode });
    await ask(out.rootId, `I explicitly instruct you to mark saved Task ${out.task.taskId} DONE now with create_or_update_task. Nothing else.`, 'Manager DONE R', 180_000);
    await waitFor(async () => (await resources())[key].agentRunResources.every(e => e.closedAt), 'R closed', 60_000);
    out.fileAfterDone = (await resources())[key];
    assert.equal(out.fileAfterDone.agentRunResources.length, 2);
    await waitFor(() => offline(out.W) && offline(out.H), 'W and H stopped', 60_000);
    out.unlinkedAfterDone = await ask(out.Wu, 'Reply with one line confirming you are available. No tools needed.', 'unlinked worker unaffected by DONE');
    out.collaboratorAfterDone = await ask(out.collaborator, 'Reply with one line confirming you are available. No tools needed.', 'collaborator unaffected by DONE');
    await step('DONE R closed and stopped exactly W and H; unlinked worker and collaborator still answer', { fileAfterDone: out.fileAfterDone });
    out.result = 'pass';
  }
  if (!CONTINUE) {
  const make = async (name, instructions, toolNames) => (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id name}}', { i: { name, description: 'API020 owned validation definition', instructions, toolNames, skillNames: [], defaultLaunchConfig: MODEL } })).createAgentDefinition;
  out.packetAgent = await make('API020 Packet Agent', GUARD + 'Do exactly what the requester asks with the named tools, report tool errors verbatim, and include any requested nonce in your final answer.', ['read_file', 'send_message_to', 'delegate_task', 'list_available_agents']);
  out.helper = await make('API020 Delegate Helper', GUARD + 'Follow the work description exactly, including which send_message_to parameter to use, then give a short final answer.', ['send_message_to']);
  out.manager = (await gql('{agentDefinitions{id name}}')).agentDefinitions.find(d => d.name === 'Project Task Manager');
  const ws0 = path.join(i.dataRoot, 'validation-workspace', 'reply'); await fs.mkdir(ws0, { recursive: true });
  const r = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: out.manager.id, workspaceRootPath: ws0, autoExecuteTools: true, ...MODEL } })).createAgentRun;
  assert(r.success, r.message); out.rootId = r.runId;
  hostWs = new WebSocket(i.backendUrl.replace('http:', 'ws:') + '/ws/agent/' + encodeURIComponent(out.rootId));
  hostWs.addEventListener('message', e => { try { const f = JSON.parse(String(e.data)); if (f.type === 'CONNECTED') hostReady = true; frames.push({ host: true, at: new Date().toISOString(), ...f }); } catch { /* ignore */ } });
  ws = new WebSocket(i.backendUrl.replace('http:', 'ws:') + '/ws/agent-collaboration/' + encodeURIComponent(out.rootId));
  ws.addEventListener('message', e => { try { frames.push({ at: new Date().toISOString(), ...JSON.parse(String(e.data)) }); } catch { /* ignore */ } });
  await waitFor(() => hostReady && ws.readyState === 1, 'streams ready', 30_000);
  out.project = (await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}', { i: { name: 'API020 reply ' + randomUUID().slice(0, 8), description: 'FAPI-012 re-baseline' } })).createProject;
  out.task = (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}', { i: { projectId: out.project.projectId, description: 'API020 Task R: wait for the user\'s follow-up instructions and report briefly to the requester. Do not change any Task status.' } })).createProjectTask;
  const key = `${out.project.projectId}/${out.task.taskId}`;
  await step('root, project and Task created', { rootId: out.rootId, task: out.task });

  await ask(out.rootId, `Authorized validation. Delegate saved Task ${out.task.taskId} of Project ${out.project.projectId} once to the listed API020 Packet Agent address (use list_available_agents), passing only recipient_address and task_id, then mark it IN_PROGRESS. Do not mark DONE.`, 'Manager assigns R', 300_000);
  await waitFor(async () => (await resources())[key]?.agentRunResources?.[0]?.start === 'started', 'assigned started', 60_000);
  out.W = runIdOf((await resources())[key].agentRunResources[0]);
  await step('Task R assigned to W', { W: out.W });

  // (a) run-ID reply.
  const treeBeforeA = (await treeNodes()).map(n => n.agentRunId);
  out.runIdMarker = `API020_RUNID_REPLY_${randomUUID()}`;
  await ask(out.W, `Use list_available_agents, then call delegate_task with recipient_address = the API020 Delegate Helper address (no task_id) and this exact description: "Reply to your Task delegator with send_message_to using target_agent_run_id set to the Task delegator AgentRun ID given in this packet (do NOT use recipient_address). Message content: ${out.runIdMarker}". Then end your turn.`, 'W delegates to helper H', 240_000);
  await waitFor(async () => (await receivedBy(out.runIdMarker)).length > 0, 'run-ID reply received', 180_000);
  await sleep(5000);
  out.runIdReceivers = await receivedBy(out.runIdMarker);
  const fileA = (await resources())[key];
  out.fileAfterA = fileA;
  const delegated = fileA.agentRunResources.filter(e => e.role === 'delegated');
  assert.equal(delegated.length, 1, 'one delegated helper'); out.H = runIdOf(delegated[0]);
  const hCall = (await trace(out.H)).find(x => x.trace_type === 'tool_result' && x.tool_name === 'send_message_to');
  out.hToolResult = hCall;
  assert(JSON.stringify(hCall?.tool_args ?? {}).includes('target_agent_run_id'), 'H used target_agent_run_id');
  assert.deepEqual(out.runIdReceivers.filter(id => id !== out.H), [out.W], 'only W received the run-ID reply');
  assert.deepEqual(fileA.agentRunResources.map(e => [e.role, runIdOf(e)]), [['assigned', out.W], ['delegated', out.H]], 'no extra entry');
  out.newRunsA = (await treeNodes()).map(n => n.agentRunId).filter(id => !treeBeforeA.includes(id));
  assert.deepEqual(out.newRunsA, [out.H], 'no run other than H started');
  await step('(a) run-ID reply reached W; only H started; Task file = assigned W + delegated H', { receivers: out.runIdReceivers, newRuns: out.newRunsA });

  // (b) unlinked control: address reply from a helper of an unlinked worker.
  const filesBeforeB = await resources(), treeBeforeB = (await treeNodes()).map(n => n.agentRunId);
  await ask(out.rootId, 'Call delegate_task with recipient_address = the listed API020 Packet Agent address and description "Wait for the user\'s follow-up instructions; reply briefly." Do NOT pass task_id. Then report the target_agent_run_id.', 'Manager unlinked delegate', 240_000);
  await waitFor(async () => (await treeNodes()).some(n => !treeBeforeB.includes(n.agentRunId) && n.agentRunId.startsWith('api020_packet_agent_')), 'unlinked worker', 60_000);
  out.Wu = (await treeNodes()).find(n => !treeBeforeB.includes(n.agentRunId) && n.agentRunId.startsWith('api020_packet_agent_')).agentRunId;
  out.addrMarker = `API020_ADDR_REPLY_${randomUUID()}`;
  const treeBeforeHu = (await treeNodes()).map(n => n.agentRunId);
  await ask(out.Wu, `Use list_available_agents, then call delegate_task with recipient_address = the API020 Delegate Helper address (no task_id) and this exact description: "Reply to your Task delegator with send_message_to using recipient_address set to the Task delegator address given in this packet (do NOT use target_agent_run_id). Message content: ${out.addrMarker}". Then end your turn.`, 'Wu delegates to helper Hu', 240_000);
  await waitFor(async () => (await receivedBy(out.addrMarker)).length > 0, 'address reply received', 180_000);
  await sleep(5000);
  const nodes = await treeNodes();
  out.newRunsB = nodes.filter(n => !treeBeforeHu.includes(n.agentRunId));
  out.Hu = out.newRunsB.find(n => n.agentRunId.startsWith('api020_delegate_helper_'))?.agentRunId;
  out.addrReceivers = (await receivedBy(out.addrMarker)).filter(id => id !== out.Hu);
  const huCall = (await trace(out.Hu)).find(x => x.trace_type === 'tool_result' && x.tool_name === 'send_message_to');
  out.huToolResult = huCall;
  assert(JSON.stringify(huCall?.tool_args ?? {}).includes('recipient_address'), 'Hu used recipient_address');
  assert.equal(out.addrReceivers.length, 1); out.collaborator = out.addrReceivers[0];
  assert.notEqual(out.collaborator, out.Wu, 'released semantics: the delegated worker is not address-reachable');
  assert(out.newRunsB.some(n => n.agentRunId === out.collaborator), 'the receiver is a newly brought-in run');
  out.collaboratorNode = out.newRunsB.find(n => n.agentRunId === out.collaborator);
  assert.deepEqual(await resources(), filesBeforeB, 'unlinked delegation and address bring-in write no Task file');
  await step('(b) unlinked control: address reply brought in a new root-wide run; no Task file written', { Wu: out.Wu, Hu: out.Hu, collaborator: out.collaboratorNode, newRuns: out.newRunsB });

  // DONE R closes and stops exactly W and H; unlinked runs untouched.
  await ask(out.rootId, `I explicitly instruct you to mark saved Task ${out.task.taskId} DONE now with create_or_update_task. Nothing else.`, 'Manager DONE R', 180_000);
  await waitFor(async () => (await resources())[key].agentRunResources.every(e => e.closedAt), 'R closed', 60_000);
  out.fileAfterDone = (await resources())[key];
  assert.equal(out.fileAfterDone.agentRunResources.length, 2);
  await waitFor(() => offline(out.W) && offline(out.H), 'W and H stopped', 60_000);
  out.unlinkedAfterDone = await ask(out.Wu, 'Reply with one line confirming you are available. No tools needed.', 'unlinked worker unaffected by DONE');
  await step('DONE R closed and stopped exactly W and H; unlinked worker still answers', { fileAfterDone: out.fileAfterDone });
  out.result = 'pass';
  }
} catch (error) {
  out.error = String(error); out.stack = error?.stack; console.error(out.error); process.exitCode = 1;
} finally { await save(); ws?.close(); hostWs?.close(); }

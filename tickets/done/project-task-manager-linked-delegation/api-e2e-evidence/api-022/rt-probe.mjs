// API-REV-019 temporary changed-build probe (IR-013 / commit b61b8452f), real model, owned isolated instance only.
// Public GraphQL/REST/WebSocket plus read-only inspection of the instance's own files. No mocks or source hooks.
//   node <this> setup
//   node <this> run <agent|agent_team|agent_org>
//   node <this> resume <kind>            after a whole-app restart (closed stays closed, open resumes; agent: Task delete)
//   node <this> damaged-prepare          corrupt the agent-root Task B file (then restart)
//   node <this> damaged                  after restart: Q-3 checks
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';

const RT = process.env.RT;
const MODELS = {
  codex: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-6-luna', llmConfig: { reasoning_effort: 'medium' } },
  claude: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'sonnet', llmConfig: { thinking_enabled: false, reasoning_effort: 'medium' } },
  agy: { runtimeKind: 'antigravity_cli', llmModelIdentifier: process.env.AGY_MODEL ?? '', llmConfig: null },
};
if (!MODELS[RT]) throw new Error('RT must be codex|claude|agy');
const MODEL = MODELS[RT];
const RTE = `tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence/api-022/${RT}`;
const E = RTE;
const instance = JSON.parse(await fs.readFile(`${E}/instance.json`, 'utf8')).result;
const [mode, kind] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const projectsDir = path.join(instance.dataRoot, 'server-data/projects');
const GUARD = 'Never inspect credentials, HOME or unrelated paths; do not modify files, create copies, or change any Task status. ';

async function gql(query, variables = {}) {
  const r = await fetch(instance.graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(90_000) });
  assert.equal(r.status, 200); const j = await r.json(); assert(!j.errors, JSON.stringify(j.errors)); return j.data;
}
async function waitFor(check, label, ms = 240_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) { if (await check()) return; await sleep(500); }
  throw new Error('TIMEOUT ' + label);
}
const resourcesFile = (projectId, taskId) => path.join(projectsDir, projectId, 'tasks', taskId, 'agent_run_resources.json');
const readResources = async (projectId, taskId) => {
  try { return JSON.parse(await fs.readFile(resourcesFile(projectId, taskId), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
};
const readTask = async (projectId, taskId) => JSON.parse(await fs.readFile(path.join(projectsDir, projectId, 'tasks', taskId, 'task.json'), 'utf8'));
const allResourceFiles = async () => {
  const out = {};
  for (const p of await fs.readdir(projectsDir, { withFileTypes: true })) {
    if (!p.isDirectory()) continue;
    const tasks = path.join(projectsDir, p.name, 'tasks');
    for (const t of await fs.readdir(tasks).catch(() => [])) {
      const f = path.join(tasks, t, 'agent_run_resources.json');
      try { out[`${p.name}/${t}`] = await fs.readFile(f, 'utf8'); } catch { /* none */ }
    }
  }
  return out;
};
const runIdOf = e => e.agentRun.kind === 'agent' ? e.agentRun.agentRunId : e.agentRun.coordinatorAgentRunId;

if (mode === 'setup') {
  const out = { instanceId: instance.instanceId, at: new Date().toISOString() };
  const catalog = (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}', { r: MODEL.runtimeKind })).providerModelCatalogSnapshots;
  out.modelOffered = catalog.flatMap(p => p.llmModels).filter(m => m.modelIdentifier === MODEL.llmModelIdentifier);
  assert.equal(out.modelOffered.length, 1);
  const make = async (name, instructions, toolNames) => (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id name}}',
    { i: { name, description: 'API022 owned validation definition', instructions, toolNames, skillNames: [], defaultLaunchConfig: MODEL } })).createAgentDefinition;
  out.packetAgent = await make('API022 Packet Agent', GUARD + 'Read the supplied saved Task attachment with read_file if one is given, report briefly to the requester with send_message_to, then give a short final answer. For later requests from the user, do exactly what is asked with the named tool, report any tool error text verbatim, and include any requested nonce in your final answer.',
    ['read_file', 'send_message_to', 'delegate_task', 'list_available_agents']);
  out.delegateHelper = await make('API022 Delegate Helper', GUARD + 'Reply to whoever asked with one short line via send_message_to, then a short final answer.', ['send_message_to']);
  out.bringHelper = await make('API022 Bring Helper', GUARD + 'Reply to whoever asked with one short line via send_message_to, then a short final answer.', ['send_message_to']);
  out.coordinator = await make('API022 Team Coordinator', GUARD + 'Read the supplied saved Task attachment with read_file if one is given, report briefly to the requester with send_message_to, then a short final answer. Include any requested nonce in your final answer.', ['read_file', 'send_message_to']);
  out.reader = await make('API022 Team Reader', GUARD + 'Answer any message briefly via send_message_to, then a short final answer.', ['read_file', 'send_message_to']);
  out.team = (await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id name}}', { i: {
    name: 'API022 Packet Team', description: 'Two-member reader Team', instructions: 'Do only the supplied work.',
    nodes: [{ memberName: 'coordinator', ref: out.coordinator.id, refScope: 'SHARED' }, { memberName: 'reader', ref: out.reader.id, refScope: 'SHARED' }],
    coordinatorMemberName: 'coordinator', defaultLaunchConfig: MODEL } })).createAgentTeamDefinition;
  out.manager = (await gql('{agentDefinitions{id name}}')).agentDefinitions.find(d => d.name === 'Project Task Manager');
  assert(out.manager);
  await fs.writeFile(`${E}/api-022-setup.json`, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out)); process.exit(0);
}

const setup = JSON.parse(await fs.readFile(`${E}/api-022-setup.json`, 'utf8'));
const stateKind = mode.startsWith('damaged') ? 'agent' : kind;
assert(['agent', 'agent_team', 'agent_org'].includes(stateKind), 'usage');
const resultFile = `${E}/api-022-${stateKind}.json`;
const out = mode === 'run' ? { instanceId: instance.instanceId, kind: stateKind, steps: [] } : JSON.parse(await fs.readFile(resultFile, 'utf8'));
let frames = [];
const save = async () => {
  await fs.writeFile(resultFile, JSON.stringify(out, null, 2) + '\n');
  await fs.writeFile(`${E}/api-022-${stateKind}-${mode}-frames.json`, JSON.stringify(frames) + '\n');
};
const step = async (name, data = {}) => { out.steps.push({ phase: mode, name, at: new Date().toISOString(), ...data }); await save(); console.log('STEP', stateKind, mode, name); };
const memoryDir = () => path.join(instance.dataRoot, 'server-data/memory', stateKind === 'agent' ? 'agents' : stateKind === 'agent_team' ? 'agent_teams' : 'agent_orgs', out.rootId);
async function traceFiles(dir) {
  const found = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await traceFiles(p)); else if (entry.name === 'raw_traces_active.jsonl') found.push(p);
  }
  return found;
}
const trace = async id => {
  const f = (await traceFiles(memoryDir())).find(p => path.basename(path.dirname(p)) === id);
  return f ? (await fs.readFile(f, 'utf8')).split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
};
const treeFiles = async () => {
  const names = ['collaboration_tree.json', 'team_run_execution_tree.json', 'agent_org_run_execution_tree.json'];
  const found = [];
  const walk = async d => { for (const e of await fs.readdir(d, { withFileTypes: true }).catch(() => [])) { const p = path.join(d, e.name); if (e.isDirectory()) await walk(p); else if (names.includes(e.name)) found.push(p); } };
  await walk(memoryDir()); return found;
};
const assistantSaid = async (id, nonce) => (await trace(id)).some(x => x.trace_type === 'assistant' && String(x.content).includes(nonce));
const toolResultContains = async (id, text) => (await trace(id)).some(x => x.trace_type === 'tool_result' && JSON.stringify(x).includes(text));
const receivedContains = async (id, text) => (await trace(id)).some(x => x.trace_type === 'user' && String(x.content).includes(text));
const toolResultsAfter = async (id, toolName, nonce) => {
  const rows = await trace(id);
  const start = rows.findIndex(x => x.trace_type === 'user' && String(x.content).includes(nonce));
  return start < 0 ? [] : rows.slice(start).filter(x => x.trace_type === 'tool_result' && x.tool_name === toolName);
};

let ws, hostWs, hostReady = false;
async function connect() {
  if (stateKind === 'agent') {
    // An Agent root's own agent (the Manager) takes input on its Agent stream; children use the collaboration stream.
    hostReady = false;
    hostWs = new WebSocket(instance.backendUrl.replace('http:', 'ws:') + '/ws/agent/' + encodeURIComponent(out.rootId));
    hostWs.addEventListener('message', e => { try { const f = JSON.parse(String(e.data)); if (f.type === 'CONNECTED') hostReady = true; frames.push({ at: new Date().toISOString(), host: true, ...f }); } catch { /* ignore */ } });
    await waitFor(() => hostReady, 'Agent stream CONNECTED', 30_000);
  }
  frames = [];
  const route = stateKind === 'agent' ? '/ws/agent-collaboration/' : stateKind === 'agent_team' ? '/ws/agent-team/' : '/ws/agent-org/';
  ws = new WebSocket(instance.backendUrl.replace('http:', 'ws:') + route + encodeURIComponent(out.rootId));
  ws.addEventListener('message', e => { try { frames.push({ at: new Date().toISOString(), ...JSON.parse(String(e.data)) }); } catch { /* ignore */ } });
  await waitFor(() => ws.readyState === 1, 'WS open', 30_000);
  await waitFor(() => frames.some(f => f.type === (stateKind === 'agent_team' ? 'TEAM_EXECUTION_VIEW_SNAPSHOT' : 'ROOT_EXECUTION_VIEW_SNAPSHOT')), 'snapshot', 30_000);
}
function send(target, content) {
  const id = randomUUID();
  if (stateKind === 'agent' && target === out.rootId) {
    hostWs.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content, message_id: id, dedupe_key: id, context_file_paths: [], image_urls: [] } }));
    return id;
  }
  const payload = stateKind === 'agent_team'
    ? { agent_run_id: target, content, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: id }
    : { root_subject_kind: stateKind, root_run_id: out.rootId, target_agent_run_id: target, command_id: id, content, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: id };
  ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload })); return id;
}
async function ask(target, request, label, ms) {
  const nonce = `API022_${randomUUID()}`;
  const since = Date.now() / 1000 - 1;
  send(target, `${request} Include ${nonce} in your final answer.`);
  await waitFor(() => assistantSaid(target, nonce), label, ms);
  return { nonce, since };
}
async function expectRejected(target, label, code = 'TASK_AGENT_RESOURCE_CLOSED') {
  const nonce = `API022_REJECT_${randomUUID()}`, from = frames.length;
  const commandId = send(target, `Reply with ${nonce}.`);
  const matches = f => stateKind === 'agent_team' ? f.type === 'ERROR' && JSON.stringify(f.payload).includes(target)
    : f.type === 'AGENT_COMMAND_ACK' && f.payload?.command_id === commandId;
  await waitFor(() => frames.slice(from).some(matches), label + ' receipt', 30_000);
  const receipt = frames.slice(from).find(matches);
  if (stateKind !== 'agent_team') assert.notEqual(receipt.payload.state, 'accepted', JSON.stringify(receipt));
  assert(JSON.stringify(receipt.payload).includes(code), `${label}: expected ${code} in ${JSON.stringify(receipt)}`);
  await sleep(3000);
  assert(!await receivedContains(target, nonce), 'rejected input must not reach the agent');
  return receipt;
}
const offline = id => frames.some(f => JSON.stringify(f).includes(id) && /"offline"/.test(JSON.stringify(f.payload ?? {})));

try {
  const continueAt = process.env.API022_CONTINUE_AT ?? null; // 'manager-read' resumes after the owned-worker section
  if (mode === 'run' && continueAt) {
    Object.assign(out, JSON.parse(await fs.readFile(resultFile, 'utf8')), { error: undefined, stack: undefined });
    await connect();
    await step('continued on the same root at ' + continueAt);
  }
  if (mode === 'run') {
    const seed = null;
    if (!continueAt) {
    out.workspace = path.join(instance.dataRoot, 'validation-workspace', stateKind);
    await fs.mkdir(out.workspace, { recursive: true });
    const launch = { ...MODEL, autoExecuteTools: true };
    // Agent root uses the migrated released Project A Tasks; Team/Org roots use fresh Tasks in a new Project.
    if (false) {
    } else {
      out.project = (await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}', { i: { name: `API022 ${stateKind} ${randomUUID().slice(0, 8)}`, description: 'IR-013 root journey' } })).createProject;
      out.tasks = {};
      for (const k of ['A', 'B']) out.tasks[k] = (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}', { i: { projectId: out.project.projectId, description: `API022 ${stateKind} Task ${k}: report briefly to the requester. Do not change any Task status.` } })).createProjectTask;
    }
    if (stateKind === 'agent') {
      const r = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: setup.manager.id, workspaceRootPath: out.workspace, ...launch } })).createAgentRun;
      assert(r.success, r.message); out.rootId = r.runId; out.managerRunId = r.runId;
    } else {
      const members = [{ memberName: 'manager', ref: setup.manager.id }, { memberName: 'borrowed', ref: setup.packetAgent.id }];
      if (stateKind === 'agent_team') {
        const def = (await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: 'API022 Root Team ' + randomUUID().slice(0, 8), description: 'Owned Team root', instructions: 'Manager does Task business work; borrowed member is independent.',
          nodes: members.map(m => ({ ...m, refScope: 'SHARED' })), coordinatorMemberName: 'manager', defaultLaunchConfig: MODEL } })).createAgentTeamDefinition;
        const r = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: def.id, teamConfigs: [{ ...launch, teamAddress: '/', workspaceRootPath: out.workspace }],
          memberConfigs: members.map(m => ({ ...launch, memberAddress: '/' + m.memberName, agentDefinitionId: m.ref, workspaceRootPath: out.workspace })) } })).createAgentTeamRun;
        assert(r.success, r.message); out.rootId = r.teamRunId;
      } else {
        const def = (await gql('mutation($i:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id}}', { i: { name: 'API022 Root Org ' + randomUUID().slice(0, 8), description: 'Owned Org root', instructions: 'Manager does Task business work; borrowed member is independent.',
          members: members.map(m => ({ ...m, refType: 'AGENT', refScope: 'SHARED' })), handoffs: [], defaultLaunchConfig: MODEL } })).createAgentOrgDefinition;
        const r = (await gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}', { i: { agentOrgDefinitionId: def.id, rootConfiguration: { ...launch, workspaceRootPath: out.workspace } } })).createAgentOrgRun;
        assert(r.success, r.message); out.rootId = r.agentOrgRunId;
      }
    }
    await connect();
    if (stateKind !== 'agent') {
      const [tree] = await treeFiles(); const text = await fs.readFile(tree, 'utf8');
      const ids = [...new Set([...text.matchAll(/"(?:agentRunId|agent_run_id)"\s*:\s*"([^"]+)"/g)].map(m => m[1]))];
      out.managerRunId = ids.find(id => id.startsWith('project_task_manager_')); out.borrowedRunId = ids.find(id => id.startsWith('api022_packet_agent_'));
      assert(out.managerRunId && out.borrowedRunId, 'manager/borrowed ids ' + ids.join(','));
      out.borrowedFirst = await ask(out.borrowedRunId, 'Reply with one line saying you are ready. No tools needed.', 'borrowed ready');
    }
    await step('root created', { rootId: out.rootId, managerRunId: out.managerRunId, borrowedRunId: out.borrowedRunId });

    // Item 3: Manager assigns (delegate_task with task_id only).
    const aTarget = stateKind === 'agent' ? 'the listed API022 Packet Agent address' : 'the /borrowed address';
    out.dispatch = await ask(out.managerRunId, `Authorized isolated validation. In Project ${out.project.projectId}: delegate saved Task A ${out.tasks.A.taskId} once to ${aTarget}, and saved Task B ${out.tasks.B.taskId} once to the listed API022 Packet Team address, passing only recipient_address and task_id (use list_available_agents for addresses). Then mark both IN_PROGRESS. Do not mark anything DONE.`, 'Manager assigns A and B', 300_000);
    await waitFor(async () => (await readResources(out.project.projectId, out.tasks.A.taskId))?.agentRunResources?.[0]?.start === 'started'
      && (await readResources(out.project.projectId, out.tasks.B.taskId))?.agentRunResources?.[0]?.start === 'started', 'assigned entries started', 60_000);
    out.filesAfterAssign = { A: await readResources(out.project.projectId, out.tasks.A.taskId), B: await readResources(out.project.projectId, out.tasks.B.taskId) };
    const [a] = out.filesAfterAssign.A.agentRunResources, [b] = out.filesAfterAssign.B.agentRunResources;
    assert.equal(out.filesAfterAssign.A.agentRunResources.length, 1); assert.equal(out.filesAfterAssign.B.agentRunResources.length, 1);
    assert.deepEqual({ role: a.role, assignedBy: a.assignedBy, hostRoot: a.hostRoot, kind: a.agentRun.kind, closedAt: a.closedAt },
      { role: 'assigned', assignedBy: out.managerRunId, hostRoot: { kind: stateKind, runId: out.rootId }, kind: 'agent', closedAt: null });
    assert.deepEqual({ role: b.role, assignedBy: b.assignedBy, kind: b.agentRun.kind, closedAt: b.closedAt }, { role: 'assigned', assignedBy: out.managerRunId, kind: 'team', closedAt: null });
    out.aWorker = a.agentRun.agentRunId; out.bCoordinator = b.agentRun.coordinatorAgentRunId;
    if (out.borrowedRunId) assert.notEqual(out.aWorker, out.borrowedRunId, 'a fresh Task copy, not the borrowed member');
    // C-1: the execution tree files carry no Task information.
    for (const t of await treeFiles()) { const text = await fs.readFile(t, 'utf8'); assert(!/taskLifetime|lifetimeId|agentRunResource|"taskId"/.test(text), 'tree has Task info: ' + t); }
    await step('assigned entries written and started; trees Task-free', { files: out.filesAfterAssign });

    if (stateKind === 'agent') {
      // Item 3: owned worker delegates (no task_id) → delegated; brings in by send_message_to → broughtIn; task_id → rejected.
      out.ownedDelegate = await ask(out.aWorker, 'Use list_available_agents, then call delegate_task with recipient_address = the API022 Delegate Helper address and description "Reply with one short line." (do NOT pass task_id).', 'owned description-only delegate', 180_000);
      await waitFor(async () => (await readResources(out.project.projectId, out.tasks.A.taskId)).agentRunResources.some(e => e.role === 'delegated' && e.start === 'started'), 'delegated entry', 60_000);
      out.ownedBringIn = await ask(out.aWorker, 'Use list_available_agents, then call send_message_to with recipient_address = the API022 Bring Helper address and content "Reply with one short line." Do not use delegate_task.', 'owned bring-in', 180_000);
      await waitFor(async () => (await readResources(out.project.projectId, out.tasks.A.taskId)).agentRunResources.some(e => e.role === 'broughtIn' && e.start === 'started'), 'broughtIn entry', 60_000);
      const beforeOwned = await readResources(out.project.projectId, out.tasks.A.taskId);
      out.ownedTaskId = await ask(out.aWorker, `Call delegate_task with recipient_address = the API022 Delegate Helper address and task_id = "${out.tasks.B.taskId}". Report the exact tool result or error.`, 'owned task_id attempt', 180_000);
      assert(await toolResultContains(out.aWorker, 'TASK_AGENT_RESOURCE_OWNED_SENDER') || (await trace(out.aWorker)).some(x => JSON.stringify(x).includes('without task_id')), 'owned task_id must be rejected');
      assert.deepEqual(await readResources(out.project.projectId, out.tasks.A.taskId), beforeOwned, 'rejected owned task_id adds no entry');
      out.filesAfterOwned = { A: beforeOwned };
      out.delegatedRun = runIdOf(beforeOwned.agentRunResources.find(e => e.role === 'delegated'));
      out.broughtInRun = runIdOf(beforeOwned.agentRunResources.find(e => e.role === 'broughtIn'));
      await step('owned delegate → delegated, bring-in → broughtIn, owned task_id rejected', { file: beforeOwned });
    }
    }
    if (stateKind === 'agent') {

      // Item 7: Manager read through list_project_tasks.
      const read = await ask(out.managerRunId, `Call list_project_tasks for Project ${out.project.projectId} and quote the assignments of Task A and Task B exactly.`, 'Manager list_project_tasks', 180_000);
      const [result] = (await toolResultsAfter(out.managerRunId, 'list_project_tasks', read.nonce)).slice(-1);
      out.listAfterAssign = result; const listText = JSON.stringify(result);
      assert(listText.includes(out.aWorker) && listText.includes(out.bCoordinator), 'current assignments listed');
      assert(!listText.includes(out.delegatedRun) && !listText.includes(out.broughtInRun), 'internal delegated/broughtIn runs not listed');
      assert(/assignedBy/.test(listText) && /outcome/.test(listText), 'assignment fields');
      await step('Manager read: current assignments only', { listResult: result });
    }

    // Item 4: DONE A closes then stops exactly A's runs; Manager, B and borrowed survive.
    const aRuns = (await readResources(out.project.projectId, out.tasks.A.taskId)).agentRunResources.map(runIdOf);
    out.done = await ask(out.managerRunId, `I have reviewed the result of saved Task A ${out.tasks.A.taskId} and accept it as complete. I explicitly instruct you to mark Task A DONE now with create_or_update_task and keep it DONE. Do not change Task B, do not delegate, stop or delete anything.`, 'Manager DONE A', 180_000);
    await waitFor(async () => (await readTask(out.project.projectId, out.tasks.A.taskId)).status === 'DONE', 'A DONE in task.json', 60_000);
    out.closedA = await readResources(out.project.projectId, out.tasks.A.taskId);
    assert(out.closedA.agentRunResources.every(e => typeof e.closedAt === 'string'), 'every A entry closed');
    assert.equal((await readResources(out.project.projectId, out.tasks.B.taskId)).agentRunResources[0].closedAt, null, 'B stays open');
    await waitFor(() => aRuns.every(offline), 'A runs stopped (offline)', 60_000);
    await step('DONE A closed every A entry and stopped exactly A runs', { closedA: out.closedA, aRuns });
    out.fence = {};
    for (const id of aRuns) out.fence[id] = await expectRejected(id, 'closed ' + id);
    await step('fence: every closed A run rejects input', { receipts: out.fence });
    out.bAlive = await ask(out.bCoordinator, 'Reply with one line confirming you are available. No tools needed.', 'open B still usable');
    if (out.borrowedRunId) out.borrowedAlive = await ask(out.borrowedRunId, 'Reply with one line confirming you are available. No tools needed.', 'borrowed still usable');
    await step('Manager, open B and borrowed still usable');

    // Item 5: repeat DONE → no file change, no new runs; then (agent root) reopen + delegate → new open assigned.
    const filesBefore = await allResourceFiles();
    out.repeat = await ask(out.managerRunId, `Mark saved Task A ${out.tasks.A.taskId} DONE once more with create_or_update_task. Nothing else.`, 'Manager repeat DONE', 180_000);
    await sleep(3000);
    assert.deepEqual(await allResourceFiles(), filesBefore, 'repeat DONE writes no resource file');
    await step('repeat DONE: no resource file change');
    if (stateKind === 'agent') {
      out.reopen = await ask(out.managerRunId, `Set saved Task A ${out.tasks.A.taskId} to TODO, then delegate it once again to the listed API022 Packet Agent address with recipient_address and task_id only, then mark it IN_PROGRESS.`, 'Manager reopen + delegate', 300_000);
      await waitFor(async () => (await readResources(out.project.projectId, out.tasks.A.taskId)).agentRunResources.filter(e => e.role === 'assigned').length === 2, 'new assigned entry', 60_000);
      out.reopened = await readResources(out.project.projectId, out.tasks.A.taskId);
      const fresh = out.reopened.agentRunResources.filter(e => e.closedAt === null);
      assert.equal(fresh.length, 1); assert.equal(fresh[0].role, 'assigned'); assert(!aRuns.includes(runIdOf(fresh[0])));
      for (const old of out.closedA.agentRunResources) assert(out.reopened.agentRunResources.some(e => runIdOf(e) === runIdOf(old) && e.closedAt === old.closedAt), 'old entries stay closed');
      out.aWorker2 = runIdOf(fresh[0]);
      await expectRejected(out.aWorker, 'old A worker after reopen');
      const read2 = await ask(out.managerRunId, `Call list_project_tasks for Project ${out.project.projectId} and quote Task A's assignments exactly.`, 'Manager list after reopen', 180_000);
      const [r2] = (await toolResultsAfter(out.managerRunId, 'list_project_tasks', read2.nonce)).slice(-1);
      out.listAfterReopen = r2;
      assert(JSON.stringify(r2).includes(out.aWorker2) && !JSON.stringify(r2).includes(out.aWorker), 'only the new assignment listed');
      await step('reopen + delegate: new open assigned; old closed; list shows only new', { reopened: out.reopened });

      // Item 8: unlinked description-only delegation unchanged: works and writes no resource file.
      const before = await allResourceFiles();
      out.unlinked = await ask(out.managerRunId, 'Use delegate_task with recipient_address = the listed API022 Delegate Helper address and description "Reply with one short line." Do not pass task_id. Then answer.', 'Manager unlinked delegate', 180_000);
      assert(await toolResultContains(out.managerRunId, 'target_agent_run_id'), 'unlinked delegate accepted');
      assert.deepEqual(await allResourceFiles(), before, 'unlinked delegation writes no Task resource file');
      await step('unlinked delegation works and records nothing');
    }
    out.result = 'run phase passed';
    await step('run phase complete');
  } else if (mode === 'resume') {
    const restore = stateKind === 'agent'
      ? (await gql('mutation($id:String!){restoreAgentRun(agentRunId:$id){success message}}', { id: out.rootId })).restoreAgentRun
      : stateKind === 'agent_team'
        ? (await gql('mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message}}', { id: out.rootId })).restoreAgentTeamRun
        : (await gql('mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success message}}', { id: out.rootId })).restoreAgentOrgRun;
    assert(restore.success, restore.message);
    await connect();
    await step('root restored after whole-app restart');
    const closedRuns = out.closedA.agentRunResources.map(runIdOf);
    for (const id of closedRuns) await expectRejected(id, 'closed after restart ' + id);
    await step('closed A runs rejected after restart (not woken/restored)', { closedRuns });
    out.bResume = await ask(out.bCoordinator, 'Reply with one line confirming you are available. No tools needed.', 'open B resumes after restart');
    await step('open B resumes after restart');
    if (stateKind === 'agent') {
      const before = await fs.readFile(resourcesFile(out.project.projectId, out.tasks.A.taskId), 'utf8');
      // Close the reopened assignment first so Task A is DONE, then delete the Task (business Delete, not Stop).
      await ask(out.managerRunId, `Mark saved Task A ${out.tasks.A.taskId} DONE with create_or_update_task. Nothing else.`, 'Manager DONE A again', 180_000);
      await waitFor(async () => JSON.parse(await fs.readFile(resourcesFile(out.project.projectId, out.tasks.A.taskId), 'utf8')).agentRunResources.every(e => e.closedAt), 'reopened A closed', 60_000);
      out.deleted = (await gql('mutation($i:DeleteProjectTaskInput!){deleteProjectTask(input:$i)}', { i: { projectId: out.project.projectId, taskId: out.tasks.A.taskId } })).deleteProjectTask;
      const dir = path.join(projectsDir, out.project.projectId, 'tasks', out.tasks.A.taskId);
      out.afterDelete = (await fs.readdir(dir)).sort();
      assert.deepEqual(out.afterDelete, ['agent_run_resources.json'], 'Delete keeps only agent_run_resources.json');
      assert.notEqual(before, undefined);
      for (const id of [...closedRuns, out.aWorker2]) await expectRejected(id, 'closed after Task delete ' + id);
      await step('Task delete keeps the resource file; closed runs still rejected', { afterDelete: out.afterDelete });
    }
    out.resumeResult = 'resume phase passed';
    await step('resume phase complete');
  } else if (mode === 'damaged-prepare') {
    const f = resourcesFile(out.project.projectId, out.tasks.B.taskId);
    out.damagedOriginal = await fs.readFile(f, 'utf8');
    await fs.writeFile(f, '{ "taskId": "damaged-by-api022", ');
    await step('damaged Task B agent_run_resources.json (restart next)', { file: f });
  } else if (mode === 'damaged') {
    const otherProject = (await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}', { i: { name: `API022 other ${randomUUID().slice(0, 8)}`, description: 'readable Task while another is damaged' } })).createProject;
    const otherTask = (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}', { i: { projectId: otherProject.projectId, description: 'API022 readable Task: report briefly to the requester. Do not change any Task status.' } })).createProjectTask;
    const seed = { ids: { b: otherProject.projectId, t3: otherTask.taskId } };
    const restore = (await gql('mutation($id:String!){restoreAgentRun(agentRunId:$id){success message}}', { id: out.rootId })).restoreAgentRun;
    assert(restore.success, restore.message);
    await connect();
    // The rest of the app works: Projects GraphQL lists everything.
    out.damagedList = (await gql('query($id:String!){projectTasks(projectId:$id){taskId status}}', { id: out.project.projectId })).projectTasks;
    assert(out.damagedList.some(t => t.taskId === out.tasks.B.taskId));
    const read = await ask(out.managerRunId, `Call list_project_tasks for Project ${out.project.projectId} and quote what it returns for Task B exactly.`, 'Manager list with damaged B', 180_000);
    const [r] = (await toolResultsAfter(out.managerRunId, 'list_project_tasks', read.nonce)).slice(-1);
    out.damagedListTool = r; assert(JSON.stringify(r).includes('assignmentsUnavailable'), 'damaged Task shows assignmentsUnavailable');
    await step('list_project_tasks marks damaged B assignmentsUnavailable', { result: r });
    const done = await ask(out.managerRunId, `Mark saved Task B ${out.tasks.B.taskId} DONE with create_or_update_task and report the exact tool result or error.`, 'Manager DONE damaged B', 180_000);
    assert((await toolResultsAfter(out.managerRunId, 'create_or_update_task', done.nonce)).some(x => JSON.stringify(x).includes('TASK_AGENT_RESOURCES_UNAVAILABLE') || /could not be read/.test(JSON.stringify(x))), 'DONE on damaged Task fails clearly');
    assert.notEqual((await readTask(out.project.projectId, out.tasks.B.taskId)).status, 'DONE');
    await step('DONE on damaged B fails with the clear error; status unchanged');
    const desc = await ask(out.managerRunId, 'Call delegate_task with recipient_address = the listed API022 Delegate Helper address and description "Reply with one short line." without task_id, and report the exact tool result or error.', 'Manager description-only while damaged', 180_000);
    assert((await toolResultsAfter(out.managerRunId, 'delegate_task', desc.nonce)).some(x => JSON.stringify(x).includes('TASK_AGENT_RESOURCES_UNAVAILABLE') || /could not be read/.test(JSON.stringify(x))), 'description-only delegation rejected up front');
    await step('description-only delegation rejected up front while a file is damaged');
    await expectRejected(out.bCoordinator, 'damaged Task B copy', 'TASK_AGENT_RESOURCES_UNAVAILABLE');
    await step('messaging the damaged Task copy is rejected');
    const other = await ask(out.managerRunId, `Delegate saved Task ${seed.ids.t3} of Project ${seed.ids.b} once to the listed API022 Packet Agent address with recipient_address and task_id only, then report the result.`, 'Manager assigns a readable Task', 240_000);
    await waitFor(async () => (await readResources(seed.ids.b, seed.ids.t3))?.agentRunResources?.[0]?.start === 'started', 'readable Task assigned', 60_000);
    out.otherTask = await readResources(seed.ids.b, seed.ids.t3);
    await step('a readable Task still assigns normally', { otherTask: out.otherTask });
    out.damagedResult = 'damaged phase passed';
    await step('damaged phase complete');
  }
} catch (error) {
  out.error = String(error); out.stack = error?.stack; console.error(out.error); process.exitCode = 1;
} finally {
  await save(); ws?.close(); hostWs?.close();
}

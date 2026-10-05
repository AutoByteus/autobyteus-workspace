// API-REV-018 temporary changed-build probe (IR-012 / commit 4b04d9097).
// Drives only the exact isolated instance recorded in api-108-instance.json, through its public
// GraphQL/REST/WebSocket surfaces and a real model. No mocks, no source hooks, no secret values.
//
// Usage (cwd = worktree root):
//   node <this> setup                 catalog check + owned definitions
//   node <this> run <kind>            kind = agent | agent_team | agent_org
//   node <this> resume <kind>         after a whole-app restart
import fs from 'node:fs/promises';
import { createReadStream, watch } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';

const E = 'tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence/api-018';
const instance = JSON.parse(await fs.readFile(`${E}/api-108-instance.json`, 'utf8')).result;
assert(instance.ownsDataRoot, 'Only an owned isolated data root may be driven');
const [mode, kind] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const projectsFile = path.join(instance.dataRoot, 'server-data/projects/projects.json');

async function gql(query, variables = {}) {
  const r = await fetch(instance.graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(90_000) });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert(!j.errors, JSON.stringify(j.errors));
  return j.data;
}
async function waitFor(check, label, ms = 240_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) { if (await check()) return; await sleep(500); }
  throw new Error('TIMEOUT ' + label);
}
const readState = async () => JSON.parse(await fs.readFile(projectsFile, 'utf8'));
const lifetimesOf = (state, taskId) => state.flatMap(p => p.taskLifetimes ?? []).filter(l => l.taskId === taskId);
const fileFingerprint = async () => {
  const st = await fs.stat(projectsFile);
  const sha = createHash('sha256').update(await fs.readFile(projectsFile)).digest('hex');
  return { ino: st.ino, mtimeMs: st.mtimeMs, size: st.size, sha };
};

const MODEL = { runtimeKind: 'autobyteus', llmModelIdentifier: 'deepseek-v4-flash', llmConfig: { thinking_type: 'disabled' } };
const GUARD = 'Never inspect credentials, HOME or unrelated paths; do not modify files, create copies, or change any Task status. ';

if (mode === 'setup') {
  const out = { instanceId: instance.instanceId, at: new Date().toISOString() };
  const fields = 'ownerProvider{id name} llmModels{modelIdentifier name canonicalName}';
  const catalog = (await gql(`query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){${fields}}}`, { r: MODEL.runtimeKind })).providerModelCatalogSnapshots;
  const matches = catalog.flatMap(p => p.llmModels).filter(m => m.modelIdentifier === MODEL.llmModelIdentifier);
  out.modelOffered = matches;
  assert.equal(matches.length, 1, 'Exact authorized model must be offered exactly once');
  const make = async (name, instructions) => (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id name}}',
    { i: { name, description: 'API018 owned validation definition', instructions, toolNames: ['read_file', 'send_message_to'], skillNames: [], defaultLaunchConfig: MODEL } })).createAgentDefinition;
  out.packetAgent = await make('API018 Packet Agent', GUARD + 'Read the supplied saved Task attachment with read_file, report the exact marker to the requester with send_message_to, then give a short final answer. For later requests, do exactly what is asked and include any requested nonce in your final answer.');
  out.coordinator = await make('API018 Team Coordinator', GUARD + 'Read the supplied saved Task attachment yourself with read_file. Then send one message with the attachment path to your Team member at address /api018_packet_team/reader using send_message_to, asking it to read the file and report the marker. Report your own marker to the requester, then give a short final answer. For later requests, do exactly what is asked and include any requested nonce in your final answer.');
  out.reader = await make('API018 Team Reader', GUARD + 'Read only the file you are given with read_file and report the marker with send_message_to to whoever asked, then give a short final answer. Include any requested nonce in your final answer.');
  out.team = (await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id name}}', { i: {
    name: 'API018 Packet Team', description: 'Two-member saved-context reader Team', instructions: 'Read only supplied saved context; do not create copies or change status.',
    nodes: [{ memberName: 'coordinator', ref: out.coordinator.id, refScope: 'SHARED' }, { memberName: 'reader', ref: out.reader.id, refScope: 'SHARED' }],
    coordinatorMemberName: 'coordinator', defaultLaunchConfig: MODEL } })).createAgentTeamDefinition;
  const defs = (await gql('{agentDefinitions{id name}}')).agentDefinitions;
  out.manager = defs.find(d => d.name === 'Project Task Manager');
  assert(out.manager, 'Shipped Project Task Manager must be present');
  await fs.writeFile(`${E}/api-018-setup.json`, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out));
  process.exit(0);
}

assert(['run', 'resume'].includes(mode) && ['agent', 'agent_team', 'agent_org'].includes(kind), 'usage');
const setup = JSON.parse(await fs.readFile(`${E}/api-018-setup.json`, 'utf8'));
assert.equal(setup.instanceId, instance.instanceId);
const resultFile = `${E}/api-018-${kind}.json`;
const prior = mode === 'resume' ? JSON.parse(await fs.readFile(resultFile, 'utf8')) : null;
const out = prior ?? { instanceId: instance.instanceId, kind, started: new Date().toISOString(), steps: [] };
out.frames = []; // frames are per phase; the run phase's frames are archived separately
const save = async () => {
  await fs.writeFile(resultFile, JSON.stringify({ ...out, frames: undefined }, null, 2) + '\n');
  await fs.writeFile(`${E}/api-018-${kind}-${mode}-frames.json`, JSON.stringify(out.frames, null, 2) + '\n');
};
const step = async (name, data = {}) => { out.steps.push({ phase: mode, name, at: new Date().toISOString(), ...data }); await save(); console.log('STEP', kind, mode, name); };

const memoryDir = () => path.join(instance.dataRoot, 'server-data/memory',
  kind === 'agent' ? 'agents' : kind === 'agent_team' ? 'agent_teams' : 'agent_orgs', out.rootId);
const treeFile = () => path.join(memoryDir(), kind === 'agent' ? 'collaboration/collaboration_tree.json'
  : kind === 'agent_team' ? 'team_run_execution_tree.json' : 'agent_org_run_execution_tree.json');
const readTree = async () => JSON.parse(await fs.readFile(treeFile(), 'utf8'));
const agentIds = tree => {
  const ids = new Set();
  const walk = v => {
    if (!v || typeof v !== 'object') return;
    const id = v.agentRunId ?? v.agent_run_id;
    if (typeof id === 'string') ids.add(id);
    for (const [k, a] of Object.entries(v)) if (!['source', 'launchConfiguration', 'launch_configuration'].includes(k)) {
      if (Array.isArray(a)) a.forEach(walk); else if (a && typeof a === 'object') walk(a);
    }
  };
  walk(tree);
  return [...ids].sort();
};
async function traceFiles(dir) {
  const found = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await traceFiles(p));
    else if (entry.name === 'raw_traces_active.jsonl') found.push(p);
  }
  return found;
}
const trace = async id => {
  const f = (await traceFiles(memoryDir())).find(p => path.basename(path.dirname(p)) === id);
  return f ? (await fs.readFile(f, 'utf8')).split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
};
const assistantSaid = async (id, nonce) => (await trace(id)).some(x => x.trace_type === 'assistant' && String(x.content).includes(nonce));
const toolResultContains = async (id, text) => (await trace(id)).some(x => x.trace_type === 'tool_result' && JSON.stringify(x.tool_result ?? x).includes(text));
const receivedContains = async (id, text) => (await trace(id)).some(x => x.trace_type === 'user' && String(x.content).includes(text));

let ws;
async function connect() {
  const route = kind === 'agent' ? '/ws/agent-collaboration/' : kind === 'agent_team' ? '/ws/agent-team/' : '/ws/agent-org/';
  ws = new WebSocket(instance.backendUrl.replace('http:', 'ws:') + route + encodeURIComponent(out.rootId));
  ws.addEventListener('message', e => { try { out.frames.push({ at: new Date().toISOString(), ...JSON.parse(String(e.data)) }); } catch { /* non-JSON */ } });
  await waitFor(() => ws.readyState === 1, 'WS open', 30_000);
  const snapshot = kind === 'agent_team' ? 'TEAM_EXECUTION_VIEW_SNAPSHOT' : 'ROOT_EXECUTION_VIEW_SNAPSHOT';
  await waitFor(() => out.frames.some(f => f.type === snapshot), 'root snapshot', 30_000);
}
function send(targetAgentRunId, content) {
  const id = randomUUID();
  const payload = kind === 'agent_team'
    ? { agent_run_id: targetAgentRunId, content, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: id }
    : { root_subject_kind: kind, root_run_id: out.rootId, target_agent_run_id: targetAgentRunId, command_id: id, content, context_file_paths: [], image_urls: [], message_id: id, dedupe_key: id };
  ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload }));
  return id;
}
async function ask(targetAgentRunId, request, label) {
  const nonce = `API018_${kind.toUpperCase()}_${randomUUID()}`;
  send(targetAgentRunId, `${request} Include ${nonce} in your final answer.`);
  await waitFor(() => assistantSaid(targetAgentRunId, nonce), label);
  return nonce;
}
// Input to a Task-owned agent whose lifetime is closed must be rejected and must not reach the agent.
async function expectRejected(targetAgentRunId, label) {
  const nonce = `API018_${kind.toUpperCase()}_CLOSED_${randomUUID()}`;
  const from = out.frames.length;
  const commandId = send(targetAgentRunId, `Read your saved Task attachment again and reply with ${nonce}.`);
  const matches = f => kind === 'agent_team'
    ? f.type === 'ERROR' && JSON.stringify(f.payload).includes(targetAgentRunId)
    : f.type === 'AGENT_COMMAND_ACK' && f.payload?.command_id === commandId;
  await waitFor(() => out.frames.slice(from).some(matches), label + ' receipt', 30_000);
  const receipt = out.frames.slice(from).find(matches);
  if (kind !== 'agent_team') assert.notEqual(receipt.payload.state, 'accepted', JSON.stringify(receipt));
  assert(/lifetime|closed|completed|done/i.test(JSON.stringify(receipt.payload)), JSON.stringify(receipt));
  await sleep(3000);
  assert(!await receivedContains(targetAgentRunId, nonce), 'Rejected input must not reach the closed agent');
  return receipt;
}

try {
  if (mode === 'run') {
    out.workspace = path.join(instance.dataRoot, 'validation-workspace', kind);
    await fs.mkdir(out.workspace, { recursive: true });
    await fs.writeFile(path.join(out.workspace, 'protected-sentinel.txt'), `API018_PROTECT_${kind}\n`);
    const launch = { ...MODEL, autoExecuteTools: true };
    if (kind === 'agent') {
      const r = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}',
        { i: { agentDefinitionId: setup.manager.id, workspaceRootPath: out.workspace, ...launch } })).createAgentRun;
      assert(r.success, r.message); out.rootId = r.runId; out.managerRunId = r.runId;
    } else if (kind === 'agent_team') {
      out.definition = (await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: {
        name: 'API018 Root Team ' + randomUUID().slice(0, 8), description: 'Owned Team root', instructions: 'Manager does Task business work; borrowed member is independent.',
        nodes: [{ memberName: 'manager', ref: setup.manager.id, refScope: 'SHARED' }, { memberName: 'borrowed', ref: setup.packetAgent.id, refScope: 'SHARED' }],
        coordinatorMemberName: 'manager', defaultLaunchConfig: MODEL } })).createAgentTeamDefinition;
      const r = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: {
        teamDefinitionId: out.definition.id, teamConfigs: [{ ...launch, teamAddress: '/', workspaceRootPath: out.workspace }],
        memberConfigs: [{ ...launch, memberAddress: '/manager', agentDefinitionId: setup.manager.id, workspaceRootPath: out.workspace },
          { ...launch, memberAddress: '/borrowed', agentDefinitionId: setup.packetAgent.id, workspaceRootPath: out.workspace }] } })).createAgentTeamRun;
      assert(r.success, r.message); out.rootId = r.teamRunId;
    } else {
      out.definition = (await gql('mutation($i:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id}}', { i: {
        name: 'API018 Root Org ' + randomUUID().slice(0, 8), description: 'Owned Org root', instructions: 'Manager does Task business work; borrowed member is independent.',
        members: [{ memberName: 'manager', ref: setup.manager.id, refType: 'AGENT', refScope: 'SHARED' }, { memberName: 'borrowed', ref: setup.packetAgent.id, refType: 'AGENT', refScope: 'SHARED' }],
        handoffs: [], defaultLaunchConfig: MODEL } })).createAgentOrgDefinition;
      const r = (await gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',
        { i: { agentOrgDefinitionId: out.definition.id, rootConfiguration: { ...launch, workspaceRootPath: out.workspace } } })).createAgentOrgRun;
      assert(r.success, r.message); out.rootId = r.agentOrgRunId;
    }
    await connect();
    out.initialAgents = agentIds(await readTree());
    if (kind !== 'agent') {
      // Find manager and borrowed ids from the tree nodes that carry their definition ids.
      const tree = await readTree(); const nodes = [];
      const walk = v => { if (!v || typeof v !== 'object') return; if (v.agentRunId ?? v.agent_run_id) nodes.push(v); for (const a of Object.values(v)) if (Array.isArray(a)) a.forEach(walk); else if (a && typeof a === 'object') walk(a); };
      walk(tree);
      const byDef = id => nodes.find(n => JSON.stringify(n).includes(id));
      out.managerRunId = (byDef(setup.manager.id)?.agentRunId ?? byDef(setup.manager.id)?.agent_run_id);
      out.borrowedRunId = (byDef(setup.packetAgent.id)?.agentRunId ?? byDef(setup.packetAgent.id)?.agent_run_id);
      assert(out.managerRunId && out.borrowedRunId && out.managerRunId !== out.borrowedRunId, 'manager/borrowed ids');
    }
    await step('root created', { rootId: out.rootId, managerRunId: out.managerRunId, borrowedRunId: out.borrowedRunId });

    if (out.borrowedRunId) {
      out.borrowedFirstNonce = await ask(out.borrowedRunId, `Read ONLY ${path.join(out.workspace, 'protected-sentinel.txt')} with read_file and report its content. No messaging or delegation.`, 'borrowed first read');
      await step('borrowed member read its sentinel');
    }

    out.project = (await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId name}}', { i: { name: `API018 ${kind} ${randomUUID().slice(0, 8)}`, description: 'IR-012 changed-build lifetime recheck' } })).createProject;
    out.tasks = {};
    for (const k of ['A', 'B']) {
      const base = `${instance.backendUrl}/rest/projects/${out.project.projectId}`;
      let r = await fetch(base + '/task-context-drafts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      assert.equal(r.status, 200); const draft = await r.json();
      const marker = `API018_${kind.toUpperCase()}_${k}_${randomUUID()}`;
      const form = new FormData(); form.append('file', new Blob([marker + '\n'], { type: 'text/plain' }), `saved-${k}.txt`);
      r = await fetch(`${base}/task-context-drafts/${draft.draftId}/context-files`, { method: 'POST', body: form });
      assert.equal(r.status, 200); const file = await r.json();
      out.tasks[k] = (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId description status contextFiles{storedFilename}}}', { i: {
        projectId: out.project.projectId, contextDraft: { draftId: draft.draftId, storedFilenames: [file.storedFilename] },
        description: 'Read the supplied saved Task attachment with read_file and report the exact marker to the requester. Do not modify files, create copies, or change any Task status.' } })).createProjectTask;
      out.tasks[k].marker = marker;
    }
    await step('project and saved tasks created', { projectId: out.project.projectId, tasks: out.tasks });

    const agentAddress = kind === 'agent' ? 'the listed API018 Packet Agent address' : 'the /borrowed address';
    send(out.managerRunId, `This is an authorized isolated validation. In Project ${out.project.projectId}, list the saved Tasks. Use list_available_agents. Delegate saved Task A ${out.tasks.A.taskId} once to ${agentAddress}, and saved Task B ${out.tasks.B.taskId} once to the listed API018 Packet Team address, passing only recipient_address and task_id. After each accepted dispatch mark that Task IN_PROGRESS. Do not mark anything DONE until I say so. Do not touch other Projects or files.`);
    await waitFor(async () => (await readState()).find(p => p.projectId === out.project.projectId)?.tasks.every(t => t.status === 'IN_PROGRESS'), 'dispatch + IN_PROGRESS');
    let state = await readState();
    out.lifetimes = {};
    for (const k of ['A', 'B']) {
      const ls = lifetimesOf(state, out.tasks[k].taskId); assert.equal(ls.length, 1);
      const l = ls[0]; assert.equal(l.completedAt, null); assert.equal(l.executions.length, 1);
      assert.equal(l.executions[0].root.rootSubjectKind, kind); assert.equal(l.executions[0].root.rootRunId, out.rootId);
      out.lifetimes[k] = l;
    }
    out.aWorker = out.lifetimes.A.executions[0].ingressAgentRunId;
    out.bCoordinator = out.lifetimes.B.executions[0].ingressAgentRunId;
    assert(out.lifetimes.B.executions[0].execution.teamRunId, 'B is a Team copy');
    if (out.borrowedRunId) assert.notEqual(out.aWorker, out.borrowedRunId, 'delegation to /borrowed must make a fresh Task copy, not adopt the borrowed member');
    await waitFor(() => toolResultContains(out.aWorker, out.tasks.A.marker), 'A worker read its saved bytes');
    await waitFor(() => toolResultContains(out.bCoordinator, out.tasks.B.marker), 'B coordinator read its saved bytes');
    const treeNow = await readTree();
    out.bMembers = agentIds(treeNow).filter(id => !out.initialAgents.includes(id) && id !== out.aWorker);
    assert(out.bMembers.includes(out.bCoordinator) && out.bMembers.length === 2, 'B Team copy has coordinator + reader: ' + JSON.stringify(out.bMembers));
    out.bReader = out.bMembers.find(id => id !== out.bCoordinator);
    await waitFor(() => toolResultContains(out.bReader, out.tasks.B.marker), 'B reader read its saved bytes');
    await waitFor(async () => { state = await readState(); return ['A', 'B'].every(k => lifetimesOf(state, out.tasks[k].taskId)[0].executions[0].dispatch === 'delivered'); }, 'both links delivered', 60_000);
    await step('A/B dispatched, bytes read, links delivered', { aWorker: out.aWorker, bCoordinator: out.bCoordinator, bReader: out.bReader });
    await sleep(15_000); // let the dispatch turn and worker reports settle before the write window

    // Item 5: steady-state Task messaging must not rewrite projects.json once links are delivered.
    const before = await fileFingerprint();
    const events = []; const watcher = watch(path.dirname(projectsFile), (type, name) => events.push({ at: new Date().toISOString(), type, name }));
    out.writeWindow = { before };
    out.writeWindow.aNonce = await ask(out.aWorker, 'Read your saved Task attachment again with read_file and confirm the marker.', 'operator post to delivered A worker');
    // A reply cannot reach the coordinator while its own turn is running, so it must not wait in-turn
    // (attempt 1 retained: the coordinator slept in-turn and outlasted the oracle).
    const readerTurnsBefore = (await trace(out.bReader)).filter(x => x.trace_type === 'user').length;
    const coordinatorTurnsBefore = (await trace(out.bCoordinator)).filter(x => x.trace_type === 'user').length;
    out.writeWindow.bNonce = await ask(out.bCoordinator, 'Send one message with send_message_to to your Team member /api018_packet_team/reader asking it to read the same attachment again and reply to you with the marker. Do not wait or sleep: end your turn right after sending.', 'B coordinator messages reader');
    await waitFor(async () => (await trace(out.bReader)).filter(x => x.trace_type === 'user').length > readerTurnsBefore, 'reader received the Task-team message', 60_000);
    await waitFor(async () => (await trace(out.bCoordinator)).filter(x => x.trace_type === 'user' && String(x.content).includes('/api018_packet_team/reader')).length > 0
      && (await trace(out.bCoordinator)).filter(x => x.trace_type === 'user').length > coordinatorTurnsBefore + 1, 'reader reply delivered back to the coordinator', 120_000);
    await sleep(10_000);
    watcher.close();
    out.writeWindow.after = await fileFingerprint();
    out.writeWindow.projectsDirEvents = events.filter(e => String(e.name).startsWith('projects'));
    assert.deepEqual(out.writeWindow.after, before, 'projects.json must not change during steady-state Task messaging');
    assert.equal(out.writeWindow.projectsDirEvents.length, 0, 'no projects.json write events');
    await step('write window: operator post + Task-team messaging made 0 projects.json writes', out.writeWindow);

    // Item 1: explicit DONE B, then synchronous fence on its owned agents; A and borrowed unaffected.
    out.doneNonce = await ask(out.managerRunId, `I explicitly instruct you to mark saved Task B ${out.tasks.B.taskId} DONE now, then list the Project Tasks. Do not change Task A, do not delegate, stop or delete anything.`, 'Manager DONE B turn');
    await waitFor(async () => { state = await readState(); const b = lifetimesOf(state, out.tasks.B.taskId)[0]; return b.completedAt && b.executions.every(x => x.cleanup === 'released'); }, 'B closed and released', 120_000);
    out.closedB = lifetimesOf(state, out.tasks.B.taskId)[0];
    out.openA = lifetimesOf(state, out.tasks.A.taskId)[0];
    assert.equal(out.openA.completedAt, null); assert.equal(out.openA.executions[0].cleanup, 'not_requested');
    out.closedTree = await readTree();
    await step('DONE B closed lifetime and released its links', { closedB: out.closedB, openA: out.openA });
    out.fenceReceipts = { coordinator: await expectRejected(out.bCoordinator, 'closed B coordinator'), reader: await expectRejected(out.bReader, 'closed B reader') };
    await step('fence: input to closed B coordinator and reader rejected', { receipts: out.fenceReceipts });

    // Item 2: repeated DONE starts nothing and leaves already-released links unchanged.
    out.repeatNonce = await ask(out.managerRunId, `Mark saved Task B ${out.tasks.B.taskId} DONE once more with create_or_update_task, then list the Project Tasks. Do not delegate or change anything else.`, 'Manager repeat DONE B turn');
    await sleep(5000);
    state = await readState();
    assert.deepEqual(lifetimesOf(state, out.tasks.B.taskId), [out.closedB], 'repeat DONE leaves the closed lifetime and its links unchanged');
    assert.deepEqual(agentIds(await readTree()), agentIds(out.closedTree), 'repeat DONE starts no new agents');
    await step('repeat DONE: no new agents, closed lifetime byte-equal');

    // Item 4 (product side): the borrowed member was not adopted, not stopped, and still answers.
    if (out.borrowedRunId) {
      out.borrowedAfterNonce = await ask(out.borrowedRunId, 'Reply with a one-line confirmation that you are still available. No tool calls needed.', 'borrowed still usable after DONE');
      await step('borrowed member still usable after DONE B');
    }
    out.aAfterDoneNonce = await ask(out.aWorker, 'Confirm in one line that you are still working on Task A. No tool calls needed.', 'open A still usable after DONE B');
    await step('open A still usable after DONE B');
    out.preRestartState = await readState(); out.preRestartTree = await readTree();
    out.result = 'run phase passed';
    await step('run phase complete; A kept open for restart phase');
  } else {
    // Item 3: after a whole-app restart, the process gate starts empty. Closed B must be rejected by the
    // durable read in admit; open A must wake through the same admit and answer.
    const restore = kind === 'agent'
      ? (await gql('mutation($id:String!){restoreAgentRun(agentRunId:$id){success message runId}}', { id: out.rootId })).restoreAgentRun
      : kind === 'agent_team'
        ? (await gql('mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message teamRunId}}', { id: out.rootId })).restoreAgentTeamRun
        : (await gql('mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success message agentOrgRunId}}', { id: out.rootId })).restoreAgentOrgRun;
    out.restore = restore; assert(restore.success, restore.message);
    await connect();
    await step('root restored after whole-app restart', { restore });
    out.resumeFenceReceipts = { coordinator: await expectRejected(out.bCoordinator, 'closed B after restart') };
    await step('restart-closed: input to closed B rejected after restart', { receipts: out.resumeFenceReceipts });
    out.aResumeNonce = await ask(out.aWorker, 'Read your saved Task attachment again with read_file and confirm the marker.', 'open A resumes after restart');
    assert(await toolResultContains(out.aWorker, out.tasks.A.marker));
    const state = await readState();
    assert.deepEqual(lifetimesOf(state, out.tasks.B.taskId), [out.closedB], 'closed B unchanged across restart');
    assert.deepEqual(lifetimesOf(state, out.tasks.A.taskId).map(l => ({ ...l, executions: l.executions.map(e => ({ ...e })) })), [out.openA].map(l => ({ ...l, executions: l.executions.map(e => ({ ...e })) })), 'open A lifetime/link unchanged');
    await step('open A resumed with the same worker; lifetimes unchanged');
    out.resumeResult = 'resume phase passed';
    await step('resume phase complete');
  }
} catch (error) {
  out.error = String(error); out.stack = error?.stack;
  try { out.failureState = await readState(); } catch { /* ignore */ }
  console.error(out.error); process.exitCode = 1;
} finally {
  await save(); ws?.close();
}

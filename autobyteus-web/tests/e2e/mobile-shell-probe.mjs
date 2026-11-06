#!/usr/bin/env node
// Browser + server probe for the phone shell (autobyteus-277, mobile-experience-redesign): the paired phone's `/mobile`
// against test-owned servers built from this worktree, with real delegated, Team, Org, remote and approval runs.
//
// Stack (all probe-owned, removed in `finally`):
// - alpha (the paired node) and beta (its peer), `autobyteus-server-ts/dist/app.js` on 127.0.0.1, each with its own temp
//   data root and HOME. Agents run on the scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`: `CALL_TOOL:{…}` makes
//   the agent call the real tool; `GENERATE_IMAGE:<path>` writes a file) and, for one approval, on Grok Build through the
//   recorded ACP replay (`tests/fixtures/grok-acp/permission.jsonl`: a real `run_bash` approval request). No model, no keys.
// - The phone loads the production phone bundle that alpha serves at `/mobile` (`pnpm -C autobyteus-web build:mobile-web`),
//   so page, API and streams share the node's origin as on a real phone. It pairs through Phone Access with a private
//   network URL (`http://192.168.77.10:<alpha port>`; the node refuses loopback pairing URLs); the probe's browser routes
//   that host, HTTP and WebSocket, to alpha. A Phone Access credential is checked on every request whatever the address.
// - The desktop window for the comparison is `nuxt dev` against alpha.
//
// Data (public GraphQL/REST/WebSocket only): on beta, Publisher and the Team "Studio Team". On alpha, the agent "Project
// Task Manager" (PTM) with a Project and two Tasks: Task A to the agent "Release Notes Writer" (a task agent), Task B to the
// Team "Docs Review Team" whose coordinator delegates further (a member's delegated work); the PTM also delegates to beta's
// /publisher and /studio_team (remote runs). A Team run "Delivery Team" (its lead writes a file and messages its mate with a
// file reference), an Org run "Delivery Org", the Grok run "Approver", and plain "Fact Checker" runs (more than five
// top-level runs in all).
//
// Cases (phone at 390×844 unless named):
//   MSP-01 AC-001  The same runs and order as the desktop Runs view of the same node; newest 5, "Show older (N)", "Show
//                  fewer"; ages on top-level rows.
//   MSP-02 AC-002  The PTM run's tree: the task agent and the task team under it, the team folded with its members, the
//                  coordinator's own delegated work under it, the remote rows with their node chip; live states (a dot
//                  changes while the task agent works, with no reload).
//   MSP-03 AC-003  A tap on the task agent, a task-team member, the Team run (its coordinator) and the Org run (its first
//                  member): each opens that agent's conversation with its composer; a message sent from the phone reaches
//                  that run on the node; ← returns to the list at the same scroll with the row marked.
//   MSP-04 AC-003  A tool approval: a message from the phone to the Grok run raises an approval request; Approve on the
//                  phone; the node answers the runtime with allow-once and the tool runs.
//   MSP-05 AC-003  "Opening…" only while attaching: from the tap until the conversation, the run screen never shows another
//                  run and offers no button but ←; browser Back/Forward re-attach (an Org entry too); a reload of a run
//                  entry lands on the list; a tap on a second row during an open ends on the second run.
//   MSP-06 AC-004  The remote rows (chip, title, state); a remote run opens with its live conversation; a text message from
//                  the phone reaches it on beta and its answer shows; no attachments, `@` opens nothing; beta down: red dot
//                  and "Not reachable" on the rows, the notice with Retry when opened, other runs open; beta back: Retry.
//   MSP-07 AC-006  "+" with nothing opened: the Project Task Manager preselected; after an Org member was opened and ←: the
//                  row still marked and its agent preselected; every row's sheet; disabled with the reason; a bad folder
//                  path's error; Create run opens the new run's Chat; its first message keeps the screen while its id
//                  changes; the new run tops the list.
//   MSP-08 AC-007  On the Team's coordinator: ⋮ items in order; Artifacts (one file shown directly), Files (tree, path,
//                  search over the workspace, no filters, an opened file without Attach), Messages (a reference opens the
//                  file), Activity (its tool calls); a standalone agent: no Messages, empty states; a remote run: "on that
//                  node" wording.
//   MSP-09 AC-008  The connection sheet: the node's own name (the dialog's name), URL, state, Check connection, the peer
//                  with what it offers, and (beta down) not reachable; alpha down: the bar and the banner, Check; alpha
//                  back: Check clears them (and the poll's behavior meanwhile, review residual C-06); unpair → the
//                  confirmation → the pairing screen.
//   MSP-10 AC-009  None of the "Not on the phone" items; `?unsupported=desktopWorkspace` shows the notice above the list.
//   MSP-11 AC-005  Every screen at 390×844 and 360×800: no horizontal scroll, every phone-owned control ≥ 44×44 (the shared
//                  composer and conversation are listed apart); Back walks file → Files → run → list and reference →
//                  Messages → run → list. Screenshots of each screen for the visual comparison.
//   MSP-12 DS-001  The network log: reads with the complete window (`null`); a poll every 5 s only on the list; none on the
//                  run screen or a view; none while the page is hidden; one read at once when shown again; bytes per read;
//                  the time from opening to the listed runs (QR-003 on this stack).
//   MSP-13 E-27    The device revoked on the node: the phone's next start lands on pairing after one history read.
//   MSP-14 AC-002  Task A DONE: the task agent's row leaves the list live.
//
// Prerequisites: `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web` (alpha serves
// `autobyteus-web/dist/public` at /mobile); Chrome. Run: `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh>`
// (`--cases=MSP-01,…`, `--browser-executable=<path>`). About 6 minutes.
// `--hold` sets the stack up, pairs nothing, prints the phone URLs and a pairing link for the Android emulator
// (`http://10.0.2.2:<alpha port>`) and, with `--bind=0.0.0.0`, for this machine's LAN address, and keeps the stack until
// Ctrl+C (device checks); it runs no case.
import { createWriteStream, existsSync, mkdtempSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serverDir = path.join(path.dirname(webDir), 'autobyteus-server-ts');
const appEntry = path.join(serverDir, 'dist', 'app.js');
const mobileBundle = path.join(webDir, 'dist', 'public', 'index.html');
const agyCli = path.join(serverDir, 'tests', 'fixtures', 'agy-failure-cli.mjs');
const grokCli = path.join(serverDir, 'tests', 'fixtures', 'grok-acp', 'fake-grok-cli.mjs');
const grokPermission = path.join(serverDir, 'tests', 'fixtures', 'grok-acp', 'permission.jsonl');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  if (value) return value.slice(name.length + 3);
  return process.argv.includes(`--${name}`) ? true : fallback;
};
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/mobile-shell'));
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const selected = typeof arg('cases') === 'string' ? new Set(arg('cases').split(',')) : null;
const hold = arg('hold', false) === true;
const bindHost = typeof arg('bind') === 'string' ? arg('bind') : '127.0.0.1';
const MODEL = 'gemini-3.8-flash-low';
const PEER = 'beta-node';
const PHONE_HOST = '192.168.77.10';
const redact = text => String(text).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…').replace(/pairing=[^&\s"']+/g, 'pairing=…');
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', node: process.version, servers: {}, runs: {}, cases: {}, browserErrors: [], network: {}, cleanup: {}, error: null };
const assert = (condition, message, details) => { if (!condition) throw Object.assign(new Error(message), { details }); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (description, fn, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await fn()) return; } catch (error) { lastError = error; }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
});
const exited = child => child.exitCode !== null || child.signalCode !== null;
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'mobile-shell-probe-')));
const children = new Set();
const saveEvidence = () => fs.writeFile(path.join(outputDir, 'mobile-shell-probe.json'), `${redact(JSON.stringify(evidence, null, 2))}\n`);

const serverAt = async (name, port, extraEnv = {}) => {
  const dataDir = path.join(root, name, 'data');
  const home = path.join(root, name, 'home');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(home, { recursive: true });
  const baseUrl = `http://127.0.0.1:${port}`;
  if (!existsSync(path.join(dataDir, '.env'))) await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\n`);
  const node = { name, port, baseUrl, dataDir, child: null, nodeId: '' };
  node.start = async () => {
    const log = createWriteStream(path.join(outputDir, `server-${name}.log`), { flags: 'a' });
    const child = spawn(process.execPath, [appEntry, '--host', bindHost, '--port', String(port), '--data-dir', dataDir], {
      cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN',
        AUTOBYTEUS_HTTP_ACCESS_LOG_MODE: name === 'alpha' ? 'all' : 'off', AUTOBYTEUS_SERVER_HOST: baseUrl,
        ANTIGRAVITY_CLI_COMMAND: agyCli, AGY_FAKE_CASE: 'linked_skills', ...extraEnv } });
    child.stdout.pipe(log); child.stderr.pipe(log);
    child.once('close', () => log.end());
    children.add(child);
    node.child = child;
    await waitFor(`${name} health`, async () => {
      if (exited(child)) throw new Error(`${name} exited ${child.exitCode}`);
      return fetch(`${baseUrl}/rest/health`).then(response => response.ok).catch(() => false);
    }, 120_000);
    const status = await (await fetch(`${baseUrl}/rest/remote-access/status`)).json();
    node.nodeId = status.nodeId;
    node.serverName = status.serverName;
    evidence.servers[name] = { port, nodeId: node.nodeId, serverName: status.serverName };
  };
  node.stop = async () => {
    const child = node.child;
    if (!child || exited(child)) return;
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(15_000)]);
    if (!exited(child)) child.kill('SIGKILL');
    children.delete(child);
  };
  node.gql = async (query, variables) => {
    const body = await (await fetch(`${baseUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json();
    if (body.errors?.length) throw new Error(`${name}: ${JSON.stringify(body.errors)}`);
    return body.data;
  };
  node.rest = async (method, route, body) => {
    const response = await fetch(`${baseUrl}/rest${route}`, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const text = await response.text();
    let parsed = null; try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { status: response.status, body: parsed };
  };
  await node.start();
  return node;
};

/** Every node of a stored execution tree with an address or a run id (camelCase or snake_case trees). */
const treeNodes = (tree) => {
  const found = [];
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    const agentRunId = value.agentRunId ?? value.agent_run_id;
    const teamRunId = value.teamRunId ?? value.team_run_id;
    if (agentRunId || teamRunId) found.push({ address: value.address ?? null, agentRunId: agentRunId ?? null, teamRunId: teamRunId ?? null });
    Object.values(value).forEach(visit);
  };
  visit(tree);
  return found;
};
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const calledResults = text => text.split('CALLED:').slice(1);
const pickId = (text, key) => new RegExp(`${key}\\\\*"\\s*:\\s*\\\\*"([^"\\\\]+)`).exec(text ?? '')?.[1];
/** One WebSocket message to a run's input, as a second client (another window) sends it. */
const sendOver = async (url, payload) => {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  await sleep(400);
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload }));
  await sleep(800);
  socket.close();
};

let frontend, browser, alpha, beta;
const stack = {};
await fs.mkdir(outputDir, { recursive: true });

/** Builds the stack's data through the public APIs; returns the ids the cases use. */
const setUp = async () => {
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
  const def = async (node, name, options = {}) => (await node.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
    { i: { name, role: 'assistant', description: `${name} (phone probe)`, instructions: 'Follow the request.', toolNames: options.tools ?? [],
      ...(options.launch ? { defaultLaunchConfig: options.launch } : {}) } })).createAgentDefinition.id;
  const team = async (node, name, coordinatorMemberName, nodes, launch) => (await node.gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}',
    { i: { name, description: `${name} (phone probe)`, instructions: 'Work together.', coordinatorMemberName, nodes, ...(launch ? { defaultLaunchConfig: launch } : {}) } })).createAgentTeamDefinition.id;

  for (const node of [alpha, beta]) await node.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
  await alpha.gql('mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { nodeId: beta.nodeId, baseUrl: beta.baseUrl, name: PEER } });
  await beta.gql('mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { nodeId: alpha.nodeId, baseUrl: alpha.baseUrl, name: 'alpha-node' } });

  // Beta: what the PTM delegates to on another node.
  const publisher = await def(beta, 'Publisher', { launch: agy });
  const checker = await def(beta, 'Checker');
  await team(beta, 'Studio Team', 'lead', [{ memberName: 'lead', ref: publisher, refScope: 'SHARED' }, { memberName: 'checker', ref: checker, refScope: 'SHARED' }], agy);

  // Alpha.
  const ids = {};
  ids.ptm = await def(alpha, 'Project Task Manager', { tools: ['list_projects', 'list_project_tasks', 'create_task', 'update_task'], launch: agy });
  ids.writer = await def(alpha, 'Release Notes Writer', { launch: agy });
  ids.checker = await def(alpha, 'Fact Checker');
  ids.helper = await def(alpha, 'Changelog Helper', { launch: agy });
  ids.approver = await def(alpha, 'Approver', { launch: { runtimeKind: 'grok_build', llmModelIdentifier: 'grok-4.7', llmConfig: { reasoning_effort: 'low' } } });
  ids.squad = await team(alpha, 'Docs Review Team', 'reviewer', [{ memberName: 'reviewer', ref: ids.writer, refScope: 'SHARED' }, { memberName: 'editor', ref: ids.checker, refScope: 'SHARED' }]);
  ids.delivery = await team(alpha, 'Delivery Team', 'lead', [{ memberName: 'lead', ref: ids.checker, refScope: 'SHARED' }, { memberName: 'mate', ref: ids.writer, refScope: 'SHARED' }]);
  ids.org = (await alpha.gql('mutation($i:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id}}', { i: { name: 'Delivery Org', description: 'Org (phone probe)',
    instructions: 'Deliver.', handoffs: [], members: [{ memberName: 'planner', ref: ids.writer, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'squad', ref: ids.squad, refType: 'AGENT_TEAM', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;

  // The workspace the runs work in, with files for the Files screen.
  const workspace = path.join(root, 'alpha', 'workspace');
  await fs.mkdir(path.join(workspace, 'docs'), { recursive: true });
  await fs.mkdir(path.join(workspace, 'src'), { recursive: true });
  await fs.writeFile(path.join(workspace, 'README.md'), '# Launch\n\nThe launch workspace of the phone probe.\n');
  await fs.writeFile(path.join(workspace, 'docs', 'guide.md'), '# Guide\n\nGUIDE-TEXT-7731: how the launch goes.\n');
  await fs.writeFile(path.join(workspace, 'src', 'app.ts'), 'export const launch = () => "go";\n');
  await alpha.gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
  const runConfig = { workspaceRootPath: workspace, autoExecuteTools: true, ...agy };
  const wsUrl = route => `${alpha.baseUrl.replace('http', 'ws')}/ws/${route}`;

  const createAgentRun = async (agentDefinitionId, extra = {}) => {
    const r = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId, ...runConfig, ...extra } })).createAgentRun;
    assert(r.success, r.message);
    return r.runId;
  };
  const projection = async runId => JSON.stringify((await alpha.gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
  const agentSay = async (runId, content) => sendOver(wsUrl(`agent/${runId}`), { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`,
    context_file_paths: [], image_urls: [], agent_run_id: runId, content });
  const agentCall = async (runId, name, args) => {
    const before = calledResults(await projection(runId)).length;
    await agentSay(runId, callTool(name, args));
    let results = [];
    await waitFor(`${name} by ${runId}`, async () => (results = calledResults(await projection(runId))).length > before);
    return results[results.length - 1];
  };

  // Plain runs first (oldest activity): three Fact Checker runs.
  const plain = [];
  for (let index = 0; index < 3; index += 1) {
    const runId = await createAgentRun(ids.checker, agy);
    await agentSay(runId, `Plain run ${index + 1}. Marker PLAIN-${index + 1}.`);
    plain.push(runId);
    await sleep(600);
  }

  // The Org run and the Team run.
  const org = (await alpha.gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',
    { i: { agentOrgDefinitionId: ids.org, rootConfiguration: runConfig, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  assert(org.success, org.message);
  const orgTree = (await alpha.gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: org.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  const orgPlanner = orgTree.rootOrg.members.find(member => member.address === '/planner')?.agentRunId;
  await sendOver(wsUrl(`agent-org/${org.agentOrgRunId}`), { root_subject_kind: 'agent_org', root_run_id: org.agentOrgRunId, target_agent_run_id: orgPlanner,
    command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content: 'Plan the delivery. Marker ORG-PLANNER.', context_file_paths: [], image_urls: [] });
  await sleep(600);

  const delivery = (await alpha.gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: ids.delivery,
    teamConfigs: [{ teamAddress: '/', ...runConfig }], memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: ids.checker, ...runConfig },
      { memberAddress: '/mate', agentDefinitionId: ids.writer, ...runConfig }] } })).createAgentTeamRun;
  assert(delivery.success, delivery.message);
  const deliveryTree = JSON.stringify((await alpha.gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: delivery.teamRunId })).getTeamRunResumeConfig.executionTree);
  const deliveryLead = /"address":"\/lead"[^}]*"agent_run_id":"([^"]+)"/.exec(deliveryTree)?.[1];
  const deliveryMate = /"address":"\/mate"[^}]*"agent_run_id":"([^"]+)"/.exec(deliveryTree)?.[1];
  const leadProjection = async () => JSON.stringify((await alpha.gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}',
    { id: delivery.teamRunId, a: deliveryLead })).getTeamMemberRunProjection?.conversation ?? []);
  const leadSay = content => sendOver(wsUrl(`agent-team/${delivery.teamRunId}`), { message_id: randomUUID(), dedupe_key: `team_member_input:probe:${randomUUID()}`,
    context_file_paths: [], image_urls: [], agent_run_id: deliveryLead, content });
  const notesPath = path.join(workspace, 'notes.md');
  await leadSay(`GENERATE_IMAGE:${notesPath} \nProduce the file.`);
  await waitFor('the lead wrote notes.md', async () => existsSync(notesPath), 60_000);
  await fs.writeFile(notesPath, '# Notes\n\nNOTES-TEXT-4242 from the Delivery Team lead.\n');
  const leadCall = async (name, args) => {
    const before = calledResults(await leadProjection()).length;
    await leadSay(callTool(name, args));
    let results = [];
    await waitFor(`the lead's ${name}`, async () => (results = calledResults(await leadProjection())).length > before);
    return results[results.length - 1];
  };
  await leadCall('send_message_to', { recipient_address: '/mate', content: 'Read the guide first. Marker TEAM-NOTE.', reference_files: [path.join(workspace, 'docs', 'guide.md')] });
  // A member's own delegated work (under the member in the Team's tree).
  const leadResult = await leadCall('delegate_task', { recipient_address: '/changelog_helper', description: 'Draft the changelog. Marker LEAD-DELEGATED.' });
  const leadDelegated = pickId(leadResult, 'target_agent_run_id');
  assert(leadDelegated, 'the lead delegated', leadResult);
  await sleep(600);

  // The Grok run (approvals are asked: autoExecuteTools false); its message comes from the phone (MSP-04).
  const approver = await createAgentRun(ids.approver, { runtimeKind: 'grok_build', llmModelIdentifier: 'grok-4.7', llmConfig: { reasoning_effort: 'low' }, autoExecuteTools: false });
  await sleep(600);

  // The PTM run with its Tasks and remote work (newest activity).
  const project = (await alpha.gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: `Launch ${randomUUID().slice(0, 6)}` } })).createProject.projectId;
  const task = async (title, description) => (await alpha.gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId taskKey}}',
    { input: { projectId: project, title, description } })).createProjectTask;
  const taskA = await task('Write the release notes.', 'Write the release notes. Marker TASK-A.');
  const taskB = await task('Review the docs site.', callTool('delegate_task', { recipient_address: '/fact_checker', description: 'Check the facts of the docs. Marker MEMBER-DELEGATED.' }));
  const ptm = await createAgentRun(ids.ptm);
  const writerResult = await agentCall(ptm, 'delegate_task', { recipient_address: '/release_notes_writer', task_id: taskA.taskId });
  const writerRun = pickId(writerResult, 'target_agent_run_id');
  const squadResult = await agentCall(ptm, 'delegate_task', { recipient_address: '/docs_review_team', task_id: taskB.taskId });
  const squadRun = pickId(squadResult, 'target_team_run_id');
  const remoteAgentTitle = 'Publish the draft. Marker REMOTE-AGENT.';
  const remoteAgentRun = pickId(await agentCall(ptm, 'delegate_task', { node: PEER, recipient_address: '/publisher', description: remoteAgentTitle }), 'target_agent_run_id');
  const remoteTeamTitle = 'Cut the launch trailer. Marker REMOTE-TEAM.';
  const remoteTeamRun = pickId(await agentCall(ptm, 'delegate_task', { node: PEER, recipient_address: '/studio_team', description: remoteTeamTitle }), 'target_team_run_id');
  assert(writerRun && squadRun && remoteAgentRun && remoteTeamRun, 'the PTM delegations', { writerResult, squadResult });
  const spareRun = pickId(await agentCall(ptm, 'delegate_task', { recipient_address: '/changelog_helper', description: 'Spare work. Marker SPARE.' }), 'target_agent_run_id');
  // The task team's members and the coordinator's own delegated work (from Task B's text), in the PTM's stored tree.
  let reviewer = null;
  let memberDelegated = null;
  await waitFor('the reviewer\'s delegation', async () => {
    const nodes = treeNodes((await alpha.gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: ptm })).agentRunCollaboration);
    reviewer = nodes.find(node => node.address === '/reviewer' && node.agentRunId)?.agentRunId ?? null;
    memberDelegated = nodes.find(node => node.address === '/fact_checker' && node.agentRunId)?.agentRunId ?? null;
    stack.ptmTreeNodes = nodes;
    return Boolean(reviewer && memberDelegated);
  }, 60_000).catch(() => undefined);

  Object.assign(stack, { ids, workspace, runConfig, project, taskA, taskB, ptm, writerRun, squadRun, reviewer, memberDelegated, remoteAgentRun, remoteTeamRun,
    spareRun, remoteAgentTitle, remoteTeamTitle, plain, org: org.agentOrgRunId, orgPlanner, delivery: delivery.teamRunId, deliveryLead, deliveryMate, leadDelegated, approver,
    notesPath, projection, agentSay, agentCall, leadProjection, wsUrl });
  evidence.runs = { ptm, writerRun, squadRun, reviewer, memberDelegated, remoteAgentRun, remoteTeamRun, plain, org: org.agentOrgRunId, orgPlanner,
    delivery: delivery.teamRunId, deliveryLead, deliveryMate, leadDelegated, approver, taskA: taskA.taskKey, taskB: taskB.taskKey };
};

/** A pairing link for a phone that reaches alpha at `serverBaseUrl`. */
const pairingFor = async (serverBaseUrl) => {
  const settings = await alpha.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
  assert(settings.status === 200, 'Phone Access on', settings);
  const session = await alpha.rest('POST', '/remote-access/pairing-sessions', { serverBaseUrl, trustedPrivateHttpAcknowledged: true });
  assert(session.status === 201 && session.body.mobileUrl, 'pairing session', session.status);
  return session.body.mobileUrl;
};

// ---- The phone ----------------------------------------------------------------------------------------------------
const phoneOrigin = () => `http://${PHONE_HOST}:${alpha.port}`;
/** Every GraphQL operation a phone sent: when, which context, the history window, the status and the bytes. */
const phoneNet = [];
/** Known browser lines that are not this change (each with its cause; see the execution report). */
const KNOWN_BROWSER_LINES = [
  // Pre-existing (follow-up FU-002): app.vue keeps the definitions feed open app-wide; in the phone bundle the window
  // node's endpoints default to localhost:8000, so the feed's WebSocket is refused on a phone.
  /ws:\/\/localhost:8000\/ws\/agent-package-definitions|Failed to load resource: net::ERR_CONNECTION_REFUSED/,
];
const recordBrowserError = (label, text) => {
  const line = redact(`${label}: ${text}`);
  // MSP-13 refuses the phone's credential on purpose (401 unknown, 403 revoked): those reads fail by design.
  const expected = currentCase === 'MSP-13' && /status of 40[13]|Response not successful: Received status code 40[13]/.test(line);
  evidence.browserErrors.push({ case: currentCase, line, known: expected || KNOWN_BROWSER_LINES.some(pattern => pattern.test(line)) });
};
let currentCase = 'setup';
/** A phone browser: 390×844 by default; alpha is reached through the private-network origin, HTTP and WebSocket. */
const openPhone = async ({ width = 390, height = 844, storageState, label = 'phone' } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC',
    ...(storageState ? { storageState } : {}) });
  await context.route(`${phoneOrigin()}/**`, async (route) => {
    const request = route.request();
    let op = null; let windowVar;
    if (request.url().includes('/graphql') && request.method() === 'POST') {
      try { const body = JSON.parse(request.postData() ?? '{}'); op = body.operationName ?? 'anonymous'; windowVar = body.variables?.limitPerAgent; } catch { op = 'unparsed'; }
    }
    let response;
    try { response = await route.fetch({ url: request.url().replace(phoneOrigin(), alpha.baseUrl), timeout: 20_000 }); } catch { await route.abort('connectionrefused').catch(() => undefined); return; }
    if (op) phoneNet.push({ at: Date.now(), label, case: currentCase, op, window: windowVar === undefined ? 'omitted' : windowVar, status: response.status(), bytes: (await response.body().catch(() => Buffer.alloc(0))).length });
    await route.fulfill({ response }).catch(() => undefined);
  });
  const wsOrigin = phoneOrigin().replace(/^http/, 'ws');
  await context.routeWebSocket(url => url.href.startsWith(wsOrigin), (ws) => {
    const upstream = new WebSocket(ws.url().replace(wsOrigin, alpha.baseUrl.replace(/^http/, 'ws')));
    const queued = [];
    upstream.addEventListener('open', () => { for (const message of queued.splice(0)) upstream.send(message); });
    upstream.addEventListener('message', event => { try { ws.send(typeof event.data === 'string' ? event.data : String(event.data)); } catch { /* closed */ } });
    upstream.addEventListener('close', () => { try { ws.close(); } catch { /* closed */ } });
    upstream.addEventListener('error', () => { try { ws.close(); } catch { /* closed */ } });
    ws.onMessage(message => { if (upstream.readyState === 1) upstream.send(message); else queued.push(message); });
    ws.onClose(() => upstream.close());
  });
  const page = await context.newPage();
  page.on('pageerror', error => recordBrowserError(`${label} pageerror`, error.message));
  page.on('console', message => { if (message.type() === 'error') recordBrowserError(`${label} console`, message.text()); });
  return { context, page };
};
const sel = id => `[data-testid="${id}"]`;
const rowSel = key => `[data-testid="mobile-run-row-${key}"]`;
const rowsOf = page => page.evaluate(() => [...document.querySelectorAll('[data-test="mobile-run-row"]')].map(li => ({
  key: li.getAttribute('data-testid').replace('mobile-run-row-', ''), depth: Number(li.getAttribute('data-depth')), expanded: li.getAttribute('aria-expanded'),
  current: li.getAttribute('aria-current'), status: li.querySelector('[data-testid="mobile-run-status-dot"]')?.getAttribute('data-status') ?? null,
  name: li.querySelector('[data-testid="mobile-run-name"]')?.textContent?.trim() ?? '', title: li.querySelector('[data-testid="mobile-run-title"]')?.textContent?.trim() ?? null,
  chip: li.querySelector('[data-testid="mobile-run-remote-line"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
  unreachable: Boolean(li.querySelector('[data-testid="mobile-run-unreachable"]')), age: li.querySelector('[data-testid="mobile-run-age"]')?.textContent?.trim() ?? null,
  buttons: [...li.querySelectorAll('button')].map(b => b.getAttribute('data-testid') || b.getAttribute('aria-label') || b.textContent.trim()),
  label: li.querySelector('[data-testid="mobile-run-open"]')?.getAttribute('aria-label') ?? null })));
const topIds = rows => rows.filter(row => row.depth === 0).map(row => row.key.split(':').slice(1).join(':'));
/** The row right after `parentKey` (in list order) with this depth and name, within the parent's subtree. */
const childRow = (rows, parentKey, name, depth) => {
  const start = rows.findIndex(row => row.key === parentKey);
  if (start < 0) return null;
  for (let index = start + 1; index < rows.length && rows[index].depth > rows[start].depth; index += 1) {
    if (rows[index].depth === depth && rows[index].name.toLowerCase() === name.toLowerCase()) return rows[index];
  }
  return null;
};
const pairPhone = async (page) => {
  const link = await pairingFor(phoneOrigin());
  await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator(sel('mobile-pair-button')).click({ timeout: 60_000 });
  await page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
};
const toList = async (page) => {
  for (let step = 0; step < 6 && !(await page.locator(`${sel('mobile-run-list')}:visible`).count()); step += 1) {
    const back = page.locator(`${sel('mobile-screen-back')}:visible, ${sel('mobile-run-back')}:visible, ${sel('mobile-new-run-close')}:visible`).first();
    if (await back.count()) await back.click(); else await page.goBack();
    await sleep(400);
  }
  await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 20_000 });
};
const runScreen = page => page.evaluate(() => {
  const screen = document.querySelector('[data-testid="mobile-run-screen"]');
  return screen ? { state: screen.getAttribute('data-state'), name: screen.querySelector('[data-testid="mobile-run-name"]')?.textContent?.trim() ?? null,
    subtitle: screen.querySelector('[data-testid="mobile-run-subtitle"]')?.textContent?.trim() ?? null,
    chip: screen.querySelector('[data-test="remote-node-chip"]')?.textContent?.trim() ?? null,
    conversation: screen.querySelector('[data-testid="mobile-run-conversation"]')?.innerText ?? null, query: location.search } : { state: null, query: location.search };
});
const openRow = async (page, key) => {
  await page.locator(`${rowSel(key)} ${sel('mobile-run-open')}`).click();
  await waitFor(`the run screen of ${key}`, async () => (await runScreen(page)).state === 'open', 30_000);
  await sleep(500);
  return runScreen(page);
};
const ensureUnfolded = async (page, key) => {
  const row = page.locator(rowSel(key));
  if ((await row.getAttribute('aria-expanded')) === 'false') await row.locator(sel('mobile-run-toggle')).click();
  await waitFor(`${key} unfolded`, async () => (await row.getAttribute('aria-expanded')) === 'true', 10_000);
};
const showOlder = async (page) => {
  const fold = page.locator(sel('mobile-run-list-show-older'));
  if ((await fold.count()) && (await fold.innerText()).startsWith('Show older')) await fold.click();
};
const composerSend = async (page, text) => {
  const box = page.locator(`${sel('mobile-run-conversation')} textarea`).last();
  const send = page.locator(`${sel('mobile-run-conversation')} button[aria-label="Send message"]`).last();
  await waitFor('Send enabled', async () => {
    if (!(await box.inputValue().catch(() => ''))) await box.fill(text).catch(() => undefined);
    return (await send.count()) > 0 && await send.isEnabled();
  }, 20_000);
  await send.click();
};
const menuOpen = async (page, view) => {
  await page.locator(sel('mobile-run-menu-button')).click();
  await page.locator(sel('mobile-run-menu')).waitFor({ timeout: 10_000 });
  if (view) await page.locator(sel(`mobile-run-menu-${view}`)).click();
};
/** Where a run's conversation is stored on its node: the first projection that has the marker. */
const storedHas = async (node, ids, marker) => {
  const reads = [];
  if (ids.runId) reads.push(['query($id:String!){getRunProjection(runId:$id){conversation}}', { id: ids.runId }, data => data.getRunProjection?.conversation]);
  if (ids.teamRunId && ids.agentRunId) reads.push(['query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}', { id: ids.teamRunId, a: ids.agentRunId }, data => data.getTeamMemberRunProjection?.conversation]);
  if (ids.hostRunId) reads.push(['query($h:String!,$m:String!,$a:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$m,agentRunId:$a){conversation}}', { h: ids.hostRunId, m: ids.memberAddress, a: ids.agentRunId }, data => data.agentRunCollaborationMemberProjection?.conversation]);
  if (ids.orgRunId) reads.push(['query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}', { id: ids.orgRunId, a: ids.agentRunId, m: ids.memberAddress }, data => data.getAgentOrgMemberRunProjection?.conversation]);
  for (const [query, variables, pick] of reads) {
    const text = JSON.stringify(pick(await node.gql(query, variables).catch(() => ({}))) ?? '');
    if (text.includes(marker)) return true;
  }
  return false;
};
/** Visible controls under 44×44 CSS px and the document's horizontal overflow. */
const measureLayout = page => page.evaluate(() => {
  const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && el.offsetParent !== null; };
  const controls = [...document.querySelectorAll('button, a[href], input:not([type="hidden"]), textarea, select, [role="button"], [role="menuitem"], [role="switch"], [role="option"], summary')].filter(visible);
  const small = controls.map(el => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => r.width < 43.5 || r.height < 43.5).map(({ el, r }) => ({
    label: (el.getAttribute('aria-label') || el.getAttribute('data-testid') || el.textContent || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 40),
    size: `${Math.round(r.width)}×${Math.round(r.height)}`, shared: Boolean(el.closest('[data-testid="mobile-run-conversation"], [data-testid="mobile-file-preview-content"], [data-testid="mobile-artifacts-viewer"], [data-testid="mobile-team-reference-viewer"] .prose')) }));
  const de = document.documentElement;
  return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, bodyScrollWidth: document.body.scrollWidth, horizontalScroll: de.scrollWidth > de.clientWidth, controls: controls.length, small };
});

const runCase = async (id, fn) => {
  if (selected && !selected.has(id)) return;
  currentCase = id;
  const started = Date.now();
  console.log(`[mobile-shell] ${id} …`);
  try {
    const details = await fn();
    evidence.cases[id] = { result: 'Pass', seconds: Math.round((Date.now() - started) / 100) / 10, ...details };
  } catch (error) {
    evidence.cases[id] = { result: 'Fail', seconds: Math.round((Date.now() - started) / 100) / 10, error: error.message, details: error.details ?? null };
  }
  console.log(`[mobile-shell] ${id} ${evidence.cases[id].result}${evidence.cases[id].error ? `: ${evidence.cases[id].error}` : ''}`);
  await saveEvidence();
};

const desktopRunsView = async (desktop) => {
  await desktop.locator('[data-test="run-section-view-menu"]').waitFor({ timeout: 120_000 });
  if ((await desktop.locator('[data-test="run-section-title"]').innerText()).trim() !== 'Runs') {
    await desktop.locator('[data-test="run-section-view-menu"]').click();
    await desktop.locator('[data-test="run-section-view-runs"]').click();
  }
  await desktop.locator('[data-test="run-list-row"]').first().waitFor({ timeout: 60_000 });
};
const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) }).catch(() => undefined);
const historyReads = (filter = () => true) => phoneNet.filter(entry => entry.op === 'ListWorkspaceRunHistory' && filter(entry));

const runCases = async () => {
  // The desktop window (MSP-01's comparison) against the same node.
  const frontendPort = await freePort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const frontendLog = createWriteStream(path.join(outputDir, 'frontend.log'));
  frontend = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], { cwd: webDir, detached: true,
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: alpha.baseUrl } });
  frontend.stdout.pipe(frontendLog); frontend.stderr.pipe(frontendLog);
  await waitFor('frontend', async () => {
    if (exited(frontend)) throw new Error(`frontend exited ${frontend.exitCode}`);
    return fetch(frontendUrl).then(response => response.ok).catch(() => false);
  }, 240_000);
  stack.frontendUrl = frontendUrl;
  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  // The phone, paired through Phone Access.
  const phone = await openPhone({ label: 'phone' });
  const page = phone.page;
  await pairPhone(page);
  const paired = await phone.context.storageState();
  await sleep(2_000);

  await runCase('MSP-01', async () => {
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
    await desktopContext.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    const desktop = await desktopContext.newPage();
    // A cold `nuxt dev` re-optimizes and reloads (TESTING.md § Browser probes): warm it up first.
    await desktop.goto(frontendUrl, { waitUntil: 'networkidle', timeout: 240_000 }).catch(() => undefined);
    await sleep(3_000);
    await desktop.goto(frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
    await desktopRunsView(desktop);
    const desktopFold = await desktop.locator('[data-test="run-list-show-older"]').innerText().catch(() => null);
    if (desktopFold?.startsWith('Show older')) await desktop.locator('[data-test="run-list-show-older"]').click();
    await sleep(1_000);
    const desktopIds = await desktop.locator('[data-test="run-list-row"]').evaluateAll(rows => rows.map(row => row.getAttribute('data-run-id')));
    await desktop.screenshot({ path: path.join(outputDir, 'MSP-01-desktop-runs-view.png') });
    await desktopContext.close();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
    await sleep(1_500);
    const before = await rowsOf(page);
    const foldBefore = (await page.locator(sel('mobile-run-list-show-older')).innerText()).trim();
    await shot(page, 'MSP-01-phone-list-newest-5');
    await showOlder(page);
    await sleep(500);
    const all = await rowsOf(page);
    const foldOpen = (await page.locator(sel('mobile-run-list-show-older')).innerText()).trim();
    await page.locator(sel('mobile-run-list-scroll')).evaluate(el => { el.scrollTop = el.scrollHeight; });
    await shot(page, 'MSP-01-phone-list-older-open');
    await page.locator(sel('mobile-run-list-show-older')).click();
    await sleep(500);
    const after = await rowsOf(page);
    const phoneIds = topIds(all);
    assert(topIds(before).length === 5, 'the newest 5 top-level runs', topIds(before));
    assert(foldBefore === `Show older (${phoneIds.length - 5})`, 'Show older (N)', { foldBefore, total: phoneIds.length });
    assert(foldOpen === 'Show fewer' && topIds(after).length === 5, 'Show fewer folds back to 5', { foldOpen, after: topIds(after).length });
    assert(JSON.stringify(phoneIds) === JSON.stringify(desktopIds), 'the same runs and order as the desktop Runs view', { phoneIds, desktopIds });
    assert(phoneIds.length >= 7 && phoneIds.includes(stack.org) && phoneIds.includes(stack.delivery), 'Agent, Team and Org runs listed', phoneIds);
    const ages = all.filter(row => row.depth === 0).map(row => row.age);
    assert(ages.every(age => /^(now|\d+[mhdw])$/.test(age ?? '')), 'every top-level row has its age', ages);
    return { desktopIds, phoneIds, foldBefore, foldOpen, ages, desktopFold };
  });

  await runCase('MSP-02', async () => {
    await toList(page);
    const ptmKey = `agent:${stack.ptm}`;
    const rows = await rowsOf(page);
    const ptm = rows.find(row => row.key === ptmKey);
    const writer = rows.find(row => row.key === `${ptmKey}/agent:${stack.writerRun}`);
    const squad = rows.find(row => row.key === `${ptmKey}/team:${stack.squadRun}`);
    const remoteAgent = rows.find(row => row.key.startsWith(`${ptmKey}/`) && row.key.endsWith(stack.remoteAgentRun));
    const remoteTeam = rows.find(row => row.key.startsWith(`${ptmKey}/`) && row.key.endsWith(stack.remoteTeamRun));
    assert(ptm?.expanded === 'true', 'the PTM run with delegated work starts unfolded', ptm);
    assert(writer?.depth === 1 && writer.status, 'the task agent under the PTM run', writer);
    assert(squad?.depth === 1 && squad.expanded === 'false', 'the task team under it, folded', squad);
    assert(remoteAgent?.depth === 1 && remoteAgent.chip?.includes(PEER) && remoteTeam?.depth === 1 && remoteTeam.chip?.includes(PEER), 'the remote rows with their node chip', { remoteAgent, remoteTeam });
    await ensureUnfolded(page, squad.key);
    const unfolded = await rowsOf(page);
    const members = ['reviewer', 'editor'].map(name => childRow(unfolded, squad.key, name, 2));
    assert(members.every(Boolean), 'the task team\'s members under it', unfolded.filter(row => row.key.startsWith(squad.key)));
    // A Team run: members folded; its lead's own delegated work under the lead.
    const teamKey = `team:${stack.delivery}`;
    const teamRow = unfolded.find(row => row.key === teamKey);
    assert(teamRow?.expanded === 'false', 'a Team run\'s members start folded', teamRow);
    await ensureUnfolded(page, teamKey);
    let teamRows = await rowsOf(page);
    const lead = childRow(teamRows, teamKey, 'lead', 1);
    const mate = childRow(teamRows, teamKey, 'mate', 1);
    assert(lead && mate, 'the Team\'s members', teamRows.filter(row => row.key.startsWith(teamKey)));
    if (lead.expanded === 'false') { await ensureUnfolded(page, lead.key); teamRows = await rowsOf(page); }
    const leadDelegatedNested = childRow(teamRows, lead.key, 'changelog helper', 2);
    // An Org run starts unfolded with its members.
    const orgRow = teamRows.find(row => row.key === `org:${stack.org}`);
    const orgMembers = teamRows.filter(row => row.key.startsWith(`org:${stack.org}/`));
    assert(orgRow?.expanded === 'true' && orgMembers.length > 0, 'the Org run unfolded with its members', { orgRow, orgMembers });
    await shot(page, 'MSP-02-tree');
    // The desktop Runs view of the same node: where the same rows sit (DEC-001: one list builder).
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1400 }, locale: 'en-US', timezoneId: 'UTC' });
    await desktopContext.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    const desktop = await desktopContext.newPage();
    await desktop.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
    await desktopRunsView(desktop);
    if (await desktop.locator('[data-test="run-list-show-older"]').count() && (await desktop.locator('[data-test="run-list-show-older"]').innerText()).startsWith('Show older')) await desktop.locator('[data-test="run-list-show-older"]').click();
    for (let round = 0; round < 6; round += 1) {
      for (const handle of await desktop.locator('[data-test="run-list-scroll"] [aria-expanded="false"]').all()) await handle.click({ timeout: 1_500 }).catch(() => undefined);
      await sleep(700);
    }
    const desktopPlace = await desktop.evaluate((ids) => Object.fromEntries(Object.entries(ids).map(([label, id]) => {
      const row = document.querySelector(`[data-agent-run-id="${id}"]`);
      const name = row?.querySelector('span, p') ?? row;
      return [label, row ? Math.round(name.getBoundingClientRect().left) : null];
    })), { lead: stack.deliveryLead, leadDelegated: stack.leadDelegated, reviewer: stack.reviewer, reviewerDelegated: stack.memberDelegated });
    const desktopTitles = await desktop.evaluate((ids) => Object.fromEntries(Object.entries(ids).map(([label, id]) => {
      const row = document.querySelector(`[data-test="run-list-scroll"] [data-agent-run-id="${id}"]`);
      return [label, row ? row.innerText.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 3) : null];
    })), { writer: stack.writerRun, spare: stack.spareRun, leadDelegated: stack.leadDelegated });
    await desktop.screenshot({ path: path.join(outputDir, 'MSP-02-desktop-tree.png') });
    await desktopContext.close();
    const phonePlace = { lead: lead.depth, leadDelegated: childRow(teamRows, teamKey, 'changelog helper', 1)?.depth ?? leadDelegatedNested?.depth ?? null };
    // Live state: a delegated run stops on the node (a lasting state change); its dot follows with no reload.
    const watchDot = key => page.evaluate((rowKey) => {
      window.__statusSeen = [];
      const watch = () => { const dot = document.querySelector(`[data-testid="mobile-run-row-${rowKey}"] [data-testid="mobile-run-status-dot"]`); const status = dot?.getAttribute('data-status');
        if (status && window.__statusSeen[window.__statusSeen.length - 1] !== status) window.__statusSeen.push(status); };
      watch();
      window.__statusObserver?.disconnect();
      window.__statusObserver = new MutationObserver(watch);
      window.__statusObserver.observe(document.body, { subtree: true, attributes: true, childList: true, attributeFilter: ['data-status'] });
    }, key);
    const seenNow = () => page.evaluate(() => window.__statusSeen);
    const terminate = async id => (await alpha.gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id })).terminateAgentRun;
    const navigationsBefore = await page.evaluate(() => performance.getEntriesByType('navigation').length);
    // (a) Its root not opened on the phone: observed over three polls.
    const unselectedKey = `${ptmKey}/agent:${stack.memberDelegated}`;
    await watchDot(unselectedKey);
    const unselectedTerminated = await terminate(stack.memberDelegated);
    await sleep(16_000);
    const unselectedSeen = await seenNow();
    // (b) Its root opened, then ← (the open run): the dot follows.
    await openRow(page, ptmKey);
    await page.locator(sel('mobile-run-back')).first().click();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor();
    await sleep(1_500);
    const unselectedAfterOpen = (await rowsOf(page)).find(row => row.key === unselectedKey)?.status ?? null;
    const spareKey = `${ptmKey}/agent:${stack.spareRun}`;
    await watchDot(spareKey);
    const terminated = await terminate(stack.spareRun);
    let seen = [];
    await waitFor('the stopped run\'s dot to change', async () => (seen = await seenNow()).length >= 2, 30_000).catch(() => undefined);
    await page.evaluate(() => window.__statusObserver.disconnect());
    const liveOk = seen.length >= 2 && seen.some(status => status !== seen[0]);
    const phoneTitles = { writer: writer.title, squad: squad.title, spare: (await rowsOf(page)).find(row => row.key === `${ptmKey}/agent:${stack.spareRun}`)?.title ?? null,
      leadDelegated: childRow(teamRows, teamKey, 'changelog helper', 1)?.title ?? leadDelegatedNested?.title ?? null };
    const facts = { phonePlace, desktopPlace, phoneTitles, desktopTitles, liveStatuses: seen, terminated, unselected: { seen: unselectedSeen, terminated: unselectedTerminated, afterRootOpened: unselectedAfterOpen },
      reloaded: (await page.evaluate(() => performance.getEntriesByType('navigation').length)) !== navigationsBefore,
      ptm, writer, squad, members, remoteAgent, remoteTeam, team: { teamRow, lead, mate, leadDelegatedNested }, orgRow, orgMembers: orgMembers.map(row => row.name),
      teamRows: teamRows.filter(row => row.key.startsWith(teamKey)).map(row => [row.name, row.depth]) };
    const failures = [
      [liveOk && !facts.reloaded, 'a delegated run\'s state changes live on the list (its root open)'],
      [Boolean(leadDelegatedNested), 'a member\'s own delegated work under the member (REQ-002, VIS-002)'],
      [Boolean(phoneTitles.writer && phoneTitles.spare), 'delegated rows show their title or Task line (spec Run row; VIS-001, 002)'],
    ].filter(([ok]) => !ok).map(([, label]) => label);
    assert(failures.length === 0, failures.join('; '), facts);
    return facts;
  });

  await runCase('MSP-03', async () => {
    await toList(page);
    await showOlder(page);
    const ptmKey = `agent:${stack.ptm}`;
    const squadKey = `${ptmKey}/team:${stack.squadRun}`;
    await ensureUnfolded(page, squadKey);
    const kinds = [
      { kind: 'task agent', key: () => `${ptmKey}/agent:${stack.writerRun}`, name: 'release notes writer', parent: 'Project Task Manager', ids: { hostRunId: stack.ptm, memberAddress: '/release_notes_writer', agentRunId: stack.writerRun } },
      { kind: 'task-team member', key: async () => childRow(await rowsOf(page), squadKey, 'reviewer', 2)?.key, name: 'reviewer', parent: 'docs review team',
        ids: { hostRunId: stack.ptm, memberAddress: '/docs_review_team/reviewer', agentRunId: stack.reviewer } },
      { kind: 'Team run (its coordinator)', key: () => `team:${stack.delivery}`, name: 'lead', parent: 'Delivery Team', ids: { teamRunId: stack.delivery, agentRunId: stack.deliveryLead, runId: stack.deliveryLead } },
      { kind: 'Org run (its first member)', key: () => `org:${stack.org}`, name: 'planner', parent: 'Delivery Org', ids: { orgRunId: stack.org, agentRunId: stack.orgPlanner, memberAddress: '/planner', runId: stack.orgPlanner } },
      { kind: 'Org member', key: () => `org:${stack.org}/agent:${stack.orgPlanner}`, name: 'planner', parent: 'Delivery Org', ids: { orgRunId: stack.org, agentRunId: stack.orgPlanner, memberAddress: '/planner', runId: stack.orgPlanner } },
    ];
    const results = [];
    const scroller = page.locator(sel('mobile-run-list-scroll'));
    for (const [index, entry] of kinds.entries()) {
      const result = { kind: entry.kind };
      results.push(result);
      try {
        await toList(page);
        const key = await entry.key();
        result.key = key;
        if (!key || !(await page.locator(rowSel(key)).count())) { result.problem = 'row not listed'; continue; }
        await page.locator(rowSel(key)).scrollIntoViewIfNeeded();
        await scroller.evaluate(el => { el.scrollTop = Math.max(0, el.scrollTop + 40); });
        result.scrollBefore = await scroller.evaluate(el => el.scrollTop);
        await page.evaluate(() => { window.__st = []; const take = () => { const s = document.querySelector('[data-testid="mobile-run-screen"]'); const v = s ? `${s.getAttribute('data-state')}:${s.querySelector('[data-testid="mobile-run-name"]')?.textContent ?? ''}` : 'list'; if (window.__st[window.__st.length - 1] !== v) window.__st.push(v); };
          window.__stObserver = new MutationObserver(take); window.__stObserver.observe(document.body, { subtree: true, childList: true, attributes: true }); });
        await page.locator(`${rowSel(key)} ${sel('mobile-run-open')}`).click();
        await waitFor(`${entry.kind}: the run screen`, async () => (await runScreen(page)).state === 'open', 20_000).catch(() => undefined);
        await sleep(600);
        result.states = await page.evaluate(() => { window.__stObserver?.disconnect(); return window.__st; });
        const screen = await runScreen(page);
        result.screen = { state: screen.state, name: screen.name, subtitle: screen.subtitle, query: screen.query };
        if (screen.state !== 'open') { result.problem = 'the run screen did not open'; await toList(page); continue; }
        result.nameOk = screen.name?.toLowerCase() === entry.name.toLowerCase() && new RegExp(`^(Running|Idle|Starting|Error|Stopped) · in ${entry.parent}$`, 'i').test(screen.subtitle ?? '');
        result.composer = await page.locator(`${sel('mobile-run-conversation')} textarea`).count();
        const marker = `PHONE-MSG-${index + 1}-${randomUUID().slice(0, 6)}`;
        result.marker = marker;
        const errorsBefore = evidence.browserErrors.length;
        await composerSend(page, `From the phone. Marker ${marker}`);
        await waitFor(`${entry.kind}: the message on the node`, async () => (result.reached = await storedHas(alpha, entry.ids, marker)), 30_000).catch(() => undefined);
        result.shownOnPhone = ((await runScreen(page)).conversation ?? '').includes(marker);
        result.sendErrors = evidence.browserErrors.slice(errorsBefore).filter(entry => !entry.known).map(entry => entry.line.split('\n')[0]);
        await shot(page, `MSP-03-${index + 1}-${entry.kind.split(' ')[0].toLowerCase()}`);
        await page.locator(sel('mobile-run-back')).first().click();
        await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 20_000 });
        await sleep(400);
        result.scrollAfter = await scroller.evaluate(el => el.scrollTop);
        const markedRows = (await rowsOf(page)).filter(row => row.current === 'true');
        result.markedRows = markedRows.map(row => `${row.key} (${row.name})`);
        result.marked = markedRows.length === 1 && (markedRows[0].key === key || (markedRows[0].key.startsWith(`${key}/`) && markedRows[0].name.toLowerCase() === entry.name.toLowerCase())) ? 'true' : null;
      } catch (error) { result.problem = error.message; }
    }
    // Control for a failed send: the same send in a page given `crypto.randomUUID` (a secure context has it).
    const control = {};
    if (results.some(result => result.composer && !result.reached)) {
      const secure = await openPhone({ storageState: paired, label: 'phone-randomuuid-control' });
      await secure.context.addInitScript(() => {
        if (typeof crypto.randomUUID !== 'function') {
          crypto.randomUUID = () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
        }
      });
      control.insecureContext = await page.evaluate(() => ({ isSecureContext: window.isSecureContext, randomUUID: typeof crypto.randomUUID }));
      await secure.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded' });
      await secure.page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
      await sleep(1_500);
      await openRow(secure.page, `${ptmKey}/agent:${stack.writerRun}`);
      const marker = `PHONE-CONTROL-${randomUUID().slice(0, 6)}`;
      await composerSend(secure.page, `From the phone. Marker ${marker}`);
      await waitFor('the control message on the node', async () => (control.reached = await storedHas(alpha, { hostRunId: stack.ptm, memberAddress: '/release_notes_writer', agentRunId: stack.writerRun }, marker)), 30_000).catch(() => undefined);
      control.shownOnPhone = ((await runScreen(secure.page)).conversation ?? '').includes(marker);
      await secure.context.close();
    }
    const failures = results.filter(result => result.problem || !result.nameOk || !result.composer || !result.reached || !result.shownOnPhone
      || Math.abs((result.scrollAfter ?? -99) - (result.scrollBefore ?? 0)) > 2 || result.marked !== 'true');
    assert(failures.length === 0, 'each kind opens its agent\'s conversation, a message from the phone reaches it, ← keeps the scroll and marks the row', { failures, control });
    return { results, control };
  });

  await runCase('MSP-04', async () => {
    await toList(page);
    await showOlder(page);
    const screen = await openRow(page, `agent:${stack.approver}`);
    await composerSend(page, 'Run the probe shell command.');
    const approve = page.locator(sel('mobile-run-conversation')).getByRole('button', { name: 'Approve', exact: true });
    await approve.first().waitFor({ timeout: 60_000 });
    await shot(page, 'MSP-04-approval-pending');
    await approve.first().click();
    let answer = null;
    await waitFor('the runtime\'s answer', async () => {
      const lines = existsSync(stack.acpRecord) ? (await fs.readFile(stack.acpRecord, 'utf8')).split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
      answer = lines.find(message => !('method' in message) && message.result?.outcome)?.result?.outcome ?? null;
      return Boolean(answer);
    }, 45_000);
    let conversation = '';
    await waitFor('the command ran', async () => (conversation = (await runScreen(page)).conversation ?? '').includes('grok-permission-probe'), 30_000).catch(() => undefined);
    await sleep(1_500);
    const stillAwaiting = await approve.count();
    await shot(page, 'MSP-04-approved');
    assert(screen.name === 'Approver', 'the Grok run opened', screen);
    assert(answer?.outcome === 'selected' && answer.optionId === 'allow-once', 'the node answered the runtime: allow once', answer);
    assert(stillAwaiting === 0, 'no approval left pending', stillAwaiting);
    return { screen: { ...screen, conversation: undefined }, answer, commandShown: conversation.includes('grok-permission-probe') };
  });

  await runCase('MSP-05', async () => {
    await toList(page);
    await showOlder(page);
    // Snapshots of the run screen from the tap until the conversation: never another run, no button but ←.
    const watchScreen = () => page.evaluate(() => {
      window.__screens = [];
      const take = () => {
        const screen = document.querySelector('[data-testid="mobile-run-screen"]');
        if (!screen) return;
        const snap = JSON.stringify({ state: screen.getAttribute('data-state'), name: screen.querySelector('[data-testid="mobile-run-name"]')?.textContent?.trim() ?? null,
          opening: Boolean(screen.querySelector('[data-testid="mobile-run-opening"]')), buttons: [...screen.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => b.getAttribute('aria-label') || b.textContent.trim()).slice(0, 6) });
        if (window.__screens[window.__screens.length - 1] !== snap) window.__screens.push(snap);
      };
      window.__screenObserver = new MutationObserver(take);
      window.__screenObserver.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    });
    const screensSeen = () => page.evaluate(() => { window.__screenObserver?.disconnect(); return (window.__screens ?? []).map(s => JSON.parse(s)); });
    // A is open (Approver); B (the Team's coordinator) is tapped.
    await openRow(page, `agent:${stack.approver}`);
    await page.locator(sel('mobile-run-back')).first().click();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor();
    await watchScreen();
    await page.locator(`${rowSel(`team:${stack.delivery}`)} ${sel('mobile-run-open')}`).click();
    await waitFor('B open', async () => (await runScreen(page)).state === 'open' && (await runScreen(page)).name === 'lead', 30_000);
    await sleep(800);
    const snapshots = await screensSeen();
    const shownOther = snapshots.filter(s => s.state === 'open' && s.name !== 'lead');
    const openingButtons = snapshots.filter(s => s.state === 'opening').flatMap(s => s.buttons);
    assert(shownOther.length === 0, 'the previous run is never shown while opening', snapshots);
    assert(openingButtons.every(label => label === 'Back to runs'), '"Opening…" offers no button but ←', snapshots);
    // Browser Back/Forward: the conversation attaches again.
    await page.goBack();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 20_000 });
    await page.goForward();
    await waitFor('Forward re-attaches', async () => { const s = await runScreen(page); return s.state === 'open' && s.name === 'lead' && (s.conversation ?? '').includes('LEAD-DELEGATED'); }, 30_000);
    const forward = await runScreen(page);
    // From a view: Back returns to the attached conversation.
    await menuOpen(page, 'activity');
    await page.locator(sel('mobile-activity')).waitFor({ timeout: 20_000 });
    await page.goBack();
    await waitFor('Back from a view re-attaches', async () => (await runScreen(page)).state === 'open', 20_000);
    // An Org entry: Back, then Forward restores the Org target from its keys.
    await page.goBack();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 20_000 });
    await openRow(page, `org:${stack.org}/agent:${stack.orgPlanner}`);
    const orgQuery = (await runScreen(page)).query;
    await page.goBack();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 20_000 });
    const listQuery = await page.evaluate(() => location.search);
    const orgMarked = await page.locator(rowSel(`org:${stack.org}/agent:${stack.orgPlanner}`)).getAttribute('aria-current');
    await page.goForward();
    await waitFor('Forward to the Org entry', async () => { const s = await runScreen(page); return s.state === 'open' && (s.conversation ?? '').includes('ORG-PLANNER'); }, 30_000);
    // A reload of a run entry: the list.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 60_000 });
    const afterReload = await page.evaluate(() => location.search);
    // A tap during an open: ← and another row; the second one is open in the end.
    await showOlder(page);
    await page.locator(`${rowSel(`agent:${stack.approver}`)} ${sel('mobile-run-open')}`).click();
    await page.locator(sel('mobile-run-back')).first().click();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 20_000 });
    await page.locator(`${rowSel(`team:${stack.delivery}`)} ${sel('mobile-run-open')}`).click();
    await waitFor('the second row open', async () => (await runScreen(page)).state === 'open', 30_000);
    await sleep(2_000);
    const second = await runScreen(page);
    assert(orgQuery.includes('orgRunId') && listQuery.includes('orgRunId') && orgMarked === 'true', 'the Org keys stay on the list entry and the row stays marked', { orgQuery, listQuery, orgMarked });
    assert(!afterReload.includes('screen=run'), 'a reload of a run entry lands on the list', afterReload);
    assert(second.name === 'lead', 'the second tap wins', second);
    return { snapshots, forward: { ...forward, conversation: undefined }, orgQuery, listQuery, orgMarked, afterReload, second: { ...second, conversation: undefined } };
  });

  await runCase('MSP-06', async () => {
    await toList(page);
    const ptmKey = `agent:${stack.ptm}`;
    // The remote rows know their title and state once their delegating run is opened (278: the node is asked for an opened root).
    await openRow(page, ptmKey);
    await page.locator(sel('mobile-run-back')).first().click();
    const remoteKey = `${ptmKey}/agent:${stack.remoteAgentRun}`;
    let row = null;
    await waitFor('the remote row\'s title', async () => (row = (await rowsOf(page)).find(entry => entry.key.endsWith(stack.remoteAgentRun)))?.title === stack.remoteAgentTitle, 30_000).catch(() => undefined);
    assert(row?.chip?.includes(PEER) && row.title === stack.remoteAgentTitle && row.status && row.status !== 'error', 'the remote row: chip, title, state', row);
    const opened = await openRow(page, row.key);
    await waitFor('the remote conversation', async () => ((await runScreen(page)).conversation ?? '').includes('REMOTE-AGENT'), 30_000);
    const placeholder = await page.locator(`${sel('mobile-run-conversation')} textarea`).last().getAttribute('placeholder');
    const uploads = await page.locator(`${sel('mobile-run-conversation')} button[aria-label="Upload files"]:visible`).count();
    const box = page.locator(`${sel('mobile-run-conversation')} textarea`).last();
    await box.click(); await box.fill(''); await page.keyboard.type('@'); await sleep(800);
    const mention = { role: await box.getAttribute('role'), expanded: await box.getAttribute('aria-expanded') };
    await page.keyboard.press('Escape').catch(() => undefined); await box.fill('');
    const errorsBefore = evidence.browserErrors.length;
    await composerSend(page, 'status? Marker OWNER-FROM-PHONE');
    let onBeta = false;
    await waitFor('the message on beta', async () => (onBeta = await storedHas(beta, { runId: stack.remoteAgentRun }, 'OWNER-FROM-PHONE')), 30_000).catch(() => undefined);
    const sendErrors = evidence.browserErrors.slice(errorsBefore).filter(entry => !entry.known).map(entry => entry.line.split('\n')[0]);
    let live = false;
    await waitFor('the answer on the phone', async () => { const text = (await runScreen(page)).conversation ?? ''; return (live = text.includes('OWNER-FROM-PHONE') && text.lastIndexOf('OK') > text.indexOf('OWNER-FROM-PHONE')); }, 30_000).catch(() => undefined);
    await shot(page, 'MSP-06-remote-run');
    assert(opened.chip?.includes(PEER), 'the bar shows the node chip', opened);
    assert(placeholder?.includes(PEER) && uploads === 0 && mention.expanded !== 'true', 'a text-only composer', { placeholder, uploads, mention });
    // Beta down: the rows say so, the opened run shows the notice, other runs open.
    await page.locator(sel('mobile-run-back')).first().click();
    await beta.stop();
    await openRow(page, ptmKey);
    await page.locator(sel('mobile-run-back')).first().click();
    let down = null;
    await waitFor('the remote rows not reachable', async () => { down = (await rowsOf(page)).filter(entry => entry.key.startsWith(`${ptmKey}/`) && entry.chip); return down.length >= 2 && down.every(entry => entry.unreachable && entry.status === 'error'); }, 60_000).catch(() => undefined);
    await shot(page, 'MSP-06-peer-down-list');
    await page.locator(sel('mobile-node-button')).click();
    await page.locator(sel('mobile-connection-sheet')).waitFor();
    await sleep(1_500);
    const peerDown = await page.locator(sel('mobile-peer')).allInnerTexts();
    await page.locator(sel('mobile-sheet-close')).click();
    const downKey = down?.find(entry => entry.key.endsWith(stack.remoteAgentRun))?.key ?? remoteKey;
    await page.locator(`${rowSel(downKey)} ${sel('mobile-run-open')}`).click();
    const runNotice = page.locator(`${sel('mobile-run-screen')} ${sel('mobile-run-unreachable')}`);
    await runNotice.waitFor({ timeout: 30_000 });
    const notice = (await runNotice.innerText()).replace(/\s+/g, ' ').trim();
    const composerWhileDown = await page.locator(`${sel('mobile-run-screen')} textarea`).count();
    await shot(page, 'MSP-06-peer-down-notice');
    await page.locator(sel('mobile-run-back')).first().click();
    const other = await openRow(page, `team:${stack.delivery}`);
    await page.locator(sel('mobile-run-back')).first().click();
    await beta.start();
    await page.locator(`${rowSel(downKey)} ${sel('mobile-run-open')}`).click();
    await runNotice.waitFor({ timeout: 30_000 }).catch(() => undefined);
    const retry = runNotice.locator('button').filter({ hasText: 'Retry' });
    const retryShown = await retry.count();
    if (retryShown) await retry.first().click();
    let recovered = false;
    await waitFor('Retry recovers the conversation', async () => (recovered = !(await runNotice.count()) && ((await runScreen(page)).conversation ?? '').includes('REMOTE-AGENT')), 60_000).catch(() => undefined);
    await shot(page, 'MSP-06-after-retry');
    assert(down?.length >= 2 && down.every(entry => entry.unreachable && entry.status === 'error'), 'red dot and "Not reachable" on the remote rows', down);
    assert(notice.includes(`${PEER} isn't reachable`) && notice.includes('Retry') && composerWhileDown === 0, 'the notice with Retry, no composer', { notice, composerWhileDown });
    assert(other.state === 'open' && other.name === 'lead', 'other runs open while the peer is down', other);
    assert(peerDown.some(text => text.includes(PEER) && /not reachable/i.test(text)), 'the peer is not reachable in the connection sheet', peerDown);
    assert(retryShown > 0 && recovered, 'Retry recovers when the peer is back', { retryShown, recovered });
    assert(onBeta && live, 'a text message from the phone reaches the run on beta and its answer shows live', { onBeta, live, sendErrors });
    return { onBeta, sendErrors, row, opened: { ...opened, conversation: undefined }, placeholder, uploads, mention, live, down, notice, peerDown, recovered };
  });

  await runCase('MSP-07', async () => {
    // (a) Nothing opened yet: a fresh start of the paired phone.
    const fresh = await openPhone({ storageState: paired, label: 'phone-fresh' });
    await fresh.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded' });
    await fresh.page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
    await fresh.page.locator(sel('mobile-new-run-button')).click();
    await fresh.page.locator(sel('mobile-new-run')).waitFor();
    await waitFor('a preselected agent', async () => (await fresh.page.locator(sel('mobile-run-target-select-value')).innerText()).trim() !== 'Choose', 20_000).catch(() => undefined);
    const freshAgent = (await fresh.page.locator(sel('mobile-run-target-select-value')).innerText()).trim();
    await shot(fresh.page, 'MSP-07-new-run-nothing-opened');
    await fresh.context.close();
    // (b) An Org member opened, then ←: the row stays marked and its agent is preselected.
    await toList(page);
    await showOlder(page);
    await openRow(page, `org:${stack.org}/agent:${stack.orgPlanner}`);
    await page.locator(sel('mobile-run-back')).first().click();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor();
    const orgMarked = await page.locator(rowSel(`org:${stack.org}/agent:${stack.orgPlanner}`)).getAttribute('aria-current');
    const orgListQuery = await page.evaluate(() => location.search);
    await page.locator(sel('mobile-new-run-button')).click();
    await page.locator(sel('mobile-new-run')).waitFor();
    await sleep(800);
    const orgAgent = (await page.locator(sel('mobile-run-target-select-value')).innerText()).trim();
    // Every row's sheet; agents only.
    await page.locator(sel('mobile-run-target-select-toggle')).click();
    await page.locator(sel('mobile-run-target-select-sheet')).waitFor();
    const agentOptions = (await page.locator(sel('mobile-run-target-select-option')).allInnerTexts()).map(text => text.replace(/\s+/g, ' ').trim());
    await shot(page, 'MSP-07-agent-sheet');
    await page.locator(sel('mobile-run-target-select-option')).filter({ hasText: 'Fact Checker' }).first().click();
    await sleep(800);
    const factCheckerReadiness = await page.locator(sel('mobile-run-setup-readiness')).innerText().catch(() => null);
    const launchDisabledWhenMissing = await page.locator(sel('mobile-run-launch')).isDisabled();
    const sheets = {};
    for (const id of ['mobile-run-workspace-select', 'mobile-run-runtime-select', 'mobile-run-model-select']) {
      const toggle = page.locator(sel(`${id}-toggle`));
      if (!(await toggle.count())) { sheets[id] = 'absent'; continue; }
      await toggle.click();
      await page.locator(sel(`${id}-sheet`)).waitFor({ timeout: 10_000 });
      sheets[id] = (await page.locator(sel(`${id}-option`)).allInnerTexts()).map(text => text.replace(/\s+/g, ' ').trim()).slice(0, 8);
      if (id === 'mobile-run-workspace-select') {
        await shot(page, 'MSP-07-folder-sheet');
        await page.locator(sel('mobile-run-workspace-path-input')).fill('   ');
        sheets.blankPathOpenDisabled = await page.locator(sel('mobile-run-workspace-load')).isDisabled();
        await page.locator(sel('mobile-run-workspace-path-input')).fill('/definitely/not/a/folder-277');
        await page.locator(sel('mobile-run-workspace-load')).click();
        await sleep(2_500);
        // The node registers any non-empty path (unchanged server behavior), so there is no product error to show here.
        sheets.badPath = { error: await page.locator(sel('mobile-run-workspace-error')).innerText().catch(() => null),
          value: (await page.locator(sel('mobile-run-workspace-select-value')).innerText()).trim(), sheetOpen: await page.locator(sel(`${id}-sheet`)).count() };
      }
      if (await page.locator(sel(`${id}-sheet`)).count()) await page.locator(`${sel(`${id}-sheet`)} ${sel('mobile-sheet-close')}`).click();
      await sleep(300);
    }
    // The probe's own folder again (the node registered the bad path, FU-004), then a PTM run and its first message.
    await page.locator(sel('mobile-run-workspace-select-toggle')).click();
    await page.locator(sel('mobile-run-workspace-select-option')).filter({ hasText: stack.workspace }).first().click();
    await sleep(500);
    // Create a PTM run and send its first message.
    await page.locator(sel('mobile-run-target-select-toggle')).click();
    await page.locator(sel('mobile-run-target-select-option')).filter({ hasText: 'Project Task Manager' }).first().click();
    await waitFor('Create run enabled', async () => !(await page.locator(sel('mobile-run-launch')).isDisabled()), 20_000);
    await shot(page, 'MSP-07-new-run-ready');
    await page.locator(sel('mobile-run-launch')).click();
    await waitFor('the new run\'s screen', async () => { const s = await runScreen(page); return s.state === 'open' && s.name === 'Project Task Manager'; }, 30_000);
    await page.evaluate(() => {
      window.__states = [];
      const take = () => { const s = document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state') ?? (document.querySelector('[data-testid="mobile-run-tree"]')?.offsetParent ? 'list' : 'none');
        if (window.__states[window.__states.length - 1] !== s) window.__states.push(s); };
      take(); window.__statesObserver = new MutationObserver(take); window.__statesObserver.observe(document.body, { subtree: true, childList: true, attributes: true });
    });
    const marker = `NEWRUN-FIRST-${randomUUID().slice(0, 6)}`;
    await composerSend(page, `First message. Marker ${marker}`);
    await waitFor('the first message shown', async () => ((await runScreen(page)).conversation ?? '').includes(marker), 30_000);
    await sleep(4_000);
    const statesDuringFirst = await page.evaluate(() => { window.__statesObserver.disconnect(); return window.__states; });
    const afterFirst = await runScreen(page);
    await page.locator(sel('mobile-run-back')).first().click();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor();
    await sleep(1_500);
    const top = (await rowsOf(page)).find(row => row.depth === 0);
    const newRunId = top?.key.replace(/^agent:/, '');
    const stored = newRunId ? await storedHas(alpha, { runId: newRunId }, marker) : false;
    assert(freshAgent === 'Project Task Manager', 'nothing opened: the Project Task Manager', freshAgent);
    assert(orgMarked === 'true' && orgAgent === 'Release Notes Writer', 'after the Org member and ←: still marked, its agent preselected', { orgMarked, orgAgent });
    assert(agentOptions.length > 0 && !agentOptions.some(text => /Delivery Team|Docs Review Team|Delivery Org/.test(text)), 'agents only', agentOptions);
    assert(launchDisabledWhenMissing && Boolean(factCheckerReadiness), 'disabled with the reason when something is missing', { factCheckerReadiness, launchDisabledWhenMissing });
    assert(sheets.blankPathOpenDisabled, 'a blank path cannot be opened', sheets);
    assert(afterFirst.state === 'open' && afterFirst.conversation.includes(marker) && statesDuringFirst.every(state => state === 'open'), 'the first message keeps the screen', { statesDuringFirst });
    assert(newRunId && !newRunId.startsWith('temp') && stored, 'the new run tops the list with its permanent id', { top, stored });
    return { freshAgent, orgMarked, orgListQuery, orgAgent, agentOptions, factCheckerReadiness, launchDisabledWhenMissing, sheets, statesDuringFirst, newRunId, top };
  });

  await runCase('MSP-08', async () => {
    await toList(page);
    await openRow(page, `team:${stack.delivery}`);
    await page.locator(sel('mobile-run-menu-button')).click();
    const items = await page.locator(`${sel('mobile-run-menu')} [role="menuitem"]`).evaluateAll(list => list.map(item => [item.getAttribute('data-testid'), item.textContent.trim()]));
    await shot(page, 'MSP-08-menu-member');
    await page.locator(sel('mobile-run-menu-artifacts')).click();
    await page.locator(sel('mobile-artifacts')).waitFor();
    await waitFor('the artifact shown', async () => (await page.locator(sel('mobile-artifacts')).innerText()).includes('NOTES-TEXT-4242'), 30_000).catch(() => undefined);
    const artifacts = { direct: await page.locator(sel('mobile-artifacts-viewer')).count(), list: await page.locator(sel('mobile-artifacts-list')).count(),
      title: (await page.locator(sel('mobile-screen-title')).innerText()).trim(), text: (await page.locator(sel('mobile-artifacts')).innerText()).includes('NOTES-TEXT-4242') };
    await shot(page, 'MSP-08-artifacts');
    await page.locator(sel('mobile-screen-back')).click();
    await menuOpen(page, 'files');
    await page.locator(sel('mobile-files-list')).waitFor({ timeout: 30_000 });
    const filesTop = await page.locator(sel('mobile-files-row')).allInnerTexts();
    const filters = await page.locator(sel('mobile-files')).getByText(/^(Recent|Attached|Markdown|Markdown\/code)$/).count();
    await page.locator(sel('mobile-files-row')).filter({ hasText: 'docs' }).first().click();
    await waitFor('the docs folder', async () => (await page.locator(sel('mobile-files-path')).innerText().catch(() => '')).includes('docs'), 15_000).catch(() => undefined);
    const pathLine = (await page.locator(sel('mobile-files-path')).innerText().catch(() => '')).replace(/\s+/g, ' ');
    await page.locator(sel('mobile-files-row')).filter({ hasText: 'guide.md' }).first().click();
    await page.locator(sel('mobile-file-viewer')).waitFor({ timeout: 20_000 });
    await waitFor('the file text', async () => (await page.locator(sel('mobile-file-viewer')).innerText()).includes('GUIDE-TEXT-7731'), 20_000);
    const attach = await page.locator(sel('mobile-file-attach')).count() + await page.locator(sel('mobile-file-viewer')).getByText(/attach/i).count();
    await shot(page, 'MSP-08-file-open');
    await page.locator(`${sel('mobile-file-viewer')} ${sel('mobile-screen-back')}`).click();
    await page.locator(sel('mobile-files-list')).waitFor();
    await page.locator(sel('mobile-files-search-open')).click();
    await page.locator(sel('mobile-files-search')).fill('app');
    await waitFor('a search result', async () => (await page.locator(sel('mobile-files-row')).allInnerTexts()).some(text => text.includes('app.ts')), 20_000).catch(() => undefined);
    const searchRows = (await page.locator(sel('mobile-files-row')).allInnerTexts()).map(text => text.replace(/\s+/g, ' '));
    await shot(page, 'MSP-08-files-search');
    await page.locator(sel('mobile-files-search-close')).click();
    await page.locator(sel('mobile-screen-back')).click();
    await menuOpen(page, 'messages');
    await page.locator(sel('mobile-messages')).waitFor();
    await page.locator(sel('mobile-team-message-row')).first().waitFor({ timeout: 30_000 });
    const messages = (await page.locator(sel('mobile-team-message-row')).allInnerTexts()).map(text => text.replace(/\s+/g, ' ').slice(0, 160));
    await page.locator(sel('mobile-team-reference-row')).first().click();
    await page.locator(sel('mobile-team-reference-viewer')).waitFor({ timeout: 20_000 });
    await waitFor('the reference text', async () => (await page.locator(sel('mobile-team-reference-viewer')).innerText()).includes('GUIDE-TEXT-7731'), 20_000).catch(() => undefined);
    const referenceText = (await page.locator(sel('mobile-team-reference-viewer')).innerText()).includes('GUIDE-TEXT-7731');
    await shot(page, 'MSP-08-reference-open');
    await page.locator(`${sel('mobile-team-reference-viewer')} ${sel('mobile-screen-back')}`).click();
    await waitFor('the reference closed', async () => (await page.locator(sel('mobile-team-reference-viewer')).count()) === 0, 10_000).catch(() => undefined);
    const stillMessages = await page.locator(sel('mobile-messages')).count();
    await page.locator(sel('mobile-screen-back')).click();
    await menuOpen(page, 'activity');
    await page.locator(sel('mobile-activity')).waitFor();
    await page.locator(sel('mobile-run-activity-row')).first().waitFor({ timeout: 20_000 }).catch(() => undefined);
    const activity = (await page.locator(sel('mobile-run-activity-row')).allInnerTexts()).map(text => text.replace(/\s+/g, ' ').slice(0, 80));
    await shot(page, 'MSP-08-activity');
    await toList(page);
    // A standalone agent: no Messages; empty Artifacts and Activity.
    await showOlder(page);
    await openRow(page, `agent:${stack.plain[0]}`);
    await page.locator(sel('mobile-run-menu-button')).click();
    const plainItems = await page.locator(`${sel('mobile-run-menu')} [role="menuitem"]`).evaluateAll(list => list.map(item => item.textContent.trim()));
    await page.locator(sel('mobile-run-menu-artifacts')).click();
    const artifactsEmpty = (await page.locator(sel('mobile-artifacts-empty')).innerText().catch(() => '')).replace(/\s+/g, ' ');
    await page.locator(sel('mobile-screen-back')).click();
    await menuOpen(page, 'activity');
    const activityEmpty = (await page.locator(sel('mobile-activity-empty')).innerText().catch(() => '')).trim();
    await shot(page, 'MSP-08-activity-empty');
    await toList(page);
    // A remote run: "on that node".
    const remoteKey = (await rowsOf(page)).find(row => row.key.endsWith(stack.remoteAgentRun))?.key;
    await openRow(page, remoteKey);
    await menuOpen(page, 'artifacts');
    const remoteArtifacts = (await page.locator(sel('mobile-artifacts-remote')).innerText().catch(() => '')).trim();
    await page.locator(sel('mobile-screen-back')).click();
    await menuOpen(page, 'files');
    const remoteFiles = (await page.locator(sel('mobile-files-remote')).innerText().catch(() => '')).trim();
    await toList(page);
    assert(JSON.stringify(items.map(([id]) => id)) === JSON.stringify(['mobile-run-menu-artifacts', 'mobile-run-menu-files', 'mobile-run-menu-messages', 'mobile-run-menu-activity']), 'the member\'s ⋮ items in order', items);
    assert(artifacts.direct === 1 && artifacts.list === 0 && artifacts.text, 'one artifact shown directly', artifacts);
    assert(['docs', 'src', 'README.md'].every(name => filesTop.some(text => text.includes(name))) && filters === 0 && pathLine.includes('docs'), 'the Files tree, its path line, no filters', { filesTop, filters, pathLine });
    assert(attach === 0, 'an opened file has no Attach', attach);
    assert(searchRows.some(text => text.includes('app.ts')), 'one search over the workspace', searchRows);
    assert(messages.some(text => text.includes('TEAM-NOTE')) && referenceText && stillMessages === 1, 'the Team messages; a reference opens the file and ← closes it', { messages, referenceText, stillMessages });
    assert(activity.length > 0, 'the agent\'s tool calls', activity);
    assert(!plainItems.includes('Messages') && plainItems.length === 3, 'no Messages for a standalone agent', plainItems);
    assert(artifactsEmpty.startsWith('No Artifacts yet') && activityEmpty === 'No activity yet', 'empty states', { artifactsEmpty, activityEmpty });
    assert(remoteArtifacts.includes(PEER) && remoteFiles.includes(PEER), 'a remote run: the files are on that node', { remoteArtifacts, remoteFiles });
    return { items, artifacts, filesTop, filters, pathLine, attach, searchRows, messages, referenceText, activity, plainItems, artifactsEmpty, activityEmpty, remoteArtifacts, remoteFiles };
  });

  await runCase('MSP-14', async () => {
    await toList(page);
    const writerKey = `agent:${stack.ptm}/agent:${stack.writerRun}`;
    assert(await page.locator(rowSel(writerKey)).count(), 'the task agent is listed before');
    const navigationsBefore = await page.evaluate(() => performance.getEntriesByType('navigation').length);
    await stack.agentCall(stack.ptm, 'update_task', { task_id: stack.taskA.taskId, status: 'DONE' });
    let gone = false;
    await waitFor('the task agent\'s row leaves', async () => (gone = (await page.locator(rowSel(writerKey)).count()) === 0), 45_000).catch(() => undefined);
    await shot(page, 'MSP-14-after-done');
    const reloaded = (await page.evaluate(() => performance.getEntriesByType('navigation').length)) !== navigationsBefore;
    assert(gone && !reloaded, 'the Task\'s row leaves live', { gone, reloaded });
    return { gone, reloaded };
  });

  await runCase('MSP-10', async () => {
    await toList(page);
    const listText = await page.locator(sel('mobile-run-list')).innerText();
    const forbidden = ['Home', 'Switch work', 'Choose work', 'Workspaces', 'Projects', 'Results', 'Troubleshoot'].filter(word => new RegExp(`\\b${word}\\b`).test(listText));
    const tabs = await page.locator('[role="tablist"], [role="tab"]').count();
    const rowButtons = (await rowsOf(page)).flatMap(row => row.buttons);
    const rowActions = rowButtons.filter(label => !['mobile-run-open', 'mobile-run-toggle'].includes(label));
    const notice = await openPhone({ storageState: paired, label: 'phone-notice' });
    await notice.page.goto(`${phoneOrigin()}/mobile?unsupported=desktopWorkspace`, { waitUntil: 'domcontentloaded' });
    await notice.page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
    const noticeText = (await notice.page.locator(sel('mobile-unsupported-feature')).innerText()).trim();
    const noticeAbove = await notice.page.evaluate(() => {
      const n = document.querySelector('[data-testid="mobile-unsupported-feature"]'); const t = document.querySelector('[data-testid="mobile-run-tree"]');
      return Boolean(n && t && (n.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) && n.getBoundingClientRect().bottom <= t.getBoundingClientRect().top + 1);
    });
    await shot(notice.page, 'MSP-10-unsupported-notice');
    // A desktop route opened on the phone.
    await notice.page.goto(`${phoneOrigin()}/mobile/workspace`, { waitUntil: 'domcontentloaded' });
    await sleep(4_000);
    const desktopRoute = { url: notice.page.url().replace(phoneOrigin(), ''), notice: await notice.page.locator(sel('mobile-unsupported-feature')).innerText().catch(() => null) };
    await notice.context.close();
    assert(forbidden.length === 0 && tabs === 0, 'none of the "Not on the phone" items on the list', { forbidden, tabs });
    assert(rowActions.length === 0, 'no row actions', rowActions);
    assert(noticeText.endsWith('The desktop workspace isn’t on the phone. Your runs are here.') && noticeAbove, 'the notice above the run list', { noticeText, noticeAbove });
    return { forbidden, tabs, rowButtons: [...new Set(rowButtons)], noticeText, noticeAbove, desktopRoute };
  });

  await runCase('MSP-11', async () => {
    const tour = async (target, size) => {
      const name = `${size.width}x${size.height}`;
      const screens = {};
      const at = async (screen) => { await sleep(600); screens[screen] = await measureLayout(target); await shot(target, `MSP-11-${screen}-${name}`); };
      await toList(target);
      await showOlder(target);
      await ensureUnfolded(target, `team:${stack.delivery}`).catch(() => undefined);
      await at('list');
      await openRow(target, `team:${stack.delivery}`);
      await at('run');
      await target.locator(sel('mobile-run-menu-button')).click();
      await at('menu');
      await target.locator(sel('mobile-run-menu-artifacts')).click();
      await target.locator(sel('mobile-artifacts')).waitFor();
      await at('artifacts');
      await target.goBack();
      await menuOpen(target, 'files');
      await target.locator(sel('mobile-files-list')).waitFor({ timeout: 30_000 });
      await at('files');
      await target.locator(sel('mobile-files-search-open')).click();
      await at('files-search');
      await target.locator(sel('mobile-files-search-close')).click();
      await target.locator(sel('mobile-files-row')).filter({ hasText: 'docs' }).first().click();
      await sleep(600);
      await target.locator(sel('mobile-files-row')).filter({ hasText: 'guide.md' }).first().click();
      await target.locator(sel('mobile-file-viewer')).waitFor();
      await at('file-open');
      // Back walk (the system Back key is the history's Back): file → Files → run → list.
      const walk = [];
      const screenNow = async () => target.evaluate(() => (document.querySelector('[data-testid="mobile-file-viewer"]') ? 'file'
        : document.querySelector('[data-testid="mobile-team-reference-viewer"]') ? 'reference'
          : document.querySelector('[data-testid="mobile-files"]') ? 'files' : document.querySelector('[data-testid="mobile-messages"]') ? 'messages'
            : document.querySelector('[data-testid="mobile-run-screen"]') ? 'run' : document.querySelector('[data-testid="mobile-run-tree"]')?.offsetParent ? 'list' : 'other'));
      for (let step = 0; step < 3; step += 1) { await target.goBack(); await sleep(900); walk.push(await screenNow()); }
      await openRow(target, `team:${stack.delivery}`);
      await menuOpen(target, 'messages');
      await target.locator(sel('mobile-team-message-row')).first().waitFor({ timeout: 30_000 });
      await at('messages');
      await target.locator(sel('mobile-team-reference-row')).first().click();
      await target.locator(sel('mobile-team-reference-viewer')).waitFor();
      await at('reference-open');
      const walkMessages = [];
      for (let step = 0; step < 3; step += 1) { await target.goBack(); await sleep(900); walkMessages.push(await screenNow()); }
      await openRow(target, `team:${stack.delivery}`);
      await menuOpen(target, 'activity');
      await target.locator(sel('mobile-activity')).waitFor();
      await at('activity');
      await toList(target);
      await target.locator(sel('mobile-new-run-button')).click();
      await target.locator(sel('mobile-new-run')).waitFor();
      await at('new-run');
      await target.locator(sel('mobile-run-target-select-toggle')).click();
      await target.locator(sel('mobile-run-target-select-sheet')).waitFor();
      await at('agent-sheet');
      await target.locator(`${sel('mobile-run-target-select-sheet')} ${sel('mobile-sheet-close')}`).click();
      await target.locator(sel('mobile-new-run-close')).click();
      await target.locator(sel('mobile-node-button')).click();
      await target.locator(sel('mobile-connection-sheet')).waitFor();
      await at('connection-sheet');
      await target.locator(sel('mobile-sheet-close')).click();
      return { screens, walk, walkMessages };
    };
    const results = {};
    results['390x844'] = await tour(page, { width: 390, height: 844 });
    const small = await openPhone({ width: 360, height: 800, storageState: paired, label: 'phone-360' });
    await small.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded' });
    await small.page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
    results['360x800'] = await tour(small.page, { width: 360, height: 800 });
    await small.context.close();
    const problems = [];
    for (const [size, result] of Object.entries(results)) {
      for (const [screen, layout] of Object.entries(result.screens)) {
        if (layout.horizontalScroll) problems.push(`${size} ${screen}: horizontal scroll ${layout.scrollWidth}>${layout.clientWidth}`);
        // The Files search field is the spec's 40px field in its 48px bar (Visual Language, Files).
        for (const control of layout.small.filter(entry => !entry.shared && !(screen === 'files-search' && entry.label === 'Search files'))) problems.push(`${size} ${screen}: ${control.label} ${control.size}`);
      }
      if (JSON.stringify(result.walk) !== JSON.stringify(['files', 'run', 'list'])) problems.push(`${size}: Back walk from a file ${JSON.stringify(result.walk)}`);
      if (JSON.stringify(result.walkMessages) !== JSON.stringify(['messages', 'run', 'list'])) problems.push(`${size}: Back walk from a reference ${JSON.stringify(result.walkMessages)}`);
    }
    const sharedSmall = [...new Set(Object.values(results).flatMap(result => Object.values(result.screens).flatMap(layout => layout.small.filter(entry => entry.shared).map(entry => `${entry.label} ${entry.size}`))))];
    assert(problems.length === 0, 'every phone-owned control ≥ 44×44, no horizontal scroll, Back walks the screens', problems);
    return { results, sharedSmall };
  });

  await runCase('MSP-12', async () => {
    await toList(page);
    await sleep(2_000);
    const window = async (label, ms) => { const from = Date.now(); await sleep(ms); return historyReads(entry => entry.label === 'phone' && entry.at >= from).map(entry => ({ dt: entry.at - from, window: entry.window, status: entry.status, bytes: entry.bytes })); };
    const onList = await window('list', 16_000);
    await showOlder(page);
    await openRow(page, `agent:${stack.plain[0]}`);
    const onRun = await window('run', 12_000);
    await menuOpen(page, 'activity');
    await page.locator(sel('mobile-activity')).waitFor();
    const onView = await window('view', 11_000);
    const backAt = Date.now();
    await toList(page);
    await sleep(6_500);
    const afterBack = historyReads(entry => entry.label === 'phone' && entry.at >= backAt).map(entry => ({ dt: entry.at - backAt, window: entry.window, status: entry.status, bytes: entry.bytes }));
    // The page hidden (the phone in the background): emulated in this browser; the Android emulator shows the real one.
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(500);
    const hidden = await window('hidden', 12_000);
    const shownAt = Date.now();
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    const afterShown = await window('shown again', 6_500);
    // QR-003 on this stack: from opening the app to the listed runs.
    const timing = await openPhone({ storageState: paired, label: 'phone-timing' });
    const t0 = Date.now();
    await timing.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'commit' });
    await timing.page.locator('[data-test="mobile-run-row"]').first().waitFor({ timeout: 60_000 });
    const firstRowsMs = Date.now() - t0;
    await timing.context.close();
    const all = historyReads();
    const bytes = all.map(entry => entry.bytes).sort((a, b) => a - b);
    evidence.network.historyReads = all.length;
    assert(all.every(entry => entry.window === null), 'every read uses the complete window', [...new Set(all.map(entry => entry.window))]);
    assert(onList.length >= 3 && onList.length <= 4, 'a poll every 5 s on the list', onList);
    assert(onRun.length === 0 && onView.length === 0 && hidden.length === 0, 'no poll on the run screen, a view or while hidden', { onRun, onView, hidden });
    assert(afterBack[0] && afterBack[0].dt <= 2_500 && afterShown[0] && afterShown[0].dt <= 1_500, 'one read at once when the list or the page comes back', { afterBack, afterShown });
    return { onList, onRun, onView, afterBack, hidden, afterShown, backAt, shownAt, bytesPerRead: { min: bytes[0], median: bytes[Math.floor(bytes.length / 2)], max: bytes[bytes.length - 1] }, firstRowsMs, reads: all.length };
  });

  await runCase('MSP-09', async () => {
    await toList(page);
    await page.locator(sel('mobile-node-button')).click();
    const sheet = page.locator(sel('mobile-connection-sheet'));
    await sheet.waitFor();
    await sleep(2_500);
    const dialogName = await page.evaluate(() => { const d = document.querySelector('[data-testid="mobile-connection-sheet"] [role="dialog"], [data-testid="mobile-connection-sheet"][role="dialog"]'); const id = d?.getAttribute('aria-labelledby'); return id ? document.getElementById(id)?.textContent?.trim() : null; });
    const info = { name: (await page.locator(sel('mobile-connection-name')).innerText()).trim(), url: (await page.locator(sel('mobile-connection-url')).innerText()).trim(),
      status: (await page.locator(sel('mobile-connection-status')).innerText()).trim(), peers: (await page.locator(sel('mobile-peer')).allInnerTexts()).map(text => text.replace(/\s+/g, ' ')) };
    await page.locator(sel('mobile-check-connection')).click();
    await sleep(1_500);
    const afterCheck = (await page.locator(sel('mobile-connection-status')).innerText()).trim();
    await shot(page, 'MSP-09-connection-sheet');
    // The paired node down.
    await alpha.stop();
    await page.locator(sel('mobile-check-connection')).click();
    await waitFor('not reachable in the sheet', async () => /not reachable/i.test(await page.locator(sel('mobile-connection-status')).innerText()), 30_000).catch(() => undefined);
    const sheetDown = (await page.locator(sel('mobile-connection-status')).innerText()).trim();
    await page.locator(sel('mobile-sheet-close')).click();
    const barDown = (await page.locator(sel('mobile-node-state')).innerText()).trim();
    const bannerDown = (await page.locator(sel('mobile-node-offline-banner')).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    const rowsWhileDown = (await rowsOf(page)).length;
    await shot(page, 'MSP-09-node-down');
    // The node back: the poll lists the runs meanwhile (C-06), Check clears the bar and the banner.
    await alpha.start();
    await sleep(12_000);
    const c06 = { bar: (await page.locator(sel('mobile-node-state')).innerText()).trim(), banner: await page.locator(sel('mobile-node-offline-banner')).count(), rows: (await rowsOf(page)).length,
      pollsAfterBack: historyReads(entry => entry.label === 'phone' && entry.case === 'MSP-09' && entry.status === 200).length };
    await (c06.banner ? page.locator(sel('mobile-node-offline-check')) : page.locator(sel('mobile-node-button'))).click();
    await sheet.waitFor();
    await page.locator(sel('mobile-check-connection')).click();
    await waitFor('connected again', async () => /connected/i.test(await page.locator(sel('mobile-connection-status')).innerText()), 30_000).catch(() => undefined);
    const sheetBack = (await page.locator(sel('mobile-connection-status')).innerText()).trim();
    await page.locator(sel('mobile-sheet-close')).click();
    const barBack = (await page.locator(sel('mobile-node-state')).innerText()).trim();
    const bannerBack = await page.locator(sel('mobile-node-offline-banner')).count();
    // Unpair, on a phone of its own.
    const other = await openPhone({ label: 'phone-unpair' });
    await pairPhone(other.page);
    await other.page.locator(sel('mobile-node-button')).click();
    await other.page.locator(sel('mobile-unpair')).click();
    await other.page.locator(sel('mobile-unpair-confirm')).waitFor();
    const confirmText = (await other.page.locator(sel('mobile-unpair-confirm')).innerText()).replace(/\s+/g, ' ').trim();
    await shot(other.page, 'MSP-09-unpair-confirm');
    const unpairButton = other.page.locator(sel('mobile-unpair-confirm')).getByRole('button', { name: 'Unpair', exact: true });
    // What a tap at the button's center hits: the confirmation's button, or something on top of it.
    const confirmOnTop = await unpairButton.evaluate(button => { const r = button.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { onTop: button.contains(hit), hit: hit ? (hit.getAttribute('data-testid') || hit.textContent.trim().slice(0, 40)) : null }; });
    if (confirmOnTop.onTop) await unpairButton.click(); else await unpairButton.dispatchEvent('click');
    await other.page.locator(sel('mobile-pairing-bootstrap')).waitFor({ timeout: 20_000 });
    const sessionLeft = await other.page.evaluate(() => localStorage.getItem('autobyteus.remote_access.mobile_session'));
    await shot(other.page, 'MSP-09-after-unpair');
    await other.context.close();
    const facts = { dialogName, info, afterCheck, sheetDown, barDown, bannerDown, rowsWhileDown, c06, sheetBack, barBack, bannerBack, confirmText, confirmOnTop, sessionLeft };
    const failures = [
      [dialogName === info.name && info.name === alpha.serverName, 'the sheet is named by the node\'s own name'],
      [info.url === phoneOrigin() && /connected/i.test(info.status) && /connected/i.test(afterCheck), 'URL, state and Check connection'],
      [info.peers.some(text => text.includes(PEER) && /\d+ agents?/.test(text)), 'the peer with what it offers'],
      [/not reachable/i.test(sheetDown) && barDown === 'Not reachable' && bannerDown.startsWith(`Can’t reach ${info.name}.`) && bannerDown.includes('Check'), 'the node down: the bar and the banner'],
      [rowsWhileDown > 0, 'the runs as last loaded stay'],
      [/connected/i.test(sheetBack) && barBack === 'Connected' && bannerBack === 0, 'Check clears the bar and the banner'],
      [confirmText.includes('Unpair this phone?') && confirmOnTop.onTop && sessionLeft === null, 'unpair: the confirmation on top, then the pairing screen'],
    ].filter(([ok]) => !ok).map(([, label]) => label);
    assert(failures.length === 0, failures.join('; '), facts);
    return { confirmOnTop, sessionLeft, dialogName, info, afterCheck, sheetDown, barDown, bannerDown, rowsWhileDown, c06, sheetBack, barBack, bannerBack, confirmText };
  });

  await runCase('MSP-13', async () => {
    // A credential the node does not know (401, REMOTE_ACCESS_AUTH_INVALID: the node's pairing data was reset): the next
    // start reads once and lands on pairing (E-27, AR-008).
    const unknown = JSON.parse(JSON.stringify(paired));
    for (const origin of unknown.origins) for (const item of origin.localStorage) {
      if (item.name === 'autobyteus.remote_access.mobile_session') {
        const session = JSON.parse(item.value);
        session.credential = `mra_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`;
        item.value = JSON.stringify(session);
      }
    }
    const invalid = await openPhone({ storageState: unknown, label: 'phone-unknown-credential' });
    await invalid.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded' });
    await invalid.page.locator(sel('mobile-pairing-bootstrap')).waitFor({ timeout: 60_000 }).catch(() => undefined);
    await sleep(8_000);
    const onPairing = await invalid.page.locator(sel('mobile-pairing-bootstrap')).count();
    const reads = historyReads(entry => entry.label === 'phone-unknown-credential');
    const sessionLeft = await invalid.page.evaluate(() => localStorage.getItem('autobyteus.remote_access.mobile_session'));
    await shot(invalid.page, 'MSP-13-unknown-credential-to-pairing');
    await invalid.context.close();
    // A device revoked on the node (403, REMOTE_ACCESS_DEVICE_REVOKED): observed as is (the rule covers 401 only, as before).
    const revokedAll = await alpha.rest('DELETE', '/remote-access/devices');
    const revoked = await openPhone({ storageState: paired, label: 'phone-revoked' });
    await revoked.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded' });
    await sleep(10_000);
    const revokedShows = await revoked.page.evaluate(() => ({ pairing: Boolean(document.querySelector('[data-testid="mobile-pairing-bootstrap"]')),
      list: document.querySelector('[data-testid="mobile-run-list-error"]') ? 'error' : document.querySelector('[data-testid="mobile-run-tree"]') ? 'rows' : 'other',
      bar: document.querySelector('[data-testid="mobile-node-state"]')?.textContent?.trim() ?? null }));
    const revokedReads = phoneNet.filter(entry => entry.label === 'phone-revoked').map(entry => `${entry.op} ${entry.status}`);
    await shot(revoked.page, 'MSP-13-revoked-device');
    await revoked.context.close();
    assert(onPairing === 1 && sessionLeft === null, 'an unknown credential lands on pairing', { onPairing, sessionLeft });
    assert(reads.length === 1 && reads[0].status === 401, 'one history read, refused with 401', reads);
    return { reads, onPairing, revokedAll: revokedAll.status, revokedShows, revokedReads: [...new Set(revokedReads)] };
  });
};

try {
  assert(existsSync(appEntry), 'Build the worktree server first: pnpm -C autobyteus-server-ts build');
  assert(existsSync(mobileBundle), 'Build the phone bundle first: pnpm -C autobyteus-web build:mobile-web');
  const fakeGrokDir = path.join(root, 'fake-grok');
  await fs.mkdir(fakeGrokDir, { recursive: true });
  const fakeGrok = path.join(fakeGrokDir, 'grok');
  await fs.writeFile(fakeGrok, `#!/bin/sh\nexec "${process.execPath}" "${grokCli}" "$@"\n`, { mode: 0o755 });
  stack.acpRecord = path.join(root, 'grok-acp-client.jsonl');
  [alpha, beta] = await Promise.all([
    serverAt('alpha', await freePort(), { GROK_BUILD_COMMAND: fakeGrok, FAKE_ACP_FIXTURE: grokPermission, FAKE_ACP_RECORD: stack.acpRecord, FAKE_ACP_REPORT_MCP_READY: '1' }),
    serverAt('beta', await freePort()),
  ]);
  const mobilePage = await fetch(`${alpha.baseUrl}/mobile`);
  assert(mobilePage.ok && (await mobilePage.text()).includes('/mobile/_nuxt/'), 'alpha serves the phone bundle at /mobile', mobilePage.status);
  await setUp();
  await saveEvidence();

  if (hold) {
    const lan = Object.values(os.networkInterfaces()).flat().find(entry => entry?.family === 'IPv4' && !entry.internal && /^(192\.168|10\.|172\.)/.test(entry.address))?.address;
    const links = { emulator: await pairingFor(`http://10.0.2.2:${alpha.port}`) };
    if (bindHost === '0.0.0.0' && lan) links.lan = await pairingFor(`http://${lan}:${alpha.port}`);
    const info = { alpha: alpha.baseUrl, beta: beta.baseUrl, alphaPort: alpha.port, links, runs: evidence.runs, ids: stack.ids, workspace: stack.workspace, root };
    await fs.writeFile(path.join(outputDir, 'hold.json'), `${JSON.stringify(info, null, 2)}\n`);
    console.log(`[mobile-shell] holding the stack; ${path.join(outputDir, 'hold.json')} has the links. Ctrl+C ends it.`);
    await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
    evidence.result = 'Pass';
  } else {
    await runCases();
    const failed = Object.entries(evidence.cases).filter(([, entry]) => entry.result !== 'Pass').map(([id]) => id);
    const unknownErrors = evidence.browserErrors.filter(entry => !entry.known);
    evidence.result = failed.length === 0 && unknownErrors.length === 0 && Object.keys(evidence.cases).length > 0 ? 'Pass' : 'Fail';
    evidence.summary = { cases: Object.fromEntries(Object.entries(evidence.cases).map(([id, entry]) => [id, entry.result])), unknownBrowserErrors: unknownErrors.length };
    if (evidence.result !== 'Pass') process.exitCode = 1;
  }
} catch (error) {
  evidence.error = error instanceof Error ? `${error.stack ?? error.message}${error.details ? `\n${JSON.stringify(error.details)}` : ''}` : String(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (frontend && !exited(frontend)) {
    try { process.kill(-frontend.pid, 'SIGTERM'); } catch { /* gone */ }
    await Promise.race([new Promise(resolve => frontend.once('close', resolve)), sleep(8_000)]);
    if (!exited(frontend)) { try { process.kill(-frontend.pid, 'SIGKILL'); } catch { /* gone */ } }
  }
  for (const child of [...children]) {
    if (!exited(child)) { child.kill('SIGTERM'); await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(10_000)]); if (!exited(child)) child.kill('SIGKILL'); }
    children.delete(child);
  }
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  evidence.cleanup = { frontendExited: !frontend || exited(frontend), serversLeft: children.size, rootRemoved: !existsSync(root) };
  evidence.finishedAt = new Date().toISOString();
  await saveEvidence();
  console.log(`mobile-shell probe: ${evidence.result}${evidence.error ? `\n${redact(evidence.error)}` : ''}`);
  process.exit(process.exitCode ?? 0);
}

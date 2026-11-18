#!/usr/bin/env node
// A stopped delegator's open view (autobyteus-461 SCN-005 / AC-007, REQ-002, REQ-004; design DS-8 "A view's stream lives with
// the open view", SR-045, SR-046, SR-048; code review C3-06): real Nuxt dev frontend + built backend + fresh headless Chrome.
// Run from the repository root: pnpm -C autobyteus-web test:e2e:stopped-delegator-views --output-dir <fresh dir>
//   Optional: --browser-executable <path> --cases SDV-01,SDV-02,SDV-03
// Prerequisites: installed workspace dependencies, a current `pnpm -C autobyteus-server-ts prebuild && build` (the probe runs
// autobyteus-server-ts/dist/app.js), and Chrome.
// Agents run on the AGY runtime with the repository's scripted CLI (autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs,
// AGY_FAKE_CASE=linked_skills): a message containing `CALL_TOOL:{...}` makes that agent call the real tool; any other message is
// answered "OK". No provider inference, no mocked routes.
// Cases (each a delegator of one kind whose Manager delegated a Task to a worker; desktop layout):
//   SDV-01 agent-run view: the user presses Stop on the running Manager with its view open. The server closes the view stream
//          (1000) and the view reconnects on its own (C3-06): it shows the Manager stopped and keeps the worker's row. The user
//          messages the worker from that view: only the worker wakes, its reply appears live, the Manager stays stopped. The
//          worker delegates further: the new row appears live under it. The user's message to the Manager starts it, and the
//          view goes live on the same stream.
//   SDV-02 Team view: the team run is stopped; its open view is served stopped (stored mode): the worker's row is listed, a
//          message to the worker wakes only the worker (its reply live), the team stays stopped. The user's message to the
//          team's own member (the Manager) restores the team: the view continues live after one snapshot, with no
//          out-of-sync notice, and the composer does not stay pending (SR-048).
//   SDV-03 Org view: the same for an org run; the stopped org starts on its first input (the user's message to its agent).
//   SDV-06 CR-461-076 / SR-080: a worker opens from its Task's card (Projects panel) for an Agent, Team and Org delegator ×
//          an Agent worker and a Team worker (its coordinator).
//   SDV-07 CR-461-076, SR-083 (FU-031): a running delegated Team opens from its own row, at its coordinator, in every tree;
//   (before SR-083: in a Team run's tree, from its coordinator's row)
//          in a Team delegator's view (base's Team-tree rule, CRR-041 / FU-031).
//   SDV-05 C15-03 (DS-15, CRR-039): page B opens the worker from its delegator's row while its Task is open; the Task closes;
//          as at base (`returnToHostWhenUnlisted`), page B's view returns to the delegator, so the web offers no view of the closed
//          run to send from (C15-03 is not applicable in the rendered layer; proven at the server: the DS-15 suite, DRO-3). The
//          closed run's row stays gone from the delegator's view (page A) and the delegator's row keeps its status.
// In each case the stopped root's own row in the run list is sampled while its view is open and for 15 s after the child
// command (past the history poll): it must show stopped (code review O-1, CRR-008).
// The probe owns a private data root, free ports, the backend and Nuxt process groups and Chrome, and removes them in
// finally. It never uses the installed app or user data.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { attachToBrowserContext, attachToProbeProcess, withNodeCredential } from './fixtures/probe-node-access.mjs';
import { waitRunSocketReady } from './fixtures/run-socket-ready.mjs';
import { readRunTree, asTaskExecutions } from './fixtures/run-tree.mjs';
attachToProbeProcess();

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const WebSocket = require('ws');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serverDir = path.join(path.dirname(webDir), 'autobyteus-server-ts');
const getArg = (name, fallback) => {
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/stopped-delegator-views'));
const executablePath = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
    .find((candidate) => fs.existsSync(candidate));
const ALL_CASES = ['SDV-01', 'SDV-02', 'SDV-03', 'SDV-04', 'SDV-05', 'SDV-06', 'SDV-07'];
const selectedCases = (getArg('cases') ?? ALL_CASES.join(',')).split(',').map((c) => c.trim()).filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, predicate, ms = 30000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(150); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e; } };
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const segment = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const slug = (name) => segment(name).replace(/_/g, '-');
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;

const evidence = { startedAt: new Date().toISOString(), executablePath, cases: {}, cleanup: {}, failures: [] };
const evidencePath = path.join(outputDir, 'evidence.json');
const save = () => fsp.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

// ---------------------------------------------------------------- owned stack
const stack = { dataRoot: '', backendUrl: '', frontendUrl: '', backend: null, frontend: null, backendStarts: 0 };
const exited = (c) => !c || c.exitCode !== null || c.signalCode !== null;
const stopGroup = async (child) => {
  if (exited(child)) return { pid: child?.pid ?? null, status: 'not-running' };
  process.kill(-child.pid, 'SIGTERM');
  await until('owned process exit', () => exited(child), 15000).catch(async () => {
    process.kill(-child.pid, 'SIGKILL'); await until('owned process killed', () => exited(child), 5000);
  });
  return { pid: child.pid, status: 'terminated', exit: child.exitCode ?? child.signalCode };
};
const spawnLogged = (cmd, args, cwd, env, name) => {
  const log = fs.createWriteStream(path.join(outputDir, `${name}.log`), { flags: 'a' });
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.output = '';
  child.stdout.on('data', (d) => { child.output += d; log.write(d); });
  child.stderr.on('data', (d) => { child.output += d; log.write(d); });
  child.once('close', () => log.end());
  return child;
};
const backendEnv = () => ({ APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataRoot, 'db', 'development.db')}`,
  AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_ALLOWED_ORIGINS: stack.frontendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'),
  AUTOBYTEUS_MEMORY_DIR: path.join(stack.dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(stack.dataRoot, 'temp_workspace'),
  // A long idle grace: a quiet worker is not shut down while a case watches it (idle shutdown has its own tests).
  AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS: '3600000' });
const startStack = async () => {
  assert(fs.existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build');
  stack.dataRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'stopped-delegator-views-'));
  for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'workspace']) await fsp.mkdir(path.join(stack.dataRoot, dir));
  const backendPort = await freePort(); const frontendPort = await freePort();
  stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv()).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  stack.backendStarts += 1;
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('AUTOBYTEUS_'))), ...backendEnv(),
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' };
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', stack.dataRoot],
    serverDir, withNodeCredential(env), 'backend');
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 180000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...process.env, NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`, BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => { if (exited(stack.frontend)) throw new Error('Nuxt exited'); return (await fetch(stack.frontendUrl)).ok; }, 240000);
  evidence.stack = { backendUrl: stack.backendUrl, frontendUrl: stack.frontendUrl, dataRoot: stack.dataRoot };
};

// ---------------------------------------------------------------- public API setup
const gql = async (query, variables = {}) => {
  const response = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const workspace = () => path.join(stack.dataRoot, 'workspace');
const config = () => ({ workspaceRootPath: workspace(), llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' });
const ensureWorkspace = async () => {
  const listed = (await gql('query{workspaces{absolutePath}}').catch(() => ({ workspaces: [] }))).workspaces ?? [];
  if (!listed.some((w) => w.absolutePath === workspace())) await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace() } });
};
const definitions = async (label) => {
  const s = `${label} ${randomUUID().slice(0, 4)}`;
  const agent = async (name, toolNames) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames } })).createAgentDefinition.id;
  const names = { manager: `Manager ${s}`, worker: `Worker ${s}`, helper: `Helper ${s}`, team: `Team ${s}`, org: `Org ${s}` };
  const ids = { manager: await agent(names.manager, ['update_task']), worker: await agent(names.worker, []), helper: await agent(names.helper, []) };
  ids.team = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
    { input: { name: names.team, description: names.team, instructions: 'Deliver.', coordinatorMemberName: 'manager',
      nodes: [{ memberName: 'manager', ref: ids.manager, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  names.squad = `Squad ${s}`;
  ids.squad = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
    { input: { name: names.squad, description: names.squad, instructions: 'Review.', coordinatorMemberName: 'lead',
      nodes: [{ memberName: 'lead', ref: ids.worker, refScope: 'SHARED' }, { memberName: 'mate', ref: ids.helper, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  ids.org = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}',
    { input: { name: names.org, description: names.org, instructions: 'Deliver.', handoffs: [], members: [
      { memberName: 'manager', ref: ids.manager, refType: 'AGENT', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
  return { ids, names };
};
const createRoot = async (kind, ids) => {
  if (kind === 'agent') {
    const r = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
    assert(r.success, r.message); return { kind, rootId: r.runId, managerRunId: r.runId };
  }
  if (kind === 'team') {
    const r = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}',
      { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: '/', ...config() }],
        memberConfigs: [{ memberAddress: '/manager', agentDefinitionId: ids.manager, ...config() }] } })).createAgentTeamRun;
    assert(r.success, r.message);
    const tree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: r.teamRunId })).getTeamRunResumeConfig.executionTree;
    return { kind, rootId: r.teamRunId, managerRunId: tree.root_team.members.find((m) => m.address === '/manager').agent_run_id };
  }
  const r = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}',
    { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config(), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  assert(r.success, r.message);
  const tree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: r.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  return { kind, rootId: r.agentOrgRunId, managerRunId: tree.rootOrg.members.find((m) => m.address === '/manager').agentRunId };
};
/** Whether a root's own run is active, as the server reports it. */
const isActive = async (root) => {
  // The run's own agent (the run list's status), not whether its collaboration root object is loaded
  // (the listed-runs poll's `isActive` answers whether the run is managed; the run's own status is what the list shows).
  if (root.kind === 'agent') return Boolean((await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}', { id: root.rootId }))
    .getAgentRunResumeConfig?.isActive);
  if (root.kind === 'team') return Boolean((await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){isActive}}', { id: root.rootId })).getTeamRunResumeConfig.isActive);
  return Boolean((await gql('query($id:String!){getAgentOrgRootHistory(orgRunId:$id){is_active}}', { id: root.rootId })).getAgentOrgRootHistory.is_active);
};
const stopRoot = async (root) => {
  const r = Object.values(await gql(root.kind === 'agent' ? 'mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}'
    : root.kind === 'team' ? 'mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}'
      : 'mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id: root.rootId }))[0];
  assert(r.success, `stop ${root.kind} failed: ${r.message}`);
};
const sockets = [];
/** The Manager's input channel (its composer's command), for the setup steps. */
const managerInput = async (root) => {
  const route = root.kind === 'agent' ? `agent/${root.rootId}` : root.kind === 'team' ? `agent-team/${root.rootId}` : `agent-org/${root.rootId}`;
  const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/${route}`); sockets.push(socket);
  const frames = [];
  socket.on('message', (raw) => { try { frames.push(JSON.parse(String(raw))); } catch { /* not JSON */ } });
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  await waitRunSocketReady(frames, route);
  await sleep(300);
  const send = (content) => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: root.kind === 'org'
    ? { root_subject_kind: 'agent_org', root_run_id: root.rootId, target_agent_run_id: root.managerRunId, command_id: randomUUID(),
      message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] }
    : { agent_run_id: root.managerRunId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`,
      content, context_file_paths: [], image_urls: [] } }));
  return { send, close: () => socket.close() };
};
/**
 * The runs a root delegated to, at every depth, from its view's rows in base's shapes (autobyteus-461 rule 1, SR-061): the
 * agent run's collaboration view, the team's resume config tree, the org's history item. Rows carry `startedAt`; the root's
 * own members do not.
 */
// autobyteus-461 SR-084: a run's delegated runs are its tree's rows (`runTree`); its view carries its own parts only.
const viewTreeOf = async (root) => asTaskExecutions(await readRunTree(gql, root.kind, root.rootId));
const childRunIds = async (root) => (await viewTreeOf(root)).taskExecutions
  .map((node) => node.agentRunId ?? node.coordinatorAgentRunId).filter((id) => id && id !== root.managerRunId);
/** A root of one kind whose Manager delegated a Task (a project Task) to the worker; returns the worker's run ID. */
const setupRoot = async (kind, label) => {
  const { ids, names } = await definitions(label);
  const projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: `${label} ${randomUUID().slice(0, 6)}` } })).createProject.projectId;
  const taskId = (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}', { input: { projectId, title: 'Write the notes.', description: 'Write the notes.' } })).createProjectTask.taskId;
  const root = await createRoot(kind, ids);
  const input = await managerInput(root);
  input.send(callTool('delegate_task', { recipient_address: kind === 'org' ? `/${segment(names.worker)}` : `/${segment(names.worker)}`, task_id: taskId }));
  const [worker] = await until(`${kind}: worker delegated`, async () => { const c = await childRunIds(root); return c.length ? c : null; }, 90000);
  input.close();
  return { ids, names, root, worker, projectId, taskId };
};

// ---------------------------------------------------------------- browser
let browser;
const newPage = async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'en-US' });
  await attachToBrowserContext(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Outdated Optimize Dep|dynamically imported module|error caught during app initialization/.test(m.text())) errors.push(m.text()); });
  // Every view stream the page opens, and how each closes (C3-06).
  const viewSockets = [];
  const sentMessages = [];
  page.on('websocket', (ws) => {
    const entry = { url: ws.url().replace(/[?].*$/, ''), openedAt: Date.now(), closedAt: null, frames: 0 };
    viewSockets.push(entry);
    ws.on('framereceived', () => { entry.frames += 1; });
    // What the page sends (route and target only, never content): which run a user message went to.
    ws.on('framesent', (frame) => {
      try {
        const sent = JSON.parse(String(frame.payload));
        if (sent?.type === 'SEND_MESSAGE') sentMessages.push({ at: Date.now(), socket: entry.url.replace(/^.*\/ws\//, '/ws/'),
          target: sent.payload?.agent_run_id ?? sent.payload?.target_agent_run_id ?? null });
      } catch { /* not JSON */ }
    });
    ws.on('close', () => { entry.closedAt = Date.now(); });
  });
  return { context, page, errors, viewSockets, sentMessages };
};
const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) });
const centerText = (page) => page.locator('[data-test="workspace-center-pane"]').innerText();
const openRoot = async (page, root, names) => {
  await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 });
  await until('workspace row', async () => (await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).count()) >= 1, 60000);
  await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first().click();
  if (root.kind === 'agent') {
    await page.locator('[data-test="workspace-agent-row"]', { hasText: names.manager }).click();
    const runRow = page.locator('[data-test="workspace-agent-run-row"]');
    await until('agent run row', async () => (await runRow.count()) >= 1, 30000);
    await runRow.first().click();
    return runRow.first();
  }
  if (root.kind === 'team') {
    await page.locator(`[data-test="workspace-team-definition-row-${slug(names.team)}"]`).click();
    const runRow = page.locator(`[data-test="workspace-team-row-${root.rootId}"]`);
    await runRow.click();
    return runRow;
  }
  await page.locator(`[data-test="agent-org-definition-${slug(names.org)}"]`).click();
  const runRow = page.locator(`[data-test="agent-org-run-open-${root.rootId}"]`);
  await runRow.click();
  return runRow;
};
const childRow = (kind, agentRunId) => kind === 'org' ? `[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${agentRunId}"]`
  : `[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${agentRunId}"]`;
const managerRow = (kind, root, runRow) => kind === 'team' ? `[data-test="workspace-team-member-${root.rootId}-/manager"]`
  : kind === 'org' ? `[data-test="agent-org-agent-row-${root.managerRunId}"]` : runRow;
const composer = (page) => page.locator('[data-test="workspace-center-pane"] textarea').first();
const send = async (page, text) => { await composer(page).fill(text); await composer(page).press('Enter'); };
const okCount = (text) => (text.match(/\bOK\b/g) ?? []).length;
/** The rendered status of a root's own row in the run list (O-1): the class of its status dot. */
const rootRowSelector = (root) => root.kind === 'agent' ? `[data-test="workspace-agent-run-row"][data-run-id="${root.rootId}"]`
  : root.kind === 'team' ? `[data-test="workspace-team-row-${root.rootId}"]` : `[data-test="agent-org-run-open-${root.rootId}"]`;
const rootRowDot = async (page, root) => page.locator(rootRowSelector(root)).first()
  // The round status dot (a team's aggregate dot wraps one; the chevron icon before it is not a status).
  .evaluate((row) => (row.querySelector('span.rounded-full') ?? row.querySelector('svg:has(circle)'))?.getAttribute('class') ?? null).catch(() => null);
const shownRunning = (dotClass) => /bg-(blue|green|amber|emerald)-500|text-(blue|green|amber)-700/.test(dotClass ?? '');
/** Samples the root row's rendered status for `ms` (longer than the history poll): every sample must show it stopped. */
const rootStaysShownStopped = async (page, root, ms, label, out) => {
  // The list shows a Stop within one list poll (about 5 s): wait for the stopped dot first, then every sample must keep it.
  const settled = await until(`${root.kind}: the root shown stopped (${label})`, async () => {
    const dot = await rootRowDot(page, root); return dot !== null && !shownRunning(dot) ? dot : null; }, 10000).catch(() => null);
  const samples = [];
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // A sample that finds no row (the list re-rendering) is read again once before it counts.
    let dot = await rootRowDot(page, root);
    if (dot === null) { await sleep(400); dot = await rootRowDot(page, root); }
    samples.push(dot); await sleep(1500);
  }
  out.renderedRootStatus = { ...(out.renderedRootStatus ?? {}), [label]: { settled, samples } };
  assert(settled !== null && samples.length > 0 && samples.every((c) => c !== null && !shownRunning(c)), `${root.kind}: the stopped root shows as running in the run list (${label})`, out);
};

/** The common part: with the root stopped and its view open, the worker answers live and the root stays stopped. */
const childWhileStopped = async (s, page, out) => {
  const { root } = s;
  const worker = page.locator(childRow(root.kind, s.worker));
  await worker.waitFor({ state: 'visible', timeout: 30000 });
  await worker.click();
  await until('worker conversation open', async () => /new task|Task/i.test(await centerText(page)), 30000);
  const before = okCount(await centerText(page));
  await send(page, `Status of the notes? Marker STOPPED-${root.kind}`);
  await until('worker reply live', async () => { const t = await centerText(page); return t.includes(`STOPPED-${root.kind}`) && okCount(t) > before; }, 60000)
    .catch(async (error) => {
      const workerConv = JSON.stringify(await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: s.worker }).catch((e) => ({ error: String(e) })));
      error.details = { sentMessages: s.sentMessages?.slice(-3) ?? null, markerInWorkerRun: workerConv.includes(`STOPPED-${root.kind}`),
        pageErrors: s.errors?.slice(-10) ?? null, sockets: s.viewSockets?.map((w) => ({ url: w.url.replace(/^.*\/ws\//, '/ws/'), closed: w.closedAt !== null, frames: w.frames })) ?? null,
        rootActive: await isActive(root), center: (await centerText(page)).slice(-600) };
      await shot(page, `sdv-${root.kind}-worker-reply-timeout`);
      throw error;
    });
  out.workerAnsweredLive = true;
  out.sentMessages = s.sentMessages?.slice(-3) ?? null;
  // autobyteus-461 rule 2 (SR-061): the selected delegated row is bound to its own run, so the message leaves on the
  // worker's own stream (`/ws/agent/<worker>`), never on the delegator's view.
  // The agent stream names its run in the URL, so its SEND_MESSAGE carries no target: match by socket or by target.
  const toWorker = (s.sentMessages ?? []).filter((m) => m.target === s.worker || m.socket.startsWith(`/ws/agent/${s.worker}`));
  out.workerMessageSockets = [...new Set(toWorker.map((m) => m.socket.replace(/\?.*$/, '')))];
  assert(toWorker.length > 0 && toWorker.every((m) => m.socket.startsWith(`/ws/agent/${s.worker}`)),
    `${root.kind}: the worker's message did not go on its own stream`, out);
  // Round 2 F-9: the selected worker's Team tab shows its messages, or nothing, never the "can't be shown" error panel.
  const teamTab = page.locator('[data-test="right-side-tab-list"]').locator('button, [role="tab"]', { hasText: /Team/ }).first();
  if (await teamTab.count()) {
    await teamTab.click();
    await sleep(3000);
    const panel = await page.locator('[data-test="right-side-tab-content-shell"]').innerText().catch(() => '');
    out.workerTeamTab = panel.slice(0, 300);
    await shot(page, `sdv-${root.kind}-worker-team-tab`);
    assert(!panel.includes("These messages can't be shown"), `${root.kind}: the worker's Team tab shows the error panel`, out);
  } else out.workerTeamTab = 'no Team tab for the selected worker';
  if (await isActive(root)) {
    // Which run received the marker (the worker's own run and the root's agent that should stay stopped).
    const workerConv = JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: s.worker }).catch((e) => ({ error: String(e) }))));
    out.markerInWorkerRun = workerConv.includes(`STOPPED-${root.kind}`);
  }
  assert(!(await isActive(root)), `${root.kind}: the stopped root was started by a message to its worker`, out);
  out.rootStayedStopped = true;
  // The worker delegates further: the new row appears live under it (no reload).
  await send(page, callTool('delegate_task', { recipient_address: `/${segment(s.names.helper)}`, description: 'Collect the links.' }));
  const helperId = await until('helper delegated', async () => {
    // The worker's own children, from its own view (rule 1: a delegated run's view has its rows like any run's).
    const tree = await readRunTree(gql, 'agent', s.worker).catch(() => null);
    const ids = JSON.stringify(tree ?? {}).match(new RegExp(`${segment(s.names.helper)}_[0-9a-f]+`, 'g'));
    return ids?.[0] ?? null;
  }, 90000).catch(() => null);
  out.helperRunId = helperId;
  if (!helperId) {
    // The worker's delegation must happen: a missing helper fails the case with what the worker received.
    const workerConv = (await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: s.worker }).catch((e) => ({ error: String(e) })));
    out.workerConversationTail = JSON.stringify(workerConv).slice(-1500);
    out.sentMessages = s.sentMessages?.slice(-3) ?? null;
    await shot(page, `sdv-${root.kind}-helper-not-delegated`);
    assert(false, `${root.kind}: the worker did not delegate to the helper`, out);
  }
  // REQ-002: a run delegated by a delegated run is shown under the run that delegated it (the worker's row), live.
  await page.locator(`[data-agent-run-id="${helperId}"]`).first().waitFor({ state: 'visible', timeout: 30000 })
    .catch(async (error) => {
      out.helperRunId = helperId;
      out.rowsShown = await page.locator('[data-agent-run-id]').evaluateAll((els) => els.map((el) => el.getAttribute('data-agent-run-id'))).catch(() => null);
      await shot(page, `sdv-${root.kind}-helper-row-missing`);
      error.details = out;
      throw error;
    });
  out.helperRowLive = true;
  assert(!(await isActive(root)), `${root.kind}: the root started when its worker delegated`);
};

const caseAgentRun = async () => {
  const s = await setupRoot('agent', 'SdvAgent');
  const { page, errors, context, viewSockets, sentMessages } = await newPage();
  s.sentMessages = sentMessages;
  try {
    const runRow = await openRoot(page, s.root, s.names);
    await page.locator(childRow('agent', s.worker)).waitFor({ state: 'visible', timeout: 30000 });
    const viewUrl = (u) => u.includes('/ws/agent-collaboration/') && u.includes(encodeURIComponent(s.root.rootId));
    await until('view stream open', () => viewSockets.some((w) => viewUrl(w.url) && w.closedAt === null), 30000);
    const opened = viewSockets.filter((w) => viewUrl(w.url)).length;
    assert(await isActive(s.root), 'the Manager should be running before the Stop');
    // The user presses Stop on the running Manager (its view open): the server closes the view stream (1000).
    await stopRoot(s.root);
    await until('the Manager is stopped', async () => !(await isActive(s.root)), 30000);
    await until('the view stream reconnects', () => viewSockets.filter((w) => viewUrl(w.url)).length > opened
      && viewSockets.filter((w) => viewUrl(w.url)).at(-1).closedAt === null, 30000);
    const views = viewSockets.filter((w) => viewUrl(w.url));
    const out = { streams: views.map((w) => ({ closed: w.closedAt !== null, frames: w.frames })) };
    assert(views.slice(0, -1).some((w) => w.closedAt !== null), 'the first view stream did not close at the Stop', out);
    await page.locator(childRow('agent', s.worker)).waitFor({ state: 'visible', timeout: 30000 });
    out.workerRowKept = true;
    await shot(page, 'sdv-01-after-stop');
    // O-1: the stopped Manager, its view open, is shown stopped in the run list.
    await rootStaysShownStopped(page, s.root, 6000, 'view open after Stop', out);
    await childWhileStopped(s, page, out);
    await shot(page, 'sdv-01-worker-answered');
    // O-1: after a command to its child loaded its root, it is still shown stopped (sampled past the history poll).
    await rootStaysShownStopped(page, s.root, 15000, 'after a child command', out);
    // The user's message to the Manager starts it, on the view's stream.
    const streamsBefore = viewSockets.filter((w) => viewUrl(w.url)).length;
    await runRow.click();
    // As a user does: the Manager's conversation shown (no longer "Loading") before typing (IMP-111: a send while the view
    // still loaded was dropped in 2 of 4 runs).
    await until('the Manager\'s view loaded', async () => { const text = await centerText(page); return !/Loading/i.test(text) && text.trim().length > 0; }, 30000);
    await send(page, 'Back to work. Marker MANAGER-START');
    await until('the Manager started', () => isActive(s.root), 60000);
    await until('manager reply', async () => (await centerText(page)).includes('MANAGER-START'), 60000);
    await sleep(1500);
    out.managerStarted = true;
    out.streamsAfterStart = viewSockets.filter((w) => viewUrl(w.url)).length - streamsBefore;
    await shot(page, 'sdv-01-manager-started');
    assert(errors.length === 0, 'browser errors', errors);
    return out;
  } finally { await context.close(); }
};

const caseStoppedRoot = async (kind) => {
  const s = await setupRoot(kind, kind === 'team' ? 'SdvTeam' : 'SdvOrg');
  await stopRoot(s.root);
  await until(`${kind}: stopped`, async () => !(await isActive(s.root)), 30000);
  const { page, errors, context, sentMessages, viewSockets } = await newPage();
  s.sentMessages = sentMessages; s.errors = errors; s.viewSockets = viewSockets;
  try {
    const runRow = await openRoot(page, s.root, s.names);
    const out = {};
    await rootStaysShownStopped(page, s.root, 6000, 'view open while stopped', out);
    await childWhileStopped(s, page, out);
    await shot(page, `sdv-${kind}-worker-answered`);
    await rootStaysShownStopped(page, s.root, 15000, 'after a child command', out);
    // The user's message to the run's own member (the Manager) restores the run; the view continues live (SR-048).
    await page.locator(managerRow(kind, s.root, runRow)).first().click();
    await sleep(500);
    await send(page, `Restart the plan. Marker OWN-${kind}`);
    await until(`${kind}: restored on its member's message`, () => isActive(s.root), 60000);
    await until(`${kind}: the member's reply live`, async () => { const t = await centerText(page); return t.includes(`OWN-${kind}`) && /\bOK\b/.test(t.slice(t.indexOf(`OWN-${kind}`))); }, 60000);
    const panel = await page.locator('body').innerText();
    assert(!/out of sync/i.test(panel), `${kind}: the view asked for a recovery`, { text: panel.slice(0, 600) });
    const pending = await page.locator('[data-test="composer-send-pending"], [data-test="workspace-composer-pending"]').count();
    out.composerPendingIndicators = pending;
    assert(pending === 0, `${kind}: the composer stayed pending`);
    out.restoredLive = true;
    await shot(page, `sdv-${kind}-restored`);
    assert(errors.length === 0, 'browser errors', errors);
    return out;
  } finally { await context.close(); }
};

/**
 * SDV-04 (autobyteus-461 CR-461-042, rule 1 / rule 3): the reopened row, rendered. The Manager's view is open; the Manager sets
 * the worker's Task DONE (the row leaves when the worker stops); it reopens the Task and continues the worker by run ID: the
 * worker's row is listed under the Manager again, live, with no reload.
 */
const caseReopenedRow = async () => {
  const s = await setupRoot('agent', 'SdvReopen');
  const { page, errors, context } = await newPage();
  const out = { root: s.root.rootId, worker: s.worker };
  try {
    await openRoot(page, s.root, s.names);
    const row = page.locator(childRow('agent', s.worker));
    await row.waitFor({ state: 'visible', timeout: 30000 });
    const input = await managerInput(s.root);
    try {
      input.send(callTool('update_task', { task_id: s.taskId, status: 'DONE' }));
      await until('the worker row leaves after DONE', async () => (await row.count()) === 0, 60000);
      out.leftAfterDone = true;
      await shot(page, 'sdv-04-after-done');
      input.send(callTool('update_task', { task_id: s.taskId, status: 'IN_PROGRESS' }));
      await sleep(1500);
      input.send(callTool('send_message_to', { target_agent_run_id: s.worker, content: 'Continue the notes. Marker REOPENED-ROW.' }));
      await until('the worker row is back, live', async () => (await row.count()) > 0 && await row.first().isVisible(), 60000);
      out.backAfterReopen = true;
      await shot(page, 'sdv-04-row-back');
    } finally { input.close(); }
    assert(errors.length === 0, 'browser errors', errors);
    return out;
  } catch (error) {
    await shot(page, 'sdv-04-failed').catch(() => undefined);
    error.details = { ...(error.details ?? {}), ...out };
    throw error;
  } finally { await context.close(); }
};

/**
 * C15-03 (DS-15, rendered two-view check): the user's message to a closed delegated run is refused with base's text, and nothing
 * moves anywhere else: the run is not restored, its row does not return to the delegator's view, and the delegator's own row in
 * the list keeps its status. Page B has the worker selected (its own conversation and composer) when its Task closes; page A
 * shows the delegator's view.
 */
const caseClosedRunInput = async () => {
  const s = await setupRoot('agent', 'SdvClosed');
  const a = await newPage();
  const b = await newPage();
  const out = { root: s.root.rootId, worker: s.worker };
  try {
    await openRoot(a.page, s.root, s.names);
    await openRoot(b.page, s.root, s.names);
    const rowA = a.page.locator(childRow('agent', s.worker));
    await rowA.waitFor({ state: 'visible', timeout: 30000 });
    // C15-03 (CRR-039): page B opens the delegated run from its delegator's row while its Task is open, and keeps that view
    // open across the closure (a closed run's line on its Task's card is not openable, as at base: AR-002, REQ-009).
    const workerRowB = b.page.locator(childRow('agent', s.worker)).first();
    await workerRowB.waitFor({ state: 'visible', timeout: 30000 });
    await workerRowB.click();
    await until("page B shows the worker's own conversation", async () => {
      const text = await centerText(b.page); return text.includes('Write the notes') && !text.includes('update_task'); }, 30000);
    out.workerOpenBeforeClosure = true;
    await shot(b.page, 'sdv-05-worker-open');
    const input = await managerInput(s.root);
    try {
      input.send(callTool('update_task', { task_id: s.taskId, status: 'DONE' }));
      await until('the worker row leaves page A after DONE', async () => (await rowA.count()) === 0, 60000);
    } finally { input.close(); }
    // CRR-039: base's `returnToHostWhenUnlisted` (agentRunCollaborationStore, af690af334; the same at 827f1e68dc and 3d738de6e6)
    // returns the view to the run's own agent when a selected child leaves the listing (its Task is DONE). So the web has no
    // still-open view of a closed delegated run to send from: C15-03 is not applicable in the rendered layer and stays proven at
    // the server (the DS-15 suite, DRO-3). The case checks base's return and the rest of the two views; it sends nothing.
    await until("page B's view returns to the delegator (base's returnToHostWhenUnlisted)", async () => {
      const text = await centerText(b.page); return text.includes('update_task'); }, 30000);
    out.pageBReturnedToDelegator = true;
    await shot(b.page, 'sdv-05-returned-to-delegator');
    const rootDotBefore = await rootRowDot(a.page, s.root);
    const samples = [];
    for (let i = 0; i < 10; i++) {
      samples.push({ workerRowInA: await rowA.count(), rootDot: await rootRowDot(a.page, s.root),
        workerActive: Boolean((await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}', { id: s.worker })).getAgentRunResumeConfig?.isActive) });
      await sleep(1000);
    }
    out.samples = samples;
    assert(samples.every((x) => x.workerRowInA === 0), "the closed run's row returned to the delegator's view", out);
    assert(samples.every((x) => !x.workerActive), 'the closed run was restored', out);
    assert(samples.every((x) => x.rootDot === rootDotBefore), "the delegator's row in the list changed status", { ...out, rootDotBefore });
    await shot(a.page, 'sdv-05-delegator-view');
    assert(a.errors.length === 0 && b.errors.length === 0, 'browser errors', [...a.errors, ...b.errors]);
    return out;
  } catch (error) {
    await shot(b.page, 'sdv-05-failed').catch(() => undefined);
    error.details = { ...(error.details ?? {}), ...out };
    throw error;
  } finally { await a.context.close(); await b.context.close(); }
};

/** A Project's Task root as the server reports it (start, ingress run, team run). */
const taskRootOf = async (projectId, taskId) => ((await gql('query($id:String!){projectTasks(projectId:$id){taskId root{kind start ingressAgentRunId teamRunId}}}', { id: projectId }))
  .projectTasks.find((t) => t.taskId === taskId) ?? {}).root ?? null;
const createTask = async (projectId, title, description) => (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}',
  { input: { projectId, title, description } })).createProjectTask.taskId;

/**
 * CR-461-076 / SR-080 (CRR-040): a worker opens from its Task's card (the Projects panel) for every delegator kind (Agent, Team,
 * Org) and worker kind (an Agent, a Team: its coordinator): the center shows that worker's own conversation. (A Task's root is
 * always one hop from its assigner: a task agent cannot assign a Task, contract §2.1 — its own delegation is sub-work of its Task,
 * not a root; a nested task-Team member is PMU-019.)
 */
const caseTaskCardMatrix = async () => {
  const out = {};
  for (const kind of ['agent', 'team', 'org']) {
    const { ids, names } = await definitions(`Mx${kind}`);
    const projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: `Matrix ${kind} ${randomUUID().slice(0, 6)}` } })).createProject.projectId;
    const tAgent = await createTask(projectId, 'Agent work.', 'Agent work.');
    const tTeam = await createTask(projectId, 'Team work.', 'Team work.');
    const root = await createRoot(kind, ids);
    const input = await managerInput(root);
    try {
      for (const [taskId, recipient] of [[tAgent, names.worker], [tTeam, names.squad]]) {
        input.send(callTool('delegate_task', { recipient_address: `/${segment(recipient)}`, task_id: taskId }));
        await until(`${kind}: ${taskId} started`, async () => (await taskRootOf(projectId, taskId))?.start === 'started', 90000);
      }
    } finally { input.close(); }
    const { page, errors, context } = await newPage();
    const record = {};
    try {
      // CRR-042 (F-59): from the Workspace page's docked Projects panel and from the Projects page's board.
      for (const surface of ['workspace', 'projects']) {
        for (const [label, taskId, text] of [['agent worker', tAgent, 'Agent work.'], ['team worker', tTeam, 'Team work.']]) {
          let line;
          if (surface === 'workspace') {
            await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 });
            await page.locator('[data-test="right-side-tab-list"] [data-tab-name="projects"]').click();
            const panel = page.locator('[data-test="right-side-projects-panel"]');
            await panel.getByTestId('projects-panel-picker-select').selectOption(`project:${projectId}`);
            line = panel.locator(`[data-testid="project-task-row-${taskId}"] [data-testid^="project-task-root-"][data-openable="true"]`).first();
          } else {
            await page.goto(`${stack.frontendUrl}/projects/${projectId}`, { waitUntil: 'networkidle', timeout: 120000 });
            line = page.locator(`[data-testid="project-task-row-${taskId}"] [data-testid^="project-task-root-"][data-openable="true"]`).first();
          }
          await line.waitFor({ state: 'visible', timeout: 60000 });
          await line.click();
          await until(`${kind} delegator, ${surface}, ${label}: its own conversation in the center`, async () => {
            const center = await centerText(page).catch(() => ''); return center.includes(text) && /You have a new task from/.test(center); }, 30000);
          record[`${surface}: ${label}`] = 'opened';
          await shot(page, `sdv-06-${kind}-${surface}-${label.replace(/ /g, '-')}`);
        }
      }
      assert(errors.length === 0, 'browser errors', errors);
      out[kind] = record;
    } catch (error) {
      await shot(page, `sdv-06-${kind}-failed`).catch(() => undefined);
      error.details = { ...(error.details ?? {}), kind, record, out };
      throw error;
    } finally { await context.close(); }
  }
  return out;
};

/** CR-461-076 (CRR-040): a running delegated Team opens from its row in the delegator's view (Agent and Team delegators). */
const caseRunningTeamRow = async () => {
  const out = {};
  for (const kind of ['agent', 'team', 'org']) {
    const { ids, names } = await definitions(`Row${kind}`);
    const projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: `Row ${kind} ${randomUUID().slice(0, 6)}` } })).createProject.projectId;
    const taskId = await createTask(projectId, 'Team row work.', 'Team row work.');
    const root = await createRoot(kind, ids);
    const input = await managerInput(root);
    input.send(callTool('delegate_task', { recipient_address: `/${segment(names.squad)}`, task_id: taskId }));
    await until(`${kind}: the team started`, async () => (await taskRootOf(projectId, taskId))?.start === 'started', 90000);
    input.close();
    const { page, errors, context } = await newPage();
    try {
      await openRoot(page, root, names);
      const teamRow = kind === 'org'
        ? page.locator('[data-test="workspace-team-transient-execution-row"][data-delegated-run-kind="task_team"]').first()
        : page.locator(`[data-test="workspace-team-transient-execution-row"][data-node-kind="agent_team"][data-member-address="/${segment(names.squad)}"]`).first();
      await until(`${kind}: the delegated Team's row`, async () => {
        if (await teamRow.isVisible().catch(() => false)) return true;
        for (const toggle of await page.locator('[data-test^="agent-org-run-disclosure-"][aria-expanded="false"], [data-test="workspace-team-transient-disclosure"]').all()) await toggle.click().catch(() => undefined);
        return false;
      }, 60000);
      // autobyteus-461 SR-083 step 3 (FU-031, FU-024): every tree opens a delegated Team from its own row, at its coordinator
      // (the row's server-built open target), in Agent, Team and Org delegators alike.
      await teamRow.click();
      await until(`${kind}: the running delegated Team's coordinator conversation`, async () => {
        const center = await centerText(page); return center.includes('Team row work.') && /You have a new task from/.test(center); }, 30000);
      await shot(page, `sdv-07-${kind}-team-row-opened`);
      assert(errors.length === 0, 'browser errors', errors);
      out[kind] = 'opened';
    } catch (error) {
      await shot(page, `sdv-07-${kind}-failed`).catch(() => undefined);
      error.details = { ...(error.details ?? {}), kind, out };
      throw error;
    } finally { await context.close(); }
  }
  return out;
};

const CASES = {
  'SDV-01': ['Agent-run view: Stop with the view open reconnects (C3-06); the worker answers live; the Manager stays stopped; its message starts it', caseAgentRun],
  'SDV-02': ['Team view: stored mode while stopped; the worker answers live; the team stays stopped; a message to its own member restores it live (SR-048)', () => caseStoppedRoot('team')],
  'SDV-03': ['Org view: stored mode while stopped; the worker answers live; the org stays stopped; it starts on its first input', () => caseStoppedRoot('org')],
  'SDV-04': ["Agent-run view: the worker's row leaves at DONE and is listed again, live, after the Manager reopens and continues it (CR-461-042)", caseReopenedRow],
  'SDV-06': ["CR-461-076 / SR-080: a worker opens from its Task's card for every delegator kind × worker kind", caseTaskCardMatrix],
  'SDV-07': ["CR-461-076, SR-083 (FU-031): a running delegated Team opens from its own row, at its coordinator, in Agent, Team and Org delegators", caseRunningTeamRow],
  'SDV-05': ["C15-03: with the closed run's view open when its Task closes, the view returns to the delegator as at base (no rendered path to message a closed run); its row stays gone and the delegator's row keeps its status", caseClosedRunInput],
};

let result = 'Pass';
try {
  if (fs.existsSync(evidencePath)) throw new Error(`Refusing to overwrite ${evidencePath}; use a fresh --output-dir`);
  await fsp.mkdir(outputDir, { recursive: true });
  assert(executablePath, 'No Chrome found; pass --browser-executable');
  await startStack();
  await ensureWorkspace();
  browser = await chromium.launch({ headless: true, executablePath });
  evidence.browserVersion = browser.version();
  for (const id of selectedCases) {
    const [description, fn] = CASES[id] ?? [];
    if (!fn) throw new Error(`Unknown case ${id}`);
    try {
      evidence.cases[id] = { result: 'Pass', description, details: await fn() };
    } catch (error) {
      result = 'Fail';
      evidence.cases[id] = { result: 'Fail', description, message: error.message, details: error.details };
      evidence.failures.push({ id, message: error.message });
    }
    await save();
  }
} catch (error) {
  result = 'Fail';
  evidence.failures.push({ id: 'HARNESS', message: error.message, details: error.details });
} finally {
  for (const socket of sockets) socket.terminate();
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; } catch (e) { result = 'Fail'; evidence.cleanup.browser = `failed: ${e.message}`; }
  try { evidence.cleanup.frontend = await stopGroup(stack.frontend); } catch (e) { result = 'Fail'; evidence.cleanup.frontend = `failed: ${e.message}`; }
  try { evidence.cleanup.backend = await stopGroup(stack.backend); } catch (e) { result = 'Fail'; evidence.cleanup.backend = `failed: ${e.message}`; }
  try { if (stack.dataRoot) await fsp.rm(stack.dataRoot, { recursive: true, force: true }); evidence.cleanup.dataRootRemoved = !stack.dataRoot || !fs.existsSync(stack.dataRoot); }
  catch (e) { result = 'Fail'; evidence.cleanup.dataRootRemoved = `failed: ${e.message}`; }
  evidence.result = result; evidence.finishedAt = new Date().toISOString();
  if (fs.existsSync(outputDir)) await save();
}
process.stdout.write(`Stopped delegator views probe: ${result}. Evidence: ${evidencePath}\n`);
process.exit(result === 'Pass' ? 0 : 1);

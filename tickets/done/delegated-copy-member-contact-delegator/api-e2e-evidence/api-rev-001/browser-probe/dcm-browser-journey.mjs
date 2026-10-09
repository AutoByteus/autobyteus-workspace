#!/usr/bin/env node
// TEMPORARY API/E2E probe (API-REV-001, not durable coverage): the real task-child composer `@` menu and send in a
// standalone Agent run, against a probe-owned built backend (autobyteus-server-ts/dist/app.js) with the scripted AGY CLI,
// a probe-owned Nuxt dev frontend and a fresh headless Chrome. Stack setup and selectors follow
// autobyteus-web/tests/e2e/task-closure-tree-probe.mjs.
// Usage: node dcm-browser-journey.mjs <worktree root> <fresh output dir>
// Cases:
//   BJ-001 (AC-001): the Team-copy reviewer composer's `@` menu lists the host; its candidates request carries
//          focusedAgentRunId = reviewer; the host composer's menu does not list the host (request focused = host).
//   BJ-002 (AC-002/AC-003): the user chooses `@<host>` in the reviewer composer and sends a scripted send_message_to;
//          the host's existing run receives it, the Team tab shows reviewer → host, the user bubble hides the note,
//          and no run is added.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const worktree = path.resolve(process.argv[2]);
const outputDir = path.resolve(process.argv[3]);
const webDir = path.join(worktree, 'autobyteus-web');
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const WebSocket = require('ws');
const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((c) => fs.existsSync(c));

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
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;

const evidence = { startedAt: new Date().toISOString(), executablePath, cases: {}, cleanup: {}, failures: [] };
const save = () => fsp.writeFile(path.join(outputDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);

const stack = { dataRoot: '', backendUrl: '', frontendUrl: '', backend: null, frontend: null };
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
  AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'),
  AUTOBYTEUS_MEMORY_DIR: path.join(stack.dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(stack.dataRoot, 'temp_workspace') });
const startStack = async () => {
  assert(fs.existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first');
  stack.dataRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'dcm-browser-journey-'));
  stack.home = await fsp.mkdtemp(path.join(os.tmpdir(), 'dcm-browser-home-'));
  for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'workspace']) await fsp.mkdir(path.join(stack.dataRoot, dir));
  const backendPort = await freePort(); const frontendPort = await freePort();
  stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv()).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  // AUTOBYTEUS_* from the shell are dropped (no user package roots); HOME is disposable so the fake AGY writes nothing in the real home.
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('AUTOBYTEUS_'))), ...backendEnv(), HOME: stack.home,
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' };
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', stack.dataRoot],
    serverDir, env, 'backend');
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 180000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...process.env, NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TRANSCRIPTION_WS_ENDPOINT: `${ws}/ws/transcribe`, BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`,
      BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => { if (exited(stack.frontend)) throw new Error('Nuxt exited'); return (await fetch(stack.frontendUrl)).ok; }, 240000);
  evidence.stack = { backendUrl: stack.backendUrl, frontendUrl: stack.frontendUrl, dataRoot: stack.dataRoot };
};
const gql = async (query, variables = {}) => {
  const response = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const objectsIn = (v) => Array.isArray(v) ? v.flatMap(objectsIn) : (!v || typeof v !== 'object') ? [] : [v, ...Object.values(v).flatMap(objectsIn)];
const taskNodes = (tree) => objectsIn(tree).filter((v) => typeof (v.startedAt ?? v.started_at) === 'string' && (v.agentRunId ?? v.agent_run_id ?? v.teamRunId ?? v.team_run_id))
  .map((v) => ({ agentRunId: v.teamRunId ?? v.team_run_id ? undefined : v.agentRunId ?? v.agent_run_id, teamRunId: v.teamRunId ?? v.team_run_id, address: v.address,
    members: (v.members ?? []).map((m) => ({ address: m.address, agentRunId: m.agentRunId ?? m.agent_run_id })) }));

let browser; const sockets = [];
const runCase = async (id, title, fn) => {
  const started = Date.now();
  try { evidence.cases[id] = { title, result: 'Pass', ...(await fn()), ms: Date.now() - started }; }
  catch (error) { evidence.cases[id] = { title, result: 'Fail', error: error.message, details: error.details, ms: Date.now() - started }; evidence.failures.push(id); }
  await save();
  console.log(`${id} ${evidence.cases[id].result}${evidence.cases[id].error ? `: ${evidence.cases[id].error}` : ''}`);
};

try {
  await fsp.mkdir(outputDir, { recursive: false });
  await startStack();
  browser = await chromium.launch({ executablePath, headless: true });
  const suffix = randomUUID().slice(0, 4);
  const names = { manager: `Project Manager ${suffix}`, lead: `Review Lead ${suffix}`, reviewer: `Code Reviewer ${suffix}`, squad: `Review Team ${suffix}` };
  const agent = async (name) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: `${name} description`, instructions: 'Follow the request.', toolNames: [] } })).createAgentDefinition.id;
  const ids = { manager: await agent(names.manager), lead: await agent(names.lead), reviewer: await agent(names.reviewer) };
  ids.squad = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
    { input: { name: names.squad, description: 'Review team', instructions: 'Review.', coordinatorMemberName: 'lead',
      nodes: [{ memberName: 'lead', ref: ids.lead, refScope: 'SHARED' }, { memberName: 'reviewer', ref: ids.reviewer, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  const workspace = path.join(stack.dataRoot, 'workspace');
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => null);
  const run = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: ids.manager,
    workspaceRootPath: workspace, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' } })).createAgentRun;
  assert(run.success, run.message);
  const hostRunId = run.runId;
  const hostAddress = `/${segment(names.manager)}`;
  // The host delegates the Team copy (the PM's own step, through its input channel).
  const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/agent/${hostRunId}`); sockets.push(socket);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: hostRunId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`,
    content: callTool('delegate_task', { recipient_address: `/${segment(names.squad)}`, description: 'Reply OK.' }), context_file_paths: [], image_urls: [] } }));
  const tree = async () => (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: hostRunId })).agentRunCollaboration?.root_agent;
  const copy = await until('Team copy', async () => taskNodes((await tree())?.execution_tree).find((n) => n.teamRunId && n.members.length === 2), 60000);
  const reviewer = copy.members.find((m) => m.address.endsWith('/reviewer'));
  evidence.setup = { hostRunId, hostAddress, ids, names, copy };

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Outdated Optimize Dep|dynamically imported module|error caught during app initialization/.test(m.text())) errors.push(m.text()); });
  const candidateRequests = [];
  page.on('request', (request) => {
    const body = request.postData();
    if (request.url().includes('/graphql') && body?.includes('collaboratorMentionCandidates')) candidateRequests.push(JSON.parse(body).variables);
  });
  await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 });
  await until('workspace rows', async () => (await page.locator('[data-test="workspace-row"]').count()) >= 1, 60000);
  await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first().click();
  await page.locator('[data-test="workspace-agent-row"]', { hasText: names.manager }).click();
  const runRow = page.locator('[data-test="workspace-agent-run-row"]');
  await until('agent run row', async () => (await runRow.count()) === 1, 30000);
  await runRow.click();
  await until('agent task tree', async () => (await page.locator('[data-test="workspace-agent-run-task-tree"]').count()) === 1, 30000);
  const teamRow = page.locator('[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]');
  await teamRow.waitFor({ state: 'visible', timeout: 30000 });
  if ((await teamRow.getAttribute('aria-expanded')) === 'false') await teamRow.locator('[data-test="workspace-team-transient-disclosure"]').click();
  const reviewerRow = page.locator(`[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${reviewer.agentRunId}"]`);
  await reviewerRow.waitFor({ state: 'visible', timeout: 30000 });
  const composer = () => page.locator('[data-test="workspace-center-pane"] textarea').first();
  const menu = page.locator('[data-test="run-mention-menu"]');
  const hostOption = page.locator(`[data-test="run-mention-option-${ids.manager}"]`);
  const openMenu = async (query) => {
    await composer().fill(''); await composer().pressSequentially(`@${query}`);
    await until('mention menu', () => menu.isVisible(), 20000);
    await sleep(600);
  };

  await runCase('BJ-001', 'reviewer composer @ lists the host; host composer @ does not (focused per composer)', async () => {
    await reviewerRow.click(); await sleep(800);
    const reviewerFrom = candidateRequests.length;
    await openMenu('');
    await until('host option in reviewer menu', () => hostOption.isVisible(), 20000);
    const reviewerMenu = await menu.innerText();
    await page.screenshot({ path: path.join(outputDir, 'bj-001-reviewer-menu.png') });
    const reviewerRequests = candidateRequests.slice(reviewerFrom);
    assert(reviewerRequests.some((v) => v.focusedAgentRunId === reviewer.agentRunId && v.rootRunId === hostRunId), 'reviewer request lacks focusedAgentRunId', reviewerRequests);
    await composer().press('Escape'); await composer().fill('');
    await runRow.click(); await sleep(800);
    const hostFrom = candidateRequests.length;
    await openMenu('');
    await until('host menu has options', async () => (await menu.locator('[data-test^="run-mention-option-"]').count()) > 0, 20000);
    const hostMenu = await menu.innerText();
    assert(await hostOption.count() === 0, 'host composer offers the host itself', hostMenu);
    await page.screenshot({ path: path.join(outputDir, 'bj-001-host-menu.png') });
    const hostRequests = candidateRequests.slice(hostFrom);
    assert(hostRequests.every((v) => v.focusedAgentRunId === hostRunId), 'host request focused ID mismatch', hostRequests);
    await composer().press('Escape'); await composer().fill('');
    return { reviewerMenu, hostMenu, reviewerRequests, hostRequests };
  });

  await runCase('BJ-002', 'user @host in the reviewer composer; the host run receives the reviewer message; Team tab; nothing added', async () => {
    const marker = `BROWSER_TICKET_${randomUUID().slice(0, 6)}`;
    const nodesBefore = taskNodes((await tree()).execution_tree).map((n) => n.teamRunId ?? n.agentRunId).sort();
    await reviewerRow.click(); await sleep(800);
    await composer().fill(callTool('send_message_to', { recipient_address: hostAddress, content: `Please create the follow-up ticket ${marker}.` }));
    // The `@` query is the space-free token before the caret.
    await composer().press('End'); await composer().pressSequentially(' @Project');
    await until('host option', () => hostOption.isVisible(), 20000).catch(async (error) => {
      await page.screenshot({ path: path.join(outputDir, 'bj-002-host-option-timeout.png') });
      error.details = { composer: await composer().inputValue(), menu: await menu.isVisible() ? await menu.innerText() : null }; throw error;
    });
    await hostOption.click();
    await sleep(300);
    const typed = await composer().inputValue();
    assert(typed.includes(`@${names.manager}`), 'chosen mention not inserted', typed);
    await page.screenshot({ path: path.join(outputDir, 'bj-002-reviewer-composer-chosen.png') });
    await composer().press('Enter');
    const hostConversation = async () => JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: hostRunId })).getRunProjection?.conversation ?? []);
    await until('host received the reviewer message', async () => (await hostConversation()).includes(marker), 60000);
    const memberConversation = JSON.stringify((await gql('query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}',
      { h: hostRunId, a: reviewer.address, r: reviewer.agentRunId })).agentRunCollaborationMemberProjection?.conversation ?? []);
    assert(memberConversation.includes(`at ${hostAddress}, the run's own agent`), 'stored note lacks the run-agent entry', memberConversation.slice(0, 1500));
    assert(memberConversation.includes(`Use send_message_to with recipient_address ${hostAddress} to message ${names.manager}; delegate_task cannot target it.`), 'stored note lacks the send_message_to sentence');
    assert(!memberConversation.includes('Delegate the work with delegate_task'), 'stored note offers delegate_task');
    // The rendered user bubble shows the user's text, not the note block.
    const center = await until('reviewer bubble rendered', async () => { const t = await page.locator('[data-test="workspace-center-pane"]').innerText(); return t.includes(marker) ? t : null; }, 30000);
    assert(!center.includes('[Mentioned collaborators]'), 'rendered bubble shows the raw note', center.slice(0, 2000));
    await page.screenshot({ path: path.join(outputDir, 'bj-002-reviewer-after-send.png') });
    await page.locator('[data-test="right-side-tab-list"]').getByText('Team', { exact: true }).click();
    await until('Team tab shows the reviewer message', async () => (await page.locator('[data-test="workspace-right-panel"]').innerText()).includes(marker), 20000);
    await page.screenshot({ path: path.join(outputDir, 'bj-002-team-tab.png') });
    const nodesAfter = taskNodes((await tree()).execution_tree).map((n) => n.teamRunId ?? n.agentRunId).sort();
    assert(JSON.stringify(nodesAfter) === JSON.stringify(nodesBefore), 'a run was added', { nodesBefore, nodesAfter });
    assert(((await tree()).execution_tree.collaborators ?? []).length === 0, 'a collaborator was added');
    // The host's conversation in the UI shows the received message.
    await runRow.click();
    await until('host conversation shows the message', async () => (await page.locator('[data-test="workspace-center-pane"]').innerText()).includes(marker), 30000);
    await page.screenshot({ path: path.join(outputDir, 'bj-002-host-conversation.png') });
    return { marker, nodesBefore, nodesAfter };
  });
  evidence.browserErrors = errors;
  if (errors.length) evidence.failures.push('browser-errors');
  await context.close();
  await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: hostRunId }).catch((e) => { evidence.cleanup.terminateError = String(e); });
} catch (error) {
  evidence.fatal = { message: error.message, details: error.details };
  evidence.failures.push('fatal');
} finally {
  for (const s of sockets) s.terminate();
  if (browser) await browser.close().catch(() => {});
  evidence.cleanup.frontend = await stopGroup(stack.frontend).catch((e) => String(e));
  evidence.cleanup.backend = await stopGroup(stack.backend).catch((e) => String(e));
  if (stack.dataRoot) await fsp.rm(stack.dataRoot, { recursive: true, force: true });
  if (stack.home) await fsp.rm(stack.home, { recursive: true, force: true });
  evidence.cleanup.dataRemoved = !fs.existsSync(stack.dataRoot);
  evidence.cleanup.homeRemoved = !fs.existsSync(stack.home);
  evidence.finishedAt = new Date().toISOString();
  await save().catch(() => {});
  console.log(JSON.stringify({ failures: evidence.failures, cleanup: evidence.cleanup }));
  process.exit(evidence.failures.length ? 1 : 0);
}

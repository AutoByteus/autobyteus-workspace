#!/usr/bin/env node
// autobyteus-446 reproduction (Solution Designer, investigation only; not a product test).
//
// One isolated node built from this worktree (temp data root and HOME, scripted AGY CLI: `CALL_TOOL:{…}` makes the agent
// call the real tool). A "Project Task Manager" (PTM) run delegates Task A to an agent and Task B to a Team, as the user's
// PTM delegated autobyteus-440 to a Software Engineering Team copy. A second, plain run "Other" exists.
//
// Two paired phones load the node's production phone bundle (`/mobile`) in headless Chrome at 390x844 (the phone host
// 192.168.77.10 is mapped to 127.0.0.1, so Host/Origin are a private address as on a LAN/tailnet):
//   phone-host   last opened the PTM run (it is the phone's selected run, as on the user's desktop, where the PM
//                conversation is open);
//   phone-other  last opened "Other" (the PTM is only listed, as on the user's phone).
// Both are back on the run list (the list polls every 5 s). Then the PTM closes Task A and Task B (update_task DONE).
// Measured per phone: when the delegated rows leave the list (up to --wait-s, default 90 s); then phone-other reloads.
//
// Usage: node closed-task-rows-repro.mjs --output-dir=<fresh dir> [--wait-s=90]
import { createWriteStream, existsSync, mkdtempSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const worktree = process.env.SD446_WORKTREE ?? '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-list-follow-446';
const webDir = path.join(worktree, 'autobyteus-web');
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
// Every node request needs a credential (autobyteus-437): the probes' own fixture supplies the launch owner credential.
const access = await import(path.join(webDir, 'tests', 'e2e', 'fixtures', 'probe-node-access.mjs'));
access.attachToProbeProcess();
const arg = (name, fallback) => {
  const hit = process.argv.find(v => v === `--${name}` || v.startsWith(`--${name}=`));
  return hit ? (hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true) : fallback;
};
const outputDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), `sd446-repro-${Date.now()}`)));
const waitMs = Number(arg('wait-s', 90)) * 1000;
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PHONE_HOST = '192.168.77.10';
const MODEL = 'gemini-3.8-flash-low';
const redact = t => access.redactCredentials(String(t)).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…').replace(/(access_token|pairing)=[^&\s"']+/g, '$1=…');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const summary = { startedAt: new Date().toISOString(), timeline: [], result: {}, error: null };
const log = (event, d = {}) => { const e = JSON.parse(redact(JSON.stringify({ t: Date.now() - t0, event, ...d }))); summary.timeline.push(e); console.log(JSON.stringify(e)); };
const waitFor = async (what, fn, timeoutMs = 60_000, every = 200) => {
  const end = Date.now() + timeoutMs; let last;
  while (Date.now() < end) { try { if (await fn()) return; } catch (e) { last = e; } await sleep(every); }
  throw new Error(`Timed out waiting for ${what}${last ? `: ${last.message}` : ''}`);
};
const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
await fs.mkdir(outputDir, { recursive: true });
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'sd446-repro-')));
const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const phoneOrigin = `http://${PHONE_HOST}:${port}`;
const dataDir = path.join(root, 'data'); const home = path.join(root, 'home');
await fs.mkdir(dataDir, { recursive: true }); await fs.mkdir(home, { recursive: true });
await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${base}\nAPP_ENV=test\nLOG_LEVEL=WARN\n`);
const serverLog = createWriteStream(path.join(outputDir, 'server.log'));
const server = spawn(process.execPath, [path.join(serverDir, 'dist', 'app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
  cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...access.probeNodeEnvironment(), PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', AUTOBYTEUS_SERVER_HOST: base,
    AUTOBYTEUS_ALLOWED_HOSTS: PHONE_HOST, ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests', 'fixtures', 'agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' } });
server.stdout.pipe(serverLog); server.stderr.pipe(serverLog);

let browser;
try {
  await waitFor('node health', async () => { if (server.exitCode !== null) throw new Error('server exited'); return fetch(`${base}/rest/health`).then(r => r.ok).catch(() => false); }, 120_000, 300);
  const gql = async (query, variables) => { const b = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json(); if (b.errors?.length || !b.data) throw new Error(JSON.stringify(b).slice(0, 600)); return b.data; };
  const rest = async (method, route, body) => { const r = await fetch(`${base}/rest${route}`, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
  const def = async (name, tools = []) => (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
    { i: { name, role: 'assistant', description: `${name} (446 repro)`, instructions: 'Follow the request.', toolNames: tools, defaultLaunchConfig: agy } })).createAgentDefinition.id;
  const ptmDef = await def('Project Task Manager', ['list_projects', 'list_project_tasks', 'create_task', 'update_task']);
  const writer = await def('Release Notes Writer'); const checker = await def('Fact Checker');
  await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: 'Docs Review Team', description: '446 repro', instructions: 'Work together.',
    coordinatorMemberName: 'reviewer', nodes: [{ memberName: 'reviewer', ref: writer, refScope: 'SHARED' }, { memberName: 'editor', ref: checker, refScope: 'SHARED' }], defaultLaunchConfig: agy } });
  const workspace = path.join(root, 'workspace'); await fs.mkdir(workspace, { recursive: true });
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
  const runConfig = { workspaceRootPath: workspace, autoExecuteTools: true, ...agy };
  const createRun = async (agentDefinitionId) => { const r = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId, ...runConfig } })).createAgentRun; if (!r.success) throw new Error(r.message); return r.runId; };
  const projection = async runId => JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
  const say = async (runId, content) => {
    const ws = new WebSocket(access.ownerSocketUrl(`${base.replace('http', 'ws')}/ws/agent/${runId}`));
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; }); await sleep(300);
    ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:repro:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: runId, content } }));
    await sleep(600); ws.close();
  };
  const call = async (runId, name, args) => {
    const before = (await projection(runId)).split('CALLED:').length;
    await say(runId, `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`);
    let text = '';
    await waitFor(`${name}`, async () => (text = await projection(runId)).split('CALLED:').length > before, 60_000);
    return text.split('CALLED:').at(-1);
  };
  const pick = (text, key) => new RegExp(`${key}\\\\*"\\s*:\\s*\\\\*"([^"\\\\]+)`).exec(text ?? '')?.[1];

  const other = await createRun(checker);
  await say(other, 'Hello from Other.');
  const project = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: `Repro ${randomUUID().slice(0, 6)}` } })).createProject.projectId;
  const task = async (title) => (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId taskKey}}', { input: { projectId: project, title, description: title } })).createProjectTask;
  const taskA = await task('Write the release notes.'); const taskB = await task('Review the docs site.');
  const ptm = await createRun(ptmDef);
  const writerRun = pick(await call(ptm, 'delegate_task', { recipient_address: '/release_notes_writer', task_id: taskA.taskId }), 'target_agent_run_id');
  const teamRun = pick(await call(ptm, 'delegate_task', { recipient_address: '/docs_review_team', task_id: taskB.taskId }), 'target_team_run_id');
  log('stack', { ptm, other, writerRun, teamRun, taskA: taskA.taskKey, taskB: taskB.taskKey });

  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
  const newPhone = async (storageState) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC', ...(storageState ? { storageState } : {}) });
    return { context, page: await context.newPage() };
  };
  await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
  const pairing = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Repro Node', trustedPrivateHttpAcknowledged: true });
  if (pairing.status !== 201) throw new Error(`pairing ${pairing.status}`);
  const hostPhone = await newPhone();
  await hostPhone.page.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await hostPhone.page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
  await hostPhone.page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
  const otherPhone = await newPhone(await hostPhone.context.storageState());
  await otherPhone.page.goto(`${phoneOrigin}/mobile`, { waitUntil: 'domcontentloaded' });
  await otherPhone.page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });

  const rowKeys = page => page.evaluate(() => [...document.querySelectorAll('[data-test="mobile-run-row"]')].map(li => li.getAttribute('data-testid')));
  const delegatedShown = async page => (await rowKeys(page)).filter(k => k.includes(writerRun) || k.includes(teamRun));
  const open = async (page, runId) => {
    await page.locator(`[data-testid="mobile-run-row-agent:${runId}"] [data-testid="mobile-run-open"]`).click();
    await waitFor('run screen', async () => (await page.evaluate(() => document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state'))) === 'open', 30_000);
    await sleep(1_500);
    await page.locator('[data-testid="mobile-run-back"]:visible').first().click();
    await page.locator('[data-testid="mobile-run-tree"]:visible').waitFor({ timeout: 20_000 });
  };
  const unfold = async (page) => { // make the PTM's delegated rows visible (unfold the PTM row if folded)
    const row = page.locator(`[data-testid="mobile-run-row-agent:${ptm}"]`);
    if ((await row.getAttribute('aria-expanded')) === 'false') await row.locator('[data-testid="mobile-run-toggle"]').click();
  };
  await open(hostPhone.page, ptm);
  await open(otherPhone.page, other);
  for (const p of [hostPhone.page, otherPhone.page]) await unfold(p);
  await waitFor('delegated rows listed on both phones', async () => (await delegatedShown(hostPhone.page)).length >= 2 && (await delegatedShown(otherPhone.page)).length >= 2, 60_000);
  log('before close', { host: await delegatedShown(hostPhone.page), other: await delegatedShown(otherPhone.page) });
  await hostPhone.page.screenshot({ path: path.join(outputDir, 'host-before.png') }); await otherPhone.page.screenshot({ path: path.join(outputDir, 'other-before.png') });

  await call(ptm, 'update_task', { task_id: taskA.taskId, status: 'DONE' });
  await call(ptm, 'update_task', { task_id: taskB.taskId, status: 'DONE' });
  const closedAt = Date.now(); log('tasks closed (both update_task calls returned)');
  const gone = { host: null, other: null };
  while (Date.now() - closedAt < waitMs && (gone.host === null || gone.other === null)) {
    if (gone.host === null && (await delegatedShown(hostPhone.page)).length === 0) gone.host = Date.now() - closedAt;
    if (gone.other === null && (await delegatedShown(otherPhone.page)).length === 0) gone.other = Date.now() - closedAt;
    await sleep(200);
  }
  await hostPhone.page.screenshot({ path: path.join(outputDir, 'host-after.png') }); await otherPhone.page.screenshot({ path: path.join(outputDir, 'other-after.png') });
  const otherStillShown = await delegatedShown(otherPhone.page);
  // Proof that the node agrees: the PTM's stored collaboration view lists both executions as closed.
  const closedOnNode = JSON.stringify((await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: ptm })).agentRunCollaboration).includes(teamRun);
  await otherPhone.page.reload({ waitUntil: 'domcontentloaded' });
  await otherPhone.page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 }); await unfold(otherPhone.page).catch(() => undefined); await sleep(4_000);
  const afterReload = await delegatedShown(otherPhone.page);
  await otherPhone.page.screenshot({ path: path.join(outputDir, 'other-after-reload.png') });
  summary.result = { waitedMs: waitMs, goneAfterMs: gone, otherStillShownAtEnd: otherStillShown, otherAfterReload: afterReload, nodeViewStillNamesTeamRun: closedOnNode };
  log('result', summary.result);
} catch (error) {
  summary.error = redact(error.stack ?? String(error)); console.error(summary.error); process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  server.kill('SIGTERM'); await Promise.race([new Promise(r => server.once('close', r)), sleep(10_000)]);
  if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  summary.cleanup = { serverExited: server.exitCode !== null || server.signalCode !== null, rootRemoved: !existsSync(root) };
  await fs.writeFile(path.join(outputDir, 'repro-summary.json'), `${redact(JSON.stringify(summary, null, 2))}\n`);
  process.exit(process.exitCode ?? 0);
}

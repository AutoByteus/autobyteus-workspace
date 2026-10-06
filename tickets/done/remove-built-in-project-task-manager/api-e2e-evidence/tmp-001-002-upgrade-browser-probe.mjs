#!/usr/bin/env node
// TEMPORARY API/E2E probe (TMP-001 + TMP-002) for remove-built-in-project-task-manager. Not durable coverage.
// TMP-001: a real base-commit (1aa918298, = v1.4.95-beta.3 content) server writes the installed built-in copy and an
//          old Project Task Manager conversation; the reviewed new dist then upgrades the same owned data.
// TMP-002: a free-port Nuxt dev frontend + headless Chrome against the upgraded backend: history panel, reading the old
//          conversation, trying to continue it, and continuing another conversation.
// Usage (from the worktree root): node <this file> <base-worktree> <fresh-output-dir>
// Only the LM Studio inference service is emulated. Never touches the user's app/data: everything lives in one mkdtemp root.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import http from 'node:http';
import path from 'node:path';
import { once } from 'node:events';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const worktree = process.cwd();
const server = path.join(worktree, 'autobyteus-server-ts'), web = path.join(worktree, 'autobyteus-web');
// Real path: dist/app.js only starts when argv[1] equals its own module URL (macOS /tmp is a symlink to /private/tmp).
const baseWorktree = await fs.realpath(path.resolve(process.argv[2]));
const out = path.resolve(process.argv[3]);
assert(existsSync(path.join(baseWorktree, 'autobyteus-server-ts/dist/app.js')), 'base dist missing');
assert(existsSync(path.join(server, 'dist/app.js')), 'new dist missing');
assert(!existsSync(out), 'Use a fresh output directory');
await fs.mkdir(out, { recursive: true });
const { chromium } = createRequire(path.join(web, 'package.json'))('playwright-core');
const WebSocket = createRequire(path.join(server, 'package.json'))('ws');

const RETIRED_ID = 'autobyteus-project-task-manager', REPOSITORY_ID = 'project-task-manager';
const MIGRATION_ID = '20261006_remove_built_in_project_task_manager';
const evidence = { startedAt: new Date().toISOString(), baseWorktree, cases: {}, pageErrors: [], consoleErrors: [], cleanup: {} };
const save = () => fs.writeFile(path.join(out, 'result.json'), JSON.stringify(evidence, null, 2) + '\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wait = async (label, fn, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return; await sleep(100); } throw new Error('Timeout: ' + label); };
const freePort = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const sha = buf => createHash('sha256').update(buf).digest('hex');
const snapshot = async dir => { const o = {}; const walk = async c => { for (const e of await fs.readdir(c, { withFileTypes: true })) { const f = path.join(c, e.name), r = path.relative(dir, f); if (e.isDirectory()) { o[r + '/'] = 'dir'; await walk(f); } else o[r] = sha(await fs.readFile(f)); } }; await walk(dir); return o; };
const exists = p => fs.lstat(p).then(() => true, () => false);

const children = [];
let owned, provider, browser, onFail = null;
const env = Object.fromEntries(['PATH', 'TMPDIR', 'LANG', 'USER', 'SHELL'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
const start = (cmd, args, cwd, extra, name) => {
  const log = createWriteStream(path.join(out, name + '.log'), { flags: 'a' });
  const child = spawn(cmd, args, { cwd, env: { ...env, ...extra }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log); child.once('close', () => log.end()); children.push(child); return child;
};
const stop = async child => {
  if (!child || child.exitCode !== null || child.signalCode !== null) return 'already-exited';
  process.kill(-child.pid, 'SIGTERM');
  try { await wait('owned process exit', () => child.exitCode !== null || child.signalCode !== null, 12000); return 'SIGTERM'; }
  catch { process.kill(-child.pid, 'SIGKILL'); await wait('killed', () => child.exitCode !== null || child.signalCode !== null); return 'SIGKILL'; }
};
const record = async (id, fn) => {
  evidence.cases[id] = { result: 'Running' }; await save();
  try { evidence.cases[id].observed = await fn(); evidence.cases[id].result = 'Pass'; }
  catch (e) { evidence.cases[id] = { ...evidence.cases[id], result: "Fail", error: e.stack }; if (onFail) await onFail(id); throw e; }
  finally { await save(); }
};

try {
  owned = await fs.mkdtemp(path.join(os.tmpdir(), 'ptm-upgrade-probe-'));
  const data = path.join(owned, 'data'), pkg = path.join(owned, 'agent-repository'), home = path.join(owned, 'home'), workspace = path.join(owned, 'workspace');
  for (const d of [data, home, workspace]) await fs.mkdir(d, { recursive: true });
  const repo = path.join(pkg, 'agents', REPOSITORY_ID);
  await fs.mkdir(path.join(repo, 'skills', 'project-task-management'), { recursive: true });
  await fs.writeFile(path.join(repo, 'agent.md'), '---\nname: Project Task Manager\ndescription: Agent-repository Project Task Manager.\nrole: Project Task Manager\n---\n\nManage Projects with the project-task-management skill.\n');
  await fs.writeFile(path.join(repo, 'agent-config.json'), JSON.stringify({ toolNames: ['list_projects', 'list_project_tasks'], skillNames: ['project-task-management'] }));
  await fs.writeFile(path.join(repo, 'skills', 'project-task-management', 'SKILL.md'), '---\nname: project-task-management\ndescription: Manage Project Tasks.\n---\n\n# Project task management\n');

  provider = http.createServer(async (req, res) => {
    if (req.url === '/api/v1/models') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ models: [{ key: 'retired-ptm-fixture', max_context_length: 32768, loaded_instances: [{ config: { context_length: 32768 } }] }] })); return; }
    let body = ''; for await (const c of req) body += c;
    if (req.url !== '/v1/chat/completions') { res.writeHead(404); res.end(); return; }
    const last = JSON.parse(body).messages.at(-1); const prompt = typeof last?.content === 'string' ? last.content : JSON.stringify(last?.content ?? '');
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const base = { id: randomUUID(), object: 'chat.completion.chunk', created: 1, model: 'retired-ptm-fixture' };
    for (const choice of [{ index: 0, delta: { role: 'assistant', content: `Reply to: ${prompt.includes('launch') ? 'launch plan' : 'field notes'}` }, finish_reason: null }, { index: 0, delta: {}, finish_reason: 'stop' }]) res.write(`data: ${JSON.stringify({ ...base, choices: [choice] })}\n\n`);
    res.end('data: [DONE]\n\n');
  });
  provider.listen(0, '127.0.0.1'); await once(provider, 'listening');
  const providerOrigin = `http://127.0.0.1:${provider.address().port}`;

  const port = await freePort(), webPort = await freePort(); const backendUrl = `http://127.0.0.1:${port}`;
  await fs.writeFile(path.join(data, '.env'), `APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`);
  const backendEnv = { HOME: home, DATABASE_URL: `file:${path.join(data, 'db', 'production.db')}`, AUTOBYTEUS_AGENT_PACKAGE_ROOTS: pkg, LMSTUDIO_HOSTS: providerOrigin };
  evidence.isolation = { owned, data, backendUrl, providerOrigin };
  let backend;
  const startBackend = async (serverDir, name) => {
    backend = start(process.execPath, [path.join(serverDir, 'dist/app.js'), '--data-dir', data, '--host', '127.0.0.1', '--port', String(port)], serverDir, backendEnv, name);
    await wait(name + ' health', async () => { assert.equal(backend.exitCode, null, name + ' exited'); return fetch(backendUrl + '/rest/health').then(r => r.ok).catch(() => false); }, 120000);
  };
  const gql = async (query, variables = {}) => { const r = await fetch(backendUrl + '/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); const b = await r.json(); assert.equal(b.errors, undefined, JSON.stringify(b.errors)); return b.data; };
  const ptms = async () => (await gql('{agentDefinitions{id name}}')).agentDefinitions.filter(d => d.name === 'Project Task Manager').map(d => d.id).sort();
  const migration = async () => (await gql('{getAppDataMigrations{migrationId status attempts summary recoveryAction}}')).getAppDataMigrations.find(m => m.migrationId === MIGRATION_ID) ?? null;
  const send = (runId, content) => new Promise((resolve, reject) => {
    const ws = new WebSocket(`${backendUrl.replace('http:', 'ws:')}/ws/agent/${runId}`); const events = [];
    const timer = setTimeout(() => { ws.close(); reject(new Error('send timeout ' + JSON.stringify(events))); }, 30000);
    ws.on('message', d => { const e = JSON.parse(String(d)); events.push(e);
      if (e.type === 'CONNECTED') ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { content, message_id: 'probe-' + randomUUID(), dedupe_key: 'agent_run_input:probe:' + randomUUID(), context_file_paths: [], image_urls: [] } }));
      if (e.type === 'ERROR') { clearTimeout(timer); ws.close(); reject(new Error(JSON.stringify(e))); }
      if (events.some(x => x.type === 'ASSISTANT_COMPLETE') && e.type === 'AGENT_STATUS' && e.payload.status === 'idle') { clearTimeout(timer); ws.close(); resolve(events); } });
  });
  const createRun = async id => { const c = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: id, llmModelIdentifier: evidence.model, llmConfig: null, autoExecuteTools: false, runtimeKind: 'autobyteus', workspaceRootPath: workspace } })).createAgentRun; assert.equal(c.success, true, c.message); return c.runId; };
  const terminate = async id => assert.equal((await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id })).terminateAgentRun.success, true);
  const projection = async id => JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id })).getRunProjection.conversation);
  const historyGroups = async () => (await gql('{listWorkspaceRunHistory(limitPerAgent:20){workspaceRootPath agentDefinitions{agentDefinitionId agentName runs{runId summary isActive status}}}}')).listWorkspaceRunHistory;
  let oldRunId, otherRunId, userAgentId, projectId, preservedBefore;
  const preserved = async () => ({ repository: await snapshot(pkg), userAgent: await snapshot(path.join(data, 'agents', userAgentId)), projects: await snapshot(path.join(data, 'projects')), oldRun: await snapshot(path.join(data, 'memory', 'agents', oldRunId)), otherRun: await snapshot(path.join(data, 'memory', 'agents', otherRunId)) });

  await record('TMP-001a-base-beta-install', async () => {
    await startBackend(path.join(baseWorktree, 'autobyteus-server-ts'), 'backend-base');
    const installed = path.join(data, 'agents', RETIRED_ID);
    const fixture = path.join(server, 'tests/fixtures/app-data-migrations/retired-built-in-project-task-manager');
    const bytesMatchFixture = {};
    for (const f of ['agent.md', 'agent-config.json']) bytesMatchFixture[f] = sha(await fs.readFile(path.join(installed, f))) === sha(await fs.readFile(path.join(fixture, f)));
    const duplicate = await ptms();
    assert.deepEqual(duplicate, [RETIRED_ID, REPOSITORY_ID]);
    assert.equal(await migration(), null);
    await gql('mutation($value:String!){updateServerSetting(key:"LMSTUDIO_HOSTS",value:$value)}', { value: providerOrigin });
    const reloaded = await gql('mutation{reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}');
    evidence.model = reloaded.reloadProviderModelCatalog.llmModels.find(m => m.modelIdentifier.startsWith('retired-ptm-fixture:')).modelIdentifier;
    oldRunId = await createRun(RETIRED_ID); await send(oldRunId, 'Plan my launch Project.'); await terminate(oldRunId);
    userAgentId = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name: 'Field Notes Writer', role: 'Writer', description: 'User agent', instructions: 'Reply briefly.', toolNames: [] } })).createAgentDefinition.id;
    otherRunId = await createRun(userAgentId); await send(otherRunId, 'Write field notes.'); await terminate(otherRunId);
    projectId = (await gql('mutation{createProject(input:{name:"Launch"}){projectId}}')).createProject.projectId;
    evidence.cases['TMP-001a-base-beta-install'].stop = await stop(backend);
    preservedBefore = await preserved();
    return { installedCopyWrittenByBase: bytesMatchFixture, catalogProjectTaskManagers: duplicate, oldRunId, otherRunId, userAgentId, projectId };
  });

  await record('TMP-001b-new-version-upgrade', async () => {
    await startBackend(server, 'backend-new');
    const m = await migration();
    assert.equal(m.status, 'SUCCEEDED'); assert.equal(m.attempts, 1);
    assert.equal(await exists(path.join(data, 'agents', RETIRED_ID)), false);
    const after = await ptms(); assert.deepEqual(after, [REPOSITORY_ID]);
    assert.deepEqual(await preserved(), preservedBefore);
    const groups = await historyGroups();
    const oldGroup = groups.flatMap(g => g.agentDefinitions).find(g => g.agentDefinitionId === RETIRED_ID);
    assert.equal(oldGroup.agentName, 'Project Task Manager'); assert.equal(oldGroup.runs[0].runId, oldRunId);
    const conversation = await projection(oldRunId);
    assert(conversation.includes('Plan my launch Project.') && conversation.includes('Reply to: launch plan'));
    return { migration: m, catalogProjectTaskManagers: after, preservedByteIdentical: true, oldHistoryGroup: oldGroup };
  });

  const frontend = start('pnpm', ['exec', 'nuxt', 'dev', '--host', '127.0.0.1', '--port', String(webPort)], web, { HOME: process.env.HOME, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl }, 'frontend');
  const base = `http://127.0.0.1:${webPort}`; evidence.isolation.frontendUrl = base;
  await wait('Nuxt ready', async () => { assert.equal(frontend.exitCode, null, 'nuxt exited'); return fetch(base + '/workspace').then(r => r.ok).catch(() => false); }, 300000);
  const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(existsSync);
  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', e => evidence.pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') evidence.consoleErrors.push(m.text()); });
  const runRow = text => page.locator('[data-test="workspace-agent-run-row"]').filter({ hasText: text });
  const composer = () => page.locator('textarea:visible').last();
  const sendUi = async text => { await composer().fill(text); await composer().press('Enter'); };
  const bodyText = () => page.locator('body').innerText();

  const failureCapture = async id => { await page.screenshot({ path: path.join(out, id + '-failure.png') }).catch(() => {}); evidence.cases[id].body = await bodyText().catch(() => ''); };
  onFail = failureCapture;
  // Expand each agent group once, by its visible name, only while its runs are not shown (clicking toggles).
  const expandAgent = async (agentName, runText) => {
    if (await runRow(runText).count()) return;
    await page.locator('[data-test="workspace-agent-row"]').filter({ hasText: agentName }).first().click();
    await runRow(runText).first().waitFor({ timeout: 15000 });
  };
  const expandAll = async () => {
    if (!(await page.locator('[data-test="workspace-agent-row"]').count())) {
      // The row element and its toggle button both carry aria-expanded; click only the owned workspace's button.
      await page.locator('[data-test="workspace-row"][data-workspace-root$="/workspace"] > button[aria-expanded="false"]').first().click();
      await page.locator('[data-test="workspace-agent-row"]').first().waitFor({ timeout: 15000 });
    }
    await expandAgent('Project Task Manager', 'Plan my launch Project'); await expandAgent('Field Notes Writer', 'Write field notes'); };
  await record('TMP-002a-history-panel-lists-old-run', async () => {
    try {
      // A cold Nuxt dev server reloads once after dependency optimization (TESTING.md); navigate again after it settles.
      await page.goto(base + '/workspace'); await sleep(8000); await page.goto(base + '/workspace');
      await page.locator('[data-test="workspace-row"]').first().waitFor({ timeout: 60000 });
      await wait('history rows', async () => { await expandAll(); return (await page.locator('[data-test="workspace-agent-run-row"]').count()) >= 2; }, 60000);
    } catch (e) { await failureCapture('TMP-002a-history-panel-lists-old-run'); throw e; }
    const agentRows = await page.locator('[data-test="workspace-agent-row"]').allInnerTexts();
    const runRows = await page.locator('[data-test="workspace-agent-run-row"]').allInnerTexts();
    await page.screenshot({ path: path.join(out, 'TMP-002a-history.png') });
    assert(agentRows.some(t => t.includes('Project Task Manager')), 'old agent group missing');
    assert.equal(await runRow('Plan my launch Project').count(), 1);
    return { agentRows, runRows };
  });

  await record('TMP-002b-open-and-read-old-run', async () => {
    await runRow('Plan my launch Project').click();
    await page.getByText('Reply to: launch plan').first().waitFor();
    await page.getByText('Plan my launch Project.').first().waitFor();
    await page.screenshot({ path: path.join(out, 'TMP-002b-old-run-open.png') });
    return { readable: true };
  });

  await record('TMP-002c-continue-old-run-fails-like-deleted-agent', async () => {
    const before = await bodyText();
    await sendUi('Continue the plan.');
    await wait('visible failure', async () => /not found/i.test(await bodyText()), 30000).catch(() => {});
    await sleep(1500);
    const after = await bodyText();
    await page.screenshot({ path: path.join(out, 'TMP-002c-continue-old-run.png') });
    const failureLines = after.split('\n').filter(l => /not found|error|failed|unavailable/i.test(l)).slice(0, 20);
    assert.equal((after.match(/Reply to: launch plan/g) || []).length, (before.match(/Reply to: launch plan/g) || []).length, 'old run unexpectedly answered');
    assert(/AgentDefinition with ID autobyteus-project-task-manager not found/i.test(after), 'not-found failure not visible: ' + failureLines.join(' | '));
    return { failureLines, pageErrorsSoFar: [...evidence.pageErrors] };
  });

  await record('TMP-002d-app-keeps-working', async () => {
    assert.equal(await runRow('Plan my launch Project').count(), 1, 'old run vanished from history');
    await runRow('Write field notes').click();
    await page.getByText('Reply to: field notes').first().waitFor();
    await sendUi('Write more field notes.');
    await wait('second reply', async () => (await page.getByText('Reply to: field notes').count()) >= 2, 45000);
    await page.screenshot({ path: path.join(out, 'TMP-002d-other-run-continued.png') });
    const rows = await page.locator('[data-test="workspace-agent-run-row"]').allInnerTexts();
    assert.equal((await fetch(backendUrl + '/rest/health')).status, 200);
    return { otherRunReplies: await page.getByText('Reply to: field notes').count(), runRows: rows };
  });
  evidence.result = 'Pass';
} catch (error) {
  evidence.result = 'Fail'; evidence.error = error.stack;
  throw error;
} finally {
  if (browser) { await browser.close().catch(() => {}); evidence.cleanup.browser = 'closed'; }
  for (const c of children) evidence.cleanup[`pid-${c.pid}`] = await stop(c).catch(e => String(e));
  if (provider) { provider.closeAllConnections(); provider.close(); evidence.cleanup.provider = 'closed'; }
  if (owned) { await fs.rm(owned, { recursive: true, force: true }); evidence.cleanup.ownedRootRemoved = !existsSync(owned); }
  evidence.finishedAt = new Date().toISOString(); await save();
}

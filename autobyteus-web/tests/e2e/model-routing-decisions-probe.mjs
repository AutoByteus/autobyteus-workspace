#!/usr/bin/env node
// Model Routing with real routed data (autobyteus-32 API-14): two disposable backend nodes (`autobyteus-server-ts/dist/app.js`)
// on fresh data roots, a Nuxt frontend bound to the first ("alpha"), driven in headless Chrome. The runtime is the scripted
// AGY CLI (`autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`, `linked_skills`): a delegating run calls real tools
// with `CALL_TOOL:{…}`, and each node's Model Router is a real agent run on the same CLI that answers routing requests as the
// node's plan file says (real `submit_launch_choices`). No inference, no account, no network.
// Data, through public APIs: alpha has a Manager (no default) and a Studio Team (Lead with its own default, Writer with none);
// beta has Blank Slate (no default). Model Routing is on on both nodes, remote collaboration on, the nodes are peers. The
// Manager delegates the Studio Team (the router chooses for Writer) and, on beta, Blank Slate (beta's router chooses).
// Cases:
//   MRD-01 Setup: the router row (the app's model menu with the saved launch, autobyteus-313; no native select) and the
//          status line of a node whose router is active (AC-009);
//   MRD-02 Decisions: the Task blocks; the Team row folds and opens to Lead (agent default) and Writer (Model Router, model,
//          reason); the remote copy is not on alpha's page (each node shows only its own); the source filter (AC-009);
//   MRD-03 Overview: the period and the sources and task kinds of these records (AC-009);
//   MRD-04 the Manager run's Settings: the delegated rows show runtime, model, source and reason for the routed member and
//          for the remote copy (from the peer's launches) (AC-012);
//   MRD-05 beta's window: its own Decisions list the copy alpha delegated, with no "Open run" (UXJ-008, VIS-011);
//   MRD-06 Simplified Chinese: Decisions and Overview are translated (AC-009);
//   MRD-08 New chat `@`: with internal agents shown, the Model Router is never offered as a mention (DEL-F1);
//   MRD-07 no browser errors.
// Every case records Pass/Fail in <output-dir>/result.json with screenshots; owned processes and the temp root are removed.
// Prerequisite: a current server build (`pnpm -C autobyteus-server-ts build`).
// Usage: node tests/e2e/model-routing-decisions-probe.mjs [--output-dir=...] [--browser-executable=...]
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const WebSocket = createRequire(path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), 'autobyteus-server-ts', 'package.json'))('ws');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.dirname(webDir);
const serverDir = path.join(root, 'autobyteus-server-ts');
const agyCli = path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs');
const arg = (name, fallback) => { const v = process.argv.find((i) => i.startsWith(`--${name}=`)); return v ? v.slice(name.length + 3) : fallback; };
const outputDir = path.resolve(webDir, arg('output-dir', `test-results/model-routing-decisions-${Date.now()}`));
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const AGY = 'antigravity_cli';
const MODEL = 'gemini-3.8-flash-low';
const ALT = 'alt-model';
/** autobyteus-313: Decisions name models as the model menu does: the catalog's label (the scripted CLI's model names) and the runtime's short name. */
const LABEL_OF = { [MODEL]: 'Gemini test', [ALT]: 'Retiring test model' };
const LABEL = { alpha: 'alpha-node', beta: 'beta-node' };
const REASON = { alpha: 'Writing goes to the alternate model.', beta: 'Beta keeps writing on the alternate model.' };
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', cases: {}, observations: {}, browserErrors: [], cleanup: {}, error: null };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const exited = (child) => child.exitCode !== null || child.signalCode !== null;
const choosePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const waitFor = async (label, check, ms = 60000, every = 300) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await check()) return; await sleep(every); } throw new Error(`Timed out: ${label}`); };
const start = (command, args, cwd, env, logPath) => {
  const log = createWriteStream(logPath, { flags: 'a' });
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log); child.once('close', () => log.end());
  return child;
};
const run = (command, args, cwd, env, logPath) => new Promise((resolve, reject) => {
  const child = start(command, args, cwd, env, logPath);
  child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}; see ${logPath}`)));
});
const stop = async (child) => {
  if (!child) return 'not-started';
  for (const signal of ['SIGTERM', 'SIGKILL']) { if (exited(child)) break; try { process.kill(-child.pid, signal); } catch {} await Promise.race([new Promise((r) => child.once('close', r)), sleep(8000)]); }
  return exited(child) ? `terminated:${child.pid}` : `still running:${child.pid}`;
};
const scrubbedEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !key.startsWith('ENABLE_') && !key.startsWith('AUTOBYTEUS_') && !/^(CODEX_|CLAUDE_|GROK_|ANTIGRAVITY_|AGY_|FAKE_)/.test(key) && !/_API_KEY$/.test(key)));

const createNode = async (ownedRoot, name) => {
  const dataRoot = path.join(ownedRoot, name);
  const databasePath = path.join(dataRoot, 'db', 'node.db');
  for (const folder of ['db', 'logs', 'memory', 'temp_workspace', 'home', 'workspace']) await fs.mkdir(path.join(dataRoot, folder), { recursive: true });
  const port = await choosePort();
  const url = `http://127.0.0.1:${port}`;
  const databaseUrl = pathToFileURL(databasePath).href;
  const planFile = path.join(dataRoot, 'router-plan.json');
  const env = { ...scrubbedEnv(), HOME: path.join(dataRoot, 'home'), BROWSER: '', AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: '', AUTOBYTEUS_SKILLS_PATHS: '',
    APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl, AUTOBYTEUS_SERVER_HOST: url, AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
    ANTIGRAVITY_CLI_COMMAND: agyCli, AGY_FAKE_CASE: 'linked_skills', AGY_FAKE_EXTRA_MODELS: ALT, AGY_FAKE_ROUTER_PLAN: planFile, AGY_FAKE_ROUTER_LOG: path.join(dataRoot, 'router-log.jsonl'),
    CODEX_APP_SERVER_COMMAND: path.join(ownedRoot, 'missing', 'codex'), GROK_BUILD_COMMAND: path.join(ownedRoot, 'missing', 'grok') };
  await fs.writeFile(path.join(dataRoot, '.env'), ['APP_ENV=development', 'DB_TYPE=sqlite', `DATABASE_URL=${databaseUrl}`, `AUTOBYTEUS_SERVER_HOST=${url}`].join('\n') + '\n');
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], root, { ...env, HOME: os.homedir() }, path.join(outputDir, `${name}-migrate.log`));
  return { name, dataRoot, port, url, env, planFile, process: null, nodeId: null };
};
const startNode = async (node) => {
  node.process = start(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(node.port), '--data-dir', node.dataRoot], serverDir, node.env, path.join(outputDir, `${node.name}.log`));
  await waitFor(`${node.name} health`, async () => { if (exited(node.process)) throw new Error(`${node.name} exited`); return fetch(`${node.url}/rest/health`).then((r) => r.ok).catch(() => false); }, 120000);
  node.nodeId = (await (await fetch(`${node.url}/rest/remote-access/status`)).json()).nodeId;
};
const gql = async (node, query, variables = {}) => {
  const response = await fetch(`${node.url}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(`GraphQL failed: ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
};
const definition = async (node, name, defaultLaunchConfig = null) => (await gql(node, 'mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
  { i: { name, role: 'assistant', description: `${name} (Model Routing UI probe)`, instructions: 'Follow the request.', toolNames: [], ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id;
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
/** The run calls one real tool (scripted AGY) and the probe reads its `CALLED:` result from the run's conversation. */
const calls = async (node, runId, name, args) => {
  const conversation = async () => JSON.stringify((await gql(node, 'query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
  const count = (text) => (text.match(/CALLED:/g) ?? []).length;
  const before = count(await conversation());
  const socket = new WebSocket(`ws://127.0.0.1:${node.port}/ws/agent/${runId}`);
  const frames = []; socket.on('message', (raw) => frames.push(JSON.parse(String(raw))));
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  await waitFor('socket connected', () => frames.some((f) => f.type === 'CONNECTED'), 30000);
  const id = randomUUID();
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: runId, content: callTool(name, args), message_id: id, dedupe_key: id, command_id: randomUUID(), context_file_paths: [], image_urls: [] } }));
  let text = '';
  await waitFor(`${name} result`, async () => count(text = await conversation()) > before, 120000, 500);
  socket.close();
  const raw = text.split('CALLED:')[before + 1];
  return raw.slice(0, 2000);
};

let page;
const shot = async (name) => { await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true }); };
const tid = (id) => `[data-testid="${id}"]`;
const dt = (id) => `[data-test="${id}"]`;
const textOf = async (selector) => (await page.locator(selector).first().innerText()).replace(/\s+/g, ' ').trim();
const kase = async (id, title, body) => {
  const t0 = Date.now();
  try { await body(); evidence.cases[id] = { title, result: 'Pass', ms: Date.now() - t0 }; }
  catch (error) { evidence.cases[id] = { title, result: 'Fail', ms: Date.now() - t0, error: error.message }; await shot(`${id}-failure`).catch(() => undefined); }
  console.log(`${evidence.cases[id].result} ${id} ${title}${evidence.cases[id].error ? `: ${evidence.cases[id].error}` : ''}`);
};
const bindWindow = (entryId, url) => page.evaluate(([id, base]) => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  pinia._s.get('windowNodeContext').bindNodeContext(id, base);
}, [entryId, url]);

let ownedRoot, alpha, beta, frontend, browser;
try {
  await fs.mkdir(outputDir, { recursive: true });
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'mr-decisions-probe-')));
  alpha = await createNode(ownedRoot, 'alpha');
  beta = await createNode(ownedRoot, 'beta');
  await fs.writeFile(alpha.planFile, JSON.stringify({ mode: 'valid', runtime: AGY, model: ALT, taskKind: 'writing', reason: REASON.alpha, readRuntimes: true }));
  await fs.writeFile(beta.planFile, JSON.stringify({ mode: 'valid', runtime: AGY, model: ALT, taskKind: 'writing', reason: REASON.beta, readRuntimes: true }));
  await Promise.all([startNode(alpha), startNode(beta)]);
  for (const node of [alpha, beta]) {
    await gql(node, 'mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
    await gql(node, 'mutation($r:String!,$m:String!){setModelRouterLaunch(runtimeKind:$r, llmModelIdentifier:$m)}', { r: AGY, m: MODEL });
    evidence.observations[`${node.name}Status`] = (await gql(node, 'mutation{setModelRoutingEnabled(enabled:true)}')).setModelRoutingEnabled;
  }
  await gql(alpha, 'mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { nodeId: beta.nodeId, baseUrl: beta.url, name: LABEL.beta } });
  await gql(beta, 'mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { nodeId: alpha.nodeId, baseUrl: alpha.url, name: LABEL.alpha } });
  const ids = {};
  ids.manager = await definition(alpha, 'Manager');
  ids.lead = await definition(alpha, 'Lead', { runtimeKind: AGY, llmModelIdentifier: MODEL, llmConfig: null });
  ids.writer = await definition(alpha, 'Writer');
  ids.team = (await gql(alpha, 'mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: 'Studio', description: 'Studio (Model Routing UI probe)',
    instructions: 'Work as a team.', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: ids.lead, refScope: 'SHARED' }, { memberName: 'writer', ref: ids.writer, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  ids.blank = await definition(beta, 'Blank Slate');
  const created = (await gql(alpha, 'mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: ids.manager,
    workspaceRootPath: path.join(alpha.dataRoot, 'workspace'), llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: AGY } })).createAgentRun;
  assert(created.success, created.message);
  ids.managerRun = created.runId;
  evidence.observations.localDelegation = await calls(alpha, ids.managerRun, 'delegate_task', { recipient_address: '/studio', description: 'Draft the launch announcement. Reply OK.' });
  evidence.observations.remoteDelegation = await calls(alpha, ids.managerRun, 'delegate_task', { node: LABEL.beta, recipient_address: '/blank_slate', description: 'Write the release note. Reply OK.' });
  assert(evidence.observations.localDelegation.includes('chosen by the Model Router'), `local delegation routed: ${evidence.observations.localDelegation}`);
  assert(evidence.observations.remoteDelegation.includes('chosen by the Model Router'), `remote delegation routed: ${evidence.observations.remoteDelegation}`);
  evidence.ids = ids;

  const frontendPort = await choosePort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  evidence.isolation = { tempRoot: ownedRoot, alpha: alpha.url, beta: beta.url, frontend: frontendUrl };
  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...scrubbedEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: alpha.url }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend', async () => { if (exited(frontend)) throw new Error('frontend exited'); return fetch(frontendUrl).then((r) => r.ok).catch(() => false); }, 240000);
  browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'Europe/Berlin' });
  await context.addInitScript(() => { if (!localStorage.getItem('autobyteus.localization.preference-mode')) localStorage.setItem('autobyteus.localization.preference-mode', 'en'); });
  page = await context.newPage();
  page.on('pageerror', (e) => evidence.browserErrors.push(e.message));
  const openTab = async (tab) => {
    await page.goto(`${frontendUrl}/settings?section=model-routing&tab=${tab}`, { waitUntil: 'domcontentloaded' });
    await page.locator(tid(`model-routing-tab-${tab}`)).waitFor({ timeout: 120000 });
    await page.locator(tid(`model-routing-tab-${tab}`)).click();
    await sleep(1500);
  };
  // A cold Nuxt dev server re-optimizes dependencies and reloads once: warm it up before asserting (TESTING.md).
  await openTab('setup'); await sleep(6000);

  await kase('MRD-01', 'Setup: the router row and the status of an active router', async () => {
    await openTab('setup');
    await page.locator(tid('model-routing-router-row')).waitFor({ timeout: 60000 });
    // autobyteus-313: the app's model menu shows the saved launch as "<model label> <short runtime name>".
    const trigger = page.locator(`${tid('model-routing-router-row')} [data-test="chat-model-trigger"]`);
    await trigger.waitFor({ timeout: 60000 });
    await waitFor('router model label', async () => !/choose/i.test(await trigger.innerText()), 30000);
    const launch = (await trigger.innerText()).replace(/\s+/g, ' ').trim();
    const nativeSelects = await page.locator(`${tid('model-routing-setup')} select`).count();
    const status = await textOf(tid('model-routing-status')).catch(() => '');
    evidence.observations.setup = { launch, nativeSelects, status, switchChecked: await page.locator(tid('model-routing-switch')).getAttribute('aria-checked').catch(() => null) };
    assert(launch.endsWith('Antigravity CLI') && launch.length > 'Antigravity CLI'.length, `router launch shown in the model menu: ${launch}`);
    assert(nativeSelects === 0, `no native select on Configuration (${nativeSelects})`);
    assert(evidence.observations.setup.switchChecked === 'true', `switch: ${evidence.observations.setup.switchChecked}`);
    assert(!(await page.locator(tid('model-routing-decisions-inactive-note')).count()), 'no inactive note');
    await shot('MRD-01-setup');
  });

  await kase('MRD-02', 'Decisions: Task blocks, the Team row folds and opens to its agents with source and reason; the remote copy is not on this node; the filter', async () => {
    await openTab('decisions');
    await page.locator(tid('model-routing-decisions-list')).waitFor({ timeout: 60000 });
    const team = page.locator(tid('model-routing-delegation-/studio')).first();
    await team.waitFor({ timeout: 30000 });
    const folded = (await team.innerText()).replace(/\s+/g, ' ').trim();
    assert(await team.getAttribute('aria-expanded') === 'false', 'the Team row starts folded');
    await team.click(); await sleep(500);
    const rows = await page.locator(`${tid('model-routing-decision-/studio')} ${tid('model-routing-decision-row')}`).allInnerTexts();
    const clean = rows.map((r) => r.replace(/\s+/g, ' ').trim());
    evidence.observations.decisions = { tasks: await page.locator('[data-testid^="model-routing-task-"]').count(), folded, rows: clean, page: await textOf(tid('model-routing-decisions')) };
    const writer = clean.find((r) => /writer/i.test(r)); const lead = clean.find((r) => /lead/i.test(r));
    assert(writer && writer.includes(`${LABEL_OF[ALT]} Antigravity`) && writer.includes(REASON.alpha), `Writer row: ${writer}`);
    assert(lead && lead.includes(`${LABEL_OF[MODEL]} Antigravity`) && !lead.includes(REASON.alpha), `Lead row: ${lead}`);
    assert(!(await page.locator(tid('model-routing-decision-/blank_slate')).count()), 'the copy on beta is not on alpha\'s Decisions');
    assert(await page.locator(tid('model-routing-decision-open-run')).count() > 0, 'Open run on a local delegation');
    await shot('MRD-02-decisions');
    // The source filter.
    const options = page.locator('[role="radio"][data-testid^="model-routing-filter-"]');
    evidence.observations.filterOptions = await options.evaluateAll((els) => els.map((el) => `${el.getAttribute('data-testid')}=${el.textContent.trim()}`));
    await options.filter({ hasText: /Model Router/ }).first().click(); await sleep(1000);
    const filteredTeam = page.locator(tid('model-routing-delegation-/studio')).first();
    const filteredFolded = (await filteredTeam.innerText()).replace(/\s+/g, ' ').trim();
    if (await filteredTeam.getAttribute('aria-expanded') === 'false') { await filteredTeam.click(); await sleep(500); }
    const filteredRows = (await page.locator(`${tid('model-routing-decision-/studio')} ${tid('model-routing-decision-row')}`).allInnerTexts()).map((r) => r.replace(/\s+/g, ' ').trim());
    evidence.observations.filteredRouter = { folded: filteredFolded, rows: filteredRows, page: await textOf(tid('model-routing-decisions')) };
    assert(filteredRows.length === 1 && filteredRows[0].includes(REASON.alpha), `only the routed record under the Router filter: ${JSON.stringify(filteredRows)}`);
    await shot('MRD-02-decisions-filter-router');
  });

  await kase('MRD-03', 'Overview: period, sources and task kinds of these records', async () => {
    await openTab('overview');
    await page.locator(tid('model-routing-overview')).waitFor({ timeout: 60000 });
    await page.locator(tid('model-routing-overview-sources')).waitFor({ timeout: 30000 });
    evidence.observations.overview = { sources: await textOf(tid('model-routing-overview-sources')), kinds: await textOf(tid('model-routing-overview-kinds')), page: await textOf(tid('model-routing-overview')) };
    assert(/writing/i.test(evidence.observations.overview.kinds), `task kinds: ${evidence.observations.overview.kinds}`);
    assert(/Model Router/.test(evidence.observations.overview.sources), `sources: ${evidence.observations.overview.sources}`);
    await shot('MRD-03-overview');
  });

  await kase('MRD-04', 'The Manager run\'s Settings: the delegated rows show runtime, model, source and reason (local member and remote copy)', async () => {
    await page.goto(`${frontendUrl}/chat?id=${ids.managerRun}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="agent-workspace-surface"]').waitFor({ timeout: 120000 }); await sleep(2500);
    await page.locator(dt('workspace-header-edit-config')).click();
    await page.locator(dt('existing-run-settings')).waitFor({ timeout: 60000 }); await sleep(2000);
    const section = page.locator(dt('run-delegated-launches'));
    await section.waitFor({ timeout: 60000 });
    for (let round = 0; round < 6; round += 1) {
      const closed = section.locator(`${dt('run-member-toggle')}[aria-expanded="false"]`);
      const count = await closed.count(); if (!count) break;
      for (let i = 0; i < count; i += 1) { await closed.first().click(); await sleep(150); }
    }
    const rows = await section.locator('[data-source]').evaluateAll((els) => els.map((el) => {
      const own = (s) => [...el.querySelectorAll(s)].filter((n) => n.closest('[data-source]') === el);
      return { test: el.getAttribute('data-test'), source: el.getAttribute('data-source'), summary: own('[data-test="run-member-summary"]')[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        reason: own('[data-test="run-member-routing-reason"]')[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? null, text: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 300) };
    }));
    evidence.observations.settingsRows = rows;
    const writer = rows.find((r) => /writer/.test(r.test ?? ''));
    const remote = rows.find((r) => /blank_slate/.test(r.test ?? ''));
    // Rows name the model by its display name (the scripted CLI calls alt-model "Retiring test model").
    assert(writer && writer.source === 'model_router' && /Model Router · writing/.test(writer.summary) && (writer.reason ?? '').includes(REASON.alpha), `writer row: ${JSON.stringify(writer)}`);
    assert(rows.find((r) => /\/studio\/lead@/.test(r.test ?? ''))?.source === 'agent_default', 'lead row: agent default');
    assert(remote && remote.source === 'model_router' && remote.text.includes(LABEL.beta) && /Model Router · writing/.test(remote.summary) && (remote.reason ?? '').includes(REASON.beta), `remote row: ${JSON.stringify(remote)}`);
    await shot('MRD-04-run-settings');
  });

  await kase('MRD-05', 'beta\'s window: its own Decisions list the copy alpha delegated, without "Open run"', async () => {
    await openTab('decisions');
    await bindWindow('mr-probe-beta', beta.url); await sleep(2500);
    await openTab('decisions').catch(() => undefined);
    await bindWindow('mr-probe-beta', beta.url); await sleep(2500);
    await page.locator(tid('model-routing-decisions-list')).waitFor({ timeout: 60000 });
    evidence.observations.betaDecisions = { page: await textOf(tid('model-routing-decisions')), node: await textOf(tid('model-routing-node')).catch(() => null) };
    assert(/blank slate/i.test(evidence.observations.betaDecisions.page) && evidence.observations.betaDecisions.page.includes(REASON.beta), `beta decisions: ${evidence.observations.betaDecisions.page}`);
    assert(!(await page.locator(tid('model-routing-decision-open-run')).count()), 'no Open run for a peer-started copy');
    assert(!evidence.observations.betaDecisions.page.includes(REASON.alpha), 'alpha\'s records are not on beta');
    await shot('MRD-05-beta-decisions');
    await bindWindow('mr-probe-alpha-again', alpha.url); await sleep(1500);
  });

  await kase('MRD-08', 'New chat `@`: with internal agents shown, the Model Router is listed among the agents but never offered as a mention (DEL-F1)', async () => {
    await gql(alpha, 'mutation{ updateServerSetting(key: "AUTOBYTEUS_SHOW_INTERNAL_AGENTS", value: "true") }');
    try {
      const listed = (await gql(alpha, '{ agentDefinitions { id internal } }')).agentDefinitions;
      assert(listed.some((d) => d.id === 'autobyteus-model-router' && d.internal), 'the router is listed while internal agents are shown');
      await page.goto(`${frontendUrl}/chat`, { waitUntil: 'domcontentloaded' });
      await page.locator(dt('chat-new')).waitFor({ timeout: 120000 }); await sleep(1500);
      await page.locator(dt('run-target-switcher-trigger')).click();
      await page.locator(dt('run-target-switcher-search')).fill('Manager');
      await page.locator(dt(`run-target-switcher-option-${ids.manager}`)).click();
      await page.locator(dt('run-target-switcher-menu')).waitFor({ state: 'detached', timeout: 30000 });
      const input = page.locator(`${dt('chat-composer')} textarea`).first();
      await input.click(); await input.fill(''); await page.keyboard.type('@');
      await page.locator(dt('run-mention-menu')).waitFor({ timeout: 30000 });
      await waitFor('mention options', async () => (await page.locator(`${dt('run-mention-menu')} [data-test^="run-mention-option-"]`).count()) > 0, 30000);
      await sleep(500);
      const options = await page.locator(`${dt('run-mention-menu')} [data-test^="run-mention-option-"]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('run-mention-option-', '')));
      await page.keyboard.type('Model'); await sleep(800);
      const filtered = await page.locator(`${dt('run-mention-menu')} [data-test^="run-mention-option-"]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('run-mention-option-', '')));
      evidence.observations.newChatMentions = { options, filteredModel: filtered, menu: await textOf(dt('run-mention-menu')).catch(() => null) };
      await shot('MRD-08-new-chat-mentions');
      assert(options.includes(ids.writer), `a shared agent is offered (positive control): ${JSON.stringify(options)}`);
      assert(!options.some((o) => o.includes('autobyteus-model-router')) && !filtered.some((o) => o.includes('autobyteus-model-router')), `the Model Router is never offered: ${JSON.stringify({ options, filtered })}`);
      await page.keyboard.press('Escape');
    } finally {
      await gql(alpha, 'mutation{ updateServerSetting(key: "AUTOBYTEUS_SHOW_INTERNAL_AGENTS", value: "false") }');
    }
  });

  await kase('MRD-06', 'Simplified Chinese: Decisions and Overview are translated', async () => {
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    try {
      await openTab('decisions');
      await page.locator(tid('model-routing-decisions-list')).waitFor({ timeout: 60000 });
      const decisions = await textOf(tid('model-routing-decisions'));
      await shot('MRD-06-decisions-zh-CN');
      await openTab('overview');
      await page.locator(tid('model-routing-overview-sources')).waitFor({ timeout: 30000 });
      const overview = await textOf(tid('model-routing-overview'));
      await shot('MRD-06-overview-zh-CN');
      evidence.observations.zh = { decisions, overview };
      for (const [name, text] of Object.entries({ decisions, overview })) {
        assert(/[一-鿿]/.test(text), `${name} has Chinese text`);
        assert(!/settings\.modelRouting\./.test(text), `${name} has no raw message keys`);
      }
    } finally { await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en')); }
  });

  await kase('MRD-07', 'No browser errors', async () => { assert(evidence.browserErrors.length === 0, `browser errors: ${evidence.browserErrors.join(' | ')}`); });
  evidence.result = Object.values(evidence.cases).every((c) => c.result === 'Pass') ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = error.stack || String(error);
} finally {
  evidence.cleanup.browser = browser ? await browser.close().then(() => 'closed', (e) => e.message) : 'not-started';
  evidence.cleanup.frontend = await stop(frontend).catch((e) => e.message);
  evidence.cleanup.alpha = await stop(alpha?.process).catch((e) => e.message);
  evidence.cleanup.beta = await stop(beta?.process).catch((e) => e.message);
  if (ownedRoot) evidence.cleanup.tempRoot = await fs.rm(ownedRoot, { recursive: true, force: true }).then(() => 'removed', (e) => e.message);
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(evidence, null, 2));
  console.log(`Model Routing decisions probe: ${evidence.result}${evidence.error ? ` (${evidence.error.split('\n')[0]})` : ''} → ${outputDir}`);
  process.exitCode = evidence.result === 'Pass' ? 0 : 1;
}

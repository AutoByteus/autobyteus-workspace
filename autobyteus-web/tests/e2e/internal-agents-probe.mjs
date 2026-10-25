#!/usr/bin/env node
// Real-stack run of internal agents (autobyteus-308): one disposable backend node (`autobyteus-server-ts/dist/app.js`) on a
// fresh data root and a Nuxt frontend bound to it, driven in headless Chrome. The node has a synthesized internal agent
// (`agents/<id>/agent.md` + `agent-config.json` `{"internal": true}`, written before it starts, as a shipped helper is)
// and a normal agent, each with one real recorded run on the scripted AGY CLI
// (`autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`; no model, no account, no network).
// Cases: IP-01 while hidden (the default) the Agents page, the agent store every picker reads, the featured-items picker
// and the run history panel leave the internal agent out, normal agents unchanged; IP-02 its run opens by URL while
// hidden and shows the agent's reply, and opening it does not add it to the list the pickers read (REQ-008); IP-03 Settings → Server Settings → Basics "Internal agents" toggled on:
// the setting is saved, and without a reload the Agents page shows it with the "Internal" badge, the store and the
// featured picker have it, the history panel lists its run; IP-04 toggled off again: all of it gone, without a reload;
// IP-05 zh-CN card. Every case records Pass/Fail in <output-dir>/result.json with screenshots; owned processes and the
// temp root are always removed.
//
// Prerequisite: a current server build (`pnpm -C autobyteus-server-ts build`, or drop --skip-server-build).
// Usage: node tests/e2e/internal-agents-probe.mjs [--skip-server-build] [--output-dir=...] [--browser-executable=...]
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const WebSocket = require('ws');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.dirname(webDir);
const serverDir = path.join(root, 'autobyteus-server-ts');
const agyCli = path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/internal-agents'));
const skipServerBuild = process.argv.includes('--skip-server-build');
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const timeoutMs = 30000;
const INTERNAL_ID = 'probe-internal-helper';
const INTERNAL_NAME = 'Probe Internal Helper';
const NORMAL_NAME = `Probe Normal ${randomUUID().slice(0, 4)}`;
const SETTING = 'AUTOBYTEUS_SHOW_INTERNAL_AGENTS';
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', platform: `${process.platform}-${process.arch}`, node: process.version, cases: {}, browserErrors: [], cleanup: {}, error: null };

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (description, fn, ms = timeoutMs) => {
  const deadline = Date.now() + ms;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await fn()) return; } catch (error) { lastError = error; }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};
const choosePort = () => new Promise((resolve, reject) => {
  const socket = net.createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => { const { port } = socket.address(); socket.close(() => resolve(port)); });
});
const exited = child => child.exitCode !== null || child.signalCode !== null;
const start = (command, args, cwd, env, logPath) => {
  const log = createWriteStream(logPath, { flags: 'a' });
  const child = spawn(command, args, { cwd, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log);
  child.once('close', () => log.end());
  return child;
};
const run = (command, args, cwd, env, logPath) => new Promise((resolve, reject) => {
  const child = start(command, args, cwd, env, logPath);
  child.once('error', reject);
  child.once('close', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited ${code}/${signal}; see ${logPath}`)));
});
const stop = async child => {
  if (!child) return 'not-started';
  for (const signal of ['SIGTERM', 'SIGKILL']) {
    if (exited(child)) break;
    if (process.platform !== 'win32') process.kill(-child.pid, signal); else child.kill(signal);
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(8000)]);
  }
  assert(exited(child), `Owned child ${child.pid} did not exit`);
  return `terminated:${child.pid}`;
};
const scrubbedEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !key.startsWith('ENABLE_') && !key.startsWith('AUTOBYTEUS_') && !/^(CODEX_|CLAUDE_|GROK_|ANTIGRAVITY_|AGY_|FAKE_)/.test(key) && !/_API_KEY$/.test(key)));

let ownedRoot, node, frontend, browser, page;
const gql = async (query, variables = {}) => {
  const response = await fetch(`${node.url}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(`GraphQL failed: ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
};
/** A real recorded run: created and messaged through the public API, as a system-started helper's run is. */
const recordRun = async (agentDefinitionId, content) => {
  const created = (await gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: {
    agentDefinitionId, workspaceRootPath: path.join(ownedRoot, 'workspace'), llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' } })).createAgentRun;
  assert(created.success, created.message);
  const socket = new WebSocket(`ws://127.0.0.1:${node.port}/ws/agent/${created.runId}`);
  const frames = [];
  socket.on('message', raw => frames.push(JSON.parse(String(raw))));
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  await waitFor('CONNECTED', () => frames.some(frame => frame.type === 'CONNECTED'));
  const messageId = `probe-${randomUUID()}`;
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: created.runId, content, message_id: messageId, dedupe_key: `agent_run_input:e2e:${messageId}`, context_file_paths: [], image_urls: [] } }));
  await waitFor('the agent replied', async () => {
    const conversation = (await gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: created.runId })).getRunProjection?.conversation;
    return JSON.stringify(conversation ?? []).includes('"role":"assistant"');
  }, 60000);
  socket.close();
  return created.runId;
};

const shot = async name => { await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true }); };
const kase = async (id, title, body) => {
  const started = Date.now();
  try { await body(); evidence.cases[id] = { title, result: 'Pass', ms: Date.now() - started }; }
  catch (error) { evidence.cases[id] = { title, result: 'Fail', ms: Date.now() - started, error: error.message }; await shot(`${id}-failure`).catch(() => undefined); }
  console.log(`${evidence.cases[id].result} ${id} ${title}${evidence.cases[id].error ? `: ${evidence.cases[id].error}` : ''}`);
};
/** The agent list every picker reads (the Pinia store fed by GraphQL agentDefinitions). */
const storeAgents = () => page.evaluate(() => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  return (pinia._s.get('agentDefinition')?.agentDefinitions ?? []).map(agent => ({ id: agent.id, name: agent.name, internal: agent.internal }));
});
const bodyText = () => page.evaluate(() => document.body.innerText);
const marker = () => page.evaluate(() => window.__probeMarker);
/** Client-side navigation (no reload): a window marker survives it. */
const navigate = async to => {
  await page.evaluate(target => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(target), to);
  await sleep(800);
};
const agentsPage = async () => {
  await navigate('/agents');
  await waitFor('agent cards', async () => (await bodyText()).includes(NORMAL_NAME), 30000);
  return page.evaluate(() => ({
    cards: [...document.querySelectorAll('[data-testid^="agent-card"], .agent-card')].length,
    badges: [...document.querySelectorAll('[data-testid="agent-card-internal-badge"]')].map(element => ({ text: element.innerText.trim(), title: element.getAttribute('title') })),
  }));
};
/** Featured items (Settings → Server Settings): the agent options a new featured row offers. */
const featuredOptions = async () => {
  await navigate('/settings?section=server-settings');
  await waitFor('featured card', async () => (await page.locator('[data-testid="featured-catalog-add-agent"]').count()) > 0, 30000);
  const rowsBefore = await page.locator('[data-testid^="featured-catalog-row-"]').count();
  await page.locator('[data-testid="featured-catalog-add-agent"]').click();
  await waitFor('a new row', async () => (await page.locator('[data-testid^="featured-catalog-row-"]').count()) > rowsBefore);
  const options = await page.locator(`[data-testid="featured-catalog-row-${rowsBefore}"] select`).nth(1).locator('option').allInnerTexts();
  return options.map(option => option.trim());
};
const basicsToggle = async () => {
  await navigate('/settings?section=server-settings');
  const basics = page.getByRole('tab', { name: /Basics|基础/ });
  if (await basics.count()) await basics.first().click().catch(() => undefined);
  await waitFor('internal agents card', async () => (await page.locator('[data-testid="show-internal-agents-toggle"]').count()) > 0, 30000);
  return page.locator('[data-testid="show-internal-agents-toggle"]');
};
const historyText = async () => {
  await navigate('/chat');
  // The runs live in the probe's workspace folder; it starts collapsed until the user (or an opened run) expands it.
  await waitFor('run history', async () => {
    if ((await bodyText()).includes(NORMAL_NAME)) return true;
    const folder = page.getByText('workspace', { exact: true });
    if (await folder.count()) await folder.first().click();
    await sleep(500);
    return (await bodyText()).includes(NORMAL_NAME);
  }, 30000);
  await sleep(800);
  return bodyText();
};

try {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  if (!skipServerBuild) await run('corepack', ['pnpm', '-C', serverDir, 'build'], root, process.env, path.join(outputDir, 'server-build.log'));
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-internal-agents-e2e-')));
  const dataRoot = path.join(ownedRoot, 'node');
  const databasePath = path.join(dataRoot, 'db', 'node.db');
  for (const folder of ['db', 'logs', 'memory', 'temp_workspace', 'home', path.join('agents', INTERNAL_ID)]) await fs.mkdir(path.join(dataRoot, folder), { recursive: true });
  await fs.mkdir(path.join(ownedRoot, 'workspace'), { recursive: true });
  await fs.writeFile(path.join(dataRoot, 'agents', INTERNAL_ID, 'agent.md'), ['---', `name: ${INTERNAL_NAME}`, 'description: The system\'s own helper (probe)', 'role: assistant', '---', '', 'Follow the user\'s request.'].join('\n'));
  await fs.writeFile(path.join(dataRoot, 'agents', INTERNAL_ID, 'agent-config.json'), JSON.stringify({ internal: true, toolNames: [], skillNames: [] }, null, 2));
  const port = await choosePort();
  const url = `http://127.0.0.1:${port}`;
  const databaseUrl = pathToFileURL(databasePath).href;
  const env = { ...scrubbedEnv(), HOME: path.join(dataRoot, 'home'), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl, AUTOBYTEUS_SERVER_HOST: url,
    AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'), AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: '', AUTOBYTEUS_SKILLS_PATHS: '', ANTIGRAVITY_CLI_COMMAND: agyCli, AGY_FAKE_CASE: 'linked_skills' };
  await fs.writeFile(path.join(dataRoot, '.env'), ['APP_ENV=development', 'DB_TYPE=sqlite', `DATABASE_URL=${databaseUrl}`, `AUTOBYTEUS_SERVER_HOST=${url}`].join('\n') + '\n');
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], root, env, path.join(outputDir, 'backend-migrate.log'));
  node = { url, port, dataRoot, process: null };
  node.process = start(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataRoot], serverDir, env, path.join(outputDir, 'backend.log'));
  await waitFor('backend health', async () => { if (exited(node.process)) throw new Error('backend exited'); return fetch(`${url}/rest/health`).then(r => r.ok).catch(() => false); }, 120000);
  const normalId = (await gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name: NORMAL_NAME, role: 'assistant', description: 'A normal agent (probe)', instructions: 'Follow the user\'s request.', toolNames: [] } })).createAgentDefinition.id;
  const internalRunId = await recordRun(INTERNAL_ID, 'Internal helper run. Reply OK.');
  const normalRunId = await recordRun(normalId, 'Normal run. Reply OK.');
  evidence.isolation = { tempRoot: ownedRoot, backend: url, internalRunId, normalRunId };

  const frontendPort = await choosePort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...scrubbedEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: url }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend', async () => { if (exited(frontend)) throw new Error('frontend exited'); return fetch(frontendUrl).then(r => r.ok).catch(() => false); }, 240000);
  browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage'] });
  evidence.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  await context.addInitScript(() => { if (!localStorage.getItem('autobyteus.localization.preference-mode')) localStorage.setItem('autobyteus.localization.preference-mode', 'en'); });
  page = await context.newPage();
  page.on('pageerror', e => evidence.browserErrors.push(e.message));
  // Warm up the cold Nuxt dev server (it re-optimizes and reloads once), then set a marker that only a reload would clear.
  // Every route the cases use is compiled once first (a cold dev server fails or reloads a page's first dynamic import).
  for (const route of ['/agents', '/settings?section=server-settings', '/chat', `/chat?id=${encodeURIComponent(internalRunId)}`, '/agents']) {
    await page.goto(`${frontendUrl}${route}`, { waitUntil: 'domcontentloaded' });
    await sleep(5000);
  }
  await page.goto(`${frontendUrl}/agents`, { waitUntil: 'domcontentloaded' });
  await waitFor('agents page', async () => (await bodyText()).includes(NORMAL_NAME), 120000);
  await page.evaluate(() => { window.__probeMarker = 'no-reload'; });

  await kase('IP-01', 'While hidden: Agents page, the agent store (every picker), the featured-items picker and run history leave the internal agent out; normal agents unchanged (AC-001, REQ-003, REQ-004)', async () => {
    const facts = await agentsPage();
    const text = await bodyText();
    assert(text.includes(NORMAL_NAME) && !text.includes(INTERNAL_NAME), 'Agents page: normal shown, internal hidden');
    assert(facts.badges.length === 0, `no badge while hidden: ${JSON.stringify(facts.badges)}`);
    const store = await storeAgents();
    evidence.cases['IP-01-store'] = { count: store.length, internal: store.filter(agent => agent.internal) };
    assert(store.some(agent => agent.name === NORMAL_NAME) && !store.some(agent => agent.id === INTERNAL_ID), 'store leaves it out');
    await shot('IP-01a-agents-hidden');
    const options = await featuredOptions();
    evidence.cases['IP-01-featured'] = options;
    assert(options.includes(NORMAL_NAME) && !options.includes(INTERNAL_NAME), `featured picker: ${options.join(' | ')}`);
    await shot('IP-01b-featured-picker-hidden');
    const history = await historyText();
    assert(!history.includes(INTERNAL_NAME), 'run history leaves its run out');
    await shot('IP-01c-history-hidden');
    assert(await marker() === 'no-reload', 'no reload so far');
  });

  await kase('IP-02', 'While hidden, its run opens by URL and shows the agent\'s reply (REQ-008, SCN-A1)', async () => {
    await navigate(`/chat?id=${encodeURIComponent(internalRunId)}`);
    await waitFor('the run\'s conversation', async () => (await bodyText()).includes('Internal helper run. Reply OK.'), 30000);
    const text = await bodyText();
    evidence.cases['IP-02-text'] = text.slice(0, 1500);
    assert(/\bOK\b/.test(text.replace('Internal helper run. Reply OK.', '')), 'the agent\'s reply is shown');
    await shot('IP-02-hidden-run-opened-by-url');
    // Opening its run does not add it to the list the pickers read (the run-target switcher, team, Org, featured, @).
    assert(!(await storeAgents()).some(agent => agent.id === INTERNAL_ID), 'the store still leaves it out after its run was opened');
  });

  await kase('IP-03', 'Basics "Internal agents" toggled on: saved; without a reload the Agents page shows it with the "Internal" badge, the store and featured picker have it, run history lists its run (AC-005, REQ-007)', async () => {
    const toggle = await basicsToggle();
    assert(await toggle.getAttribute('aria-checked') === 'false', 'off by default');
    await shot('IP-03a-basics-card-off');
    await toggle.click();
    await waitFor('toggle on', async () => (await toggle.getAttribute('aria-checked')) === 'true');
    assert(!(await page.locator('[data-testid="show-internal-agents-error"]').count()), 'no error');
    const saved = (await gql('{ getServerSettings { key value } }')).getServerSettings.find(setting => setting.key === SETTING);
    assert(saved?.value === 'true', `saved: ${JSON.stringify(saved)}`);
    await shot('IP-03b-basics-card-on');
    await waitFor('store refreshed', async () => (await storeAgents()).some(agent => agent.id === INTERNAL_ID && agent.internal === true));
    const facts = await agentsPage();
    assert((await bodyText()).includes(INTERNAL_NAME), 'Agents page shows it');
    assert(facts.badges.length === 1 && facts.badges[0].text === 'Internal', `badge: ${JSON.stringify(facts.badges)}`);
    evidence.cases['IP-03-badge'] = facts.badges;
    await shot('IP-03c-agents-shown-badge');
    assert((await featuredOptions()).includes(INTERNAL_NAME), 'featured picker offers it');
    assert((await historyText()).includes(INTERNAL_NAME), 'run history lists its run');
    await shot('IP-03d-history-shown');
    assert(await marker() === 'no-reload', 'all without a reload');
  });

  await kase('IP-04', 'Toggled off again: gone from the Agents page, store, featured picker and run history, without a reload', async () => {
    const toggle = await basicsToggle();
    await toggle.click();
    await waitFor('toggle off', async () => (await toggle.getAttribute('aria-checked')) === 'false');
    await waitFor('store refreshed', async () => !(await storeAgents()).some(agent => agent.id === INTERNAL_ID));
    await agentsPage();
    assert(!(await bodyText()).includes(INTERNAL_NAME), 'Agents page hides it');
    assert(!(await featuredOptions()).includes(INTERNAL_NAME), 'featured picker hides it');
    assert(!(await historyText()).includes(INTERNAL_NAME), 'run history hides its run');
    assert(await marker() === 'no-reload', 'without a reload');
    await shot('IP-04-hidden-again');
  });

  await kase('IP-05', 'zh-CN: the card in Chinese', async () => {
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await basicsToggle();
    const card = (await page.locator('[data-testid="show-internal-agents-card"]').innerText()).trim();
    evidence.cases['IP-05-card'] = card;
    assert(/[一-鿿]/.test(card) && !/Internal agents are the system/.test(card), `zh card: ${card}`);
    await shot('IP-05-zh-CN-card');
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  });

  evidence.result = Object.values(evidence.cases).filter(entry => entry && entry.result).every(entry => entry.result === 'Pass') && !evidence.browserErrors.length ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = error.stack || error.message;
  console.error(error);
} finally {
  evidence.cleanup.browser = browser ? await browser.close().then(() => 'closed', e => e.message) : 'not-started';
  evidence.cleanup.frontend = await stop(frontend).catch(e => e.message);
  evidence.cleanup.backend = await stop(node?.process).catch(e => e.message);
  if (ownedRoot) evidence.cleanup.tempRoot = await fs.rm(ownedRoot, { recursive: true, force: true }).then(() => 'removed', e => e.message);
  evidence.finishedAt = new Date().toISOString();
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(evidence, null, 2));
  console.log(`Result: ${evidence.result} (${outputDir}/result.json)`);
  process.exitCode = evidence.result === 'Pass' ? 0 : 1;
}

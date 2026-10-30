#!/usr/bin/env node
// Isolated real-stack run of Settings → Server Settings → Basics → GitHub card (autobyteus-311): one disposable
// backend node on a fresh data root and a Nuxt frontend bound to it, driven in headless Chromium. Every case records
// Pass/Fail in <output-dir>/result.json, with screenshots. Owned processes and the temp root are always cleaned up.
//
// Network: GHC-003 saves a dummy token, so the node asks api.github.com once and GitHub answers 401. No real token is
// used. GHC-004 renders the connected state from an intercepted status response (the real connect is covered by the
// gated live server test `github-credential-proxy-live.e2e.test.ts`).
// Usage: node tests/e2e/github-integration-card-probe.mjs [--skip-server-build] [--output-dir=...]
//        [--browser-executable=...] [--timeout-ms=30000]
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.dirname(webDir);
const serverDir = path.join(root, 'autobyteus-server-ts');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/github-integration-card'));
const skipServerBuild = process.argv.includes('--skip-server-build');
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const timeoutMs = Number(arg('timeout-ms', '30000'));
const DUMMY_TOKEN = 'test-dummy-ui-token-0000';
const evidence = {
  startedAt: new Date().toISOString(), result: 'Fail', platform: `${process.platform}-${process.arch}`,
  node: process.version, browserExecutable: executablePath || 'playwright-default', cases: {}, browserErrors: [], cleanup: {}, error: null,
};

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (description, fn, ms = timeoutMs) => {
  const deadline = Date.now() + ms;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await fn()) return; } catch (error) { lastError = error; }
    await sleep(200);
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
  child.stdout.pipe(log);
  child.stderr.pipe(log);
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
// A fresh node inherits neither feature flags nor AutoByteus settings from the developer's shell.
const scrubbedEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('ENABLE_') && !key.startsWith('AUTOBYTEUS_')));

const createNode = async ownedRoot => {
  const dataRoot = path.join(ownedRoot, 'node');
  const databasePath = path.join(dataRoot, 'db', 'node.db');
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  for (const folder of ['logs', 'memory', 'temp_workspace', 'home']) await fs.mkdir(path.join(dataRoot, folder), { recursive: true });
  const port = await choosePort();
  const url = `http://127.0.0.1:${port}`;
  const databaseUrl = pathToFileURL(databasePath).href;
  const env = {
    ...scrubbedEnv(), HOME: path.join(dataRoot, 'home'), AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: '', AUTOBYTEUS_SKILLS_PATHS: '',
    APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl, AUTOBYTEUS_SERVER_HOST: url, AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
  };
  await fs.writeFile(path.join(dataRoot, '.env'), ['APP_ENV=development', 'DB_TYPE=sqlite', `DATABASE_URL=${databaseUrl}`, `AUTOBYTEUS_SERVER_HOST=${url}`].join('\n') + '\n');
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], root, env, path.join(outputDir, 'migrate.log'));
  return { dataRoot, port, url, env, process: null };
};
const startNode = async node => {
  node.process = start(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(node.port), '--data-dir', node.dataRoot],
    serverDir, node.env, path.join(outputDir, 'backend.log'));
  await waitFor('backend health', async () => {
    if (exited(node.process)) throw new Error(`backend exited ${node.process.exitCode}/${node.process.signalCode}`);
    return fetch(`${node.url}/rest/health`).then(response => response.ok).catch(() => false);
  }, 120000);
};
const gql = async (node, query, variables = {}) => {
  const response = await fetch(`${node.url}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(`GraphQL failed: ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
};
const createAgent = async (node, name) => (await gql(node,
  'mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
  { i: { name, description: `${name} for the GitHub card probe.`, instructions: 'Probe agent.' } })).createAgentDefinition.id;

let page;
const shot = async name => { await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: false }); };
const card = () => page.locator('[data-testid="github-integration-card"]');
const text = async testId => (await page.locator(`[data-testid="${testId}"]`).first().innerText()).replace(/\s+/g, ' ').trim();
const kase = async (id, title, body) => {
  const started = Date.now();
  try {
    await body();
    evidence.cases[id] = { title, result: 'Pass', ms: Date.now() - started };
  } catch (error) {
    evidence.cases[id] = { title, result: 'Fail', ms: Date.now() - started, error: error.message };
    await shot(`${id}-failure`).catch(() => undefined);
  }
  console.log(`${evidence.cases[id].result} ${id} ${title}${evidence.cases[id].error ? `: ${evidence.cases[id].error}` : ''}`);
};

let ownedRoot, node, frontend, browser;
try {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  if (!skipServerBuild) await run('corepack', ['pnpm', '-C', serverDir, 'build'], root, process.env, path.join(outputDir, 'server-build.log'));
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-github-card-e2e-'));
  node = await createNode(ownedRoot);
  await startNode(node);
  const adaId = await createAgent(node, 'Ada coder');
  const zedId = await createAgent(node, 'Zed reviewer');
  const frontendPort = await choosePort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  evidence.isolation = { tempRoot: ownedRoot, backend: node.url, frontend: frontendUrl };
  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...scrubbedEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: node.url }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend', async () => { if (exited(frontend)) throw new Error('frontend exited'); return fetch(frontendUrl).then(r => r.ok).catch(() => false); }, 240000);
  browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage'] });
  evidence.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1180 }, locale: 'en-US', timezoneId: 'Europe/Berlin' });
  await context.addInitScript(() => { if (!localStorage.getItem('autobyteus.localization.preference-mode')) localStorage.setItem('autobyteus.localization.preference-mode', 'en'); });
  page = await context.newPage();
  page.on('pageerror', e => evidence.browserErrors.push(e.message));
  const basicsUrl = `${frontendUrl}/settings?section=server-settings&mode=quick`;
  const openCard = async () => {
    await page.goto(basicsUrl, { waitUntil: 'domcontentloaded' });
    await card().waitFor({ state: 'visible', timeout: 120000 });
    await card().scrollIntoViewIfNeeded();
    await waitFor('agent list', async () => (await page.locator('[data-testid="github-integration-agents"] li').count()) >= 2);
  };

  await kase('GHC-001', 'Not connected card renders with the agents, none ticked', async () => {
    await openCard();
    assert((await text('github-integration-status')) === 'Not connected', 'status');
    assert(await page.locator('[data-testid="github-integration-test"]').count() === 0, 'no Test button');
    assert(await page.locator('[data-testid="github-integration-save"]').isDisabled(), 'Save disabled while empty');
    const names = await page.locator('[data-testid="github-integration-agents"] li').allInnerTexts();
    assert(names.map(n => n.trim()).join('|').includes('Ada coder|Zed reviewer') || (names.includes('Ada coder') && names.includes('Zed reviewer')), `agents ${names}`);
    assert(!(await page.locator(`[data-testid="github-integration-agent-${adaId}"]`).isChecked()), 'Ada unticked');
    await shot('GHC-001-not-connected');
  });

  await kase('GHC-002', 'An agent tick is saved on the node and survives a reload', async () => {
    await page.locator(`[data-testid="github-integration-agent-${adaId}"]`).check();
    await waitFor('saved tick', async () => (await gql(node, '{ githubIntegration { agentDefinitionIds } }')).githubIntegration.agentDefinitionIds.includes(adaId));
    await openCard();
    assert(await page.locator(`[data-testid="github-integration-agent-${adaId}"]`).isChecked(), 'Ada ticked after reload');
    assert(!(await page.locator(`[data-testid="github-integration-agent-${zedId}"]`).isChecked()), 'Zed unticked');
    const file = JSON.parse(await fs.readFile(path.join(node.dataRoot, 'integrations', 'connections.json'), 'utf8'));
    assert(JSON.stringify(file.integrations.github.agentDefinitionIds) === JSON.stringify([adaId]), 'connections file');
    await shot('GHC-002-agent-ticked');
  });

  await kase('GHC-003', 'A token GitHub rejects shows the plain error and stores nothing', async () => {
    await page.locator('[data-testid="github-integration-token-input"]').fill(DUMMY_TOKEN);
    assert((await page.locator('[data-testid="github-integration-token-input"]').getAttribute('type')) === 'password', 'masked field');
    await page.locator('[data-testid="github-integration-save"]').click();
    await waitFor('error message', async () => (await page.locator('[data-testid="github-integration-message"]').count()) > 0, 60000);
    const message = await text('github-integration-message');
    assert(message === 'GitHub rejected the token.', `message ${message}`);
    assert((await text('github-integration-status')) === 'Not connected', 'still not connected');
    assert(!(await page.content()).includes(DUMMY_TOKEN) || (await page.locator('[data-testid="github-integration-token-input"]').inputValue()) === DUMMY_TOKEN, 'token only in the input');
    await shot('GHC-003-token-rejected');
  });

  await kase('GHC-004', 'Connected state renders login, Test and Remove (intercepted status)', async () => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON();
      if (body?.operationName !== 'GetGitHubIntegration') return route.continue();
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { githubIntegration: {
        __typename: 'IntegrationConnectionStatus', connected: true, login: 'octo-probe', connectedAt: '2026-10-30T08:00:00.000Z', agentDefinitionIds: [adaId],
      } } }) });
    });
    await openCard();
    assert((await text('github-integration-status')) === 'Connected as @octo-probe', 'connected status');
    assert(await page.locator('[data-testid="github-integration-test"]').isVisible(), 'Test visible');
    assert(await page.locator('[data-testid="github-integration-remove"]').isVisible(), 'Remove visible');
    assert((await card().innerText()).includes('Replace token'), 'replace label');
    await shot('GHC-004-connected');
    await page.unroute('**/graphql');
  });

  await kase('GHC-005', 'zh-CN copy and a narrow layout render', async () => {
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    await page.setViewportSize({ width: 820, height: 1180 });
    await openCard();
    assert((await text('github-integration-status')) === '未连接', 'zh-CN status');
    assert((await card().innerText()).includes('可以使用 GitHub 的智能体'), 'zh-CN agents title');
    const box = await card().boundingBox();
    assert(box && box.width <= 820, 'card fits the viewport');
    await shot('GHC-005-zh-CN-narrow');
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    await page.setViewportSize({ width: 1440, height: 1180 });
  });

  evidence.result = Object.values(evidence.cases).every(entry => entry.result === 'Pass') && evidence.browserErrors.length === 0 ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = error.message;
  console.error(error);
} finally {
  evidence.cleanup.browser = browser ? await browser.close().then(() => 'closed', e => e.message) : 'not-started';
  evidence.cleanup.frontend = await stop(frontend).catch(e => e.message);
  evidence.cleanup.backend = await stop(node?.process).catch(e => e.message);
  if (ownedRoot) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.tempRoot = `removed:${!existsSync(ownedRoot)}`; }
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(`Result ${evidence.result}; evidence in ${outputDir}`);
  process.exitCode = evidence.result === 'Pass' ? 0 : 1;
}

#!/usr/bin/env node
// Real-stack run of Settings → Model Routing → "Agent runtimes now" (autobyteus-303): two disposable backend nodes
// (`autobyteus-server-ts/dist/app.js`) on fresh data roots and a Nuxt frontend bound to the first, driven in headless
// Chrome. The runtime CLIs are the scripted `autobyteus-server-ts/tests/fixtures/agent-runtimes-fake-cli.mjs` (their
// limit answers are the recorded ones in `tests/fixtures/usage-limits/`); the AutoByteus providers' usage endpoints are
// answered inside each backend by `fixtures/model-routing-provider-usage.mjs`, keys are saved through GraphQL, and no
// other outside URL is reachable. No network, no account.
// Cases: MRP-01 open from the Settings menu: every runtime row, limits with reset times, blocked models, the limits
// note, provider sub-rows (balance, blocked, not reported), the same data as the node's GraphQL answer, no polling;
// MRP-02 Check again (rows kept and the button busy while reading) into the failure states: sign-in not checked,
// limits unknown, models unknown, a provider's limits unknown, a keyed custom endpoint's models unknown, and LM Studio
// appearing once it answers (discovered providers are asked on every read, SR-006); MRP-03 narrow window; MRP-04 zh-CN; MRP-05 a remote node
// window shows that node (all CLIs signed out or missing, no key: AutoByteus without providers), and rebinding back;
// MRP-06 a node that can't be read; MRP-07 no key, e-mail or account value anywhere. Every case records Pass/Fail in
// <output-dir>/result.json with screenshots; owned processes and the temp root are always removed.
//
// Prerequisite: a current server build (`pnpm -C autobyteus-server-ts build`, or drop --skip-server-build).
// Usage: node tests/e2e/model-routing-settings-probe.mjs [--skip-server-build] [--output-dir=...]
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
const fakeCli = path.join(serverDir, 'tests/fixtures/agent-runtimes-fake-cli.mjs');
const providerStub = path.join(webDir, 'tests/e2e/fixtures/model-routing-provider-usage.mjs');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/model-routing-settings'));
const skipServerBuild = process.argv.includes('--skip-server-build');
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const timeoutMs = Number(arg('timeout-ms', '30000'));
const TIME_ZONE = 'Europe/Berlin';
const evidence = {
  startedAt: new Date().toISOString(), result: 'Fail', platform: `${process.platform}-${process.arch}`,
  node: process.version, browserExecutable: executablePath || 'playwright-default', cases: {}, observations: {}, browserErrors: [], cleanup: {}, error: null,
};
const CODEX = 'codex_app_server';
const CLAUDE = 'claude_agent_sdk';
const AGY = 'antigravity_cli';
const GROK = 'grok_build';
const LMSTUDIO_HOST = 'http://lmstudio.probe.test:1234';
const LMSTUDIO_MODELS_URL = `${LMSTUDIO_HOST}/api/v1/models`;
const CUSTOM_BASE_URL = 'https://gateway.probe.test/v1';
const CUSTOM_MODELS_URL = `${CUSTOM_BASE_URL}/models`;
const CUSTOM_KEY = 'FAKE-SECRET-probe-custom-gateway-key';
const KEYS = {
  DEEPSEEK: 'FAKE-SECRET-probe-deepseek-key', KIMI: 'FAKE-SECRET-probe-kimi-key', ANTHROPIC: 'FAKE-SECRET-probe-anthropic-key',
  GROK: 'FAKE-SECRET-probe-xai-key', OPENAI: 'FAKE-SECRET-probe-openai-key',
};
const PROVIDER_ANSWERS = {
  'https://api.deepseek.com/user/balance': { status: 200, body: { is_available: true, balance_infos: [{ currency: 'USD', total_balance: '0.14', granted_balance: '0.00', topped_up_balance: '0.14' }] } },
  'https://api.moonshot.ai/v1/users/me/balance': { status: 200, body: { code: 0, data: { available_balance: 0, voucher_balance: 0, cash_balance: 0 }, scode: '0x0', status: true } },
  'https://api.anthropic.com/v1/messages/count_tokens': { status: 400, body: { type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } } },
  'https://api.x.ai/v1/api-key': { status: 200, body: { redacted_api_key: 'xai-…', user_id: 'FAKE-SECRET-probe-xai-user', team_id: 'FAKE-SECRET-probe-xai-team', api_key_blocked: false, api_key_disabled: false, team_blocked: false } },
};

// ---------------------------------------------------------------- process helpers
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
// A fresh node inherits neither feature flags, AutoByteus settings, runtime overrides nor provider keys from the shell.
const scrubbedEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !key.startsWith('ENABLE_') && !key.startsWith('AUTOBYTEUS_') && !/^(CODEX_|CLAUDE_|GROK_|ANTIGRAVITY_|FAKE_|OLLAMA_|LMSTUDIO_)/.test(key) && !/_API_KEY$/.test(key)));

// ---------------------------------------------------------------- fake runtimes, provider answers, nodes
const createFakes = async (ownedRoot, signedIn) => {
  const binDir = path.join(ownedRoot, 'bin');
  const stateDir = path.join(ownedRoot, 'state');
  for (const dir of [binDir, stateDir, path.join(stateDir, 'claude-config')]) await fs.mkdir(dir, { recursive: true });
  for (const name of ['codex', 'claude', 'agy', 'grok']) await fs.symlink(fakeCli, path.join(binDir, name));
  const set = (file, value) => fs.writeFile(path.join(stateDir, file), value);
  if (signedIn) {
    for (const name of ['codex', 'claude', 'agy', 'grok']) await set(`${name}-account`, 'signedIn');
    await set('codex-models', 'gpt-5.6-luna');
    await set('agy-models', 'claude-sonnet-5-5-medium\\tClaude Sonnet 5.5 (Medium)\\ngemini-3.8-flash-high\\tGemini 3.8 Flash (High)');
  }
  const providerFile = path.join(stateDir, 'provider-usage.json');
  const answers = structuredClone(PROVIDER_ANSWERS);
  const writeAnswers = () => fs.writeFile(providerFile, JSON.stringify(answers));
  await writeAnswers();
  return {
    binDir, stateDir, providerFile, answers, writeAnswers, set,
    read: file => fs.readFile(path.join(stateDir, file), 'utf8').catch(() => ''),
    secrets: async () => (await fs.readFile(path.join(stateDir, 'emitted-secrets.log'), 'utf8').catch(() => '')).split('\n').filter(Boolean),
  };
};

const createNode = async (ownedRoot, fakes, { name, grokInstalled }) => {
  const dataRoot = path.join(ownedRoot, 'node');
  const databasePath = path.join(dataRoot, 'db', 'node.db');
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  for (const folder of ['logs', 'memory', 'temp_workspace', 'home', 'workspace']) await fs.mkdir(path.join(dataRoot, folder), { recursive: true });
  const port = await choosePort();
  const url = `http://127.0.0.1:${port}`;
  const databaseUrl = pathToFileURL(databasePath).href;
  const env = {
    ...scrubbedEnv(), BROWSER: '', DISPLAY: '', WAYLAND_DISPLAY: '', HOME: path.join(dataRoot, 'home'), AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: '', AUTOBYTEUS_SKILLS_PATHS: '',
    APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl, AUTOBYTEUS_SERVER_HOST: url, AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
    CODEX_APP_SERVER_COMMAND: path.join(fakes.binDir, 'codex'), CLAUDE_CODE_EXECUTABLE_PATH: path.join(fakes.binDir, 'claude'),
    ANTIGRAVITY_CLI_COMMAND: path.join(fakes.binDir, 'agy'), GROK_BUILD_COMMAND: grokInstalled ? path.join(fakes.binDir, 'grok') : path.join(ownedRoot, 'not-installed', 'grok'),
    FAKE_RUNTIME_STATE_DIR: fakes.stateDir, CLAUDE_CONFIG_DIR: path.join(fakes.stateDir, 'claude-config'), FAKE_PROVIDER_USAGE_FILE: fakes.providerFile,
    // Ollama never answers; LM Studio only while the probe switches it on.
    // LM Studio is answered by the provider stub only while the probe lists its URL (refused otherwise).
    OLLAMA_HOSTS: 'http://127.0.0.1:9', LMSTUDIO_HOSTS: LMSTUDIO_HOST,
  };
  await fs.writeFile(path.join(dataRoot, '.env'), ['APP_ENV=development', 'DB_TYPE=sqlite', `DATABASE_URL=${databaseUrl}`, `AUTOBYTEUS_SERVER_HOST=${url}`].join('\n') + '\n');
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], root, env, path.join(outputDir, `${name}-migrate.log`));
  return { name, dataRoot, port, url, env, process: null };
};
const startNode = async node => {
  node.process = start(process.execPath, ['--import', pathToFileURL(providerStub).href, path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(node.port), '--data-dir', node.dataRoot],
    serverDir, node.env, path.join(outputDir, `${node.name}.log`));
  await waitFor(`${node.name} health`, async () => {
    if (exited(node.process)) throw new Error(`${node.name} exited ${node.process.exitCode}/${node.process.signalCode}`);
    return fetch(`${node.url}/rest/health`).then(response => response.ok).catch(() => false);
  }, 120000);
};
const gql = async (node, query, variables = {}) => {
  const response = await fetch(`${node.url}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(`GraphQL failed: ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
};
const apiReport = async node => (await gql(node, '{ availableAgentRuntimes }')).availableAgentRuntimes;

// ---------------------------------------------------------------- browser helpers
let page;
const shot = async name => { await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true }); };
const locate = testId => page.locator(`[data-testid="${testId}"]`).first();
const text = async testId => (await locate(testId).innerText()).replace(/\s+/g, ' ').trim();
const present = async testId => (await page.locator(`[data-testid="${testId}"]`).count()) > 0;
const graphqlResponses = [];
const reportRequests = [];
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
/** Binds this window to another node, as a remote node's window is bound (the node id is not the embedded one). */
const bindWindow = (entryId, url) => page.evaluate(([id, base]) => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  pinia._s.get('windowNodeContext').bindNodeContext(id, base);
}, [entryId, url]);
/** What the section shows, per row: limits, the note, models (ids, blocked texts), unknown texts, provider rows. */
const pageRows = () => page.evaluate(() => {
  const clean = el => (el?.innerText ?? '').replace(/\s+/g, ' ').trim();
  return [...document.querySelectorAll('[data-testid="agent-runtimes-now-list"] > li')].map(row => {
    const runtime = row.getAttribute('data-testid').replace('available-runtime-', '');
    const q = suffix => row.querySelector(`[data-testid="available-runtime-${runtime}-${suffix}"]`);
    const models = list => [...(list?.querySelectorAll('li[data-model-id]') ?? [])].map(item => ({
      id: item.getAttribute('data-model-id'), blocked: clean(item.querySelector('[data-testid$="-model-blocked"]')) || null }));
    return {
      runtime,
      name: clean(row.querySelector('h4')),
      signIn: clean(q('signin')) || null,
      limits: [...row.querySelectorAll(`[data-testid="available-runtime-${runtime}-limit"]`)].map(clean),
      limitsUnknown: clean(q('limits-unknown')) || null,
      limitsNote: clean(q('limits-note')) || null,
      modelsSummary: clean(row.querySelector(`[data-testid="available-runtime-${runtime}-models"] > summary`)) || null,
      models: models(q('models')),
      modelsUnknown: clean(q('models-unknown')) || null,
      noProviders: clean(row.querySelector('[data-testid="available-runtime-autobyteus-no-providers"]')) || null,
      providers: [...row.querySelectorAll('[data-testid="available-runtime-autobyteus-provider"]')].map(provider => ({
        provider: provider.getAttribute('data-provider'),
        balance: clean(provider.querySelector('[data-testid="available-provider-balance"]')) || null,
        blocked: clean(provider.querySelector('[data-testid="available-provider-blocked"]')) || null,
        limitsUnknown: clean(provider.querySelector('[data-testid="available-provider-limits-unknown"]')) || null,
        modelsUnknown: clean(provider.querySelector('[data-testid="available-provider-models-unknown"]')) || null,
        text: clean(provider.querySelector('div')),
        models: models(provider.querySelector('[data-testid="available-provider-models"]')),
      })),
    };
  });
});
/** Opens every collapsed model list so its models are in the DOM's visible text. */
const openModelLists = () => page.evaluate(() => { for (const details of document.querySelectorAll('details.available-model-list')) details.open = true; });
const fmt = (iso, locale = 'en') => {
  const at = new Date(iso);
  const sameDay = new Date().toLocaleDateString('en', { timeZone: TIME_ZONE }) === at.toLocaleDateString('en', { timeZone: TIME_ZONE });
  return new Intl.DateTimeFormat(locale, { ...(sameDay ? {} : { month: 'short', day: 'numeric' }), hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE }).format(at);
};
const layout = () => page.evaluate(() => {
  const grids = [...document.querySelectorAll('.available-runtime-grid')];
  return {
    windowWidth: window.innerWidth,
    gridColumns: [...new Set(grids.map(grid => getComputedStyle(grid).gridTemplateColumns.split(' ').length))],
    pageOverflowX: document.documentElement.scrollWidth > window.innerWidth,
    sectionOverflowX: (() => { const s = document.querySelector('[data-testid="agent-runtimes-now"]'); return s.scrollWidth > s.clientWidth + 1; })(),
  };
});
/** The page shows what the node answers: same runtimes, models, blocked models, limits and texts. */
const assertPageMatches = (rows, report) => {
  assert(JSON.stringify(rows.map(row => row.runtime)) === JSON.stringify(report.agentRuntimes.map(entry => entry.runtime)), `runtimes: page ${rows.map(r => r.runtime)} vs api ${report.agentRuntimes.map(e => e.runtime)}`);
  for (const entry of report.agentRuntimes) {
    const row = rows.find(r => r.runtime === entry.runtime);
    assert(row.name === entry.name, `${entry.runtime} name`);
    if (entry.runtime === 'autobyteus') {
      assert(JSON.stringify(row.providers.map(p => p.provider)) === JSON.stringify(entry.providers.map(p => p.provider)), 'provider rows');
      for (const provider of entry.providers) {
        const shown = row.providers.find(p => p.provider === provider.provider);
        if (typeof provider.models === 'string') {
          assert(shown.modelsUnknown === `Models unknown: ${provider.models.slice(9)}`, `${provider.provider} models unknown "${shown.modelsUnknown}"`);
          assert(shown.models.length === 0, `${provider.provider} shows no model list`);
        } else {
          assert(JSON.stringify(shown.models.map(m => m.id)) === JSON.stringify(provider.models.map(m => m.id)), `${provider.provider} models`);
          assert(shown.models.filter(m => m.blocked).length === provider.models.filter(m => m.blocked).length, `${provider.provider} blocked models`);
        }
        assert((shown.balance ?? null) === (provider.balance ? `Balance ${provider.balance}` : null), `${provider.provider} balance ${shown.balance}`);
        assert((shown.blocked ?? null) === (provider.blocked ? `Cannot run: ${provider.blocked}` : null), `${provider.provider} blocked ${shown.blocked}`);
        if (provider.limits === 'not reported') assert(shown.text.includes('Limits not reported'), `${provider.provider} not reported`);
        if (provider.limits?.startsWith('unknown: ')) assert(shown.limitsUnknown === `Limits unknown: ${provider.limits.slice(9)}`, `${provider.provider} limits unknown ${shown.limitsUnknown}`);
      }
      continue;
    }
    assert((row.signIn ?? null) === (entry.signIn ? 'Sign-in could not be checked' : null), `${entry.runtime} sign-in mark ${row.signIn}`);
    if (Array.isArray(entry.limits)) {
      assert(row.limits.length === entry.limits.length, `${entry.runtime} limit count`);
      entry.limits.forEach((limit, index) => {
        const expected = `${limit.name} ${limit.remainingPercent === null ? 'remaining not reported' : `${limit.remainingPercent}% left`}${limit.resetsAt ? ` · resets ${fmt(limit.resetsAt)}` : ''}`;
        assert(row.limits[index] === expected, `${entry.runtime} limit ${index}: "${row.limits[index]}" vs "${expected}"`);
      });
    } else if (entry.limits === 'not reported') assert(row.limits.length === 0, `${entry.runtime} not reported`);
    else assert(row.limitsUnknown === `Limits unknown: ${entry.limits.slice(9)}`, `${entry.runtime} limits unknown "${row.limitsUnknown}"`);
    assert((row.limitsNote ?? null) === (entry.limitsNote ?? null), `${entry.runtime} note`);
    if (Array.isArray(entry.models)) {
      assert(JSON.stringify(row.models.map(m => m.id)) === JSON.stringify(entry.models.map(m => m.id)), `${entry.runtime} models`);
      for (const model of entry.models) {
        const shown = row.models.find(m => m.id === model.id);
        const expected = model.blocked ? (model.blocked.until ? `Blocked until ${fmt(model.blocked.until)} (${model.blocked.by})` : `Blocked (${model.blocked.by})`) : null;
        assert(shown.blocked === expected, `${entry.runtime} ${model.id} blocked "${shown.blocked}" vs "${expected}"`);
      }
    } else assert(row.modelsUnknown === `Models unknown: ${entry.models.slice(9)}`, `${entry.runtime} models unknown "${row.modelsUnknown}"`);
  }
};

let ownedRoot, fakes, node, remoteFakes, remoteNode, frontend, browser;
try {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  if (!skipServerBuild) await run('corepack', ['pnpm', '-C', serverDir, 'build'], root, process.env, path.join(outputDir, 'server-build.log'));
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-model-routing-e2e-')));
  fakes = await createFakes(ownedRoot, true);
  node = await createNode(ownedRoot, fakes, { name: 'backend', grokInstalled: true });
  await startNode(node);
  for (const [providerId, apiKey] of Object.entries(KEYS)) {
    const saved = await gql(node, 'mutation($p:String!,$k:String!){ saveProviderApiKey(providerId:$p, apiKey:$k){ apiKeyConfigured } }', { p: providerId, k: apiKey });
    assert(saved.saveProviderApiKey.apiKeyConfigured, `${providerId} key saved`);
  }
  // A second node: every CLI signed out (Grok missing) and no key.
  remoteFakes = await createFakes(path.join(ownedRoot, 'remote'), false);
  remoteNode = await createNode(path.join(ownedRoot, 'remote'), remoteFakes, { name: 'remote-backend', grokInstalled: false });
  await startNode(remoteNode);
  const frontendPort = await choosePort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  evidence.isolation = { tempRoot: ownedRoot, backend: node.url, remoteBackend: remoteNode.url, frontend: frontendUrl };
  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...scrubbedEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: node.url }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend', async () => { if (exited(frontend)) throw new Error('frontend exited'); return fetch(frontendUrl).then(r => r.ok).catch(() => false); }, 240000);
  browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage'] });
  evidence.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'en-US', timezoneId: TIME_ZONE });
  await context.addInitScript(() => { if (!localStorage.getItem('autobyteus.localization.preference-mode')) localStorage.setItem('autobyteus.localization.preference-mode', 'en'); });
  page = await context.newPage();
  page.on('pageerror', e => evidence.browserErrors.push(e.message));
  page.on('request', request => {
    if (!request.url().includes('/graphql') || request.method() !== 'POST') return;
    if ((request.postData() || '').includes('availableAgentRuntimes')) reportRequests.push({ at: Date.now(), url: request.url() });
  });
  page.on('response', async response => {
    if (!response.url().includes('/graphql')) return;
    graphqlResponses.push(await response.text().catch(() => ''));
  });
  const settingsUrl = `${frontendUrl}/settings`;
  const rowsShown = () => page.locator('[data-testid="agent-runtimes-now-list"] > li').count();
  const openFromMenu = async () => {
    await page.goto(settingsUrl, { waitUntil: 'domcontentloaded' });
    await locate('settings-nav-model-routing').waitFor({ timeout: 120000 });
    await click('settings-nav-model-routing');
    // autobyteus-32: the page opens on Setup; "Agent runtimes now" is its Runtimes tab, without its own heading.
    await locate('model-routing-tab-runtimes').waitFor({ timeout: 60000 });
    await click('model-routing-tab-runtimes');
    await locate('agent-runtimes-now').waitFor({ timeout: 60000 });
  };
  const click = testId => locate(testId).click();
  // A cold Nuxt dev server re-optimizes dependencies and reloads once: warm it up before asserting (TESTING.md).
  await openFromMenu();
  await sleep(5000);

  await kase('MRP-01', 'Open from the Settings menu: every runtime row, limits and reset times, blocked models, the limits note, provider sub-rows; the same data as the node\'s answer; no polling (AC-010, REQ-009)', async () => {
    await openFromMenu();
    const menu = (await page.locator('[data-testid^="settings-nav-"]').allInnerTexts()).map(item => item.trim()).filter(Boolean);
    evidence.cases['MRP-01-menu'] = menu;
    assert(menu.includes('Model Routing'), `menu: ${menu.join(' | ')}`);
    // autobyteus-32: the node line is the node's name; another node is named in the page's status strip.
    assert(await text('agent-runtimes-now-node') === 'Embedded Node', `node line ${await text('agent-runtimes-now-node')}`);
    assert(!(await present('model-routing-node')), 'own node: no node chip in the status strip');
    await waitFor('rows', async () => (await rowsShown()) === 5, 30000);
    assert(await text('agent-runtimes-now-checked') === `Checked ${fmt(new Date().toISOString())}` || /^Checked \d\d:\d\d$/.test(await text('agent-runtimes-now-checked')), `checked line ${await text('agent-runtimes-now-checked')}`);
    await shot('MRP-01a-collapsed-1440');
    await openModelLists();
    const rows = await pageRows();
    const report = await apiReport(node);
    evidence.cases['MRP-01-page'] = rows;
    evidence.cases['MRP-01-api'] = report;
    assertPageMatches(rows, report);
    const by = Object.fromEntries(rows.map(row => [row.runtime, row]));
    // The states the requirements name, as shown.
    assert(by[CODEX].limits[0].startsWith('Weekly 0% left · resets '), `codex limit ${by[CODEX].limits[0]}`);
    assert(by[CODEX].modelsSummary === '1 model · 1 blocked', `codex summary ${by[CODEX].modelsSummary}`);
    assert(by[CODEX].models[0].blocked.startsWith('Blocked until ') && by[CODEX].models[0].blocked.endsWith('(Weekly)'), `codex blocked ${by[CODEX].models[0].blocked}`);
    assert(by[AGY].modelsSummary === '2 models · 1 blocked', `agy summary ${by[AGY].modelsSummary}`);
    assert(by[AGY].models.find(m => m.id === 'gemini-3.8-flash-high').blocked === null, 'gemini not blocked');
    assert(by[GROK].limits[0].startsWith('Billing period remaining not reported · resets '), `grok limit ${by[GROK].limits[0]}`);
    assert(by[GROK].limitsNote === 'Grok does not report how much of the period is used.', 'grok note');
    const providers = Object.fromEntries(by.autobyteus.providers.map(p => [p.provider, p]));
    assert(providers.DeepSeek.balance === 'Balance 0.14 USD', 'deepseek balance');
    assert(providers.Kimi.blocked === 'Cannot run: no balance left', 'kimi blocked');
    assert(providers.Anthropic.blocked === 'Cannot run: credit balance too low', 'anthropic blocked');
    assert(providers.OpenAI.text.includes('Limits not reported'), 'openai not reported');
    assert(!(await page.content()).match(/>\s*(plan|tier|credits?)\b/i), 'no plan, tier or credit details shown');
    const facts = await layout();
    evidence.cases['MRP-01-layout'] = facts;
    assert(facts.gridColumns.length === 1 && facts.gridColumns[0] === 2 && !facts.pageOverflowX && !facts.sectionOverflowX, `wide layout ${JSON.stringify(facts)}`);
    await shot('MRP-01b-opened-1440');
    // No polling: nothing is read again while the page stays open.
    const before = reportRequests.length;
    await sleep(8000);
    assert(reportRequests.length === before, `the page read again on its own (${reportRequests.length - before} reads in 8 s)`);
  });

  await kase('MRP-02', 'Check again: rows kept and the button busy while reading, then sign-in not checked, limits unknown, models unknown, a provider\'s limits unknown, and the checked announcement (AC-010, REQ-007 UI states)', async () => {
    await fakes.set('codex-account', 'error');        // Codex: sign-in can't be told → listed with the mark
    await fakes.set('claude-auth', 'hang');           // Claude: sign-in times out (6 s) → the mark; keeps the read busy
    await fakes.set('agy-usage', 'fail');             // Antigravity: limits unknown
    await fakes.set('grok-acp-models', '[]');         // Grok: an empty model catalog → models unknown
    fakes.answers['https://api.deepseek.com/user/balance'] = { status: 500, body: { error: 'internal' } };
    // A keyed custom endpoint, created while it answers, then not answering; LM Studio starts answering.
    fakes.answers[CUSTOM_MODELS_URL] = { status: 200, body: { object: 'list', data: [{ id: 'gateway-model-a', object: 'model' }] } };
    await fakes.writeAnswers();
    const created = await gql(node, 'mutation($input: CustomProviderInputObject!){ createCustomProvider(input:$input){ provider { name } apiKeyConfigured } }',
      { input: { name: 'Probe Gateway', baseUrl: CUSTOM_BASE_URL, apiKey: CUSTOM_KEY } });
    assert(created.createCustomProvider.apiKeyConfigured, 'custom provider key saved');
    fakes.answers[CUSTOM_MODELS_URL] = { status: 503, body: { error: 'unavailable' } };
    fakes.answers[LMSTUDIO_MODELS_URL] = { status: 200, body: { models: [{ key: 'qwen/qwen3.6-35b-a3b', type: 'llm', max_context_length: 262144 }] } };
    await fakes.writeAnswers();
    const reads = reportRequests.length;
    await click('agent-runtimes-now-check-again');
    await waitFor('busy button', async () => (await text('agent-runtimes-now-check-again')) === 'Checking…', 5000);
    assert(await locate('agent-runtimes-now-check-again').isDisabled(), 'button disabled while reading');
    assert((await rowsShown()) === 5, 'rows kept while reading');
    assert(!(await present('agent-runtimes-now-checked')), 'checked line hidden while reading');
    await shot('MRP-02a-checking');
    await waitFor('read finished', async () => (await text('agent-runtimes-now-check-again')) === 'Check again', 25000);
    assert(reportRequests.length === reads + 1, `one read per press (${reportRequests.length - reads})`);
    await waitFor('announced', async () => (await locate('agent-runtimes-now-announce').textContent()) === 'Agent runtimes checked.', 5000);
    await openModelLists();
    const rows = await pageRows();
    const report = await apiReport(node);
    evidence.cases['MRP-02-page'] = rows;
    evidence.cases['MRP-02-api'] = report;
    assertPageMatches(rows, report);
    const by = Object.fromEntries(rows.map(row => [row.runtime, row]));
    assert(by[CODEX].signIn === 'Sign-in could not be checked', `codex mark ${by[CODEX].signIn}`);
    assert(by[CLAUDE].signIn === 'Sign-in could not be checked', `claude mark ${by[CLAUDE].signIn}`);
    assert(by[AGY].limitsUnknown === 'Limits unknown: Antigravity usage limits could not be read', `agy ${by[AGY].limitsUnknown}`);
    assert(by[GROK].modelsUnknown === 'Models unknown: Grok model list could not be read', `grok ${by[GROK].modelsUnknown}`);
    const deepseek = by.autobyteus.providers.find(p => p.provider === 'DeepSeek');
    // SR-007: the service words every failure; a provider's unusable answer keeps its classified reason.
    assert(deepseek.limitsUnknown === 'Limits unknown: DeepSeek usage could not be read: unexpected answer (500)', `deepseek ${deepseek.limitsUnknown}`);
    const gateway = by.autobyteus.providers.find(p => p.provider === 'Probe Gateway');
    assert(gateway && /^Models unknown: Probe Gateway model list /.test(gateway.modelsUnknown ?? ''), `custom endpoint ${JSON.stringify(gateway)}`);
    const lmStudio = by.autobyteus.providers.find(p => p.provider === 'LM Studio');
    assert(lmStudio && lmStudio.models.length === 1 && lmStudio.text.includes('Limits not reported'), `LM Studio ${JSON.stringify(lmStudio)}`);
    evidence.cases['MRP-02-discovered'] = { gateway, lmStudio };
    // The page scrolls inside its own container, so the AutoByteus row gets its own (scrolled-into-view) screenshot.
    await locate('available-runtime-autobyteus').screenshot({ path: path.join(outputDir, 'MRP-02c-autobyteus-providers.png') });
    await shot('MRP-02b-failure-states-1440');
  });

  await kase('MRP-03', 'Narrow window (420 px): limits above models, nothing overflows', async () => {
    await page.setViewportSize({ width: 420, height: 1100 });
    await sleep(400);
    const facts = await layout();
    evidence.cases['MRP-03-layout'] = facts;
    assert(facts.gridColumns.length === 1 && facts.gridColumns[0] === 1, `one column at 420: ${JSON.stringify(facts)}`);
    assert(!facts.pageOverflowX && !facts.sectionOverflowX, `overflow at 420: ${JSON.stringify(facts)}`);
    await shot('MRP-03-narrow-420');
    await page.setViewportSize({ width: 1440, height: 1100 });
  });

  await kase('MRP-04', 'zh-CN: section texts, limits, models and providers in Chinese', async () => { try {
    for (const [file, value] of [['codex-account', 'signedIn'], ['claude-auth', ''], ['agy-usage', 'recorded'], ['grok-acp-models', JSON.stringify([{ modelId: 'grok-4.7', name: 'Grok 4.7', _meta: { totalContextTokens: 256000 } }])]]) await fakes.set(file, value);
    fakes.answers['https://api.deepseek.com/user/balance'] = PROVIDER_ANSWERS['https://api.deepseek.com/user/balance'];
    await fakes.writeAnswers();
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    await openFromMenu();
    await waitFor('rows', async () => (await rowsShown()) === 5, 30000);
    await openModelLists();
    const tab = await text('model-routing-tab-runtimes');
    assert(tab === '运行时', `zh tab ${tab}`);
    assert(await text('agent-runtimes-now-check-again') === '重新检查', 'zh button');
    assert((await text('agent-runtimes-now-node')).length > 0, 'zh node line');
    const rows = await pageRows();
    const by = Object.fromEntries(rows.map(row => [row.runtime, row]));
    evidence.cases['MRP-04-page'] = rows;
    assert(by[CODEX].limits[0].startsWith('Weekly 剩余 0%'), `zh codex limit ${by[CODEX].limits[0]}`);
    assert(by[CODEX].modelsSummary === '1 个模型 · 1 个不可用', `zh summary ${by[CODEX].modelsSummary}`);
    assert(by[CODEX].models[0].blocked.includes('前不可用（Weekly）'), `zh blocked ${by[CODEX].models[0].blocked}`);
    const providers = Object.fromEntries(by.autobyteus.providers.map(p => [p.provider, p]));
    assert(providers.DeepSeek.balance === '余额 0.14 USD', `zh balance ${providers.DeepSeek.balance}`);
    assert(providers.Anthropic.blocked === '无法运行：credit balance too low', `zh blocked ${providers.Anthropic.blocked}`);
    // Observation: names, reasons and notes come from the node's answer (the tool's text), so they stay in English.
    evidence.observations.zhServerTexts = { limitName: by[CODEX].limits[0], grokNote: by[GROK].limitsNote, providerReason: providers.Anthropic.blocked };
    await shot('MRP-04-zh-CN-1440');
  } finally { await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en')); } });

  await kase('MRP-05', 'A remote node window shows that node: all CLIs signed out or missing and no key → AutoByteus without providers; rebinding back re-reads (AC-010 remote)', async () => {
    await openFromMenu();
    await waitFor('rows', async () => (await rowsShown()) === 5, 30000);
    const reads = reportRequests.length;
    await bindWindow('remote-probe-node', remoteNode.url);
    await waitFor('remote node named in the status strip', async () => present('model-routing-node'), 20000);
    await waitFor('remote rows', async () => (await rowsShown()) === 1 && await present('available-runtime-autobyteus-no-providers'), 30000);
    assert(reportRequests.some((request, index) => index >= reads && request.url.startsWith(remoteNode.url)), `read from the remote node: ${JSON.stringify(reportRequests.slice(reads))}`);
    const rows = await pageRows();
    const report = await apiReport(remoteNode);
    evidence.cases['MRP-05-page'] = rows;
    evidence.cases['MRP-05-api'] = report;
    assertPageMatches(rows, report);
    assert(rows[0].noProviders === 'No API provider has a key on this node.', `no providers ${rows[0].noProviders}`);
    assert(!(await present('agent-runtimes-now-empty')), 'AutoByteus is listed, so the empty text is not');
    await shot('MRP-05a-remote-node-nothing-usable');
    await bindWindow('embedded-again', node.url);
    await waitFor('own rows again', async () => (await rowsShown()) === 5, 30000);
    await shot('MRP-05b-rebound');
  });

  await kase('MRP-06', 'A node that can\'t be read: the load error with Check again', async () => {
    const closedPort = await choosePort();
    await bindWindow('unreachable-node', `http://127.0.0.1:${closedPort}`);
    await waitFor('load error', async () => present('agent-runtimes-now-error'), 90000);
    assert(await text('agent-runtimes-now-error') === "Couldn't read the agent runtimes on this node. Use Check again to retry.", `error copy ${await text('agent-runtimes-now-error')}`);
    assert(await present('agent-runtimes-now-check-again'), 'Check again offered');
    await shot('MRP-06-unreachable-node');
    await bindWindow('embedded-again-2', node.url);
    await waitFor('own rows again', async () => (await rowsShown()) === 5, 30000);
  });

  await kase('MRP-07', 'No key, e-mail or account value in the page, its GraphQL responses, the nodes\' output, logs or data files; providers asked only at their usage endpoints (REQ-008)', async () => {
    const secrets = [...Object.values(KEYS), CUSTOM_KEY, ...await fakes.secrets(), ...await remoteFakes.secrets(), 'FAKE-SECRET-probe-xai-user', 'FAKE-SECRET-probe-xai-team'];
    const files = [];
    const walk = async dir => { for (const entry of await fs.readdir(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) await walk(full); else files.push(full); } };
    await walk(node.dataRoot);
    await walk(remoteNode.dataRoot);
    const corpora = { page: await page.content(), graphqlResponses: graphqlResponses.join('\n') };
    for (const name of ['backend', 'remote-backend']) corpora[`${name}Output`] = await fs.readFile(path.join(outputDir, `${name}.log`), 'utf8');
    for (const file of files) corpora[path.relative(ownedRoot, file)] = await fs.readFile(file, 'latin1');
    const hits = Object.entries(corpora).flatMap(([where, content]) => secrets.filter(secret => content.includes(secret)).map(secret => `${where}: ${secret}`));
    const providerRequests = (await fakes.read('provider-usage.json.requests.log')).split('\n').filter(Boolean);
    evidence.cases['MRP-07-scan'] = { secrets: secrets.length, graphqlResponses: graphqlResponses.length, dataFiles: files.length, hits, providerRequests: [...new Set(providerRequests)] };
    assert(graphqlResponses.length > 5, 'responses captured');
    assert(hits.length === 0, `secrets found: ${hits.join('; ')}`);
    // Answered: the four usage endpoints and the two discovered model lists (LM Studio, the custom endpoint).
    assert(providerRequests.filter(line => !line.startsWith('REFUSED')).every(line => [...Object.keys(PROVIDER_ANSWERS), LMSTUDIO_MODELS_URL, CUSTOM_MODELS_URL].some(url => line.endsWith(url))), 'only usage endpoints and model lists');
    assert(!providerRequests.some(line => /completions|\/v1\/messages(?!\/count_tokens)|\/responses/.test(line)), 'no model request');
  });

  evidence.result = Object.values(evidence.cases).filter(entry => entry && entry.result).every(entry => entry.result === 'Pass') && !evidence.browserErrors.length ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = error.stack || error.message;
  console.error(error);
} finally {
  evidence.cleanup.browser = browser ? await browser.close().then(() => 'closed', e => e.message) : 'not-started';
  evidence.cleanup.frontend = await stop(frontend).catch(e => e.message);
  evidence.cleanup.backend = await stop(node?.process).catch(e => e.message);
  evidence.cleanup.remoteBackend = await stop(remoteNode?.process).catch(e => e.message);
  if (ownedRoot) evidence.cleanup.tempRoot = await fs.rm(ownedRoot, { recursive: true, force: true }).then(() => 'removed', e => e.message);
  evidence.finishedAt = new Date().toISOString();
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(evidence, null, 2));
  console.log(`Result: ${evidence.result} (${outputDir}/result.json)`);
  process.exitCode = evidence.result === 'Pass' ? 0 : 1;
}

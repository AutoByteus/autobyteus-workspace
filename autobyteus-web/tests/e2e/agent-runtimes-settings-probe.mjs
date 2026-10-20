#!/usr/bin/env node
// Real-stack run of Settings → Agent Runtimes (ticket runtime-lifecycle-review): one disposable backend node
// (`autobyteus-server-ts/dist/app.js`) on a fresh data root and a Nuxt frontend bound to it, driven in headless Chrome.
// The four runtime CLIs are the scripted `autobyteus-server-ts/tests/fixtures/agent-runtimes-fake-cli.mjs` (real
// signed-out answers, scripted update/login), selected through the runtime command overrides; the three vendor web
// sources are answered inside the backend by `fixtures/agent-runtimes-vendor-sources.mjs`. No network, no account.
// Cases: page open with one source failing and one slow, the table/stacked switch at the list's width (SR-012) at
// 1440/1280/1024/739/390 px, Update blocked by a running agent, Update success and failure, Sign in with Cancel and
// completion, zh-CN, a remote node window, a node that can't be read, and a secret scan. Every case records Pass/Fail
// in <output-dir>/result.json with screenshots; owned processes and the temp root are always removed.
//
// Prerequisite: a current server build (`pnpm -C autobyteus-server-ts build`, or drop --skip-server-build).
// Usage: node tests/e2e/agent-runtimes-settings-probe.mjs [--skip-server-build] [--output-dir=...]
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
const sourcesStub = path.join(webDir, 'tests/e2e/fixtures/agent-runtimes-vendor-sources.mjs');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/agent-runtimes-settings'));
const skipServerBuild = process.argv.includes('--skip-server-build');
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const timeoutMs = Number(arg('timeout-ms', '30000'));
const evidence = {
  startedAt: new Date().toISOString(), result: 'Fail', platform: `${process.platform}-${process.arch}`,
  node: process.version, browserExecutable: executablePath || 'playwright-default', cases: {}, browserErrors: [], cleanup: {}, error: null,
};
const CODEX = 'codex_app_server';
const CLAUDE = 'claude_agent_sdk';
const AGY = 'antigravity_cli';
const GROK = 'grok_build';

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
// A fresh node inherits neither feature flags, AutoByteus settings nor runtime overrides from the developer's shell.
const scrubbedEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !key.startsWith('ENABLE_') && !key.startsWith('AUTOBYTEUS_') && !/^(CODEX_|CLAUDE_|GROK_|ANTIGRAVITY_|FAKE_)/.test(key)));

// ---------------------------------------------------------------- fake runtimes and vendor sources
const createFakes = async ownedRoot => {
  const binDir = path.join(ownedRoot, 'bin');
  const stateDir = path.join(ownedRoot, 'state');
  for (const dir of [binDir, stateDir, path.join(stateDir, 'claude-config')]) await fs.mkdir(dir, { recursive: true });
  for (const name of ['codex', 'claude', 'agy', 'grok']) await fs.symlink(fakeCli, path.join(binDir, name));
  const sourcesFile = path.join(stateDir, 'vendor-sources.json');
  const sources = {
    codex: { status: 200, body: JSON.stringify({ tag_name: 'rust-v0.163.0' }) },
    claude: { status: 503, body: 'Service Unavailable' },
    antigravity: { status: 200, body: JSON.stringify({ version: '1.4.3' }), delayMs: 6000 },
  };
  const writeSources = () => fs.writeFile(sourcesFile, JSON.stringify(sources));
  await writeSources();
  return {
    binDir, stateDir, sourcesFile, sources, writeSources,
    set: (file, value) => fs.writeFile(path.join(stateDir, file), value),
    secrets: async () => (await fs.readFile(path.join(stateDir, 'emitted-secrets.log'), 'utf8').catch(() => '')).split('\n').filter(Boolean),
  };
};

// ---------------------------------------------------------------- backend node
const createNode = async (ownedRoot, fakes) => {
  const dataRoot = path.join(ownedRoot, 'node');
  const databasePath = path.join(dataRoot, 'db', 'node.db');
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  for (const folder of ['logs', 'memory', 'temp_workspace', 'home', 'workspace']) await fs.mkdir(path.join(dataRoot, folder), { recursive: true });
  const port = await choosePort();
  const url = `http://127.0.0.1:${port}`;
  const databaseUrl = pathToFileURL(databasePath).href;
  const env = {
    ...scrubbedEnv(), HOME: path.join(dataRoot, 'home'), AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: '', AUTOBYTEUS_SKILLS_PATHS: '',
    APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl, AUTOBYTEUS_SERVER_HOST: url, AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
    CODEX_APP_SERVER_COMMAND: path.join(fakes.binDir, 'codex'), CLAUDE_CODE_EXECUTABLE_PATH: path.join(fakes.binDir, 'claude'),
    ANTIGRAVITY_CLI_COMMAND: path.join(fakes.binDir, 'agy'), GROK_BUILD_COMMAND: path.join(ownedRoot, 'not-installed', 'grok'),
    FAKE_RUNTIME_STATE_DIR: fakes.stateDir, CLAUDE_CONFIG_DIR: path.join(fakes.stateDir, 'claude-config'), FAKE_VENDOR_SOURCES_FILE: fakes.sourcesFile,
  };
  await fs.writeFile(path.join(dataRoot, '.env'), ['APP_ENV=development', 'DB_TYPE=sqlite', `DATABASE_URL=${databaseUrl}`, `AUTOBYTEUS_SERVER_HOST=${url}`].join('\n') + '\n');
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], root, env, path.join(outputDir, 'migrate.log'));
  return { dataRoot, port, url, env, process: null };
};
const startNode = async node => {
  node.process = start(process.execPath, ['--import', pathToFileURL(sourcesStub).href, path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(node.port), '--data-dir', node.dataRoot],
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
const apiRows = async node => Object.fromEntries((await gql(node, '{agentRuntimes{runtimeKind installed installedVersion updates{state latestVersion} account{state} runningAgentCount operation{kind state}}}'))
  .agentRuntimes.map(row => [row.runtimeKind, row]));

// ---------------------------------------------------------------- browser helpers
let page;
const shot = async name => { await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true }); };
const locate = testId => page.locator(`[data-testid="${testId}"]`).first();
const text = async testId => (await locate(testId).innerText()).replace(/\s+/g, ' ').trim();
const present = async testId => (await page.locator(`[data-testid="${testId}"]`).count()) > 0;
const rowState = runtime => locate(`runtime-${runtime}`).getAttribute('data-state');
const waitState = (runtime, expected, ms = timeoutMs) => waitFor(`${runtime} ${expected}`, async () => (await rowState(runtime)) === expected, ms);
const click = testId => locate(testId).click();
const graphqlResponses = [];
const mutationsSent = [];
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
/** Layout facts of the list at the current window width. */
const layout = () => page.evaluate(() => {
  const list = document.querySelector('[data-testid="agent-runtimes-list"]');
  const columns = document.querySelector('[data-testid="agent-runtimes-columns"]');
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const rows = [...document.querySelectorAll('[data-testid^="runtime-"][data-state]')];
  const box = el => el?.getBoundingClientRect();
  const overlaps = rows.flatMap((row) => {
    const id = row.getAttribute('data-testid');
    const cells = ['installed', 'updates', 'account', 'actions'].map(part => row.querySelector(`[data-testid="${id}-${part}"]`)).map(box);
    const issues = [];
    for (let i = 0; i < cells.length - 1; i += 1) {
      const [a, b] = [cells[i], cells[i + 1]];
      if (!a || !b) continue;
      const sameLine = a.top < b.bottom && b.top < a.bottom;
      if (sameLine && a.right > b.left + 1 && b.width > 0 && a.width > 0) issues.push(`${id}: cell ${i} overlaps cell ${i + 1}`);
    }
    return issues;
  });
  const label = document.querySelector('.agent-runtime-label');
  return {
    windowWidth: window.innerWidth,
    listWidthPx: Math.round(box(list).width),
    listWidthRem: Math.round((box(list).width / rem) * 10) / 10,
    columnsDisplay: columns ? getComputedStyle(columns).display : null,
    labelsVisible: label ? box(label).width > 1 : null,
    pageOverflowX: document.documentElement.scrollWidth > window.innerWidth,
    listOverflowX: list.scrollWidth > list.clientWidth + 1,
    overlaps,
  };
});

let ownedRoot, fakes, node, frontend, browser;
try {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  if (!skipServerBuild) await run('corepack', ['pnpm', '-C', serverDir, 'build'], root, process.env, path.join(outputDir, 'server-build.log'));
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-agent-runtimes-e2e-')));
  fakes = await createFakes(ownedRoot);
  node = await createNode(ownedRoot, fakes);
  await startNode(node);
  const frontendPort = await choosePort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  evidence.isolation = { tempRoot: ownedRoot, backend: node.url, frontend: frontendUrl };
  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...scrubbedEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: node.url }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend', async () => { if (exited(frontend)) throw new Error('frontend exited'); return fetch(frontendUrl).then(r => r.ok).catch(() => false); }, 240000);
  browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage'] });
  evidence.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'en-US', timezoneId: 'Europe/Berlin' });
  await context.addInitScript(() => { if (!localStorage.getItem('autobyteus.localization.preference-mode')) localStorage.setItem('autobyteus.localization.preference-mode', 'en'); });
  page = await context.newPage();
  page.on('pageerror', e => evidence.browserErrors.push(e.message));
  page.on('request', request => {
    if (!request.url().includes('/graphql') || request.method() !== 'POST') return;
    const body = request.postDataJSON();
    if (/mutation\b/.test(body?.query || '')) mutationsSent.push(body.operationName ?? body.query.slice(0, 60));
  });
  page.on('response', async response => {
    if (!response.url().includes('/graphql')) return;
    graphqlResponses.push(await response.text().catch(() => ''));
  });
  const runtimesUrl = `${frontendUrl}/settings?section=agent-runtimes`;
  const open = async () => {
    await page.goto(runtimesUrl, { waitUntil: 'domcontentloaded' });
    await locate('agent-runtimes-card').waitFor({ timeout: 120000 });
  };
  // A cold Nuxt dev server re-optimizes dependencies and reloads once: warm it up before asserting (TESTING.md).
  await open();
  await sleep(4000);
  await fakes.set('claude-update', 'fail');

  await kase('ARP-01', 'Open: four rows; one source failing, one slow, one runtime missing; table at 1440 px (AC-001, AC-002, AC-005, AC-006, AC-009, VIS-001)', async () => {
    await open();
    const nav = await page.locator('nav li, aside li').allInnerTexts().catch(() => []);
    const labels = nav.map(item => item.trim()).filter(Boolean);
    const apiKeys = labels.indexOf('API Keys');
    assert(apiKeys >= 0 && labels[apiKeys + 1] === 'Agent Runtimes', `menu order: ${labels.join(' | ')}`);
    assert(/^Embedded Node\s*·\s*This computer$/.test(await text('agent-runtimes-node')), `node line ${await text('agent-runtimes-node')}`);
    // Codex resolves while the Antigravity source is still held back (6 s).
    await waitState(CODEX, 'update_available');
    assert(await rowState(AGY) === 'checking', `Antigravity while its source is slow: ${await rowState(AGY)}`);
    assert(await text(`runtime-${AGY}-status`) === 'Checking for updates…', 'checking copy');
    await shot('ARP-01a-antigravity-still-checking');
    await waitState(AGY, 'up_to_date', 20000);
    await waitState(CLAUDE, 'check_failed');
    assert(await text(`runtime-${CODEX}-status`) === 'Update available (version 0.163.0)', `codex status ${await text(`runtime-${CODEX}-status`)}`);
    assert(await text(`runtime-${CODEX}-signin`) === 'Not signed in', 'codex account');
    assert(await text(`runtime-${CODEX}-signin-button`) === 'Sign in', 'codex sign in button');
    assert(!(await present(`runtime-${CODEX}-signin-hint`)), 'codex has no command-line hint');
    assert(await text(`runtime-${CLAUDE}-status`) === 'Check failed', 'claude check failed');
    assert(await text(`runtime-${CLAUDE}-check-failed-note`) === "Couldn't reach the update source. Claude still works.", 'claude note');
    assert((await text(`runtime-${CLAUDE}-installed`)).includes('2.1.200'), 'claude version kept');
    for (const runtime of [CLAUDE, AGY]) {
      assert(await text(`runtime-${runtime}-signin`) === 'Not signed in', `${runtime} account`);
      assert(await text(`runtime-${runtime}-signin-hint`) === 'Sign in from its command line.', `${runtime} hint`);
      assert(!(await present(`runtime-${runtime}-signin-button`)), `${runtime} has no Sign in button`);
    }
    assert(await rowState(GROK) === 'not_installed', 'grok not installed');
    assert(await text(`runtime-${GROK}-not-installed`) === 'Not installed', 'not installed copy');
    assert(await locate(`runtime-${GROK}-install-link`).getAttribute('href') === 'https://docs.x.ai/build/overview', 'grok link (DEC-004)');
    assert(await locate(`runtime-${GROK}-install-link`).getAttribute('target') === '_blank', 'link opens in the browser');
    assert(await text(`runtime-${GROK}-restart-hint`) === 'After installing, restart AutoByteus.', 'restart hint (SR-010)');
    assert(!(await present(`runtime-${GROK}-update`)) && !(await present(`runtime-${GROK}-signin-button`)), 'no action for a missing runtime');
    await waitFor('checked line', async () => (await present('agent-runtimes-checked')) && (await text('agent-runtimes-checked')) === 'Checked just now');
    const facts = await layout();
    evidence.cases['ARP-01-layout'] = facts;
    assert(facts.columnsDisplay === 'grid' && !facts.labelsVisible, `table expected at 1440: ${JSON.stringify(facts)}`);
    assert(!facts.pageOverflowX && !facts.listOverflowX && facts.overlaps.length === 0, `overflow/overlap at 1440: ${JSON.stringify(facts)}`);
    await shot('ARP-01b-VIS-001-table-1440-en');
  });

  await kase('ARP-02', 'Table/stacked follows the list width (~58 rem), never overflowing: 1280 table; 1024, 739, 390 stacked (SR-012, VIS-022)', async () => {
    const results = {};
    for (const [width, expected] of [[1280, 'grid'], [1100, null], [1024, 'none'], [739, 'none'], [390, 'none']]) {
      await page.setViewportSize({ width, height: 1100 });
      await sleep(400);
      const facts = await layout();
      results[width] = facts;
      if (expected) assert(facts.columnsDisplay === expected, `${width}px: columns ${facts.columnsDisplay} (list ${facts.listWidthRem} rem)`);
      assert((facts.columnsDisplay === 'grid') === (facts.listWidthRem >= 58), `${width}px: switch does not follow the list width: ${JSON.stringify(facts)}`);
      if (facts.columnsDisplay === 'none') assert(facts.labelsVisible, `${width}px: stacked rows need visible labels`);
      assert(!facts.pageOverflowX && !facts.listOverflowX, `${width}px overflow: ${JSON.stringify(facts)}`);
      assert(facts.overlaps.length === 0, `${width}px overlap: ${facts.overlaps.join('; ')}`);
      await shot(`ARP-02-${width}px-${facts.columnsDisplay === 'grid' ? 'table' : 'stacked'}`);
    }
    // The window width where the table starts (beside the Settings menu), found by bisection.
    let [stacked, table] = [1100, 1280];
    while (table - stacked > 2) {
      const middle = Math.round((stacked + table) / 2);
      await page.setViewportSize({ width: middle, height: 1100 });
      await sleep(150);
      if ((await layout()).columnsDisplay === 'grid') table = middle; else stacked = middle;
    }
    await page.setViewportSize({ width: table, height: 1100 });
    await sleep(150);
    results.tableFromWindowPx = { stackedAt: stacked, tableAt: table, listWidthRemAtTable: (await layout()).listWidthRem };
    evidence.cases['ARP-02-layout'] = results;
    await page.setViewportSize({ width: 1440, height: 1100 });
  });

  await kase('ARP-03', 'Update stays visible but inert while a Codex agent runs, with the count; enabled after it ends (AC-004)', async () => {
    const agentId = (await gql(node, 'mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
      { i: { name: 'Probe agent', role: 'assistant', description: 'AC-004 probe', instructions: 'Help.', toolNames: [] } })).createAgentDefinition.id;
    const created = (await gql(node, 'mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}',
      { i: { agentDefinitionId: agentId, workspaceRootPath: path.join(node.dataRoot, 'workspace'), llmModelIdentifier: 'gpt-5.6-luna', llmConfig: null, autoExecuteTools: true, runtimeKind: CODEX } })).createAgentRun;
    assert(created.success, created.message);
    // The page polls every 10 s while idle; the count arrives with the next poll.
    await waitFor('blocked line', async () => present(`runtime-${CODEX}-blocked`), 25000);
    assert(await text(`runtime-${CODEX}-blocked`) === 'Update unavailable while 1 agent is running.', `blocked copy ${await text(`runtime-${CODEX}-blocked`)}`);
    assert(await locate(`runtime-${CODEX}-update`).getAttribute('aria-disabled') === 'true', 'Update is aria-disabled');
    assert(await locate(`runtime-${CODEX}-update`).getAttribute('aria-describedby') === `runtime-${CODEX}-blocked`, 'reason linked');
    const before = mutationsSent.length;
    // A user can still press it (it stays focusable); Playwright treats aria-disabled as not enabled, so force the click.
    await locate(`runtime-${CODEX}-update`).click({ force: true });
    await sleep(800);
    assert(mutationsSent.length === before, 'a blocked Update sent a mutation');
    assert(await rowState(CODEX) === 'update_available', 'blocked Update changed the row');
    await shot('ARP-03-VIS-007-blocked-by-agent');
    const terminated = (await gql(node, 'mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: created.runId })).terminateAgentRun;
    assert(terminated.success, terminated.message);
    await waitFor('Update enabled again', async () => !(await present(`runtime-${CODEX}-blocked`)), 25000);
    assert(await locate(`runtime-${CODEX}-update`).getAttribute('aria-disabled') === null, 'Update enabled');
  });

  await kase('ARP-04', 'Update: Updating… with the command and the vendor step, then "Updated from 0.150.0 to 0.163.0." and Up to date, announced (AC-003, VIS-004/005)', async () => {
    await click(`runtime-${CODEX}-update`);
    await waitState(CODEX, 'update_running');
    assert(await text(`runtime-${CODEX}-updating`) === 'Updating…', 'updating button');
    await waitFor('vendor step', async () => (await text(`runtime-${CODEX}-progress`)).startsWith('codex update · '), 10000);
    evidence.cases['ARP-04-progress'] = await text(`runtime-${CODEX}-progress`);
    await shot('ARP-04a-VIS-004-updating');
    await waitFor('updated', async () => present(`runtime-${CODEX}-updated`), 20000);
    assert(await text(`runtime-${CODEX}-updated`) === 'Updated from 0.150.0 to 0.163.0.', `updated copy ${await text(`runtime-${CODEX}-updated`)}`);
    await waitFor('up to date after re-check', async () => (await text(`runtime-${CODEX}-status`)) === 'Up to date');
    assert((await text(`runtime-${CODEX}-installed`)).includes('0.163.0'), 'new version shown');
    assert(await text(`runtime-${CODEX}-updated`) === 'Updated from 0.150.0 to 0.163.0.', 'result kept after the re-check (AR-006)');
    await waitFor('announcement', async () => (await page.locator('[data-testid="agent-runtimes-announce"]').textContent()).includes('Codex updated to 0.163.0.'));
    await shot('ARP-04b-VIS-005-updated');
  });

  await kase('ARP-05', "Check again: Claude's source recovers; its update fails with the vendor's message and Try again (AC-002, AC-003, VIS-006)", async () => {
    fakes.sources.claude = { status: 200, body: '2.1.304\n' };
    await fakes.writeSources();
    await click('agent-runtimes-check-again');
    await waitFor('claude update available', async () => (await text(`runtime-${CLAUDE}-status`)) === 'Update available (version 2.1.304)', 20000);
    assert(!(await present(`runtime-${CODEX}-updated`)), 'Check again cleared the finished update');
    await click(`runtime-${CLAUDE}-update`);
    await waitFor('claude failed', async () => present(`runtime-${CLAUDE}-update-failed`), 20000);
    assert((await text(`runtime-${CLAUDE}-update-failed`)).startsWith('Update failed. Version 2.1.200 is unchanged.'), 'failed copy');
    assert((await text(`runtime-${CLAUDE}-update-error`)).includes("EACCES: permission denied"), 'vendor message shown');
    assert(await text(`runtime-${CLAUDE}-update`) === 'Try again', 'Try again');
    await shot('ARP-05-VIS-006-update-failed');
  });

  await kase('ARP-06', 'Sign in: Signing in… + "Finish signing in to Codex in your browser." + Cancel; then completion → Signed in, announced (AC-007, VIS-008/009)', async () => {
    await click(`runtime-${CODEX}-signin-button`);
    await waitState(CODEX, 'sign_in_running');
    assert(await text(`runtime-${CODEX}-signin-button`) === 'Signing in…', 'signing in label');
    assert(await locate(`runtime-${CODEX}-signin-button`).isDisabled(), 'button disabled while signing in');
    assert(await text(`runtime-${CODEX}-signin-waiting`) === 'Finish signing in to Codex in your browser.', 'waiting copy');
    await shot('ARP-06a-VIS-008-signing-in');
    await click(`runtime-${CODEX}-signin-cancel`);
    await waitFor('back to Sign in', async () => (await present(`runtime-${CODEX}-signin-button`)) && (await text(`runtime-${CODEX}-signin-button`)) === 'Sign in', 15000);
    assert(!(await present(`runtime-${CODEX}-signin-outcome`)), 'no outcome after cancel');
    await click(`runtime-${CODEX}-signin-button`);
    await waitState(CODEX, 'sign_in_running');
    await fakes.set('codex-login', 'complete');
    await waitFor('signed in', async () => (await text(`runtime-${CODEX}-signin`)) === 'Signed in', 20000);
    assert(!(await present(`runtime-${CODEX}-signin-button`)), 'no Sign in when signed in');
    await waitFor('announcement', async () => (await page.locator('[data-testid="agent-runtimes-announce"]').textContent()).includes('Codex is signed in.'));
    await shot('ARP-06b-VIS-009-signed-in');
  });

  await kase('ARP-07', 'zh-CN: menu, title, hints and statuses in Chinese at 1440 px (table) and 739 px (stacked)', async () => {
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    await open();
    await waitFor('rows', async () => (await rowState(AGY)) === 'up_to_date', 20000);
    assert(await text('settings-nav-agent-runtimes') === '智能体运行时', `zh nav ${await text('settings-nav-agent-runtimes')}`);
    assert((await page.locator('#agent-runtimes-heading').innerText()).trim() === '智能体运行时', 'zh title');
    assert(await text(`runtime-${GROK}-restart-hint`) === '安装后请重启 AutoByteus。', 'zh restart hint');
    assert(await text(`runtime-${AGY}-signin-hint`) === '请在其命令行中登录。', 'zh command-line hint');
    assert((await layout()).columnsDisplay === 'grid', 'zh table at 1440');
    await shot('ARP-07a-zh-CN-1440');
    await page.setViewportSize({ width: 739, height: 1100 });
    await sleep(400);
    const facts = await layout();
    assert(facts.columnsDisplay === 'none' && !facts.pageOverflowX && facts.overlaps.length === 0, `zh 739: ${JSON.stringify(facts)}`);
    await shot('ARP-07b-zh-CN-739-stacked');
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  });

  await kase('ARP-08', 'A remote node window: same rows and statuses, no Update, no Sign in, no hint, the status-only note (AC-010, VIS-019)', async () => {
    await open();
    await waitFor('rows', async () => (await rowState(AGY)) === 'up_to_date', 20000);
    const ownStates = {};
    for (const runtime of [CODEX, CLAUDE, AGY, GROK]) ownStates[runtime] = await rowState(runtime);
    // Bind this window to a node other than the embedded one (same backend), as a remote node's window is bound.
    await page.evaluate((url) => {
      const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
      pinia._s.get('windowNodeContext').bindNodeContext('remote-probe-node', url);
    }, node.url);
    await waitFor('remote note', async () => present('agent-runtimes-remote-note'), 20000);
    await waitFor('rows re-read', async () => (await rowState(AGY)) === 'up_to_date', 20000);
    assert(await text('agent-runtimes-remote-note') === "Status only. Update these runtimes on that node's computer.", 'remote note copy');
    // The probe's node is not in the window's node registry, so its name reads as unknown; a real remote window has its name.
    assert(/·\s*Remote node$/.test(await text('agent-runtimes-node')), `node line ${await text('agent-runtimes-node')}`);
    for (const runtime of [CODEX, CLAUDE, AGY, GROK]) {
      assert(await rowState(runtime) === ownStates[runtime].replace(/^update_(succeeded|failed)$/, 'update_available'), `${runtime} state ${await rowState(runtime)} vs own ${ownStates[runtime]}`);
      for (const suffix of ['update', 'signin-button', 'signin-hint', 'blocked', 'signin-outcome']) {
        assert(!(await present(`runtime-${runtime}-${suffix}`)), `${runtime}-${suffix} shown on a remote node`);
      }
    }
    assert(await page.locator('[data-testid$="-actions"] button').count() === 0, 'no action buttons on a remote node');
    await shot('ARP-08-VIS-019-remote-node');
  });

  await kase('ARP-09', "A node that can't be read: the error with Retry (VIS-018)", async () => {
    await page.evaluate(() => {
      const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
      pinia._s.get('windowNodeContext').bindNodeContext('unreachable-probe-node', 'http://127.0.0.1:9');
    });
    await waitFor('load error', async () => present('agent-runtimes-load-error'), 30000);
    assert((await text('agent-runtimes-load-error')).startsWith("Couldn't read the agent runtimes on this node."), 'error copy');
    assert(await text('agent-runtimes-load-retry') === 'Retry', 'retry');
    await shot('ARP-09-VIS-018-load-error');
    await page.evaluate((url) => {
      const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
      pinia._s.get('windowNodeContext').bindNodeContext('embedded-local', url);
    }, node.url);
  });

  await kase('ARP-10', 'No sign-in URL, code or account detail in the page, its GraphQL responses or the backend logs (AC-011)', async () => {
    const secrets = await fakes.secrets();
    assert(secrets.length >= 2, `the fakes printed ${secrets.length} secrets`);
    const markers = [...secrets, 'FAKE-SECRET'];
    const logFiles = [];
    const walk = async dir => { for (const entry of await fs.readdir(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) await walk(full); else logFiles.push(full); } };
    await walk(node.dataRoot);
    const corpora = { page: await page.content(), graphqlResponses: graphqlResponses.join('\n'), backendStdout: await fs.readFile(path.join(outputDir, 'backend.log'), 'utf8') };
    for (const file of logFiles) corpora[path.relative(node.dataRoot, file)] = await fs.readFile(file, 'latin1');
    const hits = Object.entries(corpora).flatMap(([where, content]) => markers.filter(marker => content.includes(marker)).map(marker => `${where}: ${marker}`));
    evidence.cases['ARP-10-scan'] = { markers: markers.length, graphqlResponses: graphqlResponses.length, dataFiles: logFiles.length, hits };
    assert(graphqlResponses.length > 20, 'responses captured');
    assert(hits.length === 0, `secrets found: ${hits.join('; ')}`);
  });

  evidence.apiAtEnd = await apiRows(node);
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

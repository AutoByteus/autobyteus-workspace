#!/usr/bin/env node
// Browser + server probe for autobyteus-290 (node vocabulary): what the window shows and keeps when a node and the window
// itself are upgraded over released data. Real servers built from this worktree, `nuxt dev` against alpha, headless Chrome.
//
// Servers (`autobyteus-server-ts/dist/app.js`, each with its own temp data root and HOME): alpha is the window's node and a
// Memory Sync hub; beta is alpha's peer and syncs its memory into alpha. Both are set up through their public APIs. Then
// beta is turned into a node whose identity file is the released `server-instance.json`, cut short, with no record of the
// SM-1 migration (what a damaged file on a released node gives at upgrade), so beta holds back `node_identity`.
//
// The window is served on this machine's LAN address (a phone pairing needs a non-local address) and starts with the
// released browser storage: the node list under `autobyteus.node_registry.v1` (with `serverInstanceId` and `isSystem`) and,
// in the phone shell, a real paired session under `autobyteus.remote_access.mobile_session.v1` (`version: 1`, `nodeId`).
//
// Cases:
// - NVP-01 (SM-7): the released list becomes `autobyteus.node_registry` with `nodeId`, no `isSystem`, the same entries;
//   the released key is gone. The Nodes tab lists beta once.
// - NVP-02 (REQ-913): beta's row says "This node's identity is waiting for its data migration." while the page works.
// - NVP-03 (REQ-910): the Memory Sync card's label is "Memory Sync source ID" (en) and "记忆同步源 ID" (zh-CN); the Memory
//   page lists this node's memory and beta's imported memory.
// - NVP-04 (SM-8): the phone shell opens paired (its home, not the pairing screen) from the released session; the session
//   is stored as `autobyteus.remote_access.mobile_session` with `entryId` and without `version`; the released key is gone.
// - NVP-05 (REQ-913): alpha restarted with its hub credentials released and cut short (no record of SM-2 … SM-5): the card
//   shows "Memory Sync is waiting for its data migration."; the Memory page lists only this node's memory.
//
// Prerequisites: `pnpm -C autobyteus-server-ts build`; `sqlite3` on PATH; a LAN IPv4 address. Run:
// `pnpm -C autobyteus-web test:e2e:node-vocabulary`. `--output-dir=<dir>` keeps the evidence, `--browser-executable=<path>`
// selects Chrome. Takes about 3–4 minutes.
import { createWriteStream, existsSync, mkdtempSync, readdirSync, realpathSync, statSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serverDir = path.join(path.dirname(webDir), 'autobyteus-server-ts');
const appEntry = path.join(serverDir, 'dist', 'app.js');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/node-vocabulary'));
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const RELEASED_REGISTRY_KEY = 'autobyteus.node_registry.v1';
const REGISTRY_KEY = 'autobyteus.node_registry';
const RELEASED_SESSION_KEY = 'autobyteus.remote_access.mobile_session.v1';
const SESSION_KEY = 'autobyteus.remote_access.mobile_session';
const IDENTITY_TEXT = "This node's identity is waiting for its data migration.";
const MEMORY_SYNC_TEXT = 'Memory Sync is waiting for its data migration.';
const SOURCE_ID = 'nvp-beta-source';
const redact = text => String(text).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…');
let phase = 'setup';
const recordError = (label, text) => evidence.browserErrors.push({ phase, text: redact(`${label}: ${text}`) });
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', node: process.version, servers: {}, cases: {}, browserErrors: [], cleanup: {}, error: null };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
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
const lanAddress = Object.values(os.networkInterfaces()).flat().find(entry => entry && entry.family === 'IPv4' && !entry.internal
  && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address))?.address;

let currentCase = null;
let expectations = [];
const expect = (condition, message) => { if (!condition) expectations.push(message); };
const runCase = async (id, fn) => {
  currentCase = id;
  expectations = [];
  const startedAt = Date.now();
  console.log(`[probe] ${id} started`);
  const details = await fn();
  evidence.cases[id] = { result: expectations.length ? 'Fail' : 'Pass', ms: Date.now() - startedAt, failedExpectations: expectations, ...details };
  console.log(`[probe] ${id} ${evidence.cases[id].result}${expectations.length ? `: ${expectations.join(' | ')}` : ''}`);
};

const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'node-vocabulary-probe-')));
const children = new Set();

const serverAt = async (name, port) => {
  const dataDir = path.join(root, name, 'data');
  const home = path.join(root, name, 'home');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(home, { recursive: true });
  const baseUrl = `http://127.0.0.1:${port}`;
  await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\nHTTP_ACCESS_LOG_MODE=off\n`);
  const node = { name, port, baseUrl, dataDir, child: null, nodeId: '' };
  node.start = async () => {
    const log = createWriteStream(path.join(outputDir, `server-${name}.log`), { flags: 'a' });
    const child = spawn(process.execPath, [appEntry, '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
      cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN',
        HTTP_ACCESS_LOG_MODE: 'off', AUTOBYTEUS_SERVER_HOST: baseUrl } });
    child.stdout.pipe(log); child.stderr.pipe(log);
    child.once('close', () => log.end());
    children.add(child);
    node.child = child;
    await waitFor(`${name} health`, async () => {
      if (exited(child)) throw new Error(`${name} exited ${child.exitCode}`);
      return fetch(`${baseUrl}/rest/health`).then(response => response.ok).catch(() => false);
    }, 120_000);
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
    const response = await fetch(`${baseUrl}/rest${route}`, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  await node.start();
  node.nodeId = (await node.rest('GET', '/remote-access/status')).body.nodeId;
  evidence.servers[name] = { port, nodeId: node.nodeId };
  return node;
};
const listFiles = dir => !existsSync(dir) ? [] : readdirSync(dir).flatMap(name => {
  const full = path.join(dir, name);
  return statSync(full).isDirectory() ? listFiles(full) : [full];
});
/** Removes a migration's record, as on a node whose released build never ran it. */
const forgetMigration = (node, id) => {
  const database = listFiles(node.dataDir).find(file => file.endsWith('.db'));
  execFileSync('sqlite3', [database, `DELETE FROM app_data_migration_records WHERE migration_id='${id}';`]);
};
const renameKey = (value, from, to) => Object.fromEntries(Object.entries(value).map(([key, entry]) => [key === from ? to : key, entry]));
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));

let frontend, browser;
await fs.mkdir(outputDir, { recursive: true });
try {
  assert(existsSync(appEntry), 'Build the worktree server first: pnpm -C autobyteus-server-ts build');
  assert(lanAddress, 'A LAN IPv4 address is needed for the phone pairing');
  const [alpha, beta] = await Promise.all([serverAt('alpha', await freePort()), serverAt('beta', await freePort())]);

  // Earlier use, through the servers' own APIs: peers both ways; beta syncs its memory into alpha's hub.
  for (const node of [alpha, beta]) await node.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
  await alpha.gql('mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { nodeId: beta.nodeId, baseUrl: beta.baseUrl, name: 'beta' } });
  await beta.gql('mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { nodeId: alpha.nodeId, baseUrl: alpha.baseUrl, name: 'alpha' } });
  const hub = await alpha.gql('mutation($i:UpdateMemoryHubConfigInput!){updateMemoryHubConfig(input:$i){oneTimePlaintextToken}}', { i: { enabled: true, advertisedHubBaseUrl: alpha.baseUrl } });
  const runDir = path.join(beta.dataDir, 'memory', 'agents', 'nvp-run');
  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(path.join(runDir, 'run_metadata.json'), JSON.stringify({ runId: 'nvp-run', agentDefinitionId: 'nvp-agent', workspaceRootPath: '/w', memoryDir: runDir,
    llmModelIdentifier: 'model-a', llmConfig: null, autoExecuteTools: false, runtimeKind: 'autobyteus', platformAgentRunId: null, startedAt: '2026-10-24T00:00:00.000Z' }));
  await fs.writeFile(path.join(runDir, 'raw_traces_active.jsonl'), `${JSON.stringify({ id: 't1', traceType: 'user', content: 'from beta', seq: 1, ts: 1 })}\n`);
  await beta.gql('mutation($i:UpdateMemorySyncSourceConfigInput!){updateMemorySyncSourceConfig(input:$i){source{memorySyncSourceId}}}',
    { i: { enabled: true, memorySyncSourceId: SOURCE_ID, displayName: 'Beta', hubBaseUrl: alpha.baseUrl, hubToken: hub.updateMemoryHubConfig.oneTimePlaintextToken, backgroundEnabled: false, batchSize: 25 } });
  const synced = (await beta.gql('mutation{startMemorySync{committedBatches}}')).startMemorySync;
  assert(synced.committedBatches === 1, `beta synced into alpha: ${JSON.stringify(synced)}`);

  // Beta upgraded over a damaged released identity file: held back.
  await beta.stop();
  const identityFile = path.join(beta.dataDir, 'remote-access', 'node-identity.json');
  await fs.rm(identityFile);
  await fs.writeFile(path.join(beta.dataDir, 'remote-access', 'server-instance.json'), '{ "serverInstanceId": ');
  forgetMigration(beta, '20261024_node_identity_file_name');
  await beta.start();
  const betaStatus = await beta.rest('GET', '/remote-access/status');
  assert(betaStatus.status === 503 && betaStatus.body?.code === 'NODE_IDENTITY_NOT_MIGRATED', `beta is held back: ${JSON.stringify(betaStatus)}`);

  // Phone access: a real pairing for the phone shell's released session.
  const frontendPort = await freePort();
  const frontendUrl = `http://${lanAddress}:${frontendPort}`;
  await alpha.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
  const pairing = await alpha.rest('POST', '/remote-access/pairing-sessions', { serverBaseUrl: `${frontendUrl}/mobile`, trustedPrivateHttpAcknowledged: true });
  assert(pairing.status === 201, `pairing session: ${JSON.stringify(pairing)}`);
  const exchange = await alpha.rest('POST', '/remote-access/pairing-exchanges', { pairingCode: pairing.body.payload.pairingCode, deviceName: 'Probe Phone' });
  assert(exchange.status === 201 && /^mra_/.test(exchange.body.credential ?? ''), `pairing exchange: ${exchange.status}`);
  const releasedSession = { version: 1, nodeId: 'mobile-paired-node', serverBaseUrl: exchange.body.serverBaseUrl, credential: exchange.body.credential,
    device: exchange.body.device, pairedAt: '2026-10-20T10:00:00.000Z' };

  const release = (id, name, baseUrl, nodeType, extra) => ({ id, name, baseUrl, nodeType, capabilities: { terminal: true, fileExplorerStreaming: true },
    capabilityProbeState: 'ready', isSystem: nodeType === 'embedded', createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-01T10:00:00.000Z', ...extra });
  const releasedRegistry = { version: 7, nodes: [
    release('embedded-local', 'Embedded Node', alpha.baseUrl, 'embedded', { serverInstanceId: alpha.nodeId }),
    release('remote-beta-entry', 'beta box', beta.baseUrl, 'remote', { serverInstanceId: beta.nodeId }),
  ] };

  frontend = spawn('corepack', ['pnpm', 'dev', '--host', lanAddress, '--port', String(frontendPort)], { cwd: webDir, detached: true,
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: alpha.baseUrl } });
  const frontendLog = createWriteStream(path.join(outputDir, 'frontend.log'));
  frontend.stdout.pipe(frontendLog); frontend.stderr.pipe(frontendLog);
  await waitFor('frontend', async () => {
    if (exited(frontend)) throw new Error(`frontend exited ${frontend.exitCode}`);
    return fetch(`${frontendUrl}/nodes?nodeTab=manage`).then(response => response.ok).catch(() => false);
  }, 240_000);

  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
  await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', localStorage.getItem('probe-locale') ?? 'en'));
  const page = await context.newPage();
  // Warm the dev server on every page the probe opens (first compiles re-optimize and reload), then give the window the
  // released storage and load it fresh.
  for (const route of ['/mobile', '/memory', '/nodes?nodeTab=manage']) {
    await page.goto(`${frontendUrl}${route}`, { waitUntil: 'networkidle', timeout: 240_000 }).catch(() => undefined);
    await sleep(2_000);
  }
  await page.evaluate(key => localStorage.removeItem(key), SESSION_KEY);
  await page.goto(`${frontendUrl}/nodes?nodeTab=memorySync`, { waitUntil: 'networkidle', timeout: 240_000 });
  await page.locator('[data-testid="node-manager-panel-memorySync"]').waitFor({ state: 'visible', timeout: 120_000 });
  page.on('pageerror', error => recordError('pageerror', error.message));
  page.on('requestfailed', request => recordError('requestfailed', `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`));
  await page.evaluate(({ released, current, registry }) => {
    localStorage.removeItem(current); localStorage.removeItem(`${released}:backup`); localStorage.setItem(released, JSON.stringify(registry));
  }, { released: RELEASED_REGISTRY_KEY, current: REGISTRY_KEY, registry: releasedRegistry });
  page.on('console', message => { if (message.type() === 'error') recordError('console', message.text()); });
  await page.goto(`${frontendUrl}/nodes?nodeTab=manage`, { waitUntil: 'domcontentloaded' });
  const storage = key => page.evaluate(storageKey => localStorage.getItem(storageKey), key);

  phase = 'NVP-01..03';
  await runCase('NVP-01', async () => {
    await waitFor('the converted list', async () => (await storage(REGISTRY_KEY)) !== null, 30_000);
    const stored = JSON.parse(await storage(REGISTRY_KEY));
    const releasedLeft = await storage(RELEASED_REGISTRY_KEY);
    const byId = Object.fromEntries(stored.nodes.map(node => [node.id, node]));
    expect(releasedLeft === null, `the released key is gone: ${releasedLeft}`);
    expect(!stored.nodes.some(node => 'isSystem' in node || 'serverInstanceId' in node), `no released field: ${JSON.stringify(stored)}`);
    expect(byId['remote-beta-entry']?.nodeId === beta.nodeId && byId['remote-beta-entry']?.name === 'beta box' && byId['remote-beta-entry']?.baseUrl === beta.baseUrl,
      `beta's entry keeps its values: ${JSON.stringify(byId['remote-beta-entry'])}`);
    expect(byId['embedded-local']?.nodeId === alpha.nodeId, `the embedded entry keeps its node ID: ${JSON.stringify(byId['embedded-local'])}`);
    await page.locator('[data-testid^="node-name-"]').first().waitFor({ state: 'visible', timeout: 30_000 });
    const names = await page.locator('[data-testid^="node-name-"]').allInnerTexts();
    expect(names.filter(name => /beta/.test(name)).length === 1, `beta is listed once: ${JSON.stringify(names)}`);
    return { stored, names, backup: await storage(`${RELEASED_REGISTRY_KEY}:backup`) };
  });

  await runCase('NVP-02', async () => {
    let lines = [];
    await waitFor('beta\'s reason', async () => (lines = await page.locator('[data-testid^="node-line-"]').allInnerTexts()).some(text => text.includes(IDENTITY_TEXT)), 30_000)
      .catch(() => undefined);
    expect(lines.some(text => text.includes(IDENTITY_TEXT)), `a row says beta's identity is waiting: ${JSON.stringify(lines)}`);
    await page.screenshot({ path: path.join(outputDir, 'NVP-02-nodes-tab.png'), fullPage: true });
    return { lines };
  });

  const memorySources = async () => {
    await page.goto(`${frontendUrl}/memory`, { waitUntil: 'domcontentloaded' });
    await page.locator('#memory-source-select').waitFor({ state: 'visible', timeout: 60_000 });
    await sleep(1_500);
    return page.locator('#memory-source-select option').evaluateAll(options => options.map(option => option.value));
  };
  const cardLabel = async () => {
    await page.goto(`${frontendUrl}/nodes?nodeTab=memorySync`, { waitUntil: 'domcontentloaded' });
    const input = page.locator('[data-testid="memory-sync-source-id"]');
    await input.waitFor({ state: 'visible', timeout: 60_000 });
    return (await input.locator('xpath=..').innerText()).trim();
  };

  await runCase('NVP-03', async () => {
    const en = await cardLabel();
    await page.screenshot({ path: path.join(outputDir, 'NVP-03-card-en.png'), fullPage: true });
    await page.evaluate(() => localStorage.setItem('probe-locale', 'zh-CN'));
    const zh = await cardLabel();
    await page.screenshot({ path: path.join(outputDir, 'NVP-03-card-zh-CN.png'), fullPage: true });
    await page.evaluate(() => localStorage.setItem('probe-locale', 'en'));
    const sources = await memorySources();
    expect(en === 'Memory Sync source ID', `en label: ${en}`);
    expect(zh === '记忆同步源 ID', `zh-CN label: ${zh}`);
    expect(sources.includes('local') && sources.includes(`imported:${SOURCE_ID}`), `this node's and beta's imported memory: ${JSON.stringify(sources)}`);
    return { en, zh, sources };
  });

  phase = 'NVP-04';
  await runCase('NVP-04', async () => {
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, locale: 'en-US', timezoneId: 'UTC' });
    await phone.addInitScript(({ key, session }) => {
      localStorage.setItem('autobyteus.localization.preference-mode', 'en');
      if (!localStorage.getItem('probe-seeded')) { localStorage.setItem(key, JSON.stringify(session)); localStorage.setItem('probe-seeded', '1'); }
    }, { key: RELEASED_SESSION_KEY, session: releasedSession });
    const mobile = await phone.newPage();
    mobile.on('pageerror', error => recordError('phone pageerror', error.message));
    mobile.on('console', message => { if (message.type() === 'error') recordError('phone console', message.text()); });
    mobile.on('requestfailed', request => recordError('phone requestfailed', `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`));
    await mobile.goto(`${frontendUrl}/mobile`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    let shown = null;
    await waitFor('the phone shell', async () => {
      if (await mobile.locator('[data-testid="mobile-home"]').count()) shown = 'home';
      else if (await mobile.locator('[data-testid="mobile-pairing-bootstrap"]').count()) shown = 'pairing';
      return shown !== null;
    }, 60_000).catch(() => undefined);
    await sleep(1_000);
    const stored = JSON.parse(await mobile.evaluate(key => localStorage.getItem(key), SESSION_KEY) ?? 'null');
    const releasedLeft = await mobile.evaluate(key => localStorage.getItem(key), RELEASED_SESSION_KEY);
    await mobile.screenshot({ path: path.join(outputDir, 'NVP-04-phone.png'), fullPage: true });
    const { version: _version, nodeId, ...rest } = releasedSession;
    expect(shown === 'home' && !(await mobile.locator('[data-testid="mobile-pairing-bootstrap"]').count()), `the phone stays paired: ${shown}`);
    expect(JSON.stringify(stored) === JSON.stringify({ entryId: nodeId, ...rest }), `the session's current shape: ${JSON.stringify({ ...stored, credential: stored?.credential ? 'mra_…' : null })}`);
    expect(releasedLeft === null, 'the released key is gone');
    await phone.close();
    return { shown, storedKeys: stored ? Object.keys(stored) : null, entryId: stored?.entryId };
  });

  phase = 'NVP-05 restart';
  await runCase('NVP-05', async () => {
    await alpha.stop();
    // Alpha's Memory Sync files under the released names, its hub credentials cut short, and no record of SM-2 … SM-5.
    const credentials = path.join(alpha.dataDir, 'memory-sync', 'hub-credentials.json');
    await fs.writeFile(credentials, '[{ "boundSourceNodeId": ');
    const importDir = path.join(alpha.dataDir, 'memory', 'imports', SOURCE_ID);
    const metadata = path.join(importDir, 'memory-sync-source.json');
    await fs.writeFile(path.join(importDir, 'source-node.json'), JSON.stringify(renameKey(await readJson(metadata), 'memorySyncSourceId', 'sourceNodeId'), null, 2));
    await fs.rm(metadata);
    forgetMigration(alpha, '20261024_memory_sync_source_id_names');
    await alpha.start();
    phase = 'NVP-05';
    await page.goto(`${frontendUrl}/nodes?nodeTab=memorySync`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="node-manager-panel-memorySync"]').waitFor({ state: 'visible', timeout: 60_000 });
    let panel = '';
    await waitFor('the card\'s reason', async () => (panel = await page.locator('[data-testid="node-manager-panel-memorySync"]').innerText()).includes(MEMORY_SYNC_TEXT), 30_000)
      .catch(() => undefined);
    await page.screenshot({ path: path.join(outputDir, 'NVP-05-card-held-back.png'), fullPage: true });
    const sources = await memorySources();
    await page.screenshot({ path: path.join(outputDir, 'NVP-05-memory-page.png'), fullPage: true });
    expect(panel.includes(MEMORY_SYNC_TEXT), `the card shows the reason: ${panel.slice(0, 400)}`);
    expect(JSON.stringify(sources) === JSON.stringify(['local']), `only this node's memory: ${JSON.stringify(sources)}`);
    return { sources, cardHasReason: panel.includes(MEMORY_SYNC_TEXT) };
  });

  // Expected browser errors: the held-back answers the page reports (503s from beta's status and alpha's Memory Sync), and
  // the open page's connections to alpha while NVP-05 restarts it.
  evidence.unexpectedBrowserErrors = evidence.browserErrors.filter(({ phase: at, text }) => !/favicon|DevTools|503|Service Unavailable|waiting for its data migration/.test(text)
    && !(at === 'NVP-05 restart' && /ERR_CONNECTION_REFUSED|ERR_EMPTY_RESPONSE|ERR_CONNECTION_RESET|WebSocket connection/.test(text))
    // Harness: the phone shell's sockets go to its session's address, here the `nuxt dev` origin, whose proxy covers only
    // /graphql and /rest (nuxt.config.ts); a phone's session address is the node itself.
    && !(text.includes(`WebSocket connection to 'ws://${lanAddress}:${frontendPort}/ws/`) && text.includes('Unexpected response code: 200'))
    // Harness: that unproxied socket can reset `nuxt dev`, which restarts (frontend.log: "read ECONNRESET", a second
    // banner); the phone's requests to the dev origin are refused until it is back.
    && !(at === 'NVP-04' && (text.includes(`${lanAddress}:${frontendPort}/`) || text === 'phone console: Failed to load resource: net::ERR_CONNECTION_REFUSED')
      && /ERR_CONNECTION_REFUSED/.test(text))
    // Harness: a navigation aborts the page's in-flight requests.
    && !/requestfailed: .* net::ERR_ABORTED$/.test(text));
  evidence.result = Object.values(evidence.cases).every(entry => entry.result === 'Pass') && evidence.unexpectedBrowserErrors.length === 0 ? 'Pass' : 'Fail';
  if (evidence.result !== 'Pass') process.exitCode = 1;
} catch (error) {
  evidence.error = error instanceof Error ? error.stack ?? error.message : String(error);
  if (currentCase && !evidence.cases[currentCase]) evidence.cases[currentCase] = { result: 'Fail', error: evidence.error, failedExpectations: expectations };
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (frontend && !exited(frontend)) {
    try { process.kill(-frontend.pid, 'SIGTERM'); } catch { /* gone */ }
    await Promise.race([new Promise(resolve => frontend.once('close', resolve)), sleep(8_000)]);
    if (!exited(frontend)) { try { process.kill(-frontend.pid, 'SIGKILL'); } catch { /* gone */ } }
  }
  for (const child of [...children]) {
    if (!exited(child)) { child.kill('SIGTERM'); await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(8_000)]); if (!exited(child)) child.kill('SIGKILL'); }
  }
  evidence.cleanup = { frontendExited: !frontend || exited(frontend), serversLeft: [...children].filter(child => !exited(child)).length };
  await fs.rm(root, { recursive: true, force: true });
  evidence.cleanup.rootRemoved = !existsSync(root);
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'node-vocabulary-probe.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`[probe] result ${evidence.result}; evidence ${outputDir}`);
}

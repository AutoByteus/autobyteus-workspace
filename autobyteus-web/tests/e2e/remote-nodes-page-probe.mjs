#!/usr/bin/env node
// Browser + server probe for Nodes → Manage Nodes (one-nodes-tab, which replaced 267's Remote Collaboration tab): one
// list of nodes, each added once, collaboration turned on in one confirmed step on both nodes. It drives a real browser
// against test-owned servers built from this worktree and keeps the window's full request log.
//
// Servers (`autobyteus-server-ts/dist/app.js`, each with its own temp data root and HOME): alpha is the window's node
// (fresh, so its switch is off). Before the list opens with alpha's switch on, the probe uses the servers' GraphQL to
// create what earlier use of the app leaves behind:
// - beta collaborates both ways and shares 3 Agents. The browser's desktop list has it as `http://localhost:<port>`.
//   This is the user's "http://localhost:8001" + peer "docker" case. The list is in the shape the current release
//   writes, with `capabilities` and `capabilityProbeState`.
// - gamma collaborates and is stopped. It also has a desktop entry ("gamma box") that was never reached.
// - delta collaborates and has its switch off.
// - epsilon is registered on alpha only.
// - zeta's address is taken over by another server.
// - theta is black-holed: a TCP listener that never answers.
// - lambda already knows another node as "Embedded Node".
// iota, kappa, lambda and mu are added through the page. The web app runs with `nuxt dev` against alpha (browser mode,
// so there is no Open). The browser is Chrome through playwright-core.
//
// Cases:
// - NP-01 (AC-701): the tabs have no Remote Collaboration, and `?nodeTab=remoteCollaboration` falls to Manage Nodes.
//   This node's switch is off by default and is turned on from the page.
// - NP-02 (AC-702, REQ-711): one row per node. beta's desktop entry and alpha's peer "beta" become one row named
//   "beta" once the window learns beta's node ID, which it stores. gamma's never-reached entry is its own row.
// - NP-03 (AC-706, AC-710): each row settles at its own pace. theta shows Checking… and then Not reachable at the 20 s
//   bound, while the page stays usable.
// - NP-11 (REQ-712, AC-713): 267's timing on the one list. Check again asks one node. With this node's switch off, no
//   peer is asked and no warnings show. Turning it on asks every peer once. Nothing polls.
// - NP-04 (AC-703; both nodes' peers.json checked): adding a node. With the switch off it is only listed. With it on,
//   the confirmation includes turning the other node on, and Cancel changes nothing. A node already listed is refused,
//   by node ID and by address while that node is down. An unreachable node is added with its cause.
// - NP-05 (AC-704): Turn on kappa from its row. Both sides are registered with pinned node IDs, kappa's switch is
//   turned on, both directions show Working, and each server lists the other's Agents.
// - NP-06 (naming rule): lambda already has a node named "Embedded Node", so this node is registered there as
//   "Embedded Node 2".
// - NP-07 (naming race): mu gains a node named "Embedded Node" between the confirmation and Turn on. The step fails
//   with "mu already has a node named Embedded Node.". The row keeps Try again, which plans again with a free name.
// - NP-08 (AC-708): rename with an invalid name, then a taken one, then a saved one, on this node's peer and in the
//   desktop list.
// - NP-09 (AC-705): Turn off kappa: both registrations go and kappa's switch is untouched. Then turn off lambda while
//   it is stopped: the failed line and its cause show.
// - NP-10 (AC-709): Remove mu: three lines, and it is gone from both nodes and the list. Then remove beta while it is
//   stopped: "Removed here. beta could not be reached, so this node is still registered there."
// - NP-12 (267 REQ-503): the window never asks another node for an offer. Every offer query goes to alpha. The other
//   nodes see only their settings API and the identity page.
//
// Prerequisite: `pnpm -C autobyteus-server-ts build`. Run: `pnpm -C autobyteus-web test:e2e:remote-nodes-page`.
// `--output-dir=<dir>` keeps the evidence, `--browser-executable=<path>` selects Chrome. Takes about 4–5 minutes.
import { createWriteStream, existsSync, mkdtempSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
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
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/remote-nodes-page'));
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const BOUND_MS = 20_000;
const REGISTRY_KEY = 'autobyteus.node_registry.v1';
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', node: process.version, browserExecutable: executablePath || 'playwright-default',
  servers: {}, cases: {}, requests: [], browserErrors: [], cleanup: {}, error: null };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (description, fn, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await fn()) return; } catch (error) { lastError = error; }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
});
const exited = child => child.exitCode !== null || child.signalCode !== null;

// A case stops at its first failed `assert`. A failed `expect` is recorded and the case goes on, so one wrong text does
// not hide the cases after it; the case and the run then fail.
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

const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'remote-nodes-page-')));
const children = new Set();
const blackHoles = [];

/** One server process with its own data root and HOME. */
const startServer = async (name, port) => {
  const dir = path.join(root, name);
  const dataDir = path.join(dir, 'data');
  const home = path.join(dir, 'home');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(home, { recursive: true });
  const baseUrl = `http://127.0.0.1:${port}`;
  if (!existsSync(path.join(dataDir, '.env'))) {
    await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\nHTTP_ACCESS_LOG_MODE=off\n`);
  }
  const log = createWriteStream(path.join(outputDir, `server-${name}.log`), { flags: 'a' });
  const child = spawn(process.execPath, [appEntry, '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
    cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN',
      HTTP_ACCESS_LOG_MODE: 'off', AUTOBYTEUS_SERVER_HOST: baseUrl } });
  child.stdout.pipe(log); child.stderr.pipe(log);
  child.once('close', () => log.end());
  children.add(child);
  await waitFor(`${name} health`, async () => {
    if (exited(child)) throw new Error(`${name} exited ${child.exitCode}`);
    return fetch(`${baseUrl}/rest/health`).then(response => response.ok).catch(() => false);
  }, 120_000);
  const nodeId = (await (await fetch(`${baseUrl}/rest/remote-access/status`)).json()).serverInstanceId;
  const gql = async (query, variables) => {
    const body = await (await fetch(`${baseUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }) })).json();
    if (body.errors?.length) throw new Error(`${name}: ${JSON.stringify(body.errors)}`);
    return body.data;
  };
  const server = { name, port, baseUrl, nodeId, dataDir, child, gql };
  evidence.servers[name] = { port, nodeId };
  return server;
};
const stopServer = async server => {
  const { child } = server;
  if (!exited(child)) {
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(10_000)]);
    if (!exited(child)) child.kill('SIGKILL');
  }
  children.delete(child);
};
const setSwitch = (server, enabled) => server.gql('mutation($e:Boolean!){setRemoteCollaborationEnabled(enabled:$e){enabled}}', { e: enabled });
const register = (on, peer, name) => on.gql('mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}',
  { i: { nodeId: peer.nodeId, baseUrl: peer.baseUrl, name } });
const peersOf = async server => (await server.gql('{ peerNodes { nodeId name baseUrl } }')).peerNodes;
const switchOf = async server => (await server.gql('{ remoteCollaborationCapability { enabled } }')).remoteCollaborationCapability.enabled;
/** The peers file itself, as the server wrote it (null when it was never written). */
const peersFile = async server => {
  const file = path.join(server.dataDir, 'remote-collaboration', 'peers.json');
  return existsSync(file) ? JSON.parse(await fs.readFile(file, 'utf8')) : null;
};
const shareAgent = (server, name) => server.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
  { i: { name, role: 'assistant', description: `${name} on ${server.name}`, instructions: 'Help.', toolNames: [] } });
const offerOf = async (on, peer) => (await on.gql('query($id:String!){peerNodeOffer(nodeId:$id){refusalCode entries{name kind}}}', { id: peer.nodeId })).peerNodeOffer;

let frontend, browser;
await fs.mkdir(outputDir, { recursive: true });
try {
  assert(existsSync(appEntry), 'Build the worktree server first: pnpm -C autobyteus-server-ts build');
  const names = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'theta', 'iota', 'kappa', 'lambda', 'mu'];
  const ports = Object.fromEntries(await Promise.all(names.map(async name => [name, await freePort()])));
  const deadPort = await freePort();
  const servers = Object.fromEntries((await Promise.all(names.map(name => startServer(name, ports[name])))).map(server => [server.name, server]));
  const { alpha, beta, gamma, delta, epsilon, zeta, theta, iota, kappa, lambda, mu } = servers;
  const fresh = { alphaSwitch: await switchOf(alpha), alphaPeersFile: await peersFile(alpha) };

  // What earlier use left behind, made through the servers' own settings API as their windows would have made it.
  for (const server of [beta, gamma, delta, epsilon, zeta, theta, lambda, mu]) await setSwitch(server, true);
  for (const name of ['Copy Editor', 'Researcher', 'Planner']) await shareAgent(beta, name);
  await shareAgent(alpha, 'Alpha Helper');
  await shareAgent(kappa, 'Kappa Helper');
  await setSwitch(alpha, true);
  for (const peer of [beta, gamma, delta, epsilon, zeta, theta]) await register(alpha, peer, peer.name);
  for (const peer of [beta, gamma, delta, zeta, theta]) await register(peer, alpha, 'Embedded Node');
  // lambda already knows another node as "Embedded Node" (another desktop registered there first).
  await register(lambda, iota, 'Embedded Node');
  await setSwitch(alpha, false);
  await stopServer(gamma);
  await setSwitch(delta, false);
  const zetaRegisteredId = zeta.nodeId;
  await stopServer(zeta);
  await fs.rename(path.join(root, 'zeta'), path.join(root, 'zeta-original'));
  const zeta2 = await startServer('zeta', ports.zeta);
  assert(zeta2.nodeId !== zetaRegisteredId, 'the second zeta must have another identity');
  servers.zeta = zeta2;
  const thetaId = theta.nodeId;
  await stopServer(theta);
  const hole = net.createServer(socket => { blackHoles.push(socket); socket.on('error', () => undefined); });
  await new Promise(resolve => hole.listen(ports.theta, '127.0.0.1', resolve));

  // The browser's desktop list as the current release writes it (keys learned from a real registry; values made up).
  const release = (id, name, baseUrl, nodeType, createdAt) => ({ id, name, baseUrl, nodeType,
    capabilities: { terminal: true, fileExplorerStreaming: true }, capabilityProbeState: 'ready', isSystem: nodeType === 'embedded', createdAt, updatedAt: createdAt });
  const seededRegistry = { version: 7, nodes: [
    release('embedded-local', 'Embedded Node', alpha.baseUrl, 'embedded', '2026-09-01T10:00:00.000Z'),
    release('remote-beta-entry', `http://localhost:${beta.port}`, `http://localhost:${beta.port}`, 'remote', '2026-09-02T10:00:00.000Z'),
    release('remote-gamma-entry', 'gamma box', `http://localhost:${gamma.port}`, 'remote', '2026-09-03T10:00:00.000Z'),
  ] };

  // The web app against alpha.
  const frontendPort = await freePort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const frontendLog = createWriteStream(path.join(outputDir, 'frontend.log'));
  frontend = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], { cwd: webDir, detached: true,
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: alpha.baseUrl } });
  frontend.stdout.pipe(frontendLog); frontend.stderr.pipe(frontendLog);
  await waitFor('frontend', async () => {
    if (exited(frontend)) throw new Error(`frontend exited ${frontend.exitCode}`);
    return fetch(`${frontendUrl}/nodes?nodeTab=manage`).then(response => response.ok).catch(() => false);
  }, 240_000);

  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
  await context.addInitScript(({ key, registry }) => {
    localStorage.setItem('autobyteus.localization.preference-mode', 'en');
    // Only the first page load gets the release-shaped list; later loads keep what the page saved.
    if (!localStorage.getItem('probe-seeded')) { localStorage.setItem(key, JSON.stringify(registry)); localStorage.setItem('probe-seeded', '1'); }
  }, { key: REGISTRY_KEY, registry: seededRegistry });
  const page = await context.newPage();
  // Warm the dev server (first compile) on the page itself, then reload it fresh.
  await page.goto(`${frontendUrl}/nodes?nodeTab=memorySync`, { waitUntil: 'networkidle', timeout: 240_000 });
  await page.locator('[data-testid="node-manager-panel-memorySync"]').waitFor({ state: 'visible', timeout: 120_000 });
  await page.evaluate(({ key, registry }) => localStorage.setItem(key, JSON.stringify(registry)), { key: REGISTRY_KEY, registry: seededRegistry });
  page.on('pageerror', error => evidence.browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') evidence.browserErrors.push(`console: ${message.text()}`); });
  // Every request the window sends to a node, named by its node; the dev server forwards /graphql and /rest to alpha.
  const nodeHosts = {};
  for (const server of [...Object.values(servers), { name: 'theta', port: ports.theta }, { name: 'ghost', port: deadPort }]) {
    nodeHosts[`127.0.0.1:${server.port}`] = server.name;
    nodeHosts[`localhost:${server.port}`] = server.name;
  }
  page.on('request', request => {
    const url = new URL(request.url());
    const to = url.host === `127.0.0.1:${frontendPort}` ? (/^\/(graphql|rest)\b/.test(url.pathname) ? 'alpha' : null) : nodeHosts[url.host] ?? `other:${url.host}`;
    if (!to) return;
    let payload = null;
    try { payload = request.postDataJSON(); } catch { /* not JSON */ }
    evidence.requests.push({ at: Date.now(), to, via: url.host, path: url.pathname,
      op: payload?.operationName ?? (url.pathname.endsWith('/graphql') ? 'graphql?' : null), nodeId: payload?.variables?.nodeId ?? null });
  });
  const requestsSince = (since, filter = () => true) => evidence.requests.filter(entry => entry.at >= since && filter(entry));
  // A request that asks about a node: to another node, or to alpha about its peers (not the app's own health and
  // history checks, which run on every page).
  const NODE_OPS = new Set(['GetPeerNodeOffer', 'GetPeerNodeAvailability', 'GetRemoteCollaborationSettings', 'GetRemoteCollaborationCapability',
    'GetPeerAddressCandidates', 'ResolvePeerAddress']);
  const asksAboutNodes = entry => (entry.to !== 'alpha' && !entry.to.startsWith('other:')) || NODE_OPS.has(entry.op) || entry.path === '/rest/remote-access/status';
  const offerAsks = (since, nodeId) => requestsSince(since, entry => entry.op === 'GetPeerNodeOffer' && (!nodeId || entry.nodeId === nodeId));
  const clean = value => value.trim().replace(/\s+/g, ' ');
  const text = async locator => (await locator.count()) ? clean(await locator.first().innerText()) : null;
  const row = key => page.locator(`[data-testid="node-row-${key}"]`);
  /** A row's line without its button: "⚠ Remote collaboration is off on delta." */
  const line = async key => {
    const element = page.locator(`[data-testid="node-line-${key}"]`);
    if (!(await element.count())) return null;
    const paragraph = element.locator('p');
    // The mark (ⓘ ⚠ ✗) is spaced by CSS, not by text: "ⓘ Not reachable. …".
    const value = (await paragraph.count()) ? await text(paragraph) : await text(element);
    return value?.replace(/^([ⓘ⚠✗])\s*/u, '$1 ') ?? null;
  };
  const fixButton = key => page.locator(`[data-testid="node-fix-${key}"]`);
  const rowKeys = async () => page.locator('[data-testid^="node-row-"]').evaluateAll(items => items.map(item => item.getAttribute('data-testid').slice('node-row-'.length)));
  const dialog = () => page.locator('[role="dialog"][data-testid^="node-change-dialog-"]');
  const dialogText = () => text(dialog());
  /** The dialog's lines: the mark (•, ✓, ✗, ○) apart from the line's text. */
  const dialogSteps = async () => (await page.locator('[data-testid^="node-change-step-"]').evaluateAll(items => items.map(item => ({
    id: item.getAttribute('data-testid').slice('node-change-step-'.length), raw: item.innerText })))).map(({ id, raw }) => {
    const value = clean(raw);
    const mark = /^[•✓✗○]/.test(value) ? value[0] : '';
    return { id, mark, text: clean(mark ? value.slice(1) : value) };
  });
  const registry = async () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), REGISTRY_KEY);
  const shot = name => page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true });
  const settled = async key => (await row(key).count()) === 1 && !/^Checking /.test((await line(key)) ?? '');
  const waitSettled = (key, timeoutMs = 15_000) => waitFor(`${key} settled`, () => settled(key), timeoutMs);
  const waitDialogGone = () => waitFor('the dialog closes', async () => (await dialog().count()) === 0, 30_000);
  const waitAddressesFound = () => waitFor('the addresses found', async () => !(await dialogText())?.includes('Finding the address'), 25_000);
  const directions = async key => ({ out: await text(page.locator(`[data-testid="node-direction-out-${key}"]`)), in: await text(page.locator(`[data-testid="node-direction-in-${key}"]`)) });
  const openDetails = async key => {
    if (await page.locator(`[data-testid="node-directions-${key}"]`).count()) return;
    await page.locator(`[data-testid="node-offer-${key}-toggle"]`).click();
    await page.locator(`[data-testid="node-directions-${key}"]`).waitFor({ state: 'visible' });
  };
  const addNode = async (address, name, collaborate) => {
    await page.locator('[data-testid="add-node-address"]').fill(address);
    await page.locator('[data-testid="add-node-name"]').fill(name);
    const toggle = page.locator('[data-testid="add-node-collaborate"]');
    if ((await toggle.getAttribute('aria-checked')) !== String(collaborate)) await toggle.click();
    await page.locator('[data-testid="add-node-submit"]').click();
  };
  const gammaEntryKey = 'd:remote-gamma-entry';
  const peerKeys = { beta: beta.nodeId, gamma: gamma.nodeId, delta: delta.nodeId, epsilon: epsilon.nodeId, zeta: zetaRegisteredId, theta: thetaId };

  await runCase('NP-01', async () => {
    await page.goto(`${frontendUrl}/nodes?nodeTab=remoteCollaboration`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.locator('[data-testid="node-manager-panel-manage"]').waitFor({ state: 'visible', timeout: 60_000 });
    const tabs = await page.locator('[data-testid^="node-manager-tab-"]').evaluateAll(items => items.map(item => item.getAttribute('data-testid').slice('node-manager-tab-'.length)));
    await waitFor('the switch read', async () => (await text(page.locator('[data-testid="this-node-switch-status"]'))) === 'Off', 15_000);
    const before = { switchChecked: await page.locator('[data-testid="this-node-switch"]').getAttribute('aria-checked'),
      status: await text(page.locator('[data-testid="this-node-switch-status"]')), offNote: await text(page.locator('[data-testid="this-node-off-note"]')),
      thisNode: await text(page.locator('[data-testid="this-node-name"]')), url: await text(page.locator('[data-testid="this-node-url"]')) };
    assert(JSON.stringify(tabs) === JSON.stringify(['manage', 'memorySync', 'phoneSetup', 'dockerGuide', 'nfsGuide']), `tabs: ${tabs}`);
    assert(fresh.alphaSwitch === false && before.switchChecked === 'false' && before.status === 'Off', `off by default: ${JSON.stringify({ fresh, before })}`);
    expect(before.offNote === 'Off by default. While it is off, this node asks no other node and refuses their requests.', `off note: ${before.offNote}`);
    await shot('NP-01-fresh-this-node-off');
    await page.locator('[data-testid="this-node-switch"]').click();
    await waitFor('alpha switched on from the page', async () => (await switchOf(alpha)) === true
      && (await page.locator('[data-testid="this-node-switch"]').getAttribute('aria-checked')) === 'true');
    return { url: page.url(), tabs, fresh, before, after: { alphaSwitch: await switchOf(alpha), status: await text(page.locator('[data-testid="this-node-switch-status"]')) } };
  });

  // NP-02 and NP-03: the list opened again with alpha's switch on (leaving the tab and coming back asks every node).
  let openedAt;
  const settledAt = {};
  await runCase('NP-02', async () => {
    await page.locator('[data-testid="node-manager-tab-memorySync"]').click();
    await page.locator('[data-testid="node-manager-panel-memorySync"]').waitFor({ state: 'visible' });
    openedAt = Date.now();
    await page.locator('[data-testid="node-manager-tab-manage"]').click();
    const watched = { ...peerKeys, gammaEntry: gammaEntryKey };
    void (async () => {
      while (Object.keys(settledAt).length < Object.keys(watched).length && Date.now() - openedAt < BOUND_MS + 20_000) {
        for (const [name, key] of Object.entries(watched)) {
          if (settledAt[name] || !(await row(key).count().catch(() => 0))) continue;
          if (await settled(key).catch(() => false)) settledAt[name] = { ms: Date.now() - openedAt, line: await line(key).catch(() => null) };
        }
        await sleep(100);
      }
    })();
    await waitFor('beta joined into one row', async () => (await row(beta.nodeId).count()) === 1 && (await row('d:remote-beta-entry').count()) === 0, 15_000);
    await waitSettled(beta.nodeId);
    const keys = await rowKeys();
    const stored = await registry();
    const betaEntry = stored.nodes.find(node => node.id === 'remote-beta-entry');
    const gammaEntry = stored.nodes.find(node => node.id === 'remote-gamma-entry');
    const betaRow = { name: await text(page.locator(`[data-testid="node-name-${beta.nodeId}"]`)), url: await text(page.locator(`[data-testid="node-url-${beta.nodeId}"]`)),
      switch: await page.locator(`[data-testid="node-agents-switch-${beta.nodeId}"]`).getAttribute('aria-checked') };
    assert(keys.filter(key => key === beta.nodeId).length === 1 && !keys.includes('d:remote-beta-entry'), `beta once: ${keys}`);
    expect(betaRow.name === 'beta' && betaRow.url === `localhost:${beta.port}` && betaRow.switch === 'true', `beta's row: ${JSON.stringify(betaRow)}`);
    expect(betaEntry?.serverInstanceId === beta.nodeId && betaEntry.name === `http://localhost:${beta.port}`, `beta's entry learned its node ID, name unchanged: ${JSON.stringify(betaEntry)}`);
    expect(keys.includes(gammaEntryKey) && keys.includes(gamma.nodeId) && !gammaEntry?.serverInstanceId, `gamma's never-reached entry is its own row: ${keys}`);
    expect(!keys.includes(alpha.nodeId) && !keys.includes('d:embedded-local'), `this node is not a row: ${keys}`);
    return { keys, names: await page.locator('[data-testid^="node-name-"]').allInnerTexts(), betaRow, betaEntry, gammaEntry };
  });

  await runCase('NP-03', async () => {
    const fast = ['beta', 'gamma', 'gammaEntry', 'delta', 'epsilon', 'zeta'];
    await waitFor('the fast rows settled', async () => fast.every(name => settledAt[name]), 15_000);
    const thetaWhileOthersSettled = { line: await line(thetaId), dot: await page.locator(`[data-testid="node-dot-${thetaId}"]`).getAttribute('aria-label') };
    assert(thetaWhileOthersSettled.line === 'Checking theta… up to 20 seconds.' && thetaWhileOthersSettled.dot === 'Checking', `theta waits: ${JSON.stringify(thetaWhileOthersSettled)}`);
    // The page stays usable while theta is checked: beta's offer opens.
    await page.locator(`[data-testid="node-offer-${beta.nodeId}-toggle"]`).click();
    const betaSummary = await text(page.locator(`[data-testid="node-offer-${beta.nodeId}-summary"]`));
    const betaEntries = await page.locator(`[data-testid="node-offer-${beta.nodeId}-list-entry"]`).count();
    const usableWhileTheta = await line(thetaId);
    await shot('NP-03-theta-checking-others-settled');
    await waitFor('theta settled', async () => settledAt.theta, BOUND_MS + 15_000);
    const lines = Object.fromEntries(await Promise.all(Object.entries({ ...peerKeys, gammaEntry: gammaEntryKey }).map(async ([name, key]) => [name, { line: await line(key),
      fix: await text(fixButton(key)), dot: await page.locator(`[data-testid="node-dot-${key}"]`).getAttribute('aria-label') }])));
    await openDetails(beta.nodeId);
    const betaDirections = await directions(beta.nodeId);
    await shot('NP-03-all-settled');
    const expected = {
      beta: { line: null, fix: null },
      gamma: { line: 'ⓘ Not reachable. Nothing answers at that address and port.', fix: 'Check again' },
      gammaEntry: { line: 'ⓘ Not reachable. Nothing answers at that address and port.', fix: 'Check again' },
      delta: { line: '⚠ Remote collaboration is off on delta.', fix: 'Turn on there' },
      epsilon: { line: "⚠ epsilon doesn't know this node yet.", fix: 'Register this node there' },
      zeta: { line: '✗ A different node answers at this address.', fix: 'Change address' },
      theta: { line: 'ⓘ Not reachable. No answer within 20 seconds.', fix: 'Check again' },
    };
    for (const [name, want] of Object.entries(expected)) expect(lines[name].line === want.line && lines[name].fix === want.fix, `${name}: ${JSON.stringify(lines[name])}`);
    expect(betaSummary?.startsWith('3 Agents') && betaEntries === 3, `beta's offer: ${betaSummary} ${betaEntries}`);
    expect(betaDirections.out?.startsWith(`This node → beta ✓ Working via ${beta.baseUrl}`) && betaDirections.in?.startsWith(`beta → this node ✓ Working via ${alpha.baseUrl}`),
      `beta's directions: ${JSON.stringify(betaDirections)}`);
    expect(settledAt.theta.ms >= BOUND_MS - 1_000 && settledAt.theta.ms <= BOUND_MS + 8_000, `theta at the bound: ${settledAt.theta.ms}`);
    for (const name of fast) expect(settledAt[name].ms < 8_000, `${name} at its own pace: ${settledAt[name].ms}`);
    const openAsks = Object.fromEntries(Object.entries(peerKeys).map(([name, id]) => [name, offerAsks(openedAt, id).length]));
    expect(Object.values(openAsks).every(count => count === 1), `one offer ask per peer on open: ${JSON.stringify(openAsks)}`);
    return { settledAt, thetaWhileOthersSettled, usableWhileTheta, betaSummary, betaEntries, lines, betaDirections, openAsks };
  });

  await runCase('NP-11', async () => {
    // Check again asks one node.
    const refreshAt = Date.now();
    await page.locator(`[data-testid="node-refresh-${beta.nodeId}"]`).click();
    await waitFor('beta asked again', async () => offerAsks(refreshAt, beta.nodeId).length === 1 && await settled(beta.nodeId));
    await sleep(1_500);
    const refreshAsks = offerAsks(refreshAt).map(entry => entry.nodeId);
    expect(refreshAsks.length === 1 && refreshAsks[0] === beta.nodeId, `Check again asks one node: ${JSON.stringify(refreshAsks)}`);
    // This node's switch off: no offer and no availability asked; no warnings.
    const offAt = Date.now();
    await page.locator('[data-testid="this-node-switch"]').click();
    await waitFor('alpha off', async () => (await switchOf(alpha)) === false && (await page.locator('[data-testid="this-node-off-note"]').count()) === 1);
    await sleep(6_000);
    const offRequests = requestsSince(offAt, entry => ['GetPeerNodeOffer', 'GetPeerNodeAvailability'].includes(entry.op));
    const offLines = Object.fromEntries(await Promise.all(['beta', 'delta', 'epsilon', 'zeta'].map(async name => [name, await line(peerKeys[name])])));
    await openDetails(beta.nodeId);
    const offDirections = await directions(beta.nodeId);
    await shot('NP-11-this-node-off');
    expect(offRequests.length === 0, `switch off asks no peer: ${JSON.stringify(offRequests)}`);
    expect(Object.values(offLines).every(value => value === null), `no warnings while off: ${JSON.stringify(offLines)}`);
    expect(offDirections.out?.includes('Off on this node'), `off directions: ${JSON.stringify(offDirections)}`);
    // On again: every peer asked once.
    const onAt = Date.now();
    await page.locator('[data-testid="this-node-switch"]').click();
    await waitFor('theta checked again', async () => (await line(thetaId)) === 'Checking theta… up to 20 seconds.', 10_000);
    await waitFor('the fast peers asked again', async () => (await switchOf(alpha)) && await settled(beta.nodeId) && await settled(delta.nodeId), 20_000);
    await waitFor('theta settled again', async () => (await line(thetaId)) === 'ⓘ Not reachable. No answer within 20 seconds.', BOUND_MS + 15_000);
    await sleep(1_500);
    const onAsks = Object.fromEntries(Object.entries(peerKeys).map(([name, id]) => [name, offerAsks(onAt, id).length]));
    expect(Object.values(onAsks).every(count => count === 1), `switch on asks every peer once: ${JSON.stringify(onAsks)}`);
    // No polling: a quiet period in which nothing asks about any node.
    const quietAt = Date.now();
    await sleep(30_000);
    const quiet = requestsSince(quietAt, asksAboutNodes);
    expect(quiet.length === 0, `no request during the quiet period: ${JSON.stringify(quiet.slice(0, 5))}`);
    return { refreshAsks, offRequests: offRequests.length, offLines, offDirections, onAsks, quietMs: Date.now() - quietAt, quietRequests: quiet.length,
      appRequestsDuringQuiet: requestsSince(quietAt).length };
  });

  await runCase('NP-04', async () => {
    const before = { alpha: await peersFile(alpha), iota: await peersFile(iota), kappa: await peersFile(kappa) };
    // With the form's switch off: only listed, no confirmation, no notice.
    await addNode(iota.baseUrl, 'iota', false);
    await waitFor('iota listed', async () => (await row(iota.nodeId).count()) === 1);
    await waitSettled(iota.nodeId);
    await sleep(1_000);
    const iotaState = { dialog: await dialog().count(), duplicate: await page.locator('[data-testid="add-node-duplicate"]').count(), line: await line(iota.nodeId),
      fix: await text(fixButton(iota.nodeId)), switch: await page.locator(`[data-testid="node-agents-switch-${iota.nodeId}"]`).getAttribute('aria-checked') };
    expect(iotaState.dialog === 0 && iotaState.duplicate === 0 && iotaState.switch === 'false', `iota only listed: ${JSON.stringify(iotaState)}`);
    expect(iotaState.line === "ⓘ Agents here can't work with iota yet." && iotaState.fix === 'Turn on', `iota's line: ${JSON.stringify(iotaState)}`);
    // With it on (the default): the one confirmation; kappa's switch is off, so it says so. Cancel changes nothing.
    await addNode(kappa.baseUrl, 'kappa', true);
    await dialog().waitFor({ state: 'visible', timeout: 15_000 });
    await waitAddressesFound();
    const confirmText = await dialogText();
    const steps = await dialogSteps();
    await shot('NP-04-add-kappa-confirmation');
    expect(confirmText.startsWith('Let agents work with kappa?'), `title: ${confirmText}`);
    expect(JSON.stringify(steps.map(entry => entry.id)) === JSON.stringify(['registerHere', 'turnOnThere', 'registerThere']), `steps: ${JSON.stringify(steps)}`);
    expect(steps[0]?.text === 'Register kappa as “kappa”' && steps[1]?.text === 'Turn on remote collaboration (it is off)'
      && steps[2]?.text === "Register this node as “Embedded Node” kappa finds this node's address once it is on.", `step texts: ${JSON.stringify(steps)}`);
    expect(confirmText.includes('Trusted private network only: nodes are not authenticated.'), 'trusted note');
    await page.locator('[data-testid="node-change-cancel"]').click();
    await waitDialogGone();
    await waitSettled(kappa.nodeId);
    const afterCancel = { alpha: await peersFile(alpha), iota: await peersFile(iota), kappa: await peersFile(kappa), kappaSwitch: await switchOf(kappa),
      kappaLine: await line(kappa.nodeId) };
    assert(JSON.stringify(afterCancel.alpha) === JSON.stringify(before.alpha) && afterCancel.iota === null && afterCancel.kappa === null && afterCancel.kappaSwitch === false,
      `nothing changed on any node: ${JSON.stringify({ before, afterCancel })}`);
    // Already listed: by node ID (another spelling of beta's address), and by address while that node is down (gamma's entry).
    await addNode(`http://127.0.0.1:${beta.port}`, 'beta again', true);
    await page.locator('[data-testid="add-node-duplicate"]').waitFor({ state: 'visible', timeout: 10_000 });
    const byNodeId = await text(page.locator('[data-testid="add-node-duplicate"]'));
    await addNode(`localhost:${gamma.port}`, 'gamma again', true);
    await waitFor('duplicate by address', async () => (await text(page.locator('[data-testid="add-node-duplicate"]'))) !== byNodeId, 10_000).catch(() => undefined);
    const byAddress = await text(page.locator('[data-testid="add-node-duplicate"]'));
    expect(byNodeId === 'ⓘ This is beta, already in your list.', `duplicate by node ID: ${byNodeId}`);
    expect(byAddress === 'ⓘ This is gamma box, already in your list.', `duplicate by address: ${byAddress}`);
    // Not reachable: added with its cause, no confirmation.
    await addNode(`http://127.0.0.1:${deadPort}`, 'ghost', true);
    await waitFor('ghost listed', async () => (await registry()).nodes.some(node => node.name === 'ghost'), 10_000);
    const ghost = (await registry()).nodes.find(node => node.name === 'ghost');
    await waitSettled(`d:${ghost.id}`);
    await sleep(1_000);
    const ghostState = { line: await line(`d:${ghost.id}`), fix: await text(fixButton(`d:${ghost.id}`)), dialog: await dialog().count(),
      switchDisabled: await page.locator(`[data-testid="node-agents-switch-d:${ghost.id}"]`).isDisabled() };
    expect(ghostState.line === 'ⓘ Not reachable. Nothing answers at that address and port.' && ghostState.fix === 'Check again' && ghostState.dialog === 0 && ghostState.switchDisabled,
      `ghost: ${JSON.stringify(ghostState)}`);
    const stored = await registry();
    const added = stored.nodes.filter(node => ['iota', 'kappa', 'ghost'].includes(node.name)).map(({ name, baseUrl, serverInstanceId }) => ({ name, baseUrl, serverInstanceId: serverInstanceId ?? null }));
    expect(added.length === 3 && added.find(node => node.name === 'iota')?.serverInstanceId === iota.nodeId && added.find(node => node.name === 'kappa')?.serverInstanceId === kappa.nodeId
      && added.find(node => node.name === 'ghost')?.serverInstanceId === null, `desktop list: ${JSON.stringify(added)}`);
    expect(!stored.nodes.some(node => ['beta again', 'gamma again'].includes(node.name)), 'duplicates not added');
    expect(JSON.stringify(await peersFile(alpha)) === JSON.stringify(before.alpha) && (await peersFile(iota)) === null, 'no peers.json changed by any add');
    await page.locator(`[data-testid="node-remove-d:${ghost.id}"]`).click();
    await dialog().waitFor({ state: 'visible' });
    const ghostRemove = await dialogSteps();
    await page.locator('[data-testid="node-change-confirm"]').click();
    await waitDialogGone();
    expect(ghostRemove.length === 1 && ghostRemove[0].text === 'Remove ghost from your list', `ghost's removal: ${JSON.stringify(ghostRemove)}`);
    return { before, iotaState, confirmText, steps, afterCancel, byNodeId, byAddress, ghostState, added, ghostRemove };
  });

  await runCase('NP-05', async () => {
    await page.locator(`[data-testid="node-agents-switch-${kappa.nodeId}"]`).click();
    await dialog().waitFor({ state: 'visible', timeout: 15_000 });
    const steps = await dialogSteps();
    await page.locator('[data-testid="node-change-confirm"]').click();
    await waitDialogGone();
    await waitFor('kappa working', async () => await settled(kappa.nodeId) && (await line(kappa.nodeId)) === null, 25_000);
    await openDetails(kappa.nodeId);
    await waitFor('kappa directions', async () => (await directions(kappa.nodeId)).in?.includes('Working'), 25_000);
    const kappaDirections = await directions(kappa.nodeId);
    await shot('NP-05-kappa-working');
    const onAlpha = (await peersOf(alpha)).find(peer => peer.nodeId === kappa.nodeId);
    const onKappa = await peersOf(kappa);
    const offers = { alphaAsksKappa: await offerOf(alpha, kappa), kappaAsksAlpha: await offerOf(kappa, alpha) };
    expect(JSON.stringify(steps.map(entry => entry.id)) === JSON.stringify(['registerHere', 'turnOnThere', 'registerThere']), `steps: ${JSON.stringify(steps)}`);
    assert(onAlpha?.name === 'kappa' && onAlpha.baseUrl === kappa.baseUrl, `kappa on alpha: ${JSON.stringify(onAlpha)}`);
    assert(onKappa.length === 1 && onKappa[0].nodeId === alpha.nodeId && onKappa[0].name === 'Embedded Node' && onKappa[0].baseUrl === alpha.baseUrl, `alpha on kappa: ${JSON.stringify(onKappa)}`);
    assert(await switchOf(kappa) === true, "kappa's switch turned on");
    expect(kappaDirections.out?.startsWith(`This node → kappa ✓ Working via ${kappa.baseUrl}`) && kappaDirections.in?.startsWith(`kappa → this node ✓ Working via ${alpha.baseUrl}`),
      `directions: ${JSON.stringify(kappaDirections)}`);
    expect(offers.alphaAsksKappa.refusalCode === null && offers.alphaAsksKappa.entries.some(entry => entry.name === 'Kappa Helper')
      && offers.kappaAsksAlpha.refusalCode === null && offers.kappaAsksAlpha.entries.some(entry => entry.name === 'Alpha Helper'), `each lists the other's Agents: ${JSON.stringify(offers)}`);
    return { steps, onAlpha, onKappa, kappaFile: await peersFile(kappa), kappaDirections, offers };
  });

  await runCase('NP-06', async () => {
    await addNode(lambda.baseUrl, 'lambda', true);
    await dialog().waitFor({ state: 'visible', timeout: 15_000 });
    await waitAddressesFound();
    const steps = await dialogSteps();
    const nameTaken = await text(page.locator('[data-testid="node-change-name-taken-registerThere"]'));
    const addressLine = await text(page.locator('[data-testid="node-change-address-registerThere"]'));
    await shot('NP-06-lambda-name-collision');
    expect(steps.find(entry => entry.id === 'registerThere')?.text.startsWith('Register this node as “Embedded Node 2”'), `steps: ${JSON.stringify(steps)}`);
    expect(nameTaken === '“Embedded Node” is already used there, so it gets a number.', `name note: ${nameTaken}`);
    expect(addressLine === `lambda reaches this node at ${alpha.baseUrl}.`, `address line: ${addressLine}`);
    await page.locator('[data-testid="node-change-confirm"]').click();
    await waitDialogGone();
    const onLambda = (await peersOf(lambda)).find(peer => peer.nodeId === alpha.nodeId);
    assert(onLambda?.name === 'Embedded Node 2', `alpha on lambda: ${JSON.stringify(onLambda)}`);
    return { steps, nameTaken, addressLine, onLambda, lambdaPeers: await peersOf(lambda) };
  });

  await runCase('NP-07', async () => {
    await addNode(mu.baseUrl, 'mu', true);
    await dialog().waitFor({ state: 'visible', timeout: 15_000 });
    await waitAddressesFound();
    const planned = await dialogSteps();
    // mu's own owner registers another node as "Embedded Node" before Turn on is pressed here.
    await register(mu, iota, 'Embedded Node');
    await page.locator('[data-testid="node-change-confirm"]').click();
    await page.locator('[data-testid="node-change-partial"]').waitFor({ state: 'visible', timeout: 25_000 });
    const failed = { steps: await dialogSteps(), error: await text(page.locator('[data-testid="node-change-error-registerThere"]')), partial: await text(page.locator('[data-testid="node-change-partial"]')) };
    await shot('NP-07-mu-name-race-dialog');
    await page.locator('[data-testid="node-change-close"]').click();
    await waitDialogGone();
    await waitSettled(mu.nodeId, 25_000);
    const rowLine = { line: await line(mu.nodeId), fix: await text(fixButton(mu.nodeId)) };
    await openDetails(mu.nodeId);
    const stepsDetail = await text(page.locator(`[data-testid="node-steps-${mu.nodeId}"]`));
    await shot('NP-07-mu-row-try-again');
    await fixButton(mu.nodeId).click();
    await dialog().waitFor({ state: 'visible', timeout: 15_000 });
    await waitAddressesFound();
    const replanned = { title: (await dialogText()).split('?')[0], steps: await dialogSteps() };
    await page.locator('[data-testid="node-change-confirm"]').click();
    await waitDialogGone();
    await waitFor('mu working', async () => await settled(mu.nodeId) && (await line(mu.nodeId)) === null, 25_000);
    const onMu = (await peersOf(mu)).find(peer => peer.nodeId === alpha.nodeId);
    expect(planned.find(entry => entry.id === 'registerThere')?.text.startsWith('Register this node as “Embedded Node”'), `planned: ${JSON.stringify(planned)}`);
    expect(failed.error === 'mu already has a node named Embedded Node.' && failed.partial === 'Not everything could be done. What was done stays done.', `failed: ${JSON.stringify(failed)}`);
    expect(rowLine.line === '⚠ Turned on here, but not finished on mu. mu already has a node named Embedded Node.' && rowLine.fix === 'Try again', `row line: ${JSON.stringify(rowLine)}`);
    expect(replanned.title === 'Finish connecting mu' && replanned.steps.length === 1 && replanned.steps[0].text.startsWith('Register this node as “Embedded Node 2”'), `replanned: ${JSON.stringify(replanned)}`);
    assert(onMu?.name === 'Embedded Node 2', `alpha on mu: ${JSON.stringify(onMu)}`);
    return { planned, failed, rowLine, stepsDetail, replanned, onMu };
  });

  await runCase('NP-08', async () => {
    const rename = async (key, value) => {
      await page.locator(`[data-testid="node-name-${key}"]`).click();
      const input = page.locator(`[data-testid="node-rename-input-${key}"]`);
      await input.fill(value);
      await input.press('Enter');
    };
    const errorOf = key => page.locator(`[data-testid="node-rename-error-${key}"]`);
    await rename(kappa.nodeId, '-bad name');
    await errorOf(kappa.nodeId).waitFor({ state: 'visible', timeout: 10_000 });
    const invalid = await text(errorOf(kappa.nodeId));
    await page.locator(`[data-testid="node-rename-input-${kappa.nodeId}"]`).press('Escape');
    await rename(kappa.nodeId, 'Beta');
    await errorOf(kappa.nodeId).waitFor({ state: 'visible', timeout: 10_000 });
    const taken = await text(errorOf(kappa.nodeId));
    await page.locator(`[data-testid="node-rename-input-${kappa.nodeId}"]`).press('Escape');
    await rename(kappa.nodeId, 'kappa lab');
    await waitFor('renamed', async () => (await text(page.locator(`[data-testid="node-name-${kappa.nodeId}"]`))) === 'kappa lab');
    const onAlpha = (await peersOf(alpha)).find(peer => peer.nodeId === kappa.nodeId);
    const entry = (await registry()).nodes.find(node => node.serverInstanceId === kappa.nodeId);
    expect(invalid === 'Use 1–64 letters, digits, spaces, _ . or - (start with a letter or digit).', `invalid: ${invalid}`);
    expect(taken === 'Another node is already named Beta.', `taken: ${taken}`);
    assert(onAlpha?.name === 'kappa lab' && entry?.name === 'kappa lab', `one name: ${JSON.stringify({ onAlpha, entry })}`);
    return { invalid, taken, onAlpha, entry: { name: entry.name, serverInstanceId: entry.serverInstanceId }, kappaKnowsAlphaAs: (await peersOf(kappa))[0]?.name };
  });

  await runCase('NP-09', async () => {
    await page.locator(`[data-testid="node-agents-switch-${kappa.nodeId}"]`).click();
    await dialog().waitFor({ state: 'visible', timeout: 15_000 });
    const confirmText = await dialogText();
    const steps = await dialogSteps();
    await page.locator('[data-testid="node-change-confirm"]').click();
    await waitDialogGone();
    await waitSettled(kappa.nodeId, 25_000);
    const reachableOff = { alphaHasKappa: (await peersOf(alpha)).some(peer => peer.nodeId === kappa.nodeId), kappaPeers: await peersOf(kappa), kappaSwitch: await switchOf(kappa),
      listed: await row(kappa.nodeId).count(), line: await line(kappa.nodeId) };
    expect(steps.map(entry => entry.text).join(' | ') === 'Remove kappa lab from this node | Remove this node from kappa lab', `steps: ${JSON.stringify(steps)}`);
    expect(confirmText.includes('kappa lab stays in your list, and its own remote collaboration stays on.'), confirmText);
    assert(!reachableOff.alphaHasKappa && reachableOff.kappaPeers.length === 0 && reachableOff.kappaSwitch === true && reachableOff.listed === 1, `turned off: ${JSON.stringify(reachableOff)}`);
    // lambda is stopped: the failed line and its cause stay, and lambda keeps this node.
    await stopServer(lambda);
    await page.locator(`[data-testid="node-agents-switch-${lambda.nodeId}"]`).click();
    await dialog().waitFor({ state: 'visible', timeout: 15_000 });
    const lambdaSteps = await dialogSteps();
    await page.locator('[data-testid="node-change-confirm"]').click();
    await page.locator('[data-testid="node-change-partial"]').waitFor({ state: 'visible', timeout: 25_000 });
    const lambdaResult = { steps: await dialogSteps(), error: await text(page.locator('[data-testid="node-change-error-removeThere"]')), partial: await text(page.locator('[data-testid="node-change-partial"]')) };
    await shot('NP-09-lambda-stopped-turn-off');
    await page.locator('[data-testid="node-change-close"]').click();
    await waitDialogGone();
    await waitSettled(lambda.nodeId, 25_000);
    const lambdaAfter = { alphaHasLambda: (await peersOf(alpha)).some(peer => peer.nodeId === lambda.nodeId), lambdaFile: await peersFile(lambda), line: await line(lambda.nodeId) };
    expect(lambdaSteps.map(entry => entry.id).join(',') === 'removeHere,removeThere', `lambda steps: ${JSON.stringify(lambdaSteps)}`);
    expect(lambdaResult.steps[0]?.mark === '✓' && lambdaResult.steps[1]?.mark === '✗' && lambdaResult.error === 'Nothing answers at that address and port.'
      && lambdaResult.partial === 'Not everything could be done. What was done stays done.', `lambda result: ${JSON.stringify(lambdaResult)}`);
    assert(!lambdaAfter.alphaHasLambda && lambdaAfter.lambdaFile?.peers?.some(peer => peer.nodeId === alpha.nodeId), `this node still registered on lambda: ${JSON.stringify(lambdaAfter)}`);
    return { confirmText, steps, reachableOff, lambdaSteps, lambdaResult, lambdaAfter };
  });

  await runCase('NP-10', async () => {
    await page.locator(`[data-testid="node-remove-${mu.nodeId}"]`).click();
    await dialog().waitFor({ state: 'visible', timeout: 15_000 });
    const muSteps = await dialogSteps();
    const muText = await dialogText();
    await page.locator('[data-testid="node-change-confirm"]').click();
    await waitDialogGone();
    const muAfter = { alphaHasMu: (await peersOf(alpha)).some(peer => peer.nodeId === mu.nodeId), muHasAlpha: (await peersOf(mu)).some(peer => peer.nodeId === alpha.nodeId),
      listed: await row(mu.nodeId).count(), entry: (await registry()).nodes.some(node => node.serverInstanceId === mu.nodeId) };
    expect(muSteps.map(entry => entry.text).join(' | ') === 'Remove mu from this node | Remove this node from mu | Remove mu from your list', `mu steps: ${JSON.stringify(muSteps)}`);
    expect(muText.includes('The node and its data are not touched.'), muText);
    assert(!muAfter.alphaHasMu && !muAfter.muHasAlpha && muAfter.listed === 0 && !muAfter.entry, `mu gone: ${JSON.stringify(muAfter)}`);
    // beta is stopped: the list entry and this node's peer go; beta keeps this node, and the dialog says so.
    await stopServer(beta);
    await page.locator(`[data-testid="node-remove-${beta.nodeId}"]`).click();
    await dialog().waitFor({ state: 'visible', timeout: 25_000 });
    const betaSteps = await dialogSteps();
    await page.locator('[data-testid="node-change-confirm"]').click();
    await page.locator('[data-testid="node-change-partial"]').waitFor({ state: 'visible', timeout: 25_000 });
    const betaResult = { steps: await dialogSteps(), partial: await text(page.locator('[data-testid="node-change-partial"]')), retry: await page.locator('[data-testid="node-change-retry"]').count() };
    await shot('NP-10-beta-stopped-removed');
    await page.locator('[data-testid="node-change-close"]').click();
    await waitDialogGone();
    const betaAfter = { alphaHasBeta: (await peersOf(alpha)).some(peer => peer.nodeId === beta.nodeId), betaFile: await peersFile(beta), listed: await row(beta.nodeId).count(),
      entry: (await registry()).nodes.some(node => node.id === 'remote-beta-entry') };
    expect(betaSteps.map(entry => entry.id).join(',') === 'removeHere,removeThere,removeFromList', `beta steps: ${JSON.stringify(betaSteps)}`);
    expect(betaResult.steps.map(entry => entry.mark).join('') === '✓✗✓' && betaResult.partial === 'Removed here. beta could not be reached, so this node is still registered there.'
      && betaResult.retry === 0, `beta result: ${JSON.stringify(betaResult)}`);
    assert(!betaAfter.alphaHasBeta && betaAfter.listed === 0 && !betaAfter.entry && betaAfter.betaFile?.peers?.some(peer => peer.nodeId === alpha.nodeId), `beta after: ${JSON.stringify(betaAfter)}`);
    return { muSteps, muAfter, betaSteps, betaResult, betaAfter };
  });

  await runCase('NP-12', async () => {
    const offerHosts = [...new Set(evidence.requests.filter(entry => entry.op === 'GetPeerNodeOffer').map(entry => entry.to))];
    const toOthers = evidence.requests.filter(entry => entry.to !== 'alpha' && !entry.to.startsWith('other:'));
    const opsToOthers = [...new Set(toOthers.map(entry => entry.op ?? entry.path))].sort();
    const allowed = ['/rest/remote-access/status', 'AddPeerNode', 'GetPeerAddressCandidates', 'GetPeerNodeAvailability', 'GetRemoteCollaborationCapability',
      'GetRemoteCollaborationSettings', 'RemovePeerNode', 'ResolvePeerAddress', 'SetRemoteCollaborationEnabled'];
    expect(JSON.stringify(offerHosts) === JSON.stringify(['alpha']), `offers only from alpha: ${offerHosts}`);
    expect(opsToOthers.every(op => allowed.includes(op)), `the other nodes see only their settings API and identity page: ${opsToOthers}`);
    return { offerHosts, opsToOthers, requestsToOthers: toOthers.length, totalRequests: evidence.requests.length,
      nonNodeHosts: [...new Set(evidence.requests.filter(entry => entry.to.startsWith('other:')).map(entry => entry.to))] };
  });

  currentCase = null;
  // Requests to stopped or black-holed nodes fail by design; anything else the browser reports is a failure.
  const unexpectedErrors = evidence.browserErrors.filter(entry => !/favicon|DevTools|Failed to load resource|net::ERR_/.test(entry));
  evidence.unexpectedBrowserErrors = unexpectedErrors;
  assert(unexpectedErrors.length === 0, `browser errors: ${unexpectedErrors.join(' | ')}`);
  evidence.result = Object.values(evidence.cases).every(entry => entry.result === 'Pass') ? 'Pass' : 'Fail';
  if (evidence.result !== 'Pass') process.exitCode = 1;
} catch (error) {
  evidence.error = error instanceof Error ? error.stack ?? error.message : String(error);
  if (currentCase) evidence.cases[currentCase] = { result: 'Fail', error: evidence.error, failedExpectations: expectations };
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (frontend && !exited(frontend)) {
    try { process.kill(-frontend.pid, 'SIGTERM'); } catch { /* gone */ }
    await Promise.race([new Promise(resolve => frontend.once('close', resolve)), sleep(8_000)]);
    if (!exited(frontend)) { try { process.kill(-frontend.pid, 'SIGKILL'); } catch { /* gone */ } }
  }
  for (const socket of blackHoles) socket.destroy();
  for (const child of [...children]) await stopServer({ child });
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  evidence.cleanup = { frontendExited: !frontend || exited(frontend), serversLeft: children.size, rootRemoved: !existsSync(root) };
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'remote-nodes-page-probe.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`remote-nodes-page probe: ${evidence.result}${evidence.error ? `\n${evidence.error}` : ''}`);
  process.exit(process.exitCode ?? 0);
}

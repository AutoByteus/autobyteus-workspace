#!/usr/bin/env node
// Browser + server probe for Nodes → Remote Collaboration (autobyteus-267): every peer's state and offer, driven in a
// real browser against test-owned servers built from this worktree, with the window's full request log.
//
// Servers (`autobyteus-server-ts/dist/app.js`, each with its own temp data root and HOME): alpha (the window's node) and
// its peers, registered on alpha in this order — beta (shares 24 Agents, one without a description, and 6 Agent
// Teams), gamma (stopped), delta (Remote Collaboration off), epsilon (does not know alpha), zeta (a different server
// answers at its address), eta (shares nothing), theta (black-holed: a TCP listener that never answers); iota is added
// through the page. The web app runs with `nuxt dev` against alpha; the browser is Chrome through playwright-core.
//
// Cases: RNP-01 open (each peer settles at its own pace; theta Checking… then Not reachable at the 20 s bound; the page
// stays usable meanwhile), RNP-02 beta's list (equals alpha's peerNodeOffer answer; 30 entries; one line, then open;
// search narrows and clears), RNP-03 Refresh asks one peer, RNP-04 add asks the new peer once, RNP-05 switch off asks
// nobody and shows the notice; on asks every peer once, RNP-06 leaving the tab and returning asks every peer again,
// RNP-07 rename and remove still work, RNP-08 no polling in a quiet period, RNP-09 the window never contacts a peer.
//
// Prerequisite: `pnpm -C autobyteus-server-ts build`. Run: `pnpm -C autobyteus-web test:e2e:remote-nodes-page`
// (`--output-dir=<dir>` for the evidence, `--browser-executable=<path>` for Chrome). About 2–3 minutes.
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
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', node: process.version, browserExecutable: executablePath || 'playwright-default',
  servers: {}, cases: {}, offerRequests: [], windowHosts: [], browserErrors: [], cleanup: {}, error: null };
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
    const body = await (await fetch(`${baseUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json();
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
const switchOn = server => server.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
const register = (on, peer, name) => on.gql('mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { baseUrl: peer.baseUrl, name } });

let frontend, browser;
await fs.mkdir(outputDir, { recursive: true });
try {
  assert(existsSync(appEntry), 'Build the worktree server first: pnpm -C autobyteus-server-ts build');
  const names = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota'];
  const ports = Object.fromEntries(await Promise.all(names.map(async name => [name, await freePort()])));
  // beta's file-authored shared Agent without a description (REQ-510: the page shows no description for it).
  const plainDir = path.join(root, 'beta', 'data', 'agents', 'plain-helper');
  await fs.mkdir(plainDir, { recursive: true });
  await fs.writeFile(path.join(plainDir, 'agent.md'), ['---', 'name: Plain Helper', 'role: assistant', '---', '', 'Help.'].join('\n'));
  await fs.writeFile(path.join(plainDir, 'agent-config.json'), JSON.stringify({ toolNames: [], skillNames: [] }));
  const servers = Object.fromEntries((await Promise.all(names.map(name => startServer(name, ports[name])))).map(server => [server.name, server]));
  const { alpha, beta, gamma, delta, epsilon, zeta, eta, theta, iota } = servers;
  for (const server of Object.values(servers)) await switchOn(server);

  // beta's offer: 23 Agents with descriptions plus Plain Helper = 24 Agents, and 6 Agent Teams (30 entries).
  const agentNames = ['Copy Editor', 'Copy Writer', 'Copy Checker', 'Designer', 'Illustrator', 'Photographer', 'Video Editor', 'Sound Mixer',
    'Translator', 'Proofreader', 'Researcher', 'Analyst', 'Planner', 'Scheduler', 'Publisher', 'Archivist', 'Reviewer', 'Tester', 'Builder',
    'Deployer', 'Monitor', 'Support Agent', 'Night Owl'];
  const agentIds = {};
  for (const name of agentNames) {
    agentIds[name] = (await beta.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name, role: 'assistant',
      description: `${name} on beta`, instructions: 'Help.', toolNames: [] } })).createAgentDefinition.id;
  }
  const teamNames = ['Copy Team', 'Design Team', 'Video Team', 'Research Team', 'Release Team', 'Support Team'];
  for (const name of teamNames) {
    await beta.gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name, description: `${name} on beta`,
      instructions: 'Work together.', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: agentIds.Designer, refScope: 'SHARED' }] } });
  }
  const expectedEntries = [...agentNames.map(name => ({ name, kind: 'agent', description: `${name} on beta` })), { name: 'Plain Helper', kind: 'agent', description: null },
    ...teamNames.map(name => ({ name, kind: 'agent_team', description: `${name} on beta` }))];

  // Peers on alpha, in registration order; each peer then takes its state.
  for (const peer of [beta, gamma, delta, epsilon, zeta, eta, theta]) await register(alpha, peer, peer.name);
  for (const peer of [beta, gamma, delta, zeta, eta, theta, iota]) await register(peer, alpha, 'alpha');
  await stopServer(gamma);
  await delta.gql('mutation{setRemoteCollaborationEnabled(enabled:false){enabled}}');
  // zeta: another server (its own data root, so another identity) now answers at zeta's address.
  const zetaRegisteredId = zeta.nodeId;
  await stopServer(zeta);
  await fs.rename(path.join(root, 'zeta'), path.join(root, 'zeta-original'));
  const zeta2 = await startServer('zeta', ports.zeta);
  await switchOn(zeta2);
  assert(zeta2.nodeId !== zetaRegisteredId, 'the second zeta must have another identity');
  servers.zeta2 = zeta2;
  // theta: registered, then its address holds the connection open and never answers.
  const thetaId = theta.nodeId;
  await stopServer(theta);
  const hole = net.createServer(socket => { blackHoles.push(socket); socket.on('error', () => undefined); });
  await new Promise(resolve => hole.listen(ports.theta, '127.0.0.1', resolve));
  const peerIds = { beta: beta.nodeId, gamma: gamma.nodeId, delta: delta.nodeId, epsilon: epsilon.nodeId, zeta: zetaRegisteredId, eta: eta.nodeId, theta: thetaId };
  const peerPorts = new Set([beta, gamma, delta, epsilon, zeta, eta, theta, iota].map(server => String(server.port)));

  // The web app against alpha.
  const frontendPort = await freePort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const frontendLog = createWriteStream(path.join(outputDir, 'frontend.log'));
  frontend = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], { cwd: webDir, detached: true,
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: alpha.baseUrl } });
  frontend.stdout.pipe(frontendLog); frontend.stderr.pipe(frontendLog);
  const pageUrl = `${frontendUrl}/nodes?nodeTab=remoteCollaboration`;
  await waitFor('frontend', async () => {
    if (exited(frontend)) throw new Error(`frontend exited ${frontend.exitCode}`);
    return fetch(pageUrl).then(response => response.ok).catch(() => false);
  }, 240_000);

  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
  await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const page = await context.newPage();
  // Warm the dev server (first compile) before the measured open.
  await page.goto(`${frontendUrl}/nodes?nodeTab=manage`, { waitUntil: 'networkidle', timeout: 240_000 });
  page.on('pageerror', error => evidence.browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') evidence.browserErrors.push(`console: ${message.text()}`); });
  const allRequests = [];
  const answers = new Map();
  page.on('request', request => {
    const url = new URL(request.url());
    allRequests.push({ at: Date.now(), method: request.method(), host: url.host, path: url.pathname });
    if (request.method() !== 'POST' || !url.pathname.endsWith('/graphql')) return;
    let payload = null;
    try { payload = request.postDataJSON(); } catch { /* not JSON */ }
    if (payload?.operationName === 'GetPeerNodeOffer' || /peerNodeOffer/.test(payload?.query ?? '')) {
      evidence.offerRequests.push({ at: Date.now(), nodeId: payload.variables?.nodeId, host: url.host });
    }
  });
  page.on('response', async response => {
    const request = response.request();
    let payload = null;
    try { payload = request.postDataJSON(); } catch { return; }
    if (!/peerNodeOffer/.test(payload?.query ?? '')) return;
    try { answers.set(payload.variables?.nodeId, (await response.json()).data?.peerNodeOffer ?? null); } catch { /* aborted */ }
  });
  const asked = (since, nodeId) => evidence.offerRequests.filter(entry => entry.at >= since && (!nodeId || entry.nodeId === nodeId));
  const perPeer = since => Object.fromEntries(Object.entries({ ...peerIds, iota: iota.nodeId }).map(([name, id]) => [name, asked(since, id).length]));
  const chip = nodeId => page.locator(`[data-testid="remote-collaboration-peer-status-${nodeId}"]`);
  const chipText = async nodeId => (await chip(nodeId).count()) ? (await chip(nodeId).innerText()).trim() : null;
  const detailText = async nodeId => {
    const detail = page.locator(`[data-testid="remote-collaboration-peer-detail-${nodeId}"]`);
    return (await detail.count()) ? (await detail.innerText()).trim() : null;
  };
  const tab = id => page.locator(`[data-testid="node-manager-tab-${id}"]`);

  // RNP-01: open; each peer settles at its own pace; theta waits for the bound while the page stays usable.
  const openedAt = Date.now();
  await tab('remoteCollaboration').click();
  const settledAt = {};
  const expectedStates = { beta: 'Available', gamma: 'Not reachable', delta: 'Off there', epsilon: 'Not registered there', zeta: 'Different server', eta: 'Available', theta: 'Not reachable' };
  const sampler = (async () => {
    while (Object.keys(settledAt).length < Object.keys(peerIds).length && Date.now() - openedAt < BOUND_MS + 15_000) {
      for (const [name, id] of Object.entries(peerIds)) {
        if (settledAt[name]) continue;
        const text = await chipText(id).catch(() => null);
        if (text && text !== 'Checking…') settledAt[name] = { ms: Date.now() - openedAt, chip: text };
      }
      await sleep(100);
    }
  })();
  await waitFor('the fast peers', async () => ['beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta'].every(name => settledAt[name]), 15_000);
  const thetaWhileOthersSettled = { chip: await chipText(thetaId), detail: await detailText(thetaId),
    refreshDisabled: await page.locator(`[data-testid="remote-collaboration-peer-refresh-${thetaId}"]`).isDisabled() };
  assert(thetaWhileOthersSettled.chip === 'Checking…', `theta should still be checking: ${JSON.stringify(thetaWhileOthersSettled)}`);
  assert(thetaWhileOthersSettled.detail === 'Waiting for theta… up to 20 seconds.', `theta's waiting sentence: ${thetaWhileOthersSettled.detail}`);
  assert(thetaWhileOthersSettled.refreshDisabled, "theta's Refresh is disabled while it is checked");
  await page.screenshot({ path: path.join(outputDir, 'RNP-01-theta-checking-others-settled.png'), fullPage: true });

  // RNP-02 while theta is still waiting (the page stays usable): beta's list.
  const betaOffer = `remote-collaboration-peer-offer-${beta.nodeId}`;
  const summary = (await page.locator(`[data-testid="${betaOffer}-summary"]`).innerText()).trim();
  const preview = (await page.locator(`[data-testid="${betaOffer}-preview"]`).innerText()).trim();
  assert(summary === '24 Agents · 6 Agent Teams', `beta's summary line: ${summary}`);
  assert(await page.locator(`[data-testid="${betaOffer}-list"]`).count() === 0, 'the list starts as one line');
  await page.locator(`[data-testid="${betaOffer}-toggle"]`).click();
  const usableWhileTheta = await chipText(thetaId);
  const domEntries = await page.locator(`[data-testid="${betaOffer}-list-entry"]`).evaluateAll(items => items.map(item => {
    const [name, description] = [...item.querySelectorAll('p')].map(p => p.textContent.trim());
    const kind = item.closest('section')?.getAttribute('data-testid')?.endsWith('-teams') ? 'agent_team' : 'agent';
    return { name, kind, description: description ?? null };
  }));
  // Apollo adds `__typename` to what the window receives; the server's fields are name, kind and description.
  const withoutTypename = ({ __typename, ...entry }) => entry;
  const byName = list => [...list].map(withoutTypename).sort((a, b) => `${a.kind}:${a.name}`.localeCompare(`${b.kind}:${b.name}`));
  const alphaAnswer = (await alpha.gql('query($id:String!){peerNodeOffer(nodeId:$id){entries{name kind description} refusalCode}}', { id: beta.nodeId })).peerNodeOffer;
  assert(JSON.stringify(byName(domEntries)) === JSON.stringify(byName(expectedEntries)), `the page's list: ${JSON.stringify(byName(domEntries))}`);
  assert(JSON.stringify(byName(alphaAnswer.entries)) === JSON.stringify(byName(expectedEntries)), 'alpha answers beta\'s whole offer');
  assert(JSON.stringify(byName(answers.get(beta.nodeId)?.entries ?? [])) === JSON.stringify(byName(expectedEntries)), 'the window received the same list');
  const windowAnswerKeys = [...new Set((answers.get(beta.nodeId)?.entries ?? []).flatMap(entry => Object.keys(entry)))].filter(key => key !== '__typename').sort();
  assert(windowAnswerKeys.join(',') === 'description,kind,name', `the window receives only name, kind and description: ${windowAnswerKeys}`);
  const search = page.locator(`[data-testid="${betaOffer}-list-search"]`);
  assert(await search.count() === 1, 'search shows when a kind has more than 6');
  await search.fill('copy');
  const filtered = { agents: (await page.locator(`[data-testid="${betaOffer}-list-agents-count"]`).innerText()).trim(),
    teams: (await page.locator(`[data-testid="${betaOffer}-list-teams-count"]`).innerText()).trim(),
    names: await page.locator(`[data-testid="${betaOffer}-list-entry"] p:first-child`).allInnerTexts() };
  assert(filtered.agents === '3 of 24' && filtered.teams === '1 of 6', `filtered counts: ${JSON.stringify(filtered)}`);
  await search.fill('zzz');
  const noMatch = (await page.locator(`[data-testid="${betaOffer}-list-no-match"]`).innerText()).trim();
  assert(noMatch.startsWith('No Agents or Agent Teams match “zzz”.'), `no-match sentence: ${noMatch}`);
  await page.getByRole('button', { name: 'Clear search' }).click();
  const afterClear = await page.locator(`[data-testid="${betaOffer}-list-entry"]`).count();
  assert(afterClear === 30, `clearing shows all 30: ${afterClear}`);
  await search.fill('copy');
  await page.screenshot({ path: path.join(outputDir, 'RNP-02-beta-open-search-copy.png'), fullPage: true });
  await search.fill('');
  await sampler;
  for (const [name, state] of Object.entries(expectedStates)) assert(settledAt[name]?.chip === state, `${name}: ${JSON.stringify(settledAt[name])}`);
  assert(settledAt.theta.ms >= BOUND_MS - 1_000 && settledAt.theta.ms <= BOUND_MS + 6_000, `theta settles at the bound: ${settledAt.theta.ms} ms`);
  for (const name of ['beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta']) assert(settledAt[name].ms < 5_000, `${name} settles at once: ${settledAt[name].ms} ms`);
  const details = Object.fromEntries(await Promise.all(Object.entries(peerIds).map(async ([name, id]) => [name, await detailText(id)])));
  const etaEmpty = (await page.locator(`[data-testid="remote-collaboration-peer-empty-${eta.nodeId}"]`).innerText()).trim();
  assert(etaEmpty === 'eta shares no Agents or Agent Teams.', `eta: ${etaEmpty}`);
  const openCounts = perPeer(openedAt);
  assert(Object.entries(openCounts).every(([name, count]) => count === (name === 'iota' ? 0 : 1)), `one ask per peer on open: ${JSON.stringify(openCounts)}`);
  await page.screenshot({ path: path.join(outputDir, 'RNP-01-all-settled.png'), fullPage: true });
  evidence.cases['RNP-01'] = { result: 'Pass', settledAt, thetaWhileOthersSettled, details, etaEmpty, openCounts };
  evidence.cases['RNP-02'] = { result: 'Pass', summary, preview, usableWhileTheta, entries: domEntries.length, filtered, noMatch, afterClear,
    windowAnswerKeys };

  // RNP-03: Refresh asks that peer only.
  const refreshAt = Date.now();
  await page.locator(`[data-testid="remote-collaboration-peer-refresh-${beta.nodeId}"]`).click();
  await waitFor('beta answered again', async () => (await chipText(beta.nodeId)) === 'Available' && asked(refreshAt, beta.nodeId).length === 1);
  await sleep(1_500);
  const refreshCounts = perPeer(refreshAt);
  assert(Object.entries(refreshCounts).every(([name, count]) => count === (name === 'beta' ? 1 : 0)), `Refresh asks one peer: ${JSON.stringify(refreshCounts)}`);
  evidence.cases['RNP-03'] = { result: 'Pass', refreshCounts };

  // RNP-04: adding a peer asks it at once.
  const addAt = Date.now();
  await page.locator('[data-testid="remote-collaboration-peer-url"]').fill(iota.baseUrl);
  await page.locator('[data-testid="remote-collaboration-peer-name"]').fill('iota');
  await page.locator('[data-testid="remote-collaboration-peer-add"]').click();
  await waitFor('iota listed and available', async () => (await chipText(iota.nodeId)) === 'Available');
  await sleep(1_500);
  const addCounts = perPeer(addAt);
  assert(Object.entries(addCounts).every(([name, count]) => count === (name === 'iota' ? 1 : 0)), `add asks the new peer once: ${JSON.stringify(addCounts)}`);
  const iotaEmpty = (await page.locator(`[data-testid="remote-collaboration-peer-empty-${iota.nodeId}"]`).innerText()).trim();
  evidence.cases['RNP-04'] = { result: 'Pass', addCounts, iotaEmpty };

  // RNP-05: switch off asks nobody and shows the notice; switch on asks every peer once.
  const offAt = Date.now();
  await page.locator('[data-testid="remote-collaboration-feature-toggle"]').click();
  await page.locator('[data-testid="remote-collaboration-peers-off-notice"]').waitFor({ state: 'visible' });
  await sleep(3_000);
  const offState = { notice: (await page.locator('[data-testid="remote-collaboration-peers-off-notice"]').innerText()).trim(),
    chips: await page.locator('[data-testid^="remote-collaboration-peer-status-"]').count(),
    refreshButtons: await page.locator('[data-testid^="remote-collaboration-peer-refresh-"]').count(), asked: asked(offAt).length,
    alphaSwitch: (await alpha.gql('{ remoteCollaborationCapability { enabled } }')).remoteCollaborationCapability.enabled };
  assert(offState.notice === 'Remote Collaboration is off, so peers are not asked. Turn it on to see their Agents and Agent Teams.', `notice: ${offState.notice}`);
  assert(offState.chips === 0 && offState.refreshButtons === 0 && offState.asked === 0 && offState.alphaSwitch === false, `switch off: ${JSON.stringify(offState)}`);
  await page.screenshot({ path: path.join(outputDir, 'RNP-05-switch-off.png'), fullPage: true });
  const onAt = Date.now();
  await page.locator('[data-testid="remote-collaboration-feature-toggle"]').click();
  await waitFor('every fast peer settled again', async () => (await chipText(beta.nodeId)) === 'Available' && (await chipText(iota.nodeId)) === 'Available');
  await sleep(1_500);
  const onCounts = perPeer(onAt);
  assert(Object.values(onCounts).every(count => count === 1), `switch on asks every peer once: ${JSON.stringify(onCounts)}`);
  evidence.cases['RNP-05'] = { result: 'Pass', offState, onCounts };

  // RNP-06: leaving the tab and returning asks every peer again.
  await tab('manage').click();
  await page.locator('[data-testid="node-manager-panel-manage"]').waitFor({ state: 'visible' });
  const returnAt = Date.now();
  await tab('remoteCollaboration').click();
  await waitFor('peers asked again', async () => (await chipText(beta.nodeId)) === 'Available');
  await sleep(1_500);
  const returnCounts = perPeer(returnAt);
  const thetaAfterReturn = await chipText(thetaId);
  // theta's ask from the switch-on is still in flight (black-holed) when the owner returns: the return must ask it again
  // (UI/UX spec: "Leaving the tab and returning asks every peer again"), not reuse the earlier query.
  const thetaEarlier = asked(onAt, thetaId)[0]?.at ?? null;
  const fastPeersOnce = Object.entries(returnCounts).filter(([name]) => name !== 'theta').every(([, count]) => count === 1);
  assert(fastPeersOnce, `returning asks every settled peer once: ${JSON.stringify(returnCounts)}`);
  // The same while theta's query is in flight: switch off, then on (TR-009 "All asked").
  const offAgainAt = Date.now();
  await page.locator('[data-testid="remote-collaboration-feature-toggle"]').click();
  await page.locator('[data-testid="remote-collaboration-peers-off-notice"]').waitFor({ state: 'visible' });
  const onAgainAt = Date.now();
  await page.locator('[data-testid="remote-collaboration-feature-toggle"]').click();
  await waitFor('fast peers settled after switch on again', async () => (await chipText(beta.nodeId)) === 'Available');
  await sleep(1_500);
  const onAgainCounts = perPeer(onAgainAt);
  await waitFor('theta settled', async () => (await chipText(thetaId)) === 'Not reachable', BOUND_MS + 10_000);
  const thetaSettledAfterSwitchOnMs = Date.now() - onAgainAt;
  const thetaAsked = { onReturn: returnCounts.theta, onSwitchOnAgain: onAgainCounts.theta };
  const pass = thetaAsked.onReturn === 1 && thetaAsked.onSwitchOnAgain === 1;
  evidence.cases['RNP-06'] = { result: pass ? 'Pass' : 'Fail', returnCounts, onAgainCounts, thetaAfterReturn, thetaAsked,
    returnMsAfterSwitchOn: returnAt - onAt, thetaEarlierQueryMsBeforeReturn: thetaEarlier ? returnAt - thetaEarlier : null,
    switchOffOnMsAfterReturn: offAgainAt - returnAt, thetaSettledAfterSwitchOnMs,
    note: pass ? null : 'theta was not asked again while its earlier query was still in flight: the window joined that query (identical GetPeerNodeOffer variables; Apollo query deduplication is on by default), so theta settled with the earlier answer, before 20 s from the new ask.' };

  // RNP-07: rename and remove still work (AC-507); removing asks nobody.
  const etaRow = page.locator(`[data-testid="remote-collaboration-peer-${eta.nodeId}"]`);
  await etaRow.getByRole('button', { name: 'Rename' }).click();
  await page.locator('[data-testid="remote-collaboration-peer-rename-input"]').fill('eta-renamed');
  await page.locator('[data-testid="remote-collaboration-peer-rename-input"]').press('Enter');
  await waitFor('eta renamed', async () => (await alpha.gql('{ peerNodes { nodeId name } }')).peerNodes.some(peer => peer.nodeId === eta.nodeId && peer.name === 'eta-renamed'));
  const removeAt = Date.now();
  await page.locator(`[data-testid="remote-collaboration-peer-remove-${iota.nodeId}"]`).click();
  await waitFor('iota removed', async () => !(await alpha.gql('{ peerNodes { nodeId } }')).peerNodes.some(peer => peer.nodeId === iota.nodeId)
    && (await page.locator(`[data-testid="remote-collaboration-peer-${iota.nodeId}"]`).count()) === 0);
  const peersAfter = (await alpha.gql('{ peerNodes { name } }')).peerNodes.map(peer => peer.name);
  evidence.cases['RNP-07'] = { result: 'Pass', peersAfter, askedOnRemove: asked(removeAt).length };
  assert(evidence.cases['RNP-07'].askedOnRemove === 0, 'removing asks nobody');

  // RNP-08: no polling — a quiet period after theta's last answer.
  await waitFor('theta settled after the return', async () => (await chipText(thetaId)) === 'Not reachable', BOUND_MS + 10_000);
  const quietAt = Date.now();
  await sleep(30_000);
  evidence.cases['RNP-08'] = { result: 'Pass', quietMs: Date.now() - quietAt, askedDuringQuiet: asked(quietAt).length };
  assert(evidence.cases['RNP-08'].askedDuringQuiet === 0, 'no request during the quiet period');

  // RNP-09: the window never contacts a peer; every offer query went to this node's own server.
  const windowHosts = [...new Set(allRequests.map(request => request.host))].sort();
  const toPeers = allRequests.filter(request => peerPorts.has(request.host.split(':')[1] ?? ''));
  evidence.windowHosts = windowHosts;
  evidence.cases['RNP-09'] = { result: toPeers.length === 0 ? 'Pass' : 'Fail', windowHosts, requestsToPeers: toPeers.length, totalRequests: allRequests.length,
    offerHosts: [...new Set(evidence.offerRequests.map(entry => entry.host))] };
  assert(toPeers.length === 0, `the window contacted a peer: ${JSON.stringify(toPeers.slice(0, 3))}`);
  assert(evidence.browserErrors.filter(line => !/favicon|DevTools/.test(line)).length === 0, `browser errors: ${evidence.browserErrors.join(' | ')}`);
  evidence.result = Object.values(evidence.cases).every(entry => entry.result === 'Pass') ? 'Pass' : 'Fail';
  if (evidence.result !== 'Pass') process.exitCode = 1;
} catch (error) {
  evidence.error = error instanceof Error ? error.stack ?? error.message : String(error);
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

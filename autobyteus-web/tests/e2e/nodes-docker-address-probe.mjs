#!/usr/bin/env node
// Browser + server probe for the addresses nodes use for each other when one of them runs in Docker (one-nodes-tab
// AC-704, AC-707, REQ-708, REQ-713). It drives the Nodes page in a real browser, first in a window bound to a node on
// this machine, then in a window bound to the Docker node. Both are test-owned.
//
// Nodes:
// - desk is a server of this worktree on the host (`autobyteus-server-ts/dist/app.js`, own data root and HOME,
//   `127.0.0.1:<port>`), like the desktop's embedded node.
// - other is a second host server. Inside Docker it answers at `host.docker.internal:<its port>`, which gives a
//   "different node" address.
// - docker is a test-owned container from the node image (`--docker-image`, default
//   `autobyteus/autobyteus-server:beta`). It publishes only `127.0.0.1:<port>`, mounts no volumes, and mounts this
//   worktree's `autobyteus-server-ts/dist` read-only over the image's, as TESTING.md § Docker server nodes says. The
//   receipt lists every `.js` file in which the image's own `dist` differs from the mounted one.
// The user's node containers are never touched. The container is removed with `docker rm -f -v`.
//
// Cases:
// - ND-01 (AC-704): in the window on desk, add the Docker node at `http://127.0.0.1:<published port>` with its switch
//   off, and turn collaboration on in the one confirmation. desk registers the Docker node at the address the window
//   used. The Docker node registers desk at `host.docker.internal:<desk port>`, the address that reaches desk from
//   inside the container; it finds that address itself, after its switch is turned on. Both directions show Working,
//   and each node lists the other's Agents.
// - ND-04 (design § Loopback Hint Surface): the add form never shows the Docker hint. An unreachable loopback address
//   is added with its cause.
// - ND-02 (AC-707, REQ-708): in the window on the Docker node, desk's row → Change address `http://127.0.0.1:<desk
//   port>` shows "… runs in Docker, where 127.0.0.1 is the container itself." and "Try
//   http://host.docker.internal:<port>". Use this saves that address on the Docker node.
// - ND-03 (AC-707): from inside the container, each cause is named. Change address to a name that does not resolve, to
//   a black-holed address and to another node's address shows each cause, never "fetch failed". The Docker node's
//   `resolvePeerAddress` reports each attempt's result, with `loopbackInContainer`.
// - ND-05 (REQ-713): in the window on the Docker node, "This node" is the Docker node, and desk is a row there.
//
// Prerequisites: `pnpm -C autobyteus-server-ts build`, Docker. Run: `pnpm -C autobyteus-web test:e2e:nodes-docker-address`.
// Options: `--output-dir=<dir>` for the evidence, `--docker-image=<image>`, `--browser-executable=<path>`. Takes about
// 4–6 minutes.
import { createWriteStream, existsSync, mkdtempSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serverDir = path.join(path.dirname(webDir), 'autobyteus-server-ts');
const distDir = path.join(serverDir, 'dist');
const appEntry = path.join(distDir, 'app.js');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/nodes-docker-address'));
const image = arg('docker-image', 'autobyteus/autobyteus-server:beta');
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const containerName = `one-nodes-api-docker-${crypto.randomBytes(3).toString('hex')}`;
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', node: process.version, image, containerName, servers: {}, imageDistDiff: null,
  cases: {}, requests: [], browserErrors: [], cleanup: {}, error: null };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (description, fn, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await fn()) return; } catch (error) { lastError = error; }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
});
const exited = child => child.exitCode !== null || child.signalCode !== null;
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

const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'nodes-docker-address-')));
const children = new Set();
let containerStarted = false;

const graphqlClient = (name, baseUrl) => async (query, variables) => {
  const body = await (await fetch(`${baseUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json();
  if (body.errors?.length) { const error = new Error(`${name}: ${JSON.stringify(body.errors)}`); error.errors = body.errors; throw error; }
  return body.data;
};
const gqlErrors = async (gql, query, variables) => { try { await gql(query, variables); return null; } catch (error) { return error.errors ?? [{ message: error.message }]; } };

/** A server of this worktree on the host, with its own data root and HOME. */
const startServer = async (name, port) => {
  const dir = path.join(root, name);
  const dataDir = path.join(dir, 'data');
  const home = path.join(dir, 'home');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(home, { recursive: true });
  const baseUrl = `http://127.0.0.1:${port}`;
  await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\nHTTP_ACCESS_LOG_MODE=off\n`);
  const log = createWriteStream(path.join(outputDir, `server-${name}.log`), { flags: 'a' });
  const child = spawn(process.execPath, [appEntry, '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
    cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', HTTP_ACCESS_LOG_MODE: 'off', AUTOBYTEUS_SERVER_HOST: baseUrl } });
  child.stdout.pipe(log); child.stderr.pipe(log);
  child.once('close', () => log.end());
  children.add(child);
  await waitFor(`${name} health`, async () => {
    if (exited(child)) throw new Error(`${name} exited ${child.exitCode}`);
    return fetch(`${baseUrl}/rest/health`).then(response => response.ok).catch(() => false);
  }, 120_000);
  const nodeId = (await (await fetch(`${baseUrl}/rest/remote-access/status`)).json()).serverInstanceId;
  evidence.servers[name] = { port, baseUrl, nodeId };
  return { name, port, baseUrl, nodeId, child, gql: graphqlClient(name, baseUrl) };
};
const stopChild = async child => {
  if (!exited(child)) {
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(10_000)]);
    if (!exited(child)) child.kill('SIGKILL');
  }
  children.delete(child);
};

/** The `.js` files whose content differs between the image's own `dist` and the mounted one (TESTING.md § Docker server nodes). */
const imageDistDiff = async () => {
  const { stdout } = await run('docker', ['run', '--rm', '--entrypoint', 'sh', image, '-c', 'cd /app/autobyteus-server-ts/dist && find . -type f -name "*.js" -exec md5sum {} +'], { maxBuffer: 64 * 1024 * 1024 });
  const imageSums = new Map(stdout.trim().split('\n').map(lineText => { const [sum, file] = lineText.trim().split(/\s+/); return [file.replace(/^\.\//, ''), sum]; }));
  const local = new Map();
  const walk = async dir => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.js')) local.set(path.relative(distDir, full), crypto.createHash('md5').update(await fs.readFile(full)).digest('hex'));
    }
  };
  await walk(distDir);
  const changed = [...local.keys()].filter(file => imageSums.has(file) && imageSums.get(file) !== local.get(file)).sort();
  return { changed, onlyMounted: [...local.keys()].filter(file => !imageSums.has(file)).sort(), onlyImage: [...imageSums.keys()].filter(file => !local.has(file)).sort() };
};

const startContainer = async port => {
  await run('docker', ['run', '-d', '--name', containerName, '-p', `127.0.0.1:${port}:8000`,
    '-v', `${distDir}:/app/autobyteus-server-ts/dist:ro`, '-e', `AUTOBYTEUS_SERVER_HOST=http://localhost:${port}`, image]);
  containerStarted = true;
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitFor('the Docker node health', async () => fetch(`${baseUrl}/rest/health`).then(response => response.ok).catch(() => false), 240_000);
  const nodeId = (await (await fetch(`${baseUrl}/rest/remote-access/status`)).json()).serverInstanceId;
  const dockerenv = await run('docker', ['exec', containerName, 'test', '-f', '/.dockerenv']).then(() => true, () => false);
  evidence.servers.docker = { port, baseUrl, nodeId, dockerenv };
  return { name: 'docker', port, baseUrl, nodeId, gql: graphqlClient('docker', baseUrl) };
};

const peersOf = async server => (await server.gql('{ peerNodes { nodeId name baseUrl } }')).peerNodes;
const switchOf = async server => (await server.gql('{ remoteCollaborationCapability { enabled } }')).remoteCollaborationCapability.enabled;
const setSwitch = (server, enabled) => server.gql('mutation($e:Boolean!){setRemoteCollaborationEnabled(enabled:$e){enabled}}', { e: enabled });
const shareAgent = (server, name) => server.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
  { i: { name, role: 'assistant', description: `${name} on ${server.name}`, instructions: 'Help.', toolNames: [] } });
const offerOf = async (on, peer) => (await on.gql('query($id:String!){peerNodeOffer(nodeId:$id){refusalCode unreachableReason entries{name}}}', { id: peer.nodeId })).peerNodeOffer;

let frontend, browser;
const startFrontend = async (backend, name) => {
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  const log = createWriteStream(path.join(outputDir, `frontend-${name}.log`));
  const child = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(port)], { cwd: webDir, detached: true,
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backend.baseUrl } });
  child.stdout.pipe(log); child.stderr.pipe(log);
  frontend = child;
  await waitFor(`frontend ${name}`, async () => {
    if (exited(child)) throw new Error(`frontend exited ${child.exitCode}`);
    return fetch(`${url}/nodes?nodeTab=manage`).then(response => response.ok).catch(() => false);
  }, 240_000);
  return { url, port, child };
};
const stopFrontend = async () => {
  if (frontend && !exited(frontend)) {
    try { process.kill(-frontend.pid, 'SIGTERM'); } catch { /* gone */ }
    await Promise.race([new Promise(resolve => frontend.once('close', resolve)), sleep(8_000)]);
    if (!exited(frontend)) { try { process.kill(-frontend.pid, 'SIGKILL'); } catch { /* gone */ } }
  }
};

/** A browser page on the Nodes page of a window bound to `backend`, with helpers. */
const openWindow = async (front, backendName, nodeHosts) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
  await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const page = await context.newPage();
  await page.goto(`${front.url}/nodes?nodeTab=memorySync`, { waitUntil: 'networkidle', timeout: 240_000 });
  await page.locator('[data-testid="node-manager-panel-memorySync"]').waitFor({ state: 'visible', timeout: 120_000 });
  page.on('pageerror', error => evidence.browserErrors.push(`${backendName} pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') evidence.browserErrors.push(`${backendName} console: ${message.text()}`); });
  page.on('request', request => {
    const url = new URL(request.url());
    const to = url.host === `127.0.0.1:${front.port}` ? (/^\/(graphql|rest)\b/.test(url.pathname) ? backendName : null) : nodeHosts[url.host] ?? `other:${url.host}`;
    if (!to) return;
    let payload = null;
    try { payload = request.postDataJSON(); } catch { /* not JSON */ }
    evidence.requests.push({ window: backendName, at: Date.now(), to, path: url.pathname, op: payload?.operationName ?? null, variables: payload?.variables ?? null });
  });
  await page.goto(`${front.url}/nodes?nodeTab=manage`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.locator('[data-testid="node-manager-panel-manage"]').waitFor({ state: 'visible', timeout: 60_000 });
  const clean = value => value.trim().replace(/\s+/g, ' ');
  const text = async locator => (await locator.count()) ? clean(await locator.first().innerText()) : null;
  const line = async key => {
    const element = page.locator(`[data-testid="node-line-${key}"]`);
    if (!(await element.count())) return null;
    const paragraph = element.locator('p');
    // The mark (ⓘ ⚠ ✗) is spaced by CSS, not by text: "ⓘ Not reachable. …".
    const value = (await paragraph.count()) ? await text(paragraph) : await text(element);
    return value?.replace(/^([ⓘ⚠✗])\s*/u, '$1 ') ?? null;
  };
  const helpers = {
    page, context, text, line,
    row: key => page.locator(`[data-testid="node-row-${key}"]`),
    dialog: () => page.locator('[role="dialog"][data-testid^="node-change-dialog-"]'),
    settled: async key => (await page.locator(`[data-testid="node-row-${key}"]`).count()) === 1 && !/^Checking /.test((await line(key)) ?? ''),
    directions: async key => ({ out: await text(page.locator(`[data-testid="node-direction-out-${key}"]`)), in: await text(page.locator(`[data-testid="node-direction-in-${key}"]`)) }),
    openDetails: async key => {
      if (await page.locator(`[data-testid="node-directions-${key}"]`).count()) return;
      await page.locator(`[data-testid="node-offer-${key}-toggle"]`).click();
      await page.locator(`[data-testid="node-directions-${key}"]`).waitFor({ state: 'visible' });
    },
    dialogSteps: async () => (await page.locator('[data-testid^="node-change-step-"]').evaluateAll(items => items.map(item => ({
      id: item.getAttribute('data-testid').slice('node-change-step-'.length), raw: item.innerText })))).map(({ id, raw }) => {
      const value = clean(raw);
      const mark = /^[•✓✗○]/.test(value) ? value[0] : '';
      return { id, mark, text: clean(mark ? value.slice(1) : value) };
    }),
    addNode: async (address, name, collaborate) => {
      await page.locator('[data-testid="add-node-address"]').fill(address);
      await page.locator('[data-testid="add-node-name"]').fill(name);
      const toggle = page.locator('[data-testid="add-node-collaborate"]');
      if ((await toggle.getAttribute('aria-checked')) !== String(collaborate)) await toggle.click();
      await page.locator('[data-testid="add-node-submit"]').click();
    },
    shot: name => page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true }),
  };
  return helpers;
};

await fs.mkdir(outputDir, { recursive: true });
try {
  assert(existsSync(appEntry), 'Build the worktree server first: pnpm -C autobyteus-server-ts build');
  await run('docker', ['version', '--format', '{{.Server.Version}}']).catch(() => { throw new Error('Docker is not available (needed for the Docker node)'); });
  evidence.imageDistDiff = await imageDistDiff();
  const [deskPort, otherPort, dockerPort, deadPort] = await Promise.all([freePort(), freePort(), freePort(), freePort()]);
  const [desk, other] = await Promise.all([startServer('desk', deskPort), startServer('other', otherPort)]);
  const docker = await startContainer(dockerPort);
  assert(evidence.servers.docker.dockerenv, 'the Docker node runs in a container (/.dockerenv)');
  await setSwitch(desk, true);
  await shareAgent(desk, 'Desk Helper');
  await shareAgent(docker, 'Docker Helper');
  const nodeHosts = {};
  for (const server of [desk, other, docker]) { nodeHosts[`127.0.0.1:${server.port}`] = server.name; nodeHosts[`localhost:${server.port}`] = server.name; }
  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  // ---- the window on desk
  let front = await startFrontend(desk, 'desk');
  let w = await openWindow(front, 'desk', nodeHosts);

  await runCase('ND-01', async () => {
    const dockerSwitchBefore = await switchOf(docker);
    await w.addNode(docker.baseUrl, 'docker', true);
    await w.dialog().waitFor({ state: 'visible', timeout: 15_000 });
    await waitFor('the here address found', async () => !((await w.text(w.dialog())) ?? '').includes('Finding the address'), 25_000);
    const confirm = { text: await w.text(w.dialog()), steps: await w.dialogSteps() };
    await w.shot('ND-01-confirmation');
    await w.page.locator('[data-testid="node-change-confirm"]').click();
    await waitFor('the dialog closes', async () => (await w.dialog().count()) === 0, 45_000);
    await waitFor('docker working', async () => await w.settled(docker.nodeId) && (await w.line(docker.nodeId)) === null, 30_000);
    await w.openDetails(docker.nodeId);
    await waitFor('both directions', async () => (await w.directions(docker.nodeId)).in?.includes('Working'), 30_000);
    const directions = await w.directions(docker.nodeId);
    await w.shot('ND-01-working-details');
    const onDesk = (await peersOf(desk)).find(peer => peer.nodeId === docker.nodeId);
    const onDocker = await peersOf(docker);
    const candidates = (await desk.gql('{ peerAddressCandidates }')).peerAddressCandidates;
    const offers = { deskAsksDocker: await offerOf(desk, docker), dockerAsksDesk: await offerOf(docker, desk) };
    expect(dockerSwitchBefore === false, 'the Docker node starts with its switch off');
    expect(JSON.stringify(confirm.steps.map(entry => entry.id)) === JSON.stringify(['registerHere', 'turnOnThere', 'registerThere'])
      && confirm.steps[2]?.text.includes("docker finds this node's address once it is on."), `confirmation: ${JSON.stringify(confirm.steps)}`);
    assert(onDesk?.baseUrl === docker.baseUrl && onDesk.name === 'docker', `the Docker node on desk: ${JSON.stringify(onDesk)}`);
    assert(onDocker.length === 1 && onDocker[0].nodeId === desk.nodeId && onDocker[0].baseUrl === `http://host.docker.internal:${desk.port}`,
      `desk on the Docker node, at the address that reaches it from inside the container: ${JSON.stringify(onDocker)}`);
    expect(directions.out?.startsWith(`This node → docker ✓ Working via ${docker.baseUrl}`) && directions.in?.startsWith(`docker → this node ✓ Working via http://host.docker.internal:${desk.port}`),
      `directions: ${JSON.stringify(directions)}`);
    expect(offers.deskAsksDocker.refusalCode === null && offers.deskAsksDocker.entries.some(entry => entry.name === 'Docker Helper')
      && offers.dockerAsksDesk.refusalCode === null && offers.dockerAsksDesk.entries.some(entry => entry.name === 'Desk Helper'), `each lists the other's Agents: ${JSON.stringify(offers)}`);
    return { dockerSwitchBefore, confirm, onDesk, onDocker, deskCandidates: candidates, directions, offers };
  });

  await runCase('ND-04', async () => {
    await w.addNode(`http://127.0.0.1:${deadPort}`, 'ghost', true);
    await waitFor('ghost listed', async () => (await w.page.locator('[data-testid^="node-name-"]').allInnerTexts()).includes('ghost'), 10_000);
    await sleep(2_500);
    const ghostKey = await w.page.locator('[data-testid^="node-row-d:"]').first().getAttribute('data-testid').then(value => value.slice('node-row-'.length));
    const state = { line: await w.line(ghostKey), hints: await w.page.locator('[data-testid*="-hint"]').count(), dialog: await w.dialog().count(),
      addPanelText: await w.text(w.page.locator('[data-testid="add-node-panel"]')) };
    expect(state.line === 'ⓘ Not reachable. Nothing answers at that address and port.' && state.hints === 0 && state.dialog === 0 && !/Docker|host\.docker\.internal/.test(state.addPanelText ?? ''),
      `the add form never shows the hint: ${JSON.stringify(state)}`);
    return { state };
  });

  await w.context.close();
  await stopFrontend();

  // ---- the window on the Docker node
  // Before it opens, the Docker node's owner had changed desk's address to another name of the same host
  // (`gateway.docker.internal`), so "Use this" visibly changes it back.
  const gatewayChange = await gqlErrors(docker.gql, 'mutation($id:String!,$u:String!){changePeerAddress(nodeId:$id,baseUrl:$u){baseUrl}}',
    { id: desk.nodeId, u: `http://gateway.docker.internal:${desk.port}` });
  evidence.gatewayChange = { errors: gatewayChange, peersAfter: await peersOf(docker) };
  front = await startFrontend(docker, 'docker');
  w = await openWindow(front, 'docker', nodeHosts);

  await runCase('ND-05', async () => {
    await waitFor('desk row settled', async () => await w.settled(desk.nodeId), 30_000);
    const thisNode = { url: await w.text(w.page.locator('[data-testid="this-node-url"]')), switch: await w.text(w.page.locator('[data-testid="this-node-switch-status"]')) };
    const deskRow = { name: await w.text(w.page.locator(`[data-testid="node-name-${desk.nodeId}"]`)), url: await w.text(w.page.locator(`[data-testid="node-url-${desk.nodeId}"]`)),
      line: await w.line(desk.nodeId), dot: await w.page.locator(`[data-testid="node-dot-${desk.nodeId}"]`).getAttribute('aria-label') };
    await w.shot('ND-05-window-on-docker');
    expect(thisNode.url === docker.baseUrl && thisNode.switch === 'On', `this node is the Docker node: ${JSON.stringify(thisNode)}`);
    expect(deskRow.name === 'Embedded Node' && deskRow.url?.startsWith('host.docker.internal:') || deskRow.url?.startsWith('gateway.docker.internal:'), `desk's row: ${JSON.stringify(deskRow)}`);
    expect(deskRow.line === null && deskRow.dot === 'Reachable now', `desk reachable from the Docker node: ${JSON.stringify(deskRow)}`);
    return { thisNode, deskRow };
  });

  await runCase('ND-02', async () => {
    await w.openDetails(desk.nodeId);
    await w.page.locator(`[data-testid="node-change-address-${desk.nodeId}"]`).click();
    const input = w.page.locator(`[data-testid="node-address-input-${desk.nodeId}"]`);
    await input.fill(`http://127.0.0.1:${desk.port}`);
    await w.page.locator(`[data-testid="node-address-save-${desk.nodeId}"]`).click();
    const hint = w.page.locator(`[data-testid="node-address-hint-${desk.nodeId}"]`);
    await hint.waitFor({ state: 'visible', timeout: 30_000 });
    const hintText = await w.text(hint);
    await w.shot('ND-02-change-address-loopback-hint');
    const peerBeforeUse = (await peersOf(docker)).find(peer => peer.nodeId === desk.nodeId);
    const useAt = Date.now();
    await w.page.locator(`[data-testid="node-address-hint-${desk.nodeId}-use"]`).click();
    await waitFor('the editor closes', async () => (await w.page.locator(`[data-testid="node-address-editor-${desk.nodeId}"]`).count()) === 0, 30_000);
    const peerAfter = (await peersOf(docker)).find(peer => peer.nodeId === desk.nodeId);
    const saves = evidence.requests.filter(entry => entry.at >= useAt && entry.op === 'ChangePeerAddress').map(entry => entry.variables);
    await waitFor('desk settled again', async () => await w.settled(desk.nodeId), 30_000);
    await w.openDetails(desk.nodeId);
    const directions = await w.directions(desk.nodeId);
    await w.shot('ND-02-after-use-this');
    expect(hintText?.includes(`can't reach http://127.0.0.1:${desk.port}.`) && hintText.includes('runs in Docker, where 127.0.0.1 is the container itself.')
      && hintText.includes(`Try http://host.docker.internal:${desk.port}`) && hintText.includes('Use this') && hintText.includes('Docker Guide'), `hint: ${hintText}`);
    expect(!/fetch failed/i.test(hintText ?? ''), 'no "fetch failed"');
    expect(peerBeforeUse?.baseUrl !== `http://127.0.0.1:${desk.port}`, `the loopback address was not saved: ${JSON.stringify(peerBeforeUse)}`);
    assert(peerAfter?.baseUrl === `http://host.docker.internal:${desk.port}`, `Use this saved host.docker.internal: ${JSON.stringify(peerAfter)}`);
    expect(saves.length === 1 && saves[0].baseUrl === `http://host.docker.internal:${desk.port}`, `one save with the suggested address: ${JSON.stringify(saves)}`);
    expect(directions.out?.startsWith(`This node → Embedded Node ✓ Working via http://host.docker.internal:${desk.port}`), `directions: ${JSON.stringify(directions)}`);
    return { hintText, peerBeforeUse, peerAfter, saves, directions };
  });

  await runCase('ND-03', async () => {
    const tryAddress = async address => {
      const editor = w.page.locator(`[data-testid="node-address-editor-${desk.nodeId}"]`);
      if (!(await editor.count())) await w.page.locator(`[data-testid="node-change-address-${desk.nodeId}"]`).click();
      await w.page.locator(`[data-testid="node-address-input-${desk.nodeId}"]`).fill(address);
      const startedAt = Date.now();
      await w.page.locator(`[data-testid="node-address-save-${desk.nodeId}"]`).click();
      const error = w.page.locator(`[data-testid="node-address-error-${desk.nodeId}"], [data-testid="node-address-hint-${desk.nodeId}"]`);
      await waitFor(`the answer for ${address}`, async () => (await error.count()) > 0 && !(await w.page.locator(`[data-testid="node-address-save-${desk.nodeId}"]`).isDisabled()), 40_000);
      return { address, text: await w.text(error), ms: Date.now() - startedAt };
    };
    const dns = await tryAddress('http://no-such-node.invalid:8000');
    const blackHole = await tryAddress('http://10.255.255.1:8000');
    const different = await tryAddress(`http://host.docker.internal:${other.port}`);
    await w.shot('ND-03-different-node');
    const peerAfter = (await peersOf(docker)).find(peer => peer.nodeId === desk.nodeId);
    // The Docker node's own answer for each address (the API the page words).
    const resolveErrors = await gqlErrors(docker.gql, 'query($id:String!,$u:[String!]!){resolvePeerAddress(nodeId:$id,baseUrls:$u)}',
      { id: desk.nodeId, u: [`http://127.0.0.1:${desk.port}`, 'http://no-such-node.invalid:8000', 'http://10.255.255.1:8000', `http://host.docker.internal:${other.port}`] });
    const extensions = resolveErrors?.[0]?.extensions ?? null;
    const attempts = Object.fromEntries((extensions?.attempts ?? []).map(entry => [entry.address, entry.result]));
    expect(dns.text === "no-such-node.invalid can't be found from here.", `dns: ${JSON.stringify(dns)}`);
    expect(blackHole.text === 'No answer within 20 seconds.' || blackHole.text === 'No answer from that address.', `black hole: ${JSON.stringify(blackHole)}`);
    expect(different.text === 'A different node answers there than the one registered.', `different: ${JSON.stringify(different)}`);
    for (const entry of [dns, blackHole, different]) expect(!/fetch failed/i.test(entry.text ?? ''), `no "fetch failed": ${entry.text}`);
    expect(peerAfter?.baseUrl === `http://host.docker.internal:${desk.port}`, `nothing wrong was saved: ${JSON.stringify(peerAfter)}`);
    expect(extensions?.code === 'PEER_UNREACHABLE' && extensions.loopbackInContainer === true && extensions.reason === 'refused'
      && attempts[`http://127.0.0.1:${desk.port}`] === 'refused' && attempts['http://no-such-node.invalid:8000'] === 'not_found'
      && ['timeout', 'unreachable'].includes(attempts['http://10.255.255.1:8000']) && attempts[`http://host.docker.internal:${other.port}`] === 'different_node',
      `resolvePeerAddress from inside the container: ${JSON.stringify(extensions)}`);
    return { dns, blackHole, different, peerAfter, resolveExtensions: extensions };
  });

  currentCase = null;
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
  await stopFrontend();
  if (containerStarted) {
    await run('docker', ['logs', containerName], { maxBuffer: 64 * 1024 * 1024 }).then(({ stdout, stderr }) => fs.writeFile(path.join(outputDir, 'docker-node.log'), `${stdout}${stderr}`)).catch(() => undefined);
    await run('docker', ['rm', '-f', '-v', containerName]).catch(() => undefined);
  }
  for (const child of [...children]) await stopChild(child);
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  const left = await run('docker', ['ps', '-a', '--filter', `name=${containerName}`, '--format', '{{.Names}}']).then(({ stdout }) => stdout.trim()).catch(() => 'unknown');
  evidence.cleanup = { frontendExited: !frontend || exited(frontend), serversLeft: children.size, rootRemoved: !existsSync(root), containerLeft: left || null };
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'nodes-docker-address-probe.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`nodes-docker-address probe: ${evidence.result}${evidence.error ? `\n${evidence.error}` : ''}`);
  process.exit(process.exitCode ?? 0);
}

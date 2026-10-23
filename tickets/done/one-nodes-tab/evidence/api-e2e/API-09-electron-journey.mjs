#!/usr/bin/env node
// API-09 (one-nodes-tab, ticket-owned temporary journey; not a repository probe). The real desktop app of this
// worktree's build, as an isolated instance (`pnpm isolated-app start --from-worktree --data-root <own dir>`), driven
// over its CDP control port, with a test-owned Docker node and two test-owned host servers.
//
// Before the start, the instance's desktop registry (`<dataRoot>/electron/user-data/node-registry.v1.json`) is
// written in the shape the current release writes: `capabilities` and `capabilityProbeState`, no `serverInstanceId`.
// The keys were learned read-only from a real registry; the values here are made up. The file has three entries:
// - the embedded node;
// - the Docker node as `http://localhost:<port>`, named by its URL (the user's 8001 case);
// - "old box", a node that is never reached.
// Cases:
// - EL-01 (REQ-711, AC-702): the release-shaped registry loads. Once the embedded server has the Docker node as peer
//   "docker", it is one row named "docker" with both roles. "old box" is its own row. `identify` over IPC writes each
//   reached entry's `serverInstanceId`, and the saved file no longer has the dropped fields.
// - EL-04 (AC-704): "docker doesn't know this node yet" → Register this node there → the Docker node registers the
//   embedded node at `host.docker.internal:<embedded port>`, and both directions show Working.
// - EL-02 (AC-703): adding a node with the switch off opens no window; Open opens it.
// - EL-03 (DEC-706): a peer-only row shows Open; its first Open adds a desktop entry with the node ID and opens the
//   window.
// - EL-05 (REQ-713): the window opened on the Docker node: "This node" is the Docker node, and the embedded node is a
//   row with Open and no Remove.
// - EL-06 (AC-707): in that window, Change address of the embedded node to `http://127.0.0.1:<embedded port>` shows
//   the Docker hint, and Use this saves `host.docker.internal:<port>`.
// - EL-07: restart. The registry file is unchanged by the restart and by opening Manage Nodes again; a second start
//   changes nothing.
// Usage: node API-09-electron-journey.mjs --repo=<worktree> --out=<fresh dir> [--docker-image=<image>]
import { createWriteStream, existsSync, mkdtempSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';

const run = promisify(execFile);
const arg = (name, fallback) => { const v = process.argv.find(item => item.startsWith(`--${name}=`)); return v ? v.slice(name.length + 3) : fallback; };
const repo = path.resolve(arg('repo', process.cwd()));
const outputDir = path.resolve(arg('out', 'API-09-out'));
const image = arg('docker-image', 'autobyteus/autobyteus-server:beta');
const { chromium } = createRequire(path.join(repo, 'autobyteus-web', 'package.json'))('playwright-core');
const serverDir = path.join(repo, 'autobyteus-server-ts');
const distDir = path.join(serverDir, 'dist');
const containerName = `one-nodes-api-el-${crypto.randomBytes(3).toString('hex')}`;
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', containerName, servers: {}, instance: null, registry: {}, cases: {}, pages: [], errors: [], cleanup: {}, error: null };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const waitFor = async (description, fn, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) { try { if (await fn()) return; } catch (error) { lastError = error; } await sleep(200); }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
let currentCase = null; let expectations = [];
const expect = (condition, message) => { if (!condition) expectations.push(message); };
const runCase = async (id, fn) => {
  currentCase = id; expectations = []; const t0 = Date.now(); console.log(`[journey] ${id} started`);
  const details = await fn();
  evidence.cases[id] = { result: expectations.length ? 'Fail' : 'Pass', ms: Date.now() - t0, failedExpectations: expectations, ...details };
  console.log(`[journey] ${id} ${evidence.cases[id].result}${expectations.length ? `: ${expectations.join(' | ')}` : ''}`);
};
const gqlOf = (name, baseUrl) => async (query, variables) => {
  const body = await (await fetch(`${baseUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json();
  if (body.errors?.length) throw new Error(`${name}: ${JSON.stringify(body.errors)}`);
  return body.data;
};
const isolated = async (...args) => {
  const { stdout } = await run('pnpm', ['--silent', '--dir', repo, 'isolated-app', ...args], { maxBuffer: 16 * 1024 * 1024, env: { ...process.env } }).catch(error => ({ stdout: error.stdout ?? String(error) }));
  const textOut = stdout.trim();
  return JSON.parse(textOut.slice(textOut.indexOf('{')));
};
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'one-nodes-el-')));
const children = new Set();
let containerStarted = false;
let instanceId = null;

const startHostServer = async (name, port) => {
  const dataDir = path.join(root, name, 'data'); const home = path.join(root, name, 'home');
  await fs.mkdir(dataDir, { recursive: true }); await fs.mkdir(home, { recursive: true });
  const baseUrl = `http://127.0.0.1:${port}`;
  await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\nHTTP_ACCESS_LOG_MODE=off\n`);
  const log = createWriteStream(path.join(outputDir, `server-${name}.log`));
  const child = spawn(process.execPath, [path.join(distDir, 'app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], { cwd: serverDir,
    stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', HTTP_ACCESS_LOG_MODE: 'off', AUTOBYTEUS_SERVER_HOST: baseUrl } });
  child.stdout.pipe(log); child.stderr.pipe(log); children.add(child);
  await waitFor(`${name} health`, () => fetch(`${baseUrl}/rest/health`).then(r => r.ok).catch(() => false), 120_000);
  const nodeId = (await (await fetch(`${baseUrl}/rest/remote-access/status`)).json()).serverInstanceId;
  evidence.servers[name] = { baseUrl, nodeId };
  return { name, port, baseUrl, nodeId, gql: gqlOf(name, baseUrl) };
};

let browser;
await fs.mkdir(outputDir, { recursive: true });
try {
  // ---- nodes
  const [dockerPort, deadPort, labPort, peerPort] = await Promise.all([freePort(), freePort(), freePort(), freePort()]);
  await run('docker', ['run', '-d', '--name', containerName, '-p', `127.0.0.1:${dockerPort}:8000`, '-v', `${distDir}:/app/autobyteus-server-ts/dist:ro`,
    '-e', `AUTOBYTEUS_SERVER_HOST=http://localhost:${dockerPort}`, image]);
  containerStarted = true;
  const [labbox, peeronly] = await Promise.all([startHostServer('labbox', labPort), startHostServer('peeronly', peerPort)]);
  const dockerUrl = `http://127.0.0.1:${dockerPort}`;
  await waitFor('docker health', () => fetch(`${dockerUrl}/rest/health`).then(r => r.ok).catch(() => false), 240_000);
  const docker = { name: 'docker', baseUrl: dockerUrl, nodeId: (await (await fetch(`${dockerUrl}/rest/remote-access/status`)).json()).serverInstanceId, gql: gqlOf('docker', dockerUrl) };
  evidence.servers.docker = { baseUrl: dockerUrl, nodeId: docker.nodeId };

  // ---- the release-shaped registry, then the instance
  const dataRoot = path.join(root, 'instance');
  const userData = path.join(dataRoot, 'electron', 'user-data');
  await fs.mkdir(userData, { recursive: true });
  const registryFile = path.join(userData, 'node-registry.v1.json');
  const release = (id, name, baseUrl, nodeType, createdAt) => ({ id, name, baseUrl, nodeType, capabilities: { terminal: true, fileExplorerStreaming: true },
    capabilityProbeState: 'ready', isSystem: nodeType === 'embedded', createdAt, updatedAt: createdAt });
  const seeded = { version: 12, nodes: [
    release('embedded-local', 'Embedded Node', 'http://127.0.0.1:29695', 'embedded', '2026-09-01T10:00:00.000Z'),
    release('remote-docker-entry', `http://localhost:${dockerPort}`, `http://localhost:${dockerPort}`, 'remote', '2026-09-02T10:00:00.000Z'),
    release('remote-oldbox-entry', 'old box', `http://127.0.0.1:${deadPort}`, 'remote', '2026-09-03T10:00:00.000Z'),
  ] };
  await fs.writeFile(registryFile, JSON.stringify(seeded, null, 2));
  evidence.registry.seeded = seeded;
  const readRegistry = async () => JSON.parse(await fs.readFile(registryFile, 'utf8'));
  const started = await isolated('start', '--from-worktree', '--data-root', dataRoot);
  assert(started.ok, `isolated start: ${JSON.stringify(started)}`);
  instanceId = started.result.instanceId;
  evidence.instance = started.result;
  const embedded = { baseUrl: started.result.backendUrl, gql: gqlOf('embedded', started.result.backendUrl) };
  const embeddedPort = started.result.serverPort;
  evidence.registry.afterStart = await readRegistry();

  // What earlier use left behind on the embedded server: the Docker node as peer "docker", and a peer only it knows.
  await embedded.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
  await docker.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
  await embedded.gql('mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { nodeId: docker.nodeId, name: 'docker', baseUrl: `http://localhost:${dockerPort}` } });
  await peeronly.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
  await embedded.gql('mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { nodeId: peeronly.nodeId, name: 'peeronly', baseUrl: peeronly.baseUrl } });
  await docker.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Docker Helper', role: 'assistant', description: 'on docker', instructions: 'Help.', toolNames: [] } });

  // ---- control
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${started.result.controlPort}`);
  const context = browser.contexts()[0];
  const pages = () => context.pages().filter(page => page.url().includes('/renderer/index.html'));
  const main = pages()[0];
  assert(main, `the instance window: ${context.pages().map(page => page.url())}`);
  for (const page of [main]) page.on('pageerror', error => evidence.errors.push(`main pageerror: ${error.message}`));
  const helpers = page => {
    const clean = value => value.trim().replace(/\s+/g, ' ');
    const text = async locator => (await locator.count()) ? clean(await locator.first().innerText()) : null;
    const line = async key => {
      const element = page.locator(`[data-testid="node-line-${key}"]`);
      if (!(await element.count())) return null;
      const p = element.locator('p');
      const value = (await p.count()) ? await text(p) : await text(element);
      return value?.replace(/^([ⓘ⚠✗])\s*/u, '$1 ') ?? null;
    };
    return {
      page, text, line,
      row: key => page.locator(`[data-testid="node-row-${key}"]`),
      dialog: () => page.locator('[role="dialog"][data-testid^="node-change-dialog-"]'),
      settled: async key => (await page.locator(`[data-testid="node-row-${key}"]`).count()) === 1 && !/^Checking /.test((await line(key)) ?? ''),
      openTab: async () => {
        // A window that has just opened may still be starting its app, which sets its own route: ask again until the
        // Nodes page shows; on failure keep what the window shows.
        const deadline = Date.now() + 120_000;
        for (;;) {
          await page.evaluate(() => { window.location.hash = '#/nodes?nodeTab=memorySync'; }).catch(() => undefined);
          const shown = await page.locator('[data-testid="node-manager-panel-memorySync"]').waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false);
          if (shown) break;
          if (Date.now() > deadline) {
            await page.screenshot({ path: path.join(outputDir, `openTab-failed-${Date.now()}.png`) }).catch(() => undefined);
            evidence.openTabFailure = { url: page.url(), body: (await page.locator('body').innerText().catch(() => '')).slice(0, 2000) };
            throw new Error(`the Nodes page did not show in ${page.url()}`);
          }
        }
        await page.locator('[data-testid="node-manager-tab-manage"]').click();
        await page.locator('[data-testid="node-list"], [data-testid="node-list-card"]').first().waitFor({ state: 'visible', timeout: 60_000 });
      },
      openDetails: async key => {
        if (await page.locator(`[data-testid="node-directions-${key}"]`).count()) return;
        await page.locator(`[data-testid="node-offer-${key}-toggle"]`).click();
        await page.locator(`[data-testid="node-directions-${key}"]`).waitFor({ state: 'visible' });
      },
      directions: async key => ({ out: await text(page.locator(`[data-testid="node-direction-out-${key}"]`)), in: await text(page.locator(`[data-testid="node-direction-in-${key}"]`)) }),
      shot: name => page.screenshot({ path: path.join(outputDir, `${name}.png`) }),
    };
  };
  const m = helpers(main);
  const waitNewWindow = async (before, action) => {
    const known = new Set(before);
    await action();
    let found = null;
    await waitFor('a new window', async () => { found = pages().find(page => !known.has(page)); return Boolean(found); }, 20_000);
    await found.waitForLoadState('domcontentloaded');
    return found;
  };

  await runCase('EL-01', async () => {
    await m.openTab();
    await waitFor('docker joined', async () => (await m.row(docker.nodeId).count()) === 1 && (await m.row('d:remote-docker-entry').count()) === 0, 30_000);
    await waitFor('docker settled', () => m.settled(docker.nodeId), 30_000);
    await waitFor('old box settled', () => m.settled('d:remote-oldbox-entry'), 30_000);
    await waitFor('identify saved', async () => (await readRegistry()).nodes.find(node => node.id === 'remote-docker-entry')?.serverInstanceId === docker.nodeId, 15_000);
    const saved = await readRegistry();
    const rows = await main.locator('[data-testid^="node-row-"]').evaluateAll(items => items.map(item => item.getAttribute('data-testid').slice('node-row-'.length)));
    const dockerRow = { name: await m.text(main.locator(`[data-testid="node-name-${docker.nodeId}"]`)), url: await m.text(main.locator(`[data-testid="node-url-${docker.nodeId}"]`)),
      switch: await main.locator(`[data-testid="node-agents-switch-${docker.nodeId}"]`).getAttribute('aria-checked'), open: await main.locator(`[data-testid="node-open-${docker.nodeId}"]`).count(),
      line: await m.line(docker.nodeId), fix: await m.text(main.locator(`[data-testid="node-fix-${docker.nodeId}"]`)) };
    const oldBox = { line: await m.line('d:remote-oldbox-entry') };
    await m.shot('EL-01-main-window-manage-nodes');
    evidence.registry.afterOpen = saved;
    const entry = id => saved.nodes.find(node => node.id === id);
    expect(rows.filter(key => key === docker.nodeId).length === 1 && rows.includes('d:remote-oldbox-entry') && rows.includes(peeronly.nodeId), `rows: ${rows}`);
    expect(dockerRow.name === 'docker' && dockerRow.url === `localhost:${dockerPort}` && dockerRow.switch === 'true' && dockerRow.open === 1, `docker's row: ${JSON.stringify(dockerRow)}`);
    expect(dockerRow.line === "⚠ docker doesn't know this node yet." && dockerRow.fix === 'Register this node there', `docker's line: ${JSON.stringify(dockerRow)}`);
    expect(entry('remote-docker-entry')?.serverInstanceId === docker.nodeId && entry('remote-docker-entry')?.name === `http://localhost:${dockerPort}`, `docker entry: ${JSON.stringify(entry('remote-docker-entry'))}`);
    expect(typeof entry('embedded-local')?.serverInstanceId === 'string' && !('serverInstanceId' in (entry('remote-oldbox-entry') ?? {})), 'embedded identified; old box not');
    expect(saved.nodes.every(node => !('capabilities' in node) && !('capabilityProbeState' in node)), `dropped fields gone after the save: ${JSON.stringify(saved.nodes.map(node => Object.keys(node)))}`);
    expect(saved.nodes.length === 3 && saved.nodes.map(node => node.name).join('|') === seeded.nodes.map(node => node.name).join('|'), 'no entry added, removed or renamed');
    expect(oldBox.line === 'ⓘ Not reachable. Nothing answers at that address and port.', `old box: ${JSON.stringify(oldBox)}`);
    return { rows, dockerRow, oldBox, afterStartKeys: evidence.registry.afterStart.nodes.map(node => Object.keys(node)), savedKeys: saved.nodes.map(node => Object.keys(node)) };
  });

  await runCase('EL-04', async () => {
    await main.locator(`[data-testid="node-fix-${docker.nodeId}"]`).click();
    await m.dialog().waitFor({ state: 'visible', timeout: 20_000 });
    await waitFor('the address found', async () => !((await m.text(m.dialog())) ?? '').includes('Finding the address'), 30_000);
    const confirmText = await m.text(m.dialog());
    await m.shot('EL-04-finish-connecting-docker');
    await main.locator('[data-testid="node-change-confirm"]').click();
    await waitFor('dialog closed', async () => (await m.dialog().count()) === 0, 45_000);
    await waitFor('docker working', async () => await m.settled(docker.nodeId) && (await m.line(docker.nodeId)) === null, 30_000);
    await m.openDetails(docker.nodeId);
    await waitFor('both directions', async () => (await m.directions(docker.nodeId)).in?.includes('Working'), 30_000);
    const directions = await m.directions(docker.nodeId);
    const onDocker = (await docker.gql('{ peerNodes { nodeId name baseUrl } }')).peerNodes;
    const embeddedId = (await readRegistry()).nodes.find(node => node.id === 'embedded-local').serverInstanceId;
    await m.shot('EL-04-docker-working');
    expect(confirmText?.startsWith('Finish connecting docker?') && confirmText.includes(`docker reaches this node at http://host.docker.internal:${embeddedPort}.`), `confirmation: ${confirmText}`);
    assert(onDocker.length === 1 && onDocker[0].nodeId === embeddedId && onDocker[0].baseUrl === `http://host.docker.internal:${embeddedPort}` && onDocker[0].name === 'Embedded Node',
      `the embedded node on docker: ${JSON.stringify(onDocker)}`);
    expect(directions.in?.startsWith(`docker → this node ✓ Working via http://host.docker.internal:${embeddedPort}`) && directions.out?.includes('✓ Working'), `directions: ${JSON.stringify(directions)}`);
    return { confirmText, onDocker, directions };
  });

  await runCase('EL-02', async () => {
    const before = pages();
    await main.locator('[data-testid="add-node-address"]').fill(labbox.baseUrl);
    await main.locator('[data-testid="add-node-name"]').fill('labbox');
    const toggle = main.locator('[data-testid="add-node-collaborate"]');
    if ((await toggle.getAttribute('aria-checked')) !== 'false') await toggle.click();
    await main.locator('[data-testid="add-node-submit"]').click();
    await waitFor('labbox listed', async () => (await m.row(labbox.nodeId).count()) === 1, 15_000);
    await sleep(4_000);
    const afterAdd = { windows: pages().length, dialog: await m.dialog().count(), entry: (await readRegistry()).nodes.find(node => node.name === 'labbox') };
    expect(afterAdd.windows === before.length && afterAdd.dialog === 0, `adding opens no window: ${JSON.stringify({ before: before.length, afterAdd })}`);
    expect(afterAdd.entry?.serverInstanceId === labbox.nodeId && afterAdd.entry.baseUrl === labbox.baseUrl, `labbox entry: ${JSON.stringify(afterAdd.entry)}`);
    const opened = await waitNewWindow(before, () => main.locator(`[data-testid="node-open-${labbox.nodeId}"]`).click());
    evidence.pages.push({ case: 'EL-02', url: opened.url() });
    await opened.locator('body').waitFor({ state: 'visible' });
    return { before: before.length, afterAdd, afterOpen: pages().length, openedUrl: opened.url() };
  });

  await runCase('EL-03', async () => {
    await waitFor('peeronly settled with Open', async () => await m.settled(peeronly.nodeId) && (await main.locator(`[data-testid="node-open-${peeronly.nodeId}"]`).count()) === 1, 30_000);
    const entriesBefore = (await readRegistry()).nodes.length;
    const before = pages();
    const opened = await waitNewWindow(before, () => main.locator(`[data-testid="node-open-${peeronly.nodeId}"]`).click());
    evidence.pages.push({ case: 'EL-03', url: opened.url() });
    const entry = (await readRegistry()).nodes.find(node => node.serverInstanceId === peeronly.nodeId);
    await waitFor('peeronly row joined', async () => (await m.row(peeronly.nodeId).count()) === 1, 10_000);
    expect(entry?.name === 'peeronly' && entry.baseUrl === peeronly.baseUrl && entry.nodeType === 'remote', `the first Open added the desktop entry: ${JSON.stringify(entry)}`);
    expect((await readRegistry()).nodes.length === entriesBefore + 1, 'one entry added');
    return { entry, openedUrl: opened.url(), windows: pages().length };
  });

  let dockerWindow;
  await runCase('EL-05', async () => {
    const before = pages();
    dockerWindow = await waitNewWindow(before, () => main.locator(`[data-testid="node-open-${docker.nodeId}"]`).click());
    evidence.pages.push({ case: 'EL-05', url: dockerWindow.url() });
    dockerWindow.on('pageerror', error => evidence.errors.push(`docker window pageerror: ${error.message}`));
    const d = helpers(dockerWindow);
    await d.openTab();
    const embeddedId = (await readRegistry()).nodes.find(node => node.id === 'embedded-local').serverInstanceId;
    await waitFor('embedded row settled', () => d.settled(embeddedId), 30_000);
    const thisNode = { url: await d.text(dockerWindow.locator('[data-testid="this-node-url"]')), name: await d.text(dockerWindow.locator('[data-testid="this-node-name"]')),
      switch: await d.text(dockerWindow.locator('[data-testid="this-node-switch-status"]')) };
    const embeddedRow = { name: await d.text(dockerWindow.locator(`[data-testid="node-name-${embeddedId}"]`)), open: await dockerWindow.locator(`[data-testid="node-open-${embeddedId}"]`).count(),
      remove: await dockerWindow.locator(`[data-testid="node-remove-${embeddedId}"]`).count(), line: await d.line(embeddedId),
      nameIsButton: await dockerWindow.locator(`button[data-testid="node-name-${embeddedId}"]`).count() };
    const rows = await dockerWindow.locator('[data-testid^="node-row-"]').evaluateAll(items => items.map(item => item.getAttribute('data-testid').slice('node-row-'.length)));
    await d.shot('EL-05-docker-window-manage-nodes');
    expect(thisNode.url === `http://localhost:${dockerPort}` && thisNode.switch === 'On', `this node is the Docker node: ${JSON.stringify(thisNode)}`);
    expect(embeddedRow.open === 1 && embeddedRow.remove === 0 && embeddedRow.nameIsButton === 0 && embeddedRow.line === null, `the embedded node's row: ${JSON.stringify(embeddedRow)}`);
    expect(!rows.includes(docker.nodeId), `the Docker node is not a row of its own window: ${rows}`);
    return { thisNode, embeddedRow, rows, url: dockerWindow.url() };
  });

  await runCase('EL-06', async () => {
    const d = helpers(dockerWindow);
    const embeddedId = (await readRegistry()).nodes.find(node => node.id === 'embedded-local').serverInstanceId;
    await d.openDetails(embeddedId);
    await dockerWindow.locator(`[data-testid="node-change-address-${embeddedId}"]`).click();
    await dockerWindow.locator(`[data-testid="node-address-input-${embeddedId}"]`).fill(`http://127.0.0.1:${embeddedPort}`);
    await dockerWindow.locator(`[data-testid="node-address-save-${embeddedId}"]`).click();
    const hint = dockerWindow.locator(`[data-testid="node-address-hint-${embeddedId}"]`);
    await hint.waitFor({ state: 'visible', timeout: 30_000 });
    const hintText = await d.text(hint);
    await d.shot('EL-06-docker-window-loopback-hint');
    await dockerWindow.locator(`[data-testid="node-address-hint-${embeddedId}-use"]`).click();
    await waitFor('editor closed', async () => (await dockerWindow.locator(`[data-testid="node-address-editor-${embeddedId}"]`).count()) === 0, 30_000);
    const onDocker = (await docker.gql('{ peerNodes { nodeId baseUrl } }')).peerNodes.find(peer => peer.nodeId === embeddedId);
    expect(hintText?.includes(`can't reach http://127.0.0.1:${embeddedPort}.`) && hintText.includes('runs in Docker, where 127.0.0.1 is the container itself.')
      && hintText.includes(`Try http://host.docker.internal:${embeddedPort}`), `hint: ${hintText}`);
    assert(onDocker?.baseUrl === `http://host.docker.internal:${embeddedPort}`, `saved: ${JSON.stringify(onDocker)}`);
    return { hintText, onDocker };
  });

  await runCase('EL-07', async () => {
    // The same content, whatever the key order (the startup save writes each entry's keys in one order).
    const canonical = value => JSON.stringify(value, (key, item) => item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.keys(item).sort().map(name => [name, item[name]])) : item);
    const restartAndOpen = async label => {
      await browser?.close().catch(() => undefined);
      browser = null;
      const restarted = await isolated('restart', instanceId);
      assert(restarted.ok, `restart (${label}): ${JSON.stringify(restarted)}`);
      const afterRestart = await fs.readFile(registryFile, 'utf8');
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${started.result.controlPort}`);
      const ctx = browser.contexts()[0];
      await waitFor('the window after restart', async () => ctx.pages().some(page => page.url().includes('/renderer/index.html')), 60_000);
      const page = ctx.pages().find(p => p.url().includes('/renderer/index.html'));
      const h = helpers(page);
      await h.openTab();
      await waitFor('docker settled after restart', async () => await h.settled(docker.nodeId), 30_000);
      await sleep(3_000);
      const afterOpen = await fs.readFile(registryFile, 'utf8');
      await h.shot(`EL-07-after-${label}`);
      return { afterRestart, afterOpen, windows: ctx.pages().filter(p => p.url().includes('/renderer/index.html')).length };
    };
    const before = await fs.readFile(registryFile, 'utf8');
    const first = await restartAndOpen('restart-1');
    const second = await restartAndOpen('restart-2');
    await fs.writeFile(path.join(outputDir, 'EL-07-registry-before-restart.json'), before);
    await fs.writeFile(path.join(outputDir, 'EL-07-registry-after-restart-1.json'), first.afterRestart);
    await fs.writeFile(path.join(outputDir, 'EL-07-registry-after-restart-2-and-open.json'), second.afterOpen);
    const result = {
      sameContentAfterRestart1: canonical(JSON.parse(first.afterRestart)) === canonical(JSON.parse(before)),
      sameContentAfterOpen1: canonical(JSON.parse(first.afterOpen)) === canonical(JSON.parse(before)),
      byteIdenticalRestart1ToRestart2: second.afterRestart === first.afterOpen,
      byteIdenticalAfterOpen2: second.afterOpen === second.afterRestart,
      textChangedByRestart1: first.afterRestart !== before,
      windowsAfterRestart: second.windows,
    };
    expect(result.sameContentAfterRestart1 && result.sameContentAfterOpen1, `content changed: ${JSON.stringify(result)}`);
    expect(result.byteIdenticalRestart1ToRestart2 && result.byteIdenticalAfterOpen2, `a second start changed the file: ${JSON.stringify(result)}`);
    return result;
  });

  currentCase = null;
  evidence.registry.final = await readRegistry();
  evidence.result = Object.values(evidence.cases).every(entry => entry.result === 'Pass') && evidence.errors.length === 0 ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = error instanceof Error ? error.stack ?? error.message : String(error);
  if (currentCase) evidence.cases[currentCase] = { result: 'Fail', error: evidence.error, failedExpectations: expectations };
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (instanceId) {
    evidence.cleanup.stop = await isolated('stop', instanceId).catch(error => ({ ok: false, error: String(error) }));
    const logPath = evidence.instance?.logPath;
    if (logPath && existsSync(logPath)) await fs.copyFile(logPath, path.join(outputDir, 'instance.log')).catch(() => undefined);
  }
  if (containerStarted) {
    await run('docker', ['logs', containerName], { maxBuffer: 64 * 1024 * 1024 }).then(({ stdout, stderr }) => fs.writeFile(path.join(outputDir, 'docker-node.log'), `${stdout}${stderr}`)).catch(() => undefined);
    await run('docker', ['rm', '-f', '-v', containerName]).catch(() => undefined);
  }
  for (const child of children) { child.kill('SIGTERM'); }
  await sleep(2_000);
  for (const child of children) { if (child.exitCode === null) child.kill('SIGKILL'); }
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  evidence.cleanup.rootRemoved = !existsSync(root);
  evidence.cleanup.containerLeft = await run('docker', ['ps', '-a', '--filter', `name=${containerName}`, '--format', '{{.Names}}']).then(({ stdout }) => stdout.trim() || null).catch(() => 'unknown');
  evidence.cleanup.mineStillListed = await isolated('list').then(answer => (answer.result?.instances ?? []).filter(item => item.instanceId === instanceId)).catch(() => 'unknown');
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'API-09-electron-journey.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`API-09 electron journey: ${evidence.result}${evidence.error ? `\n${evidence.error}` : ''}`);
  process.exit(evidence.result === 'Pass' ? 0 : 1);
}

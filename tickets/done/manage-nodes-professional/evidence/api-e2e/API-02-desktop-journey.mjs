#!/usr/bin/env node
// API-02 (manage-nodes-professional, autobyteus-363; ticket-owned temporary journey, not a repository probe).
//
// The real desktop app of this worktree's build, as an isolated instance (`pnpm isolated-app start --from-worktree
// --data-root <own dir>`), driven over its CDP control port. The remote nodes are real servers of this worktree's
// `dist` on 127.0.0.1, each with its own data root and HOME.
//
// The server's in-place update (305) is a relay to the node's starter (C2, frozen), which only a Docker node runs.
// For the nodes that need one, the journey runs a test-owned starter on a Unix socket and gives the server its path
// in AUTOBYTEUS_STARTER_SOCKET, as the Docker starter does. The starter answers C2 `GET /status` and
// `POST /updates` from a script, so that each update state the page shows can be reached. For "Restarting…", the
// journey stops and restarts that server, as the real starter does. Only the starter is emulated. The server's C1
// relay, the window's store and the page are the real code. This ticket changes none of them except the page.
//
// Nodes:
// - plain: no starter, so "Server version unknown"; collaborating both ways and sharing one Agent.
// - upd: version 1.5.10, updated to the app's version through every step, then "Updated to …".
// - refuse: the starter refuses with NEEDS_NEW_IMAGE, so the notice offers Copy command.
// - fail: the update fails while downloading.
// - running: an update is already running when the page opens.
// - blocked: an update blocker.
// - newer: version 1.6.0, newer than this app.
// - lost: stops answering during its update, so "Not reachable. Last known: …" shows after the 5-minute grace.
// - ghost: never reachable.
//
// Usage: node API-02-desktop-journey.mjs --repo=<worktree> --out=<fresh dir>
import { createWriteStream, existsSync, mkdtempSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';

const run = promisify(execFile);
const arg = (name, fallback) => { const v = process.argv.find(item => item.startsWith(`--${name}=`)); return v ? v.slice(name.length + 3) : fallback; };
const repo = path.resolve(arg('repo', process.cwd()));
const outputDir = path.resolve(arg('out', 'API-02-out'));
const { chromium } = createRequire(path.join(repo, 'autobyteus-web', 'package.json'))('playwright-core');
const serverDir = path.join(repo, 'autobyteus-server-ts');
const distDir = path.join(serverDir, 'dist');
const APP_VERSION = JSON.parse(await fs.readFile(path.join(repo, 'autobyteus-web', 'package.json'), 'utf8')).version;
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', appVersion: APP_VERSION, servers: {}, starterLog: [], instance: null, cases: {}, errors: [], cleanup: {}, error: null };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const waitFor = async (description, fn, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs; let lastError;
  while (Date.now() < deadline) { try { const v = await fn(); if (v) return v; } catch (error) { lastError = error; } await sleep(250); }
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
  const { stdout } = await run('pnpm', ['--silent', '--dir', repo, 'isolated-app', ...args], { maxBuffer: 16 * 1024 * 1024 }).catch(error => ({ stdout: error.stdout ?? String(error) }));
  const text = stdout.trim(); return JSON.parse(text.slice(text.indexOf('{')));
};
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'mnp-api-')));
const servers = {};
const starters = {};

// ---- the test-owned starter (C2 over a Unix socket), scripted per node
const IDLE = { state: 'idle', targetVersion: null, step: null, code: null, message: null };
const makeStarter = async (name, script) => {
  const socketPath = path.join(root, `${name}.sock`);
  const starter = { name, socketPath, version: script.version, update: { ...IDLE }, blocker: script.blocker ?? null, onUpdate: script.onUpdate ?? null, requests: [] };
  const relation = target => {
    const parse = v => { const m = /^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/.exec(v); return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? Infinity : Number(m[4])] : null; };
    const a = parse(target), b = parse(starter.version);
    for (let i = 0; i < 4; i += 1) { if (a[i] !== b[i]) return a[i] > b[i] ? 'newer' : 'older'; }
    return 'same';
  };
  const server = http.createServer((request, response) => {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      const url = new URL(request.url, 'http://starter');
      const send = (code, value) => { response.writeHead(code, { 'content-type': 'application/json' }); response.end(JSON.stringify(value)); };
      starter.requests.push({ at: Date.now(), method: request.method, path: url.pathname + url.search });
      if (request.method === 'GET' && url.pathname === '/status') {
        const target = url.searchParams.get('target');
        const result = { version: starter.version, state: 'running', update: { ...starter.update } };
        if (target) result.target = { version: target, relation: relation(target) };
        if (starter.blocker) result.updateBlocker = starter.blocker;
        return send(200, result);
      }
      if (request.method === 'POST' && url.pathname === '/updates') {
        const { version } = JSON.parse(body || '{}');
        evidence.starterLog.push({ at: new Date().toISOString(), node: name, request: 'POST /updates', version });
        if (script.refuse) return send(409, { refused: script.refuse.code, message: script.refuse.message });
        starter.update = { ...IDLE, state: 'running', targetVersion: version, step: 'checking' };
        void starter.onUpdate?.(starter, version);
        return send(202, { accepted: true, version });
      }
      send(404, { message: 'not found' });
    });
  });
  await new Promise(resolve => server.listen(socketPath, resolve));
  starter.server = server;
  starters[name] = starter;
  return starter;
};

const startServer = async (name, port, starter) => {
  const dataDir = path.join(root, name, 'data'); const home = path.join(root, name, 'home');
  await fs.mkdir(dataDir, { recursive: true }); await fs.mkdir(home, { recursive: true });
  const baseUrl = `http://127.0.0.1:${port}`;
  await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\nHTTP_ACCESS_LOG_MODE=off\n`);
  const log = createWriteStream(path.join(outputDir, `server-${name}.log`), { flags: 'a' });
  const env = { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', HTTP_ACCESS_LOG_MODE: 'off', AUTOBYTEUS_SERVER_HOST: baseUrl,
    ...(starter ? { AUTOBYTEUS_STARTER_SOCKET: starter.socketPath } : {}) };
  const child = spawn(process.execPath, [path.join(distDir, 'app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], { cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'], env });
  child.stdout.pipe(log); child.stderr.pipe(log);
  await waitFor(`${name} health`, () => fetch(`${baseUrl}/rest/health`).then(r => r.ok).catch(() => false), 120_000);
  const nodeId = (await (await fetch(`${baseUrl}/rest/remote-access/status`)).json()).nodeId;
  servers[name] = { name, port, baseUrl, nodeId, child, starter, gql: gqlOf(name, baseUrl) };
  evidence.servers[name] = { baseUrl, nodeId, starter: Boolean(starter) };
  return servers[name];
};
const stopServer = async name => {
  const { child } = servers[name];
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(10_000)]);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
};

let browser; let instanceId = null;
await fs.mkdir(outputDir, { recursive: true });
try {
  // ---- nodes
  const ports = Object.fromEntries(await Promise.all(['plain', 'upd', 'refuse', 'fail', 'running', 'blocked', 'newer', 'lost', 'ghost'].map(async n => [n, await freePort()])));
  // upd: every step, then the harness restarts the server as the starter would, with the new version.
  await makeStarter('upd', { version: '1.5.10', onUpdate: async (starter, version) => {
    for (const step of ['checking', 'downloading', 'preparing']) { starter.update.step = step; evidence.starterLog.push({ at: new Date().toISOString(), node: 'upd', step }); await sleep(5_000); }
    starter.update.step = 'restarting';
    evidence.starterLog.push({ at: new Date().toISOString(), node: 'upd', step: 'restarting (server stopped)' });
    await stopServer('upd'); await sleep(8_000);
    starter.version = version; starter.update = { ...starter.update, state: 'succeeded', step: null };
    await startServer('upd', ports.upd, starter);
    evidence.starterLog.push({ at: new Date().toISOString(), node: 'upd', step: 'restarted with the new version; succeeded' });
  } });
  await makeStarter('refuse', { version: '1.5.10', refuse: { code: 'NEEDS_NEW_IMAGE', message: 'This node runs an image that is too old for this update. Upgrade the image first.' } });
  await makeStarter('fail', { version: '1.5.10', onUpdate: async starter => {
    starter.update.step = 'downloading'; await sleep(6_000);
    starter.update = { ...starter.update, state: 'failed', step: null, code: 'DOWNLOAD_FAILED', message: 'The download of the server package was interrupted.' };
    evidence.starterLog.push({ at: new Date().toISOString(), node: 'fail', step: 'failed' });
  } });
  const runningStarter = await makeStarter('running', { version: '1.5.10' });
  runningStarter.update = { ...IDLE, state: 'running', targetVersion: APP_VERSION, step: 'downloading' };
  await makeStarter('blocked', { version: '1.5.10', blocker: { code: 'NO_PACKAGES_VOLUME', message: 'This node has no volume for server packages, so it cannot update in place.' } });
  await makeStarter('newer', { version: '1.6.0' });
  await makeStarter('lost', { version: '1.5.10', onUpdate: async starter => {
    starter.update.step = 'downloading'; await sleep(4_000);
    evidence.starterLog.push({ at: new Date().toISOString(), node: 'lost', step: 'server stopped for good' });
    await stopServer('lost');
  } });
  for (const name of ['plain', 'upd', 'refuse', 'fail', 'running', 'blocked', 'newer', 'lost']) await startServer(name, ports[name], starters[name]);
  await servers.plain.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Plain Helper', role: 'assistant', description: 'Helps on plain.', instructions: 'Help.', toolNames: [] } });

  // ---- the instance, with these nodes in its desktop list
  const dataRoot = path.join(root, 'instance');
  const userData = path.join(dataRoot, 'electron', 'user-data');
  await fs.mkdir(userData, { recursive: true });
  const at = '2026-10-01T10:00:00.000Z';
  const entry = (name, baseUrl) => ({ id: `remote-${name}`, name, baseUrl, nodeType: 'remote', isSystem: false, createdAt: at, updatedAt: at });
  const nodes = [{ id: 'embedded-local', name: 'Embedded Node', baseUrl: 'http://127.0.0.1:29695', nodeType: 'embedded', isSystem: true, createdAt: at, updatedAt: at },
    ...['plain', 'upd', 'refuse', 'fail', 'running', 'blocked', 'newer', 'lost'].map(name => entry(name, servers[name].baseUrl)), entry('ghost', `http://127.0.0.1:${ports.ghost}`)];
  await fs.writeFile(path.join(userData, 'node-registry.v1.json'), JSON.stringify({ version: 3, nodes }, null, 2));
  const started = await isolated('start', '--from-worktree', '--data-root', dataRoot);
  assert(started.ok, `isolated start: ${JSON.stringify(started)}`);
  instanceId = started.result.instanceId; evidence.instance = started.result;
  const embedded = { baseUrl: started.result.backendUrl, gql: gqlOf('embedded', started.result.backendUrl) };
  // plain collaborates both ways (through the servers' settings API, as earlier use leaves it).
  await embedded.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
  await servers.plain.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
  const embeddedId = (await (await fetch(`${embedded.baseUrl}/rest/remote-access/status`)).json()).nodeId;
  await embedded.gql('mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { nodeId: servers.plain.nodeId, name: 'plain', baseUrl: servers.plain.baseUrl } });
  await servers.plain.gql('mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { nodeId: embeddedId, name: 'Embedded Node', baseUrl: embedded.baseUrl } });

  browser = await chromium.connectOverCDP(`http://127.0.0.1:${started.result.controlPort}`);
  const context = browser.contexts()[0];
  const windows = () => context.pages().filter(p => p.url().includes('/renderer/index.html'));
  const page = windows()[0];
  page.on('pageerror', error => evidence.errors.push(`pageerror: ${error.message}`));
  const consoleErrors = [];
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') consoleErrors.push({ at: Date.now(), type: message.type(), text: message.text().slice(0, 300) }); });
  evidence.consoleErrors = consoleErrors;
  await page.setViewportSize({ width: 1440, height: 900 });
  const clean = v => v.trim().replace(/\s+/g, ' ');
  const text = async locator => (await locator.count()) ? clean(await locator.first().innerText()) : null;
  const key = name => servers[name]?.nodeId ?? null;
  const cellOf = name => text(page.locator(`[data-testid="node-server-${key(name)}"]`));
  const noticeOf = name => text(page.locator(`[data-testid="node-server-notice-${key(name)}"]`));
  const shot = (name, fullPage = false) => page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage });
  const openTab = async () => {
    const deadline = Date.now() + 120_000;
    for (;;) {
      await page.evaluate(() => { window.location.hash = '#/nodes?nodeTab=memorySync'; }).catch(() => undefined);
      if (await page.locator('[data-testid="node-manager-panel-memorySync"]').waitFor({ state: 'visible', timeout: 8_000 }).then(() => true, () => false)) break;
      if (Date.now() > deadline) throw new Error('the Nodes page did not show');
    }
    await page.locator('[data-testid="node-manager-tab-manage"]').click();
    await page.locator('[data-testid="add-node-panel"]').waitFor({ state: 'visible', timeout: 60_000 });
  };
  const settledAll = async () => {
    const lines = await page.locator('[data-testid^="node-line-"]').allInnerTexts();
    return !lines.some(l => /^Checking /.test(l.trim()));
  };
  const boxes = async selectorPrefix => page.locator(`[data-testid^="${selectorPrefix}"]`).evaluateAll(items => items.map(item => {
    const r = item.getBoundingClientRect(); return { id: item.getAttribute('data-testid'), x: Math.round(r.left), w: Math.round(r.width), visible: r.width > 0 };
  }));
  const setLanguage = async mode => {
    await page.evaluate(m => localStorage.setItem('autobyteus.localization.preference-mode', m), mode);
    await page.reload(); await openTab();
  };

  await runCase('EL-01', async () => {
    await setLanguage('en');
    await waitFor('rows settled', async () => (await page.locator(`[data-testid="node-row-${key('plain')}"]`).count()) === 1 && await settledAll(), 60_000);
    await waitFor('server cells answered', async () => (await cellOf('upd'))?.includes('1.5.10') && (await cellOf('newer'))?.includes('1.6.0') && (await cellOf('plain')) !== null, 30_000);
    await sleep(1_500);
    const opens = await boxes('node-open-'); const removes = await boxes('node-remove-'); const switches = await boxes('node-agents-switch-');
    const rowsCount = await page.locator('[data-testid^="node-row-"]').count();
    await shot('EL-01-desktop-1440-default'); await shot('EL-01-desktop-1440-default-full', true);
    const xs = list => [...new Set(list.filter(b => b.visible).map(b => b.x))];
    expect(opens.length === rowsCount && rowsCount === 9, `an Open icon on every desktop row: ${opens.length} of ${rowsCount}`);
    expect(xs(opens).length === 1 && xs(removes).length === 1 && xs(switches).length === 1, `Open, trash and switch each in one column: ${JSON.stringify({ open: xs(opens), remove: xs(removes), switch: xs(switches) })}`);
    return { rowsCount, openXs: xs(opens), removeXs: xs(removes), switchXs: xs(switches) };
  });

  await runCase('EL-02', async () => {
    const cells = Object.fromEntries(await Promise.all(['plain', 'upd', 'refuse', 'fail', 'running', 'blocked', 'newer', 'lost'].map(async n => [n, { cell: await cellOf(n), notice: await noticeOf(n) }])));
    const ghostLine = await text(page.locator('[data-testid="node-line-d:remote-ghost"]'));
    await shot('EL-02-update-states-at-open', true);
    expect(cells.plain.cell === 'Server version unknown', `plain: ${JSON.stringify(cells.plain)}`);
    expect(cells.upd.cell?.startsWith('Server 1.5.10') && cells.upd.cell.includes(`Update to ${APP_VERSION}`), `upd offers the update: ${JSON.stringify(cells.upd)}`);
    expect(cells.newer.cell?.includes('Newer than this app. Update this app.') && !cells.newer.cell.includes('Update to'), `newer: ${JSON.stringify(cells.newer)}`);
    expect(cells.blocked.cell?.startsWith('Server 1.5.10') && !cells.blocked.cell.includes('Update to') && cells.blocked.notice?.includes('no volume for server packages'), `blocked: ${JSON.stringify(cells.blocked)}`);
    expect(cells.running.cell?.includes(APP_VERSION) && (await page.locator(`[data-testid="node-server-progress-${key('running')}"]`).count()) === 1, `running at open resumes in the cell: ${JSON.stringify(cells.running)}`);
    expect(ghostLine?.includes('Not reachable.'), `ghost: ${ghostLine}`);
    // The running node's starter finishes, so the page settles later.
    starters.running.update = { ...starters.running.update, state: 'failed', step: null, code: 'INTERRUPTED', message: 'Stopped by the test.' };
    return { cells, ghostLine };
  });

  // EL-08 reloads the page (language), so it runs before any update this window must keep following.
  await runCase('EL-08', async () => {
    const results = {};
    for (const lang of ['en', 'zh-CN']) {
      await page.setViewportSize({ width: 390, height: 844 });
      await setLanguage(lang);
      await waitFor('rows settled', async () => await settledAll(), 60_000);
      await sleep(2_000);
      const overflow = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
        clipped: [...document.querySelectorAll('[data-testid="node-list-card"] *')].filter(el => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'hidden' && el.textContent.trim()).map(el => el.getAttribute('data-testid') || el.tagName).slice(0, 10) }));
      const fix = await page.locator('[data-testid="node-fix-d:remote-ghost"]').evaluate(btn => {
        const p = btn.closest('[data-testid^="node-line-"]').querySelector('p'); const a = p.getBoundingClientRect(), b = btn.getBoundingClientRect();
        return { textBottom: Math.round(a.bottom), buttonTop: Math.round(b.top) };
      });
      await shot(`EL-08-narrow-390-${lang}`, true);
      results[lang] = { overflow, fix };
      expect(overflow.scroll <= overflow.client, `${lang}: horizontal overflow ${JSON.stringify(overflow)}`);
      expect(fix.buttonTop >= fix.textBottom - 1, `${lang}: notice button under its text: ${JSON.stringify(fix)}`);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await setLanguage('zh-CN');
    await waitFor('rows settled', async () => await settledAll(), 60_000);
    await sleep(2_000);
    await shot('EL-08-zh-CN-1440', true);
    await setLanguage('en');
    return results;
  });

  // lost starts now; the 5-minute grace runs while the other cases go on.
  let lostStartedAt;
  await runCase('EL-06a', async () => {
    await page.locator(`[data-testid="node-server-update-${key('lost')}"]`).click();
    lostStartedAt = Date.now();
    await waitFor('lost restarting', async () => (await cellOf('lost')) === 'Restarting…', 30_000);
    return { restartingAfterMs: Date.now() - lostStartedAt };
  });

  await runCase('EL-03', async () => {
    const seen = []; const shots = {};
    await page.locator(`[data-testid="node-server-update-${key('upd')}"]`).click();
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      const cell = await cellOf('upd').catch(() => null); const notice = await noticeOf('upd').catch(() => null);
      const sig = `${cell} | ${notice}`;
      if (!seen.length || seen[seen.length - 1] !== sig) {
        seen.push(sig);
        const label = /Starting/.test(cell ?? '') ? 'starting' : /Checking/.test(cell ?? '') ? 'checking' : /Downloading/.test(cell ?? '') ? 'downloading'
          : /Preparing/.test(cell ?? '') ? 'preparing' : /Restarting/.test(cell ?? '') ? 'restarting' : /Updated to/.test(notice ?? '') ? 'succeeded' : null;
        if (label && !shots[label]) { shots[label] = true; await shot(`EL-03-update-${label}`); }
      }
      if (/Updated to/.test(notice ?? '')) break;
      await sleep(300);
    }
    const final = { cell: await cellOf('upd'), notice: await noticeOf('upd'), noticeClass: await page.locator(`[data-testid="node-server-notice-${key('upd')}"]`).getAttribute('class').catch(() => null) };
    expect(['checking', 'downloading', 'preparing', 'restarting', 'succeeded'].every(s => shots[s]), `every step seen: ${Object.keys(shots)}`);
    expect(final.cell === `Server ${APP_VERSION}` && final.notice === `Updated to ${APP_VERSION}.` && /emerald/.test(final.noticeClass ?? ''), `succeeded: ${JSON.stringify(final)}`);
    return { seen, steps: Object.keys(shots), final };
  });

  await runCase('EL-04', async () => {
    await page.locator(`[data-testid="node-server-update-${key('refuse')}"]`).click();
    await waitFor('refusal notice', async () => (await noticeOf('refuse'))?.includes('too old'), 20_000);
    const copy = page.locator(`[data-testid="node-server-copy-${key('refuse')}"]`);
    const before = { notice: await noticeOf('refuse'), copyTitle: await copy.getAttribute('title'), cls: await page.locator(`[data-testid="node-server-notice-${key('refuse')}"]`).getAttribute('class') };
    await shot('EL-04-update-refused-copy-command');
    // The clipboard needs the window focused, as when the owner clicks it.
    await page.bringToFront();
    const focused = await page.evaluate(() => document.hasFocus());
    const clickAt = Date.now();
    await copy.click();
    const after = await waitFor('Copied', async () => ((await text(copy)) === 'Copied' ? 'Copied' : null), 3_000).catch(async () => text(copy));
    const clipboard = await page.evaluate(() => navigator.clipboard.readText()).catch(error => `read failed: ${error.message}`);
    const errorsOnClick = consoleErrors.filter(entry => entry.at >= clickAt);
    expect(before.notice?.startsWith(`The update to ${APP_VERSION} did not happen.`) && before.notice.includes('Copy command') && /amber/.test(before.cls ?? ''), `refusal: ${JSON.stringify(before)}`);
    expect(before.copyTitle === `autobyteus-docker upgrade --all --tag ${APP_VERSION}` && after === 'Copied', `copy command: ${JSON.stringify({ title: before.copyTitle, after })}`);
    expect(clipboard === before.copyTitle, `clipboard: ${clipboard}`);
    return { before, focused, after, clipboard, errorsOnClick };
  });

  await runCase('EL-05', async () => {
    await page.locator(`[data-testid="node-server-update-${key('fail')}"]`).click();
    await waitFor('downloading', async () => /Downloading/.test((await cellOf('fail')) ?? ''), 20_000);
    await waitFor('failure notice', async () => (await noticeOf('fail'))?.includes('interrupted'), 30_000);
    const result = { cell: await cellOf('fail'), notice: await noticeOf('fail') };
    await shot('EL-05-update-failed');
    expect(result.notice?.startsWith(`The update to ${APP_VERSION} did not happen.`) && result.cell?.includes(`Update to ${APP_VERSION}`), `failed, offered again: ${JSON.stringify(result)}`);
    return result;
  });

  await runCase('EL-07', async () => {
    // Medium tier: the card between 38 and 64 rem.
    let cardWidth = 0; let windowWidth = 0;
    for (windowWidth of [1100, 1000, 1200, 900, 1300]) {
      await page.setViewportSize({ width: windowWidth, height: 900 });
      await sleep(800);
      cardWidth = await page.locator('[data-testid="node-list-card"]').evaluate(el => el.getBoundingClientRect().width);
      if (cardWidth >= 38 * 16 + 20 && cardWidth < 64 * 16 - 20) break;
    }
    const switches = await boxes('node-agents-switch-'); const removes = await boxes('node-remove-');
    const plainRow = await page.locator(`[data-testid="node-row-${key('plain')}"]`).evaluate(row => {
      const box = sel => { const el = row.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width) }; };
      return { name: box('[data-testid^="node-name-"]'), server: box('[data-testid^="node-server-"]'), offer: box('[data-testid$="-toggle"]'), capsule: box('[data-testid^="node-agents-switch-"]') };
    });
    await shot(`EL-07-medium-window-${windowWidth}`, true);
    const xs = list => [...new Set(list.filter(b => b.visible).map(b => b.x))];
    expect(cardWidth >= 38 * 16 && cardWidth < 64 * 16, `card width in the medium tier: ${cardWidth}`);
    expect(xs(switches).length === 1 && xs(removes).length === 1, `capsules and trash aligned: ${JSON.stringify({ s: xs(switches), r: xs(removes) })}`);
    expect(plainRow.server && plainRow.offer && plainRow.server.y > plainRow.name.y && plainRow.offer.y > plainRow.server.y && plainRow.capsule.y < plainRow.server.y,
      `server then offer under the name: ${JSON.stringify(plainRow)}`);
    return { windowWidth, cardWidth, switchXs: xs(switches), removeXs: xs(removes), plainRow };
  });

  await runCase('EL-09', async () => {
    await waitFor('rows settled', async () => await settledAll(), 60_000);
    const capsules = await page.locator('button[role="switch"][data-testid^="node-agents-switch-"]').evaluateAll(items => items.map(b => ({ id: b.getAttribute('data-testid'), checked: b.getAttribute('aria-checked'), label: b.getAttribute('aria-label'), disabled: b.disabled })));
    const toggle = page.locator(`[data-testid="node-offer-${key('plain')}-toggle"]`);
    const expandedBefore = await toggle.getAttribute('aria-expanded');
    await toggle.focus(); await page.keyboard.press('Enter');
    await page.locator(`[data-testid="node-directions-${key('plain')}"]`).waitFor({ state: 'visible', timeout: 10_000 });
    const expandedAfter = await toggle.getAttribute('aria-expanded');
    await shot('EL-09-offer-panel-open-by-keyboard', true);
    const live = { cell: await page.locator(`[data-testid="node-server-${key('upd')}"]`).getAttribute('aria-live'),
      notices: await page.locator('[data-testid^="node-row-"] [aria-live="polite"]').count() };
    // Tab order from the add band's address field through the first rows.
    await page.locator('[data-testid="add-node-address"]').focus();
    const order = [];
    for (let i = 0; i < 18; i += 1) { await page.keyboard.press('Tab'); order.push(await page.evaluate(() => document.activeElement?.getAttribute('data-testid') || `${document.activeElement?.tagName}:${(document.activeElement?.textContent || '').trim().slice(0, 30)}`)); }
    expect(capsules.length >= 9 && capsules.every(c => c.label && c.label.startsWith('Let agents work with')), `capsules are labelled switches: ${JSON.stringify(capsules)}`);
    expect(expandedBefore === 'false' && expandedAfter === 'true', `toggle by keyboard: ${expandedBefore} → ${expandedAfter}`);
    expect(live.cell === 'polite', `server cell live region: ${JSON.stringify(live)}`);
    expect(order.includes('add-node-name') && order.includes('add-node-collaborate') && order.includes('add-node-submit') && order.some(id => id?.startsWith('node-agents-switch-')) && order.some(id => id?.startsWith('node-open-')), `tab order: ${order}`);
    return { capsules: capsules.length, expandedBefore, expandedAfter, live, order };
  });

  await runCase('EL-10', async () => {
    const before = windows().length;
    await page.locator(`[data-testid="node-open-${key('plain')}"]`).click();
    await waitFor('a new window', async () => windows().length === before + 1, 20_000);
    return { windowsBefore: before, windowsAfter: windows().length };
  });

  await runCase('EL-06', async () => {
    const remaining = 5 * 60_000 - (Date.now() - lostStartedAt);
    if (remaining > 0) await sleep(remaining);
    await waitFor('lost not reachable', async () => (await cellOf('lost'))?.startsWith('Not reachable.'), 60_000);
    const cell = await cellOf('lost');
    await page.locator(`[data-testid="node-row-${key('lost')}"]`).scrollIntoViewIfNeeded();
    await shot('EL-06-update-lost-not-reachable');
    expect(cell === `Not reachable. Last known: updating to ${APP_VERSION}.`, `lost: ${cell}`);
    return { cell, afterMs: Date.now() - lostStartedAt };
  });

  currentCase = null;
  evidence.result = Object.values(evidence.cases).every(c => c.result === 'Pass') && evidence.errors.length === 0 ? 'Pass' : 'Fail';
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
  for (const name of Object.keys(servers)) await stopServer(name).catch(() => undefined);
  for (const starter of Object.values(starters)) { evidence.starterLog.push({ node: starter.name, requests: starter.requests.length }); starter.server.close(); }
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  evidence.cleanup.rootRemoved = !existsSync(root);
  evidence.cleanup.mineStillListed = await isolated('list').then(a => (a.result?.instances ?? []).filter(i => i.instanceId === instanceId)).catch(() => 'unknown');
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'API-02-desktop-journey.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`API-02 desktop journey: ${evidence.result}${evidence.error ? `\n${evidence.error}` : ''}`);
  process.exit(evidence.result === 'Pass' ? 0 : 1);
}

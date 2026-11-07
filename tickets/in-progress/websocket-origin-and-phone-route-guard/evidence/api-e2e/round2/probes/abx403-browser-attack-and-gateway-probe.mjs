#!/usr/bin/env node
// API-06 / API-07 (autobyteus-403): a real node (this worktree's dist/app.js, temp data root, 127.0.0.1) and real Chrome.
// Round 2 adds /ws/node-desktop (autobyteus-407's phone route) to the foreign upgrades.
// API-06 — a page from another site, http://evil.example:<port> (mapped to 127.0.0.1 in Chrome), as a user who visits it:
//   WebSockets to /ws/terminal/<id>, /ws/projects, /graphql, /rest/remote/run-observations; a sandboxed iframe (Origin null)
//   to /ws/projects; a preflighted JSON POST /graphql and a "simple" text/plain POST /graphql (no preflight), each a
//   createAgentDefinition mutation. Control: the same calls from a loopback page (http://127.0.0.1:<port2>, an allowed
//   development origin) work: the terminal answers, the mutation creates its definition. Then the node is read (without
//   Origin): no definition from the foreign page exists; the node log has one refusal line per foreign request.
// API-07 — a gateway that rewrites Host and sends no X-Forwarded-Host (https://gw.example.test:<port>, self-signed): from a
//   page at the gateway origin, POST /graphql and WebSocket /ws/projects. Refused without AUTOBYTEUS_ALLOWED_ORIGINS;
//   accepted after the node restarts with AUTOBYTEUS_ALLOWED_ORIGINS="<gateway origin>,ftp://not-an-origin" (the invalid
//   entry must be reported once at startup).
// Usage: node abx403-browser-attack-and-gateway-probe.mjs <worktree> <output dir>
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, realpathSync, readFileSync, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const [worktree, outputDirArg] = process.argv.slice(2);
const outputDir = path.resolve(outputDirArg);
await fs.mkdir(outputDir, { recursive: true });
const require = createRequire(path.join(worktree, 'autobyteus-web', 'package.json'));
const { chromium } = require('playwright-core');
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const appEntry = path.join(serverDir, 'dist', 'app.js');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'abx403-attack-')));
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', api06: {}, api07: {}, cleanup: {}, error: null };
const save = () => fs.writeFile(path.join(outputDir, 'API-06-07-browser-attack-and-gateway.json'), `${JSON.stringify(evidence, null, 2)}\n`);
const servers = [];
let node = null;
const nodePort = await freePort();
const nodeUrl = `http://127.0.0.1:${nodePort}`;
const logFile = path.join(outputDir, 'API-06-07-node.log');

const startNode = async (label, extraEnv = {}) => {
  const dataDir = path.join(root, 'node-data');
  const home = path.join(root, 'home');
  await fs.mkdir(dataDir, { recursive: true }); await fs.mkdir(home, { recursive: true });
  if (!existsSync(path.join(dataDir, '.env'))) await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${nodeUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\n`);
  const log = createWriteStream(logFile, { flags: 'a' });
  log.write(`\n===== node start: ${label} ${new Date().toISOString()} env=${JSON.stringify(extraEnv)} =====\n`);
  const child = spawn(process.execPath, [appEntry, '--host', '127.0.0.1', '--port', String(nodePort), '--data-dir', dataDir], { cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', AUTOBYTEUS_SERVER_HOST: nodeUrl, ...extraEnv } });
  child.stdout.pipe(log); child.stderr.pipe(log);
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`node exited ${child.exitCode}`);
    if (await fetch(`${nodeUrl}/rest/health`).then(r => r.ok).catch(() => false)) break;
    await sleep(300);
  }
  node = child;
};
const stopNode = async () => {
  if (!node || node.exitCode !== null) return;
  node.kill('SIGTERM');
  await Promise.race([new Promise(resolve => node.once('close', resolve)), sleep(15_000)]);
  if (node.exitCode === null && node.signalCode === null) node.kill('SIGKILL');
};
const gql = async (query, variables) => (await (await fetch(`${nodeUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
const logLines = async () => (await fs.readFile(logFile, 'utf8').catch(() => '')).split('\n').filter(line => /Remote Access request refused|Remote Access WebSocket rejected|AUTOBYTEUS_ALLOWED_ORIGINS/.test(line));
const definitionNames = async () => ((await gql('{agentDefinitions{name}}')).data?.agentDefinitions ?? []).map(d => d.name);

const page = (title) => `<!doctype html><html><head><title>${title}</title></head><body>${title}</body></html>`;
const startStatic = async (title) => {
  const port = await freePort();
  const server = http.createServer((req, res) => { res.setHeader('content-type', 'text/html'); res.end(page(title)); });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  servers.push(server);
  return port;
};

const mutation = name => JSON.stringify({ query: 'mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
  variables: { i: { name, role: 'assistant', description: 'abx403 browser probe', instructions: 'none', toolNames: [] } } });

/** Runs in the page: every attempt, its outcome. */
const attemptsInPage = async ({ nodeUrl, terminalId, preflightBody, simpleBody, withIframe }) => {
  const wsBase = nodeUrl.replace(/^http/, 'ws');
  const tryWs = (url, protocols, send) => new Promise(resolve => {
    const out = { url: url.replace(/access_token=[^&]+/, 'access_token=…'), opened: false, frames: 0, firstFrame: null, closeCode: null, error: false };
    let ws;
    try { ws = protocols ? new WebSocket(url, protocols) : new WebSocket(url); } catch (e) { resolve({ ...out, error: String(e) }); return; }
    const done = () => resolve(out);
    ws.onopen = () => { out.opened = true; if (send) ws.send(send); };
    ws.onmessage = (e) => { out.frames += 1; if (!out.firstFrame) out.firstFrame = String(e.data).slice(0, 120); };
    ws.onerror = () => { out.error = true; };
    ws.onclose = (e) => { out.closeCode = e.code; done(); };
    setTimeout(() => { try { ws.close(); } catch {} setTimeout(done, 300); }, 4000);
  });
  const results = {};
  results.terminal = await tryWs(`${wsBase}/ws/terminal/${terminalId}`, null, JSON.stringify({ type: 'input', data: btoa('echo ABX403_TERMINAL_$((40+3))\n') }));
  results.projects = await tryWs(`${wsBase}/ws/projects`);
  results.nodeDesktop = await tryWs(`${wsBase}/ws/node-desktop`);
  results.graphqlWs = await tryWs(`${wsBase}/graphql`, ['graphql-transport-ws', 'graphql-ws']);
  results.peerObservation = await tryWs(`${wsBase}/rest/remote/run-observations`);
  const tryFetch = async (init) => { try { const r = await fetch(`${nodeUrl}/graphql`, init); return { status: r.status, type: r.type, body: init.mode === 'no-cors' ? null : (await r.text()).slice(0, 160) }; } catch (e) { return { error: String(e) }; } };
  results.preflightedPost = await tryFetch({ method: 'POST', headers: { 'content-type': 'application/json' }, body: preflightBody });
  results.simplePost = await tryFetch({ method: 'POST', mode: 'no-cors', headers: { 'content-type': 'text/plain' }, body: simpleBody });
  if (withIframe) {
    results.nullOriginIframe = await new Promise(resolve => {
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.srcdoc = `<script>const ws=new WebSocket(${JSON.stringify(`${wsBase}/ws/projects`)});const r={opened:false,closeCode:null,error:false};ws.onopen=()=>{r.opened=true;ws.close()};ws.onerror=()=>{r.error=true};ws.onclose=e=>{r.closeCode=e.code;parent.postMessage({abx403:r},'*')};<\/script>`;
      window.addEventListener('message', e => { if (e.data?.abx403) resolve({ ...e.data.abx403, iframeOrigin: 'null (sandboxed)' }); });
      document.body.appendChild(frame);
      setTimeout(() => resolve({ timeout: true }), 6000);
    });
  }
  return results;
};

try {
  if (!existsSync(appEntry)) throw new Error('build the server first');
  // ---------------- API-06 ----------------
  await startNode('API-06');
  const evilPort = await startStatic('evil.example');
  const loopPort = await startStatic('loopback dev page');
  const browser = await chromium.launch({ headless: true, executablePath: chromePath, args: ['--host-resolver-rules=MAP evil.example 127.0.0.1, MAP gw.example.test 127.0.0.1', '--ignore-certificate-errors'] });
  const handshakes = [];
  const runPage = async (label, url, args) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const p = await context.newPage();
    const cdp = await context.newCDPSession(p);
    await cdp.send('Network.enable');
    const byId = new Map();
    cdp.on('Network.webSocketCreated', e => byId.set(e.requestId, { page: label, url: e.url }));
    cdp.on('Network.webSocketWillSendHandshakeRequest', e => { const h = byId.get(e.requestId) ?? { page: label }; h.origin = e.request.headers.Origin ?? null; byId.set(e.requestId, h); });
    cdp.on('Network.webSocketHandshakeResponseReceived', e => { const h = byId.get(e.requestId) ?? { page: label }; h.status = e.response.status; byId.set(e.requestId, h); });
    cdp.on('Network.webSocketFrameError', e => { const h = byId.get(e.requestId) ?? { page: label }; h.frameError = e.errorMessage; byId.set(e.requestId, h); });
    const requestOrigins = [];
    p.on('request', r => { if (r.url().startsWith(nodeUrl)) requestOrigins.push({ method: r.method(), url: r.url(), origin: r.headers().origin ?? null }); });
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    const pageOrigin = await p.evaluate(() => location.origin);
    const results = await p.evaluate(attemptsInPage, args);
    await sleep(500);
    handshakes.push(...byId.values());
    await context.close();
    return { pageOrigin, results, requestOrigins };
  };
  const linesBefore = (await logLines()).length;
  evidence.api06.foreign = await runPage('foreign', `http://evil.example:${evilPort}/`, { nodeUrl, terminalId: 'abx403-evil-term', preflightBody: mutation('ABX403-EVIL-PREFLIGHT'), simpleBody: mutation('ABX403-EVIL-SIMPLE'), withIframe: true });
  const foreignLines = (await logLines()).slice(linesBefore);
  evidence.api06.control = await runPage('loopback-control', `http://127.0.0.1:${loopPort}/`, { nodeUrl, terminalId: 'abx403-loop-term', preflightBody: mutation('ABX403-LOOPBACK-PREFLIGHT'), simpleBody: mutation('ABX403-LOOPBACK-SIMPLE'), withIframe: false });
  evidence.api06.handshakes = handshakes;
  evidence.api06.logLinesForeign = foreignLines;
  evidence.api06.definitionsAfter = (await definitionNames()).filter(n => n.startsWith('ABX403-'));
  const f = evidence.api06.foreign.results; const c = evidence.api06.control.results;
  const wsRefused = r => !r.opened && r.frames === 0;
  evidence.api06.checks = {
    foreignWsAllRefused: ['terminal', 'projects', 'nodeDesktop', 'graphqlWs', 'peerObservation'].every(k => wsRefused(f[k])),
    foreignNodeDesktopLogged: foreignLines.some(l => l.startsWith('Remote Access request refused REMOTE_ACCESS_ORIGIN_REFUSED /ws/node-desktop origin http://evil.example:')),
    foreignNullIframeRefused: f.nullOriginIframe && !f.nullOriginIframe.opened,
    foreignPreflightBlocked: Boolean(f.preflightedPost.error),
    foreignDefinitionsNotCreated: !evidence.api06.definitionsAfter.some(n => n.startsWith('ABX403-EVIL')),
    foreignHandshakesHadForeignOrigin: handshakes.filter(h => h.page === 'foreign').every(h => h.origin === `http://evil.example:${evilPort}` || h.origin === 'null'),
    foreignHandshake403: handshakes.filter(h => h.page === 'foreign').every(h => h.status === undefined || h.status === 403),
    foreignLogLines: foreignLines.filter(l => l.includes('REMOTE_ACCESS_ORIGIN_REFUSED')).length,
    noCredentialInLogs: !foreignLines.some(l => /mra_|access_token=[^%&\s]/.test(l)),
    controlTerminalAnswered: c.terminal.opened && c.terminal.frames > 0,
    controlProjectsOpened: c.projects.opened,
    controlPreflightCreated: c.preflightedPost.status === 200 && evidence.api06.definitionsAfter.includes('ABX403-LOOPBACK-PREFLIGHT'),
  };
  await browser.close();
  await save();

  // ---------------- API-07 ----------------
  const certDir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'abx403-gw-cert-')));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=gw.example.test', '-addext', 'subjectAltName=DNS:gw.example.test',
    '-keyout', path.join(certDir, 'key.pem'), '-out', path.join(certDir, 'cert.pem')], { stdio: 'ignore' });
  const gwPort = await freePort();
  const gwOrigin = `https://gw.example.test:${gwPort}`;
  const rewrite = req => { const h = { ...req.headers, host: `127.0.0.1:${nodePort}` }; delete h['x-forwarded-host']; return h; };
  const gw = https.createServer({ key: readFileSync(path.join(certDir, 'key.pem')), cert: readFileSync(path.join(certDir, 'cert.pem')) }, (req, res) => {
    const up = http.request({ host: '127.0.0.1', port: nodePort, method: req.method, path: req.url, headers: rewrite(req) }, upRes => { res.writeHead(upRes.statusCode, upRes.headers); upRes.pipe(res); });
    up.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    req.pipe(up);
  });
  const gwUpgrades = [];
  gw.on('upgrade', (req, socket, head) => {
    const entry = { path: req.url, origin: req.headers.origin, hostSent: `127.0.0.1:${nodePort}`, status: null };
    gwUpgrades.push(entry);
    const up = net.connect(nodePort, '127.0.0.1', () => {
      up.write([`${req.method} ${req.url} HTTP/1.1`, ...Object.entries(rewrite(req)).map(([k, v]) => `${k}: ${v}`), '', ''].join('\r\n'));
      if (head?.length) up.write(head);
      up.once('data', chunk => { entry.status = chunk.toString('latin1').split('\r\n', 1)[0]; });
      socket.pipe(up); up.pipe(socket);
    });
    const end = () => { socket.destroy(); up.destroy(); };
    up.on('error', end); socket.on('error', end);
  });
  await new Promise(resolve => gw.listen(gwPort, '127.0.0.1', resolve));
  servers.push(gw);
  const gwRound = async (label) => {
    const b = await chromium.launch({ headless: true, executablePath: chromePath, args: ['--host-resolver-rules=MAP gw.example.test 127.0.0.1', '--ignore-certificate-errors'] });
    const context = await b.newContext({ ignoreHTTPSErrors: true });
    const p = await context.newPage();
    const healthPage = await p.goto(`${gwOrigin}/rest/health`, { waitUntil: 'domcontentloaded' });
    const out = await p.evaluate(async ({ gwOrigin }) => {
      const r = {};
      try { const res = await fetch('/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '{agentDefinitions{name}}' }) }); r.post = { status: res.status, body: (await res.text()).slice(0, 120) }; } catch (e) { r.post = { error: String(e) }; }
      r.ws = await new Promise(resolve => { const o = { opened: false, frames: 0, closeCode: null }; const ws = new WebSocket(`${gwOrigin.replace('https', 'wss')}/ws/projects`);
        ws.onopen = () => { o.opened = true; }; ws.onmessage = () => { o.frames += 1; }; ws.onclose = e => { o.closeCode = e.code; resolve(o); }; setTimeout(() => { try { ws.close(); } catch {} setTimeout(() => resolve(o), 300); }, 3000); });
      r.pageOrigin = location.origin;
      return r;
    }, { gwOrigin });
    await b.close();
    return { label, healthPageStatus: healthPage?.status() ?? null, ...out };
  };
  const before07 = (await logLines()).length;
  evidence.api07.withoutSetting = await gwRound('without AUTOBYTEUS_ALLOWED_ORIGINS');
  await stopNode();
  await startNode('API-07 with setting', { AUTOBYTEUS_ALLOWED_ORIGINS: `${gwOrigin},ftp://not-an-origin` });
  evidence.api07.withSetting = await gwRound('with AUTOBYTEUS_ALLOWED_ORIGINS');
  evidence.api07.gatewayUpgrades = gwUpgrades;
  evidence.api07.logLines = (await logLines()).slice(before07);
  const w = evidence.api07.withoutSetting; const s = evidence.api07.withSetting;
  evidence.api07.checks = {
    withoutRefusedPost: w.post.status === 403 && w.post.body.includes('REMOTE_ACCESS_ORIGIN_REFUSED'),
    withoutRefusedWs: !w.ws.opened,
    withAllowedPost: s.post.status === 200,
    withAllowedWs: s.ws.opened,
    invalidEntryWarned: evidence.api07.logLines.filter(l => l.startsWith('AUTOBYTEUS_ALLOWED_ORIGINS: ignoring entries that are not http(s) origins: ftp://not-an-origin')).length === 1,
  };
  await fs.rm(certDir, { recursive: true, force: true });
  const all = { ...evidence.api06.checks, ...evidence.api07.checks };
  evidence.result = Object.entries(all).every(([k, v]) => (k === 'foreignLogLines' ? v >= 7 : v === true)) ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = `${error.stack ?? error.message}`;
} finally {
  for (const server of servers) await new Promise(resolve => server.close(resolve));
  await stopNode();
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  evidence.cleanup = { nodeStopped: !node || node.exitCode !== null || node.signalCode !== null, rootRemoved: !existsSync(root) };
  evidence.finishedAt = new Date().toISOString();
  await save();
  console.log(`API-06/07: ${evidence.result}${evidence.error ? `\n${evidence.error}` : ''}`);
  console.log(JSON.stringify({ api06: evidence.api06.checks, api07: evidence.api07.checks }, null, 1));
  process.exit(evidence.result === 'Pass' ? 0 : 1);
}

#!/usr/bin/env node
// autobyteus-434 reproduction (Solution Designer, investigation only; not a product test).
//
// One isolated node built from this worktree (`autobyteus-server-ts/dist/app.js`, temp data root and HOME, scripted AGY
// CLI: a plain message makes the agent answer `REPLY:<message>`), a Team run "Delivery Team" (lead + mate), and the real
// phone bundle the node serves at /mobile, paired through Phone Access, in headless Chrome at 390x844.
//
// The phone reaches the node through a TCP proxy this script owns (Chrome maps 192.168.77.10 to 127.0.0.1, so the phone's
// Host and Origin are the private address as on a LAN/tailnet path). The proxy has three modes:
//   pass       forwards both ways;
//   refuse     destroys every open connection and refuses new ones at once (the node is unreachable: Wi-Fi/LTE switch,
//              Tailscale reconnecting, the laptop asleep);
//   blackhole  keeps every connection open but forwards nothing either way (a silently dead path: NAT/tailnet drop, the
//              phone's radio gone; no FIN, no RST reaches either side).
//
// The "agent keeps working" side is a second client of the Team stream (as the desktop is): it sends the lead a marker
// message; the lead answers `REPLY:<marker>`. Delay = the time the phone's conversation shows `REPLY:<marker>` minus the
// time the second client received that reply from the node.
//
// Scenarios (each prints JSON lines; the summary is written to --output-dir/repro-summary.json):
//   R1 baseline           open the lead on the phone; 3 markers 4 s apart.
//   R2 short outage       refuse for 6 s, marker sent during the outage, then pass: does the phone catch up by itself?
//   R3 long outage        refuse for 45 s, then pass; wait 20 s; a marker: does the phone ever show it by itself (60 s)?
//                         Then the user's action (back to the list, open the run again) and the time to show it.
//   R4 silent dead path   blackhole (no close); a marker: does the phone notice or show it within 90 s? Then pass is NOT
//                         restored for the old connections (a dead path stays dead); the user's action as in R3.
//
//   R7 hidden + dead path (added in implementation, AC-003) the page is hidden 35 s while its open WebSocket
//                         connections die silently and the agent answers a marker; then visible: is the marker shown
//                         within 5 s? (Runs before R4.)
//
// Usage: node phone-live-repro.mjs --output-dir=<fresh dir> [--scenarios=R1,R2,R3,R4,R6,R7]
// Prerequisites: `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web`, Chrome.
import { createWriteStream, existsSync, mkdtempSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const worktree = process.env.SD434_WORKTREE ?? '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434';
const webDir = path.join(worktree, 'autobyteus-web');
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const WS = require('ws');

const arg = (name, fallback) => {
  const hit = process.argv.find(value => value === `--${name}` || value.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true;
};
const outputDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), `sd434-repro-${Date.now()}`)));
const scenarios = new Set(String(arg('scenarios', 'R1,R5,R2,R3,R4')).split(','));
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const appEntry = path.join(serverDir, 'dist', 'app.js');
const agyCli = path.join(serverDir, 'tests', 'fixtures', 'agy-failure-cli.mjs');
const PHONE_HOST = '192.168.77.10';
const MODEL = 'gemini-3.8-flash-low';
const redact = text => String(text).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…').replace(/(access_token|pairing)=[^&\s"']+/g, '$1=…');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const t0 = Date.now();
const now = () => Date.now() - t0;
const log = (event, details = {}) => { const line = redact(JSON.stringify({ t: now(), event, ...details })); console.log(line); summary.timeline.push(JSON.parse(line)); };
const waitFor = async (what, fn, timeoutMs = 60_000, every = 150) => {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) { try { if (await fn()) return true; } catch (error) { last = error; } await sleep(every); }
  throw new Error(`Timed out waiting for ${what}${last ? `: ${last.message}` : ''}`);
};
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer(); server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
});
const summary = { startedAt: new Date().toISOString(), scenarios: {}, timeline: [], proxy: { connections: 0 }, error: null };
await fs.mkdir(outputDir, { recursive: true });
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'sd434-repro-')));

// ---- the node ---------------------------------------------------------------------------------------------------------
const nodePort = await freePort();
const proxyPort = await freePort();
const nodeBase = `http://127.0.0.1:${nodePort}`;
const phoneOrigin = `http://${PHONE_HOST}:${proxyPort}`;
const dataDir = path.join(root, 'data'); const home = path.join(root, 'home');
await fs.mkdir(dataDir, { recursive: true }); await fs.mkdir(home, { recursive: true });
await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${nodeBase}\nAPP_ENV=test\nLOG_LEVEL=WARN\n`);
const serverLog = createWriteStream(path.join(outputDir, 'server.log'));
const server = spawn(process.execPath, [appEntry, '--host', '127.0.0.1', '--port', String(nodePort), '--data-dir', dataDir], {
  cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
  env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN',
    AUTOBYTEUS_SERVER_HOST: nodeBase, AUTOBYTEUS_ALLOWED_HOSTS: `${PHONE_HOST}`, ANTIGRAVITY_CLI_COMMAND: agyCli, AGY_FAKE_CASE: 'interrupt_resend' } });
server.stdout.pipe(serverLog); server.stderr.pipe(serverLog);

// ---- the proxy (the phone's network path) ------------------------------------------------------------------------------
let proxyMode = 'pass';
const live = new Set();
const proxy = net.createServer((client) => {
  if (proxyMode === 'refuse') { client.destroy(); return; }
  summary.proxy.connections += 1;
  const upstream = net.connect(nodePort, '127.0.0.1');
  const pair = { client, upstream };
  live.add(pair);
  client.once('data', (chunk) => { pair.webSocket = /^upgrade:\s*websocket/im.test(String(chunk)); });
  client.on('data', (chunk) => { if (proxyMode === 'pass') upstream.write(chunk); });
  upstream.on('data', (chunk) => { if (proxyMode === 'pass' && !pair.dead) client.write(chunk); });
  const end = () => { live.delete(pair); client.destroy(); upstream.destroy(); };
  client.on('close', end); upstream.on('close', end); client.on('error', end); upstream.on('error', end);
});
await new Promise(resolve => proxy.listen(proxyPort, '127.0.0.1', resolve));
const setMode = (mode) => {
  proxyMode = mode;
  if (mode === 'refuse') for (const pair of [...live]) { pair.client.destroy(); pair.upstream.destroy(); }
  // A dead path stays dead: connections open during the blackhole never forward again.
  if (mode === 'blackhole') for (const pair of live) pair.dead = true;
  log('proxy', { mode, open: live.size });
};
/**
 * R7: only the open WebSocket connections die silently (their client bytes are dropped too). The browser's pooled
 * HTTP keep-alive connections are left alone: a real node closes them after its idle timeout and answers a reuse of
 * a dead one with a reset, which the browser retries; this harness's permanent blackhole would instead hang every
 * read on them (implementation finding IMP-11).
 */
const blackholeWebSockets = () => {
  let count = 0;
  for (const pair of live) if (pair.webSocket) { pair.dead = true; pair.client.removeAllListeners('data'); count += 1; }
  log('proxy', { mode: 'blackhole open WebSocket connections', webSockets: count, open: live.size });
};

let browser;
try {
  await waitFor('node health', async () => {
    if (server.exitCode !== null) throw new Error(`server exited ${server.exitCode}`);
    return fetch(`${nodeBase}/rest/health`).then(r => r.ok).catch(() => false);
  }, 120_000, 300);
  const gql = async (query, variables) => {
    const body = await (await fetch(`${nodeBase}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json();
    if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
    return body.data;
  };
  const rest = async (method, route, body) => {
    const r = await fetch(`${nodeBase}/rest${route}`, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: await r.json().catch(() => null) };
  };

  // ---- data: a Team run ------------------------------------------------------------------------------------------------
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
  const def = async name => (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
    { i: { name, role: 'assistant', description: `${name} (434 repro)`, instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  const lead = await def('Solution Designer'); const mate = await def('Implementation Engineer');
  const teamDef = (await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}',
    { i: { name: 'Delivery Team', description: '434 repro', instructions: 'Work together.', coordinatorMemberName: 'lead',
      nodes: [{ memberName: 'lead', ref: lead, refScope: 'SHARED' }, { memberName: 'mate', ref: mate, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  const workspace = path.join(root, 'workspace'); await fs.mkdir(workspace, { recursive: true });
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
  const runConfig = { workspaceRootPath: workspace, autoExecuteTools: true, ...agy };
  const team = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: teamDef,
    teamConfigs: [{ teamAddress: '/', ...runConfig }], memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: lead, ...runConfig },
      { memberAddress: '/mate', agentDefinitionId: mate, ...runConfig }] } })).createAgentTeamRun;
  if (!team.success) throw new Error(team.message);
  const tree = JSON.stringify((await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: team.teamRunId })).getTeamRunResumeConfig.executionTree);
  const leadRun = /"address":"\/lead"[^}]*"agent_run_id":"([^"]+)"/.exec(tree)?.[1];
  log('team', { teamRunId: team.teamRunId, leadRun });

  // ---- the "desktop" side: a second Team-stream client on the node itself ----------------------------------------------
  const desk = new WS(`${nodeBase.replace('http', 'ws')}/ws/agent-team/${team.teamRunId}`);
  await new Promise((resolve, reject) => { desk.once('open', resolve); desk.once('error', reject); });
  const seenByDesk = new Map();
  const seenByDeskRaw = [];
  desk.on('message', (data) => {
    const text = String(data);
    seenByDeskRaw.push(text);
    for (const match of text.matchAll(/REPLY:(MARK-\d+)/g)) if (!seenByDesk.has(match[1])) seenByDesk.set(match[1], Date.now());
  });
  let markerNo = 0;
  const say = async (content) => desk.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `team_member_input:repro:${randomUUID()}`,
    context_file_paths: [], image_urls: [], agent_run_id: leadRun, content } }));
  // First turn so the lead has a conversation (and the run is active).
  await say('Start. Marker WARMUP.');
  await sleep(3_000);

  // ---- the phone -------------------------------------------------------------------------------------------------------
  browser = await chromium.launch({ headless: true, executablePath: chrome,
    args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC' });
  const page = await context.newPage();
  const sockets = [];
  page.on('websocket', (ws) => {
    const entry = { url: redact(ws.url()).replace(phoneOrigin.replace('http', 'ws'), ''), openedAt: now(), closedAt: null, framesIn: 0 };
    sockets.push(entry);
    ws.on('framereceived', () => { entry.framesIn += 1; });
    ws.on('close', () => { entry.closedAt = now(); });
  });
  const consoleLines = [];
  page.on('console', (message) => { if (/Team WebSocket|Max reconnection|WebSocket error/.test(message.text())) consoleLines.push({ t: now(), text: message.text() }); });
  await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
  const pairing = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Repro Node', trustedPrivateHttpAcknowledged: true });
  if (pairing.status !== 201) throw new Error(`pairing session ${pairing.status} ${JSON.stringify(pairing.body)}`);
  await page.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
  await page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
  log('phone paired');

  const conversation = () => page.evaluate(() => document.querySelector('[data-testid="mobile-run-conversation"]')?.innerText ?? '');
  const openTeam = async () => {
    await page.locator(`[data-testid="mobile-run-row-team:${team.teamRunId}"] [data-testid="mobile-run-open"]`).click();
    await waitFor('the run screen', async () => (await page.evaluate(() => document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state'))) === 'open', 30_000);
  };
  const backToList = async () => {
    await page.locator('[data-testid="mobile-run-back"]:visible').first().click();
    await page.locator('[data-testid="mobile-run-tree"]:visible').waitFor({ timeout: 20_000 });
  };
  /** Sends a marker; returns when the node delivered its reply to the desktop-side client. */
  const marker = async () => {
    markerNo += 1; const id = `MARK-${markerNo}`;
    await say(id);
    await waitFor(`${id} on the node`, async () => seenByDesk.has(id), 30_000, 50);
    return id;
  };
  /** The delay from the node's reply to the phone showing it, or null within `timeoutMs`. */
  const phoneDelay = async (id, timeoutMs) => {
    const from = seenByDesk.get(id);
    try { await waitFor(`${id} on the phone`, async () => (await conversation()).includes(`REPLY:${id}`), timeoutMs, 100); }
    catch { return null; }
    return Date.now() - from;
  };
  const teamSockets = () => sockets.filter(s => s.url.startsWith('/ws/agent-team/')).map(s => ({ ...s }));

  await openTeam();
  try { await waitFor('the warm-up reply on the phone', async () => (await conversation()).includes('REPLY:Start'), 30_000); }
  catch (error) {
    await page.screenshot({ path: path.join(outputDir, 'phone-warmup-failure.png') });
    log('warm-up failure', { conversation: (await conversation()).slice(-600), screen: await page.evaluate(() => document.body.innerText.slice(0, 800)), desk: [...seenByDesk.keys()] });
    throw error;
  }
  log('phone opened the lead');

  if (scenarios.has('R1')) {
    const delays = [];
    for (let i = 0; i < 3; i += 1) { const id = await marker(); delays.push({ id, ms: await phoneDelay(id, 15_000) }); await sleep(4_000); }
    summary.scenarios.R1 = { delays };
    log('R1', summary.scenarios.R1);
  }

  if (scenarios.has('R5')) {
    // The order after the phone's own message: the phone sends a message that makes the agent work (a 4 s tool step,
    // then its reply), the desktop side sends two more; the phone's order live, then after leaving and re-opening,
    // against the node's stored order.
    const order = (text) => ['PHONE-MSG', 'REPLY:PHONE-MSG', 'MARK-', 'REPLY:MARK-'].length && [...text.matchAll(/(REPLY:)?(PHONE-MSG|MARK-\d+)/g)].map(m => m[0]);
    const box = page.locator('[data-testid="mobile-run-conversation"] textarea').last();
    const send = page.locator('[data-testid="mobile-run-conversation"] button[aria-label="Send message"]').last();
    await box.fill('PHONE-MSG HOLD_MS:4000');
    await waitFor('Send enabled', async () => (await send.count()) > 0 && await send.isEnabled(), 20_000);
    await send.click();
    await waitFor('the phone message answered', async () => seenByDeskRaw.some(text => text.includes('REPLY:PHONE-MSG')), 30_000);
    const a = await marker(); await phoneDelay(a, 15_000);
    const b = await marker(); await phoneDelay(b, 15_000);
    await sleep(1_000);
    const live = order(await conversation());
    await page.screenshot({ path: path.join(outputDir, 'R5-live.png') });
    await backToList(); await sleep(1_500); await openTeam(); await sleep(3_000);
    const reopened = order(await conversation());
    await page.screenshot({ path: path.join(outputDir, 'R5-reopened.png') });
    const stored = (await gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}', { id: team.teamRunId, a: leadRun }))
      .getTeamMemberRunProjection.conversation.map(e => `${e.role ?? e.kind}:${String(e.content ?? e.toolName ?? '').slice(0, 30)}`);
    summary.scenarios.R5 = { live, reopened, stored };
    log('R5', summary.scenarios.R5);
  }

  if (scenarios.has('R6')) {
    // The order while the turn the phone's message started is still running (the user's 07:32 message started one turn
    // that was still running at 07:44, 07:51 and 07:58): send, wait 3 s, leave and re-open during the turn, then again
    // after the turn ended.
    const box = page.locator('[data-testid="mobile-run-conversation"] textarea').last();
    const send = page.locator('[data-testid="mobile-run-conversation"] button[aria-label="Send message"]').last();
    await box.fill('PHONE-LONG HOLD_MS:30000');
    await waitFor('Send enabled', async () => (await send.count()) > 0 && await send.isEnabled(), 20_000);
    await send.click();
    await sleep(3_000);
    const view = (text) => { const lines = text.split('\n').map(l => l.trim()).filter(Boolean); const tail = lines.slice(-12);
      return { copies: (text.match(/PHONE-LONG HOLD_MS/g) ?? []).length, tail }; };
    const liveView = view(await conversation());
    await page.screenshot({ path: path.join(outputDir, 'R6-live.png') });
    await backToList(); await sleep(1_000); await openTeam(); await sleep(4_000);
    const reopenedDuringTurn = view(await conversation());
    await page.screenshot({ path: path.join(outputDir, 'R6-reopened-during-turn.png') });
    // A fresh client (a second phone or a desktop window opening the run now): the same hydration path.
    const fresh = await context.newPage();
    await fresh.goto(`${phoneOrigin}/mobile`, { waitUntil: 'domcontentloaded' });
    await fresh.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
    // Wait for the run screen to open (a click while the list is still settling can miss; click again once).
    const freshOpen = async () => {
      await fresh.locator(`[data-testid="mobile-run-row-team:${team.teamRunId}"] [data-testid="mobile-run-open"]`).click();
      await waitFor('the fresh client run screen', async () => (await fresh.evaluate(() => document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state'))) === 'open', 15_000);
    };
    try { await freshOpen(); } catch { log('fresh client: run screen not open after the first click; clicking again'); await freshOpen(); }
    await sleep(5_000);
    const freshDuringTurn = view(await fresh.evaluate(() => document.querySelector('[data-testid="mobile-run-conversation"]')?.innerText ?? ''));
    await fresh.screenshot({ path: path.join(outputDir, 'R6-fresh-client-during-turn.png') });
    await waitFor('the long turn ended', async () => seenByDeskRaw.some(text => text.includes('REPLY:PHONE-LONG')), 60_000);
    await sleep(2_000);
    const afterTurnSameView = view(await conversation());
    await backToList(); await sleep(1_000); await openTeam(); await sleep(4_000);
    const reopenedAfterTurn = view(await conversation());
    await page.screenshot({ path: path.join(outputDir, 'R6-reopened-after-turn.png') });
    const stored = (await gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}', { id: team.teamRunId, a: leadRun }))
      .getTeamMemberRunProjection.conversation.slice(-4).map(e => ({ entry: `${e.role ?? e.kind}:${String(e.content ?? e.toolName ?? '').slice(0, 30)}`, hasMessageId: Boolean(e.messageId) }));
    await fresh.close();
    summary.scenarios.R6 = { liveView, reopenedDuringTurn, freshDuringTurn, afterTurnSameView, reopenedAfterTurn, stored };
    log('R6', summary.scenarios.R6);
  }

  if (scenarios.has('R2')) {
    setMode('refuse');
    const during = await marker();
    await sleep(6_000);
    setMode('pass');
    const caughtUp = await phoneDelay(during, 30_000);
    const after = await marker();
    summary.scenarios.R2 = { outageMs: 6_000, markerDuringOutage: { id: during, phoneShowsAfterMs: caughtUp }, markerAfter: { id: after, ms: await phoneDelay(after, 15_000) },
      teamSockets: teamSockets() };
    log('R2', summary.scenarios.R2);
  }

  if (scenarios.has('R3')) {
    const before = teamSockets().length;
    setMode('refuse');
    await sleep(45_000);
    setMode('pass');
    await sleep(20_000);
    const id = await marker();
    const byItself = await phoneDelay(id, 60_000);
    const socketsDuring = teamSockets().slice(before);
    let afterUserAction = null;
    if (byItself === null) {
      const from = Date.now();
      await backToList(); await openTeam();
      try { await waitFor('after re-open', async () => (await conversation()).includes(`REPLY:${id}`), 30_000, 100); afterUserAction = Date.now() - from; } catch { afterUserAction = 'not shown'; }
      const next = await marker();
      afterUserAction = { reopenToShownMs: afterUserAction, nextMarkerMs: await phoneDelay(next, 15_000) };
    }
    summary.scenarios.R3 = { outageMs: 45_000, phoneShowsByItselfWithin60s: byItself, reconnectAttemptsSeen: socketsDuring.length, socketsDuring, afterUserAction,
      console: consoleLines.slice(-6) };
    log('R3', summary.scenarios.R3);
  }

  if (scenarios.has('R7')) {
    // AC-003 (added by implementation, autobyteus-434): the phone goes to the background (page hidden) for 35 s while the
    // agent works; its open WebSocket connections die silently (no close reaches either side); then the page is visible
    // again. Runs before R4, whose blackhole leaves every connection of that time dead. Visibility is emulated in the page (document.visibilityState + visibilitychange), as the WebView does.
    const setVisibility = (state) => page.evaluate((value) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => value === 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    }, state);
    const before = teamSockets().length;
    await setVisibility('hidden');
    blackholeWebSockets();
    const meanwhile = await marker();
    await sleep(33_000);
    const shownWhileHidden = (await conversation()).includes(`REPLY:${meanwhile}`);
    const socketsWhileHidden = teamSockets().length - before;
    const visibleAt = Date.now();
    await setVisibility('visible');
    let shownAfterVisibleMs = null;
    try { await waitFor(`${meanwhile} after visible`, async () => (await conversation()).includes(`REPLY:${meanwhile}`), 15_000, 100); shownAfterVisibleMs = Date.now() - visibleAt; } catch { /* not shown */ }
    const next = await marker();
    summary.scenarios.R7 = { hiddenMs: 35_000, shownWhileHidden, socketsOpenedWhileHidden: socketsWhileHidden, shownAfterVisibleMs,
      nextMarkerMs: await phoneDelay(next, 15_000), teamSockets: teamSockets().slice(before) };
    log('R7', summary.scenarios.R7);
  }
  if (scenarios.has('R4')) {
    const before = teamSockets();
    setMode('blackhole');
    // New connections still black-holed: a path that is dead for everything. Restore pass for NEW connections after 5 s
    // (the network is back), but the old connection stays dead, as a half-open TCP connection does.
    await sleep(5_000);
    proxyMode = 'pass'; log('proxy', { mode: 'pass for new connections; old connections stay dead' });
    const id = await marker();
    const byItself = await phoneDelay(id, 90_000);
    const state = teamSockets();
    let afterUserAction = null;
    if (byItself === null) {
      const from = Date.now();
      await backToList(); await openTeam();
      try { await waitFor('after re-open', async () => (await conversation()).includes(`REPLY:${id}`), 30_000, 100); afterUserAction = Date.now() - from; } catch { afterUserAction = 'not shown'; }
    }
    summary.scenarios.R4 = { phoneShowsByItselfWithin90s: byItself, socketsBefore: before.length, socketsAfter: state, phoneNoticedClose: state.some(s => s.closedAt !== null && s.closedAt > (before.at(-1)?.openedAt ?? 0)), afterUserActionMs: afterUserAction };
    log('R4', summary.scenarios.R4);
  }

  await page.screenshot({ path: path.join(outputDir, 'phone-final.png') });
  desk.close();
} catch (error) {
  summary.error = redact(error.stack ?? String(error));
  console.error(summary.error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  proxy.close();
  for (const pair of live) { pair.client.destroy(); pair.upstream.destroy(); }
  server.kill('SIGTERM');
  await Promise.race([new Promise(resolve => server.once('close', resolve)), sleep(10_000)]);
  if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  summary.cleanup = { serverExited: server.exitCode !== null || server.signalCode !== null, rootRemoved: !existsSync(root) };
  summary.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'repro-summary.json'), `${redact(JSON.stringify(summary, null, 2))}\n`);
  process.exit(process.exitCode ?? 0);
}

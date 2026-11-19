#!/usr/bin/env node
// Stop generation is harmless to repeat, in the real desktop renderer against a real node (autobyteus-533 REQ-001…REQ-006,
// AC-002, AC-006…AC-010, QR-001, QR-003). It replaces the scratch reproduction `interrupt-twice-repro-scratch.mjs`.
//
// Stack (probe-owned, removed in `finally`): a built node (`autobyteus-server-ts/dist/app.js`) on a temp data root and HOME,
// with the scripted Antigravity CLI (`tests/fixtures/agy-failure-cli.mjs`: `HOLD_TURN` keeps a turn running until it is
// stopped; a Stop takes the AGY run offline, the next message restores it), `nuxt dev` (the desktop renderer) and fresh
// headless Chrome. The page's run sockets (`/ws/agent/…`, `/ws/agent-team/…`) pass through the probe's wire
// (`fixtures/stop-generation-wire.mjs`), which can add latency, drop the path and log every Stop-related frame. No model,
// no keys.
//
// Each case runs on a standalone agent run (`agent`) and on a Team member (`team`, the Team's coordinator, which the Team
// view focuses), each opened from the Workspaces tree; messages and Stops are the user's own clicks in the composer:
//   SGD-01 (agent), SGD-02 (team)  AC-002, AC-006, AC-010, QR-003  Stop pressed twice, the second press after each gap of
//          `--gaps` (ms) at the same point: the page sends one Stop, the node answers it `accepted`, the button shows the
//          spinner and "Stopping…" (aria-busy, disabled) until the status leaves Running, then Send; no toast.
//   SGD-03 (agent), SGD-04 (team)  AC-007, SCN-003  Stop after the turn ended: another window's Stop ends the turn while
//          this page, on a slower downlink, still shows Running; this page's Stop reaches a run with nothing to stop:
//          `accepted`, no toast; Stopping until the status arrives.
//   SGD-05 (agent), SGD-06 (team)  AC-008, REQ-005  The connection drops while Stopping: (a) after the Stop reached the
//          node: the button stays "Stopping…" across the reconnect (a press meanwhile sends nothing), then the rebind's
//          status decides (Send); (b) with the Stop lost on the way: after the rebind the run is still Running and Stop is
//          offered again; a new Stop stops it. No toast in either.
//   SGD-07 (agent), SGD-08 (team)  AC-009, REQ-006, QR-001  Real failures, one plain message each, never a run id or
//          internal words: (a) not connected: the path drops while the run works and the user presses Stop if the page
//          still offers it; (a2) the user opens the working run while the path is down (Running until its stream binds) and
//          presses Stop: "Stop was not sent: not connected to the node. …", nothing sent (at least one of a, a2 presses);
//          (b) a refusal: the Stop does not reach the node and the page receives the node's failed answer for its stream
//          (`INTERRUPT_EXECUTION_FAILED` with the raw run id; no scripted runtime refuses an interrupt): "Could not stop
//          <the agent's name, as the view shows it>. Please try again."; Stop is offered again.
// Every Stop round is followed by the next message to the same run, which restores the AGY run that the Stop took
// offline; a message that never reaches the node is recorded as `sendStalls` (autobyteus-533 CG-07) with its frames.
//
// Prerequisites: `pnpm -C autobyteus-server-ts build`; Chrome.
// Run: `pnpm -C autobyteus-web test:e2e:stop-generation --output-dir <fresh dir>` [--latency-ms 150] [--gaps 0,60,150,300,600]
//      [--cases SGD-01,…] [--browser-executable <path>]. About 6 minutes at loopback.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { attachToBrowserContext, attachToProbeProcess, ownerHeaders, ownerSocketUrl, redactCredentials, withNodeCredential } from './fixtures/probe-node-access.mjs';
import { probeOutputDir, prepareOutputDir } from './fixtures/probe-output-dir.mjs';
import { waitRunSocketReady } from './fixtures/run-socket-ready.mjs';
import { createStopWire, internalWords, readStopTrace, startStopTrace } from './fixtures/stop-generation-wire.mjs';

attachToProbeProcess();
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const NodeWebSocket = require('ws');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serverDir = path.join(path.dirname(webDir), 'autobyteus-server-ts');
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; };
const outputDir = prepareOutputDir(probeOutputDir(webDir, 'stop-generation', arg('output-dir')));
const latencyMs = Number(arg('latency-ms', '0'));
const gaps = arg('gaps', '0,60,150,300,600').split(',').map(Number);
const selected = arg('cases') ? new Set(arg('cases').split(',')) : null;
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
const NOT_SENT = 'Stop was not sent: not connected to the node. Check the connection and try again.';
const couldNotStop = (name) => `Could not stop ${name}. Please try again.`;
const STOP = 'Stop generation';
const STOPPING = 'Stopping…';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (label, predicate, ms = 30_000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(50); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const assert = (condition, message, details) => { if (!condition) throw Object.assign(new Error(message), { details }); };
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const exited = (c) => !c || c.exitCode !== null || c.signalCode !== null;
const stopGroup = async (child) => { if (exited(child)) return 'not running'; process.kill(-child.pid, 'SIGTERM'); try { await until('exit', () => exited(child), 15_000); return 'stopped'; } catch { process.kill(-child.pid, 'SIGKILL'); return 'killed'; } };
const segment = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const slug = (name) => segment(name).replace(/_/g, '-');

const stack = { dataRoot: '', backendUrl: '', frontendUrl: '', backend: null, frontend: null };
const evidence = { startedAt: new Date().toISOString(), node: process.version, latencyMs, gaps, result: 'Fail', cases: {}, sendStalls: [], browserErrors: [], cleanup: {} };
const wire = createStopWire();
wire.latencyMs = latencyMs;
const spawnLogged = (cmd, args, cwd, env, name) => {
  const log = fs.createWriteStream(path.join(outputDir, `${name}.log`), { flags: 'a' });
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.output = '';
  const take = (d) => { child.output += d; log.write(redactCredentials(String(d))); };
  child.stdout.on('data', take); child.stderr.on('data', take);
  return child;
};
const gql = async (query, variables = {}) => {
  const response = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: ownerHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ query, variables }) });
  const body = await response.json(); if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body)); return body.data;
};
const saveEvidence = () => fsp.writeFile(path.join(outputDir, 'evidence.json'), `${redactCredentials(JSON.stringify(evidence, null, 2))}\n`);

/** Another window's Stop, sent on the run's own stream as a second client does; resolves with the node's answer. */
const otherWindowStop = async (target) => {
  const route = target.kind === 'agent' ? `agent/${target.runId}` : `agent-team/${target.teamRunId}`;
  const socket = new NodeWebSocket(ownerSocketUrl(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/${route}`));
  const frames = [];
  socket.on('message', (raw) => { try { frames.push(JSON.parse(String(raw))); } catch { /* not JSON */ } });
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  try {
    await waitRunSocketReady(frames, route);
    const commandId = randomUUID();
    socket.send(JSON.stringify({ type: 'INTERRUPT_GENERATION', payload: target.kind === 'agent' ? { command_id: commandId } : { command_id: commandId, agent_run_id: target.agentRunId } }));
    const ack = await until('the other window\'s Stop answered', () => frames.find((f) => f.type === 'AGENT_COMMAND_ACK' && f.payload?.command_id === commandId), 30_000);
    return { state: ack.payload.state, code: ack.payload.code ?? null };
  } finally { socket.close(); }
};

let browser; let page;
const runCase = async (id, fn) => {
  if (selected && !selected.has(id)) return;
  const started = Date.now();
  console.log(`[stop-generation] ${id} …`);
  try {
    evidence.cases[id] = { result: 'Pass', ...(await fn()), seconds: Math.round((Date.now() - started) / 1000) };
  } catch (error) {
    evidence.cases[id] = { result: 'Fail', error: error.message, details: error.details ?? null, seconds: Math.round((Date.now() - started) / 1000) };
    await page?.screenshot({ path: path.join(outputDir, `${id}-failure.png`) }).catch(() => undefined);
  } finally {
    wire.reset(); wire.latencyMs = latencyMs;
  }
  console.log(`[stop-generation] ${id} ${evidence.cases[id].result}${evidence.cases[id].error ? `: ${evidence.cases[id].error}` : ''}`);
  await saveEvidence();
};

try {
  stack.dataRoot = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), 'stop-generation-')));
  for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'workspace', 'home']) await fsp.mkdir(path.join(stack.dataRoot, dir));
  const backendPort = await freePort(); const frontendPort = await freePort();
  stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const backendEnv = { APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataRoot, 'db', 'development.db')}`,
    AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_ALLOWED_ORIGINS: stack.frontendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(stack.dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(stack.dataRoot, 'temp_workspace') };
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', stack.dataRoot], serverDir,
    withNodeCredential({ PATH: process.env.PATH, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), HOME: path.join(stack.dataRoot, 'home'), ...backendEnv,
      ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' }), 'backend');
  await until('backend health', async () => { if (exited(stack.backend)) throw new Error('backend exited'); return fetch(`${stack.backendUrl}/rest/health`).then((r) => r.ok).catch(() => false); }, 180_000);
  const ws = `ws://127.0.0.1:${backendPort}`;
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('AUTOBYTEUS_'))), NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1',
      BACKEND_NODE_BASE_URL: stack.backendUrl, BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`,
      BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`, BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`, BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => { if (exited(stack.frontend)) throw new Error('Nuxt exited'); return (await fetch(stack.frontendUrl)).ok; }, 240_000);

  // Data, through the public API.
  const workspace = path.join(stack.dataRoot, 'workspace');
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
  const tag = randomUUID().slice(0, 4);
  const names = { agent: `Stopper ${tag}`, lead: `Stop Lead ${tag}`, mate: `Stop Mate ${tag}`, team: `Stop Team ${tag}` };
  const def = async (name) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames: [] } })).createAgentDefinition.id;
  const ids = { agent: await def(names.agent), lead: await def(names.lead), mate: await def(names.mate) };
  ids.team = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: { name: names.team, description: names.team,
    instructions: 'Work together.', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: ids.lead, refScope: 'SHARED' }, { memberName: 'mate', ref: ids.mate, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  const config = { workspaceRootPath: workspace, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' };
  const run = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: ids.agent, ...config } })).createAgentRun;
  assert(run.success, run.message);
  const team = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: { teamDefinitionId: ids.team,
    teamConfigs: [{ teamAddress: '/', ...config }], memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: ids.lead, ...config }, { memberAddress: '/mate', agentDefinitionId: ids.mate, ...config }] } })).createAgentTeamRun;
  assert(team.success, team.message);
  const tree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: team.teamRunId })).getTeamRunResumeConfig.executionTree;
  const leadRunId = tree.root_team.members.find((m) => m.address === '/lead').agent_run_id;
  const targets = {
    agent: { kind: 'agent', runId: run.runId, name: names.agent, runIds: [run.runId] },
    team: { kind: 'team', teamRunId: team.teamRunId, agentRunId: leadRunId, name: names.lead, runIds: [team.teamRunId, leadRunId] },
  };
  evidence.runs = { agent: run.runId, team: team.teamRunId, lead: leadRunId };

  // The browser: the desktop window, its run sockets through the wire.
  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  await attachToBrowserContext(context);
  await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  // Every socket of the page to its node (run streams, run status, collaboration, terminal, …): one path, as a network.
  await context.routeWebSocket((url) => url.port === String(backendPort) && url.pathname.startsWith('/ws/'), (route) => {
    const queued = [];
    let upstream = null;
    const link = wire.link({ url: route.url(), sendToPage: (m) => route.send(m), sendToNode: (m) => { if (upstream?.readyState === 1) upstream.send(m); else queued.push(m); },
      closePage: (code, reason) => route.close({ code, reason }), closeNode: () => upstream?.terminate() });
    if (!link) { route.close({ code: 1011, reason: 'path down' }); return; }
    upstream = new NodeWebSocket(route.url(), { headers: ownerHeaders({ origin: stack.frontendUrl }) });
    upstream.on('open', () => { for (const m of queued.splice(0)) upstream.send(m); });
    upstream.on('message', (data, isBinary) => { if (isBinary) { try { route.send(data); } catch { /* closed */ } } else link.fromNode(String(data)); });
    upstream.on('close', (code, reason) => {
      if (link.closed) return;
      link.closedByEnd('node');
      const sendable = code >= 1000 && code < 5000 && ![1005, 1006, 1015].includes(code);
      try { route.close(sendable ? { code, reason: String(reason) } : { code: 1011, reason: 'node closed' }); } catch { /* closed */ }
    });
    upstream.on('error', () => { if (!link.closed) { link.closedByEnd('node (error)'); try { route.close({ code: 1011, reason: 'node error' }); } catch { /* closed */ } } });
    route.onMessage((m) => link.fromPage(m));
    route.onClose(() => { link.closedByEnd('page'); upstream?.close(); });
  });
  page = await context.newPage();
  page.on('pageerror', (e) => evidence.browserErrors.push(`pageerror: ${e.message}`));
  // The page's own console (warnings and logs of its streams), for the cause of a case's result.
  const consoleLog = fs.createWriteStream(path.join(outputDir, 'console.log'));
  page.on('console', (m) => consoleLog.write(`${new Date().toISOString()} ${m.type()} ${redactCredentials(m.text()).slice(0, 600)}\n`));
  // A cold Nuxt dev server may reload once for dependency optimization: not app errors.
  page.on('console', (m) => { if (m.type() === 'error' && !/Outdated Optimize Dep|dynamically imported module|error caught during app initialization|Failed to load resource/.test(m.text())) evidence.browserErrors.push(redactCredentials(m.text())); });
  await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 240_000 });
  await sleep(3000);
  await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 240_000 });
  await until('workspace row', async () => (await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).count()) >= 1, 60_000);
  await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first().click();

  const SCOPE = '[data-test="workspace-center-pane"]';
  const textarea = () => page.locator(`${SCOPE} textarea`).last();
  const primary = () => page.locator(`${SCOPE} button[aria-label="Send message"], ${SCOPE} button[aria-label="${STOP}"], ${SCOPE} button[aria-label="${STOPPING}"]`).last();
  const open = async (target) => {
    // Rows toggle their folds: unfold only what is folded.
    if (target.kind === 'agent') {
      const runRow = page.locator('[data-test="workspace-agent-run-row"]').first();
      if (!(await runRow.isVisible().catch(() => false))) await page.locator('[data-test="workspace-agent-row"]', { hasText: target.name }).first().click();
      await runRow.click();
    } else {
      const teamRow = page.locator(`[data-test="workspace-team-row-${target.teamRunId}"]`).first();
      if (!(await teamRow.isVisible().catch(() => false))) await page.locator(`[data-test="workspace-team-definition-row-${slug(names.team)}"]`).first().click();
      await teamRow.click();
    }
    await until('composer', async () => (await textarea().count()) >= 1, 30_000);
    await startStopTrace(page, SCOPE);
    await sleep(1500);
  };
  /**
   * The message the user sends; resolves once the node holds the turn (its held step reached the page). A message that
   * does not start its turn fails the case at once (autobyteus-540 D-7): no second send hides a lost one. The stall is
   * recorded with its frames, the button and the draft.
   */
  const holdTurn = async (target, marker) => {
    evidence.sends = (evidence.sends ?? 0) + 1;
    const holdsBefore = wire.holds.length;
    const logFrom = wire.log.length;
    const sentAt = Date.now();
    await until('Send enabled', async () => { await textarea().fill(`HOLD_TURN ${marker}`); await sleep(200); return (await primary().getAttribute('aria-label')) === 'Send message' && primary().isEnabled(); }, 60_000);
    await primary().click();
    try {
      await until('the held turn and Stop', async () => wire.holds.length > holdsBefore && (await primary().getAttribute('aria-label')) === STOP && primary().isEnabled(), 60_000);
      await sleep(500);
    } catch {
      const frames = wire.since(logFrom).map((f) => ({ ...f, at: f.at - sentAt }));
      evidence.sendStalls.push({ target: target.kind, marker, at: new Date(sentAt).toISOString(), frames,
        button: await primary().getAttribute('aria-label').catch(() => null), draft: await textarea().inputValue().catch(() => null) });
      await page.screenshot({ path: path.join(outputDir, `stall-${target.kind}-${marker}.png`) }).catch(() => undefined);
      await saveEvidence();
      throw Object.assign(new Error(`The message "${marker}" did not start a turn (a lost send)`), { details: { frames } });
    }
  };
  const center = async () => { const box = await primary().boundingBox(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; };
  /** Stops the run (one Stop) and waits for the status to leave Running: the clean end of a case. */
  const settle = async () => {
    for (let i = 0; i < 3 && (await primary().getAttribute('aria-label')) === STOP; i += 1) { await primary().click().catch(() => undefined); await sleep(1500); }
    await until('Stop gone', async () => ![STOP, STOPPING].includes(await primary().getAttribute('aria-label')), 30_000).catch(() => undefined);
    await sleep(800);
  };
  /** What the page and the node did since `from` (log index) and `since` (time). */
  const observed = async (from, since) => {
    const frames = wire.since(from);
    const trace = await readStopTrace(page, since);
    const stops = frames.filter((f) => f.dir === 'up' && f.type === 'INTERRUPT_GENERATION');
    const answer = (a) => [a.state, a.code].filter(Boolean).join(':');
    const ofStop = (f) => f.type === 'AGENT_COMMAND_ACK' && f.commandType === 'INTERRUPT_GENERATION';
    return { stops: stops.length, acks: frames.filter((f) => f.dir === 'down' && ofStop(f)).map(answer),
      nodeAnswers: frames.filter((f) => f.dir === 'node' && ofStop(f)).map(answer), toasts: trace.toasts.map(([, t]) => t), button: trace.button.map(([at, label, busy, enabled]) => [at - since, label, busy, enabled]) };
  };
  const sawStopping = (button) => button.some(([, label, busy, enabled]) => label === STOPPING && busy && !enabled);
  const endsOff = (button) => { const last = button.at(-1); return Boolean(last) && ![STOP, STOPPING].includes(last[1]); };
  /** After the press, the button never offered the stale Stop again before the status left Running. */
  const neverStaleStop = (button) => !button.some(([, label, , enabled]) => label === STOP && enabled);

  for (const [doubleId, staleId, lossId, failId, kind] of [['SGD-01', 'SGD-03', 'SGD-05', 'SGD-07', 'agent'], ['SGD-02', 'SGD-04', 'SGD-06', 'SGD-08', 'team']]) {
    const target = targets[kind];
    if (selected && ![doubleId, staleId, lossId, failId].some((id) => selected.has(id))) continue;
    await open(target);
    // The first message starts the run's runtime.
    await until('first send', async () => { await textarea().fill('hello'); await sleep(300); return primary().isEnabled(); }, 60_000);
    await primary().click();
    await sleep(4000);

    await runCase(doubleId, async () => {
      const rounds = {};
      for (const [index, gap] of gaps.entries()) {
        // A gap given more than once is one round each.
        const key = gaps.indexOf(gap) === index ? `gap${gap}` : `gap${gap}#${index}`;
        await holdTurn(target, `${doubleId}-${key}`);
        const from = wire.log.length; const since = Date.now();
        const point = await center();
        await page.mouse.click(point.x, point.y);
        await sleep(Math.max(0, gap - (Date.now() - since)));
        // A user's second press lands where the button was, whatever it shows now.
        await page.mouse.click(point.x, point.y);
        const secondAt = Date.now() - since;
        await sleep(2500 + 2 * latencyMs);
        await until('the status left Running', async () => ![STOP, STOPPING].includes(await primary().getAttribute('aria-label')), 30_000).catch(() => undefined);
        await sleep(300);
        const seen = await observed(from, since);
        const secondLabel = [...seen.button].reverse().find(([at]) => at <= secondAt)?.[1] ?? null;
        rounds[key] = { ...seen, secondAt, secondLabel };
        await page.screenshot({ path: path.join(outputDir, `${doubleId}-${key.replace('#', '-')}.png`) });
      }
      const bad = Object.entries(rounds).filter(([, r]) => r.stops !== 1 || r.acks.join() !== 'accepted' || r.toasts.length || !sawStopping(r.button) || !endsOff(r.button));
      assert(!bad.length, 'every double press: one Stop sent, answered accepted, "Stopping…" seen, then not Running, no toast', { bad: Object.fromEntries(bad), rounds });
      return { rounds };
    });

    await runCase(staleId, async () => {
      await holdTurn(target, `${staleId}`);
      wire.extraToPageMs = 1500 + latencyMs;
      const other = await otherWindowStop(target);
      const from = wire.log.length; const since = Date.now();
      const label = await primary().getAttribute('aria-label');
      await primary().click();
      await sleep(4000 + 2 * latencyMs);
      await until('the status left Running', async () => ![STOP, STOPPING].includes(await primary().getAttribute('aria-label')), 30_000).catch(() => undefined);
      await sleep(300);
      const seen = await observed(from, since);
      await page.screenshot({ path: path.join(outputDir, `${staleId}.png`) });
      const details = { other, labelWhenPressed: label, ...seen };
      assert(other.state === 'accepted', 'the other window stopped the turn first', details);
      assert(label === STOP, 'this page still showed Stop (Running) after the turn ended', details);
      assert(seen.stops === 1 && seen.nodeAnswers.join() === 'accepted', 'this page\'s Stop reached a run with nothing to stop: the node answered accepted', details);
      assert(!seen.toasts.length && sawStopping(seen.button) && endsOff(seen.button), 'no toast; "Stopping…" until the status arrived', details);
      return details;
    });

    await runCase(lossId, async () => {
      // (a) The Stop reached the node; the answer is lost with the connection.
      await holdTurn(target, `${lossId}-a`);
      wire.dropAfterNextStop = true;
      let from = wire.log.length; let since = Date.now();
      await primary().click();
      await sleep(300);
      const duringDrop = await primary().getAttribute('aria-label');
      await primary().click({ force: true, timeout: 2000 }).catch(() => undefined); // a press while Stopping
      await until('rebind', async () => wire.since(from).some((f) => f.type === 'DROPPED') && ![STOP, STOPPING].includes(await primary().getAttribute('aria-label')), 30_000).catch(() => undefined);
      await sleep(500);
      const a = { duringDrop, ...(await observed(from, since)), frames: wire.since(from).map((f) => `${f.at - since} ${f.dir} ${f.type}${f.state ? ` ${f.state}` : ''}${f.status ? ` ${f.status}` : ''}${f.note ? ` (${f.note})` : ''}`) };
      const dropAt = (wire.since(from).find((f) => f.type === 'DROPPED')?.at ?? since) - since;
      const reboundAt = (a.button.find(([at, label]) => at > dropAt && label !== STOPPING)?.[0]) ?? null;
      a.dropAt = dropAt; a.reboundAt = reboundAt;
      a.stoppingAcrossDrop = a.button.filter(([at]) => at > dropAt && (reboundAt === null || at < reboundAt)).every(([, label]) => label === STOPPING);
      await page.screenshot({ path: path.join(outputDir, `${lossId}-a.png`) });

      // (b) The Stop is lost on the way; after the rebind the run still runs.
      await holdTurn(target, `${lossId}-b`);
      wire.loseNextStop = true;
      from = wire.log.length; since = Date.now();
      await primary().click();
      await sleep(300);
      const duringLoss = await primary().getAttribute('aria-label');
      await until('Stop offered again', async () => wire.since(from).some((f) => f.type === 'DROPPED') && (await primary().getAttribute('aria-label')) === STOP && primary().isEnabled(), 30_000).catch(() => undefined);
      await sleep(300);
      const b = { duringLoss, ...(await observed(from, since)) };
      b.stillRunning = (await primary().getAttribute('aria-label')) === STOP;
      await page.screenshot({ path: path.join(outputDir, `${lossId}-b-offered-again.png`) });
      const fromAgain = wire.log.length; const sinceAgain = Date.now();
      await primary().click();
      await sleep(2500 + 2 * latencyMs);
      await until('the status left Running', async () => ![STOP, STOPPING].includes(await primary().getAttribute('aria-label')), 30_000).catch(() => undefined);
      const again = await observed(fromAgain, sinceAgain);
      const details = { a, b, again };
      assert(a.duringDrop !== STOP && sawStopping(a.button) && neverStaleStop(a.button) && endsOff(a.button),
        '(a) "Stopping…" after the drop and never the stale Stop again; then the run\'s status (not Running) decides', details);
      assert(a.stops === 1 && !a.toasts.length, '(a) one Stop sent (a press while Stopping sends nothing); no toast', details);
      assert(b.duringLoss === STOPPING && b.stillRunning && b.stops === 1 && !b.toasts.length, '(b) the Stop lost: after the rebind Stop is offered again; no toast', details);
      assert(again.stops === 1 && again.acks.join() === 'accepted' && !again.toasts.length && endsOff(again.button), '(b) a new Stop stops the run', details);
      return details;
    });

    await runCase(failId, async () => {
      // (a) Not connected: the path drops while the run works; the user presses Stop if the page offers it.
      await holdTurn(target, `${failId}-a`);
      let from = wire.log.length; let since = Date.now();
      wire.cut('the page\'s path is down');
      await sleep(250);
      const offered = { label: await primary().getAttribute('aria-label'), enabled: await primary().isEnabled() };
      // The button can change between reading it and the press (a status arriving): a press on a disabled button is none.
      if (offered.label === STOP && offered.enabled) offered.pressed = await primary().click({ timeout: 2000 }).then(() => true, () => false);
      await sleep(1500);
      const a = { offered, ...(await observed(from, since)) };
      await page.screenshot({ path: path.join(outputDir, `${failId}-a-not-sent.png`) });
      // (a2) Not connected: the user opens the working run while the path is down (it shows Running until its stream
      // binds) and presses Stop.
      await open(targets[kind === 'agent' ? 'team' : 'agent']);
      from = wire.log.length; since = Date.now();
      await open(target);
      const offeredOnOpen = { label: await primary().getAttribute('aria-label'), enabled: await primary().isEnabled() };
      if (offeredOnOpen.label === STOP && offeredOnOpen.enabled) offeredOnOpen.pressed = await primary().click({ timeout: 2000 }).then(() => true, () => false);
      await sleep(1500);
      const a2 = { offeredOnOpen, ...(await observed(from, since)) };
      await page.screenshot({ path: path.join(outputDir, `${failId}-a2-opened-not-sent.png`) });
      const upAt = Date.now();
      wire.up();
      // This run's own stream back, with its status.
      const ownPath = target.kind === 'agent' ? `/ws/agent/${target.runId}` : `/ws/agent-team/${target.teamRunId}`;
      await until('this run\'s stream rebound', async () => wire.log.some((f) => f.at >= upAt && f.dir === 'down' && f.url === ownPath && /STATUS|SNAPSHOT/.test(f.type)), 60_000).catch(() => undefined);
      await sleep(1000);
      await settle();
      // (b) The node's answer is a refusal.
      await holdTurn(target, `${failId}-b`);
      wire.refuseStops = true;
      from = wire.log.length; since = Date.now();
      await primary().click();
      await sleep(1500 + 2 * latencyMs);
      const b = { ...(await observed(from, since)), after: { label: await primary().getAttribute('aria-label'), enabled: await primary().isEnabled() } };
      // The name the view shows for the agent: its header (the center pane's first lines).
      b.viewHeader = (await page.locator(SCOPE).innerText()).split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 3).join(' | ');
      // Where the view shows that name: the run's header (a Team member) or the Workspaces tree (an agent run's header shows
      // the run's title; its agent's name is its row in the tree).
      b.nameShownAt = await page.evaluate((name) => [...document.querySelectorAll('[data-test="workspace-center-pane"] *, [data-test="workspace-agent-row"] *, [data-test^="workspace-team-row"] *')]
        .filter((el) => el.children.length === 0 && el.textContent.trim() === name && el.getBoundingClientRect().width > 0).map((el) => el.closest('[data-test]')?.getAttribute('data-test') ?? el.tagName).slice(0, 3),
      /^Could not stop (.+)\. Please try again\.$/.exec((await readStopTrace(page, since)).toasts[0]?.[1] ?? '')?.[1] ?? '');
      b.named = /^Could not stop (.+)\. Please try again\.$/.exec(b.toasts[0] ?? '')?.[1] ?? null;
      await page.screenshot({ path: path.join(outputDir, `${failId}-b-refused.png`) });
      wire.refuseStops = false;
      await settle();
      const details = { a, a2, b };
      const notSent = (x, offeredState) => x.stops === 0 && (offeredState.pressed
        ? x.toasts.length === 1 && x.toasts[0] === NOT_SENT
        : x.toasts.length === 0);
      assert(notSent(a, a.offered), '(a) path down: nothing sent; one plain "not sent" message when Stop could be pressed, else nothing to press', details);
      assert(notSent(a2, a2.offeredOnOpen), '(a2) opened while not connected: nothing sent; one plain "not sent" message when Stop could be pressed', details);
      assert([a.offered, a2.offeredOnOpen].some((o) => o.pressed), '(a, a2) Stop pressed while not connected at least once', details);
      assert(b.stops === 1 && b.toasts.length === 1 && b.named && b.toasts[0] === couldNotStop(b.named) && b.nameShownAt.length > 0,
        '(b) one plain message naming the agent as the view shows it', details);
      const words = [...a.toasts, ...a2.toasts, ...b.toasts].flatMap((t) => internalWords(t, target.runIds));
      assert(!words.length, 'no run id or internal words in the messages', { ...details, words });
      assert(b.after.label === STOP && b.after.enabled, '(b) the refusal ends Stopping; the run still works: Stop offered again', details);
      return details;
    });
  }
  evidence.result = Object.values(evidence.cases).length && Object.values(evidence.cases).every((c) => c.result === 'Pass') && !evidence.browserErrors.length ? 'Pass' : 'Fail';
} catch (error) {
  evidence.failure = String(error?.stack ?? error);
  console.error(error);
} finally {
  await browser?.close().catch(() => undefined);
  evidence.cleanup.frontend = await stopGroup(stack.frontend).catch((e) => `error ${e.message}`);
  evidence.cleanup.backend = await stopGroup(stack.backend).catch((e) => `error ${e.message}`);
  if (stack.dataRoot) { await fsp.rm(stack.dataRoot, { recursive: true, force: true }).catch(() => undefined); evidence.cleanup.dataRootRemoved = !fs.existsSync(stack.dataRoot); }
  evidence.wireLog = wire.log.map((f) => ({ ...f, at: new Date(f.at).toISOString() }));
  await saveEvidence();
  console.log(`[stop-generation] result ${evidence.result}; evidence ${outputDir}`);
  process.exitCode = evidence.result === 'Pass' ? 0 : 1;
}

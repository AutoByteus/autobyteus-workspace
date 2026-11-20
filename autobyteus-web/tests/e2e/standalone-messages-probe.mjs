#!/usr/bin/env node
// Browser + server probe for the Messages of a standalone run on the desktop (autobyteus-565): what the owner sees in the
// window's right panel, against test-owned servers built from this worktree (the scripted AGY CLI, no model).
//
// Servers: alpha (the window's node) and beta, switched on and paired by invite (alpha calls beta "beta-node"), each with
// the probe's launch owner credential (fixtures/probe-node-access.mjs). Alpha: the agent "Project Task Manager" (the PM), a
// "Worker" it delegates to, a "Neighbour" run a person started (unrelated to the PM) and a "Quiet" run that never messages.
// Beta: its own "Project Task Manager". Every message is an agent's own `send_message_to` (`CALL_TOOL`/`CALL_TOOLS`):
//   - the PM's task agent reports to it (form 2, a Task-related run);
//   - the Neighbour messages the PM (form 4, an unrelated run of this node), then 55 more (more than one page);
//   - the PM messages beta's PM with `node` (form 6, a run on another node), which answers with `node`.
// The web app runs with `nuxt dev` against alpha; the browser is Chrome through playwright-core at 1440 px.
//
// Cases:
//   SMP-01 AC-001  A standalone run that never delegated or messaged: the right panel offers "Messages" and opens on
//                  Activity (DEC-001, DEC-003); Messages says "No messages yet".
//   SMP-02 AC-002, AC-004  The PM's Messages: newest 50 first with "Load more"; Load more brings the rest; then every stored
//                  message is a row, once, newest first: its task agent's report, the Neighbour's (no chip) and beta's PM's
//                  (the chip "beta-node"); the participant details name beta's PM and its node.
//   SMP-03 AC-003  With the list open, beta's PM answers and the Neighbour writes: both rows appear without a reload, once
//                  (the remote one with its chip).
//   SMP-04 AC-004  A reload brings the newest page again; "Load more" while a new message arrives: the new row once, every
//                  stored message shown once.
//
// Prerequisite: `pnpm -C autobyteus-server-ts build`. Run: `pnpm -C autobyteus-web test:e2e:standalone-messages`
// (`--output-dir=<dir>`, `--browser-executable=<path>`). About 4 minutes.
import { createWriteStream, existsSync, mkdtempSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { attachToBrowserContext, ownerHeaders, ownerSocketUrl, pairNodes, probeNodeEnvironment } from './fixtures/probe-node-access.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serverDir = path.join(path.dirname(webDir), 'autobyteus-server-ts');
const appEntry = path.join(serverDir, 'dist', 'app.js');
const agyCli = path.join(serverDir, 'tests', 'fixtures', 'agy-failure-cli.mjs');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/standalone-messages'));
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const MODEL = 'gemini-3.8-flash-low';
const NODE = 'beta-node';
const PAGE = 50;
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', node: process.version, servers: {}, runs: {}, cases: {}, browserErrors: [], cleanup: {}, error: null };
const assert = (condition, message, details) => { if (!condition) throw Object.assign(new Error(message), { details }); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (description, fn, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try { const value = await fn(); if (value) return value; } catch (error) { lastError = error; }
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
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'standalone-messages-')));
const children = new Set();
const frontendPort = await freePort();
const frontendUrl = `http://127.0.0.1:${frontendPort}`;

const serverAt = async (name) => {
  const port = await freePort();
  const dataDir = path.join(root, name, 'data');
  const home = path.join(root, name, 'home');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(home, { recursive: true });
  const baseUrl = `http://127.0.0.1:${port}`;
  await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\nHTTP_ACCESS_LOG_MODE=off\n`);
  const log = createWriteStream(path.join(outputDir, `server-${name}.log`), { flags: 'a' });
  const child = spawn(process.execPath, [appEntry, '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
    cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', HTTP_ACCESS_LOG_MODE: 'off',
      AUTOBYTEUS_SERVER_HOST: baseUrl, AUTOBYTEUS_ALLOWED_ORIGINS: frontendUrl, ANTIGRAVITY_CLI_COMMAND: agyCli, AGY_FAKE_CASE: 'linked_skills', ...probeNodeEnvironment() } });
  child.stdout.pipe(log); child.stderr.pipe(log);
  child.once('close', () => log.end());
  children.add(child);
  await waitFor(`${name} health`, async () => {
    if (exited(child)) throw new Error(`${name} exited ${child.exitCode}`);
    return fetch(`${baseUrl}/rest/health`).then(response => response.ok).catch(() => false);
  }, 120_000);
  const nodeId = (await (await fetch(`${baseUrl}/rest/remote-access/status`)).json()).nodeId;
  evidence.servers[name] = { port, nodeId };
  const gql = async (query, variables) => {
    const body = await (await fetch(`${baseUrl}/graphql`, { method: 'POST', headers: ownerHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ query, variables }) })).json();
    if (body.errors?.length) throw new Error(`${name}: ${JSON.stringify(body.errors)}`);
    return body.data;
  };
  return { name, port, baseUrl, dataDir, nodeId, gql };
};
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const sendMessages = (target, contents, node) => `CALL_TOOLS:${JSON.stringify(contents.map((content, index) => ({ name: 'send_message_to',
  arguments: { target_agent_run_id: target, content, ...(node ? { node } : {}) }, delayMs: index * 30 })))}`;

let frontend, browser;
await fs.mkdir(outputDir, { recursive: true });
try {
  assert(existsSync(appEntry), 'Build the worktree server first: pnpm -C autobyteus-server-ts build');
  const [alpha, beta] = await Promise.all([serverAt('alpha'), serverAt('beta')]);
  for (const node of [alpha, beta]) await node.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
  await pairNodes({ inviter: beta.gql, accepter: alpha.gql, inviterName: NODE, accepterName: 'alpha-node' });
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
  const def = async (node, name) => (await node.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
    { i: { name, role: 'assistant', description: `${name} (Messages probe)`, instructions: 'Help.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  const defs = { pm: await def(alpha, 'Project Task Manager'), worker: await def(alpha, 'Worker'), neighbour: await def(alpha, 'Neighbour'), quiet: await def(alpha, 'Quiet'),
    betaPm: await def(beta, 'Project Task Manager') };
  const workspaceOf = async (node) => { const dir = path.join(root, node.name, 'workspace'); await fs.mkdir(dir, { recursive: true }); return dir; };
  const alphaWorkspace = await workspaceOf(alpha), betaWorkspace = await workspaceOf(beta);
  const createRun = async (node, agentDefinitionId, workspaceRootPath) => {
    const r = (await node.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}',
      { i: { agentDefinitionId, workspaceRootPath, autoExecuteTools: true, ...agy } })).createAgentRun;
    assert(r.success, r.message);
    return r.runId;
  };
  const conversation = async (node, runId) => JSON.stringify((await node.gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
  /** The owner's message to a run (a second window's socket); waits until the run's answer count grows. */
  const say = async (node, runId, content, marker = 'CALLED') => {
    const count = async () => (await conversation(node, runId)).split(marker).length;
    const before = await count();
    const socket = new WebSocket(ownerSocketUrl(`${node.baseUrl.replace('http', 'ws')}/ws/agent/${runId}`));
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    await sleep(300);
    const id = randomUUID();
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `agent_run_input:probe:${id}`, context_file_paths: [], image_urls: [], agent_run_id: runId, content } }));
    await sleep(600);
    socket.close();
    await waitFor(`${runId} answered`, async () => (await count()) > before, 120_000);
  };
  const page1 = async (node, runId, before = null) => (await node.gql('query($k:String!,$r:String!,$a:String!,$b:JSON){collaborationParticipantMessages(rootKind:$k,rootRunId:$r,agentRunId:$a,before:$b)}',
    { k: 'agent', r: runId, a: runId, b: before })).collaborationParticipantMessages;
  const stored = async (node, runId) => {
    const all = [];
    for (let before = null; ;) {
      const page = await page1(node, runId, before);
      all.push(...page.messages);
      if (!page.hasMore) return all;
      before = { createdAt: page.messages.at(-1).createdAt, messageId: page.messages.at(-1).messageId };
    }
  };

  const pm = await createRun(alpha, defs.pm, alphaWorkspace);
  const neighbour = await createRun(alpha, defs.neighbour, alphaWorkspace);
  const quiet = await createRun(alpha, defs.quiet, alphaWorkspace);
  const betaPm = await createRun(beta, defs.betaPm, betaWorkspace);
  await say(alpha, quiet, 'Hello.', '"OK"');
  await say(beta, betaPm, 'Hello.', '"OK"');
  // Form 2: the PM's task agent reports to it (its first message is the PM's description, a tool call).
  await say(alpha, pm, callTool('delegate_task', { recipient_address: '/worker',
    description: callTool('send_message_to', { target_agent_run_id: pm, content: 'WORKER-REPORT-565: the draft is ready.' }) }));
  await waitFor('the task agent\'s report stored', async () => (await stored(alpha, pm)).some(m => m.content.startsWith('WORKER-REPORT-565')), 120_000);
  // Form 4 and 6, then 55 more from the Neighbour (more than one page).
  await say(alpha, neighbour, callTool('send_message_to', { target_agent_run_id: pm, content: 'NEIGHBOUR-NOTE-565 from the next run.' }));
  await say(alpha, pm, callTool('send_message_to', { node: NODE, target_agent_run_id: betaPm, content: 'PM-A-TO-B-565: how is the Linux side?' }));
  await say(alpha, neighbour, sendMessages(pm, Array.from({ length: 55 }, (_, i) => `BULK-${String(i + 1).padStart(2, '0')}`)), 'CALLED_ALL');
  await waitFor('every bulk message stored', async () => (await stored(alpha, pm)).filter(m => m.content.startsWith('BULK-')).length === 55, 120_000);
  evidence.runs = { pm, neighbour, quiet, betaPm, storedAtStart: (await stored(alpha, pm)).length };

  // The web app against alpha.
  const frontendLog = createWriteStream(path.join(outputDir, 'frontend.log'));
  frontend = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], { cwd: webDir, detached: true,
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: alpha.baseUrl } });
  frontend.stdout.pipe(frontendLog); frontend.stderr.pipe(frontendLog);
  await waitFor('frontend', async () => {
    if (exited(frontend)) throw new Error(`frontend exited ${frontend.exitCode}`);
    return fetch(frontendUrl).then(response => response.ok).catch(() => false);
  }, 240_000);
  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'en-US', timezoneId: 'UTC' });
  await attachToBrowserContext(context);
  await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const page = await context.newPage();
  page.on('pageerror', error => evidence.browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') evidence.browserErrors.push(`console: ${message.text()}`); });
  const shot = name => page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: false });

  /** Opens the workspace tree and selects a standalone run (its agent row unfolded). */
  const selectRun = async (agentName, runId) => {
    const workspaceRow = page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first();
    await workspaceRow.waitFor({ timeout: 180_000 });
    if (await workspaceRow.getAttribute('aria-expanded') !== 'true') await workspaceRow.locator('button').first().click();
    const agentRow = page.locator('[data-test="workspace-agent-row"]', { hasText: agentName }).first();
    await agentRow.waitFor({ timeout: 60_000 });
    if (await agentRow.getAttribute('aria-expanded') !== 'true') await agentRow.click();
    const runRow = page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${runId}"]`).first();
    await runRow.waitFor({ timeout: 60_000 });
    await runRow.click();
    // The run is selected when the URL names it; its right panel then shows that run's own tab (each standalone run keeps
    // its own choice, default Activity), so the probe lets it settle before reading or clicking a tab.
    await waitFor(`${runId} selected`, async () => new URL(page.url()).searchParams.get('id') === runId, 60_000);
    await sleep(1_500);
  };
  const tabs = async () => page.locator('[role="tab"]').evaluateAll(list => list.map(tab => ({ name: tab.textContent.trim(), selected: tab.getAttribute('aria-selected') === 'true' })));
  const openMessages = async () => {
    const tab = page.getByRole('tab', { name: 'Messages', exact: true }).first();
    await tab.waitFor({ timeout: 60_000 });
    await waitFor('the Messages tab selected', async () => {
      if (await tab.getAttribute('aria-selected') === 'true') return true;
      await tab.click();
      await sleep(500);
      return false;
    }, 30_000);
    await page.locator('[data-test="collaboration-messages-section"]').first().waitFor({ timeout: 30_000 });
  };
  const rows = () => page.locator('[data-test="collaboration-messages-section"] [data-test="team-communication-message-row"]');
  const rowFacts = () => rows().evaluateAll(list => list.map(row => ({ text: row.textContent.replace(/\s+/g, ' ').trim().slice(0, 200),
    chip: row.querySelector('[data-test="team-communication-node-chip"]')?.getAttribute('data-node-name') ?? row.querySelector('[data-test="remote-node-chip"]')?.getAttribute('data-node-name') ?? null })));
  const loadMore = () => page.locator('[data-test="collaboration-messages-load-more"]');
  // A row's marker; the PM's Task to its worker (a message whose text is the tool call that holds the report) is its own row.
  const markerOf = text => text.includes('CALL_TOOL') ? 'TASK-TO-WORKER'
    : /(BULK-\d\d|WORKER-REPORT-565|NEIGHBOUR-NOTE-565|PM-A-TO-B-565|PM-B-REPLY-565|LIVE-LOCAL-565|LIVE-DURING-MORE-565)/.exec(text)?.[1] ?? null;
  const runCase = async (id, fn) => {
    try { evidence.cases[id] = { result: 'Pass', ...(await fn()) }; }
    catch (error) { evidence.cases[id] = { result: 'Fail', error: error.message, details: error.details ?? null }; await shot(`${id}-fail`).catch(() => undefined); }
    console.log(`${id}: ${evidence.cases[id].result}${evidence.cases[id].error ? ` (${evidence.cases[id].error})` : ''}`);
  };

  await page.goto(`${frontendUrl}/workspace`, { waitUntil: 'domcontentloaded', timeout: 240_000 });

  await runCase('SMP-01', async () => {
    await selectRun('Quiet', quiet);
    await waitFor('the right panel tabs', async () => (await tabs()).some(tab => tab.name === 'Messages'), 60_000);
    const atOpen = await tabs();
    await openMessages();
    const empty = await waitFor('the empty state', async () => {
      const text = (await page.locator('[data-test="collaboration-messages-section"]').first().innerText()).replace(/\s+/g, ' ');
      return text.includes('No messages yet') ? text : null;
    }, 30_000);
    await shot('SMP-01-quiet-messages-empty');
    assert(atOpen.some(tab => tab.selected && tab.name.startsWith('Activity')) && !atOpen.some(tab => tab.selected && tab.name.startsWith('Messages')),
      'a standalone run opens on Activity (design: the default stays Activity)', atOpen);
    return { tabsAtOpen: atOpen, empty: empty.slice(0, 160) };
  });

  await runCase('SMP-02', async () => {
    await selectRun('Project Task Manager', pm);
    await openMessages();
    await waitFor('the first page', async () => (await rows().count()) === PAGE, 60_000);
    const first = await rowFacts();
    const moreShown = await loadMore().isVisible();
    await shot('SMP-02-first-page');
    await loadMore().click();
    const total = (await stored(alpha, pm)).length;
    await waitFor('every message after Load more', async () => (await rows().count()) === total, 60_000);
    const all = await rowFacts();
    await shot('SMP-02-all-loaded');
    const markers = all.map(row => markerOf(row.text));
    const storedOrder = (await stored(alpha, pm)).map(m => markerOf(m.content));
    const remoteRow = all.find(row => row.text.includes('PM-A-TO-B-565'));
    const localRows = all.filter(row => row !== remoteRow);
    const localMarkers = localRows.map(row => markerOf(row.text));
    // The participant details of beta's PM: its name and its node.
    await rows().filter({ hasText: 'PM-A-TO-B-565' }).first().click();
    await page.locator('[data-test="message-identity-toggle"]').first().click().catch(() => undefined);
    const detail = (await page.locator('[data-test="team-communication-detail-pane"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    await shot('SMP-02-remote-detail');
    assert(first.map(row => markerOf(row.text)).join() === storedOrder.slice(0, PAGE).join() && moreShown, 'the first page: the newest 50, newest first, with Load more', { first: first.map(r => r.text.slice(0, 40)), moreShown });
    assert(markers.join() === storedOrder.join() && new Set(markers).size === markers.length, 'after Load more: every stored message once, in the stored order', { markers, storedOrder });
    assert(remoteRow?.chip === NODE && localRows.every(row => row.chip === null), 'beta\'s PM with the chip, the local runs without', { remoteRow, localChips: localRows.map(r => r.chip) });
    assert(['WORKER-REPORT-565', 'NEIGHBOUR-NOTE-565', ...Array.from({ length: 55 }, (_, i) => `BULK-${String(i + 1).padStart(2, '0')}`)].every(marker => localMarkers.includes(marker)),
      'its task agent\'s report, the Neighbour\'s note and the 55 bulk messages', localMarkers);
    assert(!(await loadMore().count()), 'no Load more once everything is loaded');
    assert(detail.includes(NODE) && /project task manager/i.test(detail), 'the details name beta\'s PM and its node', detail.slice(0, 400));
    return { firstPage: first.length, total, remoteRow, detail: detail.slice(0, 300) };
  });

  await runCase('SMP-03', async () => {
    const before = await rows().count();
    await say(beta, betaPm, callTool('send_message_to', { node: 'alpha-node', target_agent_run_id: pm, content: 'PM-B-REPLY-565: the Linux side is fine.' }));
    await say(alpha, neighbour, callTool('send_message_to', { target_agent_run_id: pm, content: 'LIVE-LOCAL-565 one more note.' }));
    await waitFor('both live rows', async () => {
      const facts = await rowFacts();
      return facts.some(row => row.text.includes('PM-B-REPLY-565')) && facts.some(row => row.text.includes('LIVE-LOCAL-565'));
    }, 60_000);
    await sleep(2_000);
    const facts = await rowFacts();
    await shot('SMP-03-live');
    const reply = facts.filter(row => row.text.includes('PM-B-REPLY-565'));
    const local = facts.filter(row => row.text.includes('LIVE-LOCAL-565'));
    assert(reply.length === 1 && reply[0].chip === NODE && local.length === 1 && local[0].chip === null && facts.length === before + 2,
      'each live message once, without a reload; the remote one with its chip', { reply, local, before, after: facts.length });
    assert(markerOf(facts[0].text) === 'LIVE-LOCAL-565' && markerOf(facts[1].text) === 'PM-B-REPLY-565', 'newest first', facts.slice(0, 3));
    return { before, after: facts.length, reply: reply[0], local: local[0] };
  });

  await runCase('SMP-04', async () => {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 240_000 });
    await selectRun('Project Task Manager', pm);
    await openMessages();
    await waitFor('the newest page again', async () => (await rows().count()) === PAGE, 60_000);
    const afterReload = await rowFacts();
    const storedNow = await stored(alpha, pm);
    assert(afterReload.map(row => markerOf(row.text)).join() === storedNow.slice(0, PAGE).map(m => markerOf(m.content)).join(), 'a reload shows the newest page', afterReload.slice(0, 3));
    // Load more while a new message arrives.
    const arriving = say(alpha, neighbour, callTool('send_message_to', { target_agent_run_id: pm, content: 'LIVE-DURING-MORE-565 while loading.' }));
    await loadMore().click();
    await arriving;
    const total = (await stored(alpha, pm)).length;
    await waitFor('every message once', async () => (await rows().count()) === total, 60_000);
    await sleep(1_500);
    const facts = await rowFacts();
    await shot('SMP-04-load-more-with-live');
    const markers = facts.map(row => markerOf(row.text));
    assert(markers.filter(marker => marker === 'LIVE-DURING-MORE-565').length === 1 && new Set(markers).size === markers.length && facts.length === total,
      'the live message once, every message once', { total, rows: facts.length, duplicates: markers.filter((m, i) => markers.indexOf(m) !== i) });
    return { reloadFirst: afterReload.length, total, rows: facts.length };
  });

  evidence.result = Object.values(evidence.cases).every(entry => entry.result === 'Pass')
    && evidence.browserErrors.filter(line => !/favicon|DevTools|504 \(Outdated Optimize Dep\)|Failed to fetch dynamically imported module|error caught during app initialization/.test(line)).length === 0 ? 'Pass' : 'Fail';
  if (evidence.result !== 'Pass') process.exitCode = 1;
} catch (error) {
  evidence.error = error instanceof Error ? `${error.stack ?? error.message}${error.details ? `\n${JSON.stringify(error.details).slice(0, 2000)}` : ''}` : String(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (frontend && !exited(frontend)) {
    try { process.kill(-frontend.pid, 'SIGTERM'); } catch { /* gone */ }
    await Promise.race([new Promise(resolve => frontend.once('close', resolve)), sleep(8_000)]);
    if (!exited(frontend)) { try { process.kill(-frontend.pid, 'SIGKILL'); } catch { /* gone */ } }
  }
  for (const child of [...children]) {
    if (!exited(child)) { child.kill('SIGTERM'); await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(10_000)]); if (!exited(child)) child.kill('SIGKILL'); }
    children.delete(child);
  }
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  evidence.cleanup = { frontendExited: !frontend || exited(frontend), serversLeft: children.size, rootRemoved: !existsSync(root) };
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'standalone-messages-probe.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`standalone-messages probe: ${evidence.result}${evidence.error ? `\n${evidence.error}` : ''}`);
  process.exit(process.exitCode ?? 0);
}

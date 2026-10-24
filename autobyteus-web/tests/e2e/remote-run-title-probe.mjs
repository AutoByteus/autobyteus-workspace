#!/usr/bin/env node
// Browser + server probe for run titles in the history sidebar (autobyteus-269 SR-004, the window title rule): a run's
// stored title wins whenever it has a value; the live first user message only fills in while it is empty.
//
// Servers (`autobyteus-server-ts/dist/app.js`, own temp data roots and HOMEs, the scripted AGY CLI): alpha and beta,
// switched on and registered both ways. Alpha's standalone Delegator delegates to beta's shared Agent Publisher and to
// beta's shared Agent Team Studio Team (peer-started runs). On beta, the owner also starts two runs of Writer
// (user-started): one plain message, one skill-tagged message (the window's "Use the X skill for this request." form).
// The web app runs with `nuxt dev` against beta; the browser is Chrome through playwright-core.
//
// Cases: RRT-01 the stored titles on beta's server; RRT-02 every row while active (peer-started rows show the delegated
// description, not the packet wrapper; user-started rows read as before, the skill-tagged one without its prefix);
// RRT-03 the same after a reload; RRT-04 the owner messages the peer-started Agent run: its row keeps the description;
// RRT-05 the owner messages the peer-started Team's coordinator: the Team row (recorded; SR-004 says Team rows keep the
// stored title); RRT-06 the skill-tagged run stopped, then after a reload: still without the prefix.
//
// Prerequisite: `pnpm -C autobyteus-server-ts build`. Run: `pnpm -C autobyteus-web test:e2e:remote-run-title`
// (`--output-dir=<dir>`, `--browser-executable=<path>`). About 2 minutes.
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
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/remote-run-title'));
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const MODEL = 'gemini-3.8-flash-low';
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', node: process.version, servers: {}, runs: {}, storedTitles: {}, cases: {}, browserErrors: [], cleanup: {}, error: null };
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
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'remote-run-title-')));
const children = new Set();

const startServer = async (name, port) => {
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
      AUTOBYTEUS_SERVER_HOST: baseUrl, ANTIGRAVITY_CLI_COMMAND: agyCli, AGY_FAKE_CASE: 'linked_skills' } });
  child.stdout.pipe(log); child.stderr.pipe(log);
  child.once('close', () => log.end());
  children.add(child);
  await waitFor(`${name} health`, async () => {
    if (exited(child)) throw new Error(`${name} exited ${child.exitCode}`);
    return fetch(`${baseUrl}/rest/health`).then(response => response.ok).catch(() => false);
  }, 120_000);
  const nodeId = (await (await fetch(`${baseUrl}/rest/remote-access/status`)).json()).nodeId;
  const gql = async (query, variables) => {
    const body = await (await fetch(`${baseUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json();
    if (body.errors?.length) throw new Error(`${name}: ${JSON.stringify(body.errors)}`);
    return body.data;
  };
  evidence.servers[name] = { port, nodeId };
  return { name, port, baseUrl, nodeId, dataDir, child, gql };
};
/** The owner's composer message to a standalone run, as the window sends it (WebSocket SEND_MESSAGE). */
const sendToRun = async (server, runId, content) => {
  const socket = new WebSocket(`${server.baseUrl.replace('http', 'ws')}/ws/agent/${runId}`);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  await sleep(500);
  const id = `rrt-${randomUUID()}`;
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `agent_run_input:rrt:${id}`, context_file_paths: [], image_urls: [], agent_run_id: runId, content } }));
  await sleep(800);
  socket.close();
};
const conversationText = async (server, runId) => JSON.stringify((await server.gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);

let frontend, browser;
await fs.mkdir(outputDir, { recursive: true });
try {
  assert(existsSync(appEntry), 'Build the worktree server first: pnpm -C autobyteus-server-ts build');
  const [alpha, beta] = await Promise.all([startServer('alpha', await freePort()), startServer('beta', await freePort())]);
  for (const node of [alpha, beta]) await node.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
  await alpha.gql('mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { baseUrl: beta.baseUrl, name: 'beta-node' } });
  await beta.gql('mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { baseUrl: alpha.baseUrl, name: 'alpha-node' } });
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
  const def = async (node, name, defaultLaunchConfig) => (await node.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
    { i: { name, role: 'assistant', description: `${name} (title probe)`, instructions: 'Help.', toolNames: [], ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id;
  const delegatorDef = await def(alpha, 'Delegator');
  const publisherDef = await def(beta, 'Publisher', agy);
  const writerDef = await def(beta, 'Writer', agy);
  await beta.gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: 'Studio Team', description: 'Studio Team (title probe)',
    instructions: 'Work together.', coordinatorMemberName: 'lead', defaultLaunchConfig: agy, nodes: [{ memberName: 'lead', ref: publisherDef, refScope: 'SHARED' }] } });
  const createRun = async (node, definitionId, workspaceRootPath) => {
    const run = (await node.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}',
      { i: { agentDefinitionId: definitionId, workspaceRootPath, autoExecuteTools: true, ...agy } })).createAgentRun;
    assert(run.success, run.message);
    return run.runId;
  };
  const alphaWorkspace = path.join(root, 'alpha', 'workspace');
  const betaWorkspace = path.join(root, 'beta', 'workspace');
  await fs.mkdir(alphaWorkspace, { recursive: true }); await fs.mkdir(betaWorkspace, { recursive: true });

  // Peer-started runs on beta: alpha's Delegator calls delegate_task (the scripted CLI calls the real tool).
  const delegatorRun = await createRun(alpha, delegatorDef, alphaWorkspace);
  const delegate = async (address, description) => {
    const before = (await conversationText(alpha, delegatorRun)).split('CALLED:').length;
    await sendToRun(alpha, delegatorRun, `CALL_TOOL:${JSON.stringify({ name: 'delegate_task', arguments: { node: 'beta-node', recipient_address: address, description } })}`);
    let parts = [];
    await waitFor(`delegate_task to ${address}`, async () => (parts = (await conversationText(alpha, delegatorRun)).split('CALLED:')).length > before);
    return parts[parts.length - 1].slice(0, 1500);
  };
  const agentDescription = 'Cut the launch trailer and have it checked. Marker AGENT-TITLE.';
  const teamDescription = 'Cut the launch trailer and have it checked. Marker TEAM-TITLE.';
  const agentResult = await delegate('/publisher', agentDescription);
  const teamResult = await delegate('/studio_team', teamDescription);
  const pick = (text, key) => new RegExp(`${key}\\\\*"\\s*:\\s*\\\\*"([^"\\\\]+)`).exec(text)?.[1];
  const peerAgentRun = pick(agentResult, 'target_agent_run_id');
  const peerTeamRun = pick(teamResult, 'target_team_run_id');
  const peerCoordinator = pick(teamResult, 'target_team_coordinator_agent_run_id');
  assert(peerAgentRun && peerTeamRun && peerCoordinator, `delegations: ${agentResult} / ${teamResult}`);
  // User-started runs on beta (the owner's own first messages).
  const plainText = 'Plan the weekly menu for the cafe. Marker PLAIN-TITLE.';
  const skillText = 'Draft a note about owls. Marker SKILL-TITLE.';
  const skillContent = `Use the writer skill for this request.\n\n${skillText}`; // the window's skill-tag form (skillRequestInstruction.compose)
  const plainRun = await createRun(beta, writerDef, betaWorkspace);
  await sendToRun(beta, plainRun, plainText);
  const skillRun = await createRun(beta, writerDef, betaWorkspace);
  await sendToRun(beta, skillRun, skillContent);
  evidence.runs = { delegatorRun, peerAgentRun, peerTeamRun, peerCoordinator, plainRun, skillRun };

  // RRT-01: the stored titles on beta's server.
  const storedTitles = async () => {
    const groups = (await beta.gql('query{listWorkspaceRunHistory(limitPerAgent:50){agentDefinitions{runs{runId summary}} teamDefinitions{runs{teamRunId summary}}}}')).listWorkspaceRunHistory;
    const titles = {};
    for (const group of groups) {
      for (const definition of group.agentDefinitions) for (const run of definition.runs) titles[run.runId] = run.summary;
      for (const definition of group.teamDefinitions) for (const run of definition.runs) titles[run.teamRunId] = run.summary;
    }
    return titles;
  };
  const expectedStored = { [peerAgentRun]: agentDescription, [peerTeamRun]: teamDescription, [plainRun]: plainText,
    [skillRun]: `Use the writer skill for this request. ${skillText}` };
  let stored = {};
  await waitFor('the stored titles', async () => { stored = await storedTitles(); return Object.entries(expectedStored).every(([id, title]) => stored[id] === title); }, 30_000)
    .catch(error => { throw new Error(`${error.message}; stored ${JSON.stringify(stored)}`); });
  evidence.storedTitles = stored;
  evidence.cases['RRT-01'] = { result: 'Pass', stored: Object.fromEntries(Object.keys(expectedStored).map(id => [id, stored[id]])) };

  // The web app against beta.
  const frontendPort = await freePort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const frontendLog = createWriteStream(path.join(outputDir, 'frontend.log'));
  frontend = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], { cwd: webDir, detached: true,
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: beta.baseUrl } });
  frontend.stdout.pipe(frontendLog); frontend.stderr.pipe(frontendLog);
  await waitFor('frontend', async () => {
    if (exited(frontend)) throw new Error(`frontend exited ${frontend.exitCode}`);
    return fetch(frontendUrl).then(response => response.ok).catch(() => false);
  }, 240_000);
  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
  await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const page = await context.newPage();
  page.on('pageerror', error => evidence.browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') evidence.browserErrors.push(`console: ${message.text()}`); });

  const agentRow = runId => page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${runId}"]`);
  const teamRow = teamRunId => page.locator(`[data-test="workspace-team-row-${teamRunId}"]`);
  const firstLine = async locator => ((await locator.count()) ? (await locator.first().innerText()).trim().split('\n')[0].trim() : null);
  /** Opens the history tree: the Workspaces panel, every workspace, every Agent group and Team group. */
  const openTree = async () => {
    await waitFor('the app shell', async () => (await page.locator('[data-test="run-target-switcher-trigger"], [data-test="workspace-history-tree-scroll"]').count()) > 0, 120_000);
    if (!(await page.locator('[data-test="workspace-history-tree-scroll"]').count())) {
      const strip = page.locator('[data-test="workspace-left-strip-workspaces"]');
      if (await strip.count()) await strip.click();
    }
    await waitFor('the history tree', async () => (await page.locator('[data-test="workspace-row"]').count()) > 0, 60_000);
    for (let pass = 0; pass < 3; pass += 1) {
      for (const selector of ['[data-test="workspace-row"]', '[data-test="workspace-agent-row"]', '[data-test^="workspace-team-definition-row-"]']) {
        for (const handle of await page.locator(selector).all()) {
          const toggle = (await handle.getAttribute('aria-expanded')) !== null ? handle : handle.locator('[aria-expanded]').first();
          if ((await toggle.count()) && (await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click().catch(() => undefined);
        }
      }
      await sleep(300);
    }
    await waitFor('every run row', async () => (await agentRow(peerAgentRun).count()) && (await agentRow(plainRun).count()) && (await agentRow(skillRun).count()) && (await teamRow(peerTeamRun).count()), 60_000);
  };
  const readRows = async () => ({ peerAgent: await firstLine(agentRow(peerAgentRun)), peerTeam: await firstLine(teamRow(peerTeamRun)),
    plain: await firstLine(agentRow(plainRun)), skill: await firstLine(agentRow(skillRun)) });
  const expectedRows = { peerAgent: agentDescription, peerTeam: teamDescription, plain: plainText, skill: skillText };
  const liveContexts = () => page.evaluate(() => [...(document.querySelector('#__nuxt')?.__vue_app__?.config?.globalProperties?.$pinia?.state?.value?.agentContexts?.runs?.keys?.() ?? [])]);

  // RRT-02: every row while the runs are active (the window holds live contexts for active runs).
  await page.goto(frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
  await openTree();
  await waitFor('rows settled', async () => JSON.stringify(await readRows()) === JSON.stringify(expectedRows), 20_000).catch(() => undefined);
  const activeRows = await readRows();
  const activeContexts = await liveContexts();
  await page.screenshot({ path: path.join(outputDir, 'RRT-02-rows-active.png'), fullPage: true });
  assert(JSON.stringify(activeRows) === JSON.stringify(expectedRows), `rows while active: ${JSON.stringify(activeRows)}`);
  evidence.cases['RRT-02'] = { result: 'Pass', rows: activeRows, liveContexts: activeContexts };

  // RRT-03: after a reload.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openTree();
  await waitFor('rows settled after reload', async () => JSON.stringify(await readRows()) === JSON.stringify(expectedRows), 20_000).catch(() => undefined);
  const reloadRows = await readRows();
  assert(JSON.stringify(reloadRows) === JSON.stringify(expectedRows), `rows after reload: ${JSON.stringify(reloadRows)}`);
  evidence.cases['RRT-03'] = { result: 'Pass', rows: reloadRows, liveContexts: await liveContexts() };

  // RRT-04: the owner messages the peer-started Agent run through the composer; its row keeps the description.
  // The run's own view (not the start surface's chat box): wait until its conversation shows, then use its composer.
  const centerPane = page.locator('[data-test="workspace-center-pane"]');
  const composer = page.locator('[data-test="workspace-center-pane"] textarea:visible').last();
  const sendButton = page.locator('[data-test="workspace-center-pane"] button[aria-label="Send message"]:not([data-test="chat-primary-action"]):visible').last();
  const ownerSends = async (marker, text) => {
    await waitFor(`the run view (${marker})`, async () => (await centerPane.innerText()).includes(marker), 60_000);
    await composer.fill(text);
    await waitFor('Send enabled', async () => (await sendButton.count()) > 0 && await sendButton.isEnabled(), 15_000);
    await sendButton.click();
  };
  await agentRow(peerAgentRun).click();
  await ownerSends('Marker AGENT-TITLE', 'Owner of beta: how is it going? Marker OWNER-AGENT.');
  await waitFor('the owner message reached the run', async () => (await conversationText(beta, peerAgentRun)).includes('OWNER-AGENT'), 60_000);
  await sleep(2_000);
  const afterOwnerAgent = await readRows();
  const header = (await centerPane.innerText()).trim().split('\n').slice(0, 3);
  await page.screenshot({ path: path.join(outputDir, 'RRT-04-after-owner-message-agent.png'), fullPage: true });
  assert(afterOwnerAgent.peerAgent === agentDescription, `the peer-started Agent row after an owner message: ${afterOwnerAgent.peerAgent}`);
  evidence.cases['RRT-04'] = { result: 'Pass', rows: afterOwnerAgent, centerPaneTop: header, storedAfter: (await storedTitles())[peerAgentRun] };

  // RRT-05: the owner messages the peer-started Team's coordinator; the Team row (SR-004: Team rows keep the stored title).
  await teamRow(peerTeamRun).click();
  // Every text the Team row shows from the send until 6 s later (a transient retitle would show here).
  const teamRowSeen = [];
  const sampling = (async () => {
    await waitFor('the owner send started', async () => teamRowSampling, 60_000);
    const until = Date.now() + 6_000;
    while (Date.now() < until) {
      const text = await firstLine(teamRow(peerTeamRun)).catch(() => null);
      if (text && teamRowSeen[teamRowSeen.length - 1]?.text !== text) teamRowSeen.push({ atMs: 6_000 - (until - Date.now()), text });
      await sleep(100);
    }
  })();
  let teamRowSampling = false;
  const ownerSendsSampled = async () => {
    await waitFor('the run view (Marker TEAM-TITLE)', async () => (await centerPane.innerText()).includes('Marker TEAM-TITLE'), 60_000);
    await composer.fill('Owner of beta: status of the trailer? Marker OWNER-TEAM.');
    await waitFor('Send enabled', async () => (await sendButton.count()) > 0 && await sendButton.isEnabled(), 15_000);
    teamRowSampling = true;
    await sendButton.click();
  };
  await ownerSendsSampled();
  await sampling;
  await waitFor('the owner message reached the coordinator', async () => JSON.stringify((await beta.gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}',
    { id: peerTeamRun, a: peerCoordinator })).getTeamMemberRunProjection?.conversation ?? []).includes('OWNER-TEAM'), 60_000);
  await sleep(2_000);
  const afterOwnerTeam = await readRows();
  await page.screenshot({ path: path.join(outputDir, 'RRT-05-after-owner-message-team.png'), fullPage: true });
  const transient = teamRowSeen.filter(entry => entry.text !== teamDescription);
  evidence.cases['RRT-05'] = { result: afterOwnerTeam.peerTeam === teamDescription && transient.length === 0 ? 'Pass' : 'Fail', rows: afterOwnerTeam, teamRowSeen,
    storedAfter: (await storedTitles())[peerTeamRun] };

  // RRT-06: the skill-tagged user-started run stopped, then after a reload: without the prefix.
  const stop = page.locator(`[data-test="terminate-agent-run"][data-run-id="${skillRun}"]`);
  // The window's terminate request must finish before the reload below (a reload would abort it in flight).
  const terminateAnswered = page.waitForResponse(response => response.request().method() === 'POST'
    && /terminate/i.test(response.request().postData() ?? ''), { timeout: 30_000 }).then(response => response.status());
  if (await stop.count()) await stop.click();
  else await agentRow(skillRun).locator('xpath=..').locator('button[title="Terminate run"], button[aria-label="Terminate run"]').first().click();
  await waitFor('the skill run stopped', async () => {
    const groups = (await beta.gql('query{listWorkspaceRunHistory(limitPerAgent:50){agentDefinitions{runs{runId isActive}}}}')).listWorkspaceRunHistory;
    return groups.flatMap(group => group.agentDefinitions.flatMap(definition => definition.runs)).some(run => run.runId === skillRun && run.isActive === false);
  }, 30_000);
  const terminateStatus = await terminateAnswered;
  const stoppedRow = await firstLine(agentRow(skillRun));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openTree();
  const stoppedAfterReload = await firstLine(agentRow(skillRun));
  assert(stoppedRow === skillText && stoppedAfterReload === skillText, `the stopped skill run: ${stoppedRow} / ${stoppedAfterReload}`);
  evidence.cases['RRT-06'] = { result: 'Pass', terminateStatus, stoppedRow, stoppedAfterReload, liveContexts: await liveContexts() };
  await page.screenshot({ path: path.join(outputDir, 'RRT-06-after-reload.png'), fullPage: true });
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
  for (const child of [...children]) {
    if (!exited(child)) { child.kill('SIGTERM'); await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(10_000)]); if (!exited(child)) child.kill('SIGKILL'); }
    children.delete(child);
  }
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  evidence.cleanup = { frontendExited: !frontend || exited(frontend), serversLeft: children.size, rootRemoved: !existsSync(root) };
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'remote-run-title-probe.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`remote-run-title probe: ${evidence.result}${evidence.error ? `\n${evidence.error}` : ''}`);
  process.exit(process.exitCode ?? 0);
}

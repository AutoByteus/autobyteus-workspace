#!/usr/bin/env node
// Browser + server probe for remote delegated runs in the run tree (autobyteus-278): what the delegating node's owner
// sees and does in the window, against test-owned servers built from this worktree (the scripted AGY CLI, no model).
//
// Servers: alpha (the window's node) and beta, switched on and registered both ways. Beta shares Publisher (AGY default)
// and the Agent Team "Studio Team" (lead Publisher, checker Checker; Team default AGY). Alpha has Delegator and Helper
// (AGY default), the Team "Remote Squad" (lead and mate Delegator) and the Org "Remote Org" (lead and mate Delegator).
// The delegations are the agents' own delegate_task calls:
//   - a standalone Delegator run → beta's /studio_team (a remote Team with its members);
//   - Remote Squad's lead → local /helper, then beta's /publisher, then local /helper (delegation order, CRR-001 F-001);
//   - Remote Org's lead → beta's /publisher.
// The web app runs with `nuxt dev` against alpha; the browser is Chrome through playwright-core at 1440 px.
//
// Cases: RTP-01 the standalone family (a remote Team row: node chip, title, status; its members below it, no chip);
// RTP-02 the Team family: the remote row sits between the two local copies, in delegation order; RTP-03 the Org family;
// RTP-04 the opened remote run: header chip, no ⚙ or ＋, the text-only composer's placeholder, the Files note; an owner
// message from the composer reaches the run on beta, and its answer shows live (AC-802); RTP-05 Stop on the remote row
// stops the run on beta; RTP-06 beta stopped: the row says "Couldn't reach beta-node." with Retry, the opened run says
// beta-node isn't reachable, the rest of the tree works; beta back and Retry: the title returns.
//
// Prerequisite: `pnpm -C autobyteus-server-ts build`. Run: `pnpm -C autobyteus-web test:e2e:remote-runs-in-tree`
// (`--output-dir=<dir>`, `--browser-executable=<path>`). About 3 minutes.
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
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/remote-runs-in-tree'));
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const MODEL = 'gemini-3.8-flash-low';
const NODE = 'beta-node';
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', node: process.version, servers: {}, runs: {}, cases: {}, browserErrors: [], cleanup: {}, error: null };
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
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'remote-runs-in-tree-')));
const children = new Set();

const serverAt = async (name, port) => {
  const dataDir = path.join(root, name, 'data');
  const home = path.join(root, name, 'home');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(home, { recursive: true });
  const baseUrl = `http://127.0.0.1:${port}`;
  if (!existsSync(path.join(dataDir, '.env'))) await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\nHTTP_ACCESS_LOG_MODE=off\n`);
  const node = { name, port, baseUrl, dataDir, child: null, nodeId: '' };
  node.start = async () => {
    const log = createWriteStream(path.join(outputDir, `server-${name}.log`), { flags: 'a' });
    const child = spawn(process.execPath, [appEntry, '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
      cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', HTTP_ACCESS_LOG_MODE: 'off',
        AUTOBYTEUS_SERVER_HOST: baseUrl, ANTIGRAVITY_CLI_COMMAND: agyCli, AGY_FAKE_CASE: 'linked_skills' } });
    child.stdout.pipe(log); child.stderr.pipe(log);
    child.once('close', () => log.end());
    children.add(child);
    node.child = child;
    await waitFor(`${name} health`, async () => {
      if (exited(child)) throw new Error(`${name} exited ${child.exitCode}`);
      return fetch(`${baseUrl}/rest/health`).then(response => response.ok).catch(() => false);
    }, 120_000);
    node.nodeId = (await (await fetch(`${baseUrl}/rest/remote-access/status`)).json()).serverInstanceId;
    evidence.servers[name] = { port, nodeId: node.nodeId };
  };
  node.stop = async () => {
    const child = node.child;
    if (!child || exited(child)) return;
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(15_000)]);
    if (!exited(child)) child.kill('SIGKILL');
    children.delete(child);
  };
  node.gql = async (query, variables) => {
    const body = await (await fetch(`${baseUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json();
    if (body.errors?.length) throw new Error(`${name}: ${JSON.stringify(body.errors)}`);
    return body.data;
  };
  await node.start();
  return node;
};
const withSocket = async (url, fn) => {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  await sleep(500);
  try { await fn(socket); } finally { await sleep(800); socket.close(); }
};
const callToolText = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const calledResults = text => text.split('CALLED:').slice(1);

let frontend, browser;
await fs.mkdir(outputDir, { recursive: true });
try {
  assert(existsSync(appEntry), 'Build the worktree server first: pnpm -C autobyteus-server-ts build');
  const [alpha, beta] = await Promise.all([serverAt('alpha', await freePort()), serverAt('beta', await freePort())]);
  for (const node of [alpha, beta]) await node.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
  await alpha.gql('mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { nodeId: beta.nodeId, baseUrl: beta.baseUrl, name: NODE } });
  await beta.gql('mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId}}', { i: { nodeId: alpha.nodeId, baseUrl: alpha.baseUrl, name: 'alpha-node' } });
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
  const def = async (node, name, defaultLaunchConfig) => (await node.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
    { i: { name, role: 'assistant', description: `${name} (tree probe)`, instructions: 'Help.', toolNames: [], ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id;
  const publisherDef = await def(beta, 'Publisher', agy);
  const checkerDef = await def(beta, 'Checker');
  await beta.gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: 'Studio Team', description: 'Studio Team (tree probe)',
    instructions: 'Work together.', coordinatorMemberName: 'lead', defaultLaunchConfig: agy,
    nodes: [{ memberName: 'lead', ref: publisherDef, refScope: 'SHARED' }, { memberName: 'checker', ref: checkerDef, refScope: 'SHARED' }] } });
  const delegatorDef = await def(alpha, 'Delegator');
  await def(alpha, 'Helper', agy);
  const teamDef = (await alpha.gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: 'Remote Squad', description: 'Team delegator',
    instructions: 'Follow requests.', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: delegatorDef, refScope: 'SHARED' }, { memberName: 'mate', ref: delegatorDef, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  const orgDef = (await alpha.gql('mutation($i:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id}}', { i: { name: 'Remote Org', description: 'Org delegator',
    instructions: 'Follow requests.', handoffs: [], members: [{ memberName: 'lead', ref: delegatorDef, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'mate', ref: delegatorDef, refType: 'AGENT', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
  const workspace = path.join(root, 'alpha', 'workspace');
  await fs.mkdir(workspace, { recursive: true });
  const runConfig = { workspaceRootPath: workspace, autoExecuteTools: true, ...agy };

  // Standalone delegator → beta's Studio Team.
  const standalone = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: delegatorDef, ...runConfig } })).createAgentRun;
  assert(standalone.success, standalone.message);
  const standaloneConversation = async () => JSON.stringify((await alpha.gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: standalone.runId })).getRunProjection?.conversation ?? []);
  const standaloneCall = async (args) => {
    const before = calledResults(await standaloneConversation()).length;
    await withSocket(`${alpha.baseUrl.replace('http', 'ws')}/ws/agent/${standalone.runId}`, async socket => {
      const id = randomUUID();
      socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `agent_run_input:probe:${id}`, context_file_paths: [], image_urls: [], agent_run_id: standalone.runId,
        content: callToolText('delegate_task', args) } }));
    });
    let results = [];
    await waitFor('the standalone delegation', async () => (results = calledResults(await standaloneConversation())).length > before);
    return results[results.length - 1];
  };
  const pick = (text, key) => new RegExp(`${key}\\\\*"\\s*:\\s*\\\\*"([^"\\\\]+)`).exec(text ?? '')?.[1];
  const teamTitle = 'Cut the launch trailer. Marker REMOTE-TEAM.';
  const remoteTeamResult = await standaloneCall({ node: NODE, recipient_address: '/studio_team', description: teamTitle });
  const remoteTeamRun = pick(remoteTeamResult, 'target_team_run_id');
  assert(remoteTeamRun, `standalone → Studio Team: ${remoteTeamResult}`);
  const studioTree = (await beta.gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: remoteTeamRun })).getTeamRunResumeConfig.executionTree;
  const studioMembers = JSON.stringify(studioTree).match(/"agent_run_id":"([^"]+)"/g)?.map(entry => entry.split('"')[3]) ?? [];

  // Team delegator: local copy, remote run, local copy (delegation order).
  const team = (await alpha.gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: teamDef,
    teamConfigs: [{ teamAddress: '/', ...runConfig }], memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: delegatorDef, ...runConfig },
      { memberAddress: '/mate', agentDefinitionId: delegatorDef, ...runConfig }] } })).createAgentTeamRun;
  assert(team.success, team.message);
  const teamTree = (await alpha.gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: team.teamRunId })).getTeamRunResumeConfig.executionTree;
  const leadRun = JSON.stringify(teamTree).match(/"address":"\/lead"[^}]*"agent_run_id":"([^"]+)"/)?.[1]
    ?? JSON.stringify(teamTree).match(/"agent_run_id":"(delegator_[^"]+)"/)?.[1];
  const leadConversation = async () => JSON.stringify((await alpha.gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}',
    { id: team.teamRunId, a: leadRun })).getTeamMemberRunProjection?.conversation ?? []);
  const leadCall = async (args) => {
    const before = calledResults(await leadConversation()).length;
    await withSocket(`${alpha.baseUrl.replace('http', 'ws')}/ws/agent-team/${team.teamRunId}`, async socket => {
      const id = randomUUID();
      socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `team_member_input:probe:${id}`, context_file_paths: [], image_urls: [], agent_run_id: leadRun,
        content: callToolText('delegate_task', args) } }));
    });
    let results = [];
    await waitFor('the lead\'s delegation', async () => (results = calledResults(await leadConversation())).length > before);
    return results[results.length - 1];
  };
  const localA = pick(await leadCall({ recipient_address: '/helper', description: 'Local first. Marker LOCAL-A.' }), 'target_agent_run_id');
  const agentTitle = 'Publish the draft. Marker REMOTE-AGENT.';
  const remoteAgentRun = pick(await leadCall({ node: NODE, recipient_address: '/publisher', description: agentTitle }), 'target_agent_run_id');
  const localB = pick(await leadCall({ recipient_address: '/helper', description: 'Local second. Marker LOCAL-B.' }), 'target_agent_run_id');
  assert(localA && remoteAgentRun && localB, `team delegations: ${localA} ${remoteAgentRun} ${localB}`);

  // Org delegator → beta's Publisher.
  const org = (await alpha.gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',
    { i: { agentOrgDefinitionId: orgDef, rootConfiguration: runConfig, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  assert(org.success, org.message);
  const orgTree = (await alpha.gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: org.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  const orgLead = orgTree.rootOrg.members.find(member => member.address === '/lead').agentRunId;
  const orgConversation = async () => JSON.stringify((await alpha.gql('query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}',
    { id: org.agentOrgRunId, a: orgLead, m: '/lead' })).getAgentOrgMemberRunProjection?.conversation ?? []);
  const orgBefore = calledResults(await orgConversation()).length;
  const orgTitle = 'Org work. Marker REMOTE-ORG.';
  await withSocket(`${alpha.baseUrl.replace('http', 'ws')}/ws/agent-org/${org.agentOrgRunId}`, async socket => {
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { root_subject_kind: 'agent_org', root_run_id: org.agentOrgRunId, target_agent_run_id: orgLead, command_id: randomUUID(),
      message_id: randomUUID(), dedupe_key: randomUUID(), content: callToolText('delegate_task', { node: NODE, recipient_address: '/publisher', description: orgTitle }), context_file_paths: [], image_urls: [] } }));
  });
  let orgResults = [];
  await waitFor('the org delegation', async () => (orgResults = calledResults(await orgConversation())).length > orgBefore);
  const orgRemoteRun = pick(orgResults[orgResults.length - 1], 'target_agent_run_id');
  assert(orgRemoteRun, `org delegation: ${orgResults.at(-1)}`);
  evidence.runs = { standalone: standalone.runId, remoteTeamRun, studioMembers, team: team.teamRunId, leadRun, localA, remoteAgentRun, localB, org: org.agentOrgRunId, orgLead, orgRemoteRun };

  // The web app against alpha.
  const frontendPort = await freePort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
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
  await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const page = await context.newPage();
  page.on('pageerror', error => evidence.browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') evidence.browserErrors.push(`console: ${message.text()}`); });

  const rowOf = runId => page.locator(`[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${runId}"]`);
  const rowInfo = async runId => {
    const row = rowOf(runId);
    if (!(await row.count())) return null;
    const first = row.first();
    const text = async selector => ((await first.locator(selector).count()) ? (await first.locator(selector).first().innerText()).trim() : null);
    return { chip: await text('[data-test="remote-node-chip"]'), title: await text('[data-test="workspace-remote-run-title"]'), error: await text('[data-test="workspace-remote-run-error"]'),
      checking: await text('[data-test="workspace-remote-run-checking"]'), statusDot: (await first.locator('[data-test="workspace-transient-status-dot"]').count()) > 0,
      name: (await first.innerText()).trim().split('\n')[0], ariaLabel: await first.getAttribute('aria-label') };
  };
  /** Opens the whole history tree: the Workspaces panel and every collapsed disclosure inside it. */
  const openTree = async (until) => {
    await waitFor('the app shell', async () => (await page.locator('[data-test="run-target-switcher-trigger"], [data-test="workspace-history-tree-scroll"]').count()) > 0, 120_000);
    if (!(await page.locator('[data-test="workspace-history-tree-scroll"]').count())) {
      const strip = page.locator('[data-test="workspace-left-strip-workspaces"]');
      if (await strip.count()) await strip.click();
    }
    await waitFor('the history tree', async () => (await page.locator('[data-test="workspace-row"]').count()) > 0, 60_000);
    const deadline = Date.now() + 60_000;
    let teamClickedAt = 0;
    while (Date.now() < deadline) {
      for (const handle of await page.locator('[data-test="workspace-history-tree-scroll"] [aria-expanded="false"]:not([data-test="workspace-team-run-disclosure"])').all()) await handle.click().catch(() => undefined);
      // A Team run row opens its tree (members and delegated copies) when it is opened.
      if (!(await page.locator(`[data-test="workspace-team-transient-execution-row"][data-team-run-id="${evidence.runs.team}"]`).count()) && Date.now() - teamClickedAt > 5_000) {
        // Open the Team run's tree with the disclosure nearest to its row (the disclosure toggles, so not more often than every 5 s).
        teamClickedAt = Date.now();
        await page.evaluate((teamRunId) => {
          let node = document.querySelector(`[data-test="workspace-team-row-${teamRunId}"]`);
          while (node && !node.querySelector?.('[data-test="workspace-team-run-disclosure"]')) node = node.parentElement;
          node?.querySelector('[data-test="workspace-team-run-disclosure"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }, evidence.runs.team);
      }
      await sleep(400);
      if (await until()) return;
    }
    const present = await page.locator('[data-test="workspace-team-transient-execution-row"]').evaluateAll(rows => rows.map(row => ({
      agent: row.getAttribute('data-agent-run-id'), team: row.getAttribute('data-team-run-id'), text: (row.innerText || '').slice(0, 80) })));
    evidence.treeDump = { present, tree: (await page.locator('[data-test="workspace-history-tree-scroll"]').innerText().catch(() => '')).slice(0, 3000) };
    await page.screenshot({ path: path.join(outputDir, 'tree-timeout.png'), fullPage: true });
    throw new Error('the tree rows did not appear');
  };
  const treeReady = async () => (await rowOf(remoteTeamRun).count() || await page.locator(`[data-agent-run-id="${studioMembers[0]}"]`).count())
    && await rowOf(remoteAgentRun).count() && await rowOf(localA).count() && await rowOf(localB).count() && await rowOf(orgRemoteRun).count();
  await page.goto(frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
  await openTree(treeReady);
  await waitFor('the remote titles', async () => (await rowInfo(remoteAgentRun))?.title === agentTitle && (await rowInfo(orgRemoteRun))?.title === orgTitle, 30_000).catch(() => undefined);
  await page.screenshot({ path: path.join(outputDir, 'RTP-01-03-tree.png'), fullPage: true });

  // RTP-01: the standalone family: a remote Team row and its members.
  const teamRowLocator = page.locator(`[data-test="workspace-team-transient-execution-row"][data-team-run-id="${standalone.runId}"]`).filter({ hasText: teamTitle });
  const memberRows = [];
  for (const member of studioMembers) memberRows.push({ member, present: (await page.locator(`[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${member}"]`).count()) > 0,
    chip: (await page.locator(`[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${member}"] [data-test="remote-node-chip"]`).count()) > 0 });
  const remoteTeamText = (await teamRowLocator.count()) ? (await teamRowLocator.first().innerText()).trim() : null;
  evidence.cases['RTP-01'] = { result: remoteTeamText?.includes(NODE) && remoteTeamText.includes(teamTitle) && memberRows.every(entry => entry.present && !entry.chip) ? 'Pass' : 'Fail',
    remoteTeamRow: remoteTeamText, memberRows };

  // RTP-02: the Team family keeps delegation order: local A, remote, local B.
  const order = await page.locator('[data-test="workspace-team-transient-execution-row"]').evaluateAll(rows => rows.map(row => row.getAttribute('data-agent-run-id')));
  const indexes = [localA, remoteAgentRun, localB].map(id => order.indexOf(id));
  const remoteAgent = await rowInfo(remoteAgentRun);
  evidence.cases['RTP-02'] = { result: indexes.every(index => index >= 0) && indexes[0] < indexes[1] && indexes[1] < indexes[2] && remoteAgent?.chip?.includes(NODE) && (remoteAgent?.title === agentTitle || remoteAgent?.ariaLabel?.includes(agentTitle)) ? 'Pass' : 'Fail',
    indexes, remoteAgent, localA: await rowInfo(localA) };

  // RTP-03: the Org family.
  const orgRemote = await rowInfo(orgRemoteRun);
  evidence.cases['RTP-03'] = { result: orgRemote?.chip?.includes(NODE) && orgRemote?.title === orgTitle && orgRemote.statusDot ? 'Pass' : 'Fail', orgRemote };

  // RTP-04: the opened remote run in each family: header chip, no ⚙ or ＋, the composer's placeholder, the Files note.
  const centerPane = page.locator('[data-test="workspace-center-pane"]');
  const openedView = async (runId, marker, agentName) => {
    await rowOf(runId).first().click();
    await waitFor(`the remote run view (${marker})`, async () => (await centerPane.innerText()).includes(marker)
      && ((await page.locator('[data-test="agent-workspace-title"]').count()) === 0 || (await page.locator('[data-test="agent-workspace-title"]').first().innerText()).trim().toLowerCase().includes(agentName)), 60_000);
    await sleep(800);
    const filesTab = page.getByRole('tab', { name: /^Files$/ }).first();
    if (await filesTab.count()) await filesTab.click().catch(() => undefined);
    await sleep(500);
    return {
      headerTitle: (await page.locator('[data-test="agent-workspace-title"]').count()) ? (await page.locator('[data-test="agent-workspace-title"]').first().innerText()).trim() : null,
      headerChip: (await centerPane.locator('[data-test="remote-node-chip"]').count()) > 0 ? (await centerPane.locator('[data-test="remote-node-chip"]').first().innerText()).trim() : null,
      editConfig: await page.locator('[data-test="workspace-header-edit-config"]:visible').count(),
      newRun: await page.locator('[data-test="workspace-header-new-run"]:visible').count(),
      placeholders: await centerPane.locator('textarea:visible').evaluateAll(areas => areas.map(area => area.getAttribute('placeholder'))),
      filesNote: (await page.locator('[data-test="remote-panel-note-files"]').count()) ? (await page.locator('[data-test="remote-panel-note-files"]').first().innerText()).trim() : null,
    };
  };
  const views = {
    standaloneTeamMember: await openedView(studioMembers[0], 'REMOTE-TEAM', 'lead'),
    orgAgent: await openedView(orgRemoteRun, 'REMOTE-ORG', 'publisher'),
    teamAgent: await openedView(remoteAgentRun, 'REMOTE-AGENT', 'publisher'),
  };
  await page.screenshot({ path: path.join(outputDir, 'RTP-04-opened-remote-run.png'), fullPage: true });
  const affordances = Object.fromEntries(Object.entries(views).map(([family, view]) => [family, Boolean(view.headerChip?.includes(NODE)) && view.editConfig === 0 && view.newRun === 0
    && view.placeholders.some(text => text?.startsWith('Message ') && text.endsWith(`on ${NODE}…`)) && Boolean(view.filesNote?.includes(NODE))]));
  const textarea = centerPane.locator('textarea:visible').last();
  const betaRunConversation = async runId => JSON.stringify((await beta.gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
  await textarea.fill('status? Marker OWNER-FROM-WINDOW');
  const send = page.locator('[data-test="workspace-center-pane"] button[aria-label="Send message"]:not([data-test="chat-primary-action"]):visible').last();
  await waitFor('Send enabled', async () => (await send.count()) > 0 && await send.isEnabled(), 15_000);
  await send.click();
  await waitFor('the owner message on beta', async () => (await betaRunConversation(remoteAgentRun)).includes('OWNER-FROM-WINDOW'), 30_000);
  await waitFor('the answer on beta', async () => { const text = await betaRunConversation(remoteAgentRun); return text.lastIndexOf('"OK"') > text.indexOf('OWNER-FROM-WINDOW'); }, 30_000);
  let liveAnswer = false;
  await waitFor('the message and answer in the window without a reload', async () => {
    const text = await centerPane.innerText();
    return (liveAnswer = text.includes('OWNER-FROM-WINDOW') && text.lastIndexOf('OK') > text.indexOf('OWNER-FROM-WINDOW'));
  }, 15_000).catch(() => undefined);
  await page.screenshot({ path: path.join(outputDir, 'RTP-04-after-owner-message.png'), fullPage: true });
  evidence.cases['RTP-04'] = { result: Object.values(affordances).every(Boolean) && liveAnswer ? 'Pass' : 'Fail', affordances, views, liveAnswer,
    liveNote: liveAnswer ? null : 'the answer is on beta but did not appear in the window without a reload (AC-802)' };

  // RTP-05: Stop on the remote row stops the run on beta.
  const stop = rowOf(remoteAgentRun).first().locator('[data-test="workspace-delegated-stop"]');
  const stopVisible = (await stop.count()) > 0;
  if (stopVisible) await stop.click();
  let stoppedOnBeta = false;
  await waitFor('the run stopped on beta', async () => {
    const groups = (await beta.gql('query{listWorkspaceRunHistory(limitPerAgent:50){agentDefinitions{runs{runId isActive}}}}')).listWorkspaceRunHistory;
    return (stoppedOnBeta = groups.flatMap(group => group.agentDefinitions.flatMap(definition => definition.runs)).some(run => run.runId === remoteAgentRun && run.isActive === false));
  }, 30_000).catch(() => undefined);
  evidence.cases['RTP-05'] = { result: stopVisible && stoppedOnBeta ? 'Pass' : 'Fail', stopVisible, stoppedOnBeta, rowAfter: await rowInfo(remoteAgentRun) };

  // RTP-06: beta stopped: the row and the opened run say so; the rest works; Retry after beta returns.
  await beta.stop();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openTree(async () => (await rowOf(orgRemoteRun).count()) > 0);
  let unreachable = null;
  await waitFor('the unreachable row', async () => (unreachable = await rowInfo(orgRemoteRun))?.error?.startsWith(`Couldn't reach ${NODE}.`), 40_000).catch(() => undefined);
  const retryVisible = (await rowOf(orgRemoteRun).first().locator('[data-test="workspace-remote-run-retry"]').count()) > 0;
  await rowOf(orgRemoteRun).first().click();
  let notice = null;
  await waitFor('the notice', async () => (notice = (await page.locator('[data-test="remote-run-notice"]').count()) ? (await page.locator('[data-test="remote-run-notice"]').first().innerText()).trim() : null) !== null, 30_000).catch(() => undefined);
  // The rest of the tree works: this node's own runs are listed and open (the standalone delegator's row and its conversation).
  const standaloneRow = page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${standalone.runId}"]`);
  let localStillListed = (await standaloneRow.count()) > 0;
  if (localStillListed) {
    await standaloneRow.first().click();
    await waitFor('the standalone run opens', async () => (await centerPane.innerText()).includes('studio_team'), 30_000).catch(() => { localStillListed = false; });
  }
  await page.screenshot({ path: path.join(outputDir, 'RTP-06-unreachable.png'), fullPage: true });
  await beta.start();
  if (retryVisible) await rowOf(orgRemoteRun).first().locator('[data-test="workspace-remote-run-retry"]').click();
  let afterRetry = null;
  await waitFor('the title after Retry', async () => (afterRetry = await rowInfo(orgRemoteRun))?.title === orgTitle, 40_000).catch(() => undefined);
  await page.screenshot({ path: path.join(outputDir, 'RTP-06-after-retry.png'), fullPage: true });
  evidence.cases['RTP-06'] = { result: unreachable?.error?.startsWith(`Couldn't reach ${NODE}.`) && retryVisible && notice?.includes(`${NODE} isn't reachable`) && localStillListed && afterRetry?.title === orgTitle ? 'Pass' : 'Fail',
    unreachable, retryVisible, notice, localStillListed, afterRetry };

  evidence.result = Object.values(evidence.cases).every(entry => entry.result === 'Pass') && evidence.browserErrors.filter(line => !/favicon|DevTools/.test(line)).length === 0 ? 'Pass' : 'Fail';
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
  await fs.writeFile(path.join(outputDir, 'remote-runs-in-tree-probe.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`remote-runs-in-tree probe: ${evidence.result}${evidence.error ? `\n${evidence.error}` : ''}`);
  process.exit(process.exitCode ?? 0);
}

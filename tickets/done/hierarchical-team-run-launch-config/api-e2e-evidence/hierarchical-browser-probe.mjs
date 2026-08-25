#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(evidenceRoot, '..', '..', '..', '..');
const webRoot = path.join(workspaceRoot, 'autobyteus-web');
const require = createRequire(path.join(webRoot, 'package.json'));
const { chromium } = require('playwright-core');
const bootstrap = await import(pathToFileURL(path.join(workspaceRoot, 'test-support/live-e2e/test-runtime-bootstrap.mjs')).href);
const {
  createSanitizedTestEnvironment,
  executeGraphql,
  removeOwnedTestRuntime,
  reserveLoopbackPort,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} = bootstrap;

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const runtimeRoot = path.join(testRuntimeRoot, `hierarchical-browser-${suffix}`);
const database = resolveTestDatabaseLocation(`file:./db/hierarchical-browser-${suffix}.db`);
const isolatedHome = path.join(runtimeRoot, 'isolated-home');
fs.mkdirSync(isolatedHome, { recursive: true, mode: 0o700 });

let server;
let webChild;
let browser;
let webOutput = '';
const result = {
  browser: 'Google Chrome via playwright-core',
  regularJourney: {},
  recoveryJourney: {},
  pageErrors: [],
  consoleErrors: [],
};

const waitUntil = async (predicate, label, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      if (await predicate()) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`${label} timed out${lastError ? `: ${lastError.message}` : ''}`);
};

const createAgent = async (serverUrl, name, model) => {
  const data = await executeGraphql(serverUrl, `
    mutation CreateBrowserAgent($input: CreateAgentDefinitionInput!) {
      createAgentDefinition(input: $input) { id }
    }
  `, { input: {
    name,
    role: 'Browser hierarchy fixture',
    description: 'Isolated browser validation fixture',
    instructions: 'Wait for explicit user input.',
    category: 'api-e2e',
    defaultLaunchConfig: { runtimeKind: 'autobyteus', llmModelIdentifier: model, llmConfig: null },
  } });
  return data.createAgentDefinition.id;
};

const createTeam = async (serverUrl, input, model) => {
  const data = await executeGraphql(serverUrl, `
    mutation CreateBrowserTeam($input: CreateAgentTeamDefinitionInput!) {
      createAgentTeamDefinition(input: $input) { id }
    }
  `, { input: {
    ...input,
    description: 'Isolated browser validation fixture',
    instructions: 'Coordinate only after explicit user input.',
    defaultLaunchConfig: { runtimeKind: 'autobyteus', llmModelIdentifier: model, llmConfig: null },
  } });
  return data.createAgentTeamDefinition.id;
};

const seedHierarchy = async (serverUrl) => {
  const catalog = await executeGraphql(serverUrl, `
    query BrowserHierarchyModels($runtimeKind: String) {
      providerModelCatalogSnapshots(runtimeKind: $runtimeKind) { llmModels { modelIdentifier } }
    }
  `, { runtimeKind: 'autobyteus' });
  const model = catalog.providerModelCatalogSnapshots
    .flatMap((snapshot) => snapshot.llmModels)
    .map((entry) => entry.modelIdentifier.trim())
    .find(Boolean);
  assert.ok(model, 'A built-in AutoByteus model is required.');
  const label = `Browser Hierarchy ${suffix}`;
  const coordinator = await createAgent(serverUrl, `${label} Coordinator`, model);
  const observer = await createAgent(serverUrl, `${label} Observer`, model);
  const lead = await createAgent(serverUrl, `${label} Lead`, model);
  const reviewer = await createAgent(serverUrl, `${label} Reviewer`, model);
  const nested = await createTeam(serverUrl, {
    name: `${label} Research Team`,
    coordinatorMemberName: 'lead',
    nodes: [
      { memberName: 'lead', ref: lead, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'reviewer', ref: reviewer, refType: 'AGENT', refScope: 'SHARED' },
    ],
  }, model);
  const root = await createTeam(serverUrl, {
    name: `${label} Root Team`,
    coordinatorMemberName: 'coordinator',
    nodes: [
      { memberName: 'coordinator', ref: coordinator, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'observer', ref: observer, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'Research', ref: nested, refType: 'AGENT_TEAM', refScope: 'SHARED' },
    ],
  }, model);
  return { label, model, root };
};

const detailUrl = (baseUrl, rootId) => `${baseUrl}/agent-teams?view=team-detail&id=${encodeURIComponent(rootId)}`;

try {
  server = await startBuiltTestServer({
    runtimeRoot,
    databaseUrlOverride: database.databaseUrl,
    environment: createSanitizedTestEnvironment({ HOME: isolatedHome }),
  });
  const fixture = await seedHierarchy(server.serverUrl);
  const webPort = await reserveLoopbackPort();
  const baseUrl = `http://127.0.0.1:${webPort}`;
  const backendWs = server.serverUrl.replace(/^http:/, 'ws:');
  webChild = spawn('pnpm', ['dev', '--port', String(webPort)], {
    cwd: webRoot,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      BACKEND_NODE_BASE_URL: server.serverUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${backendWs}/ws/agent`,
      BACKEND_TEAM_WS_ENDPOINT: `${backendWs}/ws/agent-team`,
      BACKEND_GRAPHQL_WS_ENDPOINT: `${backendWs}/graphql`,
    },
    stdio: 'pipe',
  });
  webChild.stdout.on('data', (chunk) => { webOutput += chunk.toString('utf8'); });
  webChild.stderr.on('data', (chunk) => { webOutput += chunk.toString('utf8'); });
  await waitUntil(async () => {
    if (webChild.exitCode !== null) throw new Error(`Nuxt exited ${webChild.exitCode}: ${webOutput.slice(-2000)}`);
    const response = await fetch(baseUrl).catch(() => null);
    return response?.ok === true;
  }, 'Nuxt browser surface', 120_000);

  browser = await chromium.launch({ executablePath: chrome, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => result.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') result.consoleErrors.push(message.text());
  });

  await page.goto(detailUrl(baseUrl, fixture.root), { waitUntil: 'networkidle' });
  const detailRun = page.getByRole('button', { name: 'Run', exact: true });
  await waitUntil(async () => await detailRun.count() === 1 && await detailRun.isVisible(), 'Team detail Run action');
  await detailRun.click();
  await waitUntil(async () => {
    if (new URL(page.url()).pathname === '/workspace') return true;
    // Nuxt may reload once while Vite optimizes a newly discovered dependency.
    // Reapply the user action only while the detail surface is still mounted.
    if (await detailRun.count() === 1 && await detailRun.isVisible()) await detailRun.click();
    return false;
  }, 'workspace navigation after Team Run action', 90_000);

  const rootScope = page.locator('[data-test="team-scope-config-editor"][data-team-address="/"]');
  const nestedScope = page.locator('[data-test="team-scope-config-editor"][data-team-address="/Research"]');
  await waitUntil(async () => await rootScope.count() === 1 && await nestedScope.count() === 1, 'hierarchical Team configuration');
  assert.match(await nestedScope.innerText(), /Research/);
  assert.match(await nestedScope.innerText(), /\/Research/);
  assert.match(await nestedScope.innerText(), /Inherited/);

  const disclosure = nestedScope.locator('button[aria-controls="team-scope-Research-panel"]');
  assert.equal(await disclosure.getAttribute('aria-expanded'), 'true');
  await disclosure.click();
  assert.equal(await disclosure.getAttribute('aria-expanded'), 'false');
  await disclosure.click();
  assert.equal(await disclosure.getAttribute('aria-expanded'), 'true');

  const rootAuto = rootScope.locator('#team-scope-root-auto-execute');
  const nestedAuto = nestedScope.locator('#team-scope-Research-auto-execute');
  assert.equal(await rootAuto.getAttribute('aria-checked'), 'false');
  assert.equal(await nestedAuto.getAttribute('aria-checked'), 'false');
  await nestedAuto.click();
  assert.equal(await nestedAuto.getAttribute('aria-checked'), 'true');
  assert.equal(await rootAuto.getAttribute('aria-checked'), 'false');
  assert.match(await nestedScope.innerText(), /Customized/);
  await nestedScope.locator('[data-test="reset-team-scope"]').click();
  assert.equal(await nestedAuto.getAttribute('aria-checked'), 'false');
  assert.match(await nestedScope.innerText(), /Inherited/);
  await nestedAuto.click();
  const rootIsolationAfterNestedCustomization = await rootAuto.getAttribute('aria-checked');

  const runButton = page.getByRole('button', { name: 'Run Team', exact: true });
  await waitUntil(async () => await runButton.isEnabled(), 'launch-ready Team configuration');
  await page.screenshot({ path: path.join(evidenceRoot, 'hierarchical-browser-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 900, height: 1000 });
  const overflow = await page.evaluate(() => ({
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    rootWidth: document.querySelector('[data-team-address="/"]')?.scrollWidth ?? null,
    rootClientWidth: document.querySelector('[data-team-address="/"]')?.clientWidth ?? null,
  }));
  assert.ok(overflow.documentWidth <= overflow.viewport + 1, JSON.stringify(overflow));
  assert.ok(overflow.rootWidth === null || overflow.rootWidth <= overflow.rootClientWidth + 1, JSON.stringify(overflow));
  await page.screenshot({ path: path.join(evidenceRoot, 'hierarchical-browser-narrow.png'), fullPage: true });

  const createResponse = page.waitForResponse((response) => {
    const body = response.request().postData() || '';
    return response.url().includes('/graphql') && body.includes('CreateAgentTeamRun');
  });
  await runButton.click();
  const response = await createResponse;
  const createRequest = response.request().postDataJSON();
  const createPayload = await response.json();
  assert.equal(createPayload.data.createAgentTeamRun.success, true, JSON.stringify(createPayload));
  const teamRunId = createPayload.data.createAgentTeamRun.teamRunId;
  assert.ok(teamRunId);
  const input = createRequest.variables.input;
  assert.deepEqual(input.teamConfigs.map((entry) => entry.teamAddress).sort(), ['/', '/Research']);
  assert.deepEqual(input.memberConfigs.map((entry) => entry.memberAddress).sort(), [
    '/Research/lead', '/Research/reviewer', '/coordinator', '/observer',
  ]);
  assert.ok([...input.teamConfigs, ...input.memberConfigs].every((entry) => entry.runtimeKind === 'autobyteus'));
  assert.ok([...input.teamConfigs, ...input.memberConfigs].every((entry) => entry.llmModelIdentifier === fixture.model));
  assert.equal(input.teamConfigs.find((entry) => entry.teamAddress === '/').autoExecuteTools, false);
  assert.equal(input.teamConfigs.find((entry) => entry.teamAddress === '/Research').autoExecuteTools, true);
  assert.ok(input.memberConfigs.filter((entry) => entry.memberAddress.startsWith('/Research/')).every((entry) => entry.autoExecuteTools === true));

  const treePath = path.join(runtimeRoot, 'memory', 'agent_teams', teamRunId, 'team_run_execution_tree.json');
  await waitUntil(() => fs.existsSync(treePath), 'persisted TeamRun V2 tree');
  const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
  assert.equal(tree.schemaVersion, 2);
  assert.equal(tree.rootTeam.address, '/');
  assert.equal(tree.rootTeam.defaultLaunchConfiguration.autoExecuteTools, false);
  const persistedNested = tree.rootTeam.members.find((entry) => entry.address === '/Research');
  assert.equal(persistedNested.defaultLaunchConfiguration.autoExecuteTools, true);
  assert.ok(persistedNested.members.every((entry) => entry.launchConfiguration.autoExecuteTools === true));

  const resume = await executeGraphql(server.serverUrl, `
    query BrowserResume($teamRunId: String!) {
      getTeamRunResumeConfig(teamRunId: $teamRunId) { teamRunId isActive executionTree }
    }
  `, { teamRunId });
  assert.equal(resume.getTeamRunResumeConfig.isActive, true);
  assert.equal(resume.getTeamRunResumeConfig.executionTree.schema_version, 2);
  const terminated = await executeGraphql(server.serverUrl, `
    mutation BrowserTerminate($teamRunId: String!) {
      terminateAgentTeamRun(teamRunId: $teamRunId) { success }
    }
  `, { teamRunId });
  assert.equal(terminated.terminateAgentTeamRun.success, true);
  result.regularJourney = {
    teamRunId,
    teamConfigAddresses: input.teamConfigs.map((entry) => entry.teamAddress),
    agentConfigAddresses: input.memberConfigs.map((entry) => entry.memberAddress),
    disclosure: 'true -> false -> true',
    nestedCustomization: 'false -> true -> reset(false) -> true',
    rootIsolation: rootIsolationAfterNestedCustomization,
    persistedSchemaVersion: tree.schemaVersion,
    responsiveOverflow: overflow,
    terminated: true,
  };
  await context.close();

  const recoveryContext = await browser.newContext({ viewport: { width: 900, height: 1000 } });
  const recoveryPage = await recoveryContext.newPage();
  let rejectedWorkspaceQueries = 0;
  recoveryPage.on('pageerror', (error) => result.pageErrors.push(`recovery: ${error.message}`));
  await recoveryPage.route('**/graphql', async (route) => {
    const postData = route.request().postData() || '';
    if (postData.includes('GetAllWorkspaces')) {
      rejectedWorkspaceQueries += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null, errors: [{ message: 'Owned workspace inventory rejection' }] }),
      });
      return;
    }
    await route.continue();
  });
  await recoveryPage.goto(detailUrl(baseUrl, fixture.root), { waitUntil: 'networkidle' });
  const recoveryDetailRun = recoveryPage.getByRole('button', { name: 'Run', exact: true });
  await waitUntil(async () => await recoveryDetailRun.count() === 1 && await recoveryDetailRun.isVisible(), 'recovery detail Run action');
  await recoveryDetailRun.click();
  await waitUntil(async () => {
    if (new URL(recoveryPage.url()).pathname === '/workspace') return true;
    if (await recoveryDetailRun.count() === 1 && await recoveryDetailRun.isVisible()) await recoveryDetailRun.click();
    return false;
  }, 'recovery workspace navigation', 90_000);
  const recoveryRoot = recoveryPage.locator('[data-test="team-scope-config-editor"][data-team-address="/"]');
  await waitUntil(async () => await recoveryRoot.count() === 1, 'recovery Team configuration');
  assert.ok(rejectedWorkspaceQueries > 0);
  const recoveryRun = recoveryPage.getByRole('button', { name: 'Run Team', exact: true });
  assert.equal(await recoveryRun.isDisabled(), true);
  const blocker = recoveryPage.locator('[data-test="team-run-blocking-issue"]');
  assert.equal(await blocker.count(), 1);
  assert.equal((await recoveryPage.getByText('Team / needs a workspace before launch.', { exact: true }).count()), 1);
  const pendingPath = path.join(runtimeRoot, 'pending-browser-recovery-workspace');
  const recoveryInput = recoveryRoot.locator('input[type="text"]');
  await recoveryInput.fill(pendingPath);
  await waitUntil(async () => await recoveryRun.isEnabled(), 'pending New workspace recovery');
  assert.equal(fs.existsSync(pendingPath), false);
  await recoveryPage.screenshot({ path: path.join(evidenceRoot, 'hierarchical-browser-workspace-recovery.png'), fullPage: true });
  result.recoveryJourney = {
    rejectedWorkspaceQueries,
    configurationMounted: true,
    rootBlockerCountBeforePendingPath: 1,
    runDisabledBeforePendingPath: true,
    runEnabledAfterPendingPath: true,
    workspaceCreatedDuringProbe: false,
  };
  await recoveryContext.close();

  assert.deepEqual(result.pageErrors, []);
  console.log('Hierarchical Team browser probe: PASS');
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (webChild && webChild.exitCode === null) {
    webChild.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => webChild.once('close', resolve)),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
    if (webChild.exitCode === null) webChild.kill('SIGKILL');
  }
  if (server?.child?.exitCode === null) await server.stop().catch(() => server.child.kill('SIGKILL'));
  await removeOwnedTestRuntime(runtimeRoot, database).catch(() => {});
  await fsPromises.writeFile(path.join(evidenceRoot, 'hierarchical-browser-nuxt-tail.txt'), webOutput.slice(-12_000));
}

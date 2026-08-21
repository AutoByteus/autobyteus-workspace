#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const evidenceDir = path.dirname(scriptPath);
const ticketDir = path.dirname(evidenceDir);
const repoRoot = path.resolve(ticketDir, '../../..');
const serverDir = path.join(repoRoot, 'autobyteus-server-ts');
const webDir = path.join(repoRoot, 'autobyteus-web');
const webRequire = createRequire(path.join(webDir, 'package.json'));
const { chromium } = webRequire('playwright-core');
const fixturePath = path.join(evidenceDir, 'fixtures/quick-launch-config.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-quick-launch-config.vue');
const routePath = '/api-e2e-quick-launch-config';
const evidencePath = path.join(evidenceDir, 'browser-live-evidence.json');
const backendLogPath = path.join(evidenceDir, 'browser-live-backend.log');
const nuxtLogPath = path.join(evidenceDir, 'browser-live-nuxt.log');
const uniformScreenshotPath = path.join(evidenceDir, 'uniform-override-render.png');
const heterogeneousScreenshotPath = path.join(evidenceDir, 'heterogeneous-override-render.png');
const browserExecutable = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const timeoutMs = 180_000;

const evidence = {
  startedAt: new Date().toISOString(),
  developmentCommit: null,
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  browserExecutable,
  repoRoot,
  serverDir,
  webDir,
  fixturePath,
  routePath,
  environment: {},
  fixtures: {},
  scenarios: {},
  graphqlRequests: [],
  browserEvents: [],
  fileEvidence: {},
  cleanup: {},
  failures: [],
};

const assert = (condition, message, details) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const stable = (value) => JSON.stringify(value, Object.keys(value ?? {}).sort());
const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const childExited = (child) => !child || child.exitCode !== null || child.signalCode !== null;

const choosePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    server.close(() => resolve(port));
  });
});

const waitFor = async (label, fn, timeout = timeoutMs, interval = 150) => {
  const started = Date.now();
  let last;
  let lastError;
  while (Date.now() - started < timeout) {
    try {
      last = await fn();
      if (last) return last;
    } catch (error) {
      lastError = error;
    }
    await wait(interval);
  }
  throw new Error(`Timed out waiting for ${label}; last=${JSON.stringify(last)}${lastError ? `; error=${lastError.message}` : ''}`);
};

const hashFile = async (filePath) => {
  const content = await fs.readFile(filePath);
  const stat = await fs.stat(filePath);
  return {
    path: filePath,
    sha256: createHash('sha256').update(content).digest('hex'),
    bytes: content.length,
    mtimeMs: stat.mtimeMs,
    mode: stat.mode & 0o777,
  };
};

const hashDirectory = async (root) => {
  const entries = [];
  const visit = async (current) => {
    const children = await fs.readdir(current, { withFileTypes: true });
    children.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of children) {
      const full = path.join(current, child.name);
      if (child.isDirectory()) await visit(full);
      else if (child.isFile()) {
        const content = await fs.readFile(full);
        entries.push({
          path: path.relative(root, full),
          sha256: createHash('sha256').update(content).digest('hex'),
          bytes: content.length,
        });
      }
    }
  };
  await visit(root);
  return {
    path: root,
    entries,
    sha256: createHash('sha256').update(JSON.stringify(entries)).digest('hex'),
  };
};

const stopOwned = async (child, label) => {
  if (!child) return { label, result: 'not-started' };
  const record = { label, pid: child.pid, initialExitCode: child.exitCode, initialSignal: child.signalCode };
  if (!childExited(child)) {
    try {
      if (process.platform === 'win32') child.kill('SIGTERM');
      else process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if (error?.code !== 'ESRCH') record.sigtermError = String(error);
    }
    const termDeadline = Date.now() + 15_000;
    while (!childExited(child) && Date.now() < termDeadline) await wait(100);
    if (!childExited(child)) {
      try {
        if (process.platform === 'win32') child.kill('SIGKILL');
        else process.kill(-child.pid, 'SIGKILL');
      } catch (error) {
        if (error?.code !== 'ESRCH') record.sigkillError = String(error);
      }
      const killDeadline = Date.now() + 5_000;
      while (!childExited(child) && Date.now() < killDeadline) await wait(100);
    }
  }
  record.finalExitCode = child.exitCode;
  record.finalSignal = child.signalCode;
  record.result = childExited(child) ? 'stopped' : 'still-running';
  return record;
};

const runScenario = async (id, description, fn) => {
  const startedAt = new Date().toISOString();
  try {
    const details = await fn();
    evidence.scenarios[id] = { description, result: 'Pass', startedAt, details };
    return details;
  } catch (error) {
    const failure = {
      id,
      description,
      message: error instanceof Error ? error.message : String(error),
      details: error?.details,
      stack: error instanceof Error ? error.stack : undefined,
    };
    evidence.scenarios[id] = { description, result: 'Fail', startedAt, failure };
    evidence.failures.push(failure);
    throw error;
  }
};

const runtimeDto = (runtime) => runtime === 'autobyteus'
  ? 'AUTOBYTEUS'
  : runtime === 'claude_agent_sdk'
    ? 'CLAUDE'
    : 'CODEX';

const flattenDtoAgents = (members) => members.flatMap((member) => member.kind === 'configured_agent'
  ? [member]
  : flattenDtoAgents(member.members));

const normalizeSubmitted = (record) => ({
  memberAddress: record.memberAddress,
  agentDefinitionId: record.agentDefinitionId,
  runtime: runtimeDto(record.runtimeKind),
  model: record.llmModelIdentifier,
  llmConfig: record.llmConfig ?? null,
  autoExecuteTools: record.autoExecuteTools,
  skillAccessMode: record.skillAccessMode,
  workspaceRootPath: record.workspaceRootPath ?? record.workspaceMetadata?.workspaceRootPath ?? null,
});

const normalizeDto = (tree) => flattenDtoAgents(tree.root_team.members).map((agent) => ({
  memberAddress: agent.address,
  agentDefinitionId: agent.agent_definition_id,
  runtime: agent.launch_configuration.runtime_kind,
  model: agent.launch_configuration.llm_model_identifier,
  llmConfig: agent.launch_configuration.llm_config ?? null,
  autoExecuteTools: agent.launch_configuration.auto_execute_tools,
  skillAccessMode: agent.launch_configuration.skill_access_mode,
  workspaceRootPath: agent.launch_configuration.workspace_root_path ?? null,
}));

let dataRoot;
let workspaceRoot;
let backend;
let nuxt;
let backendLog;
let nuxtLog;
let browser;
let browserContext;
let page;
let fixtureInstalled = false;
let finalResult = 'Pass';
let backendUrl;
let frontendUrl;
let createdNewRunIds = [];

try {
  assert(existsSync(browserExecutable), 'Chrome executable is unavailable', { browserExecutable });
  assert(existsSync(fixturePath), 'Fixture page is unavailable', { fixturePath });
  assert(!existsSync(installedPagePath), 'Refusing to overwrite an existing probe route', { installedPagePath });
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Current server build is unavailable; run the recorded build first.');
  evidence.developmentCommit = (await import('node:child_process')).execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();

  const [backendPort, frontendPort] = await Promise.all([choosePort(), choosePort()]);
  dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'quick-launch-api-e2e-data-'));
  workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'quick-launch-api-e2e-workspace-'));
  backendUrl = `http://127.0.0.1:${backendPort}`;
  frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const databasePath = path.join(dataRoot, 'db', 'api-e2e.db');
  const memoryDir = path.join(dataRoot, 'memory');
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  await fs.mkdir(memoryDir, { recursive: true });
  await fs.writeFile(path.join(dataRoot, '.env'), [
    'APP_ENV=test',
    'DB_TYPE=sqlite',
    `DATABASE_URL=file:${databasePath}`,
    `AUTOBYTEUS_SERVER_HOST=${backendUrl}`,
    `AUTOBYTEUS_MEMORY_DIR=${memoryDir}`,
    `AUTOBYTEUS_TEMP_WORKSPACE_DIR=${workspaceRoot}`,
  ].join('\n') + '\n', { mode: 0o600 });
  evidence.environment = { backendPort, frontendPort, backendUrl, frontendUrl, dataRoot, workspaceRoot, databasePath, memoryDir };

  backendLog = createWriteStream(backendLogPath, { flags: 'w' });
  backend = spawn(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], {
    cwd: serverDir,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      APP_ENV: 'test',
      DB_TYPE: 'sqlite',
      DATABASE_URL: `file:${databasePath}`,
      AUTOBYTEUS_SERVER_HOST: backendUrl,
      AUTOBYTEUS_MEMORY_DIR: memoryDir,
      AUTOBYTEUS_TEMP_WORKSPACE_DIR: workspaceRoot,
      LOG_LEVEL: 'warn',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  backend.stdout.pipe(backendLog);
  backend.stderr.pipe(backendLog);
  await waitFor('isolated backend health', async () => {
    if (childExited(backend)) throw new Error(`Backend exited code=${backend.exitCode} signal=${backend.signalCode}`);
    const response = await fetch(`${backendUrl}/rest/health`).catch(() => null);
    return response?.ok;
  });

  const graphql = async (query, variables = {}) => {
    const response = await fetch(`${backendUrl}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    const payload = await response.json();
    if (!response.ok || payload.errors?.length) {
      throw new Error(`GraphQL failed: ${response.status} ${JSON.stringify(payload.errors ?? payload)}`);
    }
    return payload.data;
  };

  const unique = randomUUID().replaceAll('-', '').slice(0, 12);
  const memberNames = ['lead', 'peer', 'runtime_only', 'model_only', 'config_only', 'auto_only'];
  const agentIds = {};
  for (const memberName of memberNames) {
    const data = await graphql(`
      mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
        createAgentDefinition(input: $input) { id name }
      }
    `, { input: {
      name: `quick_launch_${memberName}_${unique}`,
      role: 'assistant',
      description: `Quick-launch API/E2E ${memberName}`,
      instructions: 'Deterministic configuration allocation fixture. Do not run provider turns.',
      toolNames: [],
      skillNames: [],
    } });
    agentIds[memberName] = data.createAgentDefinition.id;
  }
  const teamData = await graphql(`
    mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
      createAgentTeamDefinition(input: $input) { id name }
    }
  `, { input: {
    name: `quick_launch_team_${unique}`,
    description: 'Quick-launch sparse override API/E2E team',
    instructions: 'Coordinate deterministic configuration validation only.',
    coordinatorMemberName: 'lead',
    nodes: memberNames.map((memberName) => ({
      memberName,
      ref: agentIds[memberName],
      refType: 'AGENT',
      refScope: 'SHARED',
    })),
  } });
  const teamDefinitionId = teamData.createAgentTeamDefinition.id;
  const baselineLaunch = (memberName) => ({
    memberAddress: `/${memberName}`,
    agentDefinitionId: agentIds[memberName],
    runtimeKind: 'codex_app_server',
    llmModelIdentifier: 'old-global-model',
    llmConfig: { reasoning: { effort: 'low', flags: { plan: true, search: false } } },
    autoExecuteTools: false,
    skillAccessMode: 'NONE',
    workspaceRootPath: workspaceRoot,
  });
  const uniformConfigs = memberNames.map(baselineLaunch);
  const heterogeneousConfigs = memberNames.map((memberName) => {
    const config = baselineLaunch(memberName);
    if (memberName === 'runtime_only') config.runtimeKind = 'claude_agent_sdk';
    if (memberName === 'model_only') config.llmModelIdentifier = 'member-model';
    if (memberName === 'config_only') config.llmConfig = { reasoning: { effort: 'high', flags: { plan: false, search: true } } };
    if (memberName === 'auto_only') config.autoExecuteTools = true;
    return config;
  });
  const createRun = async (memberConfigs) => {
    const data = await graphql(`
      mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
        createAgentTeamRun(input: $input) { success message teamRunId }
      }
    `, { input: { teamDefinitionId, memberConfigs } });
    assert(data.createAgentTeamRun.success && data.createAgentTeamRun.teamRunId, 'Source Team run creation failed', data.createAgentTeamRun);
    return data.createAgentTeamRun.teamRunId;
  };
  const terminate = async (teamRunId) => {
    const data = await graphql(`
      mutation TerminateAgentTeamRun($teamRunId: String!) {
        terminateAgentTeamRun(teamRunId: $teamRunId) { success message }
      }
    `, { teamRunId });
    assert(data.terminateAgentTeamRun.success, `Team termination failed for '${teamRunId}'`, data.terminateAgentTeamRun);
  };
  const uniformSourceRunId = await createRun(uniformConfigs);
  await terminate(uniformSourceRunId);
  const heterogeneousSourceRunId = await createRun(heterogeneousConfigs);
  await terminate(heterogeneousSourceRunId);

  const resume = async (teamRunId) => (await graphql(`
    query GetTeamRunResumeConfig($teamRunId: String!) {
      getTeamRunResumeConfig(teamRunId: $teamRunId) { teamRunId isActive executionTree }
    }
  `, { teamRunId })).getTeamRunResumeConfig;
  const checkpoint = async (teamRunId) => (await graphql(`
    query GetTeamRunExecutionCheckpoint($teamRunId: String!) {
      getTeamRunExecutionCheckpoint(teamRunId: $teamRunId) { rootTeamRunId changeSequence hasOpenExecutionWork }
    }
  `, { teamRunId })).getTeamRunExecutionCheckpoint;

  const treeFile = (teamRunId) => path.join(memoryDir, 'agent_teams', teamRunId, 'team_run_execution_tree.json');
  await waitFor('uniform source tree file', () => existsSync(treeFile(uniformSourceRunId)));
  await waitFor('heterogeneous source tree file', () => existsSync(treeFile(heterogeneousSourceRunId)));
  const sourceBefore = {
    uniform: { file: await hashFile(treeFile(uniformSourceRunId)), resume: await resume(uniformSourceRunId) },
    heterogeneous: { file: await hashFile(treeFile(heterogeneousSourceRunId)), resume: await resume(heterogeneousSourceRunId) },
  };
  const definitionRoots = [
    path.join(dataRoot, 'agent-teams', teamDefinitionId),
    ...Object.values(agentIds).map((id) => path.join(dataRoot, 'agents', id)),
  ];
  const definitionsBefore = await Promise.all(definitionRoots.map(hashDirectory));
  evidence.fixtures = { unique, memberNames, agentIds, teamDefinitionId, uniformSourceRunId, heterogeneousSourceRunId, uniformConfigs, heterogeneousConfigs };
  evidence.fileEvidence.sourceBefore = sourceBefore;
  evidence.fileEvidence.definitionsBefore = definitionsBefore;

  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;
  nuxtLog = createWriteStream(nuxtLogPath, { flags: 'w' });
  nuxt = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], {
    cwd: webDir,
    detached: process.platform !== 'win32',
    env: { ...process.env, BACKEND_NODE_BASE_URL: backendUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxt.stdout.pipe(nuxtLog);
  nuxt.stderr.pipe(nuxtLog);
  await waitFor('Nuxt probe route', async () => {
    if (childExited(nuxt)) throw new Error(`Nuxt exited code=${nuxt.exitCode} signal=${nuxt.signalCode}`);
    const response = await fetch(`${frontendUrl}${routePath}`).catch(() => null);
    return response?.ok;
  });

  browser = await chromium.launch({ headless: true, executablePath: browserExecutable, args: ['--disable-dev-shm-usage'] });
  browserContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'Europe/Berlin', colorScheme: 'light' });
  page = await browserContext.newPage();
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({ type: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}` }));
  page.on('request', (request) => {
    if (!request.url().includes('/graphql') || request.method() !== 'POST') return;
    let body;
    try { body = request.postDataJSON(); } catch { return; }
    if (typeof body?.query !== 'string') return;
    const operation = body.query.match(/\b(query|mutation)\s+(\w+)/)?.[2] ?? 'anonymous';
    if (operation === 'CreateAgentTeamRun') {
      evidence.graphqlRequests.push({ operation, variables: body.variables });
    }
  });
  const pageUrl = new URL(`${frontendUrl}${routePath}`);
  pageUrl.searchParams.set('definitionId', teamDefinitionId);
  pageUrl.searchParams.set('uniformTeamRunId', uniformSourceRunId);
  pageUrl.searchParams.set('heterogeneousTeamRunId', heterogeneousSourceRunId);
  await page.goto(pageUrl.href, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="probe-status"]').waitFor({ state: 'visible', timeout: timeoutMs });
  await waitFor('browser probe ready', async () => (await page.locator('[data-test="probe-status"]').textContent()) === 'ready');
  // Nuxt/Vite can perform one dependency-optimization reload on the first route visit.
  // Wait for the warmed page to remain stable before starting a promise-returning launch.
  await page.waitForTimeout(5_000);
  await waitFor('stable warmed browser probe', async () => (await page.locator('[data-test="probe-status"]').textContent()) === 'ready' && await page.evaluate(() => Boolean(window.__quickLaunchProbe)));

  await runScenario('QL-E2E-001', 'Uniform schema-v1 projection renders no overrides and global runtime/model/config/auto edits reach every submitted record', async () => {
    const badgeCount = await page.locator('[data-test="team-member-overrides-count"]').count();
    assert(badgeCount === 0, 'Uniform source incorrectly renders an override badge', { badgeCount });
    const initial = await page.evaluate(() => window.__quickLaunchProbe.getState());
    assert(Object.keys(initial.sourceConfigs.uniform.memberOverrides).length === 0, 'Uniform source projection is not sparse', initial.sourceConfigs.uniform);
    await page.screenshot({ path: uniformScreenshotPath, fullPage: true });
    await page.locator('#team-run-runtime-kind').selectOption('autobyteus');
    await waitFor('uniform runtime edit', async () => (await page.evaluate(() => window.__quickLaunchProbe.getState())).currentConfig.runtimeKind === 'autobyteus');
    await page.locator('#team-auto-execute').click();
    await page.evaluate(() => window.__quickLaunchProbe.applyUniformRemainingEdits());
    const edited = await page.evaluate(() => window.__quickLaunchProbe.getState());
    assert(edited.currentConfig.runtimeKind === 'autobyteus', 'Runtime edit did not reach the draft', edited.currentConfig);
    assert(edited.currentConfig.llmModelIdentifier === 'new-uniform-model', 'Model edit did not reach the draft', edited.currentConfig);
    assert(edited.currentConfig.autoExecuteTools === true, 'Auto-approval UI edit did not reach the draft', edited.currentConfig);
    const launched = await page.evaluate(() => Promise.race([
      window.__quickLaunchProbe.launchUniform(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('uniform launch timed out')), 90_000)),
    ]));
    createdNewRunIds.push(launched.rootTeamRunId);
    assert(launched.rootActive === true, 'Hydrated uniform run is not active', launched);
    assert(launched.submittedRecords.length === memberNames.length, 'Uniform payload member count mismatch', launched.submittedRecords);
    for (const record of launched.submittedRecords) {
      assert(record.runtimeKind === 'autobyteus', 'Uniform member retained the source runtime', record);
      assert(record.llmModelIdentifier === 'new-uniform-model', 'Uniform member retained the source model', record);
      assert(record.autoExecuteTools === true, 'Uniform member retained source auto approval', record);
      assert(record.llmConfig?.reasoning?.effort === 'xhigh', 'Uniform member retained source model config', record);
    }
    return { badgeCount, initialConfig: initial.sourceConfigs.uniform, launched };
  });

  await runScenario('QL-E2E-002', 'Heterogeneous schema-v1 projection renders four genuine field deltas, no-edit materialization preserves effects, and a global config edit keeps genuine differences', async () => {
    await page.evaluate(() => window.__quickLaunchProbe.prepareHeterogeneous());
    await waitFor('heterogeneous scenario render', async () => (await page.locator('[data-test="scenario-name"]').textContent()) === 'heterogeneous');
    const badge = page.locator('[data-test="team-member-overrides-count"]');
    await badge.waitFor({ state: 'visible', timeout: timeoutMs });
    const badgeText = await badge.textContent();
    assert(/4/.test(badgeText ?? ''), 'Heterogeneous source did not render four override members', { badgeText });
    const beforeEdit = await page.evaluate(() => window.__quickLaunchProbe.getState());
    assert(Object.keys(beforeEdit.sourceConfigs.heterogeneous.memberOverrides).length === 4, 'Heterogeneous source sparse delta count mismatch', beforeEdit.sourceConfigs.heterogeneous);
    const sourceDto = normalizeDto(beforeEdit.sourceTrees.heterogeneous);
    const noEdit = beforeEdit.heterogeneousNoEditRecords.map(normalizeSubmitted);
    assert(deepEqual(noEdit, sourceDto), 'Heterogeneous no-edit materialization changed effective settings', { noEdit, sourceDto });
    await page.screenshot({ path: heterogeneousScreenshotPath, fullPage: true });
    await page.evaluate(() => window.__quickLaunchProbe.applyHeterogeneousEdit());
    const launched = await page.evaluate(() => Promise.race([
      window.__quickLaunchProbe.launchHeterogeneous(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('heterogeneous launch timed out')), 90_000)),
    ]));
    createdNewRunIds.push(launched.rootTeamRunId);
    const byAddress = Object.fromEntries(launched.submittedRecords.map((record) => [record.memberAddress, record]));
    assert(byAddress['/runtime_only'].runtimeKind === 'claude_agent_sdk', 'Runtime-only genuine difference was lost', byAddress['/runtime_only']);
    assert(byAddress['/model_only'].llmModelIdentifier === 'member-model', 'Model-only genuine difference was lost', byAddress['/model_only']);
    assert(byAddress['/config_only'].llmConfig?.reasoning?.effort === 'high', 'Config-only genuine difference was lost', byAddress['/config_only']);
    assert(byAddress['/auto_only'].autoExecuteTools === true, 'Auto-only genuine difference was lost', byAddress['/auto_only']);
    for (const address of ['/lead', '/peer', '/runtime_only', '/model_only', '/auto_only']) {
      assert(byAddress[address].llmConfig?.reasoning?.effort === 'medium', 'Inheriting member did not receive edited global config', byAddress[address]);
    }
    return { badgeText, beforeEdit, launched };
  });

  await runScenario('QL-E2E-003', 'Exact browser-submitted member records agree with actual GraphQL server trees, persisted files, active runtime checkpoints, and hydrated records', async () => {
    assert(evidence.graphqlRequests.length === 2, 'Expected exactly two browser CreateAgentTeamRun requests', evidence.graphqlRequests);
    const pageState = await page.evaluate(() => window.__quickLaunchProbe.getState());
    const labels = ['uniform', 'heterogeneous'];
    const correlations = [];
    for (let index = 0; index < labels.length; index += 1) {
      const label = labels[index];
      const launch = pageState[`${label}Launch`];
      const captured = evidence.graphqlRequests[index].variables.input.memberConfigs.map(normalizeSubmitted);
      const submitted = launch.submittedRecords.map(normalizeSubmitted);
      assert(deepEqual(captured, submitted), `${label} captured GraphQL request differs from materialized records`, { captured, submitted });
      const serverResume = await resume(launch.rootTeamRunId);
      const serverRecords = normalizeDto(serverResume.executionTree);
      assert(deepEqual(submitted, serverRecords), `${label} server execution tree differs from submitted records`, { submitted, serverRecords });
      const hydrated = launch.hydratedRecords.map(normalizeSubmitted);
      assert(deepEqual(submitted, hydrated), `${label} hydrated configuration differs from submitted records`, { submitted, hydrated });
      assert(deepEqual(normalizeDto(launch.hydratedTree), serverRecords), `${label} browser hydrated tree differs from live server resume tree`, { hydratedTree: launch.hydratedTree, serverTree: serverResume.executionTree });
      const runtimeCheckpoint = await checkpoint(launch.rootTeamRunId);
      assert(runtimeCheckpoint.rootTeamRunId === launch.rootTeamRunId && runtimeCheckpoint.hasOpenExecutionWork === false, `${label} active runtime checkpoint mismatch`, runtimeCheckpoint);
      const persisted = await hashFile(treeFile(launch.rootTeamRunId));
      correlations.push({ label, runId: launch.rootTeamRunId, submitted, serverRecords, hydrated, runtimeCheckpoint, persisted });
    }
    return { correlations };
  });

  await runScenario('QL-E2E-004', 'Source team configurations, schema-v1 files, and agent/team definitions remain unchanged while new runs use separate files', async () => {
    const sourceAfter = {
      uniform: { file: await hashFile(treeFile(uniformSourceRunId)), resume: await resume(uniformSourceRunId) },
      heterogeneous: { file: await hashFile(treeFile(heterogeneousSourceRunId)), resume: await resume(heterogeneousSourceRunId) },
    };
    const definitionsAfter = await Promise.all(definitionRoots.map(hashDirectory));
    for (const label of ['uniform', 'heterogeneous']) {
      assert(deepEqual(sourceBefore[label].file, sourceAfter[label].file), `${label} source tree file metadata/content changed`, { before: sourceBefore[label].file, after: sourceAfter[label].file });
      assert(deepEqual(sourceBefore[label].resume, sourceAfter[label].resume), `${label} source GraphQL configuration changed`, { before: sourceBefore[label].resume, after: sourceAfter[label].resume });
    }
    assert(deepEqual(definitionsBefore, definitionsAfter), 'Agent/team definition files changed during quick launch', { before: definitionsBefore, after: definitionsAfter });
    for (const runId of createdNewRunIds) {
      assert(runId !== uniformSourceRunId && runId !== heterogeneousSourceRunId, 'New run reused a source run identity', { runId });
      assert(existsSync(treeFile(runId)), 'New run has no separate schema-v1 file', { runId, file: treeFile(runId) });
    }
    evidence.fileEvidence.sourceAfter = sourceAfter;
    evidence.fileEvidence.definitionsAfter = definitionsAfter;
    return { sourceBefore, sourceAfter, definitionsBefore, definitionsAfter, newRunIds: createdNewRunIds };
  });

  for (const runId of createdNewRunIds) await terminate(runId);
  evidence.finishedAt = new Date().toISOString();
  evidence.result = 'Pass';
} catch (error) {
  finalResult = 'Fail';
  evidence.result = 'Fail';
  evidence.failures.push({
    id: 'PROBE_FATAL',
    message: error instanceof Error ? error.message : String(error),
    details: error?.details,
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exitCode = 1;
} finally {
  try { if (page) await page.close(); } catch (error) { evidence.cleanup.page = { result: 'error', message: String(error) }; }
  try { if (browserContext) await browserContext.close(); } catch (error) { evidence.cleanup.browserContext = { result: 'error', message: String(error) }; }
  try { if (browser) await browser.close(); evidence.cleanup.browser = { result: 'closed' }; } catch (error) { evidence.cleanup.browser = { result: 'error', message: String(error) }; }
  evidence.cleanup.nuxt = await stopOwned(nuxt, 'nuxt');
  evidence.cleanup.backend = await stopOwned(backend, 'backend');
  try { if (fixtureInstalled) await fs.rm(installedPagePath, { force: true }); evidence.cleanup.fixtureRoute = { result: 'removed', path: installedPagePath }; } catch (error) { evidence.cleanup.fixtureRoute = { result: 'error', message: String(error) }; }
  try { if (dataRoot) await fs.rm(dataRoot, { recursive: true, force: true }); evidence.cleanup.dataRoot = { result: 'removed', path: dataRoot }; } catch (error) { evidence.cleanup.dataRoot = { result: 'error', message: String(error) }; }
  try { if (workspaceRoot) await fs.rm(workspaceRoot, { recursive: true, force: true }); evidence.cleanup.workspaceRoot = { result: 'removed', path: workspaceRoot }; } catch (error) { evidence.cleanup.workspaceRoot = { result: 'error', message: String(error) }; }
  try { await new Promise((resolve) => backendLog ? backendLog.end(resolve) : resolve()); } catch {}
  try { await new Promise((resolve) => nuxtLog ? nuxtLog.end(resolve) : resolve()); } catch {}
  evidence.finishedAt ??= new Date().toISOString();
  evidence.result = finalResult;
  await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2));
}

#!/usr/bin/env node
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, '../../../..');
const serverRoot = path.join(workspaceRoot, 'autobyteus-server-ts');
const webRoot = path.join(workspaceRoot, 'autobyteus-web');
const fixturePath = path.join(scriptDirectory, 'token-usage-browser.page.vue');
const installedPagePath = path.join(webRoot, 'pages/api-e2e-token-usage.vue');
const outputDirectory = path.join(scriptDirectory, 'evidence');
const routePath = '/api-e2e-token-usage';
const browserExecutable = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const timeoutMs = 90_000;

const webRequire = createRequire(path.join(webRoot, 'package.json'));
const { chromium } = webRequire('playwright-core');
const runtimeBootstrap = await import(pathToFileURL(path.join(
  workspaceRoot,
  'test-support/live-e2e/test-runtime-bootstrap.mjs',
)).href);
const {
  executeGraphql,
  removeOwnedTestRuntime,
  reserveLoopbackPort,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} = runtimeBootstrap;
const prismaRuntime = await import(pathToFileURL(path.join(
  serverRoot,
  'node_modules/repository_prisma/dist/index.mjs',
)).href);
const { initializePrisma, rootPrismaClient, shutdownPrisma } = prismaRuntime;
const { createTokenUsageUpdatedPayload } = await import(pathToFileURL(path.join(
  serverRoot,
  'dist/agent-execution/domain/agent-run-token-usage.js',
)).href);
const { SqlTokenUsageRunRepository } = await import(pathToFileURL(path.join(
  serverRoot,
  'dist/token-usage/repositories/sql/token-usage-run-repository.js',
)).href);
const { TokenUsageRunAccumulator } = await import(pathToFileURL(path.join(
  serverRoot,
  'dist/token-usage/services/token-usage-run-accumulator.js',
)).href);
const { TokenUsageRunStore } = await import(pathToFileURL(path.join(
  serverRoot,
  'dist/token-usage/providers/token-usage-run-store.js',
)).href);

const evidence = {
  startedAt: new Date().toISOString(),
  workspaceRoot,
  browserExecutable,
  runtime: { node: process.version, platform: `${process.platform}-${process.arch}` },
  identities: {},
  scenarios: {},
  graphql: { requestCount: 0, operations: [] },
  browserEvents: [],
  cleanup: {},
};

const assert = (condition, message, details = undefined) => {
  if (condition) return;
  const error = new Error(message);
  error.details = details;
  throw error;
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const waitFor = async (description, check, timeout = timeoutMs) => {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};

const noLookupPricingPolicy = Object.freeze({
  pricing_policy_key: null,
  price_config_id: null,
  model_provider: null,
  model_identifier: null,
  model_value: null,
  canonical_name: null,
  currency: null,
  input_price_per_million: null,
  output_price_per_million: null,
  cached_input_read_price_per_million: null,
  cached_input_write_price_per_million: null,
  cached_input_write_5m_price_per_million: null,
  cached_input_write_1h_price_per_million: null,
  input_price_tiers: [],
  pricing_status: 'missing',
  trusted_dimensions: {},
  missing_reason: 'api-e2e-deterministic-payload',
  source: null,
  effective_from: null,
  effective_to: null,
  version: null,
});

const createUsageStore = () => {
  const repository = new SqlTokenUsageRunRepository(rootPrismaClient);
  const accumulator = new TokenUsageRunAccumulator(repository, {
    resolvePolicy: async () => noLookupPricingPolicy,
    applyPolicy: (payload) => payload,
  });
  return new TokenUsageRunStore(
    repository,
    accumulator,
    { capture: async (payload) => payload },
    {
      assertCurrentSchemaReady: () => undefined,
      assertHistoricalReadReady: () => undefined,
    },
  );
};

const buildPayload = ({
  runId,
  rootTeamRunId = null,
  eventId,
  observedAt,
  inputTokens,
  outputTokens,
  reasoningTokens = 0,
  inputCost,
  outputCost,
  reasoningCost = null,
  totalCost,
  latestPromptTokens,
  teamName = null,
  memberDisplayName = null,
}) => createTokenUsageUpdatedPayload({
  runId,
  payload: {
    usage_event_id: eventId,
    idempotency_key: `idem:${eventId}`,
    observed_at: observedAt,
    root_team_run_id: rootTeamRunId,
    team_name: teamName,
    member_display_name: memberDisplayName,
    runtime_kind: 'codex_app_server',
    ingestion_kind: 'codex_thread_token_usage',
    usage_scope: 'per_call',
    input_token_semantic: 'gross_includes_cache',
    reported_input_tokens: inputTokens,
    reported_output_tokens: outputTokens,
    reported_total_tokens: inputTokens + outputTokens,
    accounting_input_tokens: inputTokens,
    accounting_output_tokens: outputTokens,
    accounting_total_tokens: inputTokens + outputTokens,
    standard_input_tokens: inputTokens,
    cache_miss_input_tokens: inputTokens,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_creation_5m_input_tokens: 0,
    cache_creation_1h_input_tokens: 0,
    cache_state: 'not_reported',
    reasoning_output_tokens: reasoningTokens,
    billable_input_tokens: inputTokens,
    billable_output_tokens: outputTokens,
    model_provider: 'OPENAI',
    model_identifier: 'gpt-5.6-sol',
    pricing_status: 'trusted',
    api_cost_status: 'estimated',
    currency: 'USD',
    pricing_policy_key: 'catalog:openai:gpt-5.6-sol:standard',
    input_price_per_million: 10,
    output_price_per_million: 100,
    estimated_api_input_cost: inputCost,
    estimated_api_standard_input_cost: inputCost,
    estimated_api_output_cost: outputCost,
    estimated_api_reasoning_output_cost: reasoningCost,
    estimated_api_total_cost: totalCost,
    latest_prompt_tokens: latestPromptTokens,
    effective_context_window_tokens: 200_000,
    context_window_usage_percent: latestPromptTokens / 200_000,
    quality_flags: [],
  },
});

const summaryFields = `
  runId rootTeamRunId agentDefinitionId workspaceId
  grossInputTokens standardInputTokens cacheMissInputTokens cacheReadInputTokens
  cacheCreationInputTokens cacheCreation5mInputTokens cacheCreation1hInputTokens
  outputTokens reasoningOutputTokens billableOutputTokens totalTokens
  cacheReadInputTokenRate standardInputTokenRate cacheCreationInputTokenRate cacheState
  estimatedApiInputCost estimatedApiStandardInputCost estimatedApiCacheReadInputCost
  estimatedApiCacheCreationInputCost estimatedApiCacheCreation5mInputCost
  estimatedApiCacheCreation1hInputCost estimatedApiOutputCost
  estimatedApiReasoningOutputCost estimatedApiTotalCost currency apiCostStatus
  missingPriceDimensions pricingPolicyKey selectedPricingTierId
  unitPrices {
    standardInput { status pricePerMillion }
    cacheReadInput { status pricePerMillion }
    cacheCreationInput { status pricePerMillion }
    cacheCreation5mInput { status pricePerMillion }
    cacheCreation1hInput { status pricePerMillion }
    output { status pricePerMillion }
    reasoningOutput { status pricePerMillion }
  }
  latestPromptTokens effectiveContextWindowTokens contextWindowUsagePercent
  latestModelProvider latestModelIdentifier latestRuntimeKind usageReportCount updatedAt
`;

const queryRunSummary = async (serverUrl, runId) => (await executeGraphql(serverUrl, `
  query ProbeRun($runId: String!) {
    summary: getAgentRunTokenUsageSummary(runId: $runId) { ${summaryFields} }
  }
`, { runId })).summary;

const queryMemberSummary = async (serverUrl, teamRunId, agentRunId) => (await executeGraphql(serverUrl, `
  query ProbeMember($teamRunId: String!, $agentRunId: String!) {
    summary: getTeamMemberTokenUsageSummary(teamRunId: $teamRunId, agentRunId: $agentRunId) {
      ${summaryFields}
    }
  }
`, { teamRunId, agentRunId })).summary;

const childExited = (child) => child.exitCode !== null || child.signalCode !== null;
const stopOwnedProcess = async (child) => {
  if (!child || childExited(child)) return;
  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  } else {
    child.kill('SIGTERM');
  }
  const exited = await Promise.race([
    new Promise((resolve) => child.once('exit', () => resolve(true))),
    new Promise((resolve) => setTimeout(() => resolve(false), 5_000)),
  ]);
  if (!exited && !childExited(child)) {
    if (process.platform !== 'win32') {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    } else {
      child.kill('SIGKILL');
    }
  }
};

const readOperationName = (request) => {
  try {
    return JSON.parse(request.postData() || '{}').operationName || 'anonymous';
  } catch {
    return 'unparseable';
  }
};

const isGraphqlRequest = (request) => {
  try {
    return new URL(request.url()).pathname === '/graphql';
  } catch {
    return false;
  }
};

let backend;
let nuxt;
let browser;
let prismaOpen = false;
let installedFixture = false;
let nuxtLogHandle;
let nuxtLogStream;
let runtimeRoot;
let database;

try {
  await fs.mkdir(outputDirectory, { recursive: true });
  assert(fsSync.existsSync(browserExecutable), `Chrome executable is unavailable: ${browserExecutable}`);
  assert(fsSync.existsSync(fixturePath), `Fixture is unavailable: ${fixturePath}`);
  assert(!fsSync.existsSync(installedPagePath), `Refusing to overwrite existing fixture route: ${installedPagePath}`);

  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  runtimeRoot = path.join(testRuntimeRoot, `token-browser-${suffix}`);
  database = resolveTestDatabaseLocation(`file:./db/token-browser-${suffix}.db`);
  const identities = {
    standaloneRunId: `browser-standalone-${suffix}`,
    teamRunId: `browser-team-a-${suffix}`,
    memberRunId: `browser-member-a-${suffix}`,
    otherMemberRunId: `browser-member-a2-${suffix}`,
    foreignTeamRunId: `browser-team-b-${suffix}`,
    foreignMemberRunId: `browser-member-b-${suffix}`,
  };
  evidence.identities = identities;

  backend = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl });
  await initializePrisma({ datasourceUrl: database.databaseUrl });
  prismaOpen = true;
  let usageStore = createUsageStore();

  const record = async (input) => await usageStore.recordObservation(buildPayload(input));
  await record({
    runId: identities.standaloneRunId, eventId: `standalone-1-${suffix}`,
    observedAt: '2026-08-20T10:00:00.000Z', inputTokens: 100, outputTokens: 20,
    reasoningTokens: 4, inputCost: 0.001, outputCost: 0.002, reasoningCost: 0.0004,
    totalCost: 0.0034, latestPromptTokens: 80,
  });
  await record({
    runId: identities.standaloneRunId, eventId: `standalone-2-${suffix}`,
    observedAt: '2026-08-20T10:05:00.000Z', inputTokens: 50, outputTokens: 5,
    reasoningTokens: 1, inputCost: 0.0005, outputCost: 0.0005, reasoningCost: 0.0001,
    totalCost: 0.0011, latestPromptTokens: 90,
  });
  await record({
    runId: identities.memberRunId, rootTeamRunId: identities.teamRunId,
    eventId: `member-a-1-${suffix}`, observedAt: '2026-08-20T10:01:00.000Z',
    inputTokens: 40, outputTokens: 10, inputCost: 0.0004, outputCost: 0.001,
    totalCost: 0.0014, latestPromptTokens: 35, teamName: 'Team A', memberDisplayName: 'Lead',
  });
  await record({
    runId: identities.memberRunId, rootTeamRunId: identities.teamRunId,
    eventId: `member-a-2-${suffix}`, observedAt: '2026-08-20T10:06:00.000Z',
    inputTokens: 20, outputTokens: 5, inputCost: 0.0002, outputCost: 0.0005,
    totalCost: 0.0007, latestPromptTokens: 42, teamName: 'Team A', memberDisplayName: 'Lead',
  });
  await record({
    runId: identities.otherMemberRunId, rootTeamRunId: identities.teamRunId,
    eventId: `member-a2-1-${suffix}`, observedAt: '2026-08-20T10:02:00.000Z',
    inputTokens: 25, outputTokens: 5, inputCost: 0.00025, outputCost: 0.0005,
    totalCost: 0.00075, latestPromptTokens: 20, teamName: 'Team A', memberDisplayName: 'Reviewer',
  });
  await record({
    runId: identities.foreignMemberRunId, rootTeamRunId: identities.foreignTeamRunId,
    eventId: `member-b-1-${suffix}`, observedAt: '2026-08-20T10:03:00.000Z',
    inputTokens: 7, outputTokens: 3, inputCost: 0.00007, outputCost: 0.0003,
    totalCost: 0.00037, latestPromptTokens: 6, teamName: 'Team B', memberDisplayName: 'Foreign',
  });

  await fs.copyFile(fixturePath, installedPagePath);
  installedFixture = true;
  const frontendPort = await reserveLoopbackPort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const nuxtLogPath = path.join(outputDirectory, 'nuxt.log');
  nuxtLogStream = fsSync.createWriteStream(nuxtLogPath);
  nuxt = spawn('pnpm', ['dev', '--port', String(frontendPort)], {
    cwd: webRoot,
    env: {
      ...process.env,
      BACKEND_NODE_BASE_URL: backend.serverUrl,
      BACKEND_GRAPHQL_WS_ENDPOINT: `ws://127.0.0.1:${backend.port}/graphql`,
    },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxt.stdout.pipe(nuxtLogStream, { end: false });
  nuxt.stderr.pipe(nuxtLogStream, { end: false });
  await waitFor('Nuxt token fixture readiness', async () => {
    if (nuxt.exitCode !== null) throw new Error(`Nuxt exited with ${nuxt.exitCode}`);
    try {
      const response = await fetch(`${frontendUrl}${routePath}?mode=manual`);
      return response.ok;
    } catch {
      return false;
    }
  });

  browser = await chromium.launch({ executablePath: browserExecutable, headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  const page = await context.newPage();
  const recordBrowserEvents = (target, label) => {
    target.on('console', (message) => evidence.browserEvents.push({ label, type: `console:${message.type()}`, text: message.text() }));
    target.on('pageerror', (error) => evidence.browserEvents.push({ label, type: 'pageerror', text: error.message }));
    target.on('request', (request) => {
      if (!isGraphqlRequest(request)) return;
      evidence.graphql.requestCount += 1;
      evidence.graphql.operations.push({
        label,
        operation: readOperationName(request),
        url: request.url(),
        at: new Date().toISOString(),
      });
    });
    target.on('requestfailed', (request) => evidence.browserEvents.push({
      label, type: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
    }));
  };
  recordBrowserEvents(page, 'primary');

  const url = (mode, extra = {}) => {
    const params = new URLSearchParams({
      mode,
      runId: identities.standaloneRunId,
      teamRunId: identities.teamRunId,
      memberRunId: identities.memberRunId,
      otherMemberRunId: identities.otherMemberRunId,
      foreignTeamRunId: identities.foreignTeamRunId,
      foreignMemberRunId: identities.foreignMemberRunId,
      ...extra,
    });
    return `${frontendUrl}${routePath}?${params}`;
  };
  const waitProbe = async (target) => {
    await target.locator('[data-test="token-usage-browser-probe"]').waitFor({ state: 'visible', timeout: timeoutMs });
    await target.waitForFunction(() => document.documentElement.dataset.tokenUsageProbeReady === 'true' && Boolean(window.__tokenUsageProbe));
  };
  const readState = async (target) => await target.evaluate(() => window.__tokenUsageProbe.state());

  await page.goto(url('standalone-before'), { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await waitProbe(page);
  try {
    await page.waitForFunction(() => window.__tokenUsageProbe.state().runSummary?.usageReportCount === 2, null, { timeout: 60_000 });
  } catch (error) {
    const state = await readState(page).catch(() => null);
    const bodyText = await page.locator('body').innerText().catch(() => 'unavailable');
    throw new Error(`Standalone hydration wait failed: ${error.message}; state=${JSON.stringify(state)}; body=${bodyText}`);
  }
  const standaloneText = await page.locator('[data-test="token-usage-primary"]').innerText();
  const standaloneState = await readState(page);
  assert(standaloneState.runSummary.totalTokens === 175, 'Standalone GraphQL hydration lost cumulative totals', standaloneState);
  assert(standaloneState.runSummary.estimatedApiTotalCost === 0.0045, 'Standalone GraphQL hydration lost cumulative cost', standaloneState);
  assert(standaloneText.includes('gpt-5.6-sol'), 'Standalone renderer omitted the model', standaloneText);
  assert(standaloneText.includes('codex_app_server'), 'Standalone renderer omitted the runtime', standaloneText);
  assert(standaloneText.includes('2 model calls'), 'Standalone renderer omitted the report count', standaloneText);
  await page.screenshot({ path: path.join(outputDirectory, 'standalone-live-before.png'), fullPage: true });
  evidence.scenarios['BROWSER-TS-001'] = { result: 'Pass', state: standaloneState, primaryText: standaloneText };

  const racePage = await context.newPage();
  recordBrowserEvents(racePage, 'race');
  const staleCaptured = deferred();
  const releaseStale = deferred();
  let staleIntercepted = false;
  await racePage.route('**/graphql', async (route) => {
    if (!isGraphqlRequest(route.request())) {
      await route.continue();
      return;
    }
    const operation = readOperationName(route.request());
    if (operation !== 'GetAgentRunTokenUsageSummary' || staleIntercepted) {
      await route.continue();
      return;
    }
    staleIntercepted = true;
    const response = await route.fetch();
    staleCaptured.resolve(true);
    await releaseStale.promise;
    await route.fulfill({ response });
  });
  await racePage.goto(url('manual'), { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await waitProbe(racePage);
  await racePage.evaluate(() => window.__tokenUsageProbe.setupStandalone(0));
  await staleCaptured.promise;

  await record({
    runId: identities.standaloneRunId, eventId: `standalone-3-${suffix}`,
    observedAt: '2026-08-20T10:07:00.000Z', inputTokens: 30, outputTokens: 10,
    inputCost: 0.0003, outputCost: 0.001, totalCost: 0.0013, latestPromptTokens: 110,
  });
  const liveDuringSummary = await queryRunSummary(backend.serverUrl, identities.standaloneRunId);
  assert(liveDuringSummary.usageReportCount === 3, 'Seeded live-during summary has the wrong generation', liveDuringSummary);
  await racePage.evaluate((summary) => window.__tokenUsageProbe.applyStandaloneSnapshot(summary, 'browser-live-during'), liveDuringSummary);
  releaseStale.resolve(true);
  await racePage.waitForFunction(() => window.__tokenUsageProbe.state().runSummary?.usageReportCount === 3);
  const afterStaleState = await readState(racePage);
  assert(afterStaleState.runSummary.totalTokens === 215, 'Stale GraphQL response replaced a newer live snapshot', afterStaleState);

  await record({
    runId: identities.standaloneRunId, eventId: `standalone-4-${suffix}`,
    observedAt: '2026-08-20T10:08:00.000Z', inputTokens: 10, outputTokens: 5,
    inputCost: 0.0001, outputCost: 0.0005, totalCost: 0.0006, latestPromptTokens: 120,
  });
  const liveAfterSummary = await queryRunSummary(backend.serverUrl, identities.standaloneRunId);
  await racePage.evaluate((summary) => window.__tokenUsageProbe.applyStandaloneSnapshot(summary, 'browser-live-after'), liveAfterSummary);
  await racePage.waitForFunction(() => window.__tokenUsageProbe.state().runSummary?.usageReportCount === 4);
  const liveAfterState = await readState(racePage);
  assert(liveAfterState.runSummary.totalTokens === 230, 'Live-after snapshot did not update the hydrated summary', liveAfterState);
  await racePage.screenshot({ path: path.join(outputDirectory, 'standalone-live-during-after.png'), fullPage: true });
  evidence.scenarios['BROWSER-TS-003'] = { result: 'Pass', staleResponseGeneration: 2, finalState: afterStaleState };
  evidence.scenarios['BROWSER-TS-004'] = { result: 'Pass', finalState: liveAfterState };

  const teamPage = await context.newPage();
  recordBrowserEvents(teamPage, 'team');
  await teamPage.goto(url('team-before'), { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await waitProbe(teamPage);
  await teamPage.waitForFunction(() => {
    const state = window.__tokenUsageProbe.state();
    return state.memberSummary?.usageReportCount === 2 && state.teamState === 'record_backed';
  });
  const teamState = await readState(teamPage);
  const teamPrimaryText = await teamPage.locator('[data-test="token-usage-primary"]').innerText();
  const teamTotalText = await teamPage.locator('[data-test="team-token-total-row"]').innerText();
  assert(teamState.memberSummary.rootTeamRunId === identities.teamRunId, 'Focused member lost exact team identity', teamState);
  assert(teamState.foreignMemberSummary === null, 'Another team identity satisfied the member cache', teamState);
  assert(teamState.memberSummary.totalTokens === 75, 'Focused member did not hydrate cumulative totals', teamState);
  assert(teamState.teamSummary.totalTokens === 105, 'Team aggregate did not hydrate all exact members', teamState);
  assert(teamPrimaryText.includes('2 model calls'), 'Focused member was not the primary rendered summary', teamPrimaryText);
  assert(teamTotalText.includes('105'), 'Team total row did not render the ledger aggregate', teamTotalText);
  await teamPage.screenshot({ path: path.join(outputDirectory, 'team-live-before.png'), fullPage: true });
  evidence.scenarios['BROWSER-TS-002'] = {
    result: 'Pass', state: teamState, primaryText: teamPrimaryText, totalText: teamTotalText,
  };

  const aggregatePage = await context.newPage();
  recordBrowserEvents(aggregatePage, 'aggregate');
  const aggregateCaptured = [deferred(), deferred()];
  const aggregateRelease = [deferred(), deferred()];
  let aggregateRequests = 0;
  let activeAggregateRequests = 0;
  let maxActiveAggregateRequests = 0;
  await aggregatePage.route('**/graphql', async (route) => {
    if (!isGraphqlRequest(route.request())) {
      await route.continue();
      return;
    }
    const operation = readOperationName(route.request());
    if (operation !== 'GetTeamRunTokenUsageSummary') {
      await route.continue();
      return;
    }
    const requestIndex = aggregateRequests;
    aggregateRequests += 1;
    activeAggregateRequests += 1;
    maxActiveAggregateRequests = Math.max(maxActiveAggregateRequests, activeAggregateRequests);
    try {
      const response = await route.fetch();
      if (requestIndex < aggregateCaptured.length) {
        aggregateCaptured[requestIndex].resolve(true);
        await aggregateRelease[requestIndex].promise;
      }
      await route.fulfill({ response });
    } finally {
      activeAggregateRequests -= 1;
    }
  });
  await aggregatePage.goto(url('manual'), { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await waitProbe(aggregatePage);
  await aggregatePage.evaluate(() => {
    window.__aggregateProbePromise = Promise.all([
      window.__tokenUsageProbe.fetchTeamAggregate(),
      window.__tokenUsageProbe.fetchTeamAggregate(),
      window.__tokenUsageProbe.fetchTeamAggregate(),
    ]);
  });
  await aggregateCaptured[0].promise;

  await record({
    runId: identities.memberRunId, rootTeamRunId: identities.teamRunId,
    eventId: `member-a-3-${suffix}`, observedAt: '2026-08-20T10:09:00.000Z',
    inputTokens: 11, outputTokens: 4, inputCost: 0.00011, outputCost: 0.0004,
    totalCost: 0.00051, latestPromptTokens: 50, teamName: 'Team A', memberDisplayName: 'Lead',
  });
  const teamLiveThree = await queryMemberSummary(backend.serverUrl, identities.teamRunId, identities.memberRunId);
  await aggregatePage.evaluate(({ summary }) => window.__tokenUsageProbe.applyTeamSnapshot(
    summary,
    'browser-team-traffic-3',
    { input: 11, output: 4, total: 15 },
  ), { summary: teamLiveThree });
  aggregateRelease[0].resolve(true);
  await aggregateCaptured[1].promise;

  await record({
    runId: identities.memberRunId, rootTeamRunId: identities.teamRunId,
    eventId: `member-a-4-${suffix}`, observedAt: '2026-08-20T10:10:00.000Z',
    inputTokens: 9, outputTokens: 1, inputCost: 0.00009, outputCost: 0.0001,
    totalCost: 0.00019, latestPromptTokens: 55, teamName: 'Team A', memberDisplayName: 'Lead',
  });
  const teamLiveFour = await queryMemberSummary(backend.serverUrl, identities.teamRunId, identities.memberRunId);
  await aggregatePage.evaluate(({ summary }) => window.__tokenUsageProbe.applyTeamSnapshot(
    summary,
    'browser-team-traffic-4',
    { input: 9, output: 1, total: 10 },
  ), { summary: teamLiveFour });
  aggregateRelease[1].resolve(true);
  await aggregatePage.evaluate(() => window.__aggregateProbePromise);
  await aggregatePage.waitForFunction(() => window.__tokenUsageProbe.state().teamState === 'record_backed');
  const aggregateState = await readState(aggregatePage);
  assert(aggregateRequests === 3, 'Continuous traffic did not produce exactly two serial dirty follow-ups', { aggregateRequests });
  assert(maxActiveAggregateRequests === 1, 'More than one team aggregate request was active', {
    aggregateRequests, maxActiveAggregateRequests,
  });
  assert(aggregateState.teamSummary.totalTokens === 130, 'Stable team aggregate omitted persisted traffic', aggregateState);
  assert(aggregateState.teamNeedsHydration === false, 'Stable team aggregate remained hydration-required', aggregateState);
  evidence.scenarios['BROWSER-TS-005'] = {
    result: 'Pass', aggregateRequests, maxActiveAggregateRequests, finalState: aggregateState,
  };

  await shutdownPrisma();
  prismaOpen = false;
  await backend.stop();
  const firstBackendOutput = backend.output();
  backend = await startBuiltTestServer({
    runtimeRoot,
    databaseUrlOverride: database.databaseUrl,
    port: backend.port,
  });
  await initializePrisma({ datasourceUrl: database.databaseUrl });
  prismaOpen = true;
  usageStore = createUsageStore();
  await page.goto(url('standalone-before'), { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await waitProbe(page);
  await page.waitForFunction(() => window.__tokenUsageProbe.state().runSummary?.usageReportCount === 4);
  const reopenedState = await readState(page);
  assert(reopenedState.runSummary.totalTokens === 230, 'Fresh renderer/backend restart did not reopen the persisted summary', reopenedState);
  evidence.scenarios['BROWSER-TS-006'] = { result: 'Pass', reopenedState };

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(outputDirectory, 'standalone-reopened-narrow.png'), fullPage: true });
  const narrowCard = await page.locator('[data-test="total-estimate-card"]').boundingBox();
  assert(narrowCard && narrowCard.width <= 390 && narrowCard.width > 250, 'Narrow Token Meter card escaped the viewport', narrowCard);
  evidence.scenarios['BROWSER-TS-007'] = { result: 'Pass', viewport: { width: 390, height: 844 }, totalCard: narrowCard };

  const pageErrors = evidence.browserEvents.filter((event) => event.type === 'pageerror');
  const failedRequests = evidence.browserEvents.filter((event) =>
    event.type === 'requestfailed'
    && !event.text.includes('api.iconify.design')
    && !event.text.includes('net::ERR_ABORTED'));
  assert(pageErrors.length === 0, 'Browser page errors were observed', pageErrors);
  assert(failedRequests.length === 0, 'Browser request failures were observed', failedRequests);

  await fs.writeFile(path.join(outputDirectory, 'backend-first.log'), firstBackendOutput);
  await fs.writeFile(path.join(outputDirectory, 'backend-restarted.log'), backend.output());
  await context.close();
  evidence.result = 'Pass';
} catch (error) {
  evidence.result = 'Fail';
  evidence.failure = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    details: error?.details,
  };
  process.exitCode = 1;
} finally {
  if (prismaOpen) {
    try {
      await shutdownPrisma();
      evidence.cleanup.prisma = 'closed';
    } catch (error) {
      evidence.cleanup.prisma = `failed: ${error.message}`;
      process.exitCode = 1;
    }
  }
  if (browser) {
    try {
      await browser.close();
      evidence.cleanup.browser = 'closed';
    } catch (error) {
      evidence.cleanup.browser = `failed: ${error.message}`;
      process.exitCode = 1;
    }
  }
  if (nuxt) {
    try {
      await stopOwnedProcess(nuxt);
      evidence.cleanup.nuxt = 'stopped';
    } catch (error) {
      evidence.cleanup.nuxt = `failed: ${error.message}`;
      process.exitCode = 1;
    }
  }
  if (nuxtLogStream) await new Promise((resolve) => nuxtLogStream.end(resolve));
  if (backend) {
    try {
      if (backend.child.exitCode === null) await backend.stop();
      evidence.cleanup.backend = 'stopped';
    } catch (error) {
      evidence.cleanup.backend = `failed: ${error.message}`;
      if (backend.child.exitCode === null) backend.child.kill('SIGKILL');
      process.exitCode = 1;
    }
  }
  if (runtimeRoot && database) {
    try {
      await removeOwnedTestRuntime(runtimeRoot, database);
      evidence.cleanup.runtime = 'removed';
    } catch (error) {
      evidence.cleanup.runtime = `failed: ${error.message}`;
      process.exitCode = 1;
    }
  }
  if (installedFixture) {
    try {
      await fs.rm(installedPagePath, { force: true });
      evidence.cleanup.fixtureRoute = 'removed';
    } catch (error) {
      evidence.cleanup.fixtureRoute = `failed: ${error.message}`;
      process.exitCode = 1;
    }
  }
  evidence.completedAt = new Date().toISOString();
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(path.join(outputDirectory, 'results.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ result: evidence.result, outputDirectory, cleanup: evidence.cleanup }, null, 2)}\n`);
  process.exit(process.exitCode || 0);
}

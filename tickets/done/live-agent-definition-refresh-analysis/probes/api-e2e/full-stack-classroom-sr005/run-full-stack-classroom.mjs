import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../../../../../autobyteus-web/node_modules/playwright-core/index.mjs';

const baseUrl = 'http://127.0.0.1:33123';
const backendUrl = 'http://127.0.0.1:38123';
const packagePath = '/home/autobyteus/workspace/autobyteus-agents';
const evidenceDir = path.resolve('tickets/in-progress/live-agent-definition-refresh-analysis/probes/api-e2e/full-stack-classroom-sr005');
const reportPath = path.join(evidenceDir, 'browser-evidence.json');
const evidence = {
  scenario: 'API-E2E-009',
  startedAt: new Date().toISOString(),
  baseUrl,
  backendUrl,
  browser: { executablePath: '/usr/bin/chromium', engine: 'playwright-core chromium', realTab: true, graphqlInterception: false },
  sourcePackage: packagePath,
  assertions: [],
  graphql: [],
  webSockets: [],
  console: [],
  pageErrors: [],
  snapshots: {},
  failures: [],
};

const recordAssertion = (id, pass, details = {}) => {
  evidence.assertions.push({ id, pass, at: new Date().toISOString(), details });
  if (!pass) throw new Error(`${id}: ${JSON.stringify(details)}`);
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const screenshot = async (page, name) => {
  const target = path.join(evidenceDir, `${name}.png`);
  await page.screenshot({ path: target, fullPage: true });
  return target;
};
const safeJson = (value) => {
  try { return JSON.parse(value); } catch { return null; }
};
const opNameFromQuery = (query = '') => /\b(?:query|mutation)\s+([A-Za-z0-9_]+)/.exec(query)?.[1] ?? 'anonymous';
const importantResponse = new Set([
  'GetAgentPackages', 'ImportAgentPackage', 'GetAgentTeamDefinitions', 'GetAgentTeamDefinition',
  'GetRuntimeAvailabilities', 'GetProviderModelCatalogSnapshots', 'CreateAgentTeamRun',
  'TerminateAgentTeamRun', 'GetTeamRunResumeConfig', 'UpdateStoppedTeamRunModelConfigs',
  'GetRunHistory', 'GetTeamRunExecutionCheckpoint',
]);

await fs.mkdir(evidenceDir, { recursive: true });
let browser;
let page;
try {
  browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  page = await context.newPage();
  page.setDefaultTimeout(30_000);

  page.on('console', (message) => {
    const text = message.text();
    evidence.console.push({ type: message.type(), text: text.slice(0, 2000), at: new Date().toISOString() });
  });
  page.on('pageerror', (error) => evidence.pageErrors.push({ message: String(error), stack: error?.stack ?? null }));
  page.on('websocket', (socket) => {
    const row = { url: socket.url(), openedAt: new Date().toISOString(), closedAt: null, framesSent: 0, framesReceived: 0, errors: [] };
    evidence.webSockets.push(row);
    socket.on('framesent', () => row.framesSent += 1);
    socket.on('framereceived', () => row.framesReceived += 1);
    socket.on('socketerror', (error) => row.errors.push(String(error)));
    socket.on('close', () => row.closedAt = new Date().toISOString());
  });
  page.on('request', (request) => {
    if (!request.url().includes('/graphql') || request.method() !== 'POST') return;
    const payload = safeJson(request.postData() ?? '');
    const operationName = payload?.operationName || opNameFromQuery(payload?.query);
    evidence.graphql.push({
      id: evidence.graphql.length + 1,
      operationName,
      url: request.url(),
      method: request.method(),
      variables: payload?.variables ?? null,
      requestedAt: new Date().toISOString(),
      status: null,
      response: null,
      failure: null,
    });
  });
  page.on('requestfailed', (request) => {
    if (!request.url().includes('/graphql')) return;
    const row = [...evidence.graphql].reverse().find((entry) => entry.url === request.url() && entry.status === null);
    if (row) row.failure = request.failure()?.errorText ?? 'request failed';
  });
  page.on('response', async (response) => {
    if (!response.url().includes('/graphql') || response.request().method() !== 'POST') return;
    const payload = safeJson(response.request().postData() ?? '');
    const operationName = payload?.operationName || opNameFromQuery(payload?.query);
    const row = [...evidence.graphql].reverse().find((entry) => entry.operationName === operationName && entry.status === null);
    if (!row) return;
    row.status = response.status();
    row.respondedAt = new Date().toISOString();
    if (importantResponse.has(operationName)) {
      try {
        const body = await response.text();
        row.response = safeJson(body) ?? body.slice(0, 12_000);
      } catch (error) {
        row.response = { captureError: String(error) };
      }
    }
  });

  // This is one real browser tab against the real Nuxt proxy and built backend.
  // Deliberately do not install any page.route/GraphQL interception.
  await page.goto(`${baseUrl}/settings?section=agent-packages`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="agent-packages-manager"]').waitFor();
  recordAssertion('STACK-HEALTH', (await fetch(`${backendUrl}/rest/health`)).ok, { backendUrl, frontendUrl: page.url() });
  recordAssertion('REAL-FRONTEND-LOADED', page.url().startsWith(baseUrl), { url: page.url(), title: await page.title() });
  await screenshot(page, '01-settings-before-import');

  let packageRow = page.locator('[data-testid="agent-package-row-local_path"]').filter({ hasText: packagePath });
  const alreadyImported = await packageRow.count() > 0;
  if (!alreadyImported) {
    await page.locator('[data-testid="agent-package-source-input"]').fill(packagePath);
    await page.locator('[data-testid="agent-package-import-button"]').click();
    await page.locator('[data-testid="agent-packages-success"]').waitFor({ timeout: 120_000 });
    packageRow = page.locator('[data-testid="agent-package-row-local_path"]').filter({ hasText: packagePath });
    await packageRow.waitFor({ timeout: 120_000 });
  }
  const packageRowText = (await packageRow.innerText()).replace(/\s+/g, ' ').trim();
  evidence.snapshots.packageRowText = packageRowText;
  recordAssertion('REAL-PACKAGE-IMPORTED', packageRowText.includes(packagePath), { alreadyImported, packageRowText });
  recordAssertion('REAL-PACKAGE-COUNTS', /Shared Agents:\s*\d+\s*\| Team-local Agents:\s*\d+\s*\| Teams:\s*\d+\s*\| Applications:\s*\d+/.test(packageRowText), { packageRowText });
  const importOp = [...evidence.graphql].reverse().find((entry) => entry.operationName === 'ImportAgentPackage');
  recordAssertion('REAL-IMPORT-GRAPHQL', alreadyImported || Boolean(importOp && importOp.status === 200 && !importOp.response?.errors), { alreadyImported, importOp });
  await screenshot(page, '02-settings-imported-real-package');

  await page.goto(`${baseUrl}/agent-teams`, { waitUntil: 'domcontentloaded' });
  const search = page.locator('#team-search');
  await search.waitFor();
  await search.fill('Classroom Simulation Team');
  const teamCard = page.locator('div.group.rounded-xl').filter({ hasText: 'Classroom Simulation Team' }).first();
  await teamCard.waitFor({ timeout: 60_000 });
  const teamCardText = (await teamCard.innerText()).replace(/\s+/g, ' ').trim();
  evidence.snapshots.teamCardText = teamCardText;
  recordAssertion('CLASSROOM-TEAM-RENDERED', teamCardText.includes('Classroom Simulation Team'), { teamCardText });
  recordAssertion('CLASSROOM-REAL-MEMBERS', teamCardText.includes('professor') && teamCardText.includes('student'), { teamCardText });
  await screenshot(page, '03-classroom-team-card');

  await teamCard.getByRole('button', { name: /View details/i }).click();
  await page.getByText('Classroom Simulation Team', { exact: true }).first().waitFor();
  await wait(500);
  const detailText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  evidence.snapshots.teamDetailText = detailText.slice(0, 20_000);
  recordAssertion('CLASSROOM-DETAIL-REAL-DEFINITION', detailText.includes('professor') && detailText.includes('student'), { url: page.url() });
  await screenshot(page, '04-classroom-team-detail');

  // Return to the list and launch this actual imported Team with the locally available Codex App Server runtime.
  await page.goto(`${baseUrl}/agent-teams`, { waitUntil: 'domcontentloaded' });
  await page.locator('#team-search').fill('Classroom Simulation Team');
  const runCard = page.locator('div.group.rounded-xl').filter({ hasText: 'Classroom Simulation Team' }).first();
  await runCard.waitFor();
  await runCard.getByRole('button', { name: /^Run$/i }).click();
  await page.waitForURL(`${baseUrl}/workspace`, { timeout: 30_000 });
  const form = page.locator('[data-test="team-run-config-form"]');
  await form.waitFor({ timeout: 60_000 });
  recordAssertion('CLASSROOM-CONFIG-OPENED', await form.getAttribute('data-mode') === 'editable', { mode: await form.getAttribute('data-mode') });

  const runtimeSelect = page.locator('#team-scope-root-runtime-kind');
  await runtimeSelect.waitFor();
  const runtimeOptions = await runtimeSelect.locator('option').evaluateAll((options) => options.map((option) => ({ value: option.value, text: option.textContent, disabled: option.disabled })));
  evidence.snapshots.runtimeOptions = runtimeOptions;
  recordAssertion('REAL-CODEX-RUNTIME-AVAILABLE', runtimeOptions.some((option) => option.value === 'codex_app_server' && !option.disabled), { runtimeOptions });
  await runtimeSelect.selectOption('codex_app_server');

  const modelButton = page.getByRole('button', { name: /Select a model/i }).first();
  await modelButton.waitFor({ state: 'visible', timeout: 60_000 });
  await modelButton.click();
  const modelSearch = page.locator('input[placeholder="Search models..."]').last();
  await modelSearch.fill('GPT-5.4');
  const modelOption = page.locator('li').filter({ hasText: 'GPT-5.4 (default reasoning: medium)' }).first();
  await modelOption.waitFor();
  await modelOption.click();

  const runButton = page.locator('button.run-btn');
  await runButton.waitFor();
  await page.waitForFunction(() => {
    const button = document.querySelector('button.run-btn');
    return button && !button.disabled;
  }, null, { timeout: 60_000 });
  evidence.snapshots.launchConfigText = (await form.innerText()).replace(/\s+/g, ' ').trim();
  await screenshot(page, '05-classroom-real-launch-config');

  const createResponsePromise = page.waitForResponse((response) => {
    if (!response.url().includes('/graphql') || response.request().method() !== 'POST') return false;
    const payload = safeJson(response.request().postData() ?? '');
    return (payload?.operationName || opNameFromQuery(payload?.query)) === 'CreateAgentTeamRun';
  }, { timeout: 120_000 });
  await runButton.click();
  const createResponse = await createResponsePromise;
  const createBody = await createResponse.json();
  const createResult = createBody?.data?.createAgentTeamRun;
  evidence.snapshots.createTeamRun = createResult;
  recordAssertion('REAL-CLASSROOM-TEAM-LAUNCHED', createResponse.status() === 200 && createResult?.success === true && Boolean(createResult?.teamRunId), { status: createResponse.status(), createResult });
  const teamRunId = createResult.teamRunId;

  await page.locator('[data-testid="agent-team-event-monitor"]').waitFor({ timeout: 120_000 });
  await page.locator('[data-test="workspace-header-edit-config"]').waitFor();
  const workspaceText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  evidence.snapshots.launchedWorkspaceText = workspaceText.slice(0, 20_000);
  recordAssertion('REAL-CLASSROOM-WORKSPACE', workspaceText.includes('professor') || workspaceText.includes('Classroom Simulation Team'), { teamRunId });
  await screenshot(page, '06-classroom-team-running');

  // Stop via the real run-history UI, then open Settings/config fresh.
  let terminateButton = page.getByRole('button', { name: 'Terminate team', exact: true });
  if (await terminateButton.count() === 0) {
    await wait(6_000);
    terminateButton = page.getByRole('button', { name: 'Terminate team', exact: true });
  }
  await terminateButton.first().waitFor({ timeout: 30_000 });
  const terminateResponsePromise = page.waitForResponse((response) => {
    if (!response.url().includes('/graphql') || response.request().method() !== 'POST') return false;
    const payload = safeJson(response.request().postData() ?? '');
    return (payload?.operationName || opNameFromQuery(payload?.query)) === 'TerminateAgentTeamRun';
  }, { timeout: 120_000 });
  await terminateButton.first().click();
  const terminateResponse = await terminateResponsePromise;
  const terminateBody = await terminateResponse.json();
  evidence.snapshots.terminateTeamRun = terminateBody?.data?.terminateAgentTeamRun;
  recordAssertion('REAL-CLASSROOM-TEAM-STOPPED', terminateResponse.status() === 200 && terminateBody?.data?.terminateAgentTeamRun?.success === true, { status: terminateResponse.status(), result: terminateBody?.data?.terminateAgentTeamRun });

  // Let the history projection publish the now-inactive lifecycle before opening Settings.
  await wait(1_000);
  await page.locator('[data-test="workspace-header-edit-config"]').click();
  await page.locator('[data-test="team-run-config-form"][data-mode="existing"]').waitFor({ timeout: 60_000 });
  const stoppedNotice = page.locator('[data-test="team-run-existing-notice"]');
  await stoppedNotice.waitFor();
  const stoppedNoticeText = (await stoppedNotice.innerText()).replace(/\s+/g, ' ').trim();
  evidence.snapshots.stoppedNoticeText = stoppedNoticeText;
  recordAssertion('NETWORK-FRESH-STOPPED-SETTINGS', /stopped/i.test(stoppedNoticeText), { stoppedNoticeText, teamRunId });

  const reasoningSelect = page.locator('#team-scope-root-reasoning_effort');
  await reasoningSelect.waitFor({ timeout: 60_000 });
  const reasoningBefore = await reasoningSelect.inputValue();
  await reasoningSelect.selectOption('low');
  const saveButton = page.locator('[data-test="save-existing-model-config"]');
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-test="save-existing-model-config"]');
    return button && !button.disabled;
  }, null, { timeout: 30_000 });
  await screenshot(page, '07-classroom-stopped-settings-edited');

  const saveResponsePromise = page.waitForResponse((response) => {
    if (!response.url().includes('/graphql') || response.request().method() !== 'POST') return false;
    const payload = safeJson(response.request().postData() ?? '');
    return (payload?.operationName || opNameFromQuery(payload?.query)) === 'UpdateStoppedTeamRunModelConfigs';
  }, { timeout: 120_000 });
  await saveButton.click();
  const saveResponse = await saveResponsePromise;
  const saveBody = await saveResponse.json();
  const saveResult = saveBody?.data?.updateStoppedTeamRunModelConfigs;
  evidence.snapshots.saveTeamModelConfig = saveResult;
  recordAssertion('REAL-STOPPED-CONFIG-SAVED', saveResponse.status() === 200 && saveResult?.success === true && saveResult?.outcome === 'UPDATED', { reasoningBefore, reasoningAfter: 'low', status: saveResponse.status(), saveResult });
  await screenshot(page, '08-classroom-stopped-settings-saved');

  // Return to events and submit a later real browser message. This restores the same stopped identity.
  await page.locator('[data-test="run-config-back-to-events"]').click();
  const composer = page.locator('textarea[placeholder="Type a message..."]');
  await composer.waitFor({ timeout: 60_000 });
  await composer.fill('Reply only with: CLASSROOM_E2E_OK');
  const sendButton = page.getByRole('button', { name: 'Send message', exact: true });
  await sendButton.waitFor();
  const sendStartedAt = new Date().toISOString();
  await sendButton.click();
  evidence.snapshots.realMessage = { sentAt: sendStartedAt, prompt: 'Reply only with: CLASSROOM_E2E_OK' };
  await page.getByText('CLASSROOM_E2E_OK', { exact: false }).last().waitFor({ timeout: 300_000 });
  const responseTexts = await page.getByText('CLASSROOM_E2E_OK', { exact: false }).allInnerTexts();
  evidence.snapshots.realMessage.responseTexts = responseTexts;
  evidence.snapshots.realMessage.completedAt = new Date().toISOString();
  recordAssertion('REAL-CLASSROOM-CODEX-TURN', responseTexts.some((text) => text.includes('CLASSROOM_E2E_OK')), { teamRunId, responseTexts });
  await screenshot(page, '09-classroom-real-codex-response');

  // Stop the restored Team again so the validation leaves no live execution behind.
  await wait(1_000);
  const stopAgain = page.getByRole('button', { name: 'Terminate team', exact: true });
  if (await stopAgain.count()) {
    await stopAgain.first().click();
    await wait(2_000);
  }
  evidence.snapshots.finalUrl = page.url();
  evidence.completedAt = new Date().toISOString();
  evidence.result = 'PASS';
} catch (error) {
  evidence.completedAt = new Date().toISOString();
  evidence.result = 'FAIL';
  evidence.failures.push({ message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null });
  if (page) {
    try {
      evidence.snapshots.failureUrl = page.url();
      evidence.snapshots.failureBody = (await page.locator('body').innerText()).slice(0, 30_000);
      await screenshot(page, 'failure');
    } catch {}
  }
} finally {
  if (browser) await browser.close().catch(() => undefined);
  await fs.writeFile(reportPath, `${JSON.stringify(evidence, null, 2)}\n`);
}

if (evidence.result !== 'PASS') {
  console.error(JSON.stringify({ result: evidence.result, failures: evidence.failures, reportPath }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ result: evidence.result, assertions: evidence.assertions.length, graphqlOperations: evidence.graphql.length, reportPath }, null, 2));
}

#!/usr/bin/env node
// Run from autobyteus-web: pnpm test:e2e:agent-org-task-team-disclosure
// Optional: --output-dir <path> --browser-executable <path> --port <n> --ledger <absolute path>.
// Proves delegated (task) Team rows in the Agent Org history tree disclose like mounted Team rows
// (REQ-001..006 / AC-001..005 of task-team-row-collapse-chevron) through the production projector,
// collection component and tree-state composable in a real headless Chrome with trusted input.
// Starts its own Nuxt dev server on a free port against a dead backend URL; the temporary Nuxt route,
// browser and process are always removed in finally.

import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, '../..');
const fixturePath = path.join(scriptDir, 'fixtures/agent-org-task-team-disclosure.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-agent-org-task-team-disclosure.vue');
const routePath = '/api-e2e-agent-org-task-team-disclosure';

const getArg = (name, fallback = undefined) => {
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')
    ? process.argv[index + 1]
    : fallback;
};
const timeoutMs = Number(getArg('timeout-ms', '90000'));

// Rows removed by a collapse leave the tree with the 200 ms `tree-row` transition (aria-hidden and inert at
// once; see components/workspace/history/treeRowLeave.css). Absence is asserted once that leave has settled.
const LEAVE_SETTLE_MS = 1500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const afterLeave = async (predicate) => {
  const deadline = Date.now() + LEAVE_SETTLE_MS;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return Boolean(await predicate());
};
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/agent-org-task-team-disclosure'));
const explicitPort = getArg('port');
const browserExecutableArg = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH);
const browserCandidates = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const executablePath = browserExecutableArg || browserCandidates.find((candidate) => existsSync(candidate));
const evidence = {
  startedAt: new Date().toISOString(),
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  browserExecutable: executablePath || 'playwright-default',
  fixturePath,
  scenarios: {},
  browserEvents: [],
  cleanup: {},
  failures: [],
};
const assert = (condition, message, details = undefined) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};
const ledgerPath = getArg('ledger');
const checkpoint = async () => {
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
};
const scenario = async (id, description, run) => {
  const startedAt = new Date().toISOString();
  try {
    const details = await run();
    evidence.scenarios[id] = { result: 'Pass', description, startedAt, details };
    await checkpoint();
    if (ledgerPath) await fs.appendFile(ledgerPath, `\n## Browser checkpoint ${id}\nPass — ${description}. Evidence: ${evidencePath} (${id}).\n`);
    return details;
  } catch (error) {
    const failure = {
      id, description, message: error instanceof Error ? error.message : String(error),
      details: error?.details, stack: error instanceof Error ? error.stack : undefined,
    };
    evidence.scenarios[id] = { result: 'Fail', description, startedAt, failure };
    evidence.failures.push(failure);
    await checkpoint();
    if (ledgerPath) await fs.appendFile(ledgerPath, `\n## Browser checkpoint ${id}\nFail — ${failure.message}. Evidence: ${evidencePath}.\n`);
    throw error;
  }
};
const choosePort = async () => explicitPort ? Number(explicitPort) : await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    server.close((error) => error ? reject(error) : resolve(port));
  });
});
const childExited = (child) => !child || child.exitCode !== null || child.signalCode !== null;
const waitForChildExit = async (child, timeout) => childExited(child) ? true : await new Promise((resolve) => {
  const finish = (exited) => { clearTimeout(timer); child.off('exit', onExit); resolve(exited); };
  const onExit = () => finish(true);
  const timer = setTimeout(() => finish(childExited(child)), timeout);
  child.once('exit', onExit);
});
const stopOwnedProcess = async (child) => {
  if (!child) return { status: 'not-started' };
  const details = { pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode };
  if (!childExited(child)) {
    if (process.platform === 'win32') child.kill('SIGTERM'); else process.kill(-child.pid, 'SIGTERM');
    if (!await waitForChildExit(child, 10000)) {
      if (process.platform === 'win32') child.kill('SIGKILL'); else process.kill(-child.pid, 'SIGKILL');
      assert(await waitForChildExit(child, 5000), 'Owned Nuxt process did not stop after SIGKILL', details);
    }
  }
  return { status: 'terminated', ...details, finalExitCode: child.exitCode, finalSignalCode: child.signalCode };
};
const waitFor = async (label, predicate, timeout = timeoutMs) => {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
};
const state = (page) => page.evaluate(() => window.__taskTeamDisclosureProbe.state());
const graphQlData = (operationName, query) => {
  if (operationName === 'GetAgentDefinitions' || query.includes('agentDefinitions')) return { agentDefinitions: [] };
  if (operationName === 'GetAgentTeamDefinitions' || query.includes('agentTeamDefinitions')) return { agentTeamDefinitions: [] };
  if (operationName === 'GetApplicationsCapability' || query.includes('applicationsCapability')) {
    return { applicationsCapability: { enabled: false, scope: 'BOUND_NODE', settingKey: 'ENABLE_APPLICATIONS', source: 'INITIALIZED_EMPTY_CATALOG' } };
  }
  if (operationName === 'GetAllWorkspaces' || query.includes('workspaces')) return { workspaces: [] };
  if (operationName === 'GetServerSettings' || query.includes('serverSettings')) return { serverSettings: [] };
  return {};
};

await fs.mkdir(outputDir, { recursive: true });
const evidencePath = path.join(outputDir, 'evidence.json');
const nuxtLogPath = path.join(outputDir, 'nuxt.log');
const screenshot = async (name) => page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true });
let fixtureInstalled = false;
let nuxtProcess;
let nuxtLog;
let browser;
let context;
let page;
let result = 'Pass';

try {
  assert(existsSync(fixturePath), `Fixture does not exist: ${fixturePath}`);
  assert(!existsSync(installedPagePath), `Refusing to overwrite existing page: ${installedPagePath}`);
  assert(executablePath, 'No Chrome/Chromium executable found; pass --browser-executable');
  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;
  const port = await choosePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.port = port;
  evidence.baseUrl = baseUrl;
  nuxtLog = createWriteStream(nuxtLogPath, { flags: 'w' });
  nuxtProcess = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir,
    detached: process.platform !== 'win32',
    env: { ...process.env, NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxtProcess.stdout.pipe(nuxtLog);
  nuxtProcess.stderr.pipe(nuxtLog);
  await waitFor('Nuxt fixture route', async () => {
    if (childExited(nuxtProcess)) throw new Error(`Nuxt exited before readiness: ${nuxtProcess.exitCode}/${nuxtProcess.signalCode}`);
    return (await fetch(`${baseUrl}${routePath}`)).ok;
  });

  browser = await chromium.launch({ headless: true, executablePath });
  evidence.browserVersion = browser.version();
  context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'en-US', colorScheme: 'light' });
  page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({
    type: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`,
  }));
  await page.route('**/rest/health', async (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: '{"status":"ok"}',
  }));
  await page.route('**/graphql', async (route) => {
    let payload = {};
    try { payload = route.request().postDataJSON?.() ?? {}; } catch { payload = {}; }
    const operationName = typeof payload.operationName === 'string' ? payload.operationName : '';
    const query = typeof payload.query === 'string' ? payload.query : '';
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: graphQlData(operationName, query) }) });
  });

  // The definitions change feed the Workspaces shell opens; the fixture has no backend (baseline fix).
  await page.routeWebSocket(/\/ws\/agent-package-definitions(\?|$)/, (ws) => ws.send(JSON.stringify({ type: 'connected' })));
  // Baseline fix (autobyteus-385 API/E2E): the window also opens the update-notifications stream (autobyteus-210); the fixture has no backend.
  await page.routeWebSocket(/\/ws\/update-notifications(\?|$)/, () => undefined);
  // autobyteus-461 SR-082: the window holds the shown runs' statuses on `/ws/run-status`; the fixture has no backend.
  await page.routeWebSocket(/\/ws\/run-status(\?|$)/, () => undefined);
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="ttrc-disclosure-probe-root"]').waitFor({ state: 'visible' });
  await page.waitForFunction(() => Boolean(window.__taskTeamDisclosureProbe));
  // Vite may perform a one-time dependency optimization reload when the installed fixture imports
  // production components not yet warmed in this process; record only the validation window.
  evidence.browserEvents = [];

  // autobyteus-461 FU-031 / SR-084: an Org's delegated runs are the shared transient rows, nested under the agent or member
  // that delegated them (the Teacher's under the Teacher; the nested Reviewers Team under student_one of the first copy). A
  // delegated Team row has no run-ID attribute; the two StudentStudyGroup copies are told apart by their order (the first and
  // the second under the Teacher), which no scenario changes. CR-461-108: opening a row reveals what it opens (a Team row
  // expands, never folds on open); only its chevron folds it.
  const TT = '[data-test="workspace-team-transient-execution-row"]';
  const taskTeam = (id) => id === 'reviewers-task-nested'
    ? page.locator(`${TT}[data-delegated-run-kind="task_team"][data-member-address="/Reviewers"]`).first()
    : page.locator(`${TT}[data-delegated-run-kind="task_team"][data-member-address="/StudentStudyGroup"]`).nth(id === 'ssg-task-1' ? 0 : 1);
  const disclosure = (id) => taskTeam(id).locator('[data-test="workspace-team-transient-disclosure"]');
  const taskMember = (id) => page.locator(`${TT}[data-agent-run-id="${id}"]`);
  const agentRow = (id) => page.locator(`[data-test="agent-org-agent-row-${id}"]`);
  const mountedTeam = (id) => page.locator(`[data-test="agent-org-team-row-${id}"]`);
  /** The rows in order: an Org's own row by its data-test; a delegated row by its agent run ID or `team:<address>#<n>`. */
  const rowOrder = () => page.locator('[role="treeitem"]').evaluateAll((rows) => {
    const seen = {};
    return rows.map((row) => {
      const test = row.getAttribute('data-test');
      if (test !== 'workspace-team-transient-execution-row') return test;
      if (row.getAttribute('data-delegated-run-kind') !== 'task_team') return row.getAttribute('data-agent-run-id');
      const address = row.getAttribute('data-member-address');
      seen[address] = (seen[address] ?? 0) + 1;
      return `team:${address}#${seen[address]}`;
    }).filter((id) => id !== 'agent-org-run-open-ttrc-org-run');
  });
  const ID = { 'ssg-task-1': 'team:/StudentStudyGroup#1', 'ssg-task-2': 'team:/StudentStudyGroup#2', 'reviewers-task-nested': 'team:/Reviewers#1' };
  const rotation = (locator) => locator.evaluate((el) => {
    const target = el.querySelector('svg') ?? el;
    const transform = getComputedStyle(target).transform;
    if (!transform || transform === 'none') return 0;
    const [a, b] = transform.slice(transform.indexOf('(') + 1, -1).split(',').map(Number);
    return Math.round(Math.atan2(b, a) * 180 / Math.PI);
  });
  const box = (locator) => locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x * 100) / 100, y: Math.round(r.y * 100) / 100, width: r.width, height: r.height, tag: el.tagName.toLowerCase() };
  });
  const visible = async (locator) => (await locator.count()) > 0 && await locator.first().isVisible();
  const expectExpanded = async (id, expanded) => {
    assert(await taskTeam(id).getAttribute('aria-expanded') === String(expanded), `${id} aria-expanded is not ${expanded}`);
    evidence.rotations = { ...(evidence.rotations ?? {}), [`${id}:${expanded}`]: await rotation(disclosure(id)) };
  };
  const fold = async (id) => { await disclosure(id).click(); await waitFor(`${id} folded`, async () => await taskTeam(id).getAttribute('aria-expanded') === 'false'); };
  const unfold = async (id) => { await disclosure(id).click(); await waitFor(`${id} unfolded`, async () => await taskTeam(id).getAttribute('aria-expanded') === 'true'); };
  const SSG1_DESCENDANTS = ['ssg1-s1', 'ssg1-s2', 'reviewers-nested-chair'];

  await scenario('API-TTRC-B01', 'Default: delegated Team rows open under their delegator, each with its chevron (AC-001, REQ-001/005; SR-084)', async () => {
    await taskTeam('ssg-task-1').waitFor({ state: 'visible' });
    const order = await rowOrder();
    const expectedOrder = [
      'agent-org-agent-row-teacher-run', ID['ssg-task-1'], 'ssg1-s1', ID['reviewers-task-nested'], 'reviewers-nested-chair', 'ssg1-s2',
      ID['ssg-task-2'], 'ssg2-s1', 'ssg2-s2', 'teacher-task',
      'agent-org-team-row-ssg-configured', 'agent-org-agent-row-ssg-configured-s1', 'agent-org-agent-row-ssg-configured-s2', 'agent-org-team-row-reviewers-configured',
    ];
    assert(order.join('|') === expectedOrder.join('|'), 'Unexpected default row order', { order });
    for (const id of ['ssg-task-1', 'reviewers-task-nested', 'ssg-task-2']) {
      await disclosure(id).waitFor({ state: 'visible' });
      await expectExpanded(id, true);
    }
    const outer = await box(disclosure('ssg-task-1'));
    const second = await box(disclosure('ssg-task-2'));
    const nested = await box(disclosure('reviewers-task-nested'));
    assert(outer.x === second.x, 'Sibling delegated chevrons are not aligned', { outer, second });
    assert(nested.x > outer.x, 'Nested delegated chevron is not indented', { outer, nested });
    const rowLabel = await taskTeam('ssg-task-1').getAttribute('aria-label');
    assert(/StudentStudyGroup/.test(rowLabel ?? '') && /Started by Teacher/.test(rowLabel ?? ''), 'Row label lacks its name or delegator', { rowLabel });
    await screenshot('b01-default-open');
    return { order, geometry: { outer, second, nested }, rowLabel };
  });

  await scenario('API-TTRC-B02', 'Chevron folds (descendants hidden, sibling follows) and unfolds (AC-002, AC-004; CR-461-108: only the chevron folds)', async () => {
    await fold('ssg-task-1');
    await expectExpanded('ssg-task-1', false);
    for (const id of SSG1_DESCENDANTS) assert(await afterLeave(async () => await taskMember(id).count() === 0), `Descendant ${id} still rendered`);
    assert(await afterLeave(async () => await taskTeam('reviewers-task-nested').count() === 0), 'Nested delegated Team still rendered');
    const order = await rowOrder();
    const index = order.indexOf(ID['ssg-task-1']);
    assert(order[index + 1] === ID['ssg-task-2'], 'Folded row is not followed by its sibling', { order });
    await screenshot('b02-collapsed');
    await unfold('ssg-task-1');
    await expectExpanded('ssg-task-1', true);
    for (const id of SSG1_DESCENDANTS) assert(await visible(taskMember(id)), `Descendant ${id} not restored`);
    return { collapsedOrder: order };
  });

  await scenario('API-TTRC-B03', 'Keyboard: the row is focusable; Enter opens without folding; the chevron folds and unfolds by keyboard (REQ-004; CR-461-108)', async () => {
    const row = taskTeam('ssg-task-2');
    assert(await row.evaluate((el) => el.tabIndex >= 0), 'Delegated Team row is not focusable');
    await row.focus();
    assert(await row.evaluate((el) => document.activeElement === el), 'Row did not take focus');
    const chevron = disclosure('ssg-task-2');
    await chevron.focus(); await page.keyboard.press('Enter');
    await waitFor('Enter on the chevron folds', async () => await row.getAttribute('aria-expanded') === 'false');
    assert(await afterLeave(async () => await taskMember('ssg2-s1').count() === 0 && await taskMember('ssg2-s2').count() === 0), 'Folding did not hide members');
    await screenshot('b03-keyboard-collapsed');
    await chevron.focus(); await page.keyboard.press('Space');
    await waitFor('Space on the chevron unfolds', async () => await row.getAttribute('aria-expanded') === 'true');
    assert(await visible(taskMember('ssg2-s1')), 'Unfolding did not restore members');
    return { focusable: true };
  });

  await scenario('API-TTRC-B04', 'Nested delegated Team folds independently and keeps its state across the outer fold (REQ-003)', async () => {
    await fold('reviewers-task-nested');
    await expectExpanded('reviewers-task-nested', false);
    await expectExpanded('ssg-task-1', true);
    assert(await afterLeave(async () => await taskMember('reviewers-nested-chair').count() === 0), 'Nested member still visible');
    assert(await visible(taskMember('ssg1-s1')) && await visible(taskMember('ssg1-s2')), 'Outer members hidden by the nested fold');
    await screenshot('b04-nested-collapsed');
    await fold('ssg-task-1');
    await unfold('ssg-task-1');
    await expectExpanded('reviewers-task-nested', false);
    assert(await afterLeave(async () => await taskMember('reviewers-nested-chair').count() === 0), 'Nested state lost across the outer fold');
    await unfold('reviewers-task-nested');
    await waitFor('nested restored', async () => await visible(taskMember('reviewers-nested-chair')));
    return { order: await rowOrder() };
  });

  await scenario('API-TTRC-B05', 'Same-named mounted Team and a second delegation of the same Team keep independent state (AC-003)', async () => {
    await page.evaluate(() => window.__taskTeamDisclosureProbe.resetCalls());
    await fold('ssg-task-1');
    assert(await mountedTeam('ssg-configured').getAttribute('aria-expanded') === 'true', 'Mounted StudentStudyGroup folded with the delegation');
    assert(await visible(agentRow('ssg-configured-s1')), 'Mounted Team members hidden by the delegated fold');
    await expectExpanded('ssg-task-2', true);
    assert(await visible(taskMember('ssg2-s1')), 'Second delegation hidden by the first delegation fold');
    await mountedTeam('ssg-configured').click();
    await waitFor('mounted collapse', async () => await mountedTeam('ssg-configured').getAttribute('aria-expanded') === 'false');
    assert(await afterLeave(async () => await agentRow('ssg-configured-s1').count() === 0), 'Mounted Team did not collapse');
    await expectExpanded('ssg-task-1', false);
    await expectExpanded('ssg-task-2', true);
    await screenshot('b05-independent-state');
    const snapshot = await state(page);
    assert(snapshot.mountedTeams['/StudentStudyGroup'] === false, 'Mounted state mismatch', snapshot);
    assert(JSON.stringify(snapshot.calls.select) === JSON.stringify(['/StudentStudyGroup']), 'Mounted Team click did not keep select semantics', snapshot.calls);
    await mountedTeam('ssg-configured').click();
    await unfold('ssg-task-1');
    await waitFor('both restored', async () => await visible(agentRow('ssg-configured-s1')) && await visible(taskMember('ssg1-s1')));
    return { snapshot };
  });

  await scenario('API-TTRC-B07', 'Mounted Team and Agent rows unchanged; delegated Agent and member rows have no disclosure (AC-005)', async () => {
    await page.evaluate(() => window.__taskTeamDisclosureProbe.resetCalls());
    assert(await agentRow('teacher-run').getAttribute('aria-expanded') === null, 'The Org Agent row gained aria-expanded');
    assert(await taskMember('teacher-task').getAttribute('aria-expanded') === null, 'Delegated Agent row gained a disclosure');
    assert(await taskMember('ssg1-s2').getAttribute('aria-expanded') === null, 'Delegated Team member gained a disclosure');
    const chevrons = await page.locator(`${TT}[data-delegated-run-kind="task_team"] [data-test="workspace-team-transient-disclosure"]`).count();
    assert(chevrons === 3, 'Unexpected chevron count on delegated Team rows', { chevrons });
    assert(await mountedTeam('reviewers-configured').getAttribute('aria-expanded') === 'false', 'Mounted Reviewers default changed');
    await mountedTeam('reviewers-configured').click();
    await waitFor('mounted Reviewers open', async () => await visible(agentRow('reviewers-configured-chair')));
    await agentRow('teacher-run').click();
    const snapshot = await state(page);
    assert(JSON.stringify(snapshot.calls.select) === JSON.stringify(['/Reviewers', '/Teacher']), 'Configured row select semantics changed', snapshot.calls);
    await mountedTeam('reviewers-configured').click();
    return { snapshot };
  });

  await scenario('API-TTRC-B06', 'Live tree update while folded keeps the delegated Team folded (REQ-003/005)', async () => {
    await fold('ssg-task-1');
    await page.evaluate(() => window.__taskTeamDisclosureProbe.addLateMember());
    await waitFor('run became live', async () => await page.locator('[data-test="agent-org-run-open-ttrc-org-run"] .bg-emerald-500').count() === 1);
    await sleep(500);
    await expectExpanded('ssg-task-1', false);
    assert(await taskMember('ssg1-late').count() === 0, 'Live update reopened the folded delegated Team');
    await expectExpanded('ssg-task-2', true);
    await screenshot('b06-live-collapsed');
    await unfold('ssg-task-1');
    await waitFor('late member visible', async () => await visible(taskMember('ssg1-late')));
    return { order: await rowOrder() };
  });

  await scenario('API-TTRC-B08', 'Opening a delegated Team row reveals it: a click never folds it (CR-461-108)', async () => {
    await expectExpanded('ssg-task-2', true);
    await taskTeam('ssg-task-2').click();
    await sleep(500);
    const after = await taskTeam('ssg-task-2').getAttribute('aria-expanded').catch(() => null);
    assert(after === 'true' || after === null, 'A click folded the delegated Team row', { after });
    await screenshot('b08-opened');
    return { after };
  });

  const browserErrors = evidence.browserEvents.filter(event => event.type === 'pageerror'
    || (event.type === 'console:error' ));
  assert(browserErrors.length === 0, 'Unexpected browser error', browserErrors);
} catch (error) {
  result = 'Fail';
  if (page) {
    evidence.failureDom = await page.locator('body').innerText().catch(() => 'unavailable');
    await screenshot('failure').catch(() => {});
  }
  if (!evidence.failures.some((failure) => failure.message === error.message)) {
    evidence.failures.push({
      id: 'HARNESS', description: 'Run Agent Org delegated Team disclosure browser probe',
      message: error instanceof Error ? error.message : String(error), details: error?.details,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
} finally {
  try { await context?.close(); evidence.cleanup.browserContext = context ? 'closed' : 'not-started'; }
  catch (error) { result = 'Fail'; evidence.cleanup.browserContext = `failed: ${error.message}`; }
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; }
  catch (error) { result = 'Fail'; evidence.cleanup.browser = `failed: ${error.message}`; }
  try { evidence.cleanup.nuxt = await stopOwnedProcess(nuxtProcess); }
  catch (error) { result = 'Fail'; evidence.cleanup.nuxt = `failed: ${error.message}`; }
  try { if (nuxtLog) await new Promise((resolve) => nuxtLog.end(resolve)); evidence.cleanup.nuxtLog = 'closed'; }
  catch (error) { result = 'Fail'; evidence.cleanup.nuxtLog = `failed: ${error.message}`; }
  try {
    if (fixtureInstalled) await fs.rm(installedPagePath, { force: true });
    evidence.cleanup.installedFixture = fixtureInstalled ? 'removed' : 'not-installed';
  } catch (error) { result = 'Fail'; evidence.cleanup.installedFixture = `failed: ${error.message}`; }
  evidence.result = result;
  evidence.finishedAt = new Date().toISOString();
  evidence.artifacts = {
    evidencePath, nuxtLogPath, outputDir,
  };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (result === 'Pass') process.stdout.write(`Agent Org delegated Team disclosure browser probe passed. Evidence: ${evidencePath}\n`);
else {
  process.stderr.write(`Agent Org delegated Team disclosure browser probe failed. See ${evidencePath}\n`);
  process.exitCode = 1;
}

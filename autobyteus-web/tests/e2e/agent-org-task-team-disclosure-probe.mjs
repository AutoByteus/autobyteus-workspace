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
  if (operationName === 'GetSkillImprovementCapability' || query.includes('skillImprovementCapability')) {
    return { skillImprovementCapability: { enabled: false, settingKey: 'ENABLE_SKILL_IMPROVEMENT', source: 'INITIALIZED_EMPTY_CATALOG' } };
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

  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="ttrc-disclosure-probe-root"]').waitFor({ state: 'visible' });
  await page.waitForFunction(() => Boolean(window.__taskTeamDisclosureProbe));
  // Vite may perform a one-time dependency optimization reload when the installed fixture imports
  // production components not yet warmed in this process; record only the validation window.
  evidence.browserEvents = [];

  const taskTeam = (id) => page.locator(`[data-test="agent-org-task-team-row-${id}"]`);
  const disclosure = (id) => page.locator(`[data-test="agent-org-task-team-disclosure-${id}"]`);
  const taskMember = (id) => page.locator(`[data-test="agent-org-task-agent-row-${id}"]`);
  const agentRow = (id) => page.locator(`[data-test="agent-org-agent-row-${id}"]`);
  const mountedTeam = (id) => page.locator(`[data-test="agent-org-team-row-${id}"]`);
  const MOUNTED_CHEVRON = '[data-test="agent-org-team-row-ssg-configured"] > :nth-child(2)';
  const rowOrder = () => page.locator('[role="tree"] > [role="treeitem"]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-test')));
  const followingSibling = (locator) => locator.locator('[data-test="workspace-hierarchy-branches"] > [data-has-following-sibling]')
    .getAttribute('data-has-following-sibling');
  const rotation = (locator) => locator.evaluate((el) => {
    const transform = getComputedStyle(el).transform;
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
    const degrees = await rotation(disclosure(id));
    assert(expanded ? degrees === 0 : degrees === -90, `${id} chevron rotation is ${degrees}`, { expanded });
  };
  const SSG1_DESCENDANTS = ['ssg1-s1', 'ssg1-s2', 'reviewers-nested-chair'];
  const inspectCalls = async () => (await state(page)).calls.inspect;

  await scenario('API-TTRC-B01', 'Default: delegated Team rows open, chevron down and aligned with the mounted Team chevron (AC-001, REQ-001/005)', async () => {
    await taskTeam('ssg-task-1').waitFor({ state: 'visible' });
    const order = await rowOrder();
    const expectedOrder = [
      'agent-org-agent-row-teacher-run', 'agent-org-team-row-ssg-configured', 'agent-org-agent-row-ssg-configured-s1',
      'agent-org-agent-row-ssg-configured-s2', 'agent-org-team-row-reviewers-configured', 'agent-org-task-team-row-ssg-task-1',
      'agent-org-task-agent-row-ssg1-s1', 'agent-org-task-agent-row-ssg1-s2', 'agent-org-task-team-row-reviewers-task-nested',
      'agent-org-task-agent-row-reviewers-nested-chair', 'agent-org-task-team-row-ssg-task-2', 'agent-org-task-agent-row-ssg2-s1',
      'agent-org-task-agent-row-ssg2-s2', 'agent-org-task-agent-row-teacher-task',
    ];
    assert(order.join('|') === expectedOrder.join('|'), 'Unexpected default row order', { order });
    for (const id of ['ssg-task-1', 'reviewers-task-nested', 'ssg-task-2']) {
      await disclosure(id).waitFor({ state: 'visible' });
      await expectExpanded(id, true);
      assert(await disclosure(id).getAttribute('aria-hidden') === 'true', `${id} chevron is not aria-hidden`);
    }
    const mounted = await box(page.locator(MOUNTED_CHEVRON));
    const outer = await box(disclosure('ssg-task-1'));
    const second = await box(disclosure('ssg-task-2'));
    const nested = await box(disclosure('reviewers-task-nested'));
    assert(outer.x === mounted.x && second.x === mounted.x, 'Delegated chevron is not horizontally aligned with the mounted Team chevron', { mounted, outer, second });
    assert(outer.width === mounted.width && outer.height === mounted.height && outer.width === 14, 'Delegated chevron size differs from the mounted Team chevron', { mounted, outer });
    assert(Math.abs(nested.x - (outer.x + 14)) < 0.5, 'Nested delegated chevron is not indented by one level', { outer, nested });
    assert(await taskTeam('ssg-task-1').getAttribute('aria-label') === 'StudentStudyGroup, Started by Teacher, /StudentStudyGroup, ssg-task-1', 'Row label changed');
    await screenshot('b01-default-open');
    return { order, geometry: { mounted, outer, second, nested }, chevronElement: outer.tag };
  });

  await scenario('API-TTRC-B02', 'Mouse click collapses (rotation, descendants hidden, connectors) and inspects the coordinator; second click restores (AC-002, AC-004)', async () => {
    await page.evaluate(() => window.__taskTeamDisclosureProbe.resetCalls());
    await taskTeam('ssg-task-1').click();
    await waitFor('ssg-task-1 collapse', async () => await taskTeam('ssg-task-1').getAttribute('aria-expanded') === 'false');
    await expectExpanded('ssg-task-1', false);
    for (const id of SSG1_DESCENDANTS) assert(await taskMember(id).count() === 0, `Descendant ${id} still rendered`);
    assert(await taskTeam('reviewers-task-nested').count() === 0, 'Nested delegated Team still rendered');
    const order = await rowOrder();
    const index = order.indexOf('agent-org-task-team-row-ssg-task-1');
    assert(order[index + 1] === 'agent-org-task-team-row-ssg-task-2', 'Collapsed row is not followed by its sibling', { order });
    assert(await followingSibling(taskTeam('ssg-task-1')) === 'true', 'Collapsed row lost its sibling connector');
    assert(await followingSibling(taskTeam('ssg-task-2')) === 'true', 'Second delegation connector changed');
    assert(await followingSibling(taskMember('teacher-task')) === 'false', 'Last root row gained a connector');
    let calls = await inspectCalls();
    assert(JSON.stringify(calls) === JSON.stringify([{ agentRunId: 'ssg1-s1', address: '/StudentStudyGroup/student_one' }]), 'Coordinator not inspected exactly once', calls);
    await screenshot('b02-collapsed');
    await taskTeam('ssg-task-1').click();
    await waitFor('ssg-task-1 expand', async () => await taskTeam('ssg-task-1').getAttribute('aria-expanded') === 'true');
    await expectExpanded('ssg-task-1', true);
    for (const id of SSG1_DESCENDANTS) assert(await visible(taskMember(id)), `Descendant ${id} not restored`);
    calls = await inspectCalls();
    assert(calls.length === 2 && calls[1].agentRunId === 'ssg1-s1', 'Second click did not inspect the coordinator', calls);
    assert((await state(page)).calls.select.length === 0, 'Delegated row click selected a configured member');
    return { collapsedOrder: order, calls };
  });

  await scenario('API-TTRC-B03', 'Keyboard Enter/Space on the focused row toggles and inspects (REQ-004)', async () => {
    await page.evaluate(() => window.__taskTeamDisclosureProbe.resetCalls());
    const row = taskTeam('ssg-task-2');
    assert(await row.evaluate((el) => el.tagName === 'BUTTON' && el.tabIndex >= 0), 'Delegated Team row is not a focusable button');
    await row.focus();
    assert(await row.evaluate((el) => document.activeElement === el), 'Row did not take focus');
    await page.keyboard.press('Enter');
    await waitFor('Enter collapse', async () => await row.getAttribute('aria-expanded') === 'false');
    await expectExpanded('ssg-task-2', false);
    assert(await taskMember('ssg2-s1').count() === 0 && await taskMember('ssg2-s2').count() === 0, 'Enter did not hide members');
    await screenshot('b03-keyboard-collapsed');
    await page.keyboard.press('Space');
    await waitFor('Space expand', async () => await row.getAttribute('aria-expanded') === 'true');
    await expectExpanded('ssg-task-2', true);
    assert(await visible(taskMember('ssg2-s1')), 'Space did not restore members');
    // Tab order: Shift+Tab from the second delegation reaches the previous focusable row.
    await page.keyboard.press('Shift+Tab');
    const previous = await page.evaluate(() => document.activeElement?.getAttribute('data-test'));
    assert(previous === 'agent-org-task-agent-row-reviewers-nested-chair', 'Unexpected keyboard focus order', { previous });
    const calls = await inspectCalls();
    assert(calls.length === 2 && calls.every((call) => call.agentRunId === 'ssg2-s1' && call.address === '/StudentStudyGroup/student_one'), 'Keyboard activation did not inspect the coordinator', calls);
    return { calls, previousFocus: previous };
  });

  await scenario('API-TTRC-B04', 'Nested delegated Team collapses independently and keeps its state across outer collapse (REQ-003)', async () => {
    await taskTeam('reviewers-task-nested').click();
    await waitFor('nested collapse', async () => await taskTeam('reviewers-task-nested').getAttribute('aria-expanded') === 'false');
    await expectExpanded('reviewers-task-nested', false);
    await expectExpanded('ssg-task-1', true);
    assert(await taskMember('reviewers-nested-chair').count() === 0, 'Nested member still visible');
    assert(await visible(taskMember('ssg1-s1')) && await visible(taskMember('ssg1-s2')), 'Outer members hidden by nested collapse');
    assert(await followingSibling(taskTeam('reviewers-task-nested')) === 'false', 'Collapsed nested row has a stray connector');
    assert(await followingSibling(taskMember('ssg1-s2')) === 'true', 'Outer member connector to nested row missing');
    const calls = await inspectCalls();
    assert(calls.at(-1)?.agentRunId === 'reviewers-nested-chair', 'Nested row did not inspect its own coordinator', calls);
    await screenshot('b04-nested-collapsed');
    await taskTeam('ssg-task-1').click();
    await taskTeam('ssg-task-1').click();
    await waitFor('outer re-expanded', async () => await taskTeam('ssg-task-1').getAttribute('aria-expanded') === 'true');
    await expectExpanded('reviewers-task-nested', false);
    assert(await taskMember('reviewers-nested-chair').count() === 0, 'Nested state lost across outer collapse');
    const snapshot = await state(page);
    assert(snapshot.taskTeams['reviewers-task-nested'] === false && snapshot.taskTeams['ssg-task-1'] === true, 'Tree state mismatch', snapshot);
    await taskTeam('reviewers-task-nested').click();
    await waitFor('nested restored', async () => await visible(taskMember('reviewers-nested-chair')));
    return { snapshot };
  });

  await scenario('API-TTRC-B05', 'Same-named mounted Team and a second delegation of the same Team keep independent state (AC-003)', async () => {
    await page.evaluate(() => window.__taskTeamDisclosureProbe.resetCalls());
    await taskTeam('ssg-task-1').click();
    await waitFor('ssg-task-1 collapse', async () => await taskTeam('ssg-task-1').getAttribute('aria-expanded') === 'false');
    assert(await mountedTeam('ssg-configured').getAttribute('aria-expanded') === 'true', 'Mounted StudentStudyGroup collapsed with the delegation');
    assert(await visible(agentRow('ssg-configured-s1')), 'Mounted Team members hidden by delegated collapse');
    await expectExpanded('ssg-task-2', true);
    assert(await visible(taskMember('ssg2-s1')), 'Second delegation hidden by first delegation collapse');
    await mountedTeam('ssg-configured').click();
    await waitFor('mounted collapse', async () => await mountedTeam('ssg-configured').getAttribute('aria-expanded') === 'false');
    assert(await agentRow('ssg-configured-s1').count() === 0, 'Mounted Team did not collapse');
    await expectExpanded('ssg-task-1', false);
    await expectExpanded('ssg-task-2', true);
    await screenshot('b05-independent-state');
    const snapshot = await state(page);
    assert(snapshot.mountedTeams['/StudentStudyGroup'] === false && snapshot.taskTeams['ssg-task-1'] === false && snapshot.taskTeams['ssg-task-2'] === true, 'Independent state mismatch', snapshot);
    assert(JSON.stringify(snapshot.calls.select) === JSON.stringify(['/StudentStudyGroup']), 'Mounted Team click did not keep select semantics', snapshot.calls);
    assert(snapshot.calls.inspect.length === 1, 'Mounted Team click inspected a delegated coordinator', snapshot.calls);
    await mountedTeam('ssg-configured').click();
    await taskTeam('ssg-task-1').click();
    await waitFor('both restored', async () => await visible(agentRow('ssg-configured-s1')) && await visible(taskMember('ssg1-s1')));
    return { snapshot };
  });

  await scenario('API-TTRC-B07', 'Mounted Team, Agent and delegated Agent rows unchanged (AC-005)', async () => {
    await page.evaluate(() => window.__taskTeamDisclosureProbe.resetCalls());
    assert(await agentRow('teacher-run').getAttribute('aria-expanded') === null, 'Agent row gained a disclosure');
    assert(await taskMember('teacher-task').getAttribute('aria-expanded') === null, 'Delegated Agent row gained a disclosure');
    assert(await taskMember('ssg1-s1').getAttribute('aria-expanded') === null, 'Delegated Team member gained a disclosure');
    const chevrons = await page.locator('[data-test^="agent-org-task-team-disclosure-"]').evaluateAll((els) => els.map((el) => `${el.tagName}:${el.getAttribute('data-test')}`));
    assert(chevrons.length === 3, 'Unexpected chevron count on delegated rows', { chevrons });
    assert(await mountedTeam('reviewers-configured').getAttribute('aria-expanded') === 'false', 'Mounted Reviewers default changed');
    await mountedTeam('reviewers-configured').click();
    await waitFor('mounted Reviewers open', async () => await visible(agentRow('reviewers-configured-chair')));
    await taskMember('teacher-task').click();
    await agentRow('teacher-run').click();
    const snapshot = await state(page);
    assert(JSON.stringify(snapshot.calls.select) === JSON.stringify(['/Reviewers', '/Teacher']), 'Configured row select semantics changed', snapshot.calls);
    assert(JSON.stringify(snapshot.calls.inspect) === JSON.stringify([{ agentRunId: 'teacher-task', address: '/Teacher' }]), 'Delegated Agent inspect semantics changed', snapshot.calls);
    await mountedTeam('reviewers-configured').click();
    return { snapshot };
  });

  await scenario('API-TTRC-B06', 'Live tree update while collapsed keeps the delegated Team collapsed (REQ-003/005)', async () => {
    await taskTeam('ssg-task-1').click();
    await waitFor('ssg-task-1 collapse', async () => await taskTeam('ssg-task-1').getAttribute('aria-expanded') === 'false');
    await page.evaluate(() => window.__taskTeamDisclosureProbe.addLateMember());
    await waitFor('run became live', async () => await page.locator('[data-test="agent-org-run-open-ttrc-org-run"] .bg-emerald-500').count() === 1);
    await expectExpanded('ssg-task-1', false);
    assert(await taskMember('ssg1-late').count() === 0, 'Live update reopened the collapsed delegated Team');
    await expectExpanded('ssg-task-2', true);
    await screenshot('b06-live-collapsed');
    await taskTeam('ssg-task-1').click();
    await waitFor('late member visible', async () => await visible(taskMember('ssg1-late')));
    await expectExpanded('ssg-task-1', true);
    return { final: await state(page), order: await rowOrder() };
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

#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, '../..');
const workspaceDir = path.resolve(webDir, '..');
const serverDir = path.join(workspaceDir, 'autobyteus-server-ts');

const getArg = (name, fallback = undefined) => {
  const inline = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) return process.argv[index + 1];
  return fallback;
};
const hasFlag = (name) => process.argv.includes(`--${name}`);
const scenario = getArg('scenario', 'all');
const validScenarios = new Set(['all', 'list', 'detail', 'failure', 'lifecycle']);
if (!validScenarios.has(scenario)) throw new Error(`Unsupported --scenario '${scenario}'. Expected one of: ${[...validScenarios].join(', ')}`);

const timeoutMs = Number(getArg('timeout-ms', '120000'));
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/agent-org-role-labels'));
const browserExecutableArg = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH);
const executablePath = browserExecutableArg || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((candidate) => existsSync(candidate));
const skipServerBuild = hasFlag('skip-server-build');

const fixture = {
  alpha: {
    id: 'aorg-role-stability-alpha',
    name: 'Alpha Stable Roles Org',
    directRole: 'Research_Lead',
    directLabel: 'Research Lead',
    directRef: 'aorg-role-research-agent',
    directDefinitionName: 'Canonical Research Agent',
    teamRole: 'Delivery-Team',
    teamLabel: 'Delivery Team',
    teamRef: 'aorg-role-delivery-team',
    teamDefinitionName: 'Canonical Delivery Team Definition',
    coordinatorRole: 'Architecture_Lead',
    coordinatorLabel: 'Architecture Lead',
    coordinatorLocalRef: 'architecture-agent',
    coordinatorDefinitionName: 'Canonical Architecture Agent',
  },
  beta: {
    id: 'aorg-role-stability-beta',
    name: 'Beta Stable Roles Org',
    directRole: 'Quality_Lead',
    directLabel: 'Quality Lead',
    directRef: 'aorg-role-quality-agent',
    directDefinitionName: 'Canonical Quality Agent',
    teamRole: 'Release-Team',
    teamLabel: 'Release Team',
    teamRef: 'aorg-role-release-team',
    teamDefinitionName: 'Canonical Release Team Definition',
    coordinatorRole: 'Release_Captain',
    coordinatorLabel: 'Release Captain',
    coordinatorLocalRef: 'release-agent',
    coordinatorDefinitionName: 'Canonical Release Agent',
  },
};

const evidence = {
  startedAt: new Date().toISOString(),
  scenario,
  platform: `${process.platform}-${process.arch}`,
  node: process.version,
  browserExecutable: executablePath || 'playwright-default',
  workspaceDir,
  operations: [],
  browserEvents: [],
  scenarios: {},
  fixture: {},
  cleanup: {},
  failures: [],
};

const assert = (condition, message, details = undefined) => {
  if (condition) return;
  const error = new Error(message);
  error.details = details;
  throw error;
};
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const waitFor = async (description, fn, timeout = timeoutMs) => {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};
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
const childExited = (child) => child.exitCode !== null || child.signalCode !== null;
const runCommand = (command, args, { cwd, env, logPath }) => new Promise((resolve, reject) => {
  const log = createWriteStream(logPath, { flags: 'a' });
  const child = require('node:child_process').spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.once('error', reject);
  child.once('close', (code, signal) => {
    log.end();
    if (code === 0) resolve({ code, signal });
    else reject(new Error(`${command} ${args.join(' ')} exited code=${code} signal=${signal}`));
  });
});
const startService = (command, args, { cwd, env, logPath }) => {
  const log = createWriteStream(logPath, { flags: 'a' });
  const child = require('node:child_process').spawn(command, args, {
    cwd,
    env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.once('close', () => log.end());
  return child;
};
const stopOwned = async (child) => {
  if (!child) return { status: 'not-started' };
  if (!childExited(child)) {
    if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGTERM');
    else child.kill('SIGTERM');
    await Promise.race([new Promise((resolve) => child.once('close', resolve)), sleep(8_000)]);
  }
  if (!childExited(child)) {
    if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL');
    else child.kill('SIGKILL');
    await Promise.race([new Promise((resolve) => child.once('close', resolve)), sleep(5_000)]);
  }
  assert(childExited(child), 'Owned process did not terminate', { pid: child.pid });
  return { status: 'terminated', pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode };
};
const fetchOk = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4_000) });
    return response.ok;
  } catch {
    return false;
  }
};
const operationPayloads = (request) => {
  if (!request.url().includes('/graphql') || request.method() !== 'POST') return [];
  try {
    const body = request.postDataJSON();
    return (Array.isArray(body) ? body : [body]).map((entry) => ({
      ...entry,
      operationName: entry?.operationName || entry?.query?.match(/(?:query|mutation)\s+(\w+)/)?.[1] || 'unknown',
    }));
  } catch {
    return [];
  }
};
const operationName = (request) => operationPayloads(request)[0]?.operationName;
const operationCount = (name, label = undefined) => evidence.operations.filter((entry) => entry.operationName === name && (!label || entry.label === label)).length;
const exactReadCount = () => evidence.operations.filter((entry) => entry.operationName === 'GetAgentOrgReferencedAgent' || entry.operationName === 'GetAgentOrgReferencedTeam').length;

const markdown = ({ name, description, instructions, role }) => [
  '---',
  `name: ${name}`,
  `description: ${description}`,
  ...(role ? [`role: ${role}`] : []),
  'category: e2e',
  '---',
  '',
  instructions,
  '',
].join('\n');
const writeJson = (file, value) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const writeAgent = async (root, id, name) => {
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, 'agent.md'), markdown({
    name,
    description: `Persisted E2E Agent ${id}`,
    role: 'E2E worker',
    instructions: 'Serve the isolated Agent Org role-label browser probe.',
  }));
  await writeJson(path.join(root, 'agent-config.json'), {
    toolNames: [], skillNames: [], inputProcessorNames: [], llmResponseProcessorNames: [],
    toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [],
    avatarUrl: null, defaultLaunchConfig: null,
  });
};
const writeDefinitionFixture = async (dataRoot) => {
  for (const value of Object.values(fixture)) {
    await writeAgent(path.join(dataRoot, 'agents', value.directRef), value.directRef, value.directDefinitionName);
    const teamRoot = path.join(dataRoot, 'agent-teams', value.teamRef);
    await writeAgent(path.join(teamRoot, 'agents', value.coordinatorLocalRef), value.coordinatorLocalRef, value.coordinatorDefinitionName);
    await fs.writeFile(path.join(teamRoot, 'team.md'), markdown({
      name: value.teamDefinitionName,
      description: `Persisted E2E Team ${value.teamRef}`,
      instructions: 'Coordinate the isolated role-label browser probe.',
    }));
    await writeJson(path.join(teamRoot, 'team-config.json'), {
      coordinatorMemberName: value.coordinatorRole,
      members: [{ memberName: value.coordinatorRole, ref: value.coordinatorLocalRef, refScope: 'team_local' }],
      handoffs: [], avatarUrl: null, defaultLaunchConfig: null,
    });
    const orgRoot = path.join(dataRoot, 'agent-orgs', value.id);
    await fs.mkdir(orgRoot, { recursive: true });
    await fs.writeFile(path.join(orgRoot, 'org.md'), markdown({
      name: value.name,
      description: `Persisted E2E Org ${value.id}`,
      instructions: 'Keep authored membership roles stable throughout browsing.',
    }));
    await writeJson(path.join(orgRoot, 'org-config.json'), {
      members: [
        { memberName: value.directRole, ref: value.directRef, refType: 'agent', refScope: 'shared' },
        { memberName: value.teamRole, ref: value.teamRef, refType: 'agent_team', refScope: 'shared' },
      ],
      handoffs: [{ from: `/${value.directRole}`, to: `/${value.teamRole}`, rules: ['Delegate the approved E2E result.'] }],
      avatarUrl: null,
      defaultLaunchConfig: null,
    });
  }
};
const treeHashes = async (root) => {
  const hashes = {};
  const visit = async (directory) => {
    for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(candidate);
      else hashes[path.relative(root, candidate)] = createHash('sha256').update(await fs.readFile(candidate)).digest('hex');
    }
  };
  for (const directory of ['agents', 'agent-teams', 'agent-orgs']) await visit(path.join(root, directory));
  return hashes;
};

const initContext = async (context, locale) => {
  await context.addInitScript((preference) => {
    localStorage.setItem('autobyteus.localization.preference-mode', preference);
    window.__agentOrgRoleLabelEvidence = { snapshots: [] };
    const record = () => {
      const labels = [...document.querySelectorAll('[data-test^="org-member-"]')].map((node) => ({
        testId: node.getAttribute('data-test'), text: node.textContent?.trim() || '', ariaLabel: node.getAttribute('aria-label'),
      }));
      if (!labels.length) return;
      const serialized = JSON.stringify(labels);
      const snapshots = window.__agentOrgRoleLabelEvidence.snapshots;
      if (snapshots.at(-1)?.serialized !== serialized) snapshots.push({ at: performance.now(), serialized, labels });
    };
    const start = () => {
      new MutationObserver(record).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true });
      record();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }, locale);
};
const attachPageEvidence = (page, label) => {
  page.on('request', (request) => {
    for (const payload of operationPayloads(request)) {
      evidence.operations.push({
        label,
        operationName: payload.operationName,
        variables: payload.variables ?? {},
        url: request.url(),
        requestedAt: new Date().toISOString(),
      });
    }
  });
  page.on('response', async (response) => {
    const payloads = operationPayloads(response.request());
    if (!payloads.length) return;
    let body;
    try { body = await response.json(); } catch { body = null; }
    for (const payload of payloads) {
      const entry = evidence.operations.findLast((candidate) => candidate.label === label && candidate.operationName === payload.operationName && candidate.status === undefined);
      if (entry) {
        entry.status = response.status();
        entry.errors = body?.errors?.map((error) => error.message) ?? [];
        if (payload.operationName === 'GetAgentOrgDefinitions' || payload.operationName === 'GetAgentOrgEndpointCatalog') entry.data = body?.data ?? null;
      }
    }
  });
  page.on('console', (message) => evidence.browserEvents.push({ label, type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ label, type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({ label, type: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}` }));
};
const createPage = async (browser, label, locale = 'en') => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'zh-CN' ? 'zh-CN' : 'en-US', timezoneId: 'UTC' });
  await initContext(context, locale);
  const page = await context.newPage();
  attachPageEvidence(page, label);
  return { context, page };
};
const card = (page, id) => page.locator(`[data-test="org-card-${id}"]`);
const cardLabels = (page, id) => card(page, id).locator('[data-test^="org-member-"]');
const assertNoIdentityLeak = async (page, values = Object.values(fixture)) => {
  const text = await page.locator('[data-test="agent-org-experience"]').innerText();
  const forbidden = values.flatMap((value) => [
    value.directRef, value.teamRef, value.directDefinitionName, value.teamDefinitionName, value.coordinatorDefinitionName,
  ]).filter((value) => text.includes(value));
  assert(forbidden.length === 0, 'Browsing surface exposed definition identity instead of local role', forbidden);
};

const runListScenario = async (browser, frontendUrl) => {
  const { context, page } = await createPage(browser, 'list-en');
  try {
    const beforeExact = exactReadCount();
    await page.goto(`${frontendUrl}/agent-orgs?view=org-list`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await card(page, fixture.alpha.id).waitFor({ state: 'visible', timeout: timeoutMs });
    const initialLabels = await cardLabels(page, fixture.alpha.id).allTextContents();
    const initialAria = await cardLabels(page, fixture.alpha.id).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
    assert(JSON.stringify(initialLabels) === JSON.stringify([fixture.alpha.directLabel, fixture.alpha.teamLabel]), 'Initial Alpha list labels are not Org roles', initialLabels);
    assert(JSON.stringify(initialAria) === JSON.stringify([`Agent ${fixture.alpha.directLabel}`, `Team ${fixture.alpha.teamLabel}`]), 'Initial Alpha accessible names are not role-based', initialAria);
    await sleep(600);
    await assertNoIdentityLeak(page);

    const orgQueriesBeforeReload = operationCount('GetAgentOrgDefinitions', 'list-en');
    await page.getByRole('button', { name: 'Reload', exact: true }).click();
    await waitFor('Agent Org reload query', () => operationCount('GetAgentOrgDefinitions', 'list-en') > orgQueriesBeforeReload);
    await page.getByRole('button', { name: 'Reload', exact: true }).waitFor({ state: 'visible' });
    const reloadedLabels = await cardLabels(page, fixture.alpha.id).allTextContents();
    assert(JSON.stringify(reloadedLabels) === JSON.stringify(initialLabels), 'Reload changed stable role labels', { initialLabels, reloadedLabels });

    const search = page.getByRole('textbox').first();
    await search.fill('Beta Stable');
    await card(page, fixture.beta.id).waitFor({ state: 'visible' });
    assert(await card(page, fixture.alpha.id).count() === 0, 'Search did not filter the Alpha card');
    await search.fill('Alpha Stable');
    await card(page, fixture.alpha.id).waitFor({ state: 'visible' });

    const snapshots = await page.evaluate(() => window.__agentOrgRoleLabelEvidence.snapshots);
    const fixtureTestIds = new Set(Object.values(fixture).flatMap((value) => [
      `org-member-agent-${value.directRef}`,
      `org-member-team-${value.teamRef}`,
    ]));
    const observedTexts = snapshots.flatMap((snapshot) => snapshot.labels
      .filter((label) => fixtureTestIds.has(label.testId))
      .map((label) => label.text));
    const allowed = new Set(Object.values(fixture).flatMap((value) => [value.directLabel, value.teamLabel]));
    assert(observedTexts.every((value) => allowed.has(value)), 'A list mutation snapshot contained a non-role label', { observedTexts, allowed: [...allowed] });
    assert(exactReadCount() === beforeExact, 'List/search/Reload issued exact Agent/Team reads', evidence.operations.filter((entry) => entry.operationName.startsWith('GetAgentOrgReferenced')));

    const runButton = card(page, fixture.alpha.id).getByRole('button', { name: 'Run', exact: true });
    assert(await runButton.isEnabled(), 'Run action is not available on the admitted Org card');
    await page.screenshot({ path: path.join(outputDir, 'list-en.png'), fullPage: true });

    evidence.scenarios['AORG-E2E-003-list'] = {
      initialLabels, initialAria, reloadedLabels, snapshots, runActionEnabled: true,
      getAgentOrgDefinitions: operationCount('GetAgentOrgDefinitions', 'list-en'),
      exactReadsBeforeRun: exactReadCount() - beforeExact,
    };
  } finally {
    await context.close();
  }

  const zh = await createPage(browser, 'list-zh-CN', 'zh-CN');
  try {
    await zh.page.goto(`${frontendUrl}/agent-orgs?view=org-list`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await card(zh.page, fixture.alpha.id).waitFor({ state: 'visible', timeout: timeoutMs });
    const labels = await cardLabels(zh.page, fixture.alpha.id).allTextContents();
    const aria = await cardLabels(zh.page, fixture.alpha.id).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
    assert(JSON.stringify(labels) === JSON.stringify([fixture.alpha.directLabel, fixture.alpha.teamLabel]), 'Chinese locale changed stored role casing/content', labels);
    assert(JSON.stringify(aria) === JSON.stringify([`智能体 ${fixture.alpha.directLabel}`, `团队 ${fixture.alpha.teamLabel}`]), 'Chinese accessible role names are incomplete', aria);
    evidence.scenarios['AORG-E2E-003-list-zh-CN'] = { labels, aria };
  } finally {
    await zh.context.close();
  }
};

const runDetailScenario = async (browser, frontendUrl) => {
  const { context, page } = await createPage(browser, 'detail-en');
  const gate = deferred();
  const seen = deferred();
  await page.route('**/graphql', async (route) => {
    const name = operationName(route.request());
    const payload = operationPayloads(route.request())[0];
    if (name === 'GetAgentOrgEndpointCatalog' && payload?.variables?.id === fixture.alpha.id) {
      seen.resolve();
      await gate.promise;
    }
    await route.continue();
  });
  try {
    const beforeExact = exactReadCount();
    await page.goto(`${frontendUrl}/agent-orgs?view=org-list`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await card(page, fixture.alpha.id).waitFor({ state: 'visible', timeout: timeoutMs });
    await card(page, fixture.alpha.id).getByRole('button', { name: /View Details/ }).click();
    await seen.promise;
    await page.getByText(fixture.alpha.directLabel, { exact: true }).waitFor({ state: 'visible', timeout: timeoutMs });
    await page.getByText(fixture.alpha.teamLabel, { exact: true }).waitFor({ state: 'visible', timeout: timeoutMs });
    await page.getByRole('status').filter({ hasText: 'Loading Team roles' }).waitFor({ state: 'visible', timeout: timeoutMs });
    const pendingText = await page.locator('[data-test="agent-org-experience"]').innerText();
    assert(!pendingText.includes(fixture.alpha.coordinatorLabel), 'Coordinator appeared before delayed live topology settled', pendingText);
    await assertNoIdentityLeak(page, [fixture.alpha]);
    gate.resolve();
    await page.getByText(`Coordinator: ${fixture.alpha.coordinatorLabel}`, { exact: true }).waitFor({ state: 'visible', timeout: timeoutMs });
    const handoffText = await page.locator('[data-test="handoff-manager-org"]').innerText();
    for (const expected of [fixture.alpha.directLabel, fixture.alpha.teamLabel, `/${fixture.alpha.directRole}`, `/${fixture.alpha.teamRole}`]) {
      assert(handoffText.includes(expected), `Live detail handoff omitted '${expected}'`, handoffText);
    }
    assert(operationCount('GetAgentOrgEndpointCatalog', 'detail-en') === 1, 'Detail did not use exactly one aggregate endpoint request', evidence.operations);
    assert(exactReadCount() === beforeExact, 'Read-only detail issued exact Agent/Team reads', evidence.operations.filter((entry) => entry.operationName.startsWith('GetAgentOrgReferenced')));
    await assertNoIdentityLeak(page, [fixture.alpha]);
    await page.screenshot({ path: path.join(outputDir, 'detail-en.png'), fullPage: true });

    await page.getByRole('button', { name: /^View/ }).click();
    await page.waitForURL(new RegExp(`/agent-teams\\?.*id=${fixture.alpha.teamRef}.*returnToOrg=${fixture.alpha.id}`), { timeout: timeoutMs });
    await page.getByRole('heading', { name: fixture.alpha.teamDefinitionName, exact: true }).waitFor({ state: 'visible', timeout: timeoutMs });
    await page.getByRole('button', { name: 'Back to Agent Orgs', exact: true }).click();
    await page.waitForURL(new RegExp(`/agent-orgs\\?.*view=org-detail.*id=${fixture.alpha.id}`), { timeout: timeoutMs });
    await page.getByText(`Coordinator: ${fixture.alpha.coordinatorLabel}`, { exact: true }).waitFor({ state: 'visible', timeout: timeoutMs });
    evidence.scenarios['AORG-E2E-004-detail'] = {
      pendingDirectRoles: [fixture.alpha.directLabel, fixture.alpha.teamLabel],
      settledCoordinator: fixture.alpha.coordinatorLabel,
      handoffText,
      endpointCatalogRequests: operationCount('GetAgentOrgEndpointCatalog', 'detail-en'),
      teamReturnUrl: page.url(),
      exactReadsBeforeTeamView: 0,
      exactReadsAfterTeamView: exactReadCount() - beforeExact,
    };
  } finally {
    gate.resolve();
    await context.close();
  }
};

const runFailureScenario = async (browser, frontendUrl) => {
  const assertUnavailableDetail = async (page, exactReadsBefore) => {
    const alert = page.getByRole('alert').filter({ hasText: 'Team role details are unavailable' });
    await alert.waitFor({ state: 'visible', timeout: timeoutMs });
    const text = await page.locator('[data-test="agent-org-experience"]').innerText();
    assert(text.includes(fixture.alpha.directLabel) && text.includes(fixture.alpha.teamLabel), 'Unavailable topology removed direct role labels', text);
    assert(!text.includes(fixture.alpha.directRef) && !text.includes(fixture.alpha.teamRef), 'Unavailable topology exposed an opaque ref', text);
    assert(!text.includes(fixture.alpha.directDefinitionName) && !text.includes(fixture.alpha.teamDefinitionName), 'Unavailable topology substituted definition names', text);
    assert(exactReadCount() === exactReadsBefore, 'Unavailable read-only detail issued exact reference reads', evidence.operations);
    return alert.innerText();
  };

  const transport = await createPage(browser, 'failure-en');
  await transport.page.route('**/graphql', async (route) => {
    if (operationName(route.request()) !== 'GetAgentOrgEndpointCatalog') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { agentOrgEndpointCatalog: null }, errors: [{ message: `Unavailable ${fixture.alpha.teamRef}` }] }),
    });
  });
  try {
    const beforeExact = exactReadCount();
    await transport.page.goto(`${frontendUrl}/agent-orgs?view=org-detail&id=${fixture.alpha.id}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    const alert = await assertUnavailableDetail(transport.page, beforeExact);
    assert(operationCount('GetAgentOrgEndpointCatalog', 'failure-en') === 1, 'Transport failure page issued an unexpected aggregate request count', evidence.operations);
    await transport.page.screenshot({ path: path.join(outputDir, 'detail-failure-en.png'), fullPage: true });
    evidence.scenarios['AORG-E2E-005-failure'] = { transportError: { alert, directLabelsRetained: true, exactReads: 0 } };
  } finally {
    await transport.context.close();
  }

  const incomplete = await createPage(browser, 'incomplete-en');
  let liveFromCount;
  await incomplete.page.route('**/graphql', async (route) => {
    if (operationName(route.request()) !== 'GetAgentOrgEndpointCatalog') return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    const catalog = body?.data?.agentOrgEndpointCatalog;
    assert(catalog && Array.isArray(catalog.from) && catalog.from.length > 0, 'Live endpoint catalog did not contain the expected source topology', body);
    liveFromCount = catalog.from.length;
    body.data.agentOrgEndpointCatalog = { ...catalog, from: [] };
    await route.fulfill({ response, json: body });
  });
  try {
    const beforeExact = exactReadCount();
    await incomplete.page.goto(`${frontendUrl}/agent-orgs?view=org-detail&id=${fixture.alpha.id}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    const alert = await assertUnavailableDetail(incomplete.page, beforeExact);
    assert(operationCount('GetAgentOrgEndpointCatalog', 'incomplete-en') === 1, 'Incomplete topology page issued an unexpected aggregate request count', evidence.operations);
    await incomplete.page.screenshot({ path: path.join(outputDir, 'detail-incomplete-en.png'), fullPage: true });
    evidence.scenarios['AORG-E2E-005-failure'].incompleteCatalog = {
      alert,
      directLabelsRetained: true,
      exactReads: 0,
      liveFromCount,
      deliveredFromCount: 0,
    };
  } finally {
    await incomplete.context.close();
  }
};

const runLifecycleScenario = async (browser, frontendUrl) => {
  const { context, page } = await createPage(browser, 'lifecycle-en');
  const alphaGate = deferred();
  const alphaSeen = deferred();
  await page.route('**/graphql', async (route) => {
    const payload = operationPayloads(route.request())[0];
    if (payload?.operationName === 'GetAgentOrgEndpointCatalog' && payload.variables?.id === fixture.alpha.id) {
      alphaSeen.resolve();
      await alphaGate.promise;
    }
    await route.continue().catch(() => undefined);
  });
  try {
    await page.goto(`${frontendUrl}/agent-orgs?view=org-list`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await card(page, fixture.alpha.id).waitFor({ state: 'visible', timeout: timeoutMs });
    const exactBeforeBrowse = exactReadCount();
    await card(page, fixture.alpha.id).getByRole('button', { name: /View Details/ }).click();
    await alphaSeen.promise;
    await page.getByText(fixture.alpha.directLabel, { exact: true }).waitFor({ state: 'visible', timeout: timeoutMs });
    await page.getByRole('button', { name: 'Back to Agent Orgs', exact: true }).click();
    await card(page, fixture.beta.id).waitFor({ state: 'visible', timeout: timeoutMs });
    await card(page, fixture.beta.id).getByRole('button', { name: /View Details/ }).click();
    await page.getByText(`Coordinator: ${fixture.beta.coordinatorLabel}`, { exact: true }).waitFor({ state: 'visible', timeout: timeoutMs });
    alphaGate.resolve();
    await sleep(600);
    const betaText = await page.locator('[data-test="agent-org-experience"]').innerText();
    assert(betaText.includes(fixture.beta.directLabel) && betaText.includes(fixture.beta.teamLabel) && betaText.includes(fixture.beta.coordinatorLabel), 'Current Beta detail lost its role topology', betaText);
    assert(!betaText.includes(fixture.alpha.coordinatorLabel) && !betaText.includes(fixture.alpha.directLabel), 'Late Alpha result leaked into Beta detail', betaText);
    assert(exactReadCount() === exactBeforeBrowse, 'List/detail browsing issued exact reference reads before authoring', evidence.operations);

    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.waitForURL(new RegExp(`/agent-orgs\\?.*view=org-edit.*id=${fixture.beta.id}`), { timeout: timeoutMs });
    await page.getByText(fixture.beta.directDefinitionName, { exact: true }).first().waitFor({ state: 'visible', timeout: timeoutMs });
    await page.getByText(fixture.beta.teamDefinitionName, { exact: true }).first().waitFor({ state: 'visible', timeout: timeoutMs });
    await waitFor('authoring exact reference operations', () => exactReadCount() > exactBeforeBrowse);
    await page.locator('[data-test="open-member-picker"]').click();
    await page.locator('[data-test="org-member-picker"]').waitFor({ state: 'visible', timeout: timeoutMs });
    const pickerText = await page.locator('[data-test="org-member-picker"]').innerText();
    assert(pickerText.includes(fixture.alpha.directDefinitionName), 'Authoring selector no longer uses definition identity names', pickerText);
    await page.screenshot({ path: path.join(outputDir, 'edit-authoring-en.png'), fullPage: true });
    evidence.scenarios['AORG-E2E-006-lifecycle-authoring'] = {
      currentDetail: fixture.beta.id,
      staleCoordinatorAbsent: true,
      exactReadsDuringBrowse: exactBeforeBrowse,
      exactReadsAfterAuthoring: exactReadCount(),
      authoringNames: [fixture.beta.directDefinitionName, fixture.beta.teamDefinitionName, fixture.alpha.directDefinitionName],
    };
  } finally {
    alphaGate.resolve();
    await context.close();
  }
};

let backend;
let frontend;
let browser;
let ownedRoot;
let result = 'Fail';

await fs.mkdir(outputDir, { recursive: true });
try {
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-agent-org-role-labels-'));
  const toolBin = path.join(ownedRoot, 'tool-bin');
  await fs.mkdir(toolBin, { recursive: true });
  await runCommand('corepack', ['enable', '--install-directory', toolBin], {
    cwd: workspaceDir,
    env: process.env,
    logPath: path.join(outputDir, 'corepack-enable.log'),
  });
  const commandEnvironment = {
    ...process.env,
    PATH: `${toolBin}${path.delimiter}${process.env.PATH || ''}`,
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '',
  };
  if (!skipServerBuild) {
    await runCommand('corepack', ['pnpm', '-C', serverDir, 'build'], {
      cwd: workspaceDir,
      env: commandEnvironment,
      logPath: path.join(outputDir, 'server-build.log'),
    });
  }
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Built server entry is missing; run without --skip-server-build');

  const dataRoot = path.join(ownedRoot, 'server-data');
  const databasePath = path.join(dataRoot, 'db', 'agent-org-role-labels.db');
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  await writeDefinitionFixture(dataRoot);
  evidence.fixture.beforeHashes = await treeHashes(dataRoot);
  evidence.fixture.definitionFileCount = Object.keys(evidence.fixture.beforeHashes).length;

  const databaseUrl = pathToFileURL(databasePath).href;
  const [backendPort, frontendPort] = await Promise.all([choosePort(), choosePort()]);
  const backendUrl = `http://127.0.0.1:${backendPort}`;
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  evidence.runtime = { backendUrl, frontendUrl };
  const serverEnvironment = {
    ...commandEnvironment,
    APP_ENV: 'development',
    DB_TYPE: 'sqlite',
    DATABASE_URL: databaseUrl,
    AUTOBYTEUS_SERVER_HOST: backendUrl,
    AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'),
    AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
    DISABLE_HTTP_REQUEST_LOGS: 'false',
  };
  await fs.mkdir(path.join(dataRoot, 'logs'), { recursive: true });
  await fs.mkdir(path.join(dataRoot, 'memory'), { recursive: true });
  await fs.mkdir(path.join(dataRoot, 'temp_workspace'), { recursive: true });
  await fs.writeFile(path.join(dataRoot, '.env'), [
    'APP_ENV=development',
    'DB_TYPE=sqlite',
    `DATABASE_URL=${databaseUrl}`,
    `AUTOBYTEUS_SERVER_HOST=${backendUrl}`,
    'DISABLE_HTTP_REQUEST_LOGS=false',
  ].join('\n') + '\n');
  await runCommand('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], {
    cwd: workspaceDir,
    env: serverEnvironment,
    logPath: path.join(outputDir, 'database-migrate.log'),
  });
  backend = startService(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], {
    cwd: serverDir,
    env: serverEnvironment,
    logPath: path.join(outputDir, 'backend.log'),
  });
  await waitFor('backend health', () => {
    if (childExited(backend)) throw new Error(`backend exited ${backend.exitCode}/${backend.signalCode}`);
    return fetchOk(`${backendUrl}/rest/health`);
  });
  frontend = startService('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], {
    cwd: webDir,
    env: { ...commandEnvironment, NODE_ENV: 'development', NUXT_TEST: 'true', BACKEND_NODE_BASE_URL: backendUrl },
    logPath: path.join(outputDir, 'frontend.log'),
  });
  await waitFor('frontend readiness', () => {
    if (childExited(frontend)) throw new Error(`frontend exited ${frontend.exitCode}/${frontend.signalCode}`);
    return fetchOk(`${frontendUrl}/agent-orgs?view=org-list`);
  });

  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  if (scenario === 'all' || scenario === 'list') await runListScenario(browser, frontendUrl);
  if (scenario === 'all' || scenario === 'detail') await runDetailScenario(browser, frontendUrl);
  if (scenario === 'all' || scenario === 'failure') await runFailureScenario(browser, frontendUrl);
  if (scenario === 'all' || scenario === 'lifecycle') await runLifecycleScenario(browser, frontendUrl);

  const unexpectedPageErrors = evidence.browserEvents.filter((event) => event.type === 'pageerror');
  assert(unexpectedPageErrors.length === 0, 'Unexpected browser page errors occurred', unexpectedPageErrors);
  const completeAfterHashes = await treeHashes(dataRoot);
  evidence.fixture.afterHashes = Object.fromEntries(Object.keys(evidence.fixture.beforeHashes)
    .map((key) => [key, completeAfterHashes[key] ?? null]));
  evidence.fixture.serverAddedDefinitionFileCount = Object.keys(completeAfterHashes).length - Object.keys(evidence.fixture.beforeHashes).length;
  assert(JSON.stringify(evidence.fixture.afterHashes) === JSON.stringify(evidence.fixture.beforeHashes), 'Normal reads changed persisted definition package bytes');
  result = 'Pass';
} catch (error) {
  evidence.failures.push({
    message: error instanceof Error ? error.message : String(error),
    details: error?.details,
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch((error) => evidence.failures.push({ message: `browser cleanup: ${error.message}` }));
  try { evidence.cleanup.frontend = await stopOwned(frontend); } catch (error) { evidence.failures.push({ message: `frontend cleanup: ${error.message}` }); }
  try { evidence.cleanup.backend = await stopOwned(backend); } catch (error) { evidence.failures.push({ message: `backend cleanup: ${error.message}` }); }
  if (ownedRoot) {
    try {
      await fs.rm(ownedRoot, { recursive: true, force: true });
      evidence.cleanup.ownedRoot = { status: 'removed', path: ownedRoot };
    } catch (error) {
      evidence.failures.push({ message: `owned root cleanup: ${error.message}` });
    }
  }
  evidence.completedAt = new Date().toISOString();
  evidence.result = evidence.failures.length ? 'Fail' : result;
  const resultPath = path.join(outputDir, 'agent-org-role-labels-result.json');
  await fs.writeFile(resultPath, `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`${evidence.result}: ${resultPath}\n`);
  if (evidence.failures.length) process.exitCode = 1;
}

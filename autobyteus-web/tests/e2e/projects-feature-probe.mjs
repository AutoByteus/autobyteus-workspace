#!/usr/bin/env node
// Isolated browser/API regression for the feature-flagged Projects module: the Projects slice
// (PROJ-CONCEPT-20260926-001, E2E-001..013) and Project Tasks on the two-pane page
// (PROJ-TASKS-20260926-001, E2E-014..026). Starts throwaway backend nodes (A, B; C for the released-data
// fixture) and a Nuxt dev frontend bound to A, then drives the approved journeys in headless
// Chromium. Every case records Pass/Fail independently
// in <output-dir>/result.json; owned processes and the temp root are always cleaned up.
//
// Usage: node tests/e2e/projects-feature-probe.mjs [--skip-server-build] [--output-dir=...]
//        [--browser-executable=...] [--timeout-ms=30000] [--only=E2E-003,E2E-004]
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.dirname(webDir);
const serverDir = path.join(root, 'autobyteus-server-ts');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/projects-feature'));
const skipServerBuild = process.argv.includes('--skip-server-build');
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const timeoutMs = Number(arg('timeout-ms', '30000'));
const onlyCases = arg('only', '').split(',').map(item => item.trim()).filter(Boolean);
const evidence = {
  startedAt: new Date().toISOString(), result: 'Fail', platform: `${process.platform}-${process.arch}`,
  node: process.version, browserExecutable: executablePath || 'playwright-default',
  cases: {}, browserErrors: [], cleanup: {}, error: null,
};

// ---------------------------------------------------------------- process helpers
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (description, fn, ms = timeoutMs) => {
  const deadline = Date.now() + ms;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await fn()) return; } catch (error) { lastError = error; }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};
const choosePort = () => new Promise((resolve, reject) => {
  const socket = net.createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => {
    const port = socket.address().port;
    socket.close(() => resolve(port));
  });
});
const exited = child => child.exitCode !== null || child.signalCode !== null;
const start = (command, args, cwd, env, logPath) => {
  const log = createWriteStream(logPath, { flags: 'a' });
  const child = spawn(command, args, { cwd, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.once('close', () => log.end());
  return child;
};
const run = (command, args, cwd, env, logPath) => new Promise((resolve, reject) => {
  const child = start(command, args, cwd, env, logPath);
  child.once('error', reject);
  child.once('close', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited ${code}/${signal}; see ${logPath}`)));
});
const stop = async child => {
  if (!child) return 'not-started';
  if (!exited(child)) {
    if (process.platform !== 'win32') process.kill(-child.pid, 'SIGTERM');
    else child.kill('SIGTERM');
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(8000)]);
  }
  if (!exited(child)) {
    if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
    else child.kill('SIGKILL');
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(5000)]);
  }
  assert(exited(child), `Owned child ${child.pid} did not exit`);
  return `terminated:${child.pid}`;
};

// A fresh node must not inherit feature flags from the developer's shell (e.g. ENABLE_SKILL_IMPROVEMENT).
const scrubbedEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('ENABLE_')));

// ---------------------------------------------------------------- backend nodes
const createNode = async (ownedRoot, name) => {
  const dataRoot = path.join(ownedRoot, name);
  const databasePath = path.join(dataRoot, 'db', `${name}.db`);
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  for (const folder of ['logs', 'memory', 'temp_workspace']) await fs.mkdir(path.join(dataRoot, folder), { recursive: true });
  const port = await choosePort();
  const url = `http://127.0.0.1:${port}`;
  const databaseUrl = pathToFileURL(databasePath).href;
  const env = {
    ...scrubbedEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl,
    AUTOBYTEUS_SERVER_HOST: url, AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'),
    AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
  };
  await fs.writeFile(path.join(dataRoot, '.env'), [
    'APP_ENV=development', 'DB_TYPE=sqlite', `DATABASE_URL=${databaseUrl}`, `AUTOBYTEUS_SERVER_HOST=${url}`,
  ].join('\n') + '\n');
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'],
    root, env, path.join(outputDir, `${name}-migrate.log`));
  return { name, dataRoot, port, url, env, process: null };
};
const startNode = async node => {
  node.process = start(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(node.port), '--data-dir', node.dataRoot],
    serverDir, node.env, path.join(outputDir, `${node.name}-backend.log`));
  await waitFor(`${node.name} health`, async () => {
    if (exited(node.process)) throw new Error(`${node.name} exited ${node.process.exitCode}/${node.process.signalCode}`);
    return fetch(`${node.url}/rest/health`).then(response => response.ok).catch(() => false);
  }, 120000);
};
const gql = async (node, query, variables = {}) => {
  const response = await fetch(`${node.url}/graphql`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (!response.ok || body.errors?.length) {
    const error = new Error(`GraphQL failed on ${node.name}: ${JSON.stringify(body.errors ?? response.status)}`);
    error.code = body.errors?.[0]?.extensions?.code;
    throw error;
  }
  return body.data;
};
const PROJECT_FIELDS = 'projectId name description openTaskCount workspaces { workspaceId workspaceRootPath displayName description availability }';
const TASK_FIELDS = 'taskId projectId description status createdAt updatedAt';
const api = {
  capability: async node => (await gql(node, '{ projectsCapability { enabled settingKey source } }')).projectsCapability,
  setProjectsEnabled: async (node, enabled) => (await gql(node, 'mutation($e: Boolean!) { setProjectsEnabled(enabled: $e) { enabled } }', { e: enabled })).setProjectsEnabled,
  others: async node => gql(node, '{ applicationsCapability { enabled source } skillImprovementCapability { enabled source } }'),
  projects: async node => (await gql(node, `{ projects { ${PROJECT_FIELDS} } }`)).projects,
  project: async (node, projectId) => (await gql(node, `query($id: String!) { project(projectId: $id) { ${PROJECT_FIELDS} } }`, { id: projectId })).project,
  createProject: async (node, name, description = '') => (await gql(node, `mutation($i: CreateProjectInput!) { createProject(input: $i) { ${PROJECT_FIELDS} } }`, { i: { name, description } })).createProject,
  addLink: async (node, projectId, workspaceId, description) => (await gql(node, `mutation($i: AddProjectWorkspaceInput!) { addProjectWorkspace(input: $i) { ${PROJECT_FIELDS} } }`, { i: { projectId, workspaceId, description } })).addProjectWorkspace,
  registerWorkspace: async (node, rootPath) => (await gql(node, 'mutation($i: CreateWorkspaceInput!) { createWorkspace(input: $i) { workspaceId workspaceRootPath } }', { i: { rootPath } })).createWorkspace,
  removeWorkspace: async (node, workspaceId) => (await gql(node, 'mutation($i: RemoveWorkspaceInput!) { removeWorkspace(input: $i) { success message } }', { i: { workspaceId } })).removeWorkspace,
  workspaceIds: async node => (await gql(node, '{ workspaces { workspaceId } }')).workspaces.map(item => item.workspaceId),
  tasks: async (node, projectId) => (await gql(node, `query($id: String!) { projectTasks(projectId: $id) { ${TASK_FIELDS} } }`, { id: projectId })).projectTasks,
  createTask: async (node, projectId, description) => (await gql(node, `mutation($i: CreateProjectTaskInput!) { createProjectTask(input: $i) { ${TASK_FIELDS} } }`, { i: { projectId, description } })).createProjectTask,
  deleteProject: async (node, projectId) => (await gql(node, 'mutation($id: String!) { deleteProject(projectId: $id) }', { id: projectId })).deleteProject,
};
const readEnvFile = node => fs.readFile(path.join(node.dataRoot, '.env'), 'utf-8');
const readWorkspacesJson = node => fs.readFile(path.join(node.dataRoot, 'workspaces.json'), 'utf-8');

// ---------------------------------------------------------------- browser helpers
let page;
let frontendUrl;
let homePath;
const pathname = () => new URL(page.url()).pathname;
const nav = () => page.locator('nav[aria-label="Primary navigation"]');
const navLabels = async () => (await nav().locator(':scope > ul > li > button:first-child').allInnerTexts()).map(text => text.trim());
const waitForNav = (description, predicate) => waitFor(`nav ${description}`, async () => predicate(await navLabels()));
// Settings has no primary nav; leave it client-side (no reload), as "Back to Workspace" does, then read the nav.
const navAfterLeavingSettings = async (description, predicate) => {
  await routerPush(homePath);
  await waitFor('left settings', async () => pathname() === homePath);
  await waitForNav(description, predicate);
};
const settingsClientSide = async mode => {
  await routerPush(`/settings?section=server-settings&mode=${mode}`);
  await waitFor('settings route', async () => pathname() === '/settings');
};
const routerPush = to => page.evaluate(target => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(target), to);
const markPage = () => page.evaluate(() => { window.__projectsProbeMarker = Math.random().toString(36); return window.__projectsProbeMarker; });
const pageMarker = () => page.evaluate(() => window.__projectsProbeMarker ?? null);
const activeInfo = () => page.evaluate(() => {
  const element = document.activeElement;
  return {
    tag: element?.tagName ?? null,
    testId: element?.getAttribute('data-testid') ?? null,
    text: (element?.textContent || element?.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    inDialog: Boolean(element?.closest('[role="dialog"]')),
  };
});
const tabUntil = async (description, predicate, maxTabs = 60) => {
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press('Tab');
    if (predicate(await activeInfo())) return index + 1;
  }
  throw new Error(`Keyboard focus never reached ${description} within ${maxTabs} Tab presses`);
};
const gotoAndSettle = async target => {
  await page.goto(`${frontendUrl}${target}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
};
const expectRedirectHome = async (description) => {
  await waitFor(`${description} redirects home`, async () => pathname() === homePath);
};
// Projects grid → full-width Project page (Tasks board by default; `?tab=workspaces` selects Workspaces) → "← Projects".
const openProjectDetail = async (projectId, { tab } = {}) => {
  await gotoAndSettle(`/projects/${projectId}${tab === 'workspaces' ? '?tab=workspaces' : ''}`);
  await page.getByTestId('project-detail-name').waitFor({ state: 'visible', timeout: timeoutMs });
};
const projectCard = projectId => page.getByTestId(`project-card-${projectId}`);
const gridNamesOn = async target => (await target.getByTestId('projects-grid').locator('h2').allInnerTexts()).map(text => text.trim());
const gridNames = () => gridNamesOn(page);
// The card's bottom line: "<open tasks> · <workspaces>".
const cardCountsOn = async (target, projectId) => (await target.getByTestId(`project-card-${projectId}`).getByTestId('project-card-counts').innerText()).trim();
const cardCounts = projectId => cardCountsOn(page, projectId);
const openTasksPart = async projectId => (await cardCounts(projectId)).split(' · ')[0];
// Reads a Project's open-task line from the grid (client-side "← Projects"), then returns to the Project page.
const openTasksViaGrid = async projectId => {
  await page.getByTestId('project-back-link').click();
  await waitFor('grid after back', async () => pathname() === '/projects');
  await projectCard(projectId).waitFor({ state: 'visible', timeout: timeoutMs });
  const text = await openTasksPart(projectId);
  await projectCard(projectId).click();
  await page.getByTestId('project-task-board').waitFor({ state: 'visible', timeout: timeoutMs });
  return text;
};
const taskDialog = () => page.getByTestId('project-task-dialog');
const TASK_CARD = 'button[data-testid^="project-task-card-"]';
const taskCard = taskId => page.getByTestId(`project-task-card-${taskId}`);
const taskCardsOn = target => target.locator(TASK_CARD);
const boardColumn = (status, target = page) => target.getByTestId(`project-task-column-${status}`);
// Card summaries (accessible names) in one column, top to bottom; To Do by default (every Task is To Do in this ticket).
const taskSummariesOn = async (target, status = 'TODO') => boardColumn(status, target).locator(TASK_CARD).evaluateAll(cards => cards.map(card => card.getAttribute('aria-label')));
const taskSummaries = (status = 'TODO') => taskSummariesOn(page, status);
const columnHeading = async (status, target = page) => (await boardColumn(status, target).locator('h2 span').allInnerTexts()).map(text => text.trim()).join(' ');
// Board columns: side by side (one row) or stacked (one column per row), with their widths.
const boardColumnBoxes = target => target.evaluate(() => {
  const boxes = ['TODO', 'IN_PROGRESS', 'DONE'].map(status => document.querySelector(`[data-testid="project-task-column-${status}"]`).getBoundingClientRect());
  return {
    sideBySide: boxes.every(box => Math.abs(box.top - boxes[0].top) < 2) && boxes.every((box, index) => index === 0 || box.left >= boxes[index - 1].right - 1),
    stacked: boxes.every((box, index) => index === 0 || box.top >= boxes[index - 1].bottom - 1),
    widths: boxes.map(box => Math.round(box.width)),
    tops: boxes.map(box => Math.round(box.top)),
  };
});
const readProjectsFile = node => fs.readFile(path.join(node.dataRoot, 'projects', 'projects.json'), 'utf-8');
const bindPageTo = (nodeId, baseUrl) => page.evaluate(({ id, url }) => {
  document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('windowNodeContext').bindNodeContext(id, url);
}, { id: nodeId, url: baseUrl });
const currentBinding = () => page.evaluate(() => {
  const store = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('windowNodeContext');
  return { nodeId: store.nodeId, baseUrl: store.nodeBaseUrl };
});
const workspaceRow = workspaceId => page.getByTestId(`project-workspace-row-${workspaceId}`);
const linkDialog = () => page.getByTestId('project-workspace-link-dialog');
const selectorTrigger = () => linkDialog().locator('button', { hasText: /Select a workspace|选择/ }).first();
// SearchableSelect teleports its option list to <body>; exclude the app root and teleported dialogs.
const POPOVER_OPTION = 'body > div:not(#__nuxt):not(:has([role="dialog"])) li';
const popoverOption = text => page.locator(POPOVER_OPTION, { hasText: text });
const openOptions = async () => page.evaluate(selector => Array.from(document.querySelectorAll(selector))
  .map(item => item.textContent.replace(/\s+/g, ' ').trim()), POPOVER_OPTION);
const ensureProjectsEnabled = async () => { if (!(await api.capability(nodeA)).enabled) await api.setProjectsEnabled(nodeA, true); };
const projectsStoreState = () => page.evaluate(() => {
  const store = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('projectsCapability');
  return store ? { isEnabled: store.isEnabled, capability: store.capability ?? null } : null;
});
const screenshot = name => page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true }).catch(() => undefined);
const scopedText = async selectors => page.evaluate(list => list
  .flatMap(selector => Array.from(document.querySelectorAll(selector)))
  .map(element => element.innerText).join('\n'), selectors);
// Raw translation keys must never render (e.g. a missing catalogue entry).
const RAW_KEY = /\bprojects\.[a-z][\w.]+/i;

// ---------------------------------------------------------------- case runner
const runCase = async (caseId, title, fn) => {
  if (onlyCases.length && !onlyCases.includes(caseId)) {
    evidence.cases[caseId] = { title, result: 'Not Tested', reason: 'filtered by --only' };
    return;
  }
  const record = { title, result: 'Fail', startedAt: new Date().toISOString(), observations: {} };
  evidence.cases[caseId] = record;
  process.stdout.write(`[${caseId}] ${title}\n`);
  try {
    await fn(record.observations);
    record.result = 'Pass';
    await screenshot(`${caseId}-pass`);
  } catch (error) {
    record.error = error?.stack || String(error);
    await screenshot(`${caseId}-failure`);
  }
  record.finishedAt = new Date().toISOString();
  process.stdout.write(`[${caseId}] ${record.result}${record.error ? `: ${record.error.split('\n')[0]}` : ''}\n`);
};

let ownedRoot, nodeA, nodeB, nodeC, frontend, browser;
await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });
try {
  if (!skipServerBuild) {
    await run('corepack', ['pnpm', '-C', serverDir, 'build'], root, process.env, path.join(outputDir, 'server-build.log'));
  }
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the worktree server with pnpm -C autobyteus-server-ts build first');
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-projects-e2e-'));
  const rootsDir = path.join(ownedRoot, 'roots');
  const folders = ['e2e-web-prototype', 'e2e-marketing', 'e2e-superrepo', 'e2e-new-root', 'e2e-kbd-root', 'e2e-released-ws'];
  for (const folder of folders) await fs.mkdir(path.join(rootsDir, folder), { recursive: true });
  const rootOf = folder => path.join(rootsDir, folder);
  nodeA = await createNode(ownedRoot, 'node-a');
  nodeB = await createNode(ownedRoot, 'node-b');
  await Promise.all([startNode(nodeA), startNode(nodeB)]);
  const frontendPort = await choosePort();
  frontendUrl = `http://127.0.0.1:${frontendPort}`;
  evidence.isolation = { tempRoot: ownedRoot, nodeA: nodeA.url, nodeB: nodeB.url, frontend: frontendUrl, scrubbedEnvPrefix: 'ENABLE_' };
  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...scrubbedEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: nodeA.url }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend readiness', async () => {
    if (exited(frontend)) throw new Error(`frontend exited ${frontend.exitCode}/${frontend.signalCode}`);
    return fetch(`${frontendUrl}/`).then(response => response.ok).catch(() => false);
  }, 240000);

  // Fresh node: ENABLE_PROJECTS has never been written.
  const envBefore = await readEnvFile(nodeA);
  assert(!/ENABLE_PROJECTS/.test(envBefore), 'Node A unexpectedly has ENABLE_PROJECTS before first use');

  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const newEnglishPage = async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
    await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    const created = await context.newPage();
    created.on('pageerror', error => evidence.browserErrors.push(`pageerror: ${error.message}`));
    created.on('console', message => { if (message.type() === 'error') evidence.browserErrors.push(`console: ${message.text().slice(0, 300)}`); });
    return created;
  };
  page = await newEnglishPage();
  await gotoAndSettle('/');
  await waitForNav('rendered', labels => labels.includes('Nodes'));
  homePath = pathname();
  evidence.homePath = homePath;

  const seeded = {};

  await runCase('E2E-001', 'Flag off by default: nav hidden, routes redirect, Basics toggle disabled', async obs => {
    obs.navLabels = await navLabels();
    assert(!obs.navLabels.includes('Projects'), `Projects nav item visible with the flag unset: ${obs.navLabels}`);
    await gotoAndSettle('/projects');
    await expectRedirectHome('/projects');
    await gotoAndSettle('/projects/project_does_not_matter');
    await expectRedirectHome('/projects/<id>');
    await gotoAndSettle('/settings?section=server-settings&mode=quick');
    const toggle = page.getByTestId('projects-feature-toggle');
    await toggle.waitFor({ state: 'visible', timeout: timeoutMs });
    await waitFor('Projects toggle resolved', async () => !(await toggle.isDisabled()));
    obs.toggleChecked = await toggle.getAttribute('aria-checked');
    obs.statusText = (await page.getByTestId('projects-feature-status').innerText()).trim();
    assert(obs.toggleChecked === 'false', `Projects toggle aria-checked=${obs.toggleChecked}`);
    assert(obs.statusText === 'Disabled', `Projects status "${obs.statusText}"`);
    obs.capability = await api.capability(nodeA);
    assert(obs.capability.enabled === false, 'Backend capability is not disabled');
    obs.persistedDefault = /^ENABLE_PROJECTS=false$/m.test(await readEnvFile(nodeA));
    assert(obs.persistedDefault, 'Default-disabled value was not persisted as ENABLE_PROJECTS=false');
  });

  await runCase('E2E-002', 'Basics toggle on/off shows/hides nav without reload, persists, and a capability error still hides + redirects', async obs => {
    await gotoAndSettle('/settings?section=server-settings&mode=quick');
    const toggle = page.getByTestId('projects-feature-toggle');
    await toggle.waitFor({ state: 'visible', timeout: timeoutMs });
    await waitFor('Projects toggle resolved', async () => !(await toggle.isDisabled()));
    const marker = await markPage();
    await toggle.click();
    await waitFor('toggle checked', async () => (await toggle.getAttribute('aria-checked')) === 'true');
    await navAfterLeavingSettings('shows Projects', labels => labels.includes('Projects'));
    obs.navAfterEnable = await navLabels();
    assert(obs.navAfterEnable.indexOf('Projects') === obs.navAfterEnable.indexOf('Nodes') + 1, `Projects is not right after Nodes: ${obs.navAfterEnable}`);
    assert(await pageMarker() === marker, 'Page reloaded while enabling');
    obs.capabilityAfterEnable = await api.capability(nodeA);
    assert(obs.capabilityAfterEnable.enabled === true && obs.capabilityAfterEnable.source === 'SERVER_SETTING', 'Backend not enabled');
    assert(/^ENABLE_PROJECTS=true$/m.test(await readEnvFile(nodeA)), 'ENABLE_PROJECTS=true not persisted');

    await settingsClientSide('quick');
    await waitFor('Projects toggle resolved', async () => !(await toggle.isDisabled()));
    await toggle.click();
    await waitFor('toggle unchecked', async () => (await toggle.getAttribute('aria-checked')) === 'false');
    await navAfterLeavingSettings('hides Projects', labels => !labels.includes('Projects'));
    assert(await pageMarker() === marker, 'Page reloaded while disabling');
    await routerPush('/projects');
    await expectRedirectHome('client-side /projects after disabling');
    obs.capabilityAfterDisable = await api.capability(nodeA);
    assert(obs.capabilityAfterDisable.enabled === false, 'Backend not disabled');

    await gotoAndSettle('/settings?section=server-settings&mode=quick');
    await waitFor('Projects toggle resolved', async () => !(await toggle.isDisabled()));
    await toggle.click();
    await waitFor('toggle checked again', async () => (await toggle.getAttribute('aria-checked')) === 'true');
    await navAfterLeavingSettings('shows Projects again', labels => labels.includes('Projects'));

    // AC-001 alternate: a capability resolution failure hides the item and redirects even though the node has it enabled.
    const errorContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await errorContext.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    const errorPage = await errorContext.newPage();
    let intercepted = 0;
    await errorPage.route('**/graphql', async route => {
      let payload = null;
      try { payload = route.request().postDataJSON(); } catch { /* not JSON */ }
      if (payload?.operationName === 'GetProjectsCapability') {
        intercepted += 1;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null, errors: [{ message: 'Synthetic capability failure' }] }) });
        return;
      }
      await route.continue();
    });
    await errorPage.goto(`${frontendUrl}/projects`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitFor('capability-error redirect', async () => new URL(errorPage.url()).pathname === homePath);
    const errorNav = (await errorPage.locator('nav[aria-label="Primary navigation"]').locator(':scope > ul > li > button:first-child').allInnerTexts()).map(text => text.trim());
    obs.capabilityError = { intercepted, finalPath: new URL(errorPage.url()).pathname, navHasProjects: errorNav.includes('Projects') };
    await errorContext.close();
    assert(intercepted > 0, 'Capability query was never intercepted');
    assert(!obs.capabilityError.navHasProjects, 'Projects nav visible although the capability failed to resolve');
  });

  await runCase('E2E-003', 'Create, validate, duplicate, search, no-match, open, edit and rename collision', async obs => {
    await ensureProjectsEnabled();
    await gotoAndSettle(homePath);
    await waitForNav('shows Projects', labels => labels.includes('Projects'));
    await nav().getByRole('button', { name: 'Projects', exact: true }).click();
    await waitFor('projects route', async () => pathname() === '/projects');
    await page.getByTestId('projects-empty').waitFor({ state: 'visible', timeout: timeoutMs });

    await page.getByTestId('projects-new-button').click();
    const nameInput = page.getByTestId('project-name-input');
    await nameInput.fill('   ');
    await page.getByTestId('project-form-submit').click();
    const nameError = page.getByTestId('project-name-error');
    await nameError.waitFor({ state: 'visible', timeout: timeoutMs });
    obs.emptyName = {
      text: (await nameError.innerText()).trim(), role: await nameError.getAttribute('role'),
      ariaInvalid: await nameInput.getAttribute('aria-invalid'),
      describedBy: (await nameInput.getAttribute('aria-describedby')) === (await nameError.getAttribute('id')),
    };
    assert(obs.emptyName.role === 'alert' && obs.emptyName.ariaInvalid === 'true' && obs.emptyName.describedBy, `Empty-name error not associated: ${JSON.stringify(obs.emptyName)}`);
    assert((await api.projects(nodeA)).length === 0, 'Empty name created a record');

    await nameInput.fill('autobyteus');
    await page.getByTestId('project-description-input').fill('AutoByteus product');
    await page.getByTestId('project-form-submit').click();
    await page.getByTestId('project-form-dialog').waitFor({ state: 'detached', timeout: timeoutMs });
    await page.getByTestId('projects-new-button').click();
    await nameInput.fill('Marketing site');
    await page.getByTestId('project-description-input').fill('Brand campaigns and landing pages');
    await page.getByTestId('project-form-submit').click();
    await page.getByTestId('project-form-dialog').waitFor({ state: 'detached', timeout: timeoutMs });

    await page.getByTestId('projects-new-button').click();
    await nameInput.fill('AUTOBYTEUS');
    await page.getByTestId('project-form-submit').click();
    await nameError.waitFor({ state: 'visible', timeout: timeoutMs });
    obs.duplicateError = (await nameError.innerText()).trim();
    assert(/already exists/i.test(obs.duplicateError), `Duplicate error text: ${obs.duplicateError}`);
    await page.keyboard.press('Escape');
    await page.getByTestId('project-form-dialog').waitFor({ state: 'detached', timeout: timeoutMs });
    const projects = await api.projects(nodeA);
    assert(projects.length === 2, `Expected 2 projects after the duplicate attempt, got ${projects.length}`);
    seeded.autobyteus = projects.find(project => project.name === 'autobyteus');
    seeded.marketing = projects.find(project => project.name === 'Marketing site');

    const grid = page.getByTestId('projects-grid');
    const cardNames = gridNames;
    obs.indexNames = await cardNames();
    assert(obs.indexNames.join('|') === 'autobyteus|Marketing site', `Index order/content: ${obs.indexNames}`);
    const search = page.getByTestId('projects-search-input');
    await search.fill('landing');
    await waitFor('description search', async () => (await cardNames()).join('|') === 'Marketing site');
    await search.fill('AUTO');
    await waitFor('name search', async () => (await cardNames()).join('|') === 'autobyteus');
    await search.fill('zzz-no-match');
    await page.getByTestId('projects-no-match').waitFor({ state: 'visible', timeout: timeoutMs });
    await page.getByTestId('projects-clear-search').click();
    await waitFor('cleared search', async () => (await cardNames()).length === 2);
    obs.searchFocusAfterClear = (await activeInfo()).testId;

    await projectCard(seeded.autobyteus.projectId).click();
    await page.getByTestId('project-detail-name').waitFor({ state: 'visible', timeout: timeoutMs });
    assert((await page.getByTestId('project-detail-description').innerText()).trim() === 'AutoByteus product', 'Detail description mismatch');
    await page.getByTestId('project-edit-button').click();
    await nameInput.fill('marketing SITE');
    await page.getByTestId('project-form-submit').click();
    await nameError.waitFor({ state: 'visible', timeout: timeoutMs });
    obs.renameCollision = (await nameError.innerText()).trim();
    await nameInput.fill('autobyteus');
    await page.getByTestId('project-description-input').fill('AutoByteus product suite');
    await page.getByTestId('project-form-submit').click();
    await page.getByTestId('project-form-dialog').waitFor({ state: 'detached', timeout: timeoutMs });
    await waitFor('detail updated', async () => (await page.getByTestId('project-detail-description').innerText()).trim() === 'AutoByteus product suite');
    assert((await api.project(nodeA, seeded.autobyteus.projectId)).description === 'AutoByteus product suite', 'Edit not persisted');
    await page.getByTestId('project-back-link').click();
    await waitFor('back to index', async () => pathname() === '/projects');
    await waitFor('index shows edited description', async () => (await grid.innerText()).includes('AutoByteus product suite'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor('index after reload', async () => (await page.getByTestId('projects-grid').innerText()).includes('AutoByteus product suite'));
  });

  await runCase('E2E-004', 'Add-workspace default path links a registered workspace; Temp never offered; register-then-link', async obs => {
    await ensureProjectsEnabled();
    if (!seeded.autobyteus) seeded.autobyteus = await api.createProject(nodeA, 'autobyteus', 'AutoByteus product suite');
    seeded.prototype = await api.registerWorkspace(nodeA, rootOf('e2e-web-prototype'));
    seeded.marketingWs = await api.registerWorkspace(nodeA, rootOf('e2e-marketing'));
    seeded.superrepo = await api.registerWorkspace(nodeA, rootOf('e2e-superrepo'));
    await openProjectDetail(seeded.autobyteus.projectId, { tab: 'workspaces' });
    await page.getByTestId('project-workspaces-empty').waitFor({ state: 'visible', timeout: timeoutMs });

    await page.getByTestId('project-add-workspace-button').click();
    await linkDialog().waitFor({ state: 'visible', timeout: timeoutMs });
    obs.triggerText = (await selectorTrigger().innerText()).trim();
    obs.submitDisabledInitially = await page.getByTestId('project-link-submit').isDisabled();
    assert(/Select a workspace/.test(obs.triggerText), `Something is pre-selected: "${obs.triggerText}"`);
    assert(obs.submitDisabledInitially, 'Submit enabled before a workspace was chosen');
    await selectorTrigger().click();
    await waitFor('options open', async () => (await openOptions()).some(text => text.includes('e2e-web-prototype')));
    obs.options = (await openOptions()).filter(text => text.includes('e2e-') || /temp workspace/i.test(text));
    assert(!obs.options.some(text => /temp workspace/i.test(text)), `Temp workspace offered: ${obs.options}`);
    assert(obs.options.length === 3, `Expected exactly the 3 registered workspaces, got ${JSON.stringify(obs.options)}`);
    await popoverOption('e2e-web-prototype').click();
    await waitFor('submit enabled', async () => !(await page.getByTestId('project-link-submit').isDisabled()));
    await page.getByTestId('project-link-description-input').fill('UI prototype workspace');
    await page.getByTestId('project-link-submit').click();
    await linkDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    const row = workspaceRow(seeded.prototype.workspaceId);
    await row.waitFor({ state: 'visible', timeout: timeoutMs });
    obs.linkedRow = { text: (await row.innerText()).replace(/\s+/g, ' '), availability: await row.getAttribute('data-availability') };
    assert(obs.linkedRow.text.includes('e2e-web-prototype') && obs.linkedRow.text.includes('UI prototype workspace')
      && obs.linkedRow.text.replace(/\s/g, '').includes(seeded.prototype.workspaceRootPath.replace(/\s/g, '')), `Row content: ${obs.linkedRow.text}`);
    assert(obs.linkedRow.availability === 'AVAILABLE', 'Linked row not AVAILABLE');

    await page.getByTestId('project-add-workspace-button').click();
    await selectorTrigger().click();
    await waitFor('options reopen', async () => (await openOptions()).some(text => text.includes('e2e-marketing')));
    obs.optionsAfterLink = (await openOptions()).filter(text => text.includes('e2e-'));
    assert(!obs.optionsAfterLink.some(text => text.includes('e2e-web-prototype')), 'Already-linked workspace offered again');
    await popoverOption('e2e-superrepo').click();
    await page.getByTestId('project-link-description-input').fill('Main monorepo');
    await page.getByTestId('project-link-submit').click();
    await linkDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    await workspaceRow(seeded.superrepo.workspaceId).waitFor({ state: 'visible', timeout: timeoutMs });

    // Register a new root from the Project, then link it (REQ-005).
    await page.getByTestId('project-add-workspace-button').click();
    await linkDialog().getByRole('tab', { name: 'New' }).click();
    await linkDialog().locator('input[type="text"]').fill(rootOf('e2e-new-root'));
    await page.getByTestId('project-link-description-input').fill('Fresh root');
    await page.getByTestId('project-link-submit').click();
    await linkDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    const project = await api.project(nodeA, seeded.autobyteus.projectId);
    const newLink = project.workspaces.find(link => link.displayName === 'e2e-new-root');
    assert(newLink && newLink.description === 'Fresh root' && newLink.availability === 'AVAILABLE', 'Register-then-link did not produce an AVAILABLE link');
    assert((await api.workspaceIds(nodeA)).includes(newLink.workspaceId), 'New root not registered through the workspace API');
    seeded.newRootId = newLink.workspaceId;
    obs.linkOrder = project.workspaces.map(link => link.displayName);
    await workspaceRow(newLink.workspaceId).waitFor({ state: 'visible', timeout: timeoutMs });
  });

  await runCase('E2E-005', 'Removed workspace stays linked as Unavailable; re-registration restores; edit and unlink', async obs => {
    await ensureProjectsEnabled();
    assert(seeded.prototype && seeded.newRootId, 'E2E-004 seed missing');
    const removal = await api.removeWorkspace(nodeA, seeded.prototype.workspaceId);
    obs.removal = removal;
    assert(removal.success === true, `Workspace removal was blocked: ${removal.message}`);
    await openProjectDetail(seeded.autobyteus.projectId, { tab: 'workspaces' });
    const row = workspaceRow(seeded.prototype.workspaceId);
    await waitFor('row unavailable', async () => (await row.getAttribute('data-availability')) === 'UNREGISTERED');
    obs.unavailableRow = (await row.innerText()).replace(/\s+/g, ' ');
    assert(await row.getByTestId('project-workspace-unavailable').isVisible(), 'Unavailable badge missing');
    assert(obs.unavailableRow.includes('UI prototype workspace') && obs.unavailableRow.includes('e2e-web-prototype'), `Unavailable row lost data: ${obs.unavailableRow}`);
    assert((await workspaceRow(seeded.superrepo.workspaceId).getAttribute('data-availability')) === 'AVAILABLE', 'Other link affected');

    const again = await api.registerWorkspace(nodeA, rootOf('e2e-web-prototype'));
    assert(again.workspaceId === seeded.prototype.workspaceId, 'Re-registration produced a different id');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor('row available again', async () => (await workspaceRow(seeded.prototype.workspaceId).getAttribute('data-availability')) === 'AVAILABLE');
    obs.rowCountAfterRestore = await page.locator('[data-testid^="project-workspace-row-"]').count();
    assert(obs.rowCountAfterRestore === 3, `Expected 3 rows after re-registration, got ${obs.rowCountAfterRestore}`);

    await workspaceRow(seeded.superrepo.workspaceId).getByTestId('project-workspace-edit').click();
    await page.getByTestId('project-link-workspace-readonly').waitFor({ state: 'visible', timeout: timeoutMs });
    await page.getByTestId('project-link-description-input').fill('Main monorepo (server + web)');
    await page.getByTestId('project-link-submit').click();
    await linkDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    await waitFor('edited description', async () => (await workspaceRow(seeded.superrepo.workspaceId).innerText()).includes('Main monorepo (server + web)'));

    await workspaceRow(seeded.newRootId).getByTestId('project-workspace-unlink').click();
    await workspaceRow(seeded.newRootId).waitFor({ state: 'detached', timeout: timeoutMs });
    const project = await api.project(nodeA, seeded.autobyteus.projectId);
    obs.linksAfterUnlink = project.workspaces.map(link => `${link.displayName}:${link.availability}`);
    assert(project.workspaces.length === 2, 'Unlink not persisted');
    assert((await api.workspaceIds(nodeA)).includes(seeded.newRootId), 'Unlink unregistered the workspace');
  });

  await runCase('E2E-006', 'Delete requires confirmation; cancel keeps everything; confirm removes only the Project', async obs => {
    await ensureProjectsEnabled();
    const throwaway = await api.createProject(nodeA, 'Throwaway', 'To be deleted');
    await api.addLink(nodeA, throwaway.projectId, seeded.marketingWs?.workspaceId ?? (await api.registerWorkspace(nodeA, rootOf('e2e-marketing'))).workspaceId, 'Marketing');
    const workspacesBefore = await readWorkspacesJson(nodeA);
    const workspaceIdsBefore = (await api.workspaceIds(nodeA)).sort();
    await openProjectDetail(throwaway.projectId);
    await page.getByTestId('project-delete-button').click();
    const dialog = page.getByTestId('project-delete-dialog');
    await dialog.waitFor({ state: 'visible', timeout: timeoutMs });
    obs.initialFocus = (await activeInfo()).testId;
    assert(obs.initialFocus === 'project-delete-cancel', `Delete dialog initial focus: ${obs.initialFocus}`);
    await page.getByTestId('project-delete-cancel').click();
    await dialog.waitFor({ state: 'detached', timeout: timeoutMs });
    assert(await api.project(nodeA, throwaway.projectId), 'Cancel deleted the project');

    await page.getByTestId('project-delete-button').click();
    await page.getByTestId('project-delete-confirm').click();
    await waitFor('navigated to index', async () => pathname() === '/projects');
    await waitFor('card removed', async () => (await projectCard(throwaway.projectId).count()) === 0);
    assert(await api.project(nodeA, throwaway.projectId) === null, 'Project still exists after confirm');
    obs.workspacesJsonUnchanged = (await readWorkspacesJson(nodeA)) === workspacesBefore;
    obs.workspaceIdsUnchanged = (await api.workspaceIds(nodeA)).sort().join() === workspaceIdsBefore.join();
    assert(obs.workspacesJsonUnchanged && obs.workspaceIdsUnchanged, 'Deleting a Project changed the workspace registry');
    assert(await api.project(nodeA, seeded.autobyteus.projectId), 'Deleting one Project removed another');
  });

  await runCase('E2E-007', 'Keyboard-only journey: create, search, open, edit, link, unlink, delete with focus trap/return', async obs => {
    await ensureProjectsEnabled();
    const failures = [];
    const soft = (condition, message) => { if (!condition) failures.push(message); };
    await gotoAndSettle('/projects');
    await page.getByTestId('projects-grid').waitFor({ state: 'visible', timeout: timeoutMs });
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    obs.tabsToNewButton = await tabUntil('New project button', info => info.testId === 'projects-new-button');
    await page.keyboard.press('Enter');
    await page.getByTestId('project-form-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    soft((await activeInfo()).testId === 'project-name-input', 'Create dialog did not focus the name input');
    await page.keyboard.press('Enter');
    await page.getByTestId('project-name-error').waitFor({ state: 'visible', timeout: timeoutMs });
    obs.emptySubmitFocus = (await activeInfo()).testId;
    soft(obs.emptySubmitFocus === 'project-name-input', 'Focus left the name input after the validation error');
    const trapWalk = [];
    // Four focusables (name, description, Cancel, Create): the fourth Tab must wrap to the name input.
    for (let index = 0; index < 4; index += 1) { await page.keyboard.press('Tab'); trapWalk.push(await activeInfo()); }
    obs.createDialogTabWalk = trapWalk.map(info => `${info.testId || info.text}:${info.inDialog}`);
    soft(trapWalk.every(info => info.inDialog), 'Tab left the create dialog');
    soft(trapWalk.at(-1)?.testId === 'project-name-input', 'Tab did not wrap back to the first field');
    await page.keyboard.press('Shift+Tab');
    soft((await activeInfo()).testId === 'project-form-submit', 'Shift+Tab from the first field did not wrap to Create');
    await page.keyboard.press('Escape');
    await page.getByTestId('project-form-dialog').waitFor({ state: 'detached', timeout: timeoutMs });
    obs.focusAfterEscape = (await activeInfo()).testId;
    soft(obs.focusAfterEscape === 'projects-new-button', `Focus did not return to New project (got ${obs.focusAfterEscape})`);
    await page.keyboard.press('Enter');
    await page.getByTestId('project-name-input').waitFor({ state: 'visible', timeout: timeoutMs });
    await page.keyboard.type('Keyboard project');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Created without a pointer');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    await page.getByTestId('project-form-dialog').waitFor({ state: 'detached', timeout: timeoutMs });
    const created = (await api.projects(nodeA)).find(project => project.name === 'Keyboard project');
    assert(created, 'Keyboard create failed');

    await page.getByTestId('projects-search-input').focus();
    await page.keyboard.type('keyboard');
    await waitFor('keyboard search', async () => (await gridNames()).join('|') === 'Keyboard project');
    await page.keyboard.press('Tab');
    soft((await activeInfo()).testId === `project-card-${created.projectId}`, 'Tab from search did not reach the result card');
    await page.keyboard.press('Enter');
    await page.getByTestId('project-detail-name').waitFor({ state: 'visible', timeout: timeoutMs });

    await page.getByTestId('project-edit-button').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('project-form-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    await page.keyboard.press('Tab');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('Edited by keyboard');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    await page.getByTestId('project-form-dialog').waitFor({ state: 'detached', timeout: timeoutMs });
    await waitFor('keyboard edit', async () => (await page.getByTestId('project-detail-description').innerText()).trim() === 'Edited by keyboard');
    soft((await activeInfo()).testId === 'project-edit-button', 'Focus did not return to Edit after saving');

    // Link an existing registered workspace using only the keyboard (AC-011). The option list is a
    // teleported combobox popup owned by the dialog's trigger (aria-controls); focus may sit in that popup
    // while it is open but must never reach the page behind the modal, and Tab/Escape must return it.
    const popupOwnedByDialogTrigger = () => page.evaluate(() => {
      const active = document.activeElement;
      const trigger = document.querySelector('[role="dialog"] button[aria-haspopup="listbox"]');
      return {
        activeRole: active?.getAttribute('role') ?? null,
        activeControls: active?.getAttribute('aria-controls') ?? null,
        triggerControls: trigger?.getAttribute('aria-controls') ?? null,
        triggerExpanded: trigger?.getAttribute('aria-expanded') ?? null,
        activeInPageBehindModal: Boolean(active && active !== document.body && active.closest('#__nuxt')) || active === document.body,
      };
    });
    const isTrigger = info => info.inDialog && /Select a workspace|e2e-/.test(info.text) && info.tag === 'BUTTON';
    const openLinkDialogByKeyboard = async () => {
      await page.getByTestId('project-add-workspace-button').focus();
      await page.keyboard.press('Enter');
      await linkDialog().waitFor({ state: 'visible', timeout: timeoutMs });
      await tabUntil('workspace picker trigger', isTrigger, 6);
    };
    // Switch to the Workspaces tab with the keyboard (arrow keys move between tabs).
    await page.getByTestId('project-tab-tasks').focus();
    await page.keyboard.press('ArrowRight');
    await waitFor('workspaces tab selected', async () => (await page.getByTestId('project-tab-workspaces').getAttribute('aria-selected')) === 'true');
    soft((await activeInfo()).testId === 'project-tab-workspaces', 'Arrow key did not move focus to the Workspaces tab');
    const link = {};
    await openLinkDialogByKeyboard();
    await page.keyboard.press('Enter');
    await waitFor('list opened by Enter', async () => (await popupOwnedByDialogTrigger()).triggerExpanded === 'true');
    link.openedWithEnter = await popupOwnedByDialogTrigger();
    soft(link.openedWithEnter.activeRole === 'combobox' && link.openedWithEnter.activeControls
      && link.openedWithEnter.activeControls === link.openedWithEnter.triggerControls,
      'Focus in the open list is not the combobox popup owned by the dialog trigger');
    soft(!link.openedWithEnter.activeInPageBehindModal, 'Opening the workspace list moved focus to the page behind the modal');
    await page.keyboard.press('Tab');
    link.afterTabInList = await activeInfo();
    link.expandedAfterTab = (await popupOwnedByDialogTrigger()).triggerExpanded;
    soft(isTrigger(link.afterTabInList) && link.expandedAfterTab === 'false', 'Tab in the list did not close it and return focus to the trigger');
    await page.keyboard.press('ArrowDown');
    await waitFor('list opened by ArrowDown', async () => (await popupOwnedByDialogTrigger()).triggerExpanded === 'true');
    await page.keyboard.press('Shift+Tab');
    link.afterShiftTabInList = await activeInfo();
    soft(isTrigger(link.afterShiftTabInList), 'Shift+Tab in the list did not return focus to the trigger');
    await page.keyboard.press('Enter');
    await waitFor('list reopened', async () => (await popupOwnedByDialogTrigger()).triggerExpanded === 'true');
    await page.keyboard.press('Escape');
    await sleep(200);
    link.afterFirstEscape = { focus: await activeInfo(), dialogOpen: await linkDialog().isVisible(), expanded: (await popupOwnedByDialogTrigger()).triggerExpanded };
    soft(link.afterFirstEscape.dialogOpen && link.afterFirstEscape.expanded === 'false' && isTrigger(link.afterFirstEscape.focus),
      'First Escape did not close only the list and return focus to the trigger');
    await page.keyboard.press('Escape');
    await linkDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    link.afterSecondEscape = (await activeInfo()).testId;
    soft(link.afterSecondEscape === 'project-add-workspace-button', `Second Escape did not close the dialog and return focus (got ${link.afterSecondEscape})`);

    await openLinkDialogByKeyboard();
    await page.keyboard.press('Enter');
    await waitFor('list open for selection', async () => (await popupOwnedByDialogTrigger()).triggerExpanded === 'true');
    link.optionsOffered = (await openOptions()).filter(text => text.includes('e2e-'));
    await page.keyboard.type('superrepo');
    await sleep(200);
    await page.keyboard.press('Enter');
    await waitFor('selection made by keyboard', async () => !(await page.getByTestId('project-link-submit').isDisabled()));
    link.afterSelect = await activeInfo();
    soft(isTrigger(link.afterSelect) && link.afterSelect.text.includes('e2e-superrepo'), `Selection did not return focus to the trigger showing the choice (${JSON.stringify(link.afterSelect)})`);
    await screenshot('E2E-007-keyboard-link-existing');
    await tabUntil('link description', info => info.testId === 'project-link-description-input', 3);
    await page.keyboard.type('Keyboard-linked monorepo');
    await tabUntil('link submit', info => info.testId === 'project-link-submit', 3);
    await page.keyboard.press('Enter');
    await linkDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    const afterExistingLink = await api.project(nodeA, created.projectId);
    link.linked = afterExistingLink.workspaces.map(item => `${item.displayName}:${item.description}:${item.availability}`);
    soft(afterExistingLink.workspaces.length === 1 && afterExistingLink.workspaces[0].displayName === 'e2e-superrepo'
      && afterExistingLink.workspaces[0].description === 'Keyboard-linked monorepo', 'Keyboard link of an existing workspace was not persisted');
    obs.keyboardLinkExisting = link;

    // Keyboard link through the New path (typed root).
    await page.getByTestId('project-add-workspace-button').focus();
    await page.keyboard.press('Enter');
    await linkDialog().waitFor({ state: 'visible', timeout: timeoutMs });
    await linkDialog().getByRole('tab', { name: 'New' }).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.type(rootOf('e2e-kbd-root'));
    await page.getByTestId('project-link-description-input').focus();
    await page.keyboard.type('Keyboard root');
    await page.getByTestId('project-link-submit').focus();
    await page.keyboard.press('Enter');
    await linkDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    const withLinks = await api.project(nodeA, created.projectId);
    obs.keyboardLinkNewPath = withLinks.workspaces.map(item => item.displayName);
    soft(withLinks.workspaces.some(item => item.displayName === 'e2e-kbd-root'), 'Keyboard link via the New path failed');

    const toUnlink = withLinks.workspaces.find(item => item.displayName === 'e2e-superrepo');
    if (toUnlink) {
      const unlinkButton = workspaceRow(toUnlink.workspaceId).getByTestId('project-workspace-unlink');
      obs.unlinkAccessibleName = await unlinkButton.getAttribute('aria-label');
      await unlinkButton.focus();
      await page.keyboard.press('Enter');
      await workspaceRow(toUnlink.workspaceId).waitFor({ state: 'detached', timeout: timeoutMs });
      soft((await api.project(nodeA, created.projectId)).workspaces.every(item => item.workspaceId !== toUnlink.workspaceId), 'Keyboard unlink failed');
    }

    await page.getByTestId('project-delete-button').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('project-delete-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    soft((await activeInfo()).testId === 'project-delete-cancel', 'Delete dialog did not focus Cancel');
    await page.keyboard.press('Escape');
    await page.getByTestId('project-delete-dialog').waitFor({ state: 'detached', timeout: timeoutMs });
    soft((await activeInfo()).testId === 'project-delete-button', 'Focus did not return to Delete after Escape');
    await page.keyboard.press('Enter');
    await page.getByTestId('project-delete-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    await page.keyboard.press('Tab');
    soft((await activeInfo()).testId === 'project-delete-confirm', 'Tab did not reach Delete project');
    await page.keyboard.press('Enter');
    await waitFor('deleted by keyboard', async () => pathname() === '/projects');
    soft(await api.project(nodeA, created.projectId) === null, 'Keyboard delete failed');

    obs.softFailures = failures;
    assert(failures.length === 0, `Keyboard journey failures:\n- ${failures.join('\n- ')}`);
  });

  await runCase('E2E-008', 'zh-CN renders Projects surfaces; no raw translation keys on any Project surface', async obs => {
    await ensureProjectsEnabled();
    const zhContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', timezoneId: 'UTC' });
    await zhContext.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    const zhPage = await zhContext.newPage();
    await zhPage.goto(`${frontendUrl}/projects`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await zhPage.getByTestId('projects-grid').waitFor({ state: 'visible', timeout: timeoutMs });
    const zhNav = (await zhPage.locator('nav').first().locator(':scope > ul > li > button:first-child').allInnerTexts()).map(text => text.trim());
    const indexText = await zhPage.getByTestId('projects-index').innerText();
    obs.zhIndex = { hasTitle: indexText.includes('项目'), hasNewProject: indexText.includes('新建项目'), navHasProjects: zhNav.includes('项目'), hasEnglishNewProject: indexText.includes('New project') };
    assert(obs.zhIndex.hasTitle && obs.zhIndex.hasNewProject && obs.zhIndex.navHasProjects && !obs.zhIndex.hasEnglishNewProject, `zh-CN index: ${JSON.stringify(obs.zhIndex)}`);
    await zhPage.goto(`${frontendUrl}/projects/${seeded.autobyteus.projectId}?tab=workspaces`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await zhPage.getByTestId('project-detail-name').waitFor({ state: 'visible', timeout: timeoutMs });
    await zhPage.getByTestId('project-workspace-list').waitFor({ state: 'visible', timeout: timeoutMs });
    const detailText = await zhPage.getByTestId('project-detail').innerText();
    obs.zhDetail = ['编辑', '删除', '任务', '工作区', '添加工作区', '取消关联'].filter(label => !detailText.includes(label));
    assert(obs.zhDetail.length === 0, `zh-CN detail missing: ${obs.zhDetail}`);
    await zhPage.getByTestId('project-add-workspace-button').click();
    await zhPage.getByTestId('project-workspace-link-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    const zhDialogText = await zhPage.getByTestId('project-workspace-link-dialog').innerText();
    // Pre-existing WorkspaceSelector literals ("Existing", "New") are outside REQ-012 (new strings only).
    obs.zhLinkDialog = { hasTitle: zhDialogText.includes('添加工作区'), preExistingEnglishSelectorLiterals: ['Existing', 'New'].filter(word => zhDialogText.includes(word)) };
    assert(obs.zhLinkDialog.hasTitle, 'zh-CN link dialog title missing');
    const zhTaskText = [indexText, detailText, zhDialogText].join('\n');
    await zhContext.close();

    // English surfaces: index, detail (with an unavailable row), form and delete dialogs.
    await gotoAndSettle('/projects');
    await page.getByTestId('projects-grid').waitFor({ state: 'visible', timeout: timeoutMs });
    const enIndex = await scopedText(['[data-testid="projects-index"]']);
    await openProjectDetail(seeded.autobyteus.projectId, { tab: 'workspaces' });
    await page.getByTestId('project-edit-button').click();
    await page.getByTestId('project-form-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    const enForm = await scopedText(['[role="dialog"]']);
    await page.keyboard.press('Escape');
    await page.getByTestId('project-form-dialog').waitFor({ state: 'detached', timeout: timeoutMs });
    await page.getByTestId('project-delete-button').click();
    await page.getByTestId('project-delete-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    const enDelete = await scopedText(['[role="dialog"]']);
    await page.keyboard.press('Escape');
    const enDetail = await scopedText(['[data-testid="project-detail"]']);
    const allText = [zhTaskText, enIndex, enForm, enDelete, enDetail].join('\n');
    // Released REQ-014 ("no Task wording") is superseded by PROJ-TASKS REQ-011; check for unresolved keys instead.
    obs.rawKeyMatches = allText.match(new RegExp(RAW_KEY.source, 'gi')) ?? [];
    assert(obs.rawKeyMatches.length === 0, `Raw translation keys rendered: ${obs.rawKeyMatches}`);
  });

  await runCase('E2E-009', 'Advanced-table ENABLE_PROJECTS edit hides/shows nav live; open Project route redirects when off', async obs => {
    await ensureProjectsEnabled();
    await openProjectDetail(seeded.autobyteus.projectId);
    const marker = await markPage();
    await settingsClientSide('advanced');
    const input = page.getByTestId('server-setting-value-ENABLE_PROJECTS');
    const save = page.getByTestId('server-setting-save-ENABLE_PROJECTS');
    await input.waitFor({ state: 'visible', timeout: timeoutMs });
    await input.fill('false');
    await save.click();
    await waitFor('Advanced false saved', async () => (await api.capability(nodeA)).enabled === false);
    obs.capabilityAfterFalse = await api.capability(nodeA);
    // DS-004b refreshes the capability store after the settings reload; wait for the UI state to settle.
    const settleStart = Date.now();
    await waitFor('web capability store refreshed to disabled', async () => (await projectsStoreState())?.isEnabled === false);
    obs.webStoreSettleMs = Date.now() - settleStart;
    obs.webStoreAfterFalse = await projectsStoreState();
    // History back returns to the still-open Project route, which must now redirect home.
    await page.goBack();
    try {
      await expectRedirectHome('history back to the open Project route');
      obs.historyBack = { redirected: true };
    } catch (error) {
      obs.historyBack = { redirected: false, path: pathname(), webStore: await projectsStoreState(), navLabels: await navLabels().catch(() => null) };
      // Distinguish a back-navigation gap from a broken gate: try a fresh client-side push to the same route.
      await routerPush(homePath);
      await waitFor('home', async () => pathname() === homePath);
      await routerPush(`/projects/${seeded.autobyteus.projectId}`);
      await sleep(1500);
      obs.pushAfterDisable = { path: pathname(), redirected: pathname() === homePath };
      await page.reload({ waitUntil: 'domcontentloaded' });
      await sleep(3000);
      obs.reloadAfterDisable = { path: pathname(), redirected: pathname() === homePath };
      await api.setProjectsEnabled(nodeA, true);
      throw error;
    }
    await waitForNav('hides Projects after Advanced edit', labels => !labels.includes('Projects'));
    assert(await pageMarker() === marker, 'Page reloaded during the Advanced edit or back-navigation');
    await settingsClientSide('advanced');
    await input.waitFor({ state: 'visible', timeout: timeoutMs });
    await input.fill('true');
    await save.click();
    await waitFor('Advanced true saved', async () => (await api.capability(nodeA)).enabled === true);
    await navAfterLeavingSettings('shows Projects after Advanced edit', labels => labels.includes('Projects'));
    assert(await pageMarker() === marker, 'Page reloaded during the Advanced re-enable');
    obs.capabilityAfterTrue = await api.capability(nodeA);
    assert(obs.capabilityAfterTrue.enabled === true, 'Advanced edit did not persist true');
  });

  await runCase('E2E-010', 'Backend restart keeps ENABLE_PROJECTS and Projects with their links', async obs => {
    await ensureProjectsEnabled();
    const before = await api.projects(nodeA);
    obs.stopped = await stop(nodeA.process);
    await startNode(nodeA);
    await gotoAndSettle(homePath);
    await waitForNav('Projects after restart', labels => labels.includes('Projects'));
    await gotoAndSettle('/projects');
    await projectCard(seeded.autobyteus.projectId).waitFor({ state: 'visible', timeout: timeoutMs });
    const after = await api.projects(nodeA);
    obs.projectsBefore = before.map(project => `${project.name}:${project.workspaces.length}`);
    obs.projectsAfter = after.map(project => `${project.name}:${project.workspaces.length}`);
    assert(JSON.stringify(after) === JSON.stringify(before), 'Projects changed across restart');
    await openProjectDetail(seeded.autobyteus.projectId, { tab: 'workspaces' });
    obs.rowsAfterRestart = await page.locator('[data-testid^="project-workspace-row-"]').count();
    assert(obs.rowsAfterRestart === before.find(project => project.projectId === seeded.autobyteus.projectId).workspaces.length, 'Rows missing after restart');
  });

  await runCase('E2E-011', 'Rebinding to node B shows B’s Projects; rebinding back shows A’s', async obs => {
    await ensureProjectsEnabled();
    await api.setProjectsEnabled(nodeB, true);
    const onlyOnB = await api.createProject(nodeB, 'node-b-only', 'Lives on node B');
    await gotoAndSettle('/projects');
    await projectCard(seeded.autobyteus.projectId).waitFor({ state: 'visible', timeout: timeoutMs });
    const original = await page.evaluate(() => {
      const store = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('windowNodeContext');
      return { nodeId: store.nodeId, baseUrl: store.nodeBaseUrl, revision: store.bindingRevision };
    });
    obs.originalBinding = original;
    const graphqlTargets = [];
    const listener = request => { if (request.url().includes('/graphql')) graphqlTargets.push(new URL(request.url()).origin); };
    page.on('request', listener);
    await page.evaluate(({ url }) => {
      document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('windowNodeContext').bindNodeContext('probe-node-b', url);
    }, { url: nodeB.url });
    await projectCard(onlyOnB.projectId).waitFor({ state: 'visible', timeout: timeoutMs });
    obs.onB = await gridNames();
    assert(obs.onB.join('|') === 'node-b-only', `Node B list shows ${obs.onB}`);
    assert(graphqlTargets.includes(nodeB.url), 'No GraphQL request reached node B');
    await page.evaluate(({ nodeId, baseUrl }) => {
      document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('windowNodeContext').bindNodeContext(nodeId, baseUrl);
    }, original);
    await projectCard(seeded.autobyteus.projectId).waitFor({ state: 'visible', timeout: timeoutMs });
    obs.backOnA = await gridNames();
    assert(!obs.backOnA.includes('node-b-only') && obs.backOnA.includes('autobyteus'), `Node A list shows ${obs.backOnA}`);
    page.off('request', listener);
    obs.graphqlOrigins = [...new Set(graphqlTargets)];
    assert((await api.projects(nodeA)).every(project => project.name !== 'node-b-only'), 'Node B data leaked into node A');
  });

  await runCase('E2E-012', 'Applications and Skill Improvement toggles and Applications gating are unchanged', async obs => {
    await ensureProjectsEnabled();
    obs.initial = await api.others(nodeA);
    await gotoAndSettle('/settings?section=server-settings&mode=quick');
    const appsToggle = page.getByTestId('applications-feature-toggle');
    const siToggle = page.getByTestId('skill-improvement-feature-toggle');
    await appsToggle.waitFor({ state: 'visible', timeout: timeoutMs });
    await waitFor('toggles resolved', async () => !(await appsToggle.isDisabled()) && !(await siToggle.isDisabled()));
    const flip = async (toggle, label) => {
      const before = await toggle.getAttribute('aria-checked');
      const next = before !== 'true';
      const field = label.startsWith('Applications') ? 'applicationsCapability' : 'skillImprovementCapability';
      await toggle.click();
      await waitFor(`${label} flipped`, async () => (await toggle.getAttribute('aria-checked')) === String(next));
      // The switch updates optimistically; wait for the backend to persist before reading on.
      await waitFor(`${label} persisted`, async () => (await api.others(nodeA))[field].enabled === next);
      return next;
    };
    const appsEnabled = await flip(appsToggle, 'Applications');
    await navAfterLeavingSettings(`Applications ${appsEnabled ? 'shown' : 'hidden'}`, labels => labels.includes('Applications') === appsEnabled);
    obs.afterAppsFlip = { backend: (await api.others(nodeA)).applicationsCapability, nav: await navLabels(), projectsCapability: await api.capability(nodeA) };
    assert(obs.afterAppsFlip.backend.enabled === appsEnabled, 'Applications capability not persisted');
    assert(obs.afterAppsFlip.projectsCapability.enabled === true && obs.afterAppsFlip.nav.includes('Projects'), 'Toggling Applications changed Projects');
    if (!appsEnabled) {
      await routerPush('/applications');
      await expectRedirectHome('/applications while disabled');
    }
    await settingsClientSide('quick');
    await waitFor('toggles resolved', async () => !(await appsToggle.isDisabled()));
    const appsRestored = await flip(appsToggle, 'Applications restore');
    await navAfterLeavingSettings('Applications restored', labels => labels.includes('Applications') === appsRestored);
    if (appsRestored === false) {
      await routerPush('/applications');
      await expectRedirectHome('/applications while disabled');
    }
    await settingsClientSide('quick');
    await waitFor('toggles resolved', async () => !(await siToggle.isDisabled()));
    const siEnabled = await flip(siToggle, 'Skill Improvement');
    obs.afterSiFlip = { backend: (await api.others(nodeA)).skillImprovementCapability, status: (await page.getByTestId('skill-improvement-feature-status').innerText()).trim() };
    assert(obs.afterSiFlip.backend.enabled === siEnabled, 'SI capability not persisted');
    await flip(siToggle, 'Skill Improvement restore');
    obs.final = await api.others(nodeA);
    assert(obs.final.applicationsCapability.enabled === obs.initial.applicationsCapability.enabled
      && obs.final.skillImprovementCapability.enabled === obs.initial.skillImprovementCapability.enabled, 'Toggles did not restore');
    assert((await api.capability(nodeA)).enabled === true, 'Projects capability changed');
  });

  await runCase('E2E-013', 'Narrow desktop width (1024x700): index, detail and dialogs fit without horizontal overflow', async obs => {
    await ensureProjectsEnabled();
    const narrow = await browser.newContext({ viewport: { width: 1024, height: 700 }, locale: 'en-US', timezoneId: 'UTC' });
    await narrow.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    const narrowPage = await narrow.newPage();
    const layout = selectors => narrowPage.evaluate(list => ({
      docOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      elements: Object.fromEntries(list.map(selector => {
        const element = document.querySelector(selector);
        if (!element) return [selector, null];
        const box = element.getBoundingClientRect();
        return [selector, { left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top), bottom: Math.round(box.bottom),
          inViewportX: box.left >= 0 && box.right <= window.innerWidth, overflowX: element.scrollWidth - element.clientWidth }];
      })),
    }), selectors);
    const check = (label, result, selectors, verticalFit = []) => {
      assert(result.docOverflowX <= 0, `${label}: document scrolls horizontally by ${result.docOverflowX}px`);
      for (const selector of selectors) {
        const box = result.elements[selector];
        assert(box && box.inViewportX, `${label}: ${selector} is missing or clipped horizontally ${JSON.stringify(box)}`);
      }
      for (const selector of verticalFit) {
        const box = result.elements[selector];
        assert(box && box.top >= 0 && box.bottom <= 700, `${label}: ${selector} does not fit vertically ${JSON.stringify(box)}`);
      }
    };
    await narrowPage.goto(`${frontendUrl}/projects`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await narrowPage.getByTestId('projects-grid').waitFor({ state: 'visible', timeout: timeoutMs });
    obs.index = await layout(['[data-testid="projects-new-button"]', '[data-testid="projects-search-input"]', '[data-testid="projects-grid"]']);
    check('index', obs.index, ['[data-testid="projects-new-button"]', '[data-testid="projects-search-input"]', '[data-testid="projects-grid"]']);
    await narrowPage.goto(`${frontendUrl}/projects/${seeded.autobyteus.projectId}?tab=workspaces`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await narrowPage.getByTestId('project-detail-name').waitFor({ state: 'visible', timeout: timeoutMs });
    const detailSelectors = ['[data-testid="project-edit-button"]', '[data-testid="project-delete-button"]', '[data-testid="project-add-workspace-button"]', '[data-testid="project-workspace-list"]', '[data-testid="project-workspace-path"]', '[data-testid="project-workspace-unlink"]'];
    obs.detail = await layout(detailSelectors);
    check('detail', obs.detail, detailSelectors);
    obs.addButtonSingleLine = await narrowPage.getByTestId('project-add-workspace-button').evaluate(element => element.getBoundingClientRect().height < 48);
    assert(obs.addButtonSingleLine, 'Add workspace button wraps at 1024px');
    await narrowPage.getByTestId('project-add-workspace-button').click();
    await narrowPage.getByTestId('project-workspace-link-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    const dialogSelectors = ['[data-testid="project-workspace-link-dialog"]', '[data-testid="project-link-submit"]'];
    obs.linkDialog = await layout(dialogSelectors);
    check('link dialog', obs.linkDialog, dialogSelectors, dialogSelectors);
    await narrowPage.screenshot({ path: path.join(outputDir, 'E2E-013-link-dialog-1024.png') });
    await narrowPage.keyboard.press('Escape');
    await narrowPage.getByTestId('project-edit-button').click();
    await narrowPage.getByTestId('project-form-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    const formSelectors = ['[data-testid="project-form-dialog"]', '[data-testid="project-form-submit"]'];
    obs.formDialog = await layout(formSelectors);
    check('form dialog', obs.formDialog, formSelectors, formSelectors);
    await narrow.close();
  });

  // ------------------------------------------------------------ Project Tasks (PROJ-TASKS-20260926-001)
  const RELEASE_NOTES = 'Write release notes for 1.4.87\nInclude Projects and Tasks';
  const noStatusControlIn = async locator => locator.locator('select, input[type="radio"], input[type="checkbox"], [role="radio"], [role="listbox"], [role="combobox"], [role="menu"]').count();

  await runCase('E2E-014', 'Create a Task from a description: lands in To Do (count 1), card shows the description, empty rejected, grid count updates, newest first, no status control', async obs => {
    await ensureProjectsEnabled();
    seeded.tasksDemo = await api.createProject(nodeA, 'Tasks demo', 'Project Tasks journey');
    await gotoAndSettle('/projects');
    await projectCard(seeded.tasksDemo.projectId).waitFor({ state: 'visible', timeout: timeoutMs });
    obs.emptyCount = await cardCounts(seeded.tasksDemo.projectId);
    assert(obs.emptyCount === 'No open tasks · No workspaces', `Empty Project card line: ${obs.emptyCount}`);
    await projectCard(seeded.tasksDemo.projectId).click();
    await page.getByTestId('project-task-board').waitFor({ state: 'visible', timeout: timeoutMs });
    obs.tasksTabSelected = await page.getByTestId('project-tab-tasks').getAttribute('aria-selected');
    assert(obs.tasksTabSelected === 'true', 'Tasks is not the default tab');
    obs.emptyColumns = await page.getByTestId('project-task-column-empty').allInnerTexts();
    assert(obs.emptyColumns.length === 3 && obs.emptyColumns.every(text => text.trim() === 'No tasks'), `Empty board: ${obs.emptyColumns}`);
    assert(await page.getByTestId('project-tasks-new-button').isVisible(), 'Empty board has no New task button');

    const marker = await markPage();
    await page.getByTestId('project-tasks-new-button').click();
    await taskDialog().waitFor({ state: 'visible', timeout: timeoutMs });
    obs.createInitialFocus = (await activeInfo()).testId;
    assert(obs.createInitialFocus === 'project-task-description-input', `Create dialog focus: ${obs.createInitialFocus}`);
    assert(await noStatusControlIn(taskDialog()) === 0, 'Create dialog offers a status control');
    const input = page.getByTestId('project-task-description-input');
    await input.fill('  \n  ');
    await page.getByTestId('project-task-save').click();
    const error = page.getByTestId('project-task-description-error');
    await error.waitFor({ state: 'visible', timeout: timeoutMs });
    obs.emptyError = {
      text: (await error.innerText()).trim(), role: await error.getAttribute('role'),
      ariaInvalid: await input.getAttribute('aria-invalid'),
      describedBy: (await input.getAttribute('aria-describedby')) === (await error.getAttribute('id')),
    };
    assert(obs.emptyError.role === 'alert' && obs.emptyError.ariaInvalid === 'true' && obs.emptyError.describedBy, `Empty-description error not associated: ${JSON.stringify(obs.emptyError)}`);
    assert((await api.tasks(nodeA, seeded.tasksDemo.projectId)).length === 0, 'Empty description created a Task');

    await input.fill(RELEASE_NOTES);
    await page.getByTestId('project-task-save').click();
    await taskDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    const [created] = await api.tasks(nodeA, seeded.tasksDemo.projectId);
    assert(created && created.status === 'TODO' && created.description === RELEASE_NOTES, `Created Task: ${JSON.stringify(created)}`);
    seeded.releaseTaskId = created.taskId;
    const card = taskCard(created.taskId);
    await card.waitFor({ state: 'visible', timeout: timeoutMs });
    obs.card = {
      inTodo: await boardColumn('TODO').getByTestId(`project-task-card-${created.taskId}`).count(),
      text: await card.getByTestId('project-task-card-text').innerText(),
      accessibleName: await card.getAttribute('aria-label'),
      headings: [await columnHeading('TODO'), await columnHeading('IN_PROGRESS'), await columnHeading('DONE')],
      innerButtons: await card.locator('button, select, input').count(),
      boardStatusControls: await noStatusControlIn(page.getByTestId('project-task-board')),
      draggable: await page.getByTestId('project-task-board').locator('[draggable="true"]').count(),
    };
    assert(obs.card.inTodo === 1, 'New Task is not in the To Do column');
    assert(obs.card.text.includes('Write release notes for 1.4.87') && obs.card.text.includes('Include Projects and Tasks'), `Card text: ${JSON.stringify(obs.card.text)}`);
    assert(obs.card.accessibleName === 'Write release notes for 1.4.87', `Card name: ${obs.card.accessibleName}`);
    assert(obs.card.headings.join('|') === 'To Do 1|In Progress 0|Done 0', `Column headings: ${obs.card.headings}`);
    assert(obs.card.innerButtons === 0 && obs.card.boardStatusControls === 0 && obs.card.draggable === 0, 'Board exposes status, move or drag controls');
    assert(await pageMarker() === marker, 'Page reloaded while creating a Task');

    await card.click();
    await page.getByTestId('project-task-view').waitFor({ state: 'visible', timeout: timeoutMs });
    obs.view = {
      description: await page.getByTestId('project-task-view-description').innerText(),
      status: (await page.getByTestId('project-task-view-status').innerText()).trim(),
      initialFocus: (await activeInfo()).testId,
      statusControls: await noStatusControlIn(taskDialog()),
      statusButtons: await taskDialog().locator('button', { hasText: /In Progress|Done|Start|Complete|Move|Status/ }).count(),
    };
    assert(obs.view.description === RELEASE_NOTES, `View description: ${JSON.stringify(obs.view.description)}`);
    assert(obs.view.status === 'To Do' && obs.view.statusControls === 0 && obs.view.statusButtons === 0, `View offers status changes: ${JSON.stringify(obs.view)}`);
    await page.getByTestId('project-task-edit').click();
    obs.editStatusControls = await noStatusControlIn(taskDialog());
    assert(obs.editStatusControls === 0, 'Edit mode offers a status control');
    await page.getByTestId('project-task-cancel').click();
    await page.getByTestId('project-task-close').click();
    await taskDialog().waitFor({ state: 'detached', timeout: timeoutMs });

    for (const description of ['Fix the release pipeline', 'Plan the Tasks admission work\nAgents will own status']) {
      await page.getByTestId('project-tasks-new-button').click();
      await page.getByTestId('project-task-description-input').fill(description);
      await page.getByTestId('project-task-save').click();
      await taskDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    }
    obs.order = await taskSummaries();
    assert(obs.order.join('|') === 'Plan the Tasks admission work|Fix the release pipeline|Write release notes for 1.4.87', `Order: ${obs.order}`);
    assert(await columnHeading('TODO') === 'To Do 3', 'To Do count after three creates');
    obs.boardSelects = await page.getByTestId('project-task-board').locator('select').count();
    assert(obs.boardSelects === 0, 'The board has a select (no status filter in this design)');
    obs.gridCountAfterCreate = await openTasksViaGrid(seeded.tasksDemo.projectId);
    assert(obs.gridCountAfterCreate === '3 open tasks', `Grid count after returning: ${obs.gridCountAfterCreate}`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor('board after reload', async () => (await taskSummaries()).join('|') === obs.order.join('|'));
  });

  await runCase('E2E-015', 'Edit a Task description (Cancel discards, empty rejected, save) and delete with confirmation (Cancel keeps)', async obs => {
    await ensureProjectsEnabled();
    assert(seeded.tasksDemo && seeded.releaseTaskId, 'E2E-014 seed missing');
    const projectId = seeded.tasksDemo.projectId;
    await openProjectDetail(projectId);
    const before = await api.tasks(nodeA, projectId);
    await taskCard(seeded.releaseTaskId).click();
    await page.getByTestId('project-task-edit').click();
    const input = page.getByTestId('project-task-description-input');
    obs.editPrefill = await input.inputValue();
    assert(obs.editPrefill === RELEASE_NOTES, 'Edit is not prefilled with the full description');
    await input.fill('Discard me');
    await page.getByTestId('project-task-cancel').click();
    await page.getByTestId('project-task-view').waitFor({ state: 'visible', timeout: timeoutMs });
    assert(await page.getByTestId('project-task-view-description').innerText() === RELEASE_NOTES, 'Cancel did not discard the edit');
    assert(JSON.stringify(await api.tasks(nodeA, projectId)) === JSON.stringify(before), 'Cancel changed data');

    await page.getByTestId('project-task-edit').click();
    await input.fill('   ');
    await page.getByTestId('project-task-save').click();
    await page.getByTestId('project-task-description-error').waitFor({ state: 'visible', timeout: timeoutMs });
    assert(JSON.stringify(await api.tasks(nodeA, projectId)) === JSON.stringify(before), 'Empty edit changed data');

    const edited = 'Write release notes for 1.4.87 and 1.4.88\nInclude Projects, Tasks and search';
    await input.fill(edited);
    await page.getByTestId('project-task-save').click();
    await page.getByTestId('project-task-view').waitFor({ state: 'visible', timeout: timeoutMs });
    obs.viewAfterSave = await page.getByTestId('project-task-view-description').innerText();
    assert(obs.viewAfterSave === edited, 'Saved description not shown in full');
    await page.getByTestId('project-task-close').click();
    await taskDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    obs.orderAfterEdit = await taskSummaries();
    assert(obs.orderAfterEdit[0] === 'Write release notes for 1.4.87 and 1.4.88', `Edited Task not first / summary not updated: ${obs.orderAfterEdit}`);

    const pipeline = (await api.tasks(nodeA, projectId)).find(task => task.description === 'Fix the release pipeline');
    await taskCard(pipeline.taskId).click();
    await page.getByTestId('project-task-delete').click();
    await page.getByTestId('project-task-delete-confirm').waitFor({ state: 'visible', timeout: timeoutMs });
    obs.deleteMessage = (await page.getByTestId('project-task-delete-confirm').innerText()).trim();
    obs.deleteInitialFocus = (await activeInfo()).testId;
    assert(obs.deleteMessage.includes('Fix the release pipeline'), `Delete message: ${obs.deleteMessage}`);
    await page.getByTestId('project-task-delete-cancel').click();
    await page.getByTestId('project-task-view').waitFor({ state: 'visible', timeout: timeoutMs });
    assert((await api.tasks(nodeA, projectId)).some(task => task.taskId === pipeline.taskId), 'Cancel deleted the Task');
    await page.getByTestId('project-task-delete').click();
    await page.getByTestId('project-task-delete-confirm-button').click();
    await taskDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    await taskCard(pipeline.taskId).waitFor({ state: 'detached', timeout: timeoutMs });
    assert(!(await api.tasks(nodeA, projectId)).some(task => task.taskId === pipeline.taskId), 'Confirmed delete did not remove the Task');
    assert(await columnHeading('TODO') === 'To Do 2', 'To Do count after delete');
    obs.gridCountAfterDelete = await openTasksViaGrid(projectId);
    assert(obs.gridCountAfterDelete === '2 open tasks', `Grid count after delete: ${obs.gridCountAfterDelete}`);
  });

  await runCase('E2E-016', '120 Tasks: search across columns under 100 ms with filtered column counts, no-match and clear; nothing changes', async obs => {
    await ensureProjectsEnabled();
    const scale = await api.createProject(nodeA, 'Scale', '120 Tasks');
    seeded.scale = scale;
    const descriptionOf = index => (index % 10 === 0
      ? `Prepare release checklist ${index}\nOwner: web`
      : `Routine chore ${index}\n${index % 25 === 0 ? 'Blocked on the release branch' : 'Nothing special'}`);
    for (let index = 1; index <= 120; index += 1) await api.createTask(nodeA, scale.projectId, descriptionOf(index));
    const all = await api.tasks(nodeA, scale.projectId);
    assert(all.length === 120, 'Seeding 120 Tasks failed');
    const expectedRelease = new Set(all.filter(task => task.description.toLowerCase().includes('release')).map(task => task.taskId));
    obs.expectedReleaseMatches = expectedRelease.size;
    await openProjectDetail(scale.projectId);
    await waitFor('120 cards', async () => (await taskCardsOn(page).count()) === 120);
    const visibleIds = async () => taskCardsOn(page).evaluateAll(cards => cards.map(card => card.getAttribute('data-testid').replace('project-task-card-', '')));
    const measure = query => page.evaluate(async ({ value, selector }) => {
      const input = document.querySelector('[data-testid="project-tasks-search-input"]');
      const count = () => document.querySelectorAll(selector).length;
      const start = performance.now();
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
      const updated = performance.now();
      const cardsAfterUpdate = count();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { updateMs: updated - start, paintedMs: performance.now() - start, cards: cardsAfterUpdate, noMatch: Boolean(document.querySelector('[data-testid="project-tasks-no-match"]')) };
    }, { value: query, selector: TASK_CARD });
    const timings = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      for (const query of ['release', 'RELEASE', '', 'zzz-no-match', '']) timings.push({ query, ...(await measure(query)) });
    }
    obs.maxUpdateMs = Math.max(...timings.map(item => item.updateMs));
    obs.maxPaintedMs = Math.max(...timings.map(item => item.paintedMs));
    obs.timingSample = timings.slice(0, 5).map(item => ({ query: item.query, updateMs: Math.round(item.updateMs * 10) / 10, paintedMs: Math.round(item.paintedMs * 10) / 10, cards: item.cards }));
    assert(obs.maxUpdateMs < 100, `Search update exceeded 100 ms: ${obs.maxUpdateMs}`);
    assert(obs.maxPaintedMs < 100, `Search to painted frame exceeded 100 ms: ${obs.maxPaintedMs}`);
    assert(timings.filter(item => item.query.toLowerCase() === 'release').every(item => item.cards === expectedRelease.size), 'Search result count mismatch');
    assert(timings.filter(item => item.query === 'zzz-no-match').every(item => item.cards === 0 && item.noMatch), 'No-match state missing');
    assert(timings.filter(item => item.query === '').every(item => item.cards === 120), 'Clearing search did not restore all cards');

    const search = page.getByTestId('project-tasks-search-input');
    await search.fill('release');
    const matched = await visibleIds();
    assert(matched.length === expectedRelease.size && matched.every(id => expectedRelease.has(id)), 'Search shows a non-matching Task');
    obs.headingsWhileSearching = [await columnHeading('TODO'), await columnHeading('IN_PROGRESS'), await columnHeading('DONE')];
    assert(obs.headingsWhileSearching.join('|') === `To Do ${expectedRelease.size}|In Progress 0|Done 0`, `Filtered counts: ${obs.headingsWhileSearching}`);
    await search.fill('zzz-no-match');
    await page.getByTestId('project-tasks-no-match').waitFor({ state: 'visible', timeout: timeoutMs });
    await page.getByTestId('project-tasks-clear-search').click();
    await waitFor('search cleared', async () => (await taskCardsOn(page).count()) === 120 && (await search.inputValue()) === '');
    obs.focusAfterClear = (await activeInfo()).testId;
    assert(obs.focusAfterClear === 'project-tasks-search-input', `Focus after Clear search: ${obs.focusAfterClear}`);
    const after = await api.tasks(nodeA, scale.projectId);
    assert(JSON.stringify(after) === JSON.stringify(all), 'Searching changed Tasks');
  });

  await runCase('E2E-017', 'Project delete with 5 Tasks states the count (both tabs), Cancel keeps everything, confirm cascades; workspaces untouched', async obs => {
    await ensureProjectsEnabled();
    const five = await api.createProject(nodeA, 'Five tasks', 'Delete me with my Tasks');
    for (let index = 1; index <= 5; index += 1) await api.createTask(nodeA, five.projectId, `Five-task item ${index}`);
    const ws = seeded.superrepo ?? await api.registerWorkspace(nodeA, rootOf('e2e-superrepo'));
    await api.addLink(nodeA, five.projectId, ws.workspaceId, 'Main');
    const otherTasksBefore = await api.tasks(nodeA, seeded.tasksDemo.projectId);
    const workspacesBefore = await readWorkspacesJson(nodeA);
    const memoryBefore = (await fs.readdir(path.join(nodeA.dataRoot, 'memory'), { recursive: true })).sort().join('|');

    await openProjectDetail(five.projectId);
    await page.getByTestId('project-delete-button').click();
    await page.getByTestId('project-delete-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    obs.messageTasksTab = (await page.getByTestId('project-delete-message').innerText()).trim();
    assert(/\b5 tasks\b/.test(obs.messageTasksTab), `Delete message: ${obs.messageTasksTab}`);
    await page.getByTestId('project-delete-cancel').click();
    await page.getByTestId('project-delete-dialog').waitFor({ state: 'detached', timeout: timeoutMs });
    assert((await api.tasks(nodeA, five.projectId)).length === 5, 'Cancel removed Tasks');

    await openProjectDetail(five.projectId, { tab: 'workspaces' });
    await page.getByTestId('project-delete-button').click();
    obs.messageWorkspacesTab = (await page.getByTestId('project-delete-message').innerText()).trim();
    assert(/\b5 tasks\b/.test(obs.messageWorkspacesTab), `Delete message on the Workspaces tab: ${obs.messageWorkspacesTab}`);
    await page.getByTestId('project-delete-confirm').click();
    await waitFor('back to /projects', async () => pathname() === '/projects');
    await page.getByTestId('projects-grid').waitFor({ state: 'visible', timeout: timeoutMs });
    await waitFor('card gone', async () => (await projectCard(five.projectId).count()) === 0);
    assert(await api.project(nodeA, five.projectId) === null, 'Project still exists');
    const fileText = await readProjectsFile(nodeA);
    obs.fileHasDeletedProject = fileText.includes(five.projectId) || fileText.includes('Five-task item');
    assert(!obs.fileHasDeletedProject, 'projects.json still contains the deleted Project or its Tasks');
    obs.workspacesJsonUnchanged = (await readWorkspacesJson(nodeA)) === workspacesBefore;
    obs.memoryDirUnchanged = (await fs.readdir(path.join(nodeA.dataRoot, 'memory'), { recursive: true })).sort().join('|') === memoryBefore;
    assert(obs.workspacesJsonUnchanged && (await api.workspaceIds(nodeA)).includes(ws.workspaceId), 'Workspace registry changed');
    assert(obs.memoryDirUnchanged, 'Run memory/history directory changed');
    assert(JSON.stringify(await api.tasks(nodeA, seeded.tasksDemo.projectId)) === JSON.stringify(otherTasksBefore), 'Another Project\'s Tasks changed');
  });

  await runCase('E2E-018', 'Project cards show "N open tasks · N workspaces" (singular, plural and none)', async obs => {
    await ensureProjectsEnabled();
    const four = await api.createProject(nodeA, 'Four tasks');
    for (let index = 1; index <= 4; index += 1) await api.createTask(nodeA, four.projectId, `Four-task item ${index}`);
    const none = await api.createProject(nodeA, 'Empty project');
    const one = await api.createProject(nodeA, 'One task');
    await api.createTask(nodeA, one.projectId, 'The only task');
    const ws = seeded.superrepo ?? await api.registerWorkspace(nodeA, rootOf('e2e-superrepo'));
    await api.addLink(nodeA, one.projectId, ws.workspaceId, 'Main');
    seeded.four = four;
    seeded.none = none;
    await gotoAndSettle('/projects');
    await projectCard(four.projectId).waitFor({ state: 'visible', timeout: timeoutMs });
    obs.counts = {
      four: await cardCounts(four.projectId), none: await cardCounts(none.projectId), one: await cardCounts(one.projectId),
      tasksDemo: await cardCounts(seeded.tasksDemo.projectId), scale: await cardCounts(seeded.scale.projectId),
    };
    assert(obs.counts.four === '4 open tasks · No workspaces' && obs.counts.none === 'No open tasks · No workspaces'
      && obs.counts.one === '1 open task · 1 workspace' && obs.counts.tasksDemo === '2 open tasks · No workspaces'
      && obs.counts.scale === '120 open tasks · No workspaces', `Counts: ${JSON.stringify(obs.counts)}`);
    await api.deleteProject(nodeA, one.projectId);
  });

  await runCase('E2E-019', 'Projects off hides Tasks; on shows the same Tasks', async obs => {
    await ensureProjectsEnabled();
    const before = await api.tasks(nodeA, seeded.tasksDemo.projectId);
    await gotoAndSettle('/settings?section=server-settings&mode=quick');
    const toggle = page.getByTestId('projects-feature-toggle');
    await waitFor('toggle resolved', async () => !(await toggle.isDisabled()));
    await toggle.click();
    await waitFor('disabled', async () => (await api.capability(nodeA)).enabled === false);
    await navAfterLeavingSettings('hides Projects', labels => !labels.includes('Projects'));
    await routerPush(`/projects/${seeded.tasksDemo.projectId}`);
    await expectRedirectHome('Project Tasks route while disabled');
    await gotoAndSettle(`/projects/${seeded.tasksDemo.projectId}`);
    await expectRedirectHome('deep link while disabled');
    obs.tasksWhileHidden = (await api.tasks(nodeA, seeded.tasksDemo.projectId)).length;
    await settingsClientSide('quick');
    await waitFor('toggle resolved', async () => !(await toggle.isDisabled()));
    await toggle.click();
    await waitFor('enabled', async () => (await api.capability(nodeA)).enabled === true);
    await navAfterLeavingSettings('shows Projects', labels => labels.includes('Projects'));
    await nav().getByRole('button', { name: 'Projects', exact: true }).click();
    await projectCard(seeded.tasksDemo.projectId).click();
    await waitFor('Tasks back', async () => (await taskSummaries()).length === before.length);
    obs.summaries = await taskSummaries();
    assert(JSON.stringify(await api.tasks(nodeA, seeded.tasksDemo.projectId)) === JSON.stringify(before), 'Tasks changed while hidden');
  });

  await runCase('E2E-020', 'Grid → full-width Project page → "← Projects"; deep link opens the board; unknown id not-found with Back', async obs => {
    await ensureProjectsEnabled();
    await gotoAndSettle('/projects');
    await page.getByTestId('projects-grid').waitFor({ state: 'visible', timeout: timeoutMs });
    obs.noTwoPane = await page.locator('[data-testid="project-list-pane"], [data-testid="projects-page"]').count();
    assert(obs.noTwoPane === 0, 'A two-pane list is still rendered');
    const marker = await markPage();

    await projectCard(seeded.tasksDemo.projectId).click();
    await waitFor('board for A', async () => (await taskSummaries()).join('|') === 'Write release notes for 1.4.87 and 1.4.88|Plan the Tasks admission work');
    obs.pageAfterCardClick = pathname();
    obs.fullWidth = await page.evaluate(() => {
      const detail = document.querySelector('[data-testid="project-detail"]').getBoundingClientRect();
      const main = document.querySelector('main').getBoundingClientRect();
      return { detailWidth: Math.round(detail.width), mainWidth: Math.round(main.width) };
    });
    assert(Math.abs(obs.fullWidth.detailWidth - obs.fullWidth.mainWidth) <= 20, `Project page is not full width: ${JSON.stringify(obs.fullWidth)}`);
    obs.backLink = { text: (await page.getByTestId('project-back-link').innerText()).trim(), name: await page.getByTestId('project-back-link').getAttribute('aria-label') };
    assert(obs.backLink.text === 'Projects' && obs.backLink.name === 'Back to projects', `Back link: ${JSON.stringify(obs.backLink)}`);
    await page.getByTestId('project-back-link').click();
    await waitFor('back to the grid', async () => pathname() === '/projects');
    await projectCard(seeded.four.projectId).click();
    await waitFor('board for B', async () => (await page.getByTestId('project-detail-name').innerText()).trim() === 'Four tasks' && (await taskSummaries()).length === 4);
    obs.noReload = (await pageMarker()) === marker;
    assert(obs.noReload, 'Navigating grid → page → grid reloaded the app');

    await gotoAndSettle(`/projects/${seeded.four.projectId}`);
    await waitFor('deep link board', async () => (await taskSummaries()).length === 4);
    obs.deepLinkTab = await page.getByTestId('project-tab-tasks').getAttribute('aria-selected');
    assert(obs.deepLinkTab === 'true', 'Deep link did not open the Tasks tab');

    await gotoAndSettle('/projects/project_does_not_exist');
    await page.getByTestId('project-not-found').waitFor({ state: 'visible', timeout: timeoutMs });
    await page.getByTestId('project-back-link').click();
    await waitFor('recovered to the grid', async () => pathname() === '/projects');
    await page.getByTestId('projects-grid').waitFor({ state: 'visible', timeout: timeoutMs });
  });

  await runCase('E2E-021', 'Keyboard-only Task journey: create (Ctrl/⌘+Enter), validation, view/edit/cancel, delete with confirmation, tabs Home/End, Project delete', async obs => {
    await ensureProjectsEnabled();
    const failures = [];
    const soft = (condition, message) => { if (!condition) failures.push(message); };
    const projectId = seeded.tasksDemo.projectId;
    const isCardFor = text => info => (info.testId ?? '').startsWith('project-task-card-') && info.text.includes(text);
    await openProjectDetail(projectId);
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    obs.tabsToNewTask = await tabUntil('New task button', info => info.testId === 'project-tasks-new-button');

    // Empty submit through the Save button, then Escape with focus return.
    await page.keyboard.press('Enter');
    await taskDialog().waitFor({ state: 'visible', timeout: timeoutMs });
    soft((await activeInfo()).testId === 'project-task-description-input', 'Create dialog did not focus the description');
    await tabUntil('Save', info => info.testId === 'project-task-save', 3);
    await page.keyboard.press('Enter');
    await page.getByTestId('project-task-description-error').waitFor({ state: 'visible', timeout: timeoutMs });
    soft((await activeInfo()).testId === 'project-task-description-input', 'Validation error did not return focus to the description');
    const trapWalk = [];
    for (let index = 0; index < 3; index += 1) { await page.keyboard.press('Tab'); trapWalk.push(await activeInfo()); }
    obs.createTrapWalk = trapWalk.map(info => `${info.testId || info.text}:${info.inDialog}`);
    soft(trapWalk.every(info => info.inDialog) && trapWalk.at(-1)?.testId === 'project-task-description-input', 'Tab did not cycle inside the create dialog');
    await page.keyboard.press('Escape');
    await taskDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    soft((await activeInfo()).testId === 'project-tasks-new-button', 'Focus did not return to New task after Escape');

    // Multi-line create with Ctrl/⌘+Enter.
    await page.keyboard.press('Enter');
    await taskDialog().waitFor({ state: 'visible', timeout: timeoutMs });
    await page.keyboard.type('Keyboard task line one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Keyboard task line two');
    await page.keyboard.press('ControlOrMeta+Enter');
    await taskDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    const keyboardTask = (await api.tasks(nodeA, projectId)).find(task => task.description.startsWith('Keyboard task line one'));
    soft(keyboardTask?.description === 'Keyboard task line one\nKeyboard task line two', `Keyboard create: ${JSON.stringify(keyboardTask)}`);
    soft((await activeInfo()).testId === 'project-tasks-new-button', 'Focus did not return to New task after creating');
    assert(keyboardTask, 'Keyboard create failed');

    // Open the card, edit (Cancel then Save), close with Escape.
    await tabUntil('the new Task card', isCardFor('Keyboard task line one'), 12);
    await page.keyboard.press('Enter');
    await page.getByTestId('project-task-view').waitFor({ state: 'visible', timeout: timeoutMs });
    soft((await activeInfo()).testId === 'project-task-edit', 'View mode did not focus Edit');
    const viewWalk = [];
    for (let index = 0; index < 3; index += 1) { await page.keyboard.press('Tab'); viewWalk.push(await activeInfo()); }
    obs.viewTrapWalk = viewWalk.map(info => `${info.testId}:${info.inDialog}`);
    soft(viewWalk.every(info => info.inDialog) && viewWalk.at(-1)?.testId === 'project-task-edit', 'Tab did not cycle inside the view dialog');
    await page.keyboard.press('Enter');
    await page.getByTestId('project-task-description-input').waitFor({ state: 'visible', timeout: timeoutMs });
    soft((await activeInfo()).testId === 'project-task-description-input', 'Edit mode did not focus the description');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('Should be discarded');
    await tabUntil('Cancel', info => info.testId === 'project-task-cancel', 3);
    await page.keyboard.press('Enter');
    await page.getByTestId('project-task-view').waitFor({ state: 'visible', timeout: timeoutMs });
    soft((await page.getByTestId('project-task-view-description').innerText()) === 'Keyboard task line one\nKeyboard task line two', 'Keyboard Cancel did not discard');
    soft((await activeInfo()).testId === 'project-task-edit', 'Cancel did not return focus to Edit');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('Keyboard task edited');
    await tabUntil('Save', info => info.testId === 'project-task-save', 3);
    await page.keyboard.press('Enter');
    await page.getByTestId('project-task-view').waitFor({ state: 'visible', timeout: timeoutMs });
    soft((await page.getByTestId('project-task-view-description').innerText()) === 'Keyboard task edited', 'Keyboard save did not persist the edit in view');
    await page.keyboard.press('Escape');
    await taskDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    obs.focusAfterViewEscape = await activeInfo();
    soft(isCardFor('Keyboard task edited')(obs.focusAfterViewEscape), 'Focus did not return to the Task card');

    // Delete: Cancel returns to view, then confirm.
    await page.keyboard.press('Enter');
    await page.getByTestId('project-task-view').waitFor({ state: 'visible', timeout: timeoutMs });
    await tabUntil('Delete', info => info.testId === 'project-task-delete', 3);
    await page.keyboard.press('Enter');
    await page.getByTestId('project-task-delete-confirm').waitFor({ state: 'visible', timeout: timeoutMs });
    soft((await activeInfo()).testId === 'project-task-delete-cancel', 'Delete confirmation did not focus Cancel');
    await page.keyboard.press('Enter');
    await page.getByTestId('project-task-view').waitFor({ state: 'visible', timeout: timeoutMs });
    await tabUntil('Delete', info => info.testId === 'project-task-delete', 3);
    await page.keyboard.press('Enter');
    await tabUntil('Confirm delete', info => info.testId === 'project-task-delete-confirm-button', 3);
    await page.keyboard.press('Enter');
    await taskDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    soft(!(await api.tasks(nodeA, projectId)).some(task => task.taskId === keyboardTask.taskId), 'Keyboard delete failed');
    obs.focusAfterTaskDelete = await activeInfo();

    // Tabs: arrows, Home and End.
    await page.getByTestId('project-tab-tasks').focus();
    await page.keyboard.press('End');
    await waitFor('End selects Workspaces', async () => (await page.getByTestId('project-tab-workspaces').getAttribute('aria-selected')) === 'true');
    soft((await activeInfo()).testId === 'project-tab-workspaces', 'End did not focus Workspaces');
    await page.keyboard.press('Home');
    await waitFor('Home selects Tasks', async () => (await page.getByTestId('project-tab-tasks').getAttribute('aria-selected')) === 'true');
    soft((await activeInfo()).testId === 'project-tab-tasks', 'Home did not focus Tasks');
    await page.keyboard.press('ArrowLeft');
    await waitFor('ArrowLeft wraps to Workspaces', async () => (await page.getByTestId('project-tab-workspaces').getAttribute('aria-selected')) === 'true');
    await page.keyboard.press('ArrowRight');
    await waitFor('ArrowRight wraps to Tasks', async () => (await page.getByTestId('project-tab-tasks').getAttribute('aria-selected')) === 'true');
    obs.tabsInTabOrder = await page.evaluate(() => Array.from(document.querySelectorAll('[role="tab"]')).map(tab => `${tab.getAttribute('data-testid')}:${tab.tabIndex}`));

    // Search is a labelled, focusable control; Tab moves on to New task; cards follow in column order.
    await page.getByTestId('project-tasks-search-input').focus();
    await page.keyboard.type('plan');
    await waitFor('keyboard search', async () => (await taskSummaries()).join('|') === 'Plan the Tasks admission work');
    await page.keyboard.press('Tab');
    obs.afterSearchTab = (await activeInfo()).testId;
    soft(obs.afterSearchTab === 'project-tasks-new-button', 'Tab from search did not reach New task');
    await page.keyboard.press('Tab');
    soft(isCardFor('Plan the Tasks admission work')(await activeInfo()), 'Tab from New task did not reach the matching card');
    await page.getByTestId('project-tasks-search-input').fill('');

    // Back link by keyboard.
    await page.getByTestId('project-back-link').focus();
    await page.keyboard.press('Enter');
    await waitFor('back by keyboard', async () => pathname() === '/projects');

    // Project delete with its Task count, keyboard only.
    const doomed = await api.createProject(nodeA, 'Keyboard delete me');
    await api.createTask(nodeA, doomed.projectId, 'Only task');
    await openProjectDetail(doomed.projectId);
    await page.getByTestId('project-delete-button').focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('project-delete-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    obs.projectDeleteMessage = (await page.getByTestId('project-delete-message').innerText()).trim();
    soft(/\b1 task\b/.test(obs.projectDeleteMessage), `Project delete message: ${obs.projectDeleteMessage}`);
    soft((await activeInfo()).testId === 'project-delete-cancel', 'Project delete did not focus Cancel');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await waitFor('project deleted by keyboard', async () => pathname() === '/projects');
    soft(await api.project(nodeA, doomed.projectId) === null, 'Keyboard Project delete failed');

    obs.softFailures = failures;
    assert(failures.length === 0, `Keyboard journey failures:\n- ${failures.join('\n- ')}`);
  });

  await runCase('E2E-022', 'zh-CN Task surfaces: tabs, board columns, New task, card counts, dialogs, empty board; no raw keys or English Task strings', async obs => {
    await ensureProjectsEnabled();
    const zhContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', timezoneId: 'UTC' });
    await zhContext.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    const zhPage = await zhContext.newPage();
    const texts = [];
    await zhPage.goto(`${frontendUrl}/projects`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await zhPage.getByTestId('projects-grid').waitFor({ state: 'visible', timeout: timeoutMs });
    texts.push(await zhPage.getByTestId('projects-index').innerText());
    obs.indexZh = texts[0].includes('新建项目');
    obs.countZh = await cardCountsOn(zhPage, seeded.four.projectId);
    await zhPage.goto(`${frontendUrl}/projects/${seeded.tasksDemo.projectId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await zhPage.getByTestId('project-task-columns').waitFor({ state: 'visible', timeout: timeoutMs });
    const detail = await zhPage.getByTestId('project-detail').innerText();
    texts.push(detail);
    obs.detailZh = ['项目', '任务', '工作区', '新建任务', '待办', '进行中', '已完成'].filter(label => !detail.includes(label));
    obs.backNameZh = await zhPage.getByTestId('project-back-link').getAttribute('aria-label');
    await zhPage.getByTestId('project-tasks-new-button').click();
    await zhPage.getByTestId('project-task-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    await zhPage.getByTestId('project-task-save').click();
    await zhPage.getByTestId('project-task-description-error').waitFor({ state: 'visible', timeout: timeoutMs });
    const createText = await zhPage.getByTestId('project-task-dialog').innerText();
    texts.push(createText);
    obs.createZh = ['新建任务', '描述', '创建任务', '请描述这项任务。'].filter(label => !createText.includes(label));
    await zhPage.keyboard.press('Escape');
    await zhPage.locator(TASK_CARD).first().click();
    await zhPage.getByTestId('project-task-view').waitFor({ state: 'visible', timeout: timeoutMs });
    await zhPage.getByTestId('project-task-delete').click();
    const deleteText = await zhPage.getByTestId('project-task-dialog').innerText();
    texts.push(deleteText);
    obs.deleteZh = ['删除任务？', '此操作无法撤销'].filter(label => !deleteText.includes(label));
    await zhPage.keyboard.press('Escape');
    await zhPage.goto(`${frontendUrl}/projects/${seeded.none.projectId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await zhPage.getByTestId('project-task-columns').waitFor({ state: 'visible', timeout: timeoutMs });
    const emptyText = await zhPage.getByTestId('project-task-board').innerText();
    texts.push(emptyText);
    obs.emptyZh = (await zhPage.getByTestId('project-task-column-empty').allInnerTexts()).every(text => text.trim() === '暂无任务');
    await zhPage.getByTestId('project-delete-button').click();
    texts.push(await zhPage.getByTestId('project-delete-dialog').innerText());
    await zhPage.keyboard.press('Escape');
    await zhContext.close();
    const all = texts.join('\n');
    obs.rawKeys = all.match(new RegExp(RAW_KEY.source, 'gi')) ?? [];
    obs.englishTaskStrings = ['New task', 'To Do', 'In Progress', 'Search tasks', 'open task', 'Create task', 'Delete task', 'Describe the task', 'No tasks', 'workspace'].filter(label => all.includes(label));
    assert(obs.indexZh && obs.countZh === '4 项未完成任务 · 没有工作区' && obs.detailZh.length === 0 && obs.backNameZh === '返回项目列表'
      && obs.createZh.length === 0 && obs.deleteZh.length === 0 && obs.emptyZh, `zh-CN gaps: ${JSON.stringify(obs)}`);
    assert(obs.rawKeys.length === 0 && obs.englishTaskStrings.length === 0, `Untranslated: ${JSON.stringify({ rawKeys: obs.rawKeys, english: obs.englishTaskStrings })}`);
  });

  await runCase('E2E-023', 'Narrow window (700x900): board columns stack, no horizontal overflow, Task dialog fits', async obs => {
    await ensureProjectsEnabled();
    const narrow = await browser.newContext({ viewport: { width: 700, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
    await narrow.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    const narrowPage = await narrow.newPage();
    await narrowPage.goto(`${frontendUrl}/projects/${seeded.tasksDemo.projectId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await narrowPage.getByTestId('project-task-columns').waitFor({ state: 'visible', timeout: timeoutMs });
    obs.columns = await boardColumnBoxes(narrowPage);
    obs.layout = await narrowPage.evaluate(() => {
      const box = selector => { const element = document.querySelector(selector); if (!element) return null; const rect = element.getBoundingClientRect(); return { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom) }; };
      return {
        viewportWidth: window.innerWidth,
        docOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        back: box('[data-testid="project-back-link"]'), newTask: box('[data-testid="project-tasks-new-button"]'), search: box('[data-testid="project-tasks-search-input"]'), firstCard: box('button[data-testid^="project-task-card-"]'),
      };
    });
    assert(obs.columns.stacked, `Columns are side by side at 700px: ${JSON.stringify(obs.columns)}`);
    assert(obs.layout.docOverflowX <= 0, `Horizontal overflow ${obs.layout.docOverflowX}px`);
    for (const key of ['back', 'newTask', 'search', 'firstCard']) {
      assert(obs.layout[key] && obs.layout[key].left >= 0 && obs.layout[key].right <= obs.layout.viewportWidth, `${key} clipped: ${JSON.stringify(obs.layout[key])}`);
    }
    await narrowPage.screenshot({ path: path.join(outputDir, 'E2E-023-narrow-stacked.png'), fullPage: true });
    await narrowPage.getByTestId('project-tasks-new-button').click();
    await narrowPage.getByTestId('project-task-dialog').waitFor({ state: 'visible', timeout: timeoutMs });
    obs.dialog = await narrowPage.evaluate(() => {
      const dialog = document.querySelector('[data-testid="project-task-dialog"]').getBoundingClientRect();
      const save = document.querySelector('[data-testid="project-task-save"]').getBoundingClientRect();
      return { left: dialog.left, right: dialog.right, top: dialog.top, bottom: dialog.bottom, saveBottom: save.bottom };
    });
    assert(obs.dialog.left >= 0 && obs.dialog.right <= 700 && obs.dialog.top >= 0 && obs.dialog.bottom <= 900 && obs.dialog.saveBottom <= 900, `Task dialog does not fit: ${JSON.stringify(obs.dialog)}`);
    await narrow.close();
  });

  await runCase('E2E-027', 'Width guards in the real shell: 1200x800 default panel = three columns ≥ 240 px with 3-line cards; 520 px panel and a 1000 px window = ≥ 240 px or stacked', async obs => {
    await ensureProjectsEnabled();
    const guardProject = await api.createProject(nodeA, 'Width guard');
    await api.createTask(nodeA, guardProject.projectId, 'First line of a long card\nSecond line keeps going\nThird line is still visible\nFourth line must be clamped away');
    await api.createTask(nodeA, guardProject.projectId, 'A second task');
    const shellPage = async (width, height) => {
      const context = await browser.newContext({ viewport: { width, height }, locale: 'en-US', timezoneId: 'UTC' });
      await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
      const target = await context.newPage();
      await target.goto(`${frontendUrl}/projects/${guardProject.projectId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await target.getByTestId('project-task-columns').waitFor({ state: 'visible', timeout: timeoutMs });
      return { context, target };
    };
    const leftPanelWidth = target => target.evaluate(() => Math.round(document.querySelector('[data-test="app-left-panel-shell"]')?.getBoundingClientRect().width ?? 0));
    const acceptable = columns => columns.stacked || columns.widths.every(width => width >= 240);

    // 1200x800, default left panel: side by side, each ≥ 240 px; the long card shows exactly 3 lines.
    const standard = await shellPage(1200, 800);
    obs.defaultPanelWidth = await leftPanelWidth(standard.target);
    obs.defaultColumns = await boardColumnBoxes(standard.target);
    obs.longCard = await standard.target.evaluate(() => {
      const text = Array.from(document.querySelectorAll('[data-testid="project-task-card-text"]')).find(element => element.textContent.startsWith('First line'));
      const style = getComputedStyle(text);
      const lineHeight = parseFloat(style.lineHeight);
      return { height: Math.round(text.getBoundingClientRect().height), lineHeight, lines: Math.round(text.getBoundingClientRect().height / lineHeight), clamp: style.webkitLineClamp };
    });
    await standard.target.screenshot({ path: path.join(outputDir, 'E2E-027-1200-default-panel.png') });
    assert(obs.defaultPanelWidth >= 300 && obs.defaultPanelWidth <= 340, `Default left panel width: ${obs.defaultPanelWidth}`);
    assert(obs.defaultColumns.sideBySide && obs.defaultColumns.widths.length === 3 && obs.defaultColumns.widths.every(width => width >= 240), `Default panel columns: ${JSON.stringify(obs.defaultColumns)}`);
    assert(obs.longCard.lines === 3, `Long card is not clamped to 3 lines: ${JSON.stringify(obs.longCard)}`);

    // Same window with the left panel dragged to its 520 px maximum.
    const handle = standard.target.locator('.left-panel-drag-handle');
    const handleBox = await handle.boundingBox();
    await standard.target.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + 200);
    await standard.target.mouse.down();
    await standard.target.mouse.move(handleBox.x + 400, handleBox.y + 200, { steps: 8 });
    await standard.target.mouse.up();
    await waitFor('left panel at its maximum', async () => (await leftPanelWidth(standard.target)) >= 515);
    obs.widePanelWidth = await leftPanelWidth(standard.target);
    obs.widePanelColumns = await boardColumnBoxes(standard.target);
    await standard.target.screenshot({ path: path.join(outputDir, 'E2E-027-1200-panel-520.png') });
    assert(acceptable(obs.widePanelColumns), `520 px panel: columns squeezed below 240 px: ${JSON.stringify(obs.widePanelColumns)}`);
    await standard.context.close();

    // A 1000x800 window with the default panel.
    const small = await shellPage(1000, 800);
    obs.smallWindowColumns = await boardColumnBoxes(small.target);
    await small.target.screenshot({ path: path.join(outputDir, 'E2E-027-1000-window.png') });
    assert(acceptable(obs.smallWindowColumns), `1000 px window: columns squeezed below 240 px: ${JSON.stringify(obs.smallWindowColumns)}`);
    await small.context.close();
    await api.deleteProject(nodeA, guardProject.projectId);
  });

  await runCase('E2E-024', 'Released v1.4.86 projects.json on a live node: intact, no open tasks, no rewrite while browsing; first Task write keeps released fields', async obs => {
    nodeC = await createNode(ownedRoot, 'node-c');
    await startNode(nodeC);
    await api.setProjectsEnabled(nodeC, true);
    const releasedWs = await api.registerWorkspace(nodeC, rootOf('e2e-released-ws'));
    obs.stopForSeed = await stop(nodeC.process);
    const releasedRow = {
      projectId: 'project_7d1e4c2a-0b55-4f7e-8a31-5c9e2f0d4b16',
      name: 'Released project',
      description: 'Created with v1.4.86',
      createdAt: '2026-09-20T08:00:00.000Z',
      updatedAt: '2026-09-21T09:30:00.000Z',
      workspaces: [{ workspaceId: releasedWs.workspaceId, workspaceRootPath: releasedWs.workspaceRootPath, description: 'Released link', addedAt: '2026-09-21T09:30:00.000Z' }],
    };
    const filePath = path.join(nodeC.dataRoot, 'projects', 'projects.json');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const releasedContent = `${JSON.stringify([releasedRow], null, 2)}\n`;
    await fs.writeFile(filePath, releasedContent, 'utf-8');
    await startNode(nodeC);
    const [apiView] = await api.projects(nodeC);
    obs.apiView = { name: apiView.name, openTaskCount: apiView.openTaskCount, links: apiView.workspaces.map(link => `${link.displayName}:${link.availability}`) };
    assert(apiView.projectId === releasedRow.projectId && apiView.openTaskCount === 0 && apiView.workspaces[0]?.availability === 'AVAILABLE', `API view: ${JSON.stringify(obs.apiView)}`);

    await gotoAndSettle('/projects');
    await projectCard(seeded.tasksDemo.projectId).waitFor({ state: 'visible', timeout: timeoutMs });
    seeded.originalBinding = await currentBinding();
    await bindPageTo('probe-node-c', nodeC.url);
    await projectCard(releasedRow.projectId).waitFor({ state: 'visible', timeout: timeoutMs });
    obs.gridNamesOnC = await gridNames();
    obs.countOnC = await cardCounts(releasedRow.projectId);
    await projectCard(releasedRow.projectId).click();
    await waitFor('empty board', async () => (await page.getByTestId('project-task-column-empty').count()) === 3);
    await page.getByTestId('project-tab-workspaces').click();
    await workspaceRow(releasedWs.workspaceId).waitFor({ state: 'visible', timeout: timeoutMs });
    obs.releasedLinkRow = (await workspaceRow(releasedWs.workspaceId).innerText()).replace(/\s+/g, ' ');
    obs.fileUnchangedAfterBrowsing = (await fs.readFile(filePath, 'utf-8')) === releasedContent;
    assert(obs.gridNamesOnC.join('|') === 'Released project' && obs.countOnC === 'No open tasks · 1 workspace', `Released grid: ${JSON.stringify(obs)}`);
    assert(obs.releasedLinkRow.includes('Released link'), 'Released link description missing');
    assert(obs.fileUnchangedAfterBrowsing, 'Browsing rewrote the released projects.json');

    await page.getByTestId('project-tab-tasks').click();
    await page.getByTestId('project-tasks-new-button').click();
    await page.getByTestId('project-task-description-input').fill('First task on a released Project');
    await page.getByTestId('project-task-save').click();
    await taskDialog().waitFor({ state: 'detached', timeout: timeoutMs });
    await waitFor('To Do 1 on C', async () => (await columnHeading('TODO')) === 'To Do 1');
    obs.gridCountOnC = await openTasksViaGrid(releasedRow.projectId);
    assert(obs.gridCountOnC === '1 open task', `Grid count on C: ${obs.gridCountOnC}`);
    const [persisted] = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    const { tasks, ...releasedFields } = persisted;
    obs.releasedFieldsPreserved = JSON.stringify(releasedFields) === JSON.stringify(releasedRow);
    obs.persistedTasks = tasks?.map(task => `${task.status}:${task.description}`);
    assert(obs.releasedFieldsPreserved && tasks?.length === 1, `After first write: ${JSON.stringify(persisted)}`);
  });

  await runCase('E2E-026', 'Mixed-status file (stand-in for future agent-written status): one card per column with filtered counts; "2 open tasks" excludes Done', async obs => {
    assert(nodeC?.process, 'E2E-024 node C missing');
    const filePath = path.join(nodeC.dataRoot, 'projects', 'projects.json');
    obs.stopForSeed = await stop(nodeC.process);
    const rows = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    const task = (id, status, description, updatedAt) => ({ taskId: `project_task_${id}`, description, status, createdAt: '2026-09-25T08:00:00.000Z', updatedAt });
    rows.push({
      projectId: 'project_mixed_status', name: 'Mixed status', description: '', createdAt: '2026-09-25T08:00:00.000Z', updatedAt: '2026-09-25T08:00:00.000Z', workspaces: [],
      tasks: [
        task('todo', 'TODO', 'Todo item', '2026-09-25T09:00:00.000Z'),
        task('progress', 'IN_PROGRESS', 'In-progress item', '2026-09-25T10:00:00.000Z'),
        task('done', 'DONE', 'Done item', '2026-09-25T11:00:00.000Z'),
      ],
    });
    await fs.writeFile(filePath, `${JSON.stringify(rows, null, 2)}\n`, 'utf-8');
    await startNode(nodeC);
    await gotoAndSettle('/projects');
    await projectCard(seeded.tasksDemo.projectId).waitFor({ state: 'visible', timeout: timeoutMs });
    await bindPageTo('probe-node-c', nodeC.url);
    await projectCard('project_mixed_status').waitFor({ state: 'visible', timeout: timeoutMs });
    obs.count = await cardCounts('project_mixed_status');
    await projectCard('project_mixed_status').click();
    await waitFor('3 cards', async () => (await taskCardsOn(page).count()) === 3);
    obs.columns = {
      TODO: [await columnHeading('TODO'), await taskSummaries('TODO')],
      IN_PROGRESS: [await columnHeading('IN_PROGRESS'), await taskSummaries('IN_PROGRESS')],
      DONE: [await columnHeading('DONE'), await taskSummaries('DONE')],
    };
    assert(obs.count === '2 open tasks · No workspaces', `Open count with a Done Task: ${obs.count}`);
    assert(JSON.stringify(obs.columns) === JSON.stringify({
      TODO: ['To Do 1', ['Todo item']], IN_PROGRESS: ['In Progress 1', ['In-progress item']], DONE: ['Done 1', ['Done item']],
    }), `Columns: ${JSON.stringify(obs.columns)}`);
    await page.getByTestId('project-tasks-search-input').fill('item');
    obs.searchHeadings = [await columnHeading('TODO'), await columnHeading('IN_PROGRESS'), await columnHeading('DONE')];
    await page.getByTestId('project-tasks-search-input').fill('progress');
    obs.searchProgressHeadings = [await columnHeading('TODO'), await columnHeading('IN_PROGRESS'), await columnHeading('DONE')];
    assert(obs.searchProgressHeadings.join('|') === 'To Do 0|In Progress 1|Done 0', `Filtered column counts: ${obs.searchProgressHeadings}`);
    await page.getByTestId('project-tasks-search-input').fill('');
    // Observation only (review note 1): the delete confirmation counts open Tasks; unreachable in this ticket without status mutation.
    await page.getByTestId('project-delete-button').click();
    obs.deleteMessageObserved = (await page.getByTestId('project-delete-message').innerText()).trim();
    await page.getByTestId('project-delete-cancel').click();
    await bindPageTo(seeded.originalBinding.nodeId, seeded.originalBinding.baseUrl);
    await gotoAndSettle('/projects');
    await projectCard(seeded.tasksDemo.projectId).waitFor({ state: 'visible', timeout: timeoutMs });
    obs.stoppedNodeC = await stop(nodeC.process);
  });

  await runCase('E2E-025', 'Tasks survive a real backend restart', async obs => {
    await ensureProjectsEnabled();
    const snapshot = async () => Promise.all((await api.projects(nodeA)).map(async project => ({ project, tasks: await api.tasks(nodeA, project.projectId) })));
    const before = await snapshot();
    obs.stopped = await stop(nodeA.process);
    await startNode(nodeA);
    const after = await snapshot();
    obs.projectTaskCounts = after.map(item => `${item.project.name}:${item.tasks.length}`);
    assert(JSON.stringify(after) === JSON.stringify(before), 'Projects or Tasks changed across restart');
    await gotoAndSettle('/projects');
    await projectCard(seeded.tasksDemo.projectId).waitFor({ state: 'visible', timeout: timeoutMs });
    obs.countAfterRestart = await openTasksPart(seeded.tasksDemo.projectId);
    assert(obs.countAfterRestart === '2 open tasks', `Count after restart: ${obs.countAfterRestart}`);
    await projectCard(seeded.tasksDemo.projectId).click();
    await waitFor('Tasks after restart', async () => (await taskSummaries()).join('|') === 'Write release notes for 1.4.87 and 1.4.88|Plan the Tasks admission work');
  });

  const results = Object.values(evidence.cases).map(item => item.result);
  evidence.summary = Object.fromEntries(Object.entries(evidence.cases).map(([id, item]) => [id, item.result]));
  evidence.result = results.every(result => result === 'Pass' || result === 'Not Tested') && results.some(result => result === 'Pass') ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = error?.stack || String(error);
  process.stderr.write(`${evidence.error}\n`);
} finally {
  if (browser) await browser.close().catch(error => { evidence.cleanup.browserError = error.message; });
  try { evidence.cleanup.frontend = await stop(frontend); } catch (error) { evidence.cleanup.frontendError = error.message; }
  try { evidence.cleanup.nodeA = await stop(nodeA?.process); } catch (error) { evidence.cleanup.nodeAError = error.message; }
  try { evidence.cleanup.nodeB = await stop(nodeB?.process); } catch (error) { evidence.cleanup.nodeBError = error.message; }
  try { evidence.cleanup.nodeC = await stop(nodeC?.process); } catch (error) { evidence.cleanup.nodeCError = error.message; }
  if (ownedRoot) {
    try { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.tempRoot = 'removed'; }
    catch (error) { evidence.cleanup.tempRootError = error.message; }
  }
  if (Object.keys(evidence.cleanup).some(key => key.endsWith('Error'))) evidence.result = 'Fail';
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(evidence, null, 2));
  process.stdout.write(`${evidence.result}: ${path.join(outputDir, 'result.json')}\n`);
  if (evidence.result !== 'Pass') process.exitCode = 1;
}

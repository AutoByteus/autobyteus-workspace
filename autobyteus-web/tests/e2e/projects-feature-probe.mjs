#!/usr/bin/env node
// Isolated browser/API regression for the feature-flagged Projects slice (PROJ-CONCEPT-20260926-001).
// Starts two throwaway backend nodes (A, B) and a Nuxt dev frontend bound to A, then drives the
// approved journeys AC-001..AC-012 in headless Chromium. Every case records Pass/Fail independently
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
const PROJECT_FIELDS = 'projectId name description workspaces { workspaceId workspaceRootPath displayName description availability }';
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
const openProjectDetail = async projectId => {
  await gotoAndSettle(`/projects/${projectId}`);
  await page.getByTestId('project-detail-name').waitFor({ state: 'visible', timeout: timeoutMs });
};
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
const TASK_WORDING = /\btasks?\b|任务/i;

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

let ownedRoot, nodeA, nodeB, frontend, browser;
await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });
try {
  if (!skipServerBuild) {
    await run('corepack', ['pnpm', '-C', serverDir, 'build'], root, process.env, path.join(outputDir, 'server-build.log'));
  }
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the worktree server with pnpm -C autobyteus-server-ts build first');
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-projects-e2e-'));
  const rootsDir = path.join(ownedRoot, 'roots');
  const folders = ['e2e-web-prototype', 'e2e-marketing', 'e2e-superrepo', 'e2e-new-root', 'e2e-kbd-root'];
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
    const cardNames = async () => (await grid.locator('h2').allInnerTexts()).map(text => text.trim());
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

    await page.getByTestId(`project-card-${seeded.autobyteus.projectId}`).click();
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
    await openProjectDetail(seeded.autobyteus.projectId);
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
    await openProjectDetail(seeded.autobyteus.projectId);
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
    await waitFor('card removed', async () => (await page.getByTestId(`project-card-${throwaway.projectId}`).count()) === 0);
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
    await waitFor('keyboard search', async () => (await page.getByTestId('projects-grid').locator('h2').allInnerTexts()).join('|') === 'Keyboard project');
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

  await runCase('E2E-008', 'zh-CN renders Projects surfaces; no Task wording on any Project surface', async obs => {
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
    await zhPage.goto(`${frontendUrl}/projects/${seeded.autobyteus.projectId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await zhPage.getByTestId('project-detail-name').waitFor({ state: 'visible', timeout: timeoutMs });
    const detailText = await zhPage.getByTestId('project-detail').innerText();
    obs.zhDetail = ['返回项目列表', '编辑', '删除', '工作区', '添加工作区', '取消关联'].filter(label => !detailText.includes(label));
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
    await openProjectDetail(seeded.autobyteus.projectId);
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
    obs.taskWordingMatches = allText.match(new RegExp(TASK_WORDING.source, 'gi')) ?? [];
    assert(obs.taskWordingMatches.length === 0, `Task wording rendered: ${obs.taskWordingMatches}`);
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
    await page.getByTestId(`project-card-${seeded.autobyteus.projectId}`).waitFor({ state: 'visible', timeout: timeoutMs });
    const after = await api.projects(nodeA);
    obs.projectsBefore = before.map(project => `${project.name}:${project.workspaces.length}`);
    obs.projectsAfter = after.map(project => `${project.name}:${project.workspaces.length}`);
    assert(JSON.stringify(after) === JSON.stringify(before), 'Projects changed across restart');
    await openProjectDetail(seeded.autobyteus.projectId);
    obs.rowsAfterRestart = await page.locator('[data-testid^="project-workspace-row-"]').count();
    assert(obs.rowsAfterRestart === before.find(project => project.projectId === seeded.autobyteus.projectId).workspaces.length, 'Rows missing after restart');
  });

  await runCase('E2E-011', 'Rebinding to node B shows B’s Projects; rebinding back shows A’s', async obs => {
    await ensureProjectsEnabled();
    await api.setProjectsEnabled(nodeB, true);
    const onlyOnB = await api.createProject(nodeB, 'node-b-only', 'Lives on node B');
    await gotoAndSettle('/projects');
    await page.getByTestId(`project-card-${seeded.autobyteus.projectId}`).waitFor({ state: 'visible', timeout: timeoutMs });
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
    await page.getByTestId(`project-card-${onlyOnB.projectId}`).waitFor({ state: 'visible', timeout: timeoutMs });
    obs.onB = (await page.getByTestId('projects-grid').locator('h2').allInnerTexts()).map(text => text.trim());
    assert(obs.onB.join('|') === 'node-b-only', `Node B list shows ${obs.onB}`);
    assert(graphqlTargets.includes(nodeB.url), 'No GraphQL request reached node B');
    await page.evaluate(({ nodeId, baseUrl }) => {
      document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s.get('windowNodeContext').bindNodeContext(nodeId, baseUrl);
    }, original);
    await page.getByTestId(`project-card-${seeded.autobyteus.projectId}`).waitFor({ state: 'visible', timeout: timeoutMs });
    obs.backOnA = (await page.getByTestId('projects-grid').locator('h2').allInnerTexts()).map(text => text.trim());
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
    await narrowPage.goto(`${frontendUrl}/projects/${seeded.autobyteus.projectId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
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

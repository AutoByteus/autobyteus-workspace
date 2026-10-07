#!/usr/bin/env node
// Isolated browser/API regression for the always-available Projects module: the Projects slice
// Current ordinary-page/continuous-row/context/Refresh contract: PROJ-TASK-MANAGER-20261002-001.
// Replaces obsolete overlay/card assertions; injected same-window rebinding is not a user journey.
// Starts disposable backend nodes and a Nuxt frontend bound to A, then drives real journeys in headless
// Chromium. Every case records Pass/Fail independently
// in <output-dir>/result.json; owned processes and the temp root are always cleaned up.
//
// Optional --voice-input adds actual browser microphone/worklet + fixture transcription, real project/task CRUD.
// --ledger-file=<initialized absolute path> appends each case outcome.
// Usage: node tests/e2e/projects-feature-probe.mjs [--skip-server-build] [--output-dir=...]
//        [--browser-executable=...] [--timeout-ms=30000]
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { runProjectVoiceCases } from './projects-voice-cases.mjs';

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
const voiceInput = process.argv.includes('--voice-input');
const ledger = arg('ledger-file', null);
const skipServerBuild = process.argv.includes('--skip-server-build');
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const timeoutMs = Number(arg('timeout-ms', '30000'));
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
  for (const folder of ['logs', 'memory', 'temp_workspace', 'home']) await fs.mkdir(path.join(dataRoot, folder), { recursive: true });
  const port = await choosePort();
  const url = `http://127.0.0.1:${port}`;
  const databaseUrl = pathToFileURL(databasePath).href;
  const env = {
    ...scrubbedEnv(), HOME: path.join(dataRoot, 'home'), AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: '', AUTOBYTEUS_SKILLS_PATHS: '', APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl,
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
const PROJECT_FIELDS = 'projectId name description taskCount openTaskCount workspaces { workspaceRootPath displayName description availability }';
const TASK_FIELDS = 'taskId projectId description status createdAt updatedAt contextFiles { storedFilename displayName mimeType sizeBytes locator }';
const api = {
  // projects-always-on: settings are written through the ordinary server-settings API (Advanced).
  setSetting: async (node, key, value) => (await gql(node, 'mutation($k: String!, $v: String!) { updateServerSetting(key: $k, value: $v) }', { k: key, v: value })).updateServerSetting,
  settings: async node => (await gql(node, '{ getServerSettings { key value isDeletable } }')).getServerSettings,
  others: async node => gql(node, '{ applicationsCapability { enabled source } skillImprovementCapability { enabled source } }'),
  projects: async node => (await gql(node, `{ projects { ${PROJECT_FIELDS} } }`)).projects,
  project: async (node, projectId) => (await gql(node, `query($id: String!) { project(projectId: $id) { ${PROJECT_FIELDS} } }`, { id: projectId })).project,
  createProject: async (node, name, description = '') => (await gql(node, `mutation($i: CreateProjectInput!) { createProject(input: $i) { ${PROJECT_FIELDS} } }`, { i: { name, description } })).createProject,
  addLink: async (node, projectId, workspaceRootPath, description) => (await gql(node, `mutation($i: AddProjectWorkspaceInput!) { addProjectWorkspace(input: $i) { ${PROJECT_FIELDS} } }`, { i: { projectId, workspaceRootPath, description } })).addProjectWorkspace,
  registerWorkspace: async (node, rootPath) => (await gql(node, 'mutation($i: CreateWorkspaceInput!) { createWorkspace(input: $i) { workspaceId workspaceRootPath } }', { i: { rootPath } })).createWorkspace,
  removeWorkspace: async (node, workspaceId) => (await gql(node, 'mutation($i: RemoveWorkspaceInput!) { removeWorkspace(input: $i) { success message } }', { i: { workspaceId } })).removeWorkspace,
  workspaceIds: async node => (await gql(node, '{ workspaces { workspaceId } }')).workspaces.map(item => item.workspaceId),
  tasks: async (node, projectId) => (await gql(node, `query($id: String!) { projectTasks(projectId: $id) { ${TASK_FIELDS} } }`, { id: projectId })).projectTasks,
  createTask: async (node, projectId, description) => (await gql(node, `mutation($i: CreateProjectTaskInput!) { createProjectTask(input: $i) { ${TASK_FIELDS} } }`, { i: { projectId, description } })).createProjectTask,
  deleteProject: async (node, projectId) => (await gql(node, 'mutation($id: String!) { deleteProject(projectId: $id) }', { id: projectId })).deleteProject,
};
const readEnvFile = node => fs.readFile(path.join(node.dataRoot, '.env'), 'utf-8');
const readWorkspacesJson = node => fs.readFile(path.join(node.dataRoot, 'workspaces.json'), 'utf-8');

// ---------------------------------------------------------------- current browser journeys
let page, frontendUrl, homePath, ownedRoot, nodeA, nodeB, frontend, browser;
const projectMutations = [];
const savedLinks = async id => JSON.parse(await fs.readFile(path.join(nodeA.dataRoot, 'projects', id, 'project.json'), 'utf8')).workspaces;
// CSS string escaping via JSON handles quotes/backslashes; do not interpolate a path into a test-id.
const workspaceRow = rootPath => page.getByTestId('project-workspace-row').and(page.locator(`[data-path=${JSON.stringify(rootPath)}]`));
const pathname = () => new URL(page.url()).pathname;
const goto = async target => { await page.goto(`${frontendUrl}${target}`, { waitUntil: 'domcontentloaded', timeout: 60000 }); };
const board = async projectId => { await goto(`/projects/${projectId}`); await page.getByTestId('project-task-columns').waitFor({ timeout: timeoutMs }); };
const row = id => page.getByTestId(`project-task-row-${id}`);
const refresh = () => page.getByTestId('project-tasks-refresh');
const search = () => page.getByTestId('project-tasks-search-input');
const screenshot = name => page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true });
const expectNoOverlay = async () => assert(await page.locator('[role="dialog"]').count() === 0, 'Primary authoring must be an ordinary page');
// AC-001/002/005: actual ordinary routes, both catalogs and responsive CSS.
// Locale storage is test-owned preference setup, not an injected component/runtime double.
const taskCopy = {
  en: { new: 'New task', edit: 'Edit task', placeholder: 'Describe the task…', label: 'Description (required)',
    context: 'Context Files', hint: 'Drag, paste or upload', attach: 'Attach files', shortcut: 'Ctrl+Enter or ⌘+Enter to save', cancel: 'Cancel', create: 'Create task', save: 'Save changes',
    removed: ['Describe the work to be done.', 'Update the description and context files without changing', "The first line is the task's summary on the board.", 'Files are saved with this task on the selected node.'] },
  'zh-CN': { new: '新建任务', edit: '编辑任务', placeholder: '描述任务…', label: '描述 （必填）',
    context: '上下文文件', hint: '拖动、粘贴或上传', attach: '添加文件', shortcut: 'Ctrl+Enter 或 ⌘+Enter 保存', cancel: '取消', create: '创建任务', save: '保存更改',
    removed: ['描述要完成的工作。', '更新描述和上下文文件，不改变任务标识或状态。', '第一行用作看板上的任务摘要', '文件随任务保存在所选节点。'] },
};
const assertTaskErrorAssociation = async invalid => {
  const association = await page.locator('#task-page-description').evaluate(e => ({
    invalid: e.getAttribute('aria-invalid'), describedBy: e.getAttribute('aria-describedby'),
    references: (e.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => ({ id, exists: !!document.getElementById(id), role: document.getElementById(id)?.getAttribute('role') })),
    focused: document.activeElement === e,
  }));
  assert(association.invalid === String(invalid), 'Textarea invalid state matches error');
  assert(invalid ? association.describedBy === 'task-page-error' && association.focused && association.references[0]?.role === 'alert' : association.describedBy === null, 'Only present actionable error is described; blank submission focuses input');
  assert(association.references.every(r => r.exists), 'No dangling textarea description reference');
  return association;
};
const inspectTaskPresentation = async (mode, obs) => {
  const target = pathname();
  obs.presentation = [];
  try {
  for (const locale of ['en', 'zh-CN']) {
    await page.evaluate(value => localStorage.setItem('autobyteus.localization.preference-mode', value), locale);
    await goto(target);
    const copy = taskCopy[locale];
    await waitFor(`${mode} ${locale} ready`, async () => await page.getByTestId('task-page-heading').innerText() === copy[mode]);
    for (const viewport of [{ width: 1512, height: 862 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const surface = page.getByTestId('project-task-page');
      const text = await surface.innerText();
      assert(copy.removed.every(value => !text.includes(value)), 'Redundant task explanations and policy removed');
      assert(!text.includes('projects.ui.') && !text.includes('projects.components.'), 'No raw translation keys');
      assert(await surface.locator('h2, #task-page-help, #task-details-heading, [aria-labelledby="task-details-heading"]').count() === 0, 'No inner heading/help or stale heading reference');
      assert(await surface.locator('header p').count() === 1, 'Only project context remains above title');
      assert(await page.getByTestId('task-project-context').innerText() === 'API E2E project', 'Project context preserved');
      const field = page.getByRole('textbox', { name: copy.label, exact: true });
      assert(await field.getAttribute('id') === 'task-page-description', 'Label names actual textarea');
      assert(await field.getAttribute('placeholder') === copy.placeholder && await field.getAttribute('rows') === '8', 'Concise placeholder, usable editor unchanged');
      assert(text.includes(copy.context) && text.includes(copy.shortcut), 'Context count and shortcut retained');
      if (mode === 'new') assert(text.includes(copy.hint), 'Empty-context attachment hint retained');
      assert(await page.getByTestId('task-attach-files').getAttribute('aria-label') === copy.attach, 'Attachment control named');
      assert(await page.getByTestId('task-page-cancel').innerText() === copy.cancel, 'Cancel retained');
      assert(await page.getByTestId('task-page-save').innerText() === (mode === 'new' ? copy.create : copy.save), 'Save action retained');
      const layout = await surface.evaluate(root => {
        const card = root.querySelector('form > div');
        const label = card.querySelector('label');
        const composer = root.querySelector('[data-testid="task-description-composer"]');
        const rect = e => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, height: b.height }; };
        const c = rect(card), l = rect(label), editor = rect(composer), cs = getComputedStyle(card);
        return { card: c, label: l, composer: editor, padding: parseFloat(cs.paddingTop), border: parseFloat(cs.borderTopWidth), firstChildIsLabel: card.firstElementChild === label,
          labelOffset: l.top - c.top, composerGap: editor.top - l.bottom,
          overflow: root.scrollWidth > root.clientWidth || document.documentElement.scrollWidth > innerWidth,
          fit: { rootScroll: root.scrollWidth, rootClient: root.clientWidth, docScroll: document.documentElement.scrollWidth, innerWidth,
            actions: [...root.querySelectorAll('[data-testid="task-page-save"], [data-testid="task-page-cancel"]')].map(e => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right), Math.round(b.width)]; }),
            widest: [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 4).map(e => `${e.tagName}.${String(e.className?.baseVal ?? e.className).slice(0, 50)}#${e.getAttribute('data-testid') ?? ''}:${Math.round(e.getBoundingClientRect().right)}`) },
          actionsFit: [...root.querySelectorAll('[data-testid="task-page-save"], [data-testid="task-page-cancel"]')].every(e => {const b = e.getBoundingClientRect(); return b.width > 0 && b.left >= 0 && b.right <= innerWidth;}) };
      });
      assert(layout.firstChildIsLabel && Math.abs(layout.labelOffset - layout.padding - layout.border) <= 1, 'Label immediately follows card padding: no replacement heading spacer');
      assert(layout.composerGap >= 0 && layout.composerGap <= 16, 'No heading-only gap before composer');
      assert(!layout.overflow && layout.actionsFit, `Form/actions fit wide and narrow layout (${mode} ${locale} ${viewport.width}: ${JSON.stringify(layout.fit)})`);
      const association = await assertTaskErrorAssociation(false);
      await screenshot(`task-${mode}-${locale}-${viewport.width}`);
      obs.presentation.push({ locale, viewport, layout, association });
    }
  }
  } finally {
    // Restore the normal probe locale and viewport even when a check above failed, so one failure
    // cannot leave later cases in zh-CN at 390 px.
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    await page.setViewportSize({ width: 1512, height: 862 });
    await goto(target); await page.locator('#task-page-description').waitFor();
  }
};
const writeEvidence = () => fs.writeFile(path.join(outputDir, 'result.json'), `${JSON.stringify(evidence, null, 2)}\n`);
const runCase = async (id, title, fn) => {
  const record = evidence.cases[id] = { title, result: 'Not Tested', startedAt: new Date().toISOString(), observations: {} };
  await writeEvidence(); process.stdout.write(`[${id}] ${title}\n`);
  try { await fn(record.observations); record.result = 'Pass'; await screenshot(`${id}-pass`); }
  catch (error) { record.result = 'Fail'; record.error = error.stack || String(error); await screenshot(`${id}-failure`).catch(() => {}); }
  record.finishedAt = new Date().toISOString(); await writeEvidence();
  if (ledger) await fs.appendFile(ledger, '\n' + id + ': ' + record.result + '; ' + title + '; ' + path.join(outputDir, 'result.json') + '\n'); process.stdout.write(`[${id}] ${record.result}${record.error ? ': ' + record.error.split('\n')[0] : ''}\n`);
};
let writerSequence = 0;
const toolWrite = async args => {
  const output = path.join(outputDir, `external-tool-${++writerSequence}.json`);
  await run(process.execPath, [path.join(serverDir, 'tests/fixtures/project-task-tool-writer.mjs'), nodeA.dataRoot, 'create_or_update_task', JSON.stringify(args), output], serverDir, nodeA.env, path.join(outputDir, 'external-tool.log'));
  return JSON.parse(await fs.readFile(output, 'utf8')).task;
};
const blankProject = async name => { await goto('/projects'); await page.getByTestId('projects-new-button').click(); await page.getByTestId('project-name-input').fill(name); await page.getByTestId('project-form-submit').click(); await page.getByTestId('project-detail-name').waitFor(); return (await api.projects(nodeA)).find(p => p.name === name); };
try {
  assert(!ledger || existsSync(ledger), 'Initialize ledger before execution');
  assert(!existsSync(outputDir), `Use a new owned output directory, refusing to delete existing ${outputDir}`);
  await fs.mkdir(outputDir, { recursive: true });
  if (!skipServerBuild) await run('corepack', ['pnpm', '-C', serverDir, 'build'], root, process.env, path.join(outputDir, 'server-build.log'));
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-projects-pages-e2e-'));
  nodeA = await createNode(ownedRoot, 'node-a'); nodeB = await createNode(ownedRoot, 'node-b');
  await startNode(nodeA); await startNode(nodeB);
  const frontendPort = await choosePort(); frontendUrl = `http://127.0.0.1:${frontendPort}`;
  evidence.isolation = { tempRoot: ownedRoot, nodeA: nodeA.url, nodeB: nodeB.url, frontend: frontendUrl };
  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...scrubbedEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: nodeA.url }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend', async () => { if (exited(frontend)) throw new Error('frontend exited'); return fetch(frontendUrl).then(r => r.ok).catch(() => false); }, 240000);
  browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage', ...(voiceInput ? ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] : [])] });
  evidence.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1512, height: 862 }, locale: 'en-US', timezoneId: 'Europe/Berlin' });
  await context.addInitScript(() => { if (!localStorage.getItem('autobyteus.localization.preference-mode')) localStorage.setItem('autobyteus.localization.preference-mode', 'en'); });
  page = await context.newPage(); page.on('pageerror', e => evidence.browserErrors.push(e.message));
  page.on('request', request => {
    if (!request.url().includes('/graphql') || request.method() !== 'POST') return;
    const body = request.postDataJSON();
    if (/mutation\b/.test(body?.query || '')) projectMutations.push(body);
  });
  await goto('/'); await page.locator('nav[aria-label="Primary navigation"]').waitFor(); homePath = pathname();
  let project, task, ws;

  await runCase('PT-E2E-001', 'Fresh node: Projects always available after Agent Orgs, /projects opens; separate-node API isolation (projects-always-on AC-001)', async obs => {
    const labels = await page.locator('nav[aria-label="Primary navigation"]').getByRole('button').allInnerTexts();
    const names = labels.map(label => label.trim()).filter(Boolean); obs.nav = names;
    assert(names.indexOf('Projects') === names.indexOf('Agent Orgs') + 1, 'Projects directly after Agent Orgs on a fresh node', names);
    await goto('/projects'); await page.getByTestId('projects-new-button').waitFor(); assert(pathname() === '/projects', 'No redirect');
    const other = await api.createProject(nodeB, 'Node B only'); obs.otherNode = other.projectId;
    assert((await api.projects(nodeA)).length === 0, 'Node A must not read B Projects');
  });
  await runCase('PT-E2E-002', 'Ordinary New Project validation/focus/Cancel and zero-link save to Tasks', async obs => {
    await page.getByTestId('projects-new-button').click(); await page.getByTestId('project-editor-page').waitFor(); await expectNoOverlay();
    assert(pathname() === '/projects/new', 'New Project ordinary route');
    await page.getByTestId('project-form-submit').click(); await page.getByTestId('project-name-error').waitFor();
    assert(await page.getByTestId('project-name-input').evaluate(e => e === document.activeElement), 'Invalid Name focus');
    await page.getByTestId('project-name-input').fill('discarded'); await page.getByTestId('project-editor-cancel').click();
    assert((await api.projects(nodeA)).length === 0, 'Cancel does not save');
    project = await blankProject('API E2E project'); obs.projectId = project.projectId;
    assert(pathname() === `/projects/${project.projectId}`, 'Zero-link create -> Tasks');
    await page.getByTestId('project-task-columns').waitFor();
    await page.locator('[role="status"]').filter({ hasText: 'Project created.' }).waitFor();
    await waitFor('3 second notice cleared', async () => !(await page.locator('[role="status"]').filter({ hasText: 'Project created.' }).count()), 7000);
    assert(!new URL(page.url()).searchParams.has('notice'), 'Notice marker removed');
  });
  await runCase('PT-E2E-003', 'Picker/manual share one path; exact entries, no registration/mkdir, unavailable link editing', async obs => {
    const existingRoot = path.join(ownedRoot, 'original-workspace'); await fs.mkdir(existingRoot); await fs.writeFile(path.join(existingRoot, 'sentinel.txt'), 'keep original');
    ws = await api.registerWorkspace(nodeA, existingRoot);
    const registryBefore = await readWorkspacesJson(nodeA), requestsFrom = projectMutations.length;
    await page.getByTestId('project-edit-button').click(); await page.getByTestId('project-editor-page').waitFor(); await expectNoOverlay();
    await page.getByTestId('project-add-workspace-inline').click();
    await page.getByTestId('workspace-select-0').selectOption(ws.workspaceRootPath);
    await page.getByTestId('workspace-description-0').fill('existing context');
    await page.getByTestId('workspace-mode-new-0').click();
    assert(await page.getByTestId('workspace-path-0').inputValue() === ws.workspaceRootPath, 'Picker supplies the same manual path');
    await page.getByTestId('workspace-path-0').fill(path.join(ownedRoot, 'not-created'));
    await page.getByTestId('workspace-mode-existing-0').click();
    assert(await page.getByTestId('workspace-select-0').inputValue() === '', 'Unmatched manual value cannot hide behind picker');
    await page.getByTestId('workspace-select-0').selectOption(ws.workspaceRootPath);
    await page.getByTestId('project-add-workspace-inline').click(); await page.getByTestId('workspace-mode-new-1').click();
    const newRoot = path.join(ownedRoot, 'never-mkdir #?雪' + (process.platform === 'win32' ? '' : '\\folder'));
    await page.getByTestId('workspace-path-1').fill(`${newRoot}/../${path.basename(newRoot)}`); await page.getByTestId('workspace-description-1').fill('manual reference');
    await page.getByTestId('project-form-submit').click(); await page.getByTestId('project-task-columns').waitFor();
    const expected = [{workspaceRootPath: ws.workspaceRootPath, description: 'existing context'}, {workspaceRootPath: newRoot, description: 'manual reference'}];
    assert(JSON.stringify(await savedLinks(project.projectId)) === JSON.stringify(expected), 'Disk entries contain exactly path and description');
    assert(await readWorkspacesJson(nodeA) === registryBefore, 'Save does not change registry'); assert(!existsSync(newRoot), 'Save does not create folder');
    assert(!projectMutations.slice(requestsFrom).some(r => /createWorkspace\(/.test(r.query)), 'No browser createWorkspace on Save');
    const saved = await api.project(nodeA, project.projectId);
    assert(saved.workspaces[0].availability === 'AVAILABLE' && saved.workspaces[1].availability === 'UNREGISTERED', 'Availability is registration, not Save admission');
    obs.links = saved.workspaces; obs.disk = expected; obs.manualPath = newRoot;
    await page.getByTestId('project-tab-workspaces').click();
    await workspaceRow(newRoot).getByTestId('project-workspace-edit').click(); await page.getByTestId('project-editor-page').waitFor();
    assert(new URL(page.url()).searchParams.get('workspacePath') === newRoot, 'Special-character route roundtrips exact path');
    await waitFor('path-targeted description focus', () => page.getByTestId('workspace-description-1').evaluate(e => e === document.activeElement));
    await page.getByTestId('workspace-description-1').fill('edited #?雪'); await page.getByTestId('project-form-submit').click();
    await workspaceRow(newRoot).getByText('edited #?雪', {exact: true}).waitFor();
    await page.reload(); await workspaceRow(newRoot).getByText('edited #?雪', {exact: true}).waitFor();
    await workspaceRow(newRoot).getByTestId('project-workspace-unlink').click();
    await waitFor('unlinked row', async () => await workspaceRow(newRoot).count() === 0);
    await page.reload(); await page.getByTestId('project-workspace-list').waitFor();
    assert(await workspaceRow(newRoot).count() === 0, 'Unlink persists after reload');
    assert(!existsSync(newRoot) && await readWorkspacesJson(nodeA) === registryBefore, 'Edit/unlink has no directory or registry side effects');
    // Re-add manual link for the existing restart/cascade cases below, through the real editor.
    await page.getByTestId('project-add-workspace-button').click(); await page.getByTestId('project-editor-page').waitFor();
    await page.getByTestId('workspace-mode-new-1').click(); await page.getByTestId('workspace-path-1').fill(newRoot);
    await page.getByTestId('project-form-submit').click(); await workspaceRow(newRoot).waitFor();
    await page.getByTestId('project-add-workspace-button').click(); await page.getByTestId('project-editor-page').waitFor();
    await page.getByTestId('project-editor-cancel').click(); await waitFor('origin Workspaces', () => new URL(page.url()).searchParams.get('tab') === 'workspaces');
    assert((await api.project(nodeA, project.projectId)).workspaces.length === 2, 'Add/Cancel preserves links');
    await api.removeWorkspace(nodeA, ws.workspaceId); await goto(`/projects/${project.projectId}?tab=workspaces`);
    await workspaceRow(ws.workspaceRootPath).getByText('Unavailable', {exact: true}).waitFor();
    await workspaceRow(ws.workspaceRootPath).getByTestId('project-workspace-edit').click(); await page.getByTestId('project-editor-page').waitFor();
    await page.getByTestId('workspace-description-0').fill('still linked unavailable'); await page.getByTestId('project-form-submit').click();
    await workspaceRow(ws.workspaceRootPath).getByText('still linked unavailable', {exact: true}).waitFor();
    assert((await api.project(nodeA, project.projectId)).workspaces[0].availability === 'UNREGISTERED', 'Saved unavailable link preserved');
    assert(await fs.readFile(path.join(existingRoot, 'sentinel.txt'), 'utf8') === 'keep original', 'Original folder bytes survive');
  });
  await runCase('PT-E2E-004', 'Invalid paths/canonical duplicates and failed transport preserve Project, registry and folders', async obs => {
    await goto(`/projects/${project.projectId}/edit`); await page.getByTestId('project-editor-page').waitFor();
    await page.getByTestId('project-add-workspace-inline').click(); await page.getByTestId('workspace-mode-new-2').click();
    const before = await api.project(nodeA, project.projectId), registryBefore = await readWorkspacesJson(nodeA), requestsFrom = projectMutations.length;
    const bytesBefore = await fs.readFile(path.join(nodeA.dataRoot, 'projects', project.projectId, 'project.json'), 'utf8');
    await page.getByTestId('project-name-input').fill('Invalid must not save');
    const isProjectUpdate = response => response.url().endsWith('/graphql')
      && response.request().method() === 'POST' && response.request().postDataJSON()?.query?.includes('updateProject(');
    obs.rejections = [];
    for (const [invalid, code] of [['relative/folder', 'WORKSPACE_PATH_INVALID'], [`${ws.workspaceRootPath}/../${path.basename(ws.workspaceRootPath)}/`, 'WORKSPACE_ALREADY_LINKED']]) {
      await page.getByTestId('workspace-path-2').fill(invalid);
      const [response] = await Promise.all([page.waitForResponse(isProjectUpdate), page.getByTestId('project-form-submit').click()]);
      const body = await response.json(); assert(body.errors?.[0]?.extensions?.code === code, 'Expected fresh GraphQL rejection ' + code);
      await page.locator('[role="alert"]').first().waitFor(); obs.rejections.push({invalid, code, responseStatus: response.status()});
      assert(await fs.readFile(path.join(nodeA.dataRoot, 'projects', project.projectId, 'project.json'), 'utf8') === bytesBefore, 'Invalid combined patch saves nothing');
    }
    await page.getByTestId('project-name-input').fill(before.name);
    const pathValue = path.join(ownedRoot, 'failed-save-no-registration'); await page.getByTestId('workspace-path-2').fill(pathValue);
    let rejectedSaves = 0;
    const handler = async route => { const body = route.request().postDataJSON(); if (body.query?.includes('updateProject(')) { rejectedSaves++; await route.fulfill({ status: 503, body: 'unavailable' }); } else await route.continue(); };
    await page.route('**/graphql', handler);
    try {
      const [response] = await Promise.all([page.waitForResponse(isProjectUpdate), page.getByTestId('project-form-submit').click()]);
      assert(response.status() === 503 && rejectedSaves === 1, 'Fault-injected transport boundary exercised exactly once');
      await page.locator('[role="alert"]').first().waitFor(); obs.rejectedSaves = rejectedSaves;
    }
    finally { await page.unroute('**/graphql', handler); }
    assert(JSON.stringify(await api.project(nodeA, project.projectId)) === JSON.stringify(before), 'Failed Project save leaves prior Project unchanged');
    assert(await readWorkspacesJson(nodeA) === registryBefore && !existsSync(pathValue), 'Failed Save neither registers nor creates directory');
    assert(!projectMutations.slice(requestsFrom).some(r => /createWorkspace\(/.test(r.query)), 'No browser registration on any Save attempt');
    await page.getByTestId('project-editor-cancel').click(); obs.absentPath = pathValue;
  });
  await runCase('PT-E2E-005', 'Task ordinary composer validation, search-preserving Cancel, typed/file save clears search', async obs => {
    await board(project.projectId); await search().fill('old search'); await page.getByTestId('project-tasks-new-button').click(); await page.getByTestId('task-page-heading').waitFor(); await expectNoOverlay();
    await inspectTaskPresentation('new', obs);
    // Locale inspection reloads; start the transient-search Cancel journey afterward.
    await page.getByTestId('task-page-cancel').click(); await page.getByTestId('project-task-board').waitFor();
    await search().fill('old search'); await page.getByTestId('project-tasks-new-button').click(); await page.locator('#task-page-description').waitFor();
    await page.getByTestId('task-page-save').click(); await page.getByTestId('task-page-description-error').waitFor();
    obs.blankAssociation = await assertTaskErrorAssociation(true); await screenshot('task-new-required');
    await page.locator('#task-page-description').fill('Corrected draft');
    await waitFor('required error clears after typing', async () => await page.getByTestId('task-page-description-error').count() === 0);
    await assertTaskErrorAssociation(false);
    await page.getByTestId('task-page-cancel').click(); await page.getByTestId('project-task-board').waitFor(); assert(await search().inputValue() === 'old search', 'Cancel retains search');
    await page.getByTestId('project-tasks-new-button').click(); await page.locator('#task-page-description').fill('  Browser task\nFull second line  ');
    const uploadPattern = '**/rest/projects/*/task-context-drafts/*/context-files';
    const uploadFailure = async route => {
      if (route.request().method() === 'POST') await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'Controlled context upload failure. Try attaching again.' }) });
      else await route.continue();
    };
    await page.route(uploadPattern, uploadFailure);
    try {
      await page.locator('input[type=file]').setInputFiles({ name: 'failed.txt', mimeType: 'text/plain', buffer: Buffer.from('retry fixture') });
      await page.getByTestId('task-page-save-error').waitFor();
      await waitFor('attachment retry available', async () => !(await page.getByTestId('task-attach-files').isDisabled()));
      assert(await page.getByTestId('task-page-save-error').innerText() === 'Controlled context upload failure. Try attaching again.', 'File failure remains actionable');
      assert(await page.locator('#task-page-description').inputValue() === '  Browser task\nFull second line  ', 'File failure retains typed draft');
      assert((await api.tasks(nodeA, project.projectId)).length === 0, 'Failed upload does not save task');
      obs.uploadFailure = { textRetained: true, savedTasks: 0, retryAvailable: true }; await screenshot('task-new-upload-error');
    } finally { await page.unroute(uploadPattern, uploadFailure); }
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=', 'base64');
    await page.locator('input[type=file]').setInputFiles([{ name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('HTTP browser context') }, { name: 'image.png', mimeType: 'image/png', buffer: png }]);
    await page.getByTestId('task-context-file-list').waitFor(); await waitFor('two files', async () => await page.getByTestId('task-context-file-name').count() === 2);
    assert(await page.getByTestId('task-page-save-error').count() === 0, 'Upload retry clears file failure');
    await page.locator('#task-page-description').press('Control+Enter'); await page.getByTestId('project-task-columns').waitFor(); assert(await search().inputValue() === '', 'Create clears prior search');
    task = (await api.tasks(nodeA, project.projectId)).find(t => t.description.startsWith('Browser task')); assert(task.contextFiles.length === 2 && task.status === 'TODO', 'Saved TODO with real context');
    assert(task.description === 'Browser task\nFull second line', 'Stored multiline text trimmed only');
    await row(task.taskId).waitFor(); assert(await row(task.taskId).getByTestId('project-task-row-text').innerText() === 'Browser task', 'First non-empty line board summary unchanged'); obs.task = task;
  });
  await runCase('PT-E2E-006', 'Concise detail, HTTP download, edit Cancel then save preserves ID/status/context; inline deletion focus/Escape', async obs => {
    await row(task.taskId).click(); await page.getByTestId('task-page-heading').waitFor(); await expectNoOverlay();
    assert(await page.getByTestId('task-page-heading').innerText() === 'Task details', 'Generic heading');
    const surface = page.getByTestId('project-task-page'); const text = await surface.innerText(); assert(!text.includes(task.taskId) && !text.includes(task.createdAt), 'No IDs/dates');
    assert((text.match(/Browser task/g) || []).length === 1, 'Description once');
    assert(await page.getByTestId('task-page-edit').innerText() === 'Edit task', 'Adjacent edit action');
    const downloaded = page.waitForEvent('download'); await page.getByTestId('task-context-file-name').filter({ hasText: 'note.txt' }).click();
    const file = await downloaded; assert(await fs.readFile(await file.path(), 'utf8') === 'HTTP browser context', 'Downloaded real saved bytes');
    await page.getByTestId('task-page-edit').click(); await page.locator('#task-page-description').waitFor();
    await inspectTaskPresentation('edit', obs);
    await page.locator('#task-page-description').fill('   '); await page.getByTestId('task-page-save').click(); await page.getByTestId('task-page-description-error').waitFor();
    obs.blankAssociation = await assertTaskErrorAssociation(true); await screenshot('task-edit-required');
    await page.locator('#task-page-description').fill('discard edit');
    await waitFor('edit required error clears', async () => await page.getByTestId('task-page-description-error').count() === 0); await assertTaskErrorAssociation(false); await page.getByTestId('task-page-cancel').click(); await page.getByTestId('task-page-heading').waitFor();
    assert((await api.tasks(nodeA, project.projectId)).find(t => t.taskId === task.taskId).description === task.description, 'Cancel unchanged');
    await page.getByTestId('task-page-edit').click(); await page.locator('#task-page-description').fill('Browser task revised\nFull second line');
    const saveFailure = async route => { if (route.request().postDataJSON().query?.includes('updateProjectTask(')) await route.fulfill({ status: 503, body: 'task save temporarily unavailable' }); else await route.continue(); };
    await page.route('**/graphql', saveFailure);
    try { await page.getByTestId('task-page-save').click(); await page.getByTestId('task-page-save-error').waitFor(); }
    finally { await page.unroute('**/graphql', saveFailure); }
    assert(await page.locator('#task-page-description').inputValue() === 'Browser task revised\nFull second line', 'Failed save retains editable text');
    assert(await page.getByTestId('task-context-file-name').count() === 2, 'Failed save retains files');
    assert((await api.tasks(nodeA, project.projectId)).find(t => t.taskId === task.taskId).description === task.description, 'Failed write leaves saved content unchanged');
    await screenshot('task-edit-save-error');
    await page.locator('#task-page-description').press('Meta+Enter'); await waitFor('edit detail route', () => pathname() === `/projects/${project.projectId}/tasks/${task.taskId}`);
    const edited = (await api.tasks(nodeA, project.projectId)).find(t => t.taskId === task.taskId); assert(edited.description === 'Browser task revised\nFull second line', 'Same failed draft retries successfully'); assert(edited.createdAt === task.createdAt && edited.status === 'TODO' && edited.contextFiles.length === 2, 'Edit identity/status/context preserved');
    await page.getByTestId('task-page-delete').click(); await page.getByTestId('task-page-delete-cancel').waitFor(); assert(await page.getByTestId('task-page-delete-cancel').evaluate(e => document.activeElement === e), 'Cancel first focus');
    await page.keyboard.press('Escape'); await waitFor('Delete focus restored', async () => page.getByTestId('task-page-delete').evaluate(e => document.activeElement === e)); obs.edited = edited;
    await page.getByTestId('task-back-to-board').click();
  });
  await runCase('PT-E2E-007', 'External native tool commit -> physical non-deduplicated Refresh preserves search/route and moves status', async obs => {
    await search().fill('Browser'); const before = page.url();
    const created = await toolWrite({ project_id: project.projectId, description: 'Browser external' });
    await toolWrite({ task_id: task.taskId, status: 'DONE' });
    assert(await row(created.taskId).count() === 0, 'No invented automatic refresh');
    let physical = 0; const countRequest = req => { if (req.url().endsWith('/graphql') && req.postData()?.includes('projectTasks(')) physical++; }; page.on('request', countRequest);
    const handler = async route => { if (route.request().postDataJSON().query?.includes('projectTasks(')) { await sleep(500); } await route.continue(); };
    await page.route('**/graphql', handler);
    try { await refresh().click(); await waitFor('Refresh disabled while pending', () => refresh().isDisabled()); await row(created.taskId).waitFor(); await waitFor('Refresh settled', async () => !(await refresh().isDisabled())); }
    finally { await page.unroute('**/graphql', handler); page.off('request', countRequest); }
    assert(physical === 1, `Refresh issues one actual query, got ${physical}`); assert(await search().inputValue() === 'Browser' && page.url() === before, 'Search/route preserved');
    assert(await page.getByTestId('project-task-column-DONE').getByTestId(`project-task-row-${task.taskId}`).count() === 1, 'Saved status moved to Done');
    assert((await api.project(nodeA, project.projectId)).taskCount === 2, 'Unfiltered full count'); obs.physicalQueries = physical;
  });
  await runCase('PT-E2E-008', 'Failed Refresh retains prior success and persistent actionable error, then retry; no-match and empty are distinct', async obs => {
    const idsBefore = await page.locator('div[data-testid^=project-task-row-]').evaluateAll(es => es.map(e => e.dataset.testid));
    const handler = async route => { if (route.request().postDataJSON().query?.includes('projectTasks(')) await route.fulfill({ status: 503, body: 'backend temporarily unavailable' }); else await route.continue(); };
    await page.route('**/graphql', handler); try { await refresh().click(); await page.getByTestId('project-tasks-error').waitFor(); } finally { await page.unroute('**/graphql', handler); }
    assert(JSON.stringify(await page.locator('div[data-testid^=project-task-row-]').evaluateAll(es => es.map(e => e.dataset.testid))) === JSON.stringify(idsBefore), 'Last successful rows retained');
    await sleep(3200); assert(await page.getByTestId('project-tasks-error').isVisible(), 'Error does not auto-dismiss');
    await page.getByTestId('project-tasks-error').getByRole('button', { name: 'Try again' }).click(); await waitFor('Error clears after actual success', async () => await page.getByTestId('project-tasks-error').count() === 0);
    await search().fill('no such match'); await page.getByTestId('project-tasks-no-match').waitFor(); await page.getByTestId('project-tasks-clear-search').click(); await row(task.taskId).waitFor(); obs.retainedRows = idsBefore;
  });
  await runCase('PT-E2E-009', 'Continuous divided rows and desktop/narrow container breakpoint, ordinary page wrapping', async obs => {
    const one = await toolWrite({ project_id: project.projectId, description: 'Second contiguous To Do\nQuieter preview' }); await refresh().click(); await row(one.taskId).waitFor();
    const styles = await page.locator('div[data-testid^=project-task-row-]').evaluateAll(es => es.map(e => { const s = getComputedStyle(e); return { radius: s.borderRadius, shadow: s.boxShadow, margin: s.marginBottom, tag: e.tagName }; }));
    assert(styles.every(s => s.radius === '0px' && s.shadow === 'none' && s.margin === '0px' && s.tag === 'DIV'), 'Contiguous rows (each a stretched link), no cards');
    const lanes = async () => page.locator('[data-testid^=project-task-column-]').filter({ has: page.locator('h2') }).evaluateAll(es => es.map(e => { const b = e.getBoundingClientRect(); return { top: b.top, left: b.left, width: b.width }; }));
    const desktop = await lanes(); assert(desktop.length === 3 && desktop.every(b => Math.abs(b.top - desktop[0].top) < 2), 'Three equal columns desktop');
    await page.setViewportSize({ width: 390, height: 844 }); const narrow = await lanes(); assert(narrow.every((b, i) => i === 0 || b.top > narrow[i - 1].top), 'Same groups stack narrow');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No narrow horizontal overflow'); await screenshot('continuous-board-390');
    await page.getByTestId('project-tasks-new-button').click(); await page.getByTestId('task-page-heading').waitFor(); await expectNoOverlay(); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Composer wraps narrow');
    await screenshot('ordinary-task-390'); await page.getByTestId('task-page-cancel').click(); await page.setViewportSize({ width: 1512, height: 862 }); obs.styles = styles;
  });
  await runCase('PT-E2E-010', 'Real backend process restart preserves Tasks, context HTTP bytes and links', async obs => {
    const before = await api.tasks(nodeA, project.projectId); const links = (await api.project(nodeA, project.projectId)).workspaces;
    await stop(nodeA.process); await startNode(nodeA);
    assert(JSON.stringify(await api.tasks(nodeA, project.projectId)) === JSON.stringify(before), 'Tasks unchanged after process restart');
    assert(JSON.stringify((await api.project(nodeA, project.projectId)).workspaces) === JSON.stringify(links), 'Workspace snapshots unchanged'); assert((await api.projects(nodeA)).some(p => p.projectId === project.projectId), 'Projects listed after restart');
    const file = before.find(t => t.taskId === task.taskId).contextFiles.find(f => f.displayName === 'note.txt'); assert(await (await fetch(`${nodeA.url}${file.locator}`)).text() === 'HTTP browser context', 'Saved HTTP bytes after process restart');
    await board(project.projectId); obs.restarted = true;
  });
  await runCase('PT-E2E-011', 'All-Task Project deletion includes Done; Cancel preserves originals, explicit cascade affects only Project', async obs => {
    const saved = await api.project(nodeA, project.projectId); assert(saved.taskCount === 3 && saved.openTaskCount === 2, 'Full/open counts distinct');
    await page.getByTestId('project-delete-button').click(); await page.getByTestId('project-delete-dialog').waitFor();
    await page.getByTestId('project-delete-message').waitFor(); const text = await page.getByTestId('project-delete-dialog').innerText(); assert(text.includes('3 tasks'), `Warning must count all 3 including Done: ${text}`);
    await page.getByTestId('project-delete-cancel').click(); assert((await api.tasks(nodeA, project.projectId)).length === 3, 'Cancel preserves all Tasks');
    const savedFile = (await api.tasks(nodeA, project.projectId)).find(t => t.taskId === task.taskId).contextFiles[0];
    await page.getByTestId('project-delete-button').click(); await page.getByTestId('project-delete-confirm').click(); await waitFor('Index after deletion', () => pathname() === '/projects');
    assert(await api.project(nodeA, project.projectId) === null, 'Project metadata deleted'); assert((await fetch(`${nodeA.url}${savedFile.locator}`)).status === 404, 'Owned saved copy no longer readable');
    assert(await fs.readFile(path.join(ownedRoot, 'original-workspace', 'sentinel.txt'), 'utf8') === 'keep original', 'Original workspace file retained'); assert((await api.projects(nodeB)).length === 1, 'Other node unchanged'); obs.warning = text;
  });
  await runCase('PT-E2E-012', 'Ordinary route read/Refresh ordering: late old Project response cannot populate another Project', async obs => {
    const a = await api.createProject(nodeA, 'Ordering A'), b = await api.createProject(nodeA, 'Ordering B');
    await api.createTask(nodeA, a.projectId, 'A only'); await api.createTask(nodeA, b.projectId, 'B only');
    await board(a.projectId);
    let release, captured, held = false; const gate = new Promise(resolve => { release = resolve; });
    const capturedPromise = new Promise(resolve => { captured = resolve; });
    const handler = async route => {
      const body = route.request().postDataJSON();
      if (!held && body.query?.includes('projectTasks(') && body.variables?.projectId === a.projectId) {
        held = true; const response = await route.fetch(); captured(); await gate; await route.fulfill({ response });
      } else await route.continue();
    };
    await page.route('**/graphql', handler);
    try {
      await refresh().click(); await Promise.race([capturedPromise, sleep(timeoutMs).then(() => { throw new Error('Old real response not captured'); })]);
      await page.getByTestId('project-back-link').click(); await page.getByTestId(`project-card-${b.projectId}`).click();
      await page.getByTestId('project-task-columns').waitFor(); assert((await page.getByTestId('project-task-board').innerText()).includes('B only'), 'New Project loaded before old result');
      release(); await sleep(500); const text = await page.getByTestId('project-task-board').innerText(); assert(text.includes('B only') && !text.includes('A only'), 'Old Project result excluded');
      obs.realOldResponseReleased = true;
    } finally { release(); await page.unroute('**/graphql', handler); }
    await api.deleteProject(nodeA, a.projectId); await api.deleteProject(nodeA, b.projectId);
  });
  await runCase('PT-E2E-013', '120 current Tasks: complete search/counts/no-match across statuses, no truncation or mutation', async obs => {
    const id = (await api.createProject(nodeA, 'Modest complete list')).projectId;
    for (let i = 0; i < 120; i++) await api.createTask(nodeA, id, `volume-${String(i).padStart(3, '0')} ${i % 2 ? 'needle' : 'other'}`);
    await board(id); assert(await page.locator('div[data-testid^=project-task-row-]').count() === 120, 'Complete 120 rows');
    const before = await api.tasks(nodeA, id); await search().fill('needle');
    await waitFor('60 filtered rows', async () => await page.locator('div[data-testid^=project-task-row-]').count() === 60);
    assert(await page.getByTestId('project-task-column-TODO').getByTestId('project-task-column-count').innerText() === '60', 'Filtered count');
    assert((await api.project(nodeA, id)).taskCount === 120, 'Deletion/full count not search-filtered');
    await search().fill('unmatched'); await page.getByTestId('project-tasks-no-match').waitFor(); await page.getByTestId('project-tasks-clear-search').click();
    assert(JSON.stringify(await api.tasks(nodeA, id)) === JSON.stringify(before), 'Search is read-only'); obs.total = 120;
    await api.deleteProject(nodeA, id);
  });
  await runCase('PT-E2E-014', 'Task keyboard create/edit/inline-confirmed delete plus unknown Project/Task recovery', async obs => {
    const p = await blankProject('Keyboard authoring'); await page.getByTestId('project-tasks-new-button').focus(); await page.keyboard.press('Enter');
    await page.getByTestId('task-page-heading').waitFor(); await page.locator('#task-page-description').focus(); await page.keyboard.type('Keyboard task'); await page.keyboard.press('Meta+Enter');
    await page.getByTestId('project-task-columns').waitFor(); const t = (await api.tasks(nodeA, p.projectId))[0];
    await row(t.taskId).getByTestId('project-task-row-link').focus(); await page.keyboard.press('Enter'); await page.getByTestId('task-page-delete').focus(); await page.keyboard.press('Enter');
    await page.getByTestId('task-page-delete-cancel').waitFor(); await page.keyboard.press('Escape'); await page.keyboard.press('Enter');
    await page.getByTestId('task-page-delete-confirm').focus(); await page.keyboard.press('Enter'); await page.getByTestId('project-task-columns').waitFor(); assert((await api.tasks(nodeA, p.projectId)).length === 0, 'Explicit Task delete');
    await goto(`/projects/${p.projectId}/tasks/missing`); await page.getByTestId('task-page-not-found').waitFor(); assert((await page.getByTestId('task-page-not-found').innerText()).includes('Task not found'), 'Unknown Task recovery');
    await goto('/projects/project_missing/tasks/new'); await page.getByTestId('task-page-not-found').waitFor(); assert((await page.getByTestId('task-page-not-found').innerText()).includes('Project not found'), 'Unknown Project recovery');
    await goto(`/projects/${p.projectId}`); await page.getByTestId('project-task-columns').waitFor(); await page.getByTestId('project-tab-tasks').focus(); await page.keyboard.press('End'); await waitFor('Roving End selects Workspaces', async () => await page.getByTestId('project-tab-workspaces').getAttribute('aria-selected') === 'true');
    await page.keyboard.press('Home'); await waitFor('Roving Home selects Tasks', async () => await page.getByTestId('project-tab-tasks').getAttribute('aria-selected') === 'true');
    await api.deleteProject(nodeA, p.projectId); obs.deletedTaskId = t.taskId;
  });
  await runCase('PT-E2E-015', 'Upgraded node with the retired flag stored as false: Projects still shown and opens, no Basics switch, the key is an ordinary deletable Advanced setting (projects-always-on AC-002/003)', async obs => {
    const id = (await api.createProject(nodeA, 'Flag retention')).projectId; const t = await api.createTask(nodeA, id, 'retained');
    const othersBefore = await api.others(nodeA);
    await api.setSetting(nodeA, 'ENABLE_PROJECTS', 'false');
    const stored = (await api.settings(nodeA)).find(s => s.key === 'ENABLE_PROJECTS'); obs.stored = stored;
    assert(stored?.value === 'false' && stored.isDeletable, 'Stored retired key is an ordinary, deletable setting', stored);
    await goto('/'); await page.locator('nav').getByRole('button', { name: 'Projects', exact: true }).click(); await page.getByTestId(`project-card-${id}`).click(); await row(t.taskId).waitFor();
    await page.getByRole('button', { name: 'Settings', exact: true }).click(); await page.getByTestId('settings-nav-server-settings').click(); await page.getByTestId('settings-nav-server-settings-quick').click();
    await page.getByTestId('applications-feature-toggle').waitFor(); // Basics rendered (the shared toggle card uses `<prefix>-feature-toggle`)
    assert(await page.locator('[data-testid^="projects-feature-toggle"]').count() === 0, 'No Projects switch in Basics');
    await page.getByTestId('settings-nav-server-settings-advanced').click(); const value = page.getByTestId('server-setting-value-ENABLE_PROJECTS'); await value.waitFor();
    await page.getByTestId('server-setting-remove-ENABLE_PROJECTS').click(); await waitFor('Retired key deleted', async () => await value.count() === 0);
    assert(!(await api.settings(nodeA)).some(s => s.key === 'ENABLE_PROJECTS'), 'Key gone from the node');
    await page.getByTestId('settings-nav-back').click(); await page.locator('nav').getByRole('button', { name: 'Projects', exact: true }).click(); await page.getByTestId(`project-card-${id}`).waitFor();
    assert(Object.entries(await api.others(nodeA)).every(([key, v]) => v.enabled === othersBefore[key].enabled), 'Other capabilities unchanged'); obs.deleted = true;
    await api.deleteProject(nodeA, id);
  });
  await runCase('PT-E2E-016', 'zh-CN ordinary Project/Task forms/board/detail contain localized controls and no raw Project keys', async obs => {
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    const id = (await api.createProject(nodeA, 'Localization')).projectId; const t = await api.createTask(nodeA, id, 'Localized fixture task');
    await board(id); const check = async () => { const text = await page.locator('[data-testid=project-detail], [data-testid=project-editor-page], [data-testid=project-task-page]').innerText(); assert(!/projects\.[a-z][\w.]+/i.test(text), 'No raw keys'); return text; };
    assert((await check()).includes('待办'), 'Chinese board status');
    await row(t.taskId).click(); await page.getByTestId('task-page-heading').waitFor(); assert(await page.getByTestId('task-page-edit').innerText() !== 'Edit task', 'Chinese detail action'); await check();
    await page.getByTestId('task-page-edit').click(); await page.getByTestId('task-page-save').waitFor(); await check();
    await goto(`/projects/${id}/edit`); await page.getByTestId('project-form-submit').waitFor(); await check();
    obs.rawKeys = 0; await api.deleteProject(nodeA, id);
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  });
  if (voiceInput) {
    await runProjectVoiceCases({ page, context, goto, api, node: nodeA, runCase, waitFor, screenshot });
    assert(evidence.browserErrors.length === 0, 'Unexpected browser page errors: ' + evidence.browserErrors.join('; '));
  }
  evidence.result = Object.values(evidence.cases).some(c => c.result === 'Fail') ? 'Fail' : 'Pass';
} catch (error) { evidence.error = error.stack || String(error); evidence.result = 'Fail'; }
finally {
  if (browser) {
    try { await browser.close(); evidence.cleanup.browser = 'closed'; }
    catch (e) { evidence.cleanup.browser = String(e); evidence.result = 'Fail'; }
  }
  for (const [name, child] of [['frontend', frontend], ['nodeA', nodeA?.process], ['nodeB', nodeB?.process]]) {
    try { evidence.cleanup[name] = await stop(child); } catch (e) { evidence.cleanup[name] = String(e); evidence.result = 'Fail'; }
  }
  for (const [name, url] of [['frontend', frontendUrl], ['nodeA', nodeA?.url], ['nodeB', nodeB?.url]]) {
    if (!url) continue;
    try {
      await new Promise((resolve, reject) => {
        const socket = net.createServer(); socket.once('error', reject);
        socket.listen(Number(new URL(url).port), '127.0.0.1', () => socket.close(resolve));
      });
      evidence.cleanup[`${name}PortReleased`] = true;
    } catch (error) { evidence.cleanup[`${name}PortReleased`] = String(error); evidence.result = 'Fail'; }
  }
  if (ownedRoot) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.tempRootRemoved = !existsSync(ownedRoot); }
  evidence.finishedAt = new Date().toISOString(); if (existsSync(outputDir)) await writeEvidence();
  process.stdout.write(JSON.stringify({ result: evidence.result, error: evidence.error, cases: Object.fromEntries(Object.entries(evidence.cases).map(([k, v]) => [k, v.result])), cleanup: evidence.cleanup }) + '\n');
}
if (evidence.result !== 'Pass') process.exitCode = 1;

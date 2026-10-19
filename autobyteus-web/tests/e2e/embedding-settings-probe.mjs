#!/usr/bin/env node
// Isolated real-stack run of Settings → Server Settings → Embedding: one disposable backend node on a fresh data
// root (real model downloads from huggingface.co, real indexing) and a Nuxt frontend bound to it, driven in headless
// Chromium. Every case records Pass/Fail in <output-dir>/result.json, with screenshots for comparison with the
// approved visual references (VIS-*). Owned processes and the temp root are always cleaned up.
//
// Downloads: MongoDB LEAF-IR (≈ 24 MB) is downloaded, cancelled and downloaded again; nothing else is downloaded.
// Usage: node tests/e2e/embedding-settings-probe.mjs [--skip-server-build] [--output-dir=...]
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

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.dirname(webDir);
const serverDir = path.join(root, 'autobyteus-server-ts');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/embedding-settings'));
const skipServerBuild = process.argv.includes('--skip-server-build');
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const timeoutMs = Number(arg('timeout-ms', '30000'));
const DOWNLOAD_MS = 300000;
const GRANITE = 'granite-embedding-small-english-r2';
const LEAF = 'mdbr-leaf-ir';
const GEMMA = 'embeddinggemma-2';
const evidence = {
  startedAt: new Date().toISOString(), result: 'Fail', platform: `${process.platform}-${process.arch}`,
  node: process.version, browserExecutable: executablePath || 'playwright-default', cases: {}, browserErrors: [], cleanup: {}, error: null,
};

// ---------------------------------------------------------------- process helpers
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (description, fn, ms = timeoutMs) => {
  const deadline = Date.now() + ms;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await fn()) return; } catch (error) { lastError = error; }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};
const choosePort = () => new Promise((resolve, reject) => {
  const socket = net.createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => { const { port } = socket.address(); socket.close(() => resolve(port)); });
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
  for (const signal of ['SIGTERM', 'SIGKILL']) {
    if (exited(child)) break;
    if (process.platform !== 'win32') process.kill(-child.pid, signal); else child.kill(signal);
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(8000)]);
  }
  assert(exited(child), `Owned child ${child.pid} did not exit`);
  return `terminated:${child.pid}`;
};
// A fresh node inherits neither feature flags nor AutoByteus settings from the developer's shell.
const scrubbedEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('ENABLE_') && !key.startsWith('AUTOBYTEUS_')));

// ---------------------------------------------------------------- backend node
const createNode = async ownedRoot => {
  const dataRoot = path.join(ownedRoot, 'node');
  const databasePath = path.join(dataRoot, 'db', 'node.db');
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  for (const folder of ['logs', 'memory', 'temp_workspace', 'home']) await fs.mkdir(path.join(dataRoot, folder), { recursive: true });
  const port = await choosePort();
  const url = `http://127.0.0.1:${port}`;
  const databaseUrl = pathToFileURL(databasePath).href;
  const env = {
    ...scrubbedEnv(), HOME: path.join(dataRoot, 'home'), AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: '', AUTOBYTEUS_SKILLS_PATHS: '',
    APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl, AUTOBYTEUS_SERVER_HOST: url, AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
  };
  await fs.writeFile(path.join(dataRoot, '.env'), ['APP_ENV=development', 'DB_TYPE=sqlite', `DATABASE_URL=${databaseUrl}`, `AUTOBYTEUS_SERVER_HOST=${url}`].join('\n') + '\n');
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], root, env, path.join(outputDir, 'migrate.log'));
  return { dataRoot, port, url, env, process: null };
};
const startNode = async node => {
  node.process = start(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(node.port), '--data-dir', node.dataRoot],
    serverDir, node.env, path.join(outputDir, 'backend.log'));
  await waitFor('backend health', async () => {
    if (exited(node.process)) throw new Error(`backend exited ${node.process.exitCode}/${node.process.signalCode}`);
    return fetch(`${node.url}/rest/health`).then(response => response.ok).catch(() => false);
  }, 120000);
};
const gql = async (node, query, variables = {}) => {
  const response = await fetch(`${node.url}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(`GraphQL failed: ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
};
const createProject = async (node, name) => (await gql(node, 'mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}', { i: { name } })).createProject.projectId;
const createTask = (node, projectId, description) => gql(node, 'mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}', { i: { projectId, description } });
const modelsDir = node => path.join(node.dataRoot, 'embeddings', 'models');
const present = file => fs.stat(file).then(() => true, () => false);

// ---------------------------------------------------------------- browser helpers
let page;
const shot = async name => { await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: false }); };
const text = async testId => (await page.locator(`[data-testid="${testId}"]`).first().innerText()).replace(/\s+/g, ' ').trim();
const rowState = testId => page.locator(`[data-testid="${testId}"]`).first().getAttribute('data-state');
const waitState = (testId, expected, ms = timeoutMs) => waitFor(`${testId} ${expected}`, async () => (await rowState(testId)) === expected, ms);
const click = testId => page.locator(`[data-testid="${testId}"]`).first().click();
const statusMutations = [];
const kase = async (id, title, body) => {
  const started = Date.now();
  try {
    await body();
    evidence.cases[id] = { title, result: 'Pass', ms: Date.now() - started };
  } catch (error) {
    evidence.cases[id] = { title, result: 'Fail', ms: Date.now() - started, error: error.message };
    await shot(`${id}-failure`).catch(() => undefined);
  }
  console.log(`${evidence.cases[id].result} ${id} ${title}${evidence.cases[id].error ? `: ${evidence.cases[id].error}` : ''}`);
};

let ownedRoot, node, frontend, browser;
try {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  if (!skipServerBuild) await run('corepack', ['pnpm', '-C', serverDir, 'build'], root, process.env, path.join(outputDir, 'server-build.log'));
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-embedding-settings-e2e-'));
  node = await createNode(ownedRoot);
  await startNode(node);
  const frontendPort = await choosePort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  evidence.isolation = { tempRoot: ownedRoot, backend: node.url, frontend: frontendUrl };
  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...scrubbedEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: node.url }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend', async () => { if (exited(frontend)) throw new Error('frontend exited'); return fetch(frontendUrl).then(r => r.ok).catch(() => false); }, 240000);
  browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage'] });
  evidence.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1180 }, locale: 'en-US', timezoneId: 'Europe/Berlin' });
  await context.addInitScript(() => { if (!localStorage.getItem('autobyteus.localization.preference-mode')) localStorage.setItem('autobyteus.localization.preference-mode', 'en'); });
  page = await context.newPage();
  page.on('pageerror', e => evidence.browserErrors.push(e.message));
  page.on('request', request => {
    if (!request.url().includes('/graphql') || request.method() !== 'POST') return;
    const body = request.postDataJSON();
    if (/mutation\b/.test(body?.query || '')) statusMutations.push(body.operationName ?? body.query.slice(0, 60));
  });
  const embeddingUrl = `${frontendUrl}/settings?section=server-settings&mode=embedding`;
  const open = async () => {
    await page.goto(embeddingUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="embedding-models-card"]').waitFor({ timeout: 120000 });
  };

  const billing = await createProject(node, 'Billing');
  const docs = await createProject(node, 'Docs');
  const archive = await createProject(node, 'Archive');
  for (const description of ['Invoice PDF export fails for long names', 'Show token usage and cost per conversation', 'Refund flow for annual plans']) await createTask(node, billing, description);
  await createTask(node, docs, 'Write the Docker node start guide');

  await kase('EMB-001', 'Fresh data root: Active · Not downloaded, Projects Not indexed, opening starts nothing (AC-011, REQ-005)', async () => {
    await open();
    assert(await page.locator('[data-testid="settings-nav-server-settings-embedding"]').innerText() === 'Embedding', 'sub-navigation entry');
    assert(await rowState(`embedding-model-${GRANITE}`) === 'active-not_downloaded', `active row ${await rowState(`embedding-model-${GRANITE}`)}`);
    assert((await text(`embedding-model-${GRANITE}-status`)).includes('Not downloaded'), 'active status copy');
    assert(await text(`embedding-project-${billing}-status`) === 'Not indexed', 'billing not indexed');
    assert(await text(`embedding-project-${archive}-status`) === 'Ready · 0 Tasks', 'empty project ready (DEC-010)');
    assert(await text('embedding-disk-total') === 'On disk: 0 MB', 'disk total');
    await shot('VIS-001-fresh-default');
    await sleep(2500);
    assert(!(await present(modelsDir(node))), 'opening created the models folder');
    assert(statusMutations.length === 0, `opening sent mutations: ${statusMutations.join(', ')}`);
  });

  await kase('EMB-002', 'Download ahead with progress, Cancel deletes it, Download again completes (AC-002)', async () => {
    await click(`embedding-model-${LEAF}-download`);
    await waitState(`embedding-model-${LEAF}`, 'downloading');
    await page.locator(`[data-testid="embedding-model-${LEAF}-progress"]`).waitFor();
    await shot('VIS-002-download-ahead-progress');
    await click(`embedding-model-${LEAF}-cancel`);
    await waitState(`embedding-model-${LEAF}`, 'not_downloaded');
    await waitFor('cancelled folder removed', async () => !(await present(path.join(modelsDir(node), LEAF))));
    await click(`embedding-model-${LEAF}-download`);
    await waitState(`embedding-model-${LEAF}`, 'downloaded', DOWNLOAD_MS);
    assert(await text('embedding-announce') === 'MongoDB LEAF-IR downloaded.', `announcement ${await text('embedding-announce')}`);
    assert(await rowState(`embedding-model-${GRANITE}`) === 'active-not_downloaded', 'download ahead did not touch the active model');
  });

  await kase('EMB-003', 'Switch dialog for a not-downloaded model; Cancel changes nothing (REQ-004)', async () => {
    await click(`embedding-model-${GEMMA}-use`);
    await page.locator('[data-testid="embedding-switch-dialog"]').waitFor();
    assert(await text('embedding-switch-cost') === 'Download: 346 MB, not downloaded yet', `cost ${await text('embedding-switch-cost')}`);
    await shot('VIS-004-switch-dialog-not-downloaded');
    await page.keyboard.press('Escape');
    await page.locator('[data-testid="embedding-switch-dialog"]').waitFor({ state: 'detached' });
    assert(await rowState(`embedding-model-${GRANITE}`) === 'active-not_downloaded', 'cancel changed the active model');
  });

  await kase('EMB-004', 'Use a downloaded model: setting written, Active Ready, Projects Not indexed (AC-004)', async () => {
    await click(`embedding-model-${LEAF}-use`);
    assert(await text('embedding-switch-cost') === 'Download: Already downloaded', 'downloaded cost line');
    await shot('VIS-005-switch-dialog-downloaded');
    await click('embedding-switch-confirm');
    await waitState(`embedding-model-${LEAF}`, 'active-ready', DOWNLOAD_MS);
    assert(await text('embedding-projects-subtitle') === 'Using MongoDB LEAF-IR.', 'subtitle names the new model');
    assert((await fs.readFile(path.join(node.dataRoot, '.env'), 'utf8')).includes(`AUTOBYTEUS_EMBEDDING_MODEL=${LEAF}`), 'setting not written');
    assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === `embedding-model-${LEAF}`, 'focus on the new Active row');
    await shot('VIS-006-after-switch-not-indexed');
  });

  await kase('EMB-005', 'Index all Projects: progress, then Ready with Task counts (REQ-006)', async () => {
    await click('embedding-index-all');
    await waitFor('billing ready', async () => (await text(`embedding-project-${billing}-status`)) === 'Ready · 3 Tasks', DOWNLOAD_MS);
    await waitFor('docs ready', async () => (await text(`embedding-project-${docs}-status`)) === 'Ready · 1 Task');
    assert(await page.locator('[data-testid="embedding-index-all"]').isDisabled(), 'Index all disabled when nothing needs indexing');
  });

  await kase('EMB-006', 'Needs update after a new Task, Index now, and Rebuild with inline confirmation (REQ-005, REQ-006)', async () => {
    await createTask(node, billing, 'Dunning emails for failed card payments');
    await waitFor('needs update', async () => (await text(`embedding-project-${billing}-status`)) === 'Needs update · 1 changed', 15000);
    await shot('VIS-010-needs-update');
    await click(`embedding-project-${billing}-index`);
    await waitFor('billing ready again', async () => (await text(`embedding-project-${billing}-status`)) === 'Ready · 4 Tasks', 60000);
    await click(`embedding-project-${docs}-rebuild`);
    await page.locator(`[data-testid="embedding-project-${docs}-rebuild-confirmation"]`).waitFor();
    await shot('VIS-009-rebuild-confirmation');
    await click(`embedding-project-${docs}-rebuild-confirm`);
    await waitFor('docs rebuilt', async () => (await text(`embedding-project-${docs}-status`)) === 'Ready · 1 Task', 60000);
  });

  await kase('EMB-007', 'Leave and return: current state shown; restart: Active · Ready with files on disk (REQ-007, AC-013)', async () => {
    await page.goto(`${frontendUrl}/settings?section=server-settings&mode=quick`, { waitUntil: 'domcontentloaded' });
    await open();
    assert(await rowState(`embedding-model-${LEAF}`) === 'active-ready', 'state after return');
    await stop(node.process);
    await startNode(node);
    await open();
    assert(await rowState(`embedding-model-${LEAF}`) === 'active-ready', `after restart ${await rowState(`embedding-model-${LEAF}`)}`);
    assert(await text(`embedding-project-${billing}-status`) === 'Ready · 4 Tasks', 'index state survives restart');
    await shot('VIS-001-after-restart-ready');
  });

  await kase('EMB-008', 'zh-CN copy and narrow layout render', async () => {
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    await open();
    assert(await page.locator('[data-testid="settings-nav-server-settings-embedding"]').innerText() === '嵌入', 'zh-CN nav');
    assert((await text('embedding-models-footnote')).includes('Hugging Face'), 'zh-CN source line');
    await shot('VIS-017-zh-CN');
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    await page.setViewportSize({ width: 390, height: 1100 });
    await open();
    await shot('VIS-020-narrow');
    await click(`embedding-model-${GEMMA}-use`);
    await shot('VIS-021-narrow-switch-dialog');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1440, height: 1180 });
  });

  evidence.result = Object.values(evidence.cases).every(entry => entry.result === 'Pass') && !evidence.browserErrors.length ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = error.stack || error.message;
  console.error(error);
} finally {
  evidence.cleanup.browser = browser ? await browser.close().then(() => 'closed', e => e.message) : 'not-started';
  evidence.cleanup.frontend = await stop(frontend).catch(e => e.message);
  evidence.cleanup.backend = await stop(node?.process).catch(e => e.message);
  if (ownedRoot) evidence.cleanup.tempRoot = await fs.rm(ownedRoot, { recursive: true, force: true }).then(() => 'removed', e => e.message);
  evidence.finishedAt = new Date().toISOString();
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(evidence, null, 2));
  console.log(`Result: ${evidence.result} (${outputDir}/result.json)`);
  process.exitCode = evidence.result === 'Pass' ? 0 : 1;
}

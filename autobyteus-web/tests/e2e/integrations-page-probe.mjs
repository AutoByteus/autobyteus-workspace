#!/usr/bin/env node
// Isolated real-stack run of the Integrations page (autobyteus-337) against the approved r2 design: one disposable
// backend node on a fresh data root and a Nuxt frontend bound to it, driven in headless Chromium. An integration folder
// (a `github` integration with an icon and one missing tool) is imported from disk. Every case records Pass/Fail in
// <output-dir>/result.json, with screenshots. Owned processes and the temp root are always cleaned up.
//
// Network: INT-006 sends a dummy token, so the node asks api.github.com once and GitHub answers 401. No real token is
// used. INT-007 renders the connected state from an intercepted response (the real connect is covered by the gated
// live server test `github-credential-proxy-live.e2e.test.ts`). GitHub-repository rows (Update) are covered by the
// component specs and the live test.
// Usage: node tests/e2e/integrations-page-probe.mjs [--skip-server-build] [--output-dir=...]
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
import { prepareOutputDir, probeOutputDir } from './fixtures/probe-output-dir.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.dirname(webDir);
const serverDir = path.join(root, 'autobyteus-server-ts');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
// A fresh per-run folder unless --output-dir names one; a non-empty folder is refused, never cleared.
const outputDir = prepareOutputDir(probeOutputDir(webDir, 'integrations-page', arg('output-dir')));
const skipServerBuild = process.argv.includes('--skip-server-build');
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const timeoutMs = Number(arg('timeout-ms', '30000'));
const DUMMY_TOKEN = 'test-dummy-ui-token-0000';
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#24292f"/></svg>';
const evidence = {
  startedAt: new Date().toISOString(), result: 'Fail', platform: `${process.platform}-${process.arch}`,
  node: process.version, browserExecutable: executablePath || 'playwright-default', cases: {}, browserErrors: [], cleanup: {}, error: null,
};

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
const writeIntegrationFolder = async (root) => {
  await fs.mkdir(path.join(root, 'github'), { recursive: true });
  await fs.writeFile(path.join(root, 'github', 'integration.json'), JSON.stringify({
    name: 'GitHub', description: 'Work with GitHub issues, pull requests and Projects boards. Your token stays in AutoByteus.',
    token: { help: 'Create a fine-grained token at https://github.com/settings/personal-access-tokens/new, limited to the repositories your agents work on.' },
    prerequisites: ['curl', 'git', 'definitely-missing-tool-337'],
  }));
  await fs.writeFile(path.join(root, 'github', 'SKILL.md'), '---\nname: github-integration\ndescription: Work with GitHub through AutoByteus.\n---\n\nBody.\n');
  await fs.writeFile(path.join(root, 'github', 'icon.svg'), SVG);
  await fs.mkdir(path.join(root, 'notes'), { recursive: true });
  await fs.writeFile(path.join(root, 'notes', 'SKILL.md'), '---\nname: probe-notes-337\ndescription: Notes.\n---\n\nBody.\n');
};
const createAgent = async (node, name) => (await gql(node,
  'mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
  { i: { name, description: `${name} for the Integrations page probe.`, instructions: 'Probe agent.' } })).createAgentDefinition.id;

let page;
// Icons load from Iconify and modals fade in: let the page settle before each capture.
const shot = async name => {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: false });
};
const text = async testId => (await page.locator(`[data-testid="${testId}"]`).first().innerText()).replace(/\s+/g, ' ').trim();
const visible = testId => page.locator(`[data-testid="${testId}"]`).first().isVisible();
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
  if (!skipServerBuild) await run('corepack', ['pnpm', '-C', serverDir, 'build'], root, process.env, path.join(outputDir, 'server-build.log'));
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-integrations-page-e2e-')));
  node = await createNode(ownedRoot);
  await startNode(node);
  await createAgent(node, 'Ada coder');
  const integrationFolder = path.join(ownedRoot, 'my-integrations');
  const plainFolder = path.join(ownedRoot, 'plain-skills');
  await writeIntegrationFolder(integrationFolder);
  await fs.mkdir(path.join(plainFolder, 'only'), { recursive: true });
  await fs.writeFile(path.join(plainFolder, 'only', 'SKILL.md'), '---\nname: probe-only-337\ndescription: Only.\n---\n\nBody.\n');
  const frontendPort = await choosePort();
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  evidence.isolation = { tempRoot: ownedRoot, backend: node.url, frontend: frontendUrl };
  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...scrubbedEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: node.url }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend', async () => { if (exited(frontend)) throw new Error('frontend exited'); return fetch(frontendUrl).then(r => r.ok).catch(() => false); }, 240000);
  browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage'] });
  evidence.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'Europe/Berlin' });
  await context.addInitScript(() => { if (!localStorage.getItem('autobyteus.localization.preference-mode')) localStorage.setItem('autobyteus.localization.preference-mode', 'en'); });
  page = await context.newPage();
  page.on('pageerror', e => evidence.browserErrors.push(e.message));
  const openPage = async (hash = '') => {
    await page.goto(`${frontendUrl}/integrations${hash}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="integrations-page"]').waitFor({ state: 'visible', timeout: 120000 });
    await waitFor('cards read', async () => (await page.locator('[data-testid="integrations-loading"]').count()) === 0);
  };
  const openImport = async () => {
    const button = (await page.locator('[data-testid="integrations-import"]').count()) ? 'integrations-import' : 'integrations-empty-import';
    await page.locator(`[data-testid="${button}"]`).click();
    await page.locator('[data-testid="integration-import-dialog"]').waitFor();
  };
  const importText = async (value) => {
    await page.locator('[data-testid="integration-import-input"]').fill(value);
    await page.locator('[data-testid="integration-import-submit"]').click();
  };

  await kase('INT-001', 'Empty page invites Import; Integrations is last in the menu, after Nodes', async () => {
    await openPage();
    assert(await visible('integrations-empty'), 'empty state');
    assert((await text('integrations-empty')).includes('No integrations yet'), 'empty title');
    assert(await page.locator('[data-testid="integrations-toolbar"]').count() === 0, 'no toolbar');
    const nav = await page.locator('nav button, aside button').allInnerTexts();
    const labels = nav.map(label => label.trim()).filter(Boolean);
    assert(labels.indexOf('Integrations') > labels.indexOf('Nodes') && labels.indexOf('Nodes') >= 0, `menu order ${labels.join('|')}`);
    await shot('INT-001-empty-page');
  });

  await kase('INT-002', 'Import dialog: field focused, hint follows the input (repository trust text, folder text)', async () => {
    await openImport();
    assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'integration-import-input', 'field focused');
    assert(await page.locator('[data-testid="integration-import-submit"]').isDisabled(), 'Import disabled while empty');
    await shot('INT-002a-import-empty');
    await page.locator('[data-testid="integration-import-input"]').fill('https://github.com/owner/repository');
    assert((await text('integration-import-hint')).startsWith('Import only repositories you trust.'), 'trust hint');
    await shot('INT-002b-import-link-trust-hint');
    await page.locator('[data-testid="integration-import-input"]').fill('/Users/alex/my-integrations');
    assert((await text('integration-import-hint')).startsWith('The folder stays where it is; nothing is copied.'), 'folder hint');
    await shot('INT-002c-import-folder-hint');
  });

  await kase('INT-003', 'Import refusals: not a link or path, folder not found, no integrations in the folder', async () => {
    await importText('relative/folder');
    await page.locator('[data-testid="integration-import-error"]').waitFor();
    assert((await text('integration-import-error')).startsWith('Enter a GitHub repository link'), 'not a link or path');
    await shot('INT-003a-error-not-a-link-or-path');
    await importText(path.join(ownedRoot, 'missing'));
    await waitFor('dir error', async () => (await text('integration-import-error')).startsWith('Directory not found:'));
    await shot('INT-003b-error-folder-not-found');
    await importText(plainFolder);
    await waitFor('no integrations', async () => (await text('integration-import-error')) === 'No integrations in this folder. Nothing was imported.');
    assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'integration-import-input', 'field kept focused');
    await shot('INT-003c-error-no-integrations-folder');
  });

  await kase('INT-004', 'Import a folder: the dialog closes, the notice names it, the card needs a token, icon and missing tool shown', async () => {
    await importText(integrationFolder);
    await page.locator('[data-testid="integrations-notice"]').waitFor({ timeout: 60000 });
    assert(await page.locator('[data-testid="integration-import-dialog"]').count() === 0, 'dialog closed');
    assert((await text('integrations-notice')) === 'Imported GitHub from my-integrations.', `notice ${await text('integrations-notice')}`);
    assert((await text('integration-status-github')) === 'Installed, needs a token', 'chip');
    assert((await page.locator('[data-testid="integration-icon-github"] img').getAttribute('src')).startsWith('data:image/svg+xml;base64,'), 'icon img');
    assert((await text('integration-tools-missing-github')).includes('definitely-missing-tool-337 not found on this node.'), 'missing tool line');
    assert(await visible('integrations-toolbar'), 'toolbar');
    await shot('INT-004-imported-card-needs-a-token-with-notice');
  });

  await kase('INT-005', 'Re-importing the folder says it is already imported', async () => {
    await openImport();
    await importText(integrationFolder);
    await waitFor('already', async () => (await text('integration-import-error')) === 'This folder is already imported. Use Manage sources to see it.');
    await shot('INT-005-error-already-imported');
    await page.keyboard.press('Escape');
    await waitFor('dialog closed', async () => (await page.locator('[data-testid="integration-import-dialog"]').count()) === 0);
    assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'integrations-import', 'focus back on Import');
  });

  await kase('INT-006', 'Connect step: imported from the folder, help link, tools; a token GitHub rejects says so', async () => {
    await page.locator('[data-testid="integration-open-github"]').click();
    await page.locator('[data-testid="integration-dialog-github"]').waitFor();
    assert((await text('integration-source-github')) === `Imported from ${integrationFolder}`, 'imported from');
    const links = await page.locator('[data-testid="integration-help-github"] a').evaluateAll(as => as.map(a => a.getAttribute('href')));
    assert(JSON.stringify(links) === JSON.stringify(['https://github.com/settings/personal-access-tokens/new']), `links ${links}`);
    assert((await text('integration-tool-github-definitely-missing-tool-337')).includes('not found'), 'tool pill');
    await shot('INT-006a-dialog-connect-step');
    await page.locator('[data-testid="integration-token-input-github"]').fill(DUMMY_TOKEN);
    await page.locator('[data-testid="integration-connect-github"]').click();
    await page.locator('[data-testid="integration-message-github"]').waitFor({ timeout: 60000 });
    assert((await text('integration-message-github')) === 'GitHub rejected the token.', `message ${await text('integration-message-github')}`);
    assert(!(await page.content()).includes(DUMMY_TOKEN) || (await page.locator('[data-testid="integration-token-input-github"]').inputValue()) === DUMMY_TOKEN, 'token only in its field');
    await shot('INT-006b-dialog-token-rejected');
    await page.locator('[data-testid="integration-dialog-close"]').click();
    assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'integration-open-github', 'focus back on Connect');
  });

  await kase('INT-007', 'Connected card and dialog render login, access line, Test / Replace token / Remove (intercepted)', async () => {
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON();
      if (body?.operationName !== 'GetIntegrations') return route.continue();
      const response = await route.fetch();
      const json = await response.json();
      json.data.integrations = json.data.integrations.map(item => ({ ...item, state: 'CONNECTED', login: 'octo-probe', connectedAt: '2026-11-01T08:00:00.000Z' }));
      return route.fulfill({ response, json });
    });
    await openPage();
    assert((await text('integration-status-github')) === 'Connected as @octo-probe', 'chip');
    assert((await text('integration-access-hint-github')) === 'Add github-integration to an agent to give it access.', 'access line');
    await shot('INT-007a-connected-card');
    await page.locator('[data-testid="integration-open-github"]').click();
    await page.locator('[data-testid="integration-test-github"]').waitFor();
    assert(await visible('integration-replace-github') && await visible('integration-remove-github') && await visible('integration-open-agents-github'), 'actions');
    await shot('INT-007b-dialog-connected');
    await page.keyboard.press('Escape');
    await page.unroute('**/graphql');
  });

  await kase('INT-008', 'The Skills page labels the integration skill; the label opens its card, focused', async () => {
    await page.goto(`${frontendUrl}/skills`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="skill-integration-label"]').waitFor({ timeout: 120000 });
    assert((await page.locator('[data-testid="skill-integration-label"]').getAttribute('aria-label')) === 'Open the GitHub card on the Integrations page', 'label name');
    assert(await page.locator('[data-testid="skill-integration-label"]').count() === 1, 'one label (plain skill unlabelled)');
    await shot('INT-008a-skills-page-integration-label');
    await page.locator('[data-testid="skill-integration-label"]').click();
    await waitFor('card focused', async () => (await page.evaluate(() => document.activeElement?.id)) === 'integration-github', 30000);
    await shot('INT-008b-card-focused-from-skills-label');
  });

  await kase('INT-009', 'Manage sources: the folder row has no Update; Remove says the files stay; the last removal leaves the notice', async () => {
    await page.locator('[data-testid="integrations-manage-sources"]').click();
    await page.locator('[data-testid="integration-sources-dialog"]').waitFor();
    const sourceId = `local:${integrationFolder}`;
    await page.locator(`[data-testid="integration-source-status-${sourceId}"]`).waitFor();
    assert((await text(`integration-source-status-${sourceId}`)) === 'Local folder', 'local folder');
    assert(await page.locator(`[data-testid="integration-source-update-${sourceId}"]`).count() === 0, 'no Update');
    await shot('INT-009a-manage-sources-folder');
    await page.locator(`[data-testid="integration-source-remove-${sourceId}"]`).click();
    await page.locator('[data-testid="integration-source-remove-confirm"]').waitFor();
    assert((await text('integration-source-remove-confirm')).includes('The files on disk are not deleted.'), 'folder remove text');
    await shot('INT-009b-remove-confirmation-folder');
    await page.getByRole('button', { name: 'Remove', exact: true }).last().click();
    await page.locator('[data-testid="integrations-notice"]').waitFor({ timeout: 60000 });
    assert((await text('integrations-notice')) === 'Removed my-integrations.', `notice ${await text('integrations-notice')}`);
    assert(await visible('integrations-empty'), 'empty again');
    assert(existsSync(path.join(integrationFolder, 'github', 'integration.json')), 'files stay');
    await shot('INT-009c-removed-last-source-notice');
  });

  await kase('INT-010', 'Skills → Manage Skill Sources lists an imported source; removing it there removes its card', async () => {
    await gql(node, 'mutation($l:String!){importIntegrations(location:$l){id}}', { l: integrationFolder });
    await page.goto(`${frontendUrl}/skills`, { waitUntil: 'domcontentloaded' });
    await page.getByTitle('Manage skill sources').first().click();
    const row = page.locator(`[data-testid="skill-source-row-local:${integrationFolder}"]`);
    await row.waitFor({ timeout: 60000 });
    await shot('INT-010a-skills-sources-lists-imported-source');
    await row.getByRole('button', { name: /^Remove/ }).click();
    await page.getByRole('button', { name: /^Remove/ }).last().click();
    await waitFor('source removed', async () => (await row.count()) === 0, 60000);
    await openPage();
    assert(await visible('integrations-empty'), 'card gone');
  });

  await kase('INT-011', 'Server Settings → Basics has no GitHub card', async () => {
    await page.goto(`${frontendUrl}/settings?section=server-settings&mode=quick`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Web Search Configuration').first().waitFor({ timeout: 120000 });
    assert(!(await page.locator('body').innerText()).includes('GitHub token'), 'no GitHub card');
    assert(await page.locator('[data-testid="github-integration-card"]').count() === 0, 'no card element');
    await shot('INT-011-basics-without-github-card');
  });

  await kase('INT-012', 'Narrow 390 px and zh-CN render (empty and with a card)', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    await openPage();
    assert(await visible('integrations-empty'), 'empty narrow');
    await shot('INT-012a-empty-narrow-zh-CN');
    await gql(node, 'mutation($l:String!){importIntegrations(location:$l){id}}', { l: integrationFolder });
    await openPage();
    assert((await text('integration-status-github')).length > 0, 'chip zh');
    const box = await page.locator('[data-testid="integration-card-github"]').boundingBox();
    assert(box && box.width <= 390, 'card fits');
    await shot('INT-012b-card-narrow-zh-CN');
    await page.locator('[data-testid="integrations-import"]').click();
    await page.locator('[data-testid="integration-import-input"]').fill('relative');
    await page.locator('[data-testid="integration-import-submit"]').click();
    await page.locator('[data-testid="integration-import-error"]').waitFor();
    await shot('INT-012c-import-error-narrow-zh-CN');
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  evidence.result = Object.values(evidence.cases).every(entry => entry.result === 'Pass') && evidence.browserErrors.length === 0 ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = error.message;
  console.error(error);
} finally {
  evidence.cleanup.browser = browser ? await browser.close().then(() => 'closed', e => e.message) : 'not-started';
  evidence.cleanup.frontend = await stop(frontend).catch(e => e.message);
  evidence.cleanup.backend = await stop(node?.process).catch(e => e.message);
  if (ownedRoot) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.tempRoot = `removed:${!existsSync(ownedRoot)}`; }
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(`Result ${evidence.result}; evidence in ${outputDir}`);
  process.exitCode = evidence.result === 'Pass' ? 0 : 1;
}

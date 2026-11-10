#!/usr/bin/env node
// Ticket-owned implementation self-check (agent-semantic-memory; not a package command). One disposable backend node
// (`autobyteus-server-ts/dist/app.js`) on a fresh data root with one registered agent package, and a Nuxt frontend bound
// to it, driven in headless Chrome. No runtime, no model.
// Cases: UI-01 the user's own agent: the switch is off, turning it on and saving writes `agent-config.json` and the
// detail shows On with the folder; UI-02 a package agent: saving it on marks it "Personal", the package files stay as
// they were, the detail shows the folder, "Reset to the package's setting" turns it off again; UI-03 zh-CN labels.
// Usage: node <this file> [--output-dir=...]   (needs a current server build)
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const webDir = path.join(root, 'autobyteus-web');
const serverDir = path.join(root, 'autobyteus-server-ts');
const { attachToBrowserContext, attachToProbeProcess, withNodeCredential } = await import(pathToFileURL(path.join(webDir, 'tests/e2e/fixtures/probe-node-access.mjs')).href);
attachToProbeProcess();
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');

const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const outputDir = path.resolve(arg('output-dir', path.join(path.dirname(fileURLToPath(import.meta.url)), `ui-probe-${new Date().toISOString().replace(/[:.]/g, '-')}`)));
if (existsSync(outputDir) && (await fs.readdir(outputDir)).length) { console.error(`Refusing non-empty ${outputDir}`); process.exit(1); }
await fs.mkdir(outputDir, { recursive: true });
const executablePath = ['/usr/bin/chromium', '/usr/bin/google-chrome'].find(existsSync);
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', cases: {}, browserErrors: [], cleanup: {}, error: null };

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (description, fn, ms = 30000) => {
  const deadline = Date.now() + ms;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await fn()) return; } catch (error) { lastError = error; }
    await sleep(250);
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
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log);
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
    process.kill(-child.pid, signal);
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(8000)]);
  }
  assert(exited(child), `Owned child ${child.pid} did not exit`);
  return `terminated:${child.pid}`;
};
const scrubbedEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !key.startsWith('ENABLE_') && !key.startsWith('AUTOBYTEUS_') && !/^(CODEX_|CLAUDE_|GROK_|ANTIGRAVITY_|AGY_|FAKE_)/.test(key) && !/_API_KEY$/.test(key)));

let ownedRoot, node, frontend, browser, page, frontendUrl;
const gql = async (query, variables = {}) => {
  const response = await fetch(`${node.url}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(`GraphQL failed: ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
};
const definition = async id => (await gql(`query($id:String!){agentDefinition(id:$id){id semanticMemoryEnabled semanticMemoryPath personalSettings personalSettingsBase}}`, { id })).agentDefinition;
const shot = async name => { await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true }); };
/** The switch with its surroundings (the form scrolls inside its own container, so a page shot misses it). */
const fieldShot = async name => {
  await page.locator('[data-testid="semantic-memory-enabled"]').evaluate(element => element.scrollIntoView({ block: 'center' }));
  await sleep(300);
  await page.screenshot({ path: path.join(outputDir, `${name}.png`) });
};
const bodyText = () => page.evaluate(() => document.body.innerText);
const kase = async (id, title, body) => {
  const started = Date.now();
  try { await body(); evidence.cases[id] = { ...(evidence.cases[id] ?? {}), title, result: 'Pass', ms: Date.now() - started }; }
  catch (error) { evidence.cases[id] = { ...(evidence.cases[id] ?? {}), title, result: 'Fail', ms: Date.now() - started, error: error.message }; await shot(`${id}-failure`).catch(() => undefined); }
  console.log(`${evidence.cases[id].result} ${id} ${title}${evidence.cases[id].error ? `: ${evidence.cases[id].error}` : ''}`);
};
const open = async (view, id) => {
  await page.goto(`${frontendUrl}/agents?view=${view}&id=${encodeURIComponent(id)}`, { waitUntil: 'domcontentloaded' });
  if (view === 'edit') await waitFor('the form', async () => (await page.locator('[data-testid="semantic-memory-enabled"]').count()) > 0, 60000);
  else await waitFor('the detail', async () => (await page.locator('[data-testid="agent-semantic-memory"]').count()) > 0, 60000);
  await sleep(500);
};
const switchBox = () => page.locator('[data-testid="semantic-memory-enabled"]');
const save = async () => {
  await page.locator('form button[type="submit"]').click();
  await waitFor('the detail after save', async () => page.url().includes('view=detail') && (await page.locator('[data-testid="agent-semantic-memory"]').count()) > 0, 30000);
  await sleep(500);
};
const snapshotDir = async dir => {
  const output = {};
  for (const entry of await fs.readdir(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) { const file = path.join(entry.parentPath, entry.name); output[path.relative(dir, file)] = await fs.readFile(file, 'utf8'); }
  }
  return output;
};

try {
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-semantic-memory-ui-')));
  const dataRoot = path.join(ownedRoot, 'node');
  const pkg = path.join(ownedRoot, 'probe-agents');
  for (const folder of ['db', 'logs', 'memory', 'temp_workspace', 'home']) await fs.mkdir(path.join(dataRoot, folder), { recursive: true });
  await fs.mkdir(path.join(pkg, 'agents', 'probe-operator'), { recursive: true });
  await fs.writeFile(path.join(pkg, 'agents', 'probe-operator', 'agent.md'), ['---', 'name: Probe Operator', 'description: A package agent (probe)', 'role: operator', '---', '', 'Operate.'].join('\n'));
  await fs.writeFile(path.join(pkg, 'agents', 'probe-operator', 'agent-config.json'), JSON.stringify({ toolNames: [], skillNames: [] }, null, 2));
  frontendUrl = `http://127.0.0.1:${await choosePort()}`;
  const port = await choosePort();
  const url = `http://127.0.0.1:${port}`;
  const databaseUrl = pathToFileURL(path.join(dataRoot, 'db', 'node.db')).href;
  const env = { ...scrubbedEnv(), HOME: path.join(dataRoot, 'home'), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl, AUTOBYTEUS_SERVER_HOST: url, AUTOBYTEUS_ALLOWED_ORIGINS: frontendUrl,
    AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'), AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: pkg, AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: '', AUTOBYTEUS_SKILLS_PATHS: '' };
  await fs.writeFile(path.join(dataRoot, '.env'), ['APP_ENV=development', 'DB_TYPE=sqlite', `DATABASE_URL=${databaseUrl}`, `AUTOBYTEUS_SERVER_HOST=${url}`].join('\n') + '\n');
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], root, env, path.join(outputDir, 'backend-migrate.log'));
  node = { url, port, process: null };
  node.process = start(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataRoot], serverDir, withNodeCredential(env), path.join(outputDir, 'backend.log'));
  await waitFor('backend health', async () => { if (exited(node.process)) throw new Error('backend exited'); return fetch(`${url}/rest/health`).then(r => r.ok).catch(() => false); }, 120000);
  const ownId = (await gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name: 'Probe Learner', role: 'learner', description: "The user's own agent (probe)", instructions: 'Learn.', toolNames: [] } })).createAgentDefinition.id;
  assert((await definition('probe-operator'))?.personalSettingsBase === 'PACKAGE', 'probe-operator is a package agent');
  evidence.isolation = { tempRoot: ownedRoot, backend: url, frontend: frontendUrl, ownId };

  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', frontendUrl.split(':').at(-1)], webDir, { ...scrubbedEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: url }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend', async () => { if (exited(frontend)) throw new Error('frontend exited'); return fetch(frontendUrl).then(r => r.ok).catch(() => false); }, 240000);
  browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  await attachToBrowserContext(context);
  await context.addInitScript(() => { if (!localStorage.getItem('autobyteus.localization.preference-mode')) localStorage.setItem('autobyteus.localization.preference-mode', 'en'); });
  page = await context.newPage();
  page.on('pageerror', e => evidence.browserErrors.push(e.message));
  // Warm the cold dev server (it re-optimizes dependencies and reloads once).
  for (const view of ['detail', 'edit', 'detail']) { await page.goto(`${frontendUrl}/agents?view=${view}&id=${ownId}`, { waitUntil: 'domcontentloaded' }); await sleep(5000); }

  await kase('UI-01', "The user's own agent: switch off → on, saved in agent-config.json; detail shows On and the folder", async () => {
    await open('detail', ownId);
    assert((await page.locator('[data-testid="agent-semantic-memory"]').innerText()).includes('Off'), 'detail shows Off');
    await shot('UI-01a-own-detail-off');
    await open('edit', ownId);
    assert(!(await switchBox().isChecked()), 'switch starts off');
    assert((await bodyText()).includes('Semantic memory'), 'label shown');
    await fieldShot('UI-01b-own-form-off');
    await switchBox().check();
    await fieldShot('UI-01c-own-form-on');
    await save();
    const saved = await definition(ownId);
    const configFile = path.join(dataRoot, 'agents', ownId, 'agent-config.json');
    const config = JSON.parse(await fs.readFile(configFile, 'utf8'));
    evidence.cases['UI-01'] = { saved, config };
    assert(saved.semanticMemoryEnabled === true && saved.semanticMemoryPath === path.join(dataRoot, 'memory', 'semantic', ownId), `GraphQL: ${JSON.stringify(saved)}`);
    assert(config.semanticMemoryEnabled === true, 'agent-config.json has it');
    const detail = await page.locator('[data-testid="agent-semantic-memory"]').innerText();
    assert(detail.includes('On.') && detail.includes(saved.semanticMemoryPath), `detail: ${detail}`);
    await shot('UI-01d-own-detail-on');
    await open('edit', ownId);
    assert(await switchBox().isChecked(), 'switch reloads on');
    await switchBox().uncheck();
    await save();
    assert(!('semanticMemoryEnabled' in JSON.parse(await fs.readFile(configFile, 'utf8'))), 'off removes it from agent-config.json');
    assert((await page.locator('[data-testid="agent-semantic-memory"]').innerText()).includes('Off'), 'detail Off again');
  });

  await kase('UI-02', "A package agent: personal switch, package files unchanged, reset to the package's setting", async () => {
    const before = await snapshotDir(pkg);
    await open('edit', 'probe-operator');
    assert(!(await switchBox().isChecked()), 'off from the package');
    await switchBox().check();
    await save();
    const saved = await definition('probe-operator');
    evidence.cases['UI-02'] = { saved };
    assert(saved.semanticMemoryEnabled === true && saved.personalSettings.includes('SEMANTIC_MEMORY'), `GraphQL: ${JSON.stringify(saved)}`);
    assert(JSON.stringify(await snapshotDir(pkg)) === JSON.stringify(before), 'package files unchanged');
    assert((await page.locator('[data-testid="agent-semantic-memory"]').innerText()).includes(saved.semanticMemoryPath), 'detail shows the folder');
    await shot('UI-02a-package-detail-on');
    await open('edit', 'probe-operator');
    const field = page.locator('[data-testid="semantic-memory-enabled"]').locator('xpath=ancestor::div[1]');
    assert((await field.innerText()).includes('Personal'), `Personal mark next to the switch: ${await field.innerText()}`);
    const note = await page.locator('[data-testid="personal-settings-note"]').innerText();
    assert(note.includes('semantic memory'), `note names semantic memory: ${note}`);
    await fieldShot('UI-02b-package-form-personal');
    await field.locator('[data-testid="personal-setting-reset"]').click();
    await waitFor('reset applied', async () => !(await switchBox().isChecked()));
    await waitFor('server reset', async () => (await definition('probe-operator')).semanticMemoryEnabled === false);
    assert(!(await definition('probe-operator')).personalSettings.includes('SEMANTIC_MEMORY'), 'no longer personal');
    await fieldShot('UI-02c-package-form-reset');
  });

  await kase('UI-03', 'zh-CN labels for the switch and the detail', async () => {
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    await open('edit', ownId);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor('zh label', async () => (await bodyText()).includes('语义记忆'), 30000);
    await fieldShot('UI-03a-zh-form');
    await open('detail', ownId);
    await waitFor('zh detail', async () => (await page.locator('[data-testid="agent-semantic-memory"]').innerText()).includes('语义记忆'), 30000);
    await shot('UI-03b-zh-detail');
  });

  assert(evidence.browserErrors.length === 0, `browser errors: ${evidence.browserErrors.join(' | ')}`);
  evidence.result = Object.values(evidence.cases).every(item => item.result === 'Pass') ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = error.stack ?? String(error);
  console.error(error);
} finally {
  await browser?.close().catch(() => undefined);
  evidence.cleanup.frontend = await stop(frontend).catch(error => `failed:${error.message}`);
  evidence.cleanup.backend = await stop(node?.process).catch(error => `failed:${error.message}`);
  if (ownedRoot) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.tempRoot = existsSync(ownedRoot) ? 'left' : 'removed'; }
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(evidence, null, 2));
  console.log(`Result: ${evidence.result} (${outputDir})`);
  process.exit(evidence.result === 'Pass' ? 0 : 1);
}

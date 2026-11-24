#!/usr/bin/env node
// autobyteus-627: the GitHub connection line and a private repository import, in the real web frontend against a
// built backend with its own data dir and vault, in fresh headless Chrome. Only outbound GitHub is emulated
// (fixtures/github-private-upstream.mjs: the token check and one private repository).
// Cases: WEB-627-01 a private import on a node without GitHub names the case, with the line in the import box;
// WEB-627-02 connect refuses a wrong token, then saves the accepted one; WEB-627-03 the import completes;
// WEB-627-04 the Skill sources dialog shows the same connection and disconnects it; WEB-627-05 the line in zh-CN.
// Custody: the token is in no page text, backend log or data-dir file.
// Run from repo root: node autobyteus-web/tests/e2e/github-connection-line-probe.mjs <fresh-output-dir>
// Prerequisites: a current server build (`pnpm -C autobyteus-server-ts build`), installed workspace deps, Chrome.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync, createWriteStream, readdirSync, readFileSync, statSync } from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { attachToBrowserContext, attachToProbeProcess, withNodeCredential } from './fixtures/probe-node-access.mjs';

attachToProbeProcess();
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.dirname(web), server = path.join(root, 'autobyteus-server-ts');
const { create: tar } = createRequire(path.join(server, 'package.json'))('tar');
const out = path.resolve(process.argv[2] || path.join(web, 'test-results/github-connection-line'));
assert(!existsSync(out), 'Use a fresh output directory');
await fs.mkdir(out, { recursive: true });
const evidence = { startedAt: new Date().toISOString(), cases: {}, pageErrors: [], cleanup: {} };
const save = () => fs.writeFile(path.join(out, 'result.json'), JSON.stringify(evidence, null, 2) + '\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wait = async (label, fn, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return; await sleep(100); } throw new Error('Timeout: ' + label); };
const freePort = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const children = [];
const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
const start = (cmd, args, cwd, extra, name) => {
  const log = createWriteStream(path.join(out, name + '.log'), { flags: 'a' });
  const child = spawn(cmd, args, { cwd, env: { ...env, ...extra }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log); child.once('close', () => log.end()); children.push(child); return child;
};
const stop = async child => {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  process.kill(-child.pid, 'SIGTERM');
  await wait('owned process exit', () => child.exitCode !== null || child.signalCode !== null, 12000).catch(async () => {
    process.kill(-child.pid, 'SIGKILL'); await wait('owned killed process exit', () => child.exitCode !== null || child.signalCode !== null);
  });
};

const REPOSITORY_URL = 'https://github.com/probe-org/private-pack';
const NOT_VISIBLE = `GitHub repository not found, or it is private: ${REPOSITORY_URL}. To use a private repository, connect GitHub on this node.`;
const accepted = `probe_${randomBytes(24).toString('hex')}`;
const wrong = `probe_${randomBytes(24).toString('hex')}`;
let owned, browser, page, base;

const record = async (id, fn) => {
  evidence.cases[id] = { result: 'Running' }; await save();
  try { evidence.cases[id].observed = await fn(); evidence.cases[id].result = 'Pass'; await page.screenshot({ path: path.join(out, id + '.png'), fullPage: true }); }
  catch (e) { evidence.cases[id] = { result: 'Fail', error: e.stack, body: await page.locator('body').innerText().catch(() => '') }; await page.screenshot({ path: path.join(out, id + '-failure.png') }).catch(() => {}); throw e; }
  finally { await save(); }
};
const line = () => page.getByTestId('github-connection-line');
const openAgentPackages = async () => {
  await page.goto(base + '/settings'); await page.getByTestId('settings-nav-agent-packages').click();
  await page.getByTestId('agent-packages-manager').waitFor(); await line().getByTestId('github-connection-status').waitFor();
};
const importBox = () => page.getByTestId('agent-package-source-input').locator('xpath=ancestor::div[contains(@class,"bg-gray-50")]');

try {
  owned = await fs.mkdtemp(path.join(os.tmpdir(), 'github-connection-web-'));
  const data = path.join(owned, 'data'); await fs.mkdir(path.join(data, 'db'), { recursive: true });
  const port = await freePort(), webPort = await freePort(); const backendUrl = `http://127.0.0.1:${port}`;
  const database = pathToFileURL(path.join(data, 'db', 'test.db')).href;
  await fs.mkdir(path.join(owned, 'home'));
  const backendEnv = { HOME: path.join(owned, 'home'), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: database, AUTOBYTEUS_SERVER_HOST: backendUrl,
    AUTOBYTEUS_ALLOWED_ORIGINS: `http://127.0.0.1:${webPort}`, AUTOBYTEUS_MEMORY_DIR: path.join(data, 'memory'), AUTOBYTEUS_LOG_DIR: path.join(data, 'logs'),
    AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(data, 'workspaces') };
  await fs.writeFile(path.join(data, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${database}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`);
  const migrate = start('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], server, backendEnv, 'migrate');
  await new Promise((resolve, reject) => { migrate.once('error', reject); migrate.once('close', code => code === 0 ? resolve() : reject(new Error('migration failed'))); });

  // The private repository: one shared agent in GitHub's archive layout.
  const revision = 'c'.repeat(40);
  const top = path.join(owned, 'archive', `private-pack-${revision}`, 'agents', 'private-helper');
  await fs.mkdir(top, { recursive: true });
  await fs.writeFile(path.join(top, 'agent.md'), '---\nname: Private Helper\ndescription: From a private repository\n---\n\nHelp.\n');
  await fs.writeFile(path.join(top, 'agent-config.json'), '{}');
  const archive = path.join(owned, 'private-pack.tar.gz');
  await tar({ cwd: path.join(owned, 'archive'), file: archive, gzip: true, portable: true }, [`private-pack-${revision}`]);
  const control = path.join(owned, 'control.json');
  await fs.writeFile(control, JSON.stringify({ accepted, archive, revision }));

  const backend = start(process.execPath, ['--import', path.join(web, 'tests/e2e/fixtures/github-private-upstream.mjs'), path.join(server, 'dist/app.js'),
    '--host', '127.0.0.1', '--port', String(port), '--data-dir', data], server, withNodeCredential({ ...backendEnv, GITHUB_PRIVATE_PROBE_CONTROL: control }), 'backend');
  await wait('backend health', async () => { assert.equal(backend.exitCode, null); return fetch(backendUrl + '/rest/health').then(r => r.ok).catch(() => false); }, 120000);
  const frontend = start('pnpm', ['exec', 'nuxt', 'dev', '--host', '127.0.0.1', '--port', String(webPort)], web, { NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl }, 'frontend');
  base = `http://127.0.0.1:${webPort}`;
  evidence.isolation = { owned, data, backendUrl, frontendUrl: base };
  await wait('Nuxt ready', async () => { assert.equal(frontend.exitCode, null); return fetch(base + '/settings').then(r => r.ok).catch(() => false); }, 240000);
  const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
  browser = await chromium.launch({ executablePath, headless: true });
  const newPage = async (locale) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'zh-CN' ? 'zh-CN' : 'en-US' });
    await attachToBrowserContext(context);
    await context.addInitScript((mode) => localStorage.setItem('autobyteus.localization.preference-mode', mode), locale);
    const created = await context.newPage(); created.setDefaultTimeout(30000);
    created.on('pageerror', e => evidence.pageErrors.push(e.message));
    return created;
  };
  page = await newPage('en');
  // Warm-up: a cold Nuxt dev server re-optimizes dependencies and reloads once.
  await page.goto(base + '/settings'); await sleep(3000);

  await record('WEB-627-01-not-connected-import', async () => {
    await openAgentPackages();
    assert.equal(await line().getByTestId('github-connection-status').innerText(), 'GitHub · not connected — needed only for private repositories.');
    assert.equal(await importBox().getByTestId('github-connection-line').count(), 1);
    await page.getByTestId('agent-package-source-input').fill(REPOSITORY_URL);
    await page.getByTestId('agent-package-import-button').click();
    await page.getByText(NOT_VISIBLE).waitFor();
    return { error: NOT_VISIBLE };
  });

  await record('WEB-627-02-connect', async () => {
    await line().getByTestId('github-connection-connect').click();
    const input = line().getByTestId('github-connection-token-input');
    assert.equal(await input.getAttribute('type'), 'password');
    assert.match(await line().getByTestId('github-connection-help').innerText(), /Contents: Read-only/);
    await input.fill(wrong); await line().getByTestId('github-connection-save').click();
    await line().getByTestId('github-connection-error').waitFor();
    const refused = await line().getByTestId('github-connection-error').innerText();
    assert.equal(refused, 'GitHub rejected this token. Check that you copied all of it, and that it has not expired.');
    await input.fill(` ${accepted} `); await line().getByTestId('github-connection-save').click();
    await wait('connected', async () => (await line().getByTestId('github-connection-status').innerText()) === 'GitHub · connected as @octo-dev');
    assert.equal(await line().getByTestId('github-connection-usage').innerText(), 'Used for private repositories here and by agents that have the GitHub integration.');
    assert.equal(await line().getByTestId('github-connection-token-input').count(), 0);
    return { refused, status: 'GitHub · connected as @octo-dev' };
  });

  await record('WEB-627-03-private-import', async () => {
    await page.getByTestId('agent-package-import-button').click();
    await page.getByTestId('agent-packages-success').waitFor({ timeout: 60000 });
    await page.getByTestId('agent-package-row-github_repository').filter({ hasText: REPOSITORY_URL }).waitFor();
    return { row: await page.getByTestId('agent-package-row-github_repository').innerText() };
  });

  await record('WEB-627-04-skill-sources-disconnect', async () => {
    await page.goto(base + '/skills'); await page.getByRole('button', { name: 'Sources', exact: true }).click();
    const dialog = page.getByTestId('skill-sources-dialog'); await dialog.waitFor();
    const dialogLine = dialog.getByTestId('github-connection-line');
    await wait('dialog line connected', async () => (await dialogLine.getByTestId('github-connection-status').innerText()) === 'GitHub · connected as @octo-dev');
    await dialogLine.getByTestId('github-connection-disconnect').click();
    await wait('disconnected', async () => (await dialogLine.getByTestId('github-connection-status').innerText()).includes('not connected'));
    return { status: await dialogLine.getByTestId('github-connection-status').innerText() };
  });

  page = await newPage('zh-CN');
  await record('WEB-627-05-zh-CN', async () => {
    await openAgentPackages();
    const status = await line().getByTestId('github-connection-status').innerText();
    assert.equal(status, 'GitHub · 未连接 — 仅私有仓库需要。');
    await line().getByTestId('github-connection-connect').click();
    return { status, help: await line().getByTestId('github-connection-help').innerText() };
  });

  // Custody: the token values are in no page text, backend log or data-dir file; GitHub saw only header credentials.
  const files = [];
  const walk = (directory) => { for (const name of readdirSync(directory)) { const full = path.join(directory, name); const s = statSync(full); if (s.isDirectory()) walk(full); else files.push(full); } };
  walk(data);
  const leaks = [...files, path.join(out, 'backend.log'), path.join(out, 'frontend.log')]
    .filter(file => existsSync(file)).filter(file => { const text = readFileSync(file).toString('latin1'); return text.includes(accepted) || text.includes(wrong); });
  const upstream = readFileSync(path.join(owned, 'upstream-requests.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  evidence.custody = { filesScanned: files.length, leaks, upstream };
  assert.deepEqual(leaks, []);
  assert(upstream.every(request => !request.url.includes(accepted) && !request.url.includes('token=')));
  assert.deepEqual(evidence.pageErrors, []);
  evidence.result = 'Pass';
} catch (e) { evidence.result = 'Fail'; evidence.error = e.stack; }
finally {
  if (browser) await browser.close(); evidence.cleanup.browserClosed = true;
  for (const child of children.toReversed()) await stop(child);
  evidence.cleanup.childrenStopped = children.every(c => c.exitCode !== null || c.signalCode !== null);
  const listening = address => new Promise(resolve => { const url = new URL(address); const socket = net.connect(Number(url.port), '127.0.0.1'); socket.once('connect', () => { socket.destroy(); resolve(true); }); socket.once('error', () => resolve(false)); });
  if (evidence.isolation) {
    evidence.cleanup.backendPortReleased = !(await listening(evidence.isolation.backendUrl));
    evidence.cleanup.frontendPortReleased = !(await listening(evidence.isolation.frontendUrl));
    if (!evidence.cleanup.backendPortReleased || !evidence.cleanup.frontendPortReleased) evidence.result = 'Fail';
  }
  if (owned) await fs.rm(owned, { recursive: true });
  evidence.cleanup.dataRemoved = !owned || !existsSync(owned);
  evidence.finishedAt = new Date().toISOString(); await save(); console.log(JSON.stringify({ result: evidence.result, cases: Object.fromEntries(Object.entries(evidence.cases).map(([id, c]) => [id, c.result])), error: evidence.error }));
}
if (evidence.result !== 'Pass') process.exitCode = 1;

#!/usr/bin/env node
// autobyteus-273 implementation self-check (IMP-07): renders Settings -> Server Settings -> Basics against a
// disposable backend built from this worktree (fresh temp data root, no provider calls) and a Nuxt dev server,
// drives the Claude runtime card in headless Chrome, and writes screenshots + result.json to --output-dir.
// Usage: node <this file> --output-dir=<dir> [--skip-server-build]
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const webDir = path.join(root, 'autobyteus-web');
const serverDir = path.join(root, 'autobyteus-server-ts');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const arg = (name, fallback) => process.argv.find(v => v.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const outputDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), 'claude-runtime-card-preview')));
const executablePath = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const KEY = 'CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE';
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', cases: {}, browserErrors: [], cleanup: {} };

const assert = (c, m) => { if (!c) throw new Error(m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (what, fn, ms = 60000) => {
  const deadline = Date.now() + ms; let last;
  while (Date.now() < deadline) { try { if (await fn()) return; } catch (e) { last = e; } await sleep(250); }
  throw new Error(`Timed out waiting for ${what}${last ? `: ${last.message}` : ''}`);
};
const choosePort = () => new Promise((res, rej) => { const s = net.createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
const exited = c => c.exitCode !== null || c.signalCode !== null;
const start = (cmd, args, cwd, env, log) => { const out = createWriteStream(log, { flags: 'a' }); const c = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] }); c.stdout.pipe(out); c.stderr.pipe(out); c.once('close', () => out.end()); return c; };
const run = (cmd, args, cwd, env, log) => new Promise((res, rej) => { const c = start(cmd, args, cwd, env, log); c.once('error', rej); c.once('close', code => code === 0 ? res() : rej(new Error(`${cmd} ${args.join(' ')} exited ${code}; see ${log}`))); });
const stop = async c => { if (!c) return 'not-started'; for (const sig of ['SIGTERM', 'SIGKILL']) { if (exited(c)) break; process.kill(-c.pid, sig); await Promise.race([new Promise(r => c.once('close', r)), sleep(8000)]); } return exited(c) ? `terminated:${c.pid}` : `still-running:${c.pid}`; };
const scrubbedEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('ENABLE_') && !k.startsWith('AUTOBYTEUS_') && !k.startsWith('CLAUDE_') && !k.endsWith('_API_KEY')));

let page;
const shot = async name => page.screenshot({ path: path.join(outputDir, `${name}.png`) });
const cardShot = async name => page.locator('[data-testid="claude-runtime-card"]').screenshot({ path: path.join(outputDir, `${name}.png`) });
const checked = async () => page.locator('[data-testid="claude-runtime-one-hour-cache-toggle"]').getAttribute('aria-checked');
const kase = async (id, title, body) => {
  try { await body(); evidence.cases[id] = { title, result: 'Pass' }; }
  catch (e) { evidence.cases[id] = { title, result: 'Fail', error: e.message }; await shot(`${id}-failure`).catch(() => undefined); }
  console.log(`${evidence.cases[id].result} ${id} ${title}${evidence.cases[id].error ? `: ${evidence.cases[id].error}` : ''}`);
};

let ownedRoot, backend, frontend, browser;
try {
  await fs.mkdir(outputDir, { recursive: true });
  if (!process.argv.includes('--skip-server-build')) await run('corepack', ['pnpm', '-C', serverDir, 'build'], root, process.env, path.join(outputDir, 'server-build.log'));
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-273-card-'));
  const dataRoot = path.join(ownedRoot, 'node');
  const dbPath = path.join(dataRoot, 'db', 'node.db');
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  for (const f of ['logs', 'memory', 'temp_workspace', 'home']) await fs.mkdir(path.join(dataRoot, f), { recursive: true });
  const port = await choosePort();
  const url = `http://127.0.0.1:${port}`;
  const databaseUrl = pathToFileURL(dbPath).href;
  const env = { ...scrubbedEnv(), HOME: path.join(dataRoot, 'home'), AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: '', AUTOBYTEUS_SKILLS_PATHS: '',
    APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl, AUTOBYTEUS_SERVER_HOST: url, AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace') };
  await fs.writeFile(path.join(dataRoot, '.env'), ['APP_ENV=development', 'DB_TYPE=sqlite', `DATABASE_URL=${databaseUrl}`, `AUTOBYTEUS_SERVER_HOST=${url}`].join('\n') + '\n');
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], root, env, path.join(outputDir, 'migrate.log'));
  backend = start(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataRoot], serverDir, env, path.join(outputDir, 'backend.log'));
  await waitFor('backend', async () => { if (exited(backend)) throw new Error('backend exited'); return fetch(`${url}/rest/health`).then(r => r.ok).catch(() => false); }, 120000);
  const fePort = await choosePort();
  const feUrl = `http://127.0.0.1:${fePort}`;
  evidence.isolation = { tempRoot: ownedRoot, backend: url, frontend: feUrl };
  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(fePort)], webDir, { ...scrubbedEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: url }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend', async () => { if (exited(frontend)) throw new Error('frontend exited'); return fetch(feUrl).then(r => r.ok).catch(() => false); }, 240000);
  browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 }, locale: 'en-US' });
  await context.addInitScript(() => { if (!localStorage.getItem('autobyteus.localization.preference-mode')) localStorage.setItem('autobyteus.localization.preference-mode', 'en'); });
  page = await context.newPage();
  page.on('pageerror', e => evidence.browserErrors.push(e.message));
  const open = async () => {
    await page.goto(`${feUrl}/settings?section=server-settings&mode=quick`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="claude-runtime-card"]').waitFor({ timeout: 180000 });
    await sleep(1500);
  };
  const envFile = () => fs.readFile(path.join(dataRoot, '.env'), 'utf8');

  await kase('CARD-01', 'Fresh node: card after Codex card, toggle on although never saved', async () => {
    await open(); await open(); // second open after the cold Nuxt dependency re-optimization
    assert(await checked() === 'true', `aria-checked ${await checked()}`);
    const boxes = await page.evaluate(() => ['codex-full-access-card', 'claude-runtime-card'].map(id => document.querySelector(`[data-testid="${id}"]`).getBoundingClientRect().toJSON()));
    evidence.cases.layout = boxes;
    assert(!(await envFile()).includes(KEY), 'opening wrote the setting');
    await shot('IMP-07-basics-default-on');
    await cardShot('IMP-07-card-default-on');
  });
  await kase('CARD-02', 'Turn off: saves false to .env, switch off', async () => {
    await page.locator('[data-testid="claude-runtime-one-hour-cache-toggle"]').click();
    await waitFor('saved false', async () => (await envFile()).includes(`${KEY}=false`));
    await waitFor('switch off', async () => (await checked()) === 'false');
    await sleep(600);
    await cardShot('IMP-07-card-off');
    await open();
    assert(await checked() === 'false', 'reload keeps off');
  });
  await kase('CARD-03', 'Keyboard: focus and Space turns it back on, saves true', async () => {
    await page.locator('[data-testid="claude-runtime-one-hour-cache-toggle"]').focus();
    await cardShot('IMP-07-card-focus');
    await page.keyboard.press('Space');
    await waitFor('saved true', async () => (await envFile()).includes(`${KEY}=true`));
    await waitFor('switch on', async () => (await checked()) === 'true');
  });
  await kase('CARD-04', 'zh-CN texts', async () => {
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    await open();
    const text = await page.locator('[data-testid="claude-runtime-card"]').innerText();
    assert(text.includes('Claude 运行时') && text.includes('一小时提示缓存'), `zh text: ${text.slice(0, 80)}`);
    await cardShot('IMP-07-card-zh-CN');
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  });
  await kase('CARD-05', 'Narrow 390px layout without horizontal overflow', async () => {
    await page.setViewportSize({ width: 390, height: 1100 });
    await open();
    await page.locator('[data-testid="claude-runtime-card"]').scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 0, `horizontal overflow ${overflow}`);
    await cardShot('IMP-07-card-narrow');
  });
  evidence.result = Object.values(evidence.cases).filter(c => c.result).every(c => c.result === 'Pass') && !evidence.browserErrors.length ? 'Pass' : 'Fail';
} catch (e) {
  evidence.error = e.stack || e.message; console.error(e);
} finally {
  evidence.cleanup.browser = browser ? await browser.close().then(() => 'closed', e => e.message) : 'not-started';
  evidence.cleanup.frontend = await stop(frontend).catch(e => e.message);
  evidence.cleanup.backend = await stop(backend).catch(e => e.message);
  if (ownedRoot) evidence.cleanup.tempRoot = await fs.rm(ownedRoot, { recursive: true, force: true }).then(() => 'removed', e => e.message);
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(evidence, null, 2));
  console.log(`Result: ${evidence.result}`);
  process.exitCode = evidence.result === 'Pass' ? 0 : 1;
}

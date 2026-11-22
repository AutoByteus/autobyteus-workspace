#!/usr/bin/env node
// Desktop browser probe (autobyteus-585 AC-005): a platform notice is its own light, labelled row in the conversation,
// never inside the agent's message. The fixture page (`fixtures/notice-row-presentation.page.vue`) draws the founder's
// conversation with the real feed: the agent's turn ending with a tool card, the restart reminder that woke it, and its
// reply. The probe installs the page into `pages/` for its run only, starts `nuxi dev` (no node needed), opens it in
// headless Chrome at 1280×900 in Europe/Berlin, checks the rows and takes a screenshot. The phone's side is MSP-99 in
// `pnpm -C autobyteus-web test:e2e:mobile-shell`.
//
// Options: --output-dir=<dir> (default test-results/notice-row-presentation), --browser-executable=<path>, --port=<n>.
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
const fixturePath = path.join(scriptDir, 'fixtures/notice-row-presentation.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-notice-row-presentation.vue');
const routePath = '/api-e2e-notice-row-presentation';
const arg = (name, fallback) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const timeoutMs = 120_000;
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/notice-row-presentation'));
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium'].find((candidate) => existsSync(candidate));

const evidence = { startedAt: new Date().toISOString(), routePath, checks: {}, rows: [], browserErrors: [], failures: [], cleanup: {} };
const assert = (condition, message, details) => { if (!condition) throw Object.assign(new Error(message), { details }); };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
});
const exited = (child) => child.exitCode !== null || child.signalCode !== null;

await fs.mkdir(outputDir, { recursive: true });
const evidencePath = path.join(outputDir, 'evidence.json');
const screenshotPath = path.join(outputDir, 'desktop-notice-row.png');
let nuxt;
let nuxtLog;
let browser;
let installed = false;
let result = 'Pass';
try {
  assert(executablePath, 'No Chrome/Chromium executable found; pass --browser-executable');
  assert(!existsSync(installedPagePath), `Refusing to overwrite existing page: ${installedPagePath}`);
  await fs.copyFile(fixturePath, installedPagePath);
  installed = true;
  const port = Number(arg('port', 0)) || await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  nuxtLog = createWriteStream(path.join(outputDir, 'nuxt.log'));
  nuxt = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir, detached: process.platform !== 'win32', env: { ...process.env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nuxt.stdout.pipe(nuxtLog);
  nuxt.stderr.pipe(nuxtLog);
  for (const started = Date.now(); ; await sleep(250)) {
    if (exited(nuxt)) throw new Error(`nuxi dev exited: ${nuxt.exitCode ?? nuxt.signalCode}`);
    if (Date.now() - started > 4 * timeoutMs) throw new Error('nuxi dev did not serve the fixture route');
    if (await fetch(`${baseUrl}${routePath}`).then((response) => response.ok).catch(() => false)) break;
  }

  browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US', timezoneId: 'Europe/Berlin', colorScheme: 'light' });
  await context.route('**/rest/health', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' }));
  // The app's own plugins open these node streams on every page; the fixture has no node, so they are accepted quietly.
  await context.routeWebSocket(/\/ws\/(agent-package-definitions|update-notifications)(\?|$)/, () => undefined);
  const page = await context.newPage();
  page.on('console', (message) => { if (message.type() === 'error') evidence.browserErrors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => evidence.browserErrors.push(`pageerror: ${error.message}`));
  // A cold Vite optimize can reload the page once on its first start; the second load is the one checked.
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-testid="system-task-notification-segment"]').waitFor({ timeout: timeoutMs });
  await sleep(1_000);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: timeoutMs });
  evidence.browserErrors = [];
  await page.locator('[data-testid="system-task-notification-segment"]').waitFor({ timeout: timeoutMs });
  await sleep(1_000);

  evidence.rows = await page.evaluate(() => {
    const shown = (el) => Boolean(el) && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
    return [...document.querySelectorAll('[data-testid="agent-conversation-feed"] .conv-row')].map((row) => {
      const notice = row.querySelector('[data-testid="system-task-notification-segment"]');
      const avatar = row.querySelector('.conv-avatar');
      const body = notice?.querySelector('[data-testid="system-task-notification-body"] .markdown-body');
      return {
        speaker: row.getAttribute('data-speaker'),
        text: row.innerText.replace(/\s+/g, ' ').trim(),
        avatarShown: shown(avatar),
        agentAvatar: Boolean(avatar?.querySelector('img, span')),
        notice: notice ? {
          role: notice.getAttribute('role'),
          ariaLabel: notice.getAttribute('aria-label'),
          label: notice.querySelector('[data-testid="system-task-notification-label"]')?.innerText.trim() ?? null,
          labelShown: shown(notice.querySelector('[data-testid="system-task-notification-label"]')),
          phoneSpeakerShown: shown(notice.querySelector('.conv-speaker')),
          icon: Boolean(avatar?.querySelector('svg')),
          body: notice.querySelector('[data-testid="system-task-notification-body"]')?.innerText.trim() ?? '',
          background: getComputedStyle(notice).backgroundColor,
          border: getComputedStyle(notice).borderTopWidth,
          bodyColor: body ? getComputedStyle(body).color : null,
          bodyFont: body ? getComputedStyle(body).fontFamily : null,
        } : null,
      };
    });
  });
  const rows = evidence.rows;
  const notice = rows[2]?.notice;
  const checks = {
    'rows in order: user, agent (text + tool card), notice, agent (reply)': rows.map((row) => row.speaker).join(',') === 'user,agent,system,agent',
    'the agent row before the notice holds the tool card and not the notice': rows[1]?.text.includes('Starting the build') && rows[1]?.text.includes('pnpm build') && rows[1]?.notice === null && !rows[1]?.text.includes('restarted'),
    'the notice row is labelled "Application restarted" above its body, as its aria-label, role note': notice?.label === 'Application restarted' && notice?.labelShown && notice?.ariaLabel === 'Application restarted' && notice?.role === 'note' && !notice?.phoneSpeakerShown,
    'the notice row has an icon and no agent avatar or name': notice?.icon && !rows[2]?.agentAvatar && !rows[2]?.text.includes('Builder'),
    'the body has no [Platform notice — …] line and shows the restart time in the viewer\'s zone': !notice?.body.includes('[Platform notice') && notice?.body.includes('The application restarted at 21 Nov 2026, 08:32 CET'),
    'light: no panel, no border, muted body, not monospace': notice?.background === 'rgba(0, 0, 0, 0)' && notice?.border === '0px' && notice?.bodyColor === 'rgb(71, 85, 105)' && !/mono/i.test(notice?.bodyFont ?? ''),
    'the agent row after the notice is the agent\'s own, with its avatar': rows[3]?.speaker === 'agent' && rows[3]?.avatarShown && rows[3]?.agentAvatar && rows[3]?.text.includes('I have stopped and am waiting'),
    'the message usage shows once, under its last row': rows.filter((row) => row.text.includes('1840 tokens')).length === 1 && rows[3]?.text.includes('1840 tokens / $0.0184'),
  };
  evidence.checks = checks;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  assert(failed.length === 0, `Failed checks: ${failed.join('; ')}`, rows);
  assert(evidence.browserErrors.length === 0, 'Browser console errors were observed', evidence.browserErrors);
} catch (error) {
  result = 'Fail';
  evidence.failures.push({ message: error.message, details: error.details, stack: error.stack });
} finally {
  await browser?.close().catch((error) => { evidence.cleanup.browser = `failed: ${error.message}`; });
  if (nuxt && !exited(nuxt)) {
    try { process.kill(-nuxt.pid, 'SIGTERM'); } catch { nuxt.kill('SIGTERM'); }
    for (let waited = 0; !exited(nuxt) && waited < 10_000; waited += 200) await sleep(200);
    if (!exited(nuxt)) { try { process.kill(-nuxt.pid, 'SIGKILL'); } catch { nuxt.kill('SIGKILL'); } }
  }
  evidence.cleanup.nuxt = nuxt ? (exited(nuxt) ? 'stopped' : 'still running') : 'not-started';
  await new Promise((resolve) => (nuxtLog ? nuxtLog.end(resolve) : resolve()));
  if (installed) await fs.rm(installedPagePath, { force: true });
  evidence.cleanup.installedFixture = installed ? 'removed' : 'not-installed';
  evidence.result = result;
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}
process.stdout.write(`Notice row presentation probe: ${result}. Evidence: ${evidencePath}\n`);
if (result !== 'Pass') process.exitCode = 1;

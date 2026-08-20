#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '../..');
const fixturePath = path.join(here, 'fixtures/system-instruction-activity.page.vue');
const installedPagePath = path.join(webDir, 'pages/__system-instruction-activity-probe.vue');
const routePath = '/__system-instruction-activity-probe';
const valueAfter = (flag, fallback) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const outputDir = path.resolve(process.cwd(), valueAfter('--output-dir', 'test-results/system-instruction-activity'));
const executablePath = valueAfter(
  '--browser-executable',
  process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
    || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
);
const timeoutMs = Number(valueAfter('--timeout-ms', '90000'));
const exactContent = 'first line\n\n  indented line\nemoji: 🧪\nfinal line';
const expectedLabels = {
  autobyteus: 'AutoByteus-supplied · Native configured system prompt',
  claude_agent_sdk: 'AutoByteus-supplied · Claude SDK systemPrompt',
  codex_app_server: 'AutoByteus-supplied · Codex baseInstructions',
  unknown: 'AutoByteus-supplied system instructions',
};

const evidence = {
  startedAt: new Date().toISOString(),
  browserExecutable: executablePath,
  fixturePath,
  installedPagePath,
  routePath,
  scenarios: {},
  browserEvents: [],
  cleanup: {},
  failures: [],
};
const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close((error) => error ? reject(error) : resolve(address.port));
  });
});
const waitFor = async (label, predicate) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await predicate();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
};
const exited = (child) => !child || child.exitCode !== null || child.signalCode !== null;
const waitForExit = (child, ms) => new Promise((resolve) => {
  if (exited(child)) return resolve(true);
  const done = () => { clearTimeout(timer); child.off('exit', done); resolve(true); };
  child.once('exit', done);
  const timer = setTimeout(() => { child.off('exit', done); resolve(exited(child)); }, ms);
});
const stopOwned = async (child) => {
  if (!child || exited(child)) return { status: child ? 'already-exited' : 'not-started' };
  process.kill(-child.pid, 'SIGTERM');
  if (!(await waitForExit(child, 10000))) {
    process.kill(-child.pid, 'SIGKILL');
    assert.equal(await waitForExit(child, 5000), true, 'Owned Nuxt process did not stop');
  }
  return { status: 'terminated', pid: child.pid, exitCode: child.exitCode, signalCode: child.signalCode };
};
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const record = async (id, description, fn) => {
  try {
    const details = await fn();
    evidence.scenarios[id] = { result: 'Pass', description, details };
  } catch (error) {
    const failure = { id, description, message: error.message, stack: error.stack };
    evidence.scenarios[id] = { result: 'Fail', description, failure };
    evidence.failures.push(failure);
    throw error;
  }
};

await fs.mkdir(outputDir, { recursive: true });
const evidencePath = path.join(outputDir, 'evidence.json');
const logPath = path.join(outputDir, 'nuxt.log');
let fixtureInstalled = false;
let child;
let log;
let browser;
let result = 'Pass';

try {
  assert.equal(existsSync(fixturePath), true, `Missing fixture ${fixturePath}`);
  assert.equal(existsSync(installedPagePath), false, `Refusing to overwrite ${installedPagePath}`);
  assert.equal(existsSync(executablePath), true, `Missing browser ${executablePath}`);
  await fs.copyFile(fixturePath, installedPagePath);
  fixtureInstalled = true;
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  evidence.port = port;
  evidence.baseUrl = baseUrl;
  log = createWriteStream(logPath, { flags: 'w' });
  child = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir,
    detached: true,
    env: { ...process.env, BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  await waitFor('Nuxt probe route', async () => {
    if (exited(child)) throw new Error(`Nuxt exited early (${child.exitCode}/${child.signalCode})`);
    return (await fetch(`${baseUrl}${routePath}`)).ok;
  });

  browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  const page = await context.newPage();
  await page.route('http://127.0.0.1:65534/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(requestUrl.pathname.includes('/rest/health') ? { status: 'ok' } : {
        data: {
          applicationsCapability: {
            enabled: false,
            scope: 'BOUND_NODE',
            settingKey: 'ENABLE_APPLICATIONS',
            source: 'SERVER_SETTING',
          },
          workspaces: [],
          agentDefinitions: [],
          agentTeamDefinitions: [],
        },
      }),
    });
  });
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.locator('[data-test="system-instruction-probe"]').waitFor({ state: 'visible', timeout: timeoutMs });

  await record('BE2E-SI-001A', 'Desktop labels, collapsed default, pointer and keyboard disclosure, exact content, and ARIA', async () => {
    const details = {};
    for (const [runtime, label] of Object.entries(expectedLabels)) {
      const root = page.locator(`[data-runtime="${runtime}"]`);
      const button = root.getByRole('button');
      const region = root.getByRole('region');
      assert.equal(await button.getAttribute('aria-expanded'), 'false', `${runtime} must default collapsed`);
      assert.equal(await region.isVisible(), false, `${runtime} region must default hidden`);
      assert.match(await button.getAttribute('aria-label'), new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      details[runtime] = { label, controls: await button.getAttribute('aria-controls') };
    }
    const native = page.locator('[data-runtime="autobyteus"]');
    await native.getByRole('button').click();
    assert.equal(await native.getByRole('button').getAttribute('aria-expanded'), 'true');
    assert.equal(await native.getByRole('region').isVisible(), true);
    assert.equal(await native.locator('pre').textContent(), exactContent, 'Whitespace/content must be exact');
    assert.equal(await native.getByRole('button').getAttribute('aria-controls'), await native.getByRole('region').getAttribute('id'));
    assert.equal(await native.getByRole('region').getAttribute('aria-labelledby'), await native.locator('article span[id^="system-instruction-title-"]').getAttribute('id'));

    const claude = page.locator('[data-runtime="claude_agent_sdk"]');
    await claude.getByRole('button').focus();
    await page.keyboard.press('Enter');
    assert.equal(await claude.getByRole('button').getAttribute('aria-expanded'), 'true');
    const codex = page.locator('[data-runtime="codex_app_server"]');
    await codex.getByRole('button').focus();
    await page.keyboard.press('Space');
    assert.equal(await codex.getByRole('button').getAttribute('aria-expanded'), 'true');

    const pre = native.locator('pre');
    await pre.focus();
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'PRE');
    const selection = await pre.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return selection.toString();
    });
    assert.equal(selection, exactContent, 'Expanded content must remain selectable');
    await page.screenshot({ path: path.join(outputDir, 'desktop-expanded.png'), fullPage: true });
    return { ...details, exactContentLength: Array.from(exactContent).length, exactContentSha256: sha256(exactContent) };
  });

  await record('BE2E-SI-001B', 'Desktop and mobile long-line containment, scrolling, and 200% CSS zoom', async () => {
    const codex = page.locator('[data-runtime="codex_app_server"]');
    const desktop = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.ok(desktop.scrollWidth <= desktop.clientWidth, `Desktop page overflow: ${JSON.stringify(desktop)}`);
    const preMetrics = await codex.locator('pre').evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: getComputedStyle(element).overflowY,
      overflowWrap: getComputedStyle(element).overflowWrap,
    }));
    assert.equal(preMetrics.overflowWrap, 'anywhere');
    assert.match(preMetrics.overflowY, /auto|scroll/);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.ok(mobile.scrollWidth <= mobile.clientWidth, `Mobile page overflow: ${JSON.stringify(mobile)}`);
    await page.screenshot({ path: path.join(outputDir, 'mobile-expanded.png'), fullPage: true });

    await page.evaluate(() => { document.documentElement.style.zoom = '200%'; });
    const zoomed = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.ok(zoomed.scrollWidth <= zoomed.clientWidth, `200% zoom page overflow: ${JSON.stringify(zoomed)}`);
    return { desktop, mobile, zoomed, preMetrics };
  });

  const browserErrors = evidence.browserEvents.filter((event) => event.type === 'pageerror' || event.type === 'console:error');
  assert.deepEqual(browserErrors, [], `Browser errors: ${JSON.stringify(browserErrors)}`);
  await context.close();
} catch (error) {
  result = 'Fail';
  if (!evidence.failures.some((failure) => failure.message === error.message)) {
    evidence.failures.push({ id: 'HARNESS', message: error.message, stack: error.stack });
  }
} finally {
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; }
  catch (error) { result = 'Fail'; evidence.cleanup.browser = `failed: ${error.message}`; }
  try { evidence.cleanup.nuxt = await stopOwned(child); }
  catch (error) { result = 'Fail'; evidence.cleanup.nuxt = `failed: ${error.message}`; }
  try { if (log) await new Promise((resolve) => log.end(resolve)); evidence.cleanup.log = 'closed'; }
  catch (error) { result = 'Fail'; evidence.cleanup.log = `failed: ${error.message}`; }
  try { if (fixtureInstalled) await fs.rm(installedPagePath, { force: true }); evidence.cleanup.fixture = fixtureInstalled ? 'removed' : 'not-installed'; }
  catch (error) { result = 'Fail'; evidence.cleanup.fixture = `failed: ${error.message}`; }
  evidence.result = result;
  evidence.finishedAt = new Date().toISOString();
  evidence.artifacts = { evidencePath, logPath };
  await fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

if (result !== 'Pass') {
  console.error(`System instruction browser probe failed. Evidence: ${evidencePath}`);
  process.exitCode = 1;
} else {
  console.log(`System instruction browser probe passed. Evidence: ${evidencePath}`);
}

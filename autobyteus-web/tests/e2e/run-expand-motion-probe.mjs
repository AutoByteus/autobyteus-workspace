#!/usr/bin/env node
// autobyteus-390 (REQ-001, REQ-002; AC-001, AC-002): expanding an Agent run in the Runs view shows its delegated rows in
// their final place at once; collapsing removes them at once. Against the product RunListRow in real headless Chrome.
//   pnpm -C autobyteus-web test:e2e:run-expand-motion [--output-dir <fresh dir>] [--browser-executable <path>]
// Prerequisites: pnpm install; pnpm exec nuxt prepare. Owns a Nuxt dev server on a free port with a dead backend URL,
// a fixture route (tests/e2e/fixtures/run-expand-motion.page.vue) and Chrome; all are removed in finally.
// Before the fix, the first frames after expand showed every row at the top of the window with a move transform
// (`translate(0, -Npx)`), sliding down over 200 ms.
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { prepareOutputDir, probeOutputDir } from './fixtures/probe-output-dir.mjs';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, '../..');
const fixturePath = path.join(scriptDir, 'fixtures/run-expand-motion.page.vue');
const installedPagePath = path.join(webDir, 'pages/api-e2e-run-expand-motion.vue');
const routePath = '/api-e2e-run-expand-motion';
const arg = (name) => {
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : undefined;
};
const outputDir = prepareOutputDir(probeOutputDir(webDir, 'run-expand-motion', arg('output-dir')));
const executablePath = arg('browser-executable') || process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const FRAMES = 4;
const evidence = { startedAt: new Date().toISOString(), platform: `${process.platform}-${process.arch}`, node: process.version,
  executablePath, cases: {}, browserEvents: [], cleanup: {}, failures: [] };
const evidencePath = path.join(outputDir, 'evidence.json');
const save = () => fs.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e; } };
const until = async (label, predicate, ms = 180_000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(100); }
  throw new Error(`Timed out waiting for ${label}${last ? `: ${last.message}` : ''}`);
};
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const exited = (child) => !child || child.exitCode !== null || child.signalCode !== null;
const stop = async (child) => {
  if (exited(child)) return 'not-running';
  process.kill(-child.pid, 'SIGTERM');
  try { await until('Nuxt exit', () => exited(child), 10_000); return 'SIGTERM'; }
  catch { process.kill(-child.pid, 'SIGKILL'); await until('Nuxt forced exit', () => exited(child), 5_000); return 'SIGKILL'; }
};
const runCase = async (id, description, fn) => {
  try {
    evidence.cases[id] = { description, result: 'Pass', details: await fn() };
  } catch (error) {
    evidence.cases[id] = { description, result: 'Fail', message: error.message, details: error.details };
    evidence.failures.push({ id, message: error.message });
  }
  await save();
  console.log(`${id} ${evidence.cases[id].result} ${description}${evidence.cases[id].message ? ` — ${evidence.cases[id].message}` : ''}`);
};

let nuxt, nuxtLog, browser, installed = false;
try {
  assert(executablePath, 'No Chrome/Chromium executable found; pass --browser-executable');
  assert(!existsSync(installedPagePath), `Refusing to overwrite an existing page: ${installedPagePath}`);
  await fs.copyFile(fixturePath, installedPagePath); installed = true;
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  nuxtLog = createWriteStream(path.join(outputDir, 'nuxt.log'));
  nuxt = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: 'http://127.0.0.1:65534' },
  });
  nuxt.stdout.pipe(nuxtLog); nuxt.stderr.pipe(nuxtLog);
  await until('Nuxt fixture route', async () => { assert(!exited(nuxt), 'Nuxt exited'); return (await fetch(`${baseUrl}${routePath}`)).ok; });

  browser = await chromium.launch({ headless: true, executablePath });
  evidence.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, locale: 'en-US' });
  const page = await context.newPage();
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  page.on('console', (message) => { if (message.type() === 'error') evidence.browserEvents.push({ type: 'console:error', text: message.text() }); });
  // The fixture has no backend: GraphQL answers empty, and the shell's change-feed sockets stay quiet.
  await page.route('**/rest/health', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' }));
  // The delegated rows ask which Task each worker is on (taskWorkerTasks): none here.
  await page.route('**/graphql', (route) => {
    let query = '';
    try { query = route.request().postDataJSON()?.query ?? ''; } catch { query = ''; }
    const data = query.includes('taskWorkerTasks') ? { taskWorkerTasks: [] } : {};
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data }) });
  });
  await page.routeWebSocket(/\/ws\//, () => undefined);
  const load = async () => {
    await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__runExpandMotionProbe) && window.__runExpandMotionProbe.rowCount() > 0, undefined, { timeout: 120_000 });
  };
  // Warm-up: a cold Nuxt dev server may re-optimize dependencies and reload the page once (TESTING.md).
  await load(); await sleep(3000); await load();
  evidence.browserEvents = [];
  const probe = (fn, ...args) => page.evaluate(([name, rest]) => window.__runExpandMotionProbe[name](...rest), [fn, args]);

  await runCase('REM-01', 'Expanded at first: twelve delegated rows, at rest', async () => {
    assert(await probe('isExpanded') === true, 'The run does not start expanded');
    const rows = await probe('sample');
    assert(rows.length === 12, 'Expected twelve delegated rows', { rows });
    assert(rows.every((row) => row.transform === 'none'), 'A row is moving at rest', { rows });
    assert(rows[0].top > 150, 'The delegated rows are not below other runs', { rows });
    await page.screenshot({ path: path.join(outputDir, 'REM-01-expanded.png') });
    return { rows };
  });

  let expandedTops = [];
  await runCase('REM-02', 'Collapse: the delegated rows are gone at once (AC-002)', async () => {
    expandedTops = (await probe('sample')).map((row) => row.top);
    const { perFrame, settled } = await probe('toggleAndSample', FRAMES);
    assert(await probe('isExpanded') === false, 'The run did not collapse');
    assert(perFrame.every((rows) => rows.length === 0) && settled.length === 0, 'Delegated rows are still in the DOM after collapse (hidden, not removed)', { perFrame, settled });
    assert(await probe('treeInDom') === false, 'The delegated tree is still in the DOM');
    await page.screenshot({ path: path.join(outputDir, 'REM-02-collapsed.png') });
    return { perFrame: perFrame.map((rows) => rows.length) };
  });

  await runCase('REM-03', `Expand: from the first frame, every row is at its final place with no transform (AC-001; ${FRAMES} frames)`, async () => {
    const { perFrame, settled } = await probe('toggleAndSample', FRAMES);
    assert(await probe('isExpanded') === true, 'The run did not expand');
    const finalTops = settled.map((row) => row.top);
    assert(settled.length === 12 && JSON.stringify(finalTops) === JSON.stringify(expandedTops), 'Settled rows differ from before collapse', { finalTops, expandedTops });
    const offending = perFrame.flatMap((rows, frame) => rows
      .map((row, index) => ({ frame, index, ...row, final: finalTops[index] }))
      .filter((row) => row.transform !== 'none' || row.top !== row.final));
    assert(perFrame.every((rows) => rows.length === 12), 'Not every delegated row is on screen from the first frame', { counts: perFrame.map((rows) => rows.length) });
    assert(offending.length === 0, `${offending.length} row samples moved from elsewhere on screen`, { firstOffending: offending.slice(0, 6), frames: perFrame });
    await page.screenshot({ path: path.join(outputDir, 'REM-03-expanded-again.png') });
    return { frames: perFrame, settled };
  });

  await runCase('REM-04', 'No browser errors during the cases', async () => {
    assert(evidence.browserEvents.length === 0, 'Browser errors', evidence.browserEvents);
    return { events: 0 };
  });
} catch (error) {
  evidence.failures.push({ id: 'harness', message: String(error?.stack ?? error) });
  console.error(`[run-expand-motion] ${error.message}`);
} finally {
  await browser?.close().catch(() => undefined); evidence.cleanup.browserClosed = Boolean(browser);
  evidence.cleanup.nuxt = await stop(nuxt).catch((error) => `stop failed: ${error.message}`);
  nuxtLog?.end();
  if (installed) await fs.rm(installedPagePath, { force: true });
  evidence.cleanup.installedPageRemoved = !existsSync(installedPagePath);
  evidence.result = evidence.failures.length === 0 && Object.keys(evidence.cases).length === 4 ? 'Pass' : 'Fail';
  evidence.finishedAt = new Date().toISOString();
  await save();
  console.log(JSON.stringify({ result: evidence.result, evidencePath, cleanup: evidence.cleanup }));
  process.exitCode = evidence.result === 'Pass' ? 0 : 1;
}

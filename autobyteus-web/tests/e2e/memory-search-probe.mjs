#!/usr/bin/env node
// Memory page probe (work-journal-search): the real server and the real page against a probe-written memory folder
// (never a user's data). It builds the memory index by the user's click, searches, opens a result at its lines in
// the Work Journal, reads a large file in windows, opens Raw Traces and a run known only by its folder, and takes
// the screenshots the UI/UX spec's VIS references show (desktop 1440×900, narrow 390×844).
//
//   pnpm -C autobyteus-server-ts build
//   node autobyteus-web/tests/e2e/memory-search-probe.mjs --browser-executable <chrome> [--embedding-models <dir>] [--output-dir <dir>]
//
// `--embedding-models` copies already downloaded embedding model files (the `models/` folder of an embedding root)
// so the Meaning index needs no download; without it the first build downloads the default model.
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
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, '../..');
const workspaceDir = path.resolve(webDir, '..');
const serverDir = path.join(workspaceDir, 'autobyteus-server-ts');

const getArg = (name, fallback = undefined) => {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--') ? process.argv[index + 1] : fallback;
};
const timeoutMs = Number(getArg('timeout-ms', '180000'));
const outputDir = path.resolve(getArg('output-dir', path.join(webDir, 'test-results/memory-search')));
const embeddingModels = getArg('embedding-models');
const executablePath = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((candidate) => existsSync(candidate));

const evidence = { startedAt: new Date().toISOString(), node: process.version, browserExecutable: executablePath, checks: [], screenshots: [], operations: [], pageErrors: [], failures: [] };
const check = (id, condition, message, details = undefined) => {
  evidence.checks.push({ id, pass: Boolean(condition), message, ...(details === undefined ? {} : { details }) });
  if (!condition) throw Object.assign(new Error(`${id}: ${message}`), { details });
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (description, fn, timeout = timeoutMs) => {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try { const value = await fn(); if (value) return value; } catch (error) { lastError = error; }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};
const choosePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
});
const run = (command, args, options) => new Promise((resolve, reject) => {
  const log = createWriteStream(options.logPath, { flags: 'a' });
  const child = spawn(command, args, { cwd: options.cwd, env: options.env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log);
  child.once('error', reject);
  child.once('close', (code) => { log.end(); code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited ${code}`)); });
});
const startService = (command, args, options) => {
  const log = createWriteStream(options.logPath, { flags: 'a' });
  const child = spawn(command, args, { cwd: options.cwd, env: options.env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log);
  return child;
};
const stop = async (child) => {
  if (!child || child.exitCode !== null) return;
  try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already gone */ }
  await Promise.race([new Promise((resolve) => child.once('close', resolve)), sleep(8000)]);
  if (child.exitCode === null) try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ }
};
const fetchOk = async (url) => { try { return (await fetch(url, { signal: AbortSignal.timeout(4000) })).ok; } catch { return false; } };

/* ------------------------------------------------------------------ the memory fixture (hand-written) */

let counter = 0;
const turnsToRecords = (turns) => turns.flatMap((turn, index) => {
  const base = Date.parse(`${turn.day}T09:00:00Z`) / 1000 + index * 30;
  // One turn ID for the turn's records, so the journal pairs each call with its result.
  const turnId = `turn_${counter + 1}`;
  const record = (offset, fields) => { counter += 1; return { id: `pr_${String(counter).padStart(7, '0')}`, seq: counter, ts: base + offset, turn_id: turnId, ...fields }; };
  const callId = `call_${counter + 2}`;
  return [
    record(0, { trace_type: 'user', content: turn.user }),
    ...(turn.command ? [
      record(1, { trace_type: 'tool_call', tool_name: 'Bash', tool_call_id: callId, tool_args: { command: turn.command } }),
      record(2, { trace_type: 'tool_result', tool_name: 'Bash', tool_call_id: callId, tool_result: turn.output ?? 'ok' }),
    ] : []),
    record(3, { trace_type: 'assistant', content: turn.agent }),
  ];
});
const writeRun = async (memoryDir, relPath, turns) => {
  const runDir = path.join(memoryDir, relPath);
  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(path.join(runDir, 'raw_traces_active.jsonl'), turnsToRecords(turns).map((r) => `${JSON.stringify(r)}\n`).join(''));
};
const filler = (day, count, topic) => Array.from({ length: count }, (_, i) => ({
  day, user: `Check step ${i + 1} of the ${topic} checklist and keep the notes short.`,
  command: `ls -la notes/${topic}-${i + 1}`, output: `notes/${topic}-${i + 1}.md\nnotes/${topic}-${i + 1}.log`,
  agent: `Step ${i + 1} of the ${topic} checklist is done; nothing unusual.`,
}));
const writeFixture = async (memoryDir) => {
  await writeRun(memoryDir, 'agents/codex_ddns_45ce', [
    ...filler('2026-08-25', 6, 'router'),
    { day: '2026-08-26', user: 'Set up a DDNS updater for home.example.org so the domain follows our home IP.', command: 'crontab -l', output: '*/5 * * * * /opt/ddns/update.sh home.example.org', agent: 'The DDNS updater runs every 5 minutes from /opt/ddns/update.sh and updates home.example.org to 203.0.113.7.' },
    ...filler('2026-08-27', 4, 'router'),
    { day: '2026-08-27', user: 'Is the domain updater still running after the reboot?', command: 'systemctl status ddns-update.timer', output: 'active (waiting)', agent: 'Yes, the ddns-update timer survived the reboot.' },
  ]);
  // A long run: a file over 5,000 lines, over several days.
  await writeRun(memoryDir, 'agents/researcher_long_6a02', [
    ...filler('2026-09-01', 450, 'migration'),
    ...filler('2026-09-02', 450, 'migration'),
    { day: '2026-09-03', user: 'Summarize why the bunny and tortoise game uses a fixed time step.', agent: 'A fixed time step keeps the race fair on slow machines.' },
    ...filler('2026-09-03', 200, 'migration'),
  ]);
  await writeRun(memoryDir, 'agents/daily_zh_77ae', [
    { day: '2026-08-20', user: '帮我设置域名自动更新，家里的 IP 变了以后域名也要跟着变。', agent: '已经设置好域名自动更新脚本，每五分钟检查一次。' },
  ]);
  // An old-format team folder no record names: the index knows it only by its folder.
  await writeRun(memoryDir, 'agent_teams/old_team_x/member_writer', [
    { day: '2026-07-01', user: 'Draft the cloudflare tunnel notes for the release.', agent: 'The cloudflare tunnel notes are in docs/tunnel.md.' },
  ]);
};

/* ------------------------------------------------------------------ the probe */

let ownedRoot; let backend; let frontend; let browser;
const operationNames = (request) => {
  if (!request.url().includes('/graphql') || request.method() !== 'POST') return [];
  try { const body = request.postDataJSON(); return (Array.isArray(body) ? body : [body]).map((e) => e?.operationName ?? 'unknown'); } catch { return []; }
};

const shot = async (page, name) => {
  const file = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: file });
  evidence.screenshots.push(file);
};

await fs.mkdir(outputDir, { recursive: true });
let result = 'Fail';
try {
  check('MS-PROBE-000', existsSync(path.join(serverDir, 'dist/app.js')), 'Built server entry exists (run pnpm -C autobyteus-server-ts build first)');
  check('MS-PROBE-001', Boolean(executablePath), 'A Chrome executable is available');
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-memory-search-probe-'));
  const dataRoot = path.join(ownedRoot, 'server-data');
  const memoryDir = path.join(dataRoot, 'memory');
  await writeFixture(memoryDir);
  if (embeddingModels) await fs.cp(path.resolve(embeddingModels), path.join(dataRoot, 'embeddings', 'models'), { recursive: true });
  const databasePath = path.join(dataRoot, 'db', 'probe.db');
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  for (const dir of ['logs', 'temp_workspace']) await fs.mkdir(path.join(dataRoot, dir), { recursive: true });
  const [backendPort, frontendPort] = await Promise.all([choosePort(), choosePort()]);
  const backendUrl = `http://127.0.0.1:${backendPort}`;
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const databaseUrl = pathToFileURL(databasePath).href;
  const serverEnv = {
    PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
    APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl, AUTOBYTEUS_SERVER_HOST: backendUrl,
    AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'), AUTOBYTEUS_MEMORY_DIR: memoryDir,
    AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'), AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '',
  };
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${databaseUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`);
  await run('pnpm', ['-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: workspaceDir, env: serverEnv, logPath: path.join(outputDir, 'database-migrate.log') });
  backend = startService(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], { cwd: serverDir, env: serverEnv, logPath: path.join(outputDir, 'backend.log') });
  await waitFor('backend health', () => fetchOk(`${backendUrl}/rest/health`));
  frontend = startService('pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], {
    cwd: webDir, env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NODE_ENV: 'development', NUXT_TEST: 'true', BACKEND_NODE_BASE_URL: backendUrl },
    logPath: path.join(outputDir, 'frontend.log'),
  });
  await waitFor('frontend readiness', () => fetchOk(`${frontendUrl}/memory`), 300_000);

  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-GB', timezoneId: 'UTC' });
  const page = await context.newPage();
  page.on('pageerror', (error) => evidence.pageErrors.push(String(error)));
  page.on('request', (request) => { for (const name of operationNames(request)) evidence.operations.push(name); });
  const goto = async (query) => { await page.goto(`${frontendUrl}/memory${query}`, { waitUntil: 'domcontentloaded' }); };
  const text = async (selector) => (await page.locator(selector).first().textContent())?.trim() ?? '';

  // Not indexed: Search is disabled and offers Index now; the Index tab shows four waiting steps.
  await goto('?view=home&section=search');
  await page.locator('[data-test="memory-search-not-indexed"]').waitFor({ timeout: timeoutMs });
  check('MS-PROBE-010', await page.locator('[data-test="memory-search-input"]').isDisabled(), 'Search box disabled before the index has content');
  await shot(page, 'VIS-010-search-not-indexed-1440x900');
  await page.locator('[data-test="memory-section-index"]').click();
  await page.locator('[data-test="memory-index-first-time"]').waitFor();
  const waiting = await page.locator('[data-step]').evaluateAll((items) => items.map((item) => item.getAttribute('data-state')));
  check('MS-PROBE-011', waiting.join() === 'waiting,waiting,waiting,waiting', 'Four waiting steps before the first build', waiting);
  check('MS-PROBE-012', !evidence.operations.includes('StartMemoryIndexing'), 'Nothing starts a build before the click');
  await shot(page, 'VIS-011-index-first-time-1440x900');

  // Index now: the steps run in order to Up to date (the Meaning index may still embed in the background).
  await page.locator('[data-test="memory-index-now"]').click();
  await waitFor('a running or finished build', async () => (await text('[data-test="memory-index-status"]')) !== 'Not indexed yet');
  await shot(page, 'VIS-012-index-building-1440x900');
  await waitFor('Up to date', async () => (await text('[data-test="memory-index-status"]')) === 'Up to date', 600_000);
  const done = await page.locator('[data-step]').evaluateAll((items) => items.map((item) => item.getAttribute('data-state')));
  check('MS-PROBE-013', done.join() === 'done,done,done,done', 'All four steps done', done);
  check('MS-PROBE-014', /4 runs/.test(await text('[data-test="memory-index-detail"]')), 'The ready headline counts the 4 runs');
  const bars = await page.locator('[role="progressbar"]').evaluateAll((items) => items.map((item) => item.getAttribute('aria-valuenow')));
  check('MS-PROBE-015', bars.join() === '100,100,100,100', 'Every step bar is full when up to date', bars);
  await sleep(500); // the bars' 300 ms width transition
  await shot(page, 'VIS-014-index-ready-1440x900');

  // Search: results one per run, the matches with lines, kind and strength; the DDNS run first.
  await page.locator('[data-test="memory-section-search"]').click();
  await page.locator('[data-test="memory-search-input"]').fill('DDNS updater for the home domain');
  await page.locator('[data-test="memory-search-input"]').press('Enter');
  await page.locator('[data-test="memory-result"]').first().waitFor();
  const first = await page.locator('[data-test="memory-result"]').first().textContent();
  check('MS-PROBE-020', first.includes('codex_ddns_45ce'), 'The DDNS run is the first result', first);
  check('MS-PROBE-021', /Words|Meaning/.test(first) && /Strong|Fair|Weak/.test(first) && /lines \d+–\d+/.test(first), 'A match shows its kind, strength and lines', first);
  check('MS-PROBE-022', (await page.url()).includes('q=DDNS'), 'The cue is in the address');
  await shot(page, 'VIS-006-search-results-1440x900');

  // Chinese cue (AC-004 on the page).
  await page.locator('[data-test="memory-search-input"]').fill('域名 自动更新');
  await page.locator('[data-test="memory-search-input"]').press('Enter');
  await waitFor('the Chinese result', async () => (await page.locator('[data-test="memory-result"]').first().textContent())?.includes('daily_zh_77ae'));
  check('MS-PROBE-023', true, 'A Chinese cue finds the Chinese run');

  // An off-topic cue: weak or no matches, said honestly; never "nothing in memory".
  await page.locator('[data-test="memory-search-input"]').fill('purple elephant saxophone');
  await page.locator('[data-test="memory-search-input"]').press('Enter');
  await waitFor('a weak or none note', async () => (await page.locator('[data-test="memory-search-weak"], [data-test="memory-search-none"]').count()) > 0);
  check('MS-PROBE-024', !/nothing in memory/i.test(await page.locator('[data-test="memory-search-results"]').textContent()), 'Never says nothing is in memory');
  await shot(page, 'VIS-007-search-weak-or-none-1440x900');

  // Open a result at its lines: banner, highlighted lines, Back to the same results.
  await page.locator('[data-test="memory-search-input"]').fill('DDNS updater for the home domain');
  await page.locator('[data-test="memory-search-input"]').press('Enter');
  await page.locator('[data-test="memory-match"]').first().waitFor();
  await page.locator('[data-test="memory-match"]').first().click();
  await page.locator('[data-test="work-journal-found"]').waitFor();
  const highlighted = await page.locator('[data-line].bg-amber-50').count();
  check('MS-PROBE-030', highlighted > 0, 'The matched lines are highlighted', highlighted);
  check('MS-PROBE-031', (await page.locator('[role="tab"]').allTextContents()).join('|') === 'Work Journal|Raw Traces', 'The run detail has Work Journal and Raw Traces tabs');
  await shot(page, 'VIS-017-work-journal-from-result-1440x900');
  await page.getByRole('button', { name: /Back to search results/ }).click();
  await page.locator('[data-test="memory-result"]').first().waitFor();
  check('MS-PROBE-032', (await page.locator('[data-test="memory-search-input"]').inputValue()) === 'DDNS updater for the home domain', 'Back returns to the same results');

  // Raw Traces: unchanged behavior.
  await page.locator('[data-test="memory-match"]').first().click();
  await page.locator('[data-test="work-journal-found"]').waitFor();
  await page.getByRole('tab', { name: 'Raw Traces' }).click();
  await waitFor('raw traces', async () => (await page.locator('text=raw_traces_active.jsonl').count()) > 0);
  await shot(page, 'VIS-019-raw-traces-1440x900');

  // A large file: Go to line reads a 300-line window; the large-file note shows.
  await page.locator('[data-test="memory-search-input"]').count();
  await goto('?view=home&section=search&q=bunny%20and%20tortoise');
  await page.locator('[data-test="memory-match"]').first().waitFor();
  await page.locator('[data-test="memory-result"]', { hasText: 'researcher_long_6a02' }).locator('[data-test="memory-match"]').first().click();
  await page.locator('[data-test="work-journal-lines"]').waitFor();
  await page.locator('[data-test="work-journal-line"]').fill('4000');
  await page.locator('[data-test="work-journal-line"]').press('Enter');
  await waitFor('the window around line 4000', async () => (await text('[data-test="work-journal-range"]')).startsWith('Lines 3,850–4,149'));
  check('MS-PROBE-040', (await page.locator('text=Large file: lines load in parts.').count()) === 1, 'The large-file note shows');
  await shot(page, 'VIS-018-work-journal-large-file-1440x900');
  await page.locator('[data-test="work-journal-later"]').click();
  await waitFor('300 later lines', async () => (await text('[data-test="work-journal-range"]')).startsWith('Lines 3,850–4,449'));

  // A run known only by its folder opens on its Work Journal.
  await goto('?view=home&section=search&q=cloudflare%20tunnel%20notes');
  await page.locator('[data-test="memory-result"]', { hasText: 'member_writer' }).locator('[data-test="memory-match"]').first().click();
  await page.locator('[data-test="work-journal-found"]').waitFor();
  check('MS-PROBE-050', (await page.locator('[role="tab"]').allTextContents()).join('|') === 'Work Journal', 'A folder-only run shows its Work Journal only');
  check('MS-PROBE-051', (await page.url()).includes('view=folder-inspector'), 'It opens through the run-folder route');

  // Browse: no availability badge while nothing is missing; one memory source, no selector.
  await goto('?view=home&section=browse&tab=agents');
  await page.locator('[data-test="memory-browse"] button', { hasText: 'Unattributed' }).first().waitFor();
  await shot(page, 'VIS-001-browse-agents-1440x900');

  // Narrow viewport.
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, 'VIS-021-browse-agents-390x844');
  await goto('?view=home&section=search&q=DDNS%20updater%20for%20the%20home%20domain');
  await page.locator('[data-test="memory-result"]').first().waitFor();
  await shot(page, 'VIS-022-search-results-390x844');
  await goto('?view=home&section=index');
  await page.locator('[data-test="memory-index-pipeline"]').waitFor();
  await shot(page, 'VIS-023-index-390x844');
  await goto('?view=home&section=search&q=DDNS%20updater%20for%20the%20home%20domain');
  await page.locator('[data-test="memory-match"]').first().click();
  await page.locator('[data-test="work-journal-found"]').waitFor();
  await shot(page, 'VIS-024-work-journal-from-result-390x844');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('MS-PROBE-060', overflow <= 0, 'No horizontal page overflow at 390 px', overflow);

  check('MS-PROBE-090', evidence.pageErrors.length === 0, 'No page errors', evidence.pageErrors);
  result = 'Pass';
} catch (error) {
  evidence.failures.push({ message: error.message, details: error.details, stack: error.stack });
} finally {
  await browser?.close().catch(() => undefined);
  await stop(frontend);
  await stop(backend);
  if (ownedRoot) await fs.rm(ownedRoot, { recursive: true, force: true }).catch(() => undefined);
  evidence.finishedAt = new Date().toISOString();
  evidence.result = result;
  await fs.writeFile(path.join(outputDir, 'memory-search-probe-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`memory-search probe: ${result} (${evidence.checks.filter((c) => c.pass).length} checks passed); evidence in ${outputDir}`);
  if (result !== 'Pass') { console.error(evidence.failures); process.exitCode = 1; }
}

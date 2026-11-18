#!/usr/bin/env node
// autobyteus-273 API/E2E temporary probe (API-11). Real stack: a backend built from this worktree (dist/app.js) on a
// probe-owned temp data root, Nuxt dev, headless Chrome, and real Claude-runtime turns on the operator's Claude
// subscription (cli mode; API billing is blocked by the test-vault key's credit balance, see the execution report).
// Journey:
//   P-01 run A, toggle never saved: spawned CLI has ENABLE_PROMPT_CACHING_1H=1; writes 1h.
//   P-02 Server Settings card: switched off by a click (saved false to .env).
//   P-03 run B, started after the click without restart: spawned CLI has no ENABLE_PROMPT_CACHING_1H.
//   P-04 card switched back on; run C in a workspace with .claude/settings.json {"promptCacheTtl":"5m"}: writes 5m.
//   P-05 Settings -> Token Statistics -> Run details: each run's cost breakdown shows its real split rows
//        ("Cache write 1h" / "Cache write 5m") with the streamed per-call token counts and a cost.
// Usage (from the worktree root): node <this file> --output-dir=<fresh dir> [--skip-server-build]
// Spend: three short Haiku turns on the subscription (plan usage, no API credits). Each run adds a session transcript
// under ~/.claude/projects/ (temp workspace path). Never touches ~/.autobyteus or ~/.claude settings.
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const webDir = path.join(root, 'autobyteus-web');
const serverDir = path.join(root, 'autobyteus-server-ts');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const WebSocket = require('ws');
const arg = (name, fallback) => process.argv.find(v => v.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const outputDir = path.resolve(arg('output-dir', path.join(os.tmpdir(), 'claude-cache-ttl-live-probe')));
const executablePath = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const KEY = 'CLAUDE_AGENT_SDK_ONE_HOUR_PROMPT_CACHE';
const MODEL = arg('model', 'haiku');
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', model: MODEL, cases: {}, runs: {}, breakdowns: {}, browserErrors: [], cleanup: {} };

const assert = (c, m) => { if (!c) throw new Error(m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (what, fn, ms = 60000) => {
  const deadline = Date.now() + ms; let last;
  while (Date.now() < deadline) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(250); }
  throw new Error(`Timed out waiting for ${what}${last ? `: ${last.message}` : ''}`);
};
const choosePort = () => new Promise((res, rej) => { const s = net.createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
const exited = c => c.exitCode !== null || c.signalCode !== null;
const start = (cmd, args, cwd, env, log) => { const out = createWriteStream(log, { flags: 'a' }); const c = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] }); c.stdout.pipe(out); c.stderr.pipe(out); c.once('close', () => out.end()); return c; };
const run = (cmd, args, cwd, env, log) => new Promise((res, rej) => { const c = start(cmd, args, cwd, env, log); c.once('error', rej); c.once('close', code => code === 0 ? res() : rej(new Error(`${cmd} ${args.join(' ')} exited ${code}; see ${log}`))); });
const stop = async c => { if (!c) return 'not-started'; for (const sig of ['SIGTERM', 'SIGKILL']) { if (exited(c)) break; try { process.kill(-c.pid, sig); } catch { /* gone */ } await Promise.race([new Promise(r => c.once('close', r)), sleep(8000)]); } return exited(c) ? `terminated:${c.pid}` : `still-running:${c.pid}`; };
// Minimal environment: no parent Claude Code session variables, no live-app variables, no keys.
const baseEnv = () => Object.fromEntries(['PATH', 'HOME', 'USER', 'LOGNAME', 'TMPDIR', 'LANG', 'SHELL'].filter(k => process.env[k] !== undefined).map(k => [k, process.env[k]]));

/** ENABLE_PROMPT_CACHING_1H of each Claude CLI process below `ancestorPid` (only that variable is read). */
const spawnedCliOneHourVariable = ancestorPid => {
  const table = spawnSync('ps', ['-A', '-o', 'pid=,ppid=,comm='], { encoding: 'utf-8' });
  const rows = table.stdout.split('\n').map(l => l.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/)).filter(Boolean).map(m => ({ pid: +m[1], ppid: +m[2], exe: m[3] }));
  const below = new Set([ancestorPid]);
  for (let grew = true; grew;) { grew = false; for (const r of rows) if (below.has(r.ppid) && !below.has(r.pid)) { below.add(r.pid); grew = true; } }
  return rows.filter(r => r.pid !== ancestorPid && below.has(r.pid) && /claude/i.test(path.basename(r.exe))).map(r => {
    const shown = spawnSync('ps', ['-E', '-ww', '-o', 'command=', '-p', String(r.pid)], { encoding: 'utf-8' });
    const entry = (shown.stdout || '').split(/\s+/).find(v => v.startsWith('ENABLE_PROMPT_CACHING_1H='));
    return { pid: r.pid, executable: r.exe, oneHourVariable: entry === undefined ? null : entry.slice('ENABLE_PROMPT_CACHING_1H='.length) };
  });
};

let page;
const shot = async name => page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: false });
const kase = async (id, title, body) => {
  try { await body(); evidence.cases[id] = { title, result: 'Pass' }; }
  catch (e) { evidence.cases[id] = { title, result: 'Fail', error: e.message }; await shot(`API-11-${id}-failure`).catch(() => undefined); }
  console.log(`${evidence.cases[id].result} ${id} ${title}${evidence.cases[id].error ? `: ${evidence.cases[id].error}` : ''}`);
  if (evidence.cases[id].result !== 'Pass') throw new Error(`stop after ${id}`);
};

let ownedRoot, backend, frontend, browser, url;
const workspaces = [];
const seenCliPids = new Set();
const gql = async (query, variables) => {
  const r = await fetch(`${url}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const j = await r.json(); if (!r.ok || j.errors?.length) throw new Error(JSON.stringify(j.errors ?? j)); return j.data;
};
const saveSetting = async (key, value) => { const d = await gql('mutation($key: String!, $value: String!) { updateServerSetting(key: $key, value: $value) }', { key, value }); assert(d.updateServerSetting.includes('updated successfully'), d.updateServerSetting); };
const newDefinition = async name => (await gql('mutation($input: CreateAgentDefinitionInput!) { createAgentDefinition(input: $input) { id } }', { input: { name, role: 'assistant', description: 'autobyteus-273 probe', category: 'runtime-e2e', toolNames: [], skillNames: [], instructions: 'You are a test agent. Do not use tools. Reply with exactly the word you are asked for and nothing else.' } })).createAgentDefinition.id;

/** One Claude-runtime run with one turn, through GraphQL + the agent WebSocket (the commands the app sends). */
const claudeRun = async (label, definitionName, word, projectSettings) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), `autobyteus-273-probe-${label}-`)); workspaces.push(workspace);
  if (projectSettings) { await fs.mkdir(path.join(workspace, '.claude')); await fs.writeFile(path.join(workspace, '.claude', 'settings.json'), JSON.stringify(projectSettings)); }
  const agentDefinitionId = await newDefinition(definitionName);
  const created = (await gql('mutation($input: CreateAgentRunInput!) { createAgentRun(input: $input) { success message runId } }', { input: { agentDefinitionId, workspaceRootPath: workspace, llmModelIdentifier: MODEL, autoExecuteTools: true, runtimeKind: 'claude_agent_sdk', llmConfig: null } })).createAgentRun;
  assert(created.success, created.message);
  const runId = created.runId; const messages = [];
  const socket = new WebSocket(`ws://127.0.0.1:${new URL(url).port}/ws/agent/${runId}`);
  socket.on('message', raw => { try { const m = JSON.parse(raw.toString()); if (typeof m.type === 'string') messages.push(m); } catch { /* ignore */ } });
  await new Promise((res, rej) => { socket.once('open', res); socket.once('error', rej); });
  await waitFor('CONNECTED', () => messages.some(m => m.type === 'CONNECTED'), 15000);
  const id = `probe-${Date.now()}`;
  const from = messages.length; // the connect-time status is idle too; only statuses after the send count
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `agent_run_input:probe:${id}`, context_file_paths: [], image_urls: [], content: `Reply with exactly the word ${word}.` } }));
  await waitFor(`run ${label} accepted`, () => messages.slice(from).some(m => m.type === 'AGENT_COMMAND_ACK' && m.payload?.accepted === true), 30000);
  await waitFor(`run ${label} idle`, () => {
    const err = messages.slice(from).find(m => m.type === 'ERROR'); if (err) throw new Error(`run ${label}: ${err.payload?.code}: ${err.payload?.message}`);
    const ack = messages.findIndex((m, i) => i >= from && m.type === 'AGENT_COMMAND_ACK');
    return messages.slice(ack + 1).some(m => m.type === 'AGENT_STATUS' && m.payload?.status === 'idle')
      && messages.slice(ack + 1).some(m => m.type === 'TOKEN_USAGE_UPDATED');
  }, 240000);
  // Only the CLI processes this run started (earlier runs keep their sessions alive).
  const spawnedCli = spawnedCliOneHourVariable(backend.pid).filter(p => !seenCliPids.has(p.pid));
  for (const p of spawnedCli) seenCliPids.add(p.pid);
  const calls = messages.filter(m => m.type === 'TOKEN_USAGE_UPDATED' && m.payload?.run_id === runId && m.payload?.ingestion_kind === 'claude_sdk_call').map(({ payload: p }) => ({
    model: p.model_identifier, input: p.reported_input_tokens, cacheRead: p.cache_read_input_tokens, cacheCreation: p.cache_creation_input_tokens,
    cacheCreation5m: p.cache_creation_5m_input_tokens, cacheCreation1h: p.cache_creation_1h_input_tokens, output: p.reported_output_tokens }));
  socket.close();
  const sum = k => calls.reduce((s, c) => s + (c[k] ?? 0), 0);
  const result = { runId, definitionName, workspace, projectSettings: projectSettings ?? null, calls, spawnedCli, written5m: sum('cacheCreation5m'), written1h: sum('cacheCreation1h'), cacheRead: sum('cacheRead') };
  evidence.runs[label] = result;
  assert(calls.length > 0 && calls.every(c => c.cacheCreation5m !== null && c.cacheCreation1h !== null), `run ${label}: calls with split ${JSON.stringify(calls)}`);
  return result;
};

try {
  await fs.mkdir(outputDir, { recursive: true });
  if (!process.argv.includes('--skip-server-build')) await run('corepack', ['pnpm', '-C', serverDir, 'build'], root, process.env, path.join(outputDir, 'server-build.log'));
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-273-probe-'));
  const dataRoot = path.join(ownedRoot, 'node');
  const dbPath = path.join(dataRoot, 'db', 'node.db');
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  for (const f of ['logs', 'memory', 'temp_workspace']) await fs.mkdir(path.join(dataRoot, f), { recursive: true });
  const port = await choosePort();
  url = `http://127.0.0.1:${port}`;
  const databaseUrl = pathToFileURL(dbPath).href;
  const env = { ...baseEnv(), AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: '', AUTOBYTEUS_SKILLS_PATHS: '',
    APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl, AUTOBYTEUS_SERVER_HOST: url, AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace') };
  await fs.writeFile(path.join(dataRoot, '.env'), ['APP_ENV=development', 'DB_TYPE=sqlite', `DATABASE_URL=${databaseUrl}`, `AUTOBYTEUS_SERVER_HOST=${url}`].join('\n') + '\n');
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], root, env, path.join(outputDir, 'migrate.log'));
  backend = start(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataRoot], serverDir, env, path.join(outputDir, 'backend.log'));
  await waitFor('backend', async () => { if (exited(backend)) throw new Error('backend exited'); return fetch(`${url}/rest/health`).then(r => r.ok).catch(() => false); }, 120000);
  const fePort = await choosePort();
  const feUrl = `http://127.0.0.1:${fePort}`;
  evidence.isolation = { tempRoot: ownedRoot, backend: url, frontend: feUrl, backendPid: backend.pid, authMode: 'cli (subscription)' };
  frontend = start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(fePort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: url }, path.join(outputDir, 'frontend.log'));
  await waitFor('frontend', async () => { if (exited(frontend)) throw new Error('frontend exited'); return fetch(feUrl).then(r => r.ok).catch(() => false); }, 240000);
  browser = await chromium.launch({ headless: true, executablePath, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 }, locale: 'en-US' });
  await context.addInitScript(() => { if (!localStorage.getItem('autobyteus.localization.preference-mode')) localStorage.setItem('autobyteus.localization.preference-mode', 'en'); });
  page = await context.newPage();
  page.on('pageerror', e => evidence.browserErrors.push(e.message));
  const envFile = () => fs.readFile(path.join(dataRoot, '.env'), 'utf8');
  const toggle = () => page.locator('[data-testid="claude-runtime-one-hour-cache-toggle"]');
  const openBasics = async () => {
    await page.goto(`${feUrl}/settings?section=server-settings&mode=quick`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="claude-runtime-card"]').waitFor({ timeout: 180000 });
    await sleep(1500);
  };
  await openBasics(); await openBasics(); // warm-up: cold Nuxt re-optimizes dependencies once

  await kase('P-01', 'Run A, toggle never saved: spawned CLI has the variable; writes 1h', async () => {
    assert(!(await envFile()).includes(KEY), 'setting already saved');
    assert(await toggle().getAttribute('aria-checked') === 'true', 'card not on by default');
    const a = await claudeRun('A', 'cache-ttl-probe-a-default-on', 'AMBER');
    assert(a.spawnedCli.length > 0 && a.spawnedCli.every(p => p.oneHourVariable === '1'), `spawned CLI ${JSON.stringify(a.spawnedCli)}`);
    assert(a.written1h > 0 && a.written5m === 0, `A writes 5m=${a.written5m} 1h=${a.written1h}`);
  });
  await kase('P-02', 'Card switched off by a click: saved false, switch off', async () => {
    await toggle().click();
    await waitFor('saved false', async () => (await envFile()).includes(`${KEY}=false`));
    await waitFor('switch off', async () => (await toggle().getAttribute('aria-checked')) === 'false');
    await sleep(600);
    await page.locator('[data-testid="claude-runtime-card"]').screenshot({ path: path.join(outputDir, 'API-11-P-02-card-off.png') });
  });
  await kase('P-03', 'Run B after the click, no restart: spawned CLI has no variable', async () => {
    const b = await claudeRun('B', 'cache-ttl-probe-b-card-off', 'COBALT');
    assert(b.spawnedCli.length > 0 && b.spawnedCli.every(p => p.oneHourVariable === null), `spawned CLI ${JSON.stringify(b.spawnedCli)}`);
    assert(b.written1h + b.written5m > 0, 'B wrote nothing');
  });
  await kase('P-04', 'Card on again; run C with workspace promptCacheTtl 5m: variable present, writes 5m', async () => {
    await toggle().click();
    await waitFor('saved true', async () => (await envFile()).includes(`${KEY}=true`));
    await waitFor('switch on', async () => (await toggle().getAttribute('aria-checked')) === 'true');
    const c = await claudeRun('C', 'cache-ttl-probe-c-ttl-5m', 'DENIM', { promptCacheTtl: '5m' });
    assert(c.spawnedCli.length > 0 && c.spawnedCli.every(p => p.oneHourVariable === '1'), `spawned CLI ${JSON.stringify(c.spawnedCli)}`);
    assert(c.written5m > 0 && c.written1h === 0, `C writes 5m=${c.written5m} 1h=${c.written1h}`);
  });
  await kase('P-05', 'Token Statistics run details: each run shows its real split rows with tokens and cost', async () => {
    await page.goto(`${feUrl}/settings?section=token-usage`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'Run details' }).click();
    // The default range ends today, and the server reads that end date as today's 00:00 UTC (inclusive), so runs
    // created today are not listed (pre-existing, follow-up FU-005). End the range tomorrow, as a user would.
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    await page.locator('#token-usage-end-date').fill(tomorrow);
    await page.getByRole('button', { name: /Fetch statistics/i }).click();
    const fmt = n => new Intl.NumberFormat('en-US').format(n);
    for (const [label, expectRows] of [['A', ['Cache write 1h']], ['B', null], ['C', ['Cache write 5m']]]) {
      const r = evidence.runs[label];
      const row = page.locator('tbody tr', { hasText: r.definitionName }).first();
      await row.waitFor({ timeout: 60000 });
      const button = row.locator('button:has([data-cost-detail-indicator])');
      if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
      const detail = page.locator(`#${await button.getAttribute('aria-controls')}`);
      await detail.waitFor();
      const rows = await detail.locator('table').first().locator('tbody tr').evaluateAll(trs => trs.map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.trim())));
      evidence.breakdowns[label] = rows;
      const byLabel = Object.fromEntries(rows.map(([l, t, c]) => [l, { tokens: t, cost: c }]));
      const want = expectRows ?? [r.written1h > 0 ? 'Cache write 1h' : 'Cache write 5m'];
      for (const name of want) {
        const expected = name.endsWith('1h') ? r.written1h : r.written5m;
        assert(byLabel[name], `run ${label}: no "${name}" row in ${JSON.stringify(rows)}`);
        assert(byLabel[name].tokens === fmt(expected), `run ${label}: "${name}" tokens ${byLabel[name].tokens} != ${fmt(expected)}`);
        assert(/\d/.test(byLabel[name].cost), `run ${label}: "${name}" cost ${byLabel[name].cost}`);
      }
      assert(!byLabel['Cache writes'], `run ${label}: unexpected unsplit "Cache writes" row ${JSON.stringify(rows)}`);
      await detail.screenshot({ path: path.join(outputDir, `API-11-P-05-breakdown-run-${label}.png`) });
    }
    await shot('API-11-P-05-run-details');
  });
  evidence.result = Object.values(evidence.cases).every(c => c.result === 'Pass') && Object.keys(evidence.cases).length === 5 && !evidence.browserErrors.length ? 'Pass' : 'Fail';
} catch (e) {
  evidence.error = e.stack || e.message; console.error(e.message);
} finally {
  for (const r of Object.values(evidence.runs)) await gql('mutation($id: String!) { terminateAgentRun(agentRunId: $id) { success } }', { id: r.runId }).catch(() => undefined);
  evidence.cleanup.browser = browser ? await browser.close().then(() => 'closed', e => e.message) : 'not-started';
  evidence.cleanup.frontend = await stop(frontend).catch(e => e.message);
  evidence.cleanup.backend = await stop(backend).catch(e => e.message);
  evidence.cleanup.spawnedCliLeft = backend ? spawnedCliOneHourVariable(backend.pid).length : 0;
  if (ownedRoot) evidence.cleanup.tempRoot = await fs.rm(ownedRoot, { recursive: true, force: true }).then(() => 'removed', e => e.message);
  evidence.cleanup.workspaces = await Promise.all(workspaces.map(w => fs.rm(w, { recursive: true, force: true }).then(() => 'removed', e => e.message)));
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(evidence, null, 2));
  console.log(`Result: ${evidence.result}`);
  process.exitCode = evidence.result === 'Pass' ? 0 : 1;
}

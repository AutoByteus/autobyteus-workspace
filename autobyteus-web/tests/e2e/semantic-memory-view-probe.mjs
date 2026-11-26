#!/usr/bin/env node
// Memory page probe (autobyteus-554, semantic-memory-view-554): the real server and the real page against a
// probe-written data root (never a user's data). Browse by owner, an agent's page (Episodic, Semantic), a team page
// (Members), the read-only semantic memory folder view (files, preview, links listed and never opened, no edit, no
// menu), Global, the missing state, the narrow layout and zh-CN; the node never lists the view's workspace. It takes
// the screenshots the UI/UX spec's VIS references show (desktop 1440×900, narrow 390×844). Since autobyteus-652 (the
// approved autobyteus-608 layout) also, at 1440×900: content tops, the reader filling the window, reader type, the list's
// width and icons, Copy folder path on the clipboard, a 40-character read-only tab (SMV-110…119); the agent's name whole
// beside its subtitle at 1440 and 1280 px (SMV-120); the Episodic cards inside a 390 px window (SMV-121); the name visible
// at 1024 px (SMV-122).
//
//   pnpm -C autobyteus-server-ts build
//   node autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs --browser-executable <chrome> [--output-dir <dir>]
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { attachToBrowserContext, attachToProbeProcess, ownerHeaders, withNodeCredential } from './fixtures/probe-node-access.mjs';
attachToProbeProcess();

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
const outputDir = path.resolve(getArg('output-dir', path.join(webDir, 'test-results/semantic-memory-view')));
const executablePath = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((candidate) => existsSync(candidate));

const evidence = { startedAt: new Date().toISOString(), node: process.version, browserExecutable: executablePath, checks: [], screenshots: [], operations: [], pageErrors: [], failures: [] };
const check = (id, condition, message, details = undefined) => {
  evidence.checks.push({ id, pass: Boolean(condition), message, ...(details === undefined ? {} : { details }) });
  if (!condition) throw Object.assign(new Error(`${id}: ${message}`), { details });
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const LONG_TAB_NAME = 'deployment-checklist-and-rollback-pla.md'; // 40 characters (autobyteus-652 AC-005)
const LONG_WORKSPACE = '/Users/someone/projects/autobyteus-worktrees/a-long-workspace-folder-name/launch-app';
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

/* ------------------------------------------------------------------ the data root (hand-written) */

const AGENT_ID = 'probe-researcher';
const AGENT_NAME = 'Research Assistant';
const TEAM_ID = 'probe-product-team';
// SR-009 (AC-013): a team whose folder name makes its team-local member's ID too long for one file name when encoded.
// The folder name itself stays within the 255-byte file name limit (246 bytes); the member's encoded ID is 274 bytes.
const LONG_TEAM_ID = `probe-${'long-archive-team-'.repeat(13)}folder`;
const LONG_TEAM_NAME = 'Long Archive Team';
const writeAgent = async (dir, name, description) => {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'agent.md'), `---\nname: ${name}\ndescription: ${description}\nrole: assistant\n---\n\nHelp the user.\n`);
  await fs.writeFile(path.join(dir, 'agent-config.json'), `${JSON.stringify({ toolNames: [], skillNames: [] }, null, 2)}\n`);
};
const writeRun = async (memoryDir, runId, startedAt, MetadataStore, workspaceRootPath = '/work/launch') => {
  const runDir = path.join(memoryDir, 'agents', runId);
  await fs.mkdir(runDir, { recursive: true });
  const ts = Date.parse(startedAt) / 1000;
  const records = [
    { id: 'pr_0000001', seq: 1, ts, turn_id: 'turn_1', trace_type: 'user', content: 'Summarize the launch notes.' },
    { id: 'pr_0000002', seq: 2, ts: ts + 5, turn_id: 'turn_1', trace_type: 'assistant', content: 'The launch notes are summarized.' },
  ];
  await fs.writeFile(path.join(runDir, 'raw_traces_active.jsonl'), records.map((record) => `${JSON.stringify(record)}\n`).join(''));
  await new MetadataStore(memoryDir).writeMetadata(runId, {
    runId, agentDefinitionId: AGENT_ID, workspaceRootPath, memoryDir: runDir, llmModelIdentifier: 'probe-model',
    llmConfig: null, autoExecuteTools: false, runtimeKind: 'autobyteus', platformAgentRunId: null, startedAt,
  });
};
const writeDataRoot = async (dataRoot, outsideDir) => {
  const memoryDir = path.join(dataRoot, 'memory');
  await writeAgent(path.join(dataRoot, 'agents', AGENT_ID), AGENT_NAME, 'Researches and writes notes');
  const team = path.join(dataRoot, 'agent-teams', TEAM_ID);
  await fs.mkdir(team, { recursive: true });
  await fs.writeFile(path.join(team, 'team.md'), '---\nname: Product Review Team\ndescription: Reviews product notes\n---\n\nReview.\n');
  await fs.writeFile(path.join(team, 'team-config.json'), JSON.stringify({ coordinatorMemberName: 'reviewer', members: [
    { memberName: 'reviewer', ref: 'reviewer', refScope: 'team_local' },
    { memberName: 'writer', ref: AGENT_ID, refScope: 'shared' },
  ], handoffs: [], avatarUrl: null }, null, 2));
  await writeAgent(path.join(team, 'agents', 'reviewer'), 'Reviewer', 'Reviews notes');
  const longTeam = path.join(dataRoot, 'agent-teams', LONG_TEAM_ID);
  await fs.mkdir(longTeam, { recursive: true });
  await fs.writeFile(path.join(longTeam, 'team.md'), `---\nname: ${LONG_TEAM_NAME}\ndescription: Keeps the archive\n---\n\nArchive.\n`);
  await fs.writeFile(path.join(longTeam, 'team-config.json'), JSON.stringify({ coordinatorMemberName: 'scribe', members: [
    { memberName: 'scribe', ref: 'scribe', refScope: 'team_local' },
  ], handoffs: [], avatarUrl: null }, null, 2));
  await writeAgent(path.join(longTeam, 'agents', 'scribe'), 'Scribe', 'Keeps the archive notes');
  // Its semantic folder, named by the server's own rule (the built layout), never computed here.
  const { AgentMemoryLayout } = await import(pathToFileURL(path.join(serverDir, 'dist/agent-memory/store/agent-memory-layout.js')).href);
  const { buildTeamLocalAgentDefinitionId } = await import(pathToFileURL(path.join(serverDir, 'dist/agent-team-definition/utils/team-local-definition-id.js')).href);
  const longId = buildTeamLocalAgentDefinitionId(LONG_TEAM_ID, 'scribe');
  const longFolder = new AgentMemoryLayout(memoryDir).getAgentSemanticMemoryDirPath(longId);
  await fs.mkdir(longFolder, { recursive: true });
  // autobyteus-576 FU-002: relative links, to a file of the folder (with a fragment), to a missing one and out of it.
  await fs.writeFile(path.join(longFolder, 'notes.md'), '# Archive notes\n\nThe long team keeps its notes here.\n\n'
    + '- [The 2026 archive](archive/2026.md#q1)\n- [An old page](old-page.md)\n- [Outside the folder](../../outside.md)\n');
  await fs.mkdir(path.join(longFolder, 'archive'), { recursive: true });
  await fs.writeFile(path.join(longFolder, 'archive', '2026.md'), '# 2026 archive\n\nQ1 closed the launch.\n');
  const { AgentRunMetadataStore } = await import(pathToFileURL(path.join(serverDir, 'dist/run-history/store/agent-run-metadata-store.js')).href);
  await writeRun(memoryDir, 'probe_researcher_run_1', '2026-11-18T09:00:00Z', AgentRunMetadataStore);
  // A workspace path as long as real ones are (autobyteus-652 SMV-121: a card's one-line path must not widen the page).
  await writeRun(memoryDir, 'probe_researcher_run_2', '2026-11-19T10:30:00Z', AgentRunMetadataStore, LONG_WORKSPACE);
  // The agent's semantic memory: nested files, a link to a file and one to a folder outside it.
  const folder = path.join(memoryDir, 'semantic', AGENT_ID);
  await fs.mkdir(path.join(folder, 'sites', 'linkedin'), { recursive: true });
  await fs.writeFile(path.join(folder, 'sites', 'linkedin', 'controls.md'), '# LinkedIn controls\n\nThe **post** button is at the top right.\n');
  await fs.writeFile(path.join(folder, 'research-method.md'), '# Research method\n\n1. Read the sources.\n2. Write the notes.\n\n## Sources\n\nPrimary sources first, then the summaries.\n');
  // autobyteus-652 AC-005: a 40-character name for the read-only tab.
  await fs.writeFile(path.join(folder, 'sites', LONG_TAB_NAME), '# Deployment checklist\n\nRoll back when the health check fails.\n');
  await fs.mkdir(outsideDir, { recursive: true });
  await fs.writeFile(path.join(outsideDir, 'secret.md'), 'secret outside the folder\n');
  await fs.symlink(outsideDir, path.join(folder, 'shared'));
  await fs.symlink(path.join(outsideDir, 'secret.md'), path.join(folder, 'secret-link.md'));
  // The node's global semantic memory.
  await fs.mkdir(path.join(memoryDir, 'semantic-global'), { recursive: true });
  await fs.writeFile(path.join(memoryDir, 'semantic-global', 'product.md'), '# Product\n\nAutoByteus runs agents on your own nodes.\n');
  return { memoryDir, folder, longId, longFolder };
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
const treeHash = async (root) => {
  const out = {};
  const walk = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) out[path.relative(root, full)] = `link:${await fs.readlink(full)}`;
      else if (entry.isDirectory()) await walk(full);
      else out[path.relative(root, full)] = await fs.readFile(full, 'utf8');
    }
  };
  await walk(root);
  return JSON.stringify(Object.entries(out).sort());
};

await fs.mkdir(outputDir, { recursive: true });
let result = 'Fail';
try {
  check('SMV-000', existsSync(path.join(serverDir, 'dist/app.js')), 'Built server entry exists (run pnpm -C autobyteus-server-ts build first)');
  check('SMV-001', Boolean(executablePath), 'A Chrome executable is available');
  ownedRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-semantic-memory-view-probe-')));
  const dataRoot = path.join(ownedRoot, 'server-data');
  const outsideDir = path.join(ownedRoot, 'outside');
  const { memoryDir, folder, longId, longFolder } = await writeDataRoot(dataRoot, outsideDir);
  const before = { agent: await treeHash(folder), global: await treeHash(path.join(memoryDir, 'semantic-global')), outside: await treeHash(outsideDir), long: await treeHash(longFolder) };
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
    AUTOBYTEUS_ALLOWED_ORIGINS: frontendUrl,
    AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'), AUTOBYTEUS_MEMORY_DIR: memoryDir,
    AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'), AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '',
  };
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${databaseUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`);
  await run('pnpm', ['-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: workspaceDir, env: serverEnv, logPath: path.join(outputDir, 'database-migrate.log') });
  backend = startService(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], { cwd: serverDir, env: withNodeCredential(serverEnv), logPath: path.join(outputDir, 'backend.log') });
  await waitFor('backend health', () => fetchOk(`${backendUrl}/rest/health`));
  frontend = startService('pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], {
    cwd: webDir, env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NODE_ENV: 'development', NUXT_TEST: 'true', BACKEND_NODE_BASE_URL: backendUrl },
    logPath: path.join(outputDir, 'frontend.log'),
  });
  await waitFor('frontend readiness', () => fetchOk(`${frontendUrl}/memory`), 600_000);
  const graphql = async (query, variables = {}) => {
    const response = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: ownerHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ query, variables }) });
    return response.json();
  };

  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-GB', timezoneId: 'UTC' });
  await attachToBrowserContext(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => evidence.pageErrors.push(String(error)));
  page.on('request', (request) => { for (const name of operationNames(request)) evidence.operations.push(name); });
  const goto = async (query) => { await page.goto(`${frontendUrl}/memory${query}`, { waitUntil: 'domcontentloaded' }); };
  const text = async (selector) => (await page.locator(selector).first().textContent())?.trim() ?? '';
  // autobyteus-652 (the approved autobyteus-608 layout): where `selector` starts and ends in the window, and whether any
  // element holding it scrolls (a page scroll). Inner scrolling (the file list, the document) is not a page scroll.
  const placement = (selector) => page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const box = el.getBoundingClientRect();
    const pageScrolls = [document.scrollingElement, ...document.querySelectorAll('*')]
      .filter((node) => node && node !== el && node.contains(el))
      .filter((node) => node === document.scrollingElement || /(auto|scroll)/.test(getComputedStyle(node).overflowY))
      .some((node) => node.scrollHeight > node.clientHeight + 1);
    return { top: Math.round(box.top), bottom: Math.round(box.bottom), toWindowBottom: Math.round(innerHeight - box.bottom), width: Math.round(box.width), pageScrolls };
  }, selector);

  // UXJ-001: Browse opens on Agents; the tabs; the agent card (after the catalog's start pass).
  await goto('');
  await page.locator('[data-test="memory-browse-tab-agents"][aria-selected="true"]').waitFor({ timeout: timeoutMs });
  const tabs = await page.locator('[data-test^="memory-browse-tab-"]').allTextContents();
  check('SMV-010', tabs.map((tab) => tab.trim()).join(' · ') === 'Global · Agents · Agent Teams · Agent Orgs', 'Browse tabs in order', tabs);
  const agentCard = page.locator('[data-test="memory-owner-card"]', { hasText: AGENT_NAME });
  await waitFor('the agent card', async () => { if (await agentCard.count()) return true; await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(1500); return false; });
  check('SMV-011', !(await page.locator('[data-test="memory-browse"] input').count()), 'No list filter on Browse');
  check('SMV-012', !(await agentCard.textContent()).match(/\d+ runs/), 'An agent card shows no run count');
  await shot(page, 'VIS-001-browse-agents-cards-1440x900');

  // UXJ-003: the agent page, Episodic memory.
  await agentCard.click();
  await page.locator('[data-test="agent-memory-page"]').waitFor();
  await page.locator('[data-test="agent-episode"]').first().waitFor();
  check('SMV-020', (await text('[data-test="agent-memory-page"] h1')) === AGENT_NAME, 'The agent page heading');
  // autobyteus-608 DC-002: Back shows where it goes; "Back to …" is its accessible name.
  check('SMV-021', (await text('[data-test="memory-page-back"]')) === 'Memory' && (await page.locator('[data-test="memory-page-back"]').getAttribute('aria-label')) === 'Back to Memory', 'Back shows "Memory" (Back to Memory)');
  await waitFor('the agent subtitle', async () => (await text('[data-test="agent-memory-places"]')) === 'Also works in Product Review Team');
  check('SMV-022', (await page.locator('[data-test="agent-episode"]').count()) === 2, 'Two episodes');
  const firstEpisode = await placement('[data-test="agent-episode"]');
  check('SMV-117', firstEpisode && firstEpisode.top <= 90, 'AC-001 (autobyteus-652): the Episodic page\'s first card starts within 90 px of the top', firstEpisode);
  // autobyteus-652 AC-001: the page's own name stays whole beside its "Also works in …" subtitle at 1440×900 and 1280×800.
  const nameFits = async () => page.locator('[data-test="memory-page-header"] h1').first().evaluate((el) => ({ width: el.clientWidth, needs: el.scrollWidth, whole: el.scrollWidth <= el.clientWidth + 1 }));
  const nameAt1440 = await nameFits();
  await page.setViewportSize({ width: 1280, height: 800 });
  await sleep(600);
  const nameAt1280 = await nameFits();
  await page.setViewportSize({ width: 1440, height: 900 });
  await sleep(600);
  check('SMV-120', nameAt1440.whole && nameAt1280.whole, 'AC-001: the agent\'s name is whole beside its subtitle at 1440 and 1280 px', { nameAt1440, nameAt1280, subtitle: await text('[data-test="agent-memory-places"]') });
  // autobyteus-652 F-3: at a laptop width the header wraps rather than hide the name (spec Responsive: one row when it
  // fits, wraps otherwise): the name shows at least 120 px, or whole when it needs less.
  await page.setViewportSize({ width: 1024, height: 768 });
  await sleep(600);
  const nameAt1024 = await nameFits();
  await page.setViewportSize({ width: 1440, height: 900 });
  await sleep(600);
  check('SMV-122', nameAt1024.width >= Math.min(nameAt1024.needs, 120), 'AC-001 (Responsive): at 1024 px the agent\'s name stays visible (the header wraps instead)', nameAt1024);
  check('SMV-023', (await text('[data-test="agent-memory-tab-episodic"]')).includes('2'), 'The Episodic tab counts the episodes');
  await shot(page, 'VIS-004-agent-episodic-1440x900');

  // UXJ-003: Semantic memory: the folder view, read only.
  await page.locator('[data-test="agent-memory-tab-semantic"]').click();
  await page.locator('[data-test="semantic-memory-explorer"]').waitFor();
  // autobyteus-608 DC-004: no path bar; the real path is "Copy folder path"'s tooltip (TR-008).
  check('SMV-030', (await page.locator('[data-test="semantic-memory-copy-path"]').getAttribute('title')) === folder, 'The folder path', await page.locator('[data-test="semantic-memory-copy-path"]').getAttribute('title'));
  check('SMV-031', page.url().includes('pane=semantic'), 'The tab is in the address');
  const links = page.locator('[data-test="file-item-link"]');
  await links.first().waitFor();
  check('SMV-032', (await links.count()) === 2 && (await links.allTextContents()).every((row) => row.includes('Link · not opened')), 'Two link rows "Link · not opened"');
  const topRows = await page.locator('[data-test="semantic-memory-explorer"] .file-header').evaluateAll((rows) => rows.map((row) => row.textContent.replace(/Link · not opened/, '').trim()));
  check('SMV-039', JSON.stringify(topRows) === JSON.stringify(['sites', 'research-method.md', 'secret-link.md', 'shared']), 'Folders first, then files and links by name', topRows);
  // autobyteus-608 TR-004: the first file at the root, in the list's order and not a link, opens on arrival.
  await page.locator('text=Read the sources.').first().waitFor();
  check('SMV-033', (await text('[data-test="file-tab-name"]')) === 'research-method.md', 'The first root document opens on arrival', await text('[data-test="file-tab-name"]'));
  // autobyteus-652 at 1440×900: AC-001 the content's top, AC-002 the panel to the window bottom without a page scroll and
  // the reader's type, DC-004 the 300 px list, DC-011 every list icon drawn, TR-008 Copy folder path.
  const semanticPanel = await placement('[data-test="semantic-memory-explorer"]');
  check('SMV-110', semanticPanel && semanticPanel.top <= 90, 'AC-001: the agent page\'s content starts within 90 px of the top', semanticPanel);
  check('SMV-111', semanticPanel && semanticPanel.toWindowBottom >= 0 && semanticPanel.toWindowBottom <= 24 && !semanticPanel.pageScrolls, 'AC-002: the semantic panel ends within 24 px of the window bottom, no page scroll', semanticPanel);
  const readerType = await page.evaluate(() => {
    const body = document.querySelector('.semantic-memory-reader .markdown-body');
    const size = (sel) => (body?.querySelector(sel) ? getComputedStyle(body.querySelector(sel)).fontSize : null);
    return { h1: size('h1'), h2: size('h2'), body: body ? getComputedStyle(body).fontSize : null };
  });
  check('SMV-112', readerType.h1 === '22px' && readerType.h2 === '17.6px' && readerType.body === '14px', 'AC-002: reader type h1 22 px, h2 17.6 px, body 14 px', readerType);
  const listWidth = await page.evaluate(() => Math.round(document.querySelector('.semantic-memory-sidebar')?.getBoundingClientRect().width ?? 0));
  check('SMV-113', listWidth === 300, 'DC-004: the file list is 300 px wide at 1440 px', listWidth);
  const icons = await page.locator('[data-test="semantic-memory-explorer"] [data-test="file-item-icon"]').evaluateAll((nodes) => nodes.map((node) => {
    const svg = node.tagName.toLowerCase() === 'svg' ? node : node.querySelector('svg');
    return { svg: Boolean(svg), shapes: svg ? svg.querySelectorAll('path, rect, circle, polygon, polyline, line, ellipse').length : 0, width: Math.round(node.getBoundingClientRect().width) };
  }));
  check('SMV-114', icons.length > 0 && icons.every((icon) => icon.svg && icon.shapes > 0 && icon.width > 0)
    && !(await page.locator('[data-test="semantic-memory-explorer"] i.fab, [data-test="semantic-memory-explorer"] i.fas').count()), 'AC-005: every file-list icon is a drawn SVG (no blank font icon)', icons);
  const copyPath = page.locator('[data-test="semantic-memory-copy-path"]');
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: frontendUrl });
  await copyPath.click();
  const copiedAt = Date.now();
  await waitFor('"Copied"', async () => (await copyPath.innerText()).includes('Copied'), 3000);
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  await waitFor('"Copy folder path" again', async () => (await copyPath.innerText()).includes('Copy folder path'), 4000);
  const copiedFor = Date.now() - copiedAt;
  check('SMV-115', clipboard === folder && copiedFor >= 1200 && copiedFor <= 2600, 'TR-008: Copy folder path puts the real path on the clipboard and shows "Copied" for about 1.5 s', { clipboardIsFolder: clipboard === folder, copiedFor });
  const operationsBeforeLink = evidence.operations.length;
  await links.first().click();
  await links.first().click({ button: 'right' });
  await sleep(800);
  check('SMV-034', evidence.operations.length === operationsBeforeLink, 'A link row asks nothing of the node', evidence.operations.slice(operationsBeforeLink));
  check('SMV-035', !(await page.locator('[role="menu"], .context-menu').count()), 'No context menu on a link row');
  await page.locator('.file-header', { hasText: 'research-method.md' }).click();
  await page.locator('text=Read the sources.').first().waitFor();
  check('SMV-036', !(await page.locator('[title="Edit Mode"]').count()), 'Preview only: no Edit mode');
  await page.locator('.file-header', { hasText: 'research-method.md' }).click({ button: 'right' });
  await sleep(500);
  check('SMV-037', !(await page.locator('text=Rename').count()) && !(await page.locator('text=Delete').count()), 'No context menu on a file');
  await page.locator('.file-header', { hasText: 'sites' }).click();
  await page.locator('.file-header', { hasText: 'linkedin' }).click();
  await page.locator('.file-header', { hasText: 'controls.md' }).click();
  await page.locator('text=button is at the top right').first().waitFor();
  await shot(page, 'VIS-005-agent-semantic-links-file-open-1440x900');
  // autobyteus-652 AC-005 (DC-010): a read-only tab shows a 40-character name whole, up to 320 px, the name as its tooltip.
  await page.locator('[data-test="semantic-memory-explorer"] .file-header', { hasText: LONG_TAB_NAME }).click();
  await page.locator('text=Roll back when the health check fails.').first().waitFor();
  const longTab = await page.locator('[data-test="file-tab-name"]', { hasText: LONG_TAB_NAME }).first().evaluate((el) => ({
    width: Math.round(el.getBoundingClientRect().width), truncated: el.scrollWidth > el.clientWidth + 1, maxWidth: getComputedStyle(el).maxWidth,
    tooltip: el.getAttribute('title') ?? el.closest('[title]')?.getAttribute('title') ?? null,
  }));
  check('SMV-116', longTab.width <= 320 && !longTab.truncated && longTab.tooltip === LONG_TAB_NAME, 'AC-005: the 40-character read-only tab name is whole (≤ 320 px), its tooltip the name', longTab);
  const search = page.locator('[data-test="semantic-memory-explorer"] input').first();
  await search.fill('secret');
  await sleep(1500);
  check('SMV-038', !(await page.locator('[data-test="semantic-memory-explorer"] .file-header', { hasText: 'secret.md' }).count()), 'Search finds nothing through a link');
  await search.fill('controls');
  await page.locator('[data-test="semantic-memory-explorer"] .file-header', { hasText: 'controls.md' }).first().waitFor();
  await search.fill('');

  // AC-011: the node never lists the view's workspace; AC-006: writes refused, the folders byte-identical.
  const listed = await graphql('{ workspaces { workspaceId kind } }');
  check('SMV-040', !JSON.stringify(listed).includes('semantic'), 'The workspaces query lists no semantic memory workspace', listed);
  const write = await graphql(`mutation { writeFileContent(workspaceId: "semantic_ws_${AGENT_ID}", filePath: "research-method.md", content: "changed") }`);
  check('SMV-041', JSON.stringify(write).includes('WORKSPACE_READ_ONLY'), 'A write is refused', write);
  const contentOf = (file) => fetch(`${backendUrl}/rest/workspaces/semantic_ws_${AGENT_ID}/content?path=${encodeURIComponent(file)}`, { headers: ownerHeaders() });
  const regular = await contentOf('research-method.md');
  check('SMV-042', regular.status === 200, 'The content route serves a regular file of the folder', regular.status);
  const throughLink = await contentOf('shared/secret.md');
  check('SMV-043', throughLink.status === 403 && (await throughLink.json()).code === 'WORKSPACE_LINK_NOT_OPENED', 'A path through a link is refused by the content route', throughLink.status);

  // Narrow: the folder stacks below 768 px; short tab labels below 640 px.
  await page.setViewportSize({ width: 390, height: 844 });
  await sleep(800);
  // autobyteus-652 AC-001 (VIS-005): the Episodic cards stay inside a 390 px window with a long workspace path (it truncates).
  await page.locator('[data-test="agent-memory-tab-episodic"]').click();
  await page.locator('[data-test="agent-episode"]').first().waitFor();
  await sleep(600);
  const narrowCards = await page.evaluate(() => {
    const list = document.querySelector('[data-test="agent-episodes"]');
    const cards = [...document.querySelectorAll('[data-test="agent-episode"]')].map((card) => Math.round(card.getBoundingClientRect().right));
    const sideways = [document.scrollingElement, ...document.querySelectorAll('*')].filter((node) => node && node.contains(list))
      .some((node) => node.scrollWidth > node.clientWidth + 1 && (node === document.scrollingElement || /(auto|scroll)/.test(getComputedStyle(node).overflowX)));
    return { window: innerWidth, cardRights: cards, sideways };
  });
  await shot(page, 'SMV-121-agent-episodic-narrow-390x844');
  check('SMV-121', narrowCards.cardRights.every((right) => right <= narrowCards.window) && !narrowCards.sideways, 'AC-001 (VIS-005): the Episodic cards fit a 390 px window; the page does not scroll sideways', narrowCards);
  await page.locator('[data-test="agent-memory-tab-semantic"]').click();
  await page.locator('[data-test="semantic-memory-explorer"]').waitFor();
  await sleep(600);
  const narrowTabs = (await page.locator('[data-test^="agent-memory-tab-"]').allInnerTexts()).map((label) => label.replace(/\s+/g, ' ').trim());
  check('SMV-050', narrowTabs[0]?.startsWith('Episodic') && narrowTabs[1] === 'Semantic' && narrowTabs.every((label) => !label.includes('memory')), 'Short tab labels below 640 px', narrowTabs);
  await shot(page, 'VIS-018-agent-semantic-narrow-390x844');
  await page.setViewportSize({ width: 1440, height: 900 });

  // UXJ-004: the team page, Members; the shared agent opens the same page.
  await goto('?view=home&section=browse&node=teams');
  const teamCard = page.locator('[data-test="memory-owner-card"]', { hasText: 'Product Review Team' });
  await teamCard.waitFor();
  check('SMV-060', (await teamCard.textContent()).includes('2 members'), 'The team card counts its members');
  await shot(page, 'VIS-008-browse-teams-cards-1440x900');
  await teamCard.click();
  await page.locator('[data-test="group-member"]').first().waitFor();
  const members = await page.locator('[data-test="group-member"]').allTextContents();
  check('SMV-061', members.some((member) => member.includes('Reviewer') && !member.includes('Shared agent'))
    && members.some((member) => member.includes(AGENT_NAME) && member.includes('Shared agent')), 'Members: a team-local agent and a shared agent', members);
  const firstMember = await placement('[data-test="group-member"]');
  check('SMV-118', firstMember && firstMember.top <= 90, 'AC-001 (autobyteus-652): the team page\'s first member card starts within 90 px of the top', firstMember);
  await shot(page, 'VIS-009-team-members-1440x900');
  await page.locator('[data-test="group-member"]', { hasText: 'Reviewer' }).click();
  await page.locator('[data-test="agent-memory-page"]').waitFor();
  check('SMV-062', (await text('[data-test="memory-page-back"]')) === 'Product Review Team' && (await page.locator('[data-test="memory-page-back"]').getAttribute('aria-label')) === 'Back to Product Review Team', 'Back to the team');
  // autobyteus-608 DC-002: "Belongs to Product Review Team" is not shown: Back already names the team.
  check('SMV-065', !(await page.locator('[data-test="agent-memory-places"]').count()), 'No "Belongs to" when Back names the team');
  await page.locator('[data-test="agent-memory-tab-semantic"]').click();
  await page.locator('[data-test="semantic-memory-empty"]').waitFor();
  check('SMV-063', (await page.locator('[data-test="semantic-memory-empty"]').innerText()).replace(/\s+/g, ' ').trim() === 'No semantic memory yet The folder is created when Reviewer next runs.', 'The missing folder state');
  check('SMV-064', !existsSync(path.join(memoryDir, 'semantic', encodeURIComponent('team-local-agent:probe-product-team:reviewer'))), 'The view created no folder');
  await shot(page, 'VIS-007-agent-semantic-missing-1440x900');

  // SR-009 (AC-013, N-12): a team-local agent whose encoded ID is over 255 bytes (autobyteus-576). Its folder has the shortened name
  // (`#` and a hash); the Semantic tab finds it and opens a file inside it.
  check('SMV-100', encodeURIComponent(longId).length > 255 && path.basename(longFolder).includes('#') && Buffer.byteLength(path.basename(longFolder)) <= 255,
    "A long ID's folder has the shortened name", { encodedBytes: encodeURIComponent(longId).length, folderName: path.basename(longFolder) });
  await goto('?view=home&section=browse&node=teams');
  await page.locator('[data-test="memory-owner-card"]', { hasText: LONG_TEAM_NAME }).click();
  await page.locator('[data-test="group-member"]', { hasText: 'Scribe' }).click();
  await page.locator('[data-test="agent-memory-page"]').waitFor();
  await page.locator('[data-test="agent-memory-tab-semantic"]').click();
  await page.locator('[data-test="semantic-memory-explorer"]').waitFor();
  check('SMV-101', (await page.locator('[data-test="semantic-memory-copy-path"]').getAttribute('title')) === longFolder, 'The Semantic tab finds the shortened folder', await page.locator('[data-test="semantic-memory-copy-path"]').getAttribute('title'));
  await page.locator('[data-test="semantic-memory-explorer"] .file-header', { hasText: 'notes.md' }).click();
  await page.locator('text=The long team keeps its notes here.').first().waitFor();
  check('SMV-102', (await page.locator('text=The long team keeps its notes here.').count()) > 0, 'A file inside the shortened folder opens in the preview (the `#` never reaches a URL unencoded)');
  await shot(page, 'SR-009-long-id-semantic-file-open-1440x900');

  // autobyteus-576 FU-002 (AC-002): a relative link opens the linked file of the same folder as a preview tab (the
  // fragment is not part of the file), nothing becomes editable; a missing file shows the viewer's message; a link out
  // of the folder opens nothing.
  const explorer = page.locator('[data-test="semantic-memory-explorer"]');
  await explorer.locator('a', { hasText: 'The 2026 archive' }).click();
  await explorer.locator('text=Q1 closed the launch.').first().waitFor();
  check('SMV-103', (await explorer.locator('text=2026.md').count()) > 0 && !(await page.locator('[title="Edit Mode"]').count()),
    'A relative link opens the linked file as a preview tab of the same folder, nothing editable');
  await shot(page, 'FU-002-relative-link-opened-1440x900');
  await explorer.locator('.file-header', { hasText: 'notes.md' }).click();
  await explorer.locator('a', { hasText: 'An old page' }).click();
  // The viewer's message for a missing workspace file is the node's answer, shown in the file's tab (as for any file).
  await explorer.locator('text=File not found').first().waitFor();
  check('SMV-104', (await explorer.locator('text=old-page.md').count()) > 0 && (await explorer.locator('text=File not found').count()) > 0,
    "A link to a missing file opens its tab with the viewer's message", (await explorer.innerText()).slice(0, 400));
  await shot(page, 'FU-002-relative-link-missing-file-1440x900');
  await explorer.locator('.file-header', { hasText: 'notes.md' }).click();
  await explorer.locator('text=The long team keeps its notes here.').first().waitFor();
  const tabsBefore = await explorer.innerText();
  await explorer.locator('a', { hasText: 'Outside the folder' }).click();
  await sleep(1500);
  check('SMV-105', !(await explorer.locator('text=outside.md').count()) && (await explorer.locator('text=The long team keeps its notes here.').count()) > 0,
    'A link out of the folder opens nothing', { before: tabsBefore.length, after: (await explorer.innerText()).length });

  // CR-001 (REQ-007): leave the agent's Semantic tab while "Loading the folder…" shows (its first listing held), then
  // let the listing complete: the chat workspace menu (the same menu as Run Settings) offers no workspace of the
  // folder view. The navigation stays in the page, so the web store keeps what it held.
  let releaseHeld = () => undefined;
  const held = new Promise((resolve) => { releaseHeld = resolve; });
  let heldListing = null;
  await page.route('**/graphql', async (route) => {
    let body = null;
    try { body = route.request().postDataJSON(); } catch { body = null; }
    const operations = Array.isArray(body) ? body : [body];
    const listing = operations.find((operation) => operation?.operationName === 'GetFolderChildren'
      && String(operation?.variables?.workspaceId ?? '').startsWith('semantic_'));
    if (listing) { heldListing = listing.variables.workspaceId; await held; }
    await route.continue();
  });
  await goto('');
  await agentCard.click();
  await page.locator('[data-test="agent-memory-page"]').waitFor();
  await page.locator('[data-test="agent-memory-tab-semantic"]').click();
  await waitFor('the held first listing', async () => heldListing !== null);
  check('SMV-090', (await page.locator('text=Loading the folder…').count()) > 0 && heldListing === `semantic_ws_${AGENT_ID}`,
    'The Semantic tab shows "Loading the folder…" while its first listing is held', heldListing);
  // Leave as the user does: the left panel's Chat (a client-side route change; the marker proves the page was not reloaded).
  await page.evaluate(() => { window.__smvSameDocument = true; });
  await page.locator('[data-test="app-left-panel-chat"]').click();
  await page.waitForURL(/\/chat/);
  releaseHeld();
  await sleep(2000);
  await page.unroute('**/graphql');
  const sameDocument = await page.evaluate(() => window.__smvSameDocument === true);
  await page.locator('[data-test="chat-workspace-trigger"]').first().click();
  await page.locator('[data-test="chat-workspace-menu"]').waitFor();
  const menuOptions = await page.locator('[data-test^="chat-workspace-option-"]').evaluateAll((elements) =>
    elements.map((element) => ({ id: element.getAttribute('data-test'), text: (element.textContent || '').trim() })));
  check('SMV-091', sameDocument && menuOptions.length > 0 && !menuOptions.some((option) => option.id.includes('semantic') || option.text.includes(AGENT_NAME)),
    'Left during the first listing (same page, store kept): the chat workspace menu offers no workspace of the folder view', { sameDocument, menuOptions });
  await shot(page, 'CR-001-chat-workspace-menu-after-leaving-1440x900');
  await page.keyboard.press('Escape');

  // UXJ-002: Global.
  await goto('?view=home&section=browse&node=global');
  await page.locator('[data-test="global-memory-page"]').waitFor();
  // autobyteus-608 DC-003: no title row: the heading for screen readers, the line as the Global tab's tooltip.
  check('SMV-070', (await text('[data-test="global-memory-page"] > h1')) === 'Global memory'
    && (await page.locator('[data-test="global-memory-page"] > h1').getAttribute('class')).includes('sr-only'), 'The Global title (for screen readers)');
  check('SMV-071', (await page.locator('[data-test="memory-browse-tab-global"]').getAttribute('title')) === 'Knowledge shared by every agent, agent team and agent org on this node. Every agent reads it and writes to it.', "The Global line (the tab's tooltip)");
  await page.locator('[data-test="semantic-memory-explorer"] .file-header', { hasText: 'product.md' }).click();
  await page.locator('text=runs agents on your own nodes').first().waitFor();
  const globalPanel = await placement('[data-test="semantic-memory-explorer"]');
  check('SMV-119', globalPanel && globalPanel.top <= 80 && globalPanel.toWindowBottom >= 0 && globalPanel.toWindowBottom <= 24 && !globalPanel.pageScrolls,
    'AC-001, AC-002 (autobyteus-652): Global\'s reader starts within 80 px of the top and ends within 24 px of the window bottom, no page scroll', globalPanel);
  await shot(page, 'VIS-003-global-file-open-1440x900');

  // zh-CN.
  await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="global-memory-page"]').waitFor();
  await waitFor('the zh-CN title', async () => (await text('[data-test="global-memory-page"] > h1')) === '全局记忆');
  await shot(page, 'VIS-016-global-zh-CN-1440x900');

  const after = { agent: await treeHash(folder), global: await treeHash(path.join(memoryDir, 'semantic-global')), outside: await treeHash(outsideDir), long: await treeHash(longFolder) };
  check('SMV-080', JSON.stringify(after) === JSON.stringify(before), 'The folders shown and the link target are byte-identical after the session');
  check('SMV-081', evidence.pageErrors.length === 0, 'No page errors', evidence.pageErrors);
  result = 'Pass';
} catch (error) {
  evidence.failures.push({ message: error.message, details: error.details });
} finally {
  await browser?.close().catch(() => undefined);
  await stop(frontend);
  await stop(backend);
  if (ownedRoot) await fs.rm(ownedRoot, { recursive: true, force: true });
  evidence.result = result;
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outputDir, 'evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(`semantic memory view probe: ${result} (${evidence.checks.filter((entry) => entry.pass).length}/${evidence.checks.length} checks) → ${outputDir}`);
  process.exitCode = result === 'Pass' ? 0 : 1;
}

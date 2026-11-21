#!/usr/bin/env node
// Memory page probe (autobyteus-554, semantic-memory-view-554): the real server and the real page against a
// probe-written data root (never a user's data). Browse by owner, an agent's page (Episodic, Semantic), a team page
// (Members), the read-only semantic memory folder view (files, preview, links listed and never opened, no edit, no
// menu), Global, the missing state, the narrow layout and zh-CN; the node never lists the view's workspace. It takes
// the screenshots the UI/UX spec's VIS references show (desktop 1440×900, narrow 390×844).
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
const writeRun = async (memoryDir, runId, startedAt, MetadataStore) => {
  const runDir = path.join(memoryDir, 'agents', runId);
  await fs.mkdir(runDir, { recursive: true });
  const ts = Date.parse(startedAt) / 1000;
  const records = [
    { id: 'pr_0000001', seq: 1, ts, turn_id: 'turn_1', trace_type: 'user', content: 'Summarize the launch notes.' },
    { id: 'pr_0000002', seq: 2, ts: ts + 5, turn_id: 'turn_1', trace_type: 'assistant', content: 'The launch notes are summarized.' },
  ];
  await fs.writeFile(path.join(runDir, 'raw_traces_active.jsonl'), records.map((record) => `${JSON.stringify(record)}\n`).join(''));
  await new MetadataStore(memoryDir).writeMetadata(runId, {
    runId, agentDefinitionId: AGENT_ID, workspaceRootPath: '/work/launch', memoryDir: runDir, llmModelIdentifier: 'probe-model',
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
  await fs.writeFile(path.join(longFolder, 'notes.md'), '# Archive notes\n\nThe long team keeps its notes here.\n');
  const { AgentRunMetadataStore } = await import(pathToFileURL(path.join(serverDir, 'dist/run-history/store/agent-run-metadata-store.js')).href);
  await writeRun(memoryDir, 'probe_researcher_run_1', '2026-11-18T09:00:00Z', AgentRunMetadataStore);
  await writeRun(memoryDir, 'probe_researcher_run_2', '2026-11-19T10:30:00Z', AgentRunMetadataStore);
  // The agent's semantic memory: nested files, a link to a file and one to a folder outside it.
  const folder = path.join(memoryDir, 'semantic', AGENT_ID);
  await fs.mkdir(path.join(folder, 'sites', 'linkedin'), { recursive: true });
  await fs.writeFile(path.join(folder, 'sites', 'linkedin', 'controls.md'), '# LinkedIn controls\n\nThe **post** button is at the top right.\n');
  await fs.writeFile(path.join(folder, 'research-method.md'), '# Research method\n\n1. Read the sources.\n2. Write the notes.\n');
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
  check('SMV-021', (await text('[data-test="memory-owner-back"]')) === '← Back to Memory', 'Back to Memory');
  await waitFor('the agent subtitle', async () => (await text('[data-test="agent-memory-places"]')) === 'Also works in Product Review Team');
  check('SMV-022', (await page.locator('[data-test="agent-episode"]').count()) === 2, 'Two episodes');
  check('SMV-023', (await text('[data-test="agent-memory-tab-episodic"]')).includes('2'), 'The Episodic tab counts the episodes');
  await shot(page, 'VIS-004-agent-episodic-1440x900');

  // UXJ-003: Semantic memory: the folder view, read only.
  await page.locator('[data-test="agent-memory-tab-semantic"]').click();
  await page.locator('[data-test="semantic-memory-explorer"]').waitFor();
  check('SMV-030', (await text('[data-test="semantic-memory-path"]')) === folder, 'The folder path', await text('[data-test="semantic-memory-path"]'));
  check('SMV-031', page.url().includes('pane=semantic'), 'The tab is in the address');
  const links = page.locator('[data-test="file-item-link"]');
  await links.first().waitFor();
  check('SMV-032', (await links.count()) === 2 && (await links.allTextContents()).every((row) => row.includes('Link · not opened')), 'Two link rows "Link · not opened"');
  const topRows = await page.locator('[data-test="semantic-memory-explorer"] .file-header').evaluateAll((rows) => rows.map((row) => row.textContent.replace(/Link · not opened/, '').trim()));
  check('SMV-039', JSON.stringify(topRows) === JSON.stringify(['sites', 'research-method.md', 'secret-link.md', 'shared']), 'Folders first, then files and links by name', topRows);
  check('SMV-033', await page.locator('text=No file selected').count() > 0 && await page.locator('text=Select a file to read it.').count() > 0, 'The read-only empty tab copy');
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
  await shot(page, 'VIS-009-team-members-1440x900');
  await page.locator('[data-test="group-member"]', { hasText: 'Reviewer' }).click();
  await page.locator('[data-test="agent-memory-page"]').waitFor();
  check('SMV-062', (await text('[data-test="memory-owner-back"]')) === '← Back to Product Review Team', 'Back to the team');
  await waitFor('the team-local subtitle', async () => (await text('[data-test="agent-memory-places"]')) === 'Belongs to Product Review Team');
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
  check('SMV-101', (await text('[data-test="semantic-memory-path"]')) === longFolder, 'The Semantic tab finds the shortened folder', await text('[data-test="semantic-memory-path"]'));
  await page.locator('[data-test="semantic-memory-explorer"] .file-header', { hasText: 'notes.md' }).click();
  await page.locator('text=The long team keeps its notes here.').first().waitFor();
  check('SMV-102', (await page.locator('text=The long team keeps its notes here.').count()) > 0, 'A file inside the shortened folder opens in the preview (the `#` never reaches a URL unencoded)');
  await shot(page, 'SR-009-long-id-semantic-file-open-1440x900');

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
  check('SMV-070', (await text('[data-test="global-memory-page"] h1')) === 'Global memory', 'The Global title');
  check('SMV-071', (await page.locator('text=Knowledge shared by every agent, agent team and agent org on this node. Every agent reads it and writes to it.').count()) > 0, 'The Global line');
  await page.locator('[data-test="semantic-memory-explorer"] .file-header', { hasText: 'product.md' }).click();
  await page.locator('text=runs agents on your own nodes').first().waitFor();
  await shot(page, 'VIS-003-global-file-open-1440x900');

  // zh-CN.
  await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="global-memory-page"]').waitFor();
  await waitFor('the zh-CN title', async () => (await text('[data-test="global-memory-page"] h1')) === '全局记忆');
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

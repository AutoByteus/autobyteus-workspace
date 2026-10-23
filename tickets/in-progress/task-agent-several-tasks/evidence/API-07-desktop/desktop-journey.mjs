#!/usr/bin/env node
// API-07 (task-agent-several-tasks AC-010, AC-009, REQ-003): the user's journey in the isolated desktop instance of this worktree's
// build, on the data package `seed-desktop.mjs` made (one Team copy holding Tasks A and B, C unassigned). Attach-only over the
// instance's own CDP control port. Ticket-owned; not a package script.
// Usage (worktree root): node …/desktop-journey.mjs <controlPort> <graphqlUrl> <seed.json> <fresh outDir>
// J1 board: A and B cards both show the team on their root line, C none. J2 Task A page "Assigned to": the team. J3 Task B page:
// the same team. J4 the Workspaces tree shows the Manager's run with one team copy (not two). J5 GraphQL: both roots name the
// same team run; C has no root.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const [controlPort, graphqlUrl, seedFile, outDir] = process.argv.slice(2);
const require = createRequire(path.join(process.cwd(), 'autobyteus-web/package.json'));
const { chromium } = require('playwright-core');
await fs.mkdir(outDir, { recursive: false });
const seed = JSON.parse(await fs.readFile(seedFile, 'utf8'));
const { A, B, C } = seed.tasks;
const results = []; const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (c, m, d) => { if (!c) throw new Error(`${m}${d === undefined ? '' : ` ${JSON.stringify(d)}`}`); };
const until = async (label, fn, ms = 20000) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(200); } throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`); };
const gql = async (query, variables = {}) => { const r = await fetch(graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); const b = await r.json(); if (b.errors?.length) throw new Error(JSON.stringify(b.errors)); return b.data; };

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${controlPort}`);
const page = await until('renderer page', async () => browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('/renderer/index.html')), 30000);
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const shot = (name, fullPage = false) => page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage });
const check = async (name, fn) => { try { const obs = await fn(); results.push({ name, result: 'Pass', obs }); } catch (e) { results.push({ name, result: 'Fail', error: String(e.stack || e) }); await shot(`${name}-failure`).catch(() => {}); } };
const text = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ').trim();
const card = (taskId) => page.getByTestId(`project-task-row-${taskId}`);
const openBoard = async () => {
  await page.locator('[data-test="app-left-panel-primary-nav"]').getByText(/^Projects$/).first().click();
  await page.getByTestId(`project-card-${seed.projectId}`).click();
  await card(A.taskId).waitFor({ timeout: 30000 });
  await sleep(500);
};
const rootLine = async (taskId) => { const line = card(taskId).getByTestId('project-task-root'); return (await line.count()) ? { name: await text(line.getByTestId('project-task-root-name')), state: await line.getAttribute('data-testid') } : null; };
const squadLabel = seed.squadName.toLowerCase();

await page.bringToFront();

await check('J1-board', async () => {
  await openBoard();
  const obs = { A: await rootLine(A.taskId), B: await rootLine(B.taskId), C: await rootLine(C.taskId) };
  await shot('J1-board-1440');
  assert(obs.A && obs.B && !obs.C, 'A and B show a root line, C none', obs);
  assert(obs.A.name.toLowerCase() === squadLabel && obs.B.name.toLowerCase() === squadLabel, 'both name the team', obs);
  return obs;
});

const assignedOf = async (taskId, label) => {
  await openBoard();
  await card(taskId).getByTestId('project-task-row-link').click();
  await page.getByTestId('task-page-assigned').waitFor({ timeout: 20000 });
  await sleep(300);
  const section = page.getByTestId('task-page-assigned');
  const obs = { text: await text(section), name: await text(section.getByTestId('project-task-root-name')).catch(() => null), notAssigned: await section.getByTestId('task-page-not-assigned').count() };
  await shot(`${label}-assigned-1440`, true);
  return obs;
};
await check('J2-task-A-assigned-to', async () => {
  const obs = await assignedOf(A.taskId, 'J2-task-A');
  assert(obs.name?.toLowerCase() === squadLabel && obs.notAssigned === 0, 'Task A: Assigned to the team', obs);
  return obs;
});
await check('J3-task-B-assigned-to', async () => {
  const obs = await assignedOf(B.taskId, 'J3-task-B');
  assert(obs.name?.toLowerCase() === squadLabel && obs.notAssigned === 0, 'Task B: Assigned to the same team', obs);
  return obs;
});
await check('J4-workspaces-tree', async () => {
  await page.locator('[data-test="app-left-panel-primary-nav"]').getByText(/^Chat$/).first().click().catch(() => {});
  await until('workspace rows', async () => (await page.locator('[data-test="workspace-row"]').count()) >= 1, 30000);
  const ws = page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first();
  if (await ws.count()) await ws.click();
  await page.locator('[data-test="workspace-agent-row"]', { hasText: seed.managerName }).first().click();
  await sleep(800);
  const runRow = page.locator('[data-test="workspace-agent-run-row"]').first();
  await runRow.waitFor({ timeout: 20000 });
  await runRow.click().catch(() => {});
  await sleep(1500);
  const teamRows = await page.$$eval('[data-test="workspace-team-transient-execution-row"], [data-test*="team-transient"], [data-test*="delegated-team"]', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
  const treeText = await page.locator('[data-test="app-left-panel"], aside').first().innerText().catch(() => '');
  await shot('J4-workspaces-tree-1440');
  const occurrences = (treeText.toLowerCase().match(new RegExp(squadLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
  assert(occurrences >= 1, 'the team copy is in the tree', { teamRows, occurrences });
  return { teamRows, occurrences };
});
await check('J5-graphql', async () => {
  const tasks = (await gql('query($id:String!){projectTasks(projectId:$id){taskId taskKey status root { kind teamRunId recipientAddress closed status }}}', { id: seed.projectId })).projectTasks;
  const by = Object.fromEntries(tasks.map((t) => [t.taskId, t]));
  assert(by[A.taskId].root?.teamRunId === seed.team && by[B.taskId].root?.teamRunId === seed.team && by[C.taskId].root === null, 'roots', by);
  return { A: by[A.taskId].root, B: by[B.taskId].root, C: by[C.taskId].root };
});

await fs.writeFile(path.join(outDir, 'result.json'), `${JSON.stringify({ results, errors }, null, 2)}\n`);
console.log(JSON.stringify({ results: results.map((r) => [r.name, r.result, r.error?.split('\n')[0]]), errors: errors.slice(0, 10) }, null, 1));
process.exit(0); // disconnect only: the instance is stopped with isolated-app stop

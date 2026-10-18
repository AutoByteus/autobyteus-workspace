// DSK-003 (ticket-owned, temporary): drives the isolated worktree desktop instance like a user, attached over its CDP
// control endpoint (attach-only; playwright-core from autobyteus-web, as tests/e2e/fixtures/settings-refresh-desktop.mjs).
// Usage: node dsk-ui.mjs <webDir> <controlEndpoint> <graphqlUrl> <seeded.json> <outDir>
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const [webDir, controlEndpoint, graphqlUrl, seededPath, outDir] = process.argv.slice(2);
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core');
const seeded = JSON.parse(await fs.readFile(seededPath, 'utf8'));
const P = Object.fromEntries(seeded.projects.map(p => [p.name, p]));
const ab = P['AutoByteus'], ob = P['Customer Onboarding Experience Redesign'];
const id = (project, n) => [...project.tasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[n - 1].taskId;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = { steps: [], errors: [], screenshots: [] };
const gql = async (query, variables = {}) => { const r = await fetch(graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); const b = await r.json(); if (b.errors) throw new Error(JSON.stringify(b.errors)); return b.data; };
const tasks = async projectId => (await gql('query($id:String!){projectTasks(projectId:$id){taskId taskKey description status dependsOnTaskIds}}', { id: projectId })).projectTasks;
const until = async (label, fn, ms = 20000) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(150); } throw new Error(`Timed out: ${label}${last ? ' — ' + last.message : ''}`); };
const step = async (name, fn) => { const s = { name, result: 'Fail' }; results.steps.push(s); try { s.observed = await fn(); s.result = 'Pass'; } catch (e) { s.error = e.stack || String(e); } finally { await fs.writeFile(path.join(outDir, 'dsk-003-ui.json'), JSON.stringify(results, null, 2)); } console.log(`[${s.result}] ${name}${s.error ? ': ' + s.error.split('\n')[0] : ''}`); };
const assert = (ok, msg, detail) => { if (!ok) throw new Error(`${msg}: ${JSON.stringify(detail)}`); };

const browser = await chromium.connectOverCDP(controlEndpoint);
const context = browser.contexts()[0];
const page = await until('renderer', () => context.pages().find(p => p.url().includes('/renderer/index.html')));
page.on('pageerror', e => results.errors.push(e.message));
const base = page.url().split('#')[0];
results.renderer = base;
const hash = () => page.evaluate(() => location.hash);
const go = async h => { await page.evaluate(h => { location.hash = h; }, h); await sleep(300); };
const shot = async name => { const file = path.join(outDir, `${name}.png`); await page.screenshot({ path: file }); results.screenshots.push(file); };
const viewport = async (width, height) => { await page.setViewportSize({ width, height }); await sleep(400); };
const row = taskId => page.locator(`[data-testid="project-task-row-${taskId}"]:visible`);
const badgeOf = async taskId => { for (const kind of ['blocked', 'cancelled']) { const b = row(taskId).getByTestId(`task-dependency-badge-${kind}`); if (await b.count()) return { kind, text: (await b.innerText()).replace(/\s+/g, ' ').trim(), title: await b.getAttribute('title') }; } return null; };
const keyLine = async taskId => row(taskId).getByTestId('project-task-row-key').getByTestId('task-key').getAttribute('data-key');
const board = async projectId => { await go(`#/projects/${projectId}`); await page.getByTestId('project-task-columns').waitFor({ timeout: 30000 }); await sleep(500); };
const pick = async (query, taskId) => { const input = page.getByTestId('task-dependency-input'); await input.fill(query); await page.getByTestId(`task-dependency-option-${taskId}`).click(); await page.getByTestId(`task-dependency-selected-${taskId}`).waitFor(); };

await viewport(1440, 900);
await step('DSK-003a board 1440×900: key line on every card of the upgraded Project, no badges yet', async () => {
  await board(ab.projectId);
  const keys = {};
  for (const n of [1, 2, 3, 5, 6]) keys[n] = await keyLine(id(ab, n));
  assert(JSON.stringify(Object.values(keys)) === JSON.stringify(['autobyteus-1', 'autobyteus-2', 'autobyteus-3', 'autobyteus-5', 'autobyteus-6']), 'key lines', keys);
  assert(await row(id(ab, 4)).count() === 0, 'Cancelled Task hidden behind the toggle (preserved)', null);
  assert(await page.locator('[data-testid^="task-dependency-badge-"]:visible').count() === 0, 'no badges before dependencies', null);
  await shot('dsk-003a-board-upgraded-1440x900'); return keys;
});
await step('DSK-003b Edit autobyteus-5 by the picker: depends on autobyteus-3 (In Progress) and autobyteus-2 (Done) → Blocked by autobyteus-3', async () => {
  await row(id(ab, 5)).click(); await page.getByTestId('task-page-heading').waitFor();
  assert(await hash() === `#/projects/${ab.projectId}/tasks/autobyteus-5`, 'key URL from the board', await hash());
  await page.getByTestId('task-page-edit').click(); await page.locator('#task-page-description').waitFor();
  assert(await hash() === `#/projects/${ab.projectId}/tasks/autobyteus-5/edit`, 'edit key URL', await hash());
  const input = page.getByTestId('task-dependency-input'); await input.click();
  const opts = await until('options', async () => { const o = await page.getByTestId('task-dependency-options').getByRole('option').evaluateAll(es => es.map(e => ({ key: e.querySelector('[data-testid="task-key"]')?.getAttribute('data-key'), disabled: e.getAttribute('aria-disabled') === 'true', text: e.innerText.replace(/\s+/g, ' ').trim() }))); return o.length ? o : null; });
  assert(JSON.stringify(opts.map(o => o.key)) === JSON.stringify(['autobyteus-6', 'autobyteus-4', 'autobyteus-3', 'autobyteus-2', 'autobyteus-1']), 'newest first, itself excluded', opts);
  await shot('dsk-003b-picker-open-1440x900');
  await pick('autobyteus-3', id(ab, 3)); await pick('schema', id(ab, 2));
  await shot('dsk-003b-picker-chosen-1440x900');
  await page.getByTestId('task-page-save').click();
  await until('saved', async () => await hash() === `#/projects/${ab.projectId}/tasks/autobyteus-5`);
  const stored = (await tasks(ab.projectId)).find(t => t.taskId === id(ab, 5)).dependsOnTaskIds;
  assert(JSON.stringify([...stored].sort()) === JSON.stringify([id(ab, 3), id(ab, 2)].sort()), 'stored as IDs', stored);
  await board(ab.projectId);
  const badge = await until('badge', () => badgeOf(id(ab, 5)));
  assert(badge.kind === 'blocked' && badge.text === 'Blocked by autobyteus-3' && badge.title.includes('autobyteus-2 (Done)') && badge.title.includes('autobyteus-3 (In Progress)'), 'badge', badge);
  return { opts, stored, badge };
});
await step('DSK-003c Edit autobyteus-6: depends on the Cancelled autobyteus-4 → Dependency cancelled: autobyteus-4', async () => {
  await go(`#/projects/${ab.projectId}/tasks/autobyteus-6/edit`); await page.locator('#task-page-description').waitFor();
  await pick('old sync', id(ab, 4));
  const status = await page.getByTestId(`task-dependency-selected-${id(ab, 4)}`).innerText();
  await page.getByTestId('task-page-save').click(); await until('saved', async () => await hash() === `#/projects/${ab.projectId}/tasks/autobyteus-6`);
  await board(ab.projectId);
  const badge = await until('badge', () => badgeOf(id(ab, 6)));
  assert(badge.kind === 'cancelled' && badge.text === 'Dependency cancelled: autobyteus-4', 'badge', badge);
  return { selectedRow: status.replace(/\s+/g, ' '), badge };
});
let t7;
await step('DSK-003d New task with a dependency: next key autobyteus-7, Blocked by autobyteus-5 (VIS-009a/b)', async () => {
  await page.getByTestId('project-tasks-new-button').click(); await page.locator('#task-page-description').fill('Publish the API reference');
  await pick('autobyteus-5', id(ab, 5)); await shot('dsk-003d-new-task-chosen-1440x900');
  await page.getByTestId('task-page-save').click(); await page.getByTestId('project-task-columns').waitFor();
  t7 = (await tasks(ab.projectId)).find(t => t.description === 'Publish the API reference');
  assert(t7.taskKey === 'autobyteus-7' && JSON.stringify(t7.dependsOnTaskIds) === JSON.stringify([id(ab, 5)]), 'next key after the upgrade', t7);
  const badge = await until('badge', () => badgeOf(t7.taskId));
  assert(badge.text === 'Blocked by autobyteus-5' && await keyLine(t7.taskId) === 'autobyteus-7', 'new card', badge);
  await shot('dsk-003d-board-keys-badges-1440x900'); return { t7, badge };
});
await step('DSK-003e Task page autobyteus-5: chip, copy, Depends on (key order, Done ✓), informs note, Required by; a row opens by key URL', async () => {
  await go(`#/projects/${ab.projectId}/tasks/autobyteus-5`); await page.getByTestId('task-key-chip').waitFor();
  const depRows = await page.getByTestId('task-dependencies-depends-on').locator('[data-testid^="task-dependency-project_task_"]').evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  assert(depRows.length === 2 && depRows[0].startsWith('autobyteus-2 Done') && depRows[1].startsWith('autobyteus-3 In Progress'), 'Depends on rows in key order', depRows);
  const doneIcon = await page.getByTestId('task-dependencies-depends-on').getByTestId(`task-dependency-${id(ab, 2)}`).getByTestId('task-dependency-status').locator('svg').count();
  assert(doneIcon === 1, 'Done ✓ icon', doneIcon);
  const informs = (await page.getByTestId('task-dependencies-informs').innerText()).trim();
  const requiredBy = await page.getByTestId('task-dependencies-required-by').locator('[data-testid^="task-dependency-project_task_"]').evaluateAll(es => es.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  assert(requiredBy.length === 1 && requiredBy[0].startsWith('autobyteus-7'), 'Required by', requiredBy);
  await shot('dsk-003e-task-page-dependencies-1440x900');
  await page.getByTestId('task-key-copy').click(); await page.getByTestId('task-key-copied').waitFor();
  const copiedText = (await page.getByTestId('task-key-copied').innerText()).trim();
  await shot('dsk-003e-task-key-copied-1440x900');
  let clipboard; try { clipboard = await page.evaluate(() => navigator.clipboard.readText()); } catch (e) { clipboard = `unreadable: ${e.message.split('\n')[0]}`; }
  await sleep(1800); const gone = await page.getByTestId('task-key-copied').count() === 0;
  assert(copiedText === 'Copied' && gone, 'Copied for 1.5 s', { copiedText, gone });
  await page.getByTestId('task-dependencies-depends-on').getByTestId(`task-dependency-${id(ab, 2)}`).click();
  await until('row opens autobyteus-2', async () => await hash() === `#/projects/${ab.projectId}/tasks/autobyteus-2`);
  await page.getByTestId('task-dependencies-required-by').getByTestId(`task-dependency-${id(ab, 5)}`).waitFor();
  return { depRows, informs, requiredBy, copiedText, clipboard };
});
await step('DSK-003f Loop prevention: editing autobyteus-3, its dependents autobyteus-5 and autobyteus-7 are greyed "Depends on this Task" (VIS-008)', async () => {
  await go(`#/projects/${ab.projectId}/tasks/autobyteus-3/edit`); await page.locator('#task-page-description').waitFor();
  await page.getByTestId('task-dependency-input').click();
  const opts = await until('options', async () => { const o = await page.getByTestId('task-dependency-options').getByRole('option').evaluateAll(es => es.map(e => ({ key: e.querySelector('[data-testid="task-key"]')?.getAttribute('data-key'), disabled: e.getAttribute('aria-disabled') === 'true', text: e.innerText.replace(/\s+/g, ' ').trim() }))); return o.length ? o : null; });
  const greyed = opts.filter(o => o.disabled).map(o => o.key);
  assert(JSON.stringify(greyed) === JSON.stringify(['autobyteus-7', 'autobyteus-5']) && opts.filter(o => o.disabled).every(o => o.text.includes('Depends on this Task')), 'loop options', opts);
  assert(opts.length <= 8 && !opts.some(o => o.key === 'autobyteus-3'), 'max 8, not itself', opts);
  await shot('dsk-003f-picker-loop-1440x900');
  await page.getByTestId('task-dependency-input').press('Escape'); await page.getByTestId('task-page-cancel').click();
  return { opts };
});
await step('DSK-003g Long-ID Task and Edit URLs open the Task and switch to the key URL; an upper-case key too (AC-026)', async () => {
  await go(`#/projects/${ab.projectId}/tasks/${id(ab, 5)}`);
  await until('long-ID page replaced', async () => await hash() === `#/projects/${ab.projectId}/tasks/autobyteus-5`);
  await page.getByTestId('task-key-chip').waitFor();
  await go(`#/projects/${ab.projectId}/tasks/${id(ab, 5)}/edit`);
  await until('long-ID edit replaced', async () => await hash() === `#/projects/${ab.projectId}/tasks/autobyteus-5/edit`);
  await page.locator('#task-page-description').waitFor();
  await go(`#/projects/${ab.projectId}/tasks/AutoByteus-6`);
  await until('mixed-case key replaced', async () => await hash() === `#/projects/${ab.projectId}/tasks/autobyteus-6`);
  return { final: await hash() };
});
await step('DSK-003h Long keys (VIS-013/014): onboarding-3 depends on onboarding-2; whole keys on cards/chip/rows where they fit, number always visible', async () => {
  await go(`#/projects/${ob.projectId}/tasks/customer-onboarding-experience-redesign-3/edit`); await page.locator('#task-page-description').waitFor();
  await pick('welcome', id(ob, 2)); await page.getByTestId('task-page-save').click();
  await until('saved', async () => (await hash()).endsWith('/tasks/customer-onboarding-experience-redesign-3'));
  const keysOn = async scope => scope.locator('[data-testid="task-key"]').evaluateAll(es => es.filter(e => e.getBoundingClientRect().width > 0).map(e => ({ key: e.getAttribute('data-key'), title: e.getAttribute('title'), text: e.textContent, clipped: e.scrollWidth > e.clientWidth + 1, width: Math.round(e.getBoundingClientRect().width) })));
  const detail = await keysOn(page.getByTestId('project-task-page'));
  await shot('dsk-003h-long-key-detail-1440x900');
  await board(ob.projectId);
  const card = await keysOn(row(id(ob, 3)));
  await shot('dsk-003h-long-keys-board-1440x900');
  for (const k of [...detail, ...card]) assert(k.title === k.key && k.text.replace('…', '').endsWith(k.key.slice(k.key.lastIndexOf('-'))), 'full key in title; number visible', k);
  return { detail, card, badge: await badgeOf(id(ob, 3)) };
});
await step('DSK-003i Narrow 760×900 (VIS-015): one column; keys and badges', async () => {
  await viewport(760, 900); await board(ab.projectId);
  const lanes = await page.locator('[data-testid^=project-task-column-]').filter({ has: page.locator('h2') }).evaluateAll(es => es.map(e => { const b = e.getBoundingClientRect(); return { top: Math.round(b.top), left: Math.round(b.left), width: Math.round(b.width) }; }));
  assert(lanes.every((b, i) => i === 0 || b.top > lanes[i - 1].top), 'lanes stacked', lanes);
  const badges = { t5: await badgeOf(id(ab, 5)), t6: await badgeOf(id(ab, 6)), t7: await badgeOf(t7.taskId) };
  assert(badges.t5?.text === 'Blocked by autobyteus-3' && badges.t6?.text === 'Dependency cancelled: autobyteus-4' && badges.t7?.text === 'Blocked by autobyteus-5', 'badges narrow', badges);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert(!overflow, 'no horizontal overflow', overflow);
  await shot('dsk-003i-board-narrow-760x900'); await page.locator('[data-testid="project-task-columns"]').screenshot({ path: path.join(outDir, 'dsk-003i-board-narrow-760x900-columns.png') });
  await viewport(1440, 900); return { lanes, badges };
});
results.result = results.steps.every(s => s.result === 'Pass') && !results.errors.length ? 'Pass' : 'Fail';
await fs.writeFile(path.join(outDir, 'dsk-003-ui.json'), JSON.stringify(results, null, 2));
console.log('RESULT', results.result, 'pageErrors', results.errors.length);
await browser.close().catch(() => {});

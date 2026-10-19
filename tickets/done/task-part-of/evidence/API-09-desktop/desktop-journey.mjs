#!/usr/bin/env node
// API-09 (task-part-of AC-017, AC-016): the user journeys in the isolated desktop instance of this worktree's build, driven
// over the instance's own CDP control port (attach only; never another port). Ticket-owned; not a package script.
// Usage (worktree root): node …/desktop-journey.mjs <controlPort> <graphqlUrl> <seed.json> <fresh outDir>
// Journeys: J1 board (pills, part lines, lanes, Cancelled lane), J2 parent Task page, J3 part Task page, J4 New part,
// J5 editor (search, greyed parts, choose, clear, has-parts), J6 delete note + parts kept, J7 tab (if the right panel is
// reachable without a runtime), J8 zh-CN, J9 long keys, J10 narrow board, J11 step-1 Task (AC-016).
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const [controlPort, graphqlUrl, seedFile, outDir] = process.argv.slice(2);
const require = createRequire(path.join(process.cwd(), 'autobyteus-web/package.json'));
const { chromium } = require('playwright-core');
await fs.mkdir(outDir, { recursive: false });
const seed = JSON.parse(await fs.readFile(seedFile, 'utf8'));
const T = seed.tasks, L = seed.longTasks;
const results = []; const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (c, m, d) => { if (!c) throw new Error(`${m}${d === undefined ? '' : ` ${JSON.stringify(d)}`}`); };
const until = async (label, fn, ms = 20000) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(150); } throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`); };
const gql = async (query, variables = {}) => { const r = await fetch(graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); const b = await r.json(); if (b.errors?.length) throw new Error(JSON.stringify(b.errors)); return b.data; };
const tasksOf = async (projectId) => (await gql('query($id:String!){projectTasks(projectId:$id){taskId taskKey status partOfTaskId dependsOnTaskIds updatedAt description}}', { id: projectId })).projectTasks;

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${controlPort}`);
const page = await until('renderer page', async () => browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('/renderer/index.html')), 30000);
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const cdp = await page.context().newCDPSession(page);
const viewport = async (width, height = 900) => { await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); await sleep(400); };
const shot = (name) => page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const check = async (name, fn) => { if (only && !only.includes(name.split('-')[0])) return; try { const obs = await fn(); results.push({ name, result: 'Pass', obs }); } catch (e) { results.push({ name, result: 'Fail', error: String(e.stack || e) }); await shot(`${name}-failure`).catch(() => {}); } };
const text = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ').trim();
const go = async (route) => { await page.evaluate((r) => { window.location.hash = `#${r}`; }, route); await sleep(600); };
const card = (taskId) => page.getByTestId(`project-task-row-${taskId}`);
const relations = async (taskId) => { const rel = card(taskId).getByTestId('project-task-row-relations'); return (await rel.count()) ? text(rel) : ''; };
const laneOf = (taskId) => page.evaluate((id) => document.querySelector(`[data-testid="project-task-row-${id}"]`)?.closest('[data-testid^="project-task-column-"]')?.getAttribute('data-testid') ?? null, taskId);
const partRows = () => page.$$eval('[data-testid="task-parts"] li', (els) => els.map((el) => el.innerText.replace(/\s+/g, ' ').trim()));
const openBoard = async (projectId) => {
  // Settings replaces the primary nav with a "Back to workspace" link.
  if (!(await page.locator('[data-test="app-left-panel-primary-nav"]').isVisible().catch(() => false))) {
    await page.getByText(/^(Back to workspace|返回工作区)$/i).first().click(); await sleep(600);
  }
  await page.locator('[data-test="app-left-panel-primary-nav"]').getByText(/^(Projects|项目)$/).first().click();
  await page.getByTestId(`project-card-${projectId}`).click();
  await card(projectId === seed.main ? T.p.taskId : L.parent.taskId).waitFor({ timeout: 30000 });
  await sleep(300);
};
const openTask = async (taskId) => { await card(taskId).getByTestId('project-task-row-link').click(); await page.getByTestId('project-task-page').waitFor({ timeout: 20000 }); await sleep(300); };

await viewport(1440);
await page.bringToFront();
const evidence = { renderer: page.url() };

await check('J1-board', async () => {
  await openBoard(seed.main);
  await shot('J1-board-1440');
  const obs = { p: await relations(T.p.taskId), pTitle: await card(T.p.taskId).getByTestId('task-parts-progress').getAttribute('title'),
    onboarding: await relations(T.onboarding.taskId), cleanup: await relations(T.cleanup.taskId), notes: await relations(T.notes.taskId),
    docs: await relations(T.docs.taskId), docsTitle: await card(T.docs.taskId).getByTestId('task-part-of-marker').getAttribute('title'),
    lanes: Object.fromEntries(await Promise.all(['p', 'handshake', 'relay', 'docs', 'notes', 'bridge'].map(async (k) => [k, await laneOf(T[k].taskId)]))) };
  assert(obs.p === '2 of 4 done', 'parent pill', obs);
  assert(obs.pTitle === '2 of 4 done · 1 cancelled', 'pill title', obs);
  assert(obs.onboarding === '2 of 2 done' && obs.cleanup === '' && obs.notes === '', 'other cards', obs);
  assert(obs.docs.includes(`Part of${T.p.taskKey}`) || obs.docs.includes(`Part of ${T.p.taskKey}`), 'part line', obs);
  assert(obs.docsTitle === `Part of ${T.p.taskKey}: Cross-node collaboration (In Progress)`, 'part line title', obs);
  assert(obs.lanes.p === 'project-task-column-IN_PROGRESS' && obs.lanes.handshake === 'project-task-column-DONE' && obs.lanes.docs === 'project-task-column-TODO' && obs.lanes.bridge === null, 'lanes', obs);
  // Cancelled toggle: the Cancelled lane shows the cancelled part with its line.
  await page.getByTestId('project-tasks-cancelled-toggle').click();
  await until('Cancelled lane', async () => (await laneOf(T.bridge.taskId)) === 'project-task-column-CANCELLED');
  obs.cancelledLane = { bridge: await relations(T.bridge.taskId), tables: await relations(T.tables.taskId) };
  assert(obs.cancelledLane.bridge.includes(T.p.taskKey) && obs.cancelledLane.tables.includes(T.cleanup.taskKey), 'cancelled lane lines', obs);
  await shot('J1-board-cancelled-lane-1440');
  await page.getByTestId('project-tasks-cancelled-toggle').click();
  return obs;
});

await check('J2-parent-page', async () => {
  await openTask(T.p.taskId);
  await page.getByTestId('task-parts').waitFor();
  const obs = { summary: await text(page.getByTestId('task-parts-summary')), rows: await partRows(),
    hint: await page.getByTestId('task-parts-close-hint').isVisible(), newPart: await page.getByTestId('task-parts-new').isVisible(),
    order: await page.$$eval('[data-testid="task-page-reading-surface"] ~ section', (els) => els.map((e) => e.getAttribute('data-testid'))) };
  await page.screenshot({ path: path.join(outDir, 'J2-parent-page-1440.png'), fullPage: true });
  assert(obs.summary === '2 of 4 done · 1 cancelled', 'summary', obs);
  assert(obs.rows.length === 5 && obs.rows.map((r) => r.split(' ')[0]).join() === [T.handshake, T.relay, T.docs, T.bridge, T.e2e].map((x) => x.taskKey).join(), 'rows in key order', obs);
  assert(obs.rows[0].includes('Done') && obs.rows[3].includes('Cancelled'), 'row statuses', obs);
  assert(obs.hint && obs.newPart, 'hint and New part', obs);
  assert(obs.order[0] === 'task-parts' && obs.order[1] === 'task-dependencies', 'card order', obs);
  return obs;
});

await check('J3-part-page', async () => {
  await page.getByTestId(`task-part-row-${T.docs.taskId}`).click();
  await page.getByTestId('task-part-of').waitFor({ timeout: 15000 });
  const obs = { row: await text(page.locator('[data-testid="task-part-of"] li')), newPart: await page.getByTestId('task-parts-new').count(), deps: await page.getByTestId('task-dependencies').count() };
  await page.screenshot({ path: path.join(outDir, 'J3-part-page-1440.png'), fullPage: true });
  assert(obs.row.startsWith(T.p.taskKey) && obs.row.includes('In Progress') && obs.row.includes('Cross-node collaboration'), 'part of row', obs);
  assert(obs.newPart === 0 && obs.deps === 1, 'no New part on a part; dependencies kept', obs);
  await page.locator('[data-testid="task-part-of"] li a').click();
  await page.getByTestId('task-parts').waitFor({ timeout: 15000 });
  obs.openedParent = await text(page.getByTestId('task-page-heading'));
  return obs;
});

await check('J4-new-part', async () => {
  await page.getByTestId('task-parts-new').click();
  await page.getByTestId('task-part-of-selected').waitFor({ timeout: 15000 });
  const selected = await text(page.getByTestId('task-part-of-selected'));
  assert(selected.includes(T.p.taskKey), 'parent chosen', selected);
  await page.locator('#task-page-description').fill('Ship the relay to the beta channel');
  await page.screenshot({ path: path.join(outDir, 'J4-new-part-editor-1440.png'), fullPage: true });
  await page.getByTestId('task-page-save').click();
  const created = await until('new part saved', async () => (await tasksOf(seed.main)).find((t) => t.description === 'Ship the relay to the beta channel'), 20000);
  assert(created.partOfTaskId === T.p.taskId && created.status === 'TODO', 'stored parent', created);
  evidence.newPart = created;
  await openBoard(seed.main);
  const pill = await relations(T.p.taskId);
  assert(pill === '2 of 5 done', 'pill after new part', pill);
  return { selected, created: created.taskKey, pill };
});

await check('J5-editor', async () => {
  // Release notes: choose Onboarding redesign as its parent by search; greyed parts; then clear it.
  await openTask(T.notes.taskId);
  await page.getByTestId('task-page-edit').click();
  await page.getByTestId('task-part-of-input').waitFor({ timeout: 15000 });
  await page.getByTestId('task-part-of-input').click();
  await page.getByTestId('task-part-of-options').waitFor();
  const options = await page.$$eval('[data-testid="task-part-of-options"] [role="option"]', (els) => els.map((e) => ({ text: e.innerText.replace(/\s+/g, ' ').trim(), disabled: e.getAttribute('aria-disabled') })));
  assert(options.some((o) => o.disabled === 'true' && o.text.includes('Already part of a Task')), 'greyed parts', options);
  assert(!options.some((o) => o.text.startsWith(T.notes.taskKey + ' ')), 'not itself', options);
  await page.screenshot({ path: path.join(outDir, 'J5-editor-options-1440.png'), fullPage: true });
  await page.getByTestId('task-part-of-input').fill('onboarding');
  await until('search narrows', async () => (await page.$$eval('[data-testid="task-part-of-options"] [role="option"]', (els) => els.length)) >= 1);
  const searched = await page.$$eval('[data-testid="task-part-of-options"] [role="option"]', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
  await page.getByTestId(`task-part-of-option-${T.onboarding.taskId}`).click();
  const chosen = await text(page.getByTestId('task-part-of-selected'));
  assert(chosen.includes(T.onboarding.taskKey), 'chosen', chosen);
  await page.screenshot({ path: path.join(outDir, 'J5-editor-chosen-1440.png'), fullPage: true });
  await page.getByTestId('task-page-save').click();
  await page.getByTestId('task-part-of').waitFor({ timeout: 15000 });
  const partOfRow = await text(page.locator('[data-testid="task-part-of"] li'));
  assert(partOfRow.startsWith(T.onboarding.taskKey), 'saved parent shown', partOfRow);
  assert((await tasksOf(seed.main)).find((t) => t.taskId === T.notes.taskId).partOfTaskId === T.onboarding.taskId, 'stored');
  // Clear it again.
  await page.getByTestId('task-page-edit').click();
  await page.getByTestId('task-part-of-remove').click();
  await page.getByTestId('task-page-save').click();
  await until('cleared', async () => (await tasksOf(seed.main)).find((t) => t.taskId === T.notes.taskId).partOfTaskId === null);
  await until('no Part of card', async () => (await page.getByTestId('task-parts').count()) === 1 && (await page.getByTestId('task-part-of').count()) === 0);
  // A Task with parts shows the explanation instead of the search.
  await openBoard(seed.main); await openTask(T.p.taskId); await page.getByTestId('task-page-edit').click();
  await page.getByTestId('task-part-of-has-parts').waitFor({ timeout: 15000 });
  const hasParts = await text(page.getByTestId('task-part-of-has-parts'));
  assert(hasParts.includes("This Task has parts, so it can't be part of another Task."), 'has parts', hasParts);
  await page.screenshot({ path: path.join(outDir, 'J5-editor-has-parts-1440.png'), fullPage: true });
  return { options, searched, chosen, partOfRow, hasParts };
});

await check('J6-delete-note', async () => {
  await openBoard(seed.main);
  const tablesBefore = (await tasksOf(seed.main)).find((t) => t.taskId === T.tables.taskId);
  await openTask(T.cleanup.taskId);
  await page.getByTestId('task-page-delete').click();
  await page.getByTestId('task-page-delete-confirmation').waitFor();
  const note = await text(page.getByTestId('task-page-delete-parts-note'));
  assert(note === 'Its part stays as a separate Task.', 'one-part note', note);
  await shot('J6-delete-confirmation-1440');
  await page.getByTestId('task-page-delete-confirm').click();
  const tablesAfter = await until('part kept without parent', async () => { const t = (await tasksOf(seed.main)).find((x) => x.taskId === T.tables.taskId); return t && t.partOfTaskId === null ? t : null; });
  assert(tablesAfter.updatedAt === tablesBefore.updatedAt && tablesAfter.status === 'CANCELLED', 'updatedAt kept', { tablesBefore, tablesAfter });
  // The parent's own note for five parts (cancel the dialog).
  await openBoard(seed.main); await openTask(T.p.taskId);
  await page.getByTestId('task-page-delete').click();
  const many = await text(page.getByTestId('task-page-delete-parts-note'));
  assert(many === 'Its 6 parts stay as separate Tasks.', 'many-parts note', many);
  await page.getByTestId('task-page-delete-cancel').click();
  return { note, many, tablesAfter };
});

await check('J7-tab', async () => {
  await page.locator('[data-test="app-left-panel-primary-nav"]').getByText(/^(Workspaces|工作区|Agents|智能体)$/).first().click().catch(() => {});
  await sleep(800);
  const tabList = page.locator('[data-test="right-side-tab-list"]');
  const reachable = await tabList.isVisible().catch(() => false);
  await shot('J7-workspace-without-run');
  if (!reachable) return { reachable: false, note: 'The right panel tabs need a selected agent run; the instance has no runtime to start one (no provider, no scripted CLI in its baseline-only server environment). The tab views are covered by API-08 in the browser.' };
  await tabList.getByText('Projects', { exact: true }).click();
  await page.getByTestId('projects-panel-picker-select').selectOption(`project:${seed.main}`);
  await page.locator('[data-testid="projects-panel-board"]').getByTestId(`project-task-row-${T.p.taskId}`).getByTestId('project-task-row-link').click();
  await page.getByTestId('projects-panel-task').waitFor();
  const obs = { reachable: true, summary: await text(page.getByTestId('task-parts-summary')), newPart: await page.getByTestId('task-parts-new').count() };
  await shot('J7-tab-parent');
  return obs;
});

await check('J8-zh-CN', async () => {
  await page.locator('[data-test="app-left-panel-primary-nav"]').getByText(/^(Settings|设置)$/).first().click().catch(async () => go('/settings'));
  await sleep(600);
  if (!(await page.getByTestId('settings-language-select').count())) {
    await page.getByText(/^(Language|语言)$/).first().click();
  }
  await page.getByTestId('settings-language-select').selectOption('zh-CN');
  await until('zh-CN active', async () => (await text(page.getByTestId('settings-language-active-locale'))).length > 0 && /中/.test(await page.locator('body').innerText()));
  await openBoard(seed.main);
  const pill = await relations(T.p.taskId);
  const pillTitle = await card(T.p.taskId).getByTestId('task-parts-progress').getAttribute('title');
  const lineTitle = await card(T.docs.taskId).getByTestId('task-part-of-marker').getAttribute('title');
  await shot('J8-zh-board-1440');
  await openTask(T.p.taskId);
  const zh = { pill, pillTitle, lineTitle, heading: await text(page.locator('[data-testid="task-parts"] h2')), summary: await text(page.getByTestId('task-parts-summary')),
    hint: await text(page.getByTestId('task-parts-close-hint')), newPart: await text(page.getByTestId('task-parts-new')) };
  await page.screenshot({ path: path.join(outDir, 'J8-zh-parent-page-1440.png'), fullPage: true });
  await page.getByTestId('task-page-delete').click(); zh.deleteNote = await text(page.getByTestId('task-page-delete-parts-note')); await page.getByTestId('task-page-delete-cancel').click();
  await page.getByTestId('task-page-edit').click(); await page.getByTestId('task-part-of-has-parts').waitFor(); zh.hasParts = await text(page.getByTestId('task-part-of-has-parts'));
  await openBoard(seed.main); await openTask(T.docs.taskId);
  zh.partOfHeading = await text(page.locator('[data-testid="task-part-of"] h2'));
  await page.getByTestId('task-page-edit').click(); await page.getByTestId('task-part-of-picker').waitFor();
  zh.editorText = await text(page.getByTestId('task-part-of-picker'));
  await page.screenshot({ path: path.join(outDir, 'J8-zh-editor-1440.png'), fullPage: true });
  const expected = { pill: '4 个中已完成 2 个', heading: '子任务', summary: '4 个中已完成 2 个 · 1 个已取消', hint: '将此任务设为已完成或已取消时，其未完成的子任务也会同样设置。', newPart: '新建子任务',
    deleteNote: '它的 6 个子任务将保留为独立任务。', hasParts: '此任务有子任务，因此不能成为其他任务的子任务。', partOfHeading: '所属任务' };
  // The board pill shows the new part (5 counted); recompute the expected count text from the data.
  expected.pill = '5 个中已完成 2 个'; expected.summary = '5 个中已完成 2 个 · 1 个已取消';
  for (const [key, value] of Object.entries(expected)) assert(zh[key] === value || zh[key]?.includes(value), `zh ${key}`, { got: zh[key], value });
  assert(zh.pillTitle === '5 个中已完成 2 个 · 1 个已取消', 'zh pill title', zh);
  assert(zh.lineTitle.startsWith(`所属任务 ${T.p.taskKey}：Cross-node collaboration（`), 'zh line title', zh);
  // Back to English for the remaining checks.
  await page.locator('[data-test="app-left-panel-primary-nav"]').getByText(/^(Settings|设置)$/).first().click().catch(async () => go('/settings'));
  await sleep(600);
  if (!(await page.getByTestId('settings-language-select').count())) await page.getByText(/^(Language|语言)$/).first().click();
  await page.getByTestId('settings-language-select').selectOption('en');
  await sleep(600);
  return zh;
});

await check('J9-long-keys', async () => {
  await openBoard(seed.long);
  const line = await relations(L.part.taskId);
  const fits = await page.evaluate((id) => { const el = document.querySelector(`[data-testid="project-task-row-${id}"] [data-testid="project-task-row-relations"]`); const c = el.parentElement.getBoundingClientRect(); const r = el.getBoundingClientRect(); return r.right <= c.right + 0.5; }, L.part.taskId);
  await shot('J9-long-keys-board-1440');
  await openTask(L.part.taskId);
  const row = await text(page.locator('[data-testid="task-part-of"] li'));
  await page.screenshot({ path: path.join(outDir, 'J9-long-keys-part-page-1440.png'), fullPage: true });
  assert(line.includes('-1') && fits, 'long key line keeps the number and fits', { line, fits });
  assert(row.includes('-1') && row.includes('Redesign the enterprise onboarding journey'), 'long key row', row);
  return { line, fits, row, key: L.parent.taskKey };
});

await check('J10-narrow-board', async () => {
  await viewport(1440);
  await openBoard(seed.main);
  await viewport(760); await sleep(500);
  const fit = await page.$$eval('[data-testid="project-task-row-relations"]', (els) => els.map((el) => { const c = el.parentElement.getBoundingClientRect(); const r = el.getBoundingClientRect(); return r.right <= c.right + 0.5; }));
  await page.screenshot({ path: path.join(outDir, 'J10-board-760.png'), fullPage: true });
  await viewport(1440);
  assert(fit.length >= 3 && fit.every(Boolean), 'relation lines inside their cards at 760 px', fit);
  return { lines: fit.length };
});

await check('J11-step1-task', async () => {
  await viewport(1440);
  await openBoard(seed.main);
  const rel = await relations(T.step1.taskId);
  const stored = (await tasksOf(seed.main)).find((t) => t.taskId === T.step1.taskId);
  assert(rel === '' && stored.partOfTaskId === null, 'step-1 Task reads with no parent', { rel, stored });
  return { rel, partOfTaskId: stored.partOfTaskId };
});

evidence.results = results.map((r) => [r.name, r.result, r.error?.split('\n')[0]]);
await fs.writeFile(path.join(outDir, 'result.json'), `${JSON.stringify({ evidence, results, errors }, null, 2)}\n`);
console.log(JSON.stringify({ results: evidence.results, errors: errors.slice(0, 10) }, null, 1));
process.exit(0); // disconnect only: never close the instance from here (it is stopped with isolated-app stop)

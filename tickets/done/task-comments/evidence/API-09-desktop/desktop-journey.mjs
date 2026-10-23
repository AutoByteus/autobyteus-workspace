#!/usr/bin/env node
// API-09 (task-comments AC-013, AC-011, AC-012 rendered, AC-003, AC-004, AC-016): the user journeys in the isolated desktop instance
// of this worktree's build, driven over the instance's own CDP control port (attach only; never another port). Ticket-owned.
// Usage (worktree root): node …/desktop-journey.mjs <controlPort> <graphqlUrl> <seed.json> <fresh outDir>   (ONLY=J1,J2 to select)
// J1 Task page thread (app + agent comments, oldest first, number, time, full text; card order), J2 add from the Task page,
// J3 empty state, J4 board search by a comment-only word, J5 tab (if the right panel is reachable without a runtime),
// J6 zh-CN, J7 narrow layout, J8 a Task file without `comments` (AC-011).
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const [controlPort, graphqlUrl, seedFile, outDir] = process.argv.slice(2);
const require = createRequire(path.join(process.cwd(), 'autobyteus-web/package.json'));
const { chromium } = require('playwright-core');
await fs.mkdir(outDir, { recursive: false });
const seed = JSON.parse(await fs.readFile(seedFile, 'utf8'));
const T = seed.tasks;
const results = []; const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (c, m, d) => { if (!c) throw new Error(`${m}${d === undefined ? '' : ` ${JSON.stringify(d)}`}`); };
const until = async (label, fn, ms = 20000) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(150); } throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`); };
const gql = async (query, variables = {}) => { const r = await fetch(graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); const b = await r.json(); if (b.errors?.length) throw new Error(JSON.stringify(b.errors)); return b.data; };
const tasksOf = async () => (await gql('query($id:String!){projectTasks(projectId:$id){taskId taskKey status description updatedAt comments{id createdAt text}}}', { id: seed.projectId })).projectTasks;

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${controlPort}`);
const page = await until('renderer page', async () => browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('/renderer/index.html')), 30000);
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const cdp = await page.context().newCDPSession(page);
const viewport = async (width, height = 900) => { await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); await sleep(400); };
const shot = (name, fullPage = false) => page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage });
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const check = async (name, fn) => { if (only && !only.includes(name.split('-')[0])) return; try { const obs = await fn(); results.push({ name, result: 'Pass', obs }); } catch (e) { results.push({ name, result: 'Fail', error: String(e.stack || e) }); await shot(`${name}-failure`).catch(() => {}); } };
const text = async (loc) => (await loc.innerText()).replace(/\s+/g, ' ').trim();
const card = (taskId) => page.getByTestId(`project-task-row-${taskId}`);
const thread = () => page.$$eval('[data-testid="project-task-page"] li[data-testid^="task-comment-"]', (els) => els.map((el) => ({ id: el.getAttribute('data-testid'),
  meta: el.querySelector('[data-testid="task-comment-meta"]')?.innerText.replace(/\s+/g, ' ').trim(), datetime: el.querySelector('time')?.getAttribute('datetime'),
  title: el.querySelector('time')?.getAttribute('title'), text: el.querySelector('[data-testid="task-comment-text"]')?.innerText })));
const openBoard = async () => {
  if (!(await page.locator('[data-test="app-left-panel-primary-nav"]').isVisible().catch(() => false))) {
    await page.getByText(/^(Back to workspace|返回工作区)$/i).first().click(); await sleep(600);
  }
  await page.locator('[data-test="app-left-panel-primary-nav"]').getByText(/^(Projects|项目)$/).first().click();
  await page.getByTestId(`project-card-${seed.projectId}`).click();
  await card(T.notes.taskId).waitFor({ timeout: 30000 });
  await sleep(300);
};
const openTask = async (taskId) => { await card(taskId).getByTestId('project-task-row-link').click(); await page.getByTestId('project-task-page').waitFor({ timeout: 20000 }); await sleep(300); };
const openSettingsLanguage = async () => {
  // Settings sits at the bottom of the left panel (not in the primary nav).
  await page.getByText(/^(Settings|设置)$/).last().click();
  await sleep(600);
  if (!(await page.getByTestId('settings-language-select').count())) await page.getByText(/^(Language|语言)$/).first().click();
  await page.getByTestId('settings-language-select').waitFor();
};

await viewport(1440);
await page.bringToFront();

await check('J1-task-page-thread', async () => {
  await openBoard(); await openTask(T.notes.taskId);
  await page.getByTestId('task-comments').waitFor();
  const comments = await thread();
  const order = await page.$$eval('[data-testid="task-page-reading-surface"] ~ section', (els) => els.map((e) => e.getAttribute('data-testid')));
  await shot('J1-task-page-thread-1440', true);
  assert(comments.map((c) => c.text).join('|') === ['Dispatched with this direction: keep it short.', 'User decided: mention the quokka mascot.\nSecond line of the same comment.',
    'Agent: first draft is in the docs folder.', 'Agent: started the review.'].join('|'), 'texts oldest first (app, app, agent, agent)', comments);
  assert(comments.every((c, i) => c.meta.startsWith(`#${i + 1} ·`) && /^\d{4}-\d{2}-\d{2}T/.test(c.datetime) && c.title), 'number, time, full time title', comments);
  assert(order[0] === 'task-comments', 'Comments card right after Description', order);
  const status = await text(page.getByTestId('task-page-status').first()).catch(() => null);
  return { comments, order, status };
});

await check('J2-add-from-page', async () => {
  const input = page.locator('[data-testid="project-task-page"]').getByTestId('task-comment-input');
  const add = page.locator('[data-testid="project-task-page"]').getByTestId('task-comment-add');
  const before = (await tasksOf()).find((t) => t.taskId === T.notes.taskId);
  const emptyDisabled = await add.isDisabled();
  await input.fill('   \n ');
  const blankDisabled = await add.isDisabled();
  await input.fill('From the desktop app: the copy is approved.');
  await add.click();
  await until('#5 shown', async () => (await thread()).length === 5, 15000);
  const cleared = (await input.inputValue()) === '';
  const after = (await tasksOf()).find((t) => t.taskId === T.notes.taskId);
  await shot('J2-after-add-1440', true);
  assert(emptyDisabled && blankDisabled && cleared, 'blank disabled; box cleared', { emptyDisabled, blankDisabled, cleared });
  assert(after.comments.at(-1).id === 5 && after.comments.at(-1).text === 'From the desktop app: the copy is approved.' && after.description === before.description, 'stored, description unchanged', after);
  assert(Date.parse(after.updatedAt) >= Date.parse(before.updatedAt), 'updatedAt bumped or equal', { before: before.updatedAt, after: after.updatedAt });
  return { last: after.comments.at(-1), descriptionUnchanged: true };
});

await check('J3-empty-state', async () => {
  await openBoard(); await openTask(T.sidebar.taskId);
  const none = await text(page.getByTestId('task-comments-none'));
  await shot('J3-empty-state-1440', true);
  assert(none === 'No comments yet.', 'empty state', none);
  return { none };
});

await check('J4-board-search', async () => {
  await openBoard();
  const cards = () => page.$$eval('[data-testid^="project-task-row-project_task_"]', (els) => els.map((e) => e.getAttribute('data-testid').replace('project-task-row-', '')));
  const all = await cards();
  await page.getByTestId('project-tasks-search-input').fill('quokka');
  await until('only the commented Task', async () => { const c = await cards(); return c.length === 1 && c[0] === T.notes.taskId; }, 30000);
  await shot('J4-board-search-quokka-1440');
  await page.getByTestId('project-tasks-search-input').fill('');
  await until('restored', async () => (await cards()).length === all.length, 30000);
  return { all: all.length, searched: [T.notes.taskKey] };
});

await check('J5-tab', async () => {
  // The right panel's Projects tab, from the Chat page: opened from the right tool strip (or its tab list when docked).
  if (!(await page.locator('[data-test="app-left-panel-primary-nav"]').isVisible().catch(() => false))) await page.getByText(/^(Back to workspace|返回工作区)$/i).first().click();
  await page.locator('[data-test="app-left-panel-primary-nav"]').getByText(/^(Chat|对话)$/).first().click();
  await sleep(800);
  // With no run selected the Chat start page shows "Show tools", which opens the right panel's tabs.
  const tabList = page.locator('[data-test="right-side-tab-list"]');
  if (!(await tabList.isVisible().catch(() => false))) await page.locator('[data-test="start-surface-tools-toggle"]').click();
  await until('right panel tabs', async () => (await tabList.isVisible().catch(() => false)) || (await page.locator('[data-test="workspace-right-tool-strip-surface"] button[data-tab-name="projects"]').isVisible().catch(() => false)), 10000);
  if (await tabList.isVisible().catch(() => false)) await tabList.getByText(/^(Projects|项目)$/).first().click();
  else await page.locator('[data-test="workspace-right-tool-strip-surface"] button[data-tab-name="projects"]').click();
  await page.getByTestId('projects-panel').waitFor({ timeout: 20000 });
  await page.getByTestId('projects-panel-picker-select').selectOption(`project:${seed.projectId}`);
  const tabCard = (taskId) => page.locator('[data-testid="projects-panel-board"]').getByTestId(`project-task-row-${taskId}`);
  await tabCard(T.notes.taskId).getByTestId('project-task-row-link').click();
  const scope = page.getByTestId('projects-panel-task');
  await scope.getByTestId('task-comments').waitFor({ timeout: 20000 });
  const tabThread = () => page.$$eval('[data-testid="projects-panel-task"] li[data-testid^="task-comment-"]', (els) => els.map((el) => ({ id: el.getAttribute('data-testid'),
    meta: el.querySelector('[data-testid="task-comment-meta"]')?.innerText.replace(/\s+/g, ' ').trim(), text: el.querySelector('[data-testid="task-comment-text"]')?.innerText })));
  const before = await tabThread();
  await shot('J5-tab-thread-1440');
  // Add from the tab.
  await scope.getByTestId('task-comment-input').fill('Added from the tab in the desktop app.');
  await scope.getByTestId('task-comment-add').click();
  await until('tab shows the new comment', async () => (await tabThread()).length === before.length + 1, 15000);
  const after = await tabThread();
  const stored = (await tasksOf()).find((t) => t.taskId === T.notes.taskId);
  await shot('J5-tab-after-add-1440');
  assert(before.length === 5 && before[0].meta.startsWith('#1 ·') && before.at(-1).text === 'From the desktop app: the copy is approved.', 'tab thread before (after J2)', before);
  assert(after.at(-1).text === 'Added from the tab in the desktop app.' && after.at(-1).meta.startsWith(`#${before.length + 1} ·`), 'tab add', after);
  assert(stored.comments.at(-1).text === 'Added from the tab in the desktop app.', 'stored from the tab', stored.comments.at(-1));
  // Close the tab panel's Task view state for the next journeys by going back to the board.
  await page.getByTestId('projects-panel-task-back').click().catch(() => {});
  return { reachable: true, before: before.length, after: after.length, last: after.at(-1) };
});

await check('J6-zh-CN', async () => {
  await openSettingsLanguage();
  await page.getByTestId('settings-language-select').selectOption('zh-CN');
  await sleep(600);
  await openBoard(); await openTask(T.notes.taskId);
  const zh = { title: await text(page.locator('[data-testid="task-comments"] h2')), placeholder: await page.locator('[data-testid="project-task-page"]').getByTestId('task-comment-input').getAttribute('placeholder'),
    add: await text(page.locator('[data-testid="project-task-page"]').getByTestId('task-comment-add')), firstMeta: (await thread())[0]?.meta };
  await shot('J6-zh-task-page-1440', true);
  await openBoard(); await openTask(T.sidebar.taskId);
  zh.none = await text(page.getByTestId('task-comments-none'));
  const expected = { title: '评论', placeholder: '添加评论', add: '添加评论', none: '暂无评论。' };
  for (const [k, v] of Object.entries(expected)) assert(zh[k] === v, `zh ${k}`, zh);
  await openSettingsLanguage();
  await page.getByTestId('settings-language-select').selectOption('en');
  await sleep(600);
  return zh;
});

await check('J7-narrow', async () => {
  await viewport(1440); await openBoard(); await openTask(T.notes.taskId);
  await viewport(760); await sleep(500);
  const fit = await page.evaluate(() => { const el = document.querySelector('[data-testid="task-comments"]'); const r = el.getBoundingClientRect();
    const texts = [...el.querySelectorAll('[data-testid="task-comment-text"]')].every((t) => t.scrollWidth <= t.clientWidth + 1);
    return { cardRight: r.right, viewport: window.innerWidth, inside: r.right <= window.innerWidth + 0.5, texts, docOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1 }; });
  await shot('J7-task-page-760', true);
  await viewport(1440);
  assert(fit.inside && fit.texts && fit.docOverflow, 'no horizontal overflow at 760 px', fit);
  return fit;
});

await check('J8-existing-data', async () => {
  await viewport(1440); await openBoard(); await openTask(T.old.taskId);
  const none = await text(page.getByTestId('task-comments-none'));
  const stored = (await tasksOf()).find((t) => t.taskId === T.old.taskId);
  assert(none === 'No comments yet.' && stored.comments.length === 0, 'a Task file without comments reads as none', { none, stored });
  return { none, comments: stored.comments };
});

await fs.writeFile(path.join(outDir, 'result.json'), `${JSON.stringify({ results, errors }, null, 2)}\n`);
console.log(JSON.stringify({ results: results.map((r) => [r.name, r.result, r.error?.split('\n')[0]]), errors: errors.slice(0, 10) }, null, 1));
process.exit(0); // disconnect only: never close the instance from here (it is stopped with isolated-app stop)

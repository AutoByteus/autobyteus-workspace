// Implementation-scoped rendered check of the task-comments UI against a test-owned stack (not a probe/sign-off).
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const [base, projectId, outDir] = process.argv.slice(2);
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage(); const results = []; const errors = [];
const watch = (p) => { p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); };
watch(page);
const shot = (p, name, opts = {}) => p.screenshot({ path: path.join(outDir, `${name}.png`), ...opts });
const check = async (name, fn) => { try { results.push({ name, result: 'Pass', obs: await fn() }); } catch (e) { results.push({ name, result: 'Fail', error: String(e.stack || e) }); await shot(page, `${name}-failure`).catch(() => {}); } };
const assert = (c, m) => { if (!c) throw new Error(m); };
const board = `${base}/projects/${projectId}`;
const rows = (p) => p.$$eval('[data-testid="task-comments"] li', (els) => els.map((el) => ({
  meta: el.querySelector('[data-testid="task-comment-meta"]').textContent.replace(/\s+/g, ' ').trim(),
  title: el.querySelector('time').getAttribute('title'), text: el.querySelector('[data-testid="task-comment-text"]').textContent })));
await page.goto(board); await page.waitForTimeout(4000); await page.reload(); await page.getByTestId('project-task-row-text').first().waitFor({ timeout: 60000 });

await check('task-page-thread', async () => {
  await page.goto(`${board}/tasks/autobyteus-1`); await page.getByTestId('task-comments').waitFor();
  await shot(page, 'task-page-thread-1440', { fullPage: true });
  const thread = await rows(page);
  assert(thread.length === 3 && thread.map((r) => r.meta.split(' · ')[0]).join() === '#1,#2,#3', JSON.stringify(thread));
  assert(thread[1].text === 'User decided:\n- ship the relay on the beta channel first\n- keep the old bridge until 1.6', JSON.stringify(thread[1]));
  const order = await page.$$eval('[data-testid="task-page-reading-surface"] ~ section', (els) => els.map((e) => e.getAttribute('data-testid')));
  assert(order[0] === 'task-comments' && order[1] === 'task-parts' && order[2] === 'task-dependencies', JSON.stringify(order));
  const card = await page.getByTestId('task-comments').boundingBox(); const desc = await page.getByTestId('task-page-reading-surface').boundingBox();
  const long = await page.locator('[data-testid="task-comment-3"] [data-testid="task-comment-text"]').boundingBox();
  assert(long.x + long.width <= card.x + card.width, 'long comment overflows the card');
  return { thread, order, gapAbove: card.y - (desc.y + desc.height), longTextHeight: long.height };
});
await check('add-comment-live', async () => {
  const other = await ctx.newPage(); watch(other);
  await other.goto(`${board}/tasks/autobyteus-1`); await other.getByTestId('task-comments').waitFor();
  const add = page.getByTestId('task-comment-add'), box = page.getByTestId('task-comment-input');
  assert(await add.isDisabled(), 'Add enabled while blank');
  await box.fill('   '); assert(await add.isDisabled(), 'Add enabled for whitespace');
  await box.fill('Looks good from the app.'); await box.press('Enter'); await box.type('Second line.');
  assert(!(await add.isDisabled()), 'Add disabled with text');
  await add.click();
  await page.locator('[data-testid="task-comment-4"]').waitFor();
  assert((await box.inputValue()) === '', 'box not cleared');
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
  assert(focused === 'task-comment-input', `focus on ${focused}`);
  await other.locator('[data-testid="task-comment-4"]').waitFor({ timeout: 15000 });
  const live = (await rows(other)).at(-1);
  assert(live.text === 'Looks good from the app.\nSecond line.', JSON.stringify(live));
  await shot(page, 'task-page-after-add-1440', { fullPage: true }); await shot(other, 'second-view-live-1440', { fullPage: true });
  await other.close(); return { live, focused };
});
await check('empty-and-refused', async () => {
  await page.goto(`${board}/tasks/autobyteus-3`); await page.getByTestId('task-comments-none').waitFor();
  await shot(page, 'task-page-no-comments-1440', { fullPage: true });
  await page.goto(`${board}/tasks/autobyteus-2`); await page.getByTestId('task-comments').waitFor();
  const thread = await rows(page); assert(thread.length === 1, 'the blank seed comment was stored');
  return { none: await page.getByTestId('task-comments-none').count(), autobyteus2: thread.map((r) => r.text) };
});
await check('board-search-comment', async () => {
  await page.goto(board); await page.getByTestId('project-task-row-text').first().waitFor();
  const before = await page.$$eval('[data-testid="project-task-row-text"]', (els) => els.map((e) => e.textContent.trim()));
  await page.locator('input[type="search"], input[placeholder*="Describe"]').first().fill('quokka');
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="project-task-row-text"]').length === 1, null, { timeout: 15000 });
  const after = await page.$$eval('[data-testid="project-task-row-text"]', (els) => els.map((e) => e.textContent.trim()));
  assert(after.join() === 'Release notes for 1.5.6', JSON.stringify(after));
  await shot(page, 'board-search-quokka-1440');
  return { before, after };
});
await check('narrow-760', async () => {
  await page.setViewportSize({ width: 760, height: 900 }); await page.goto(`${board}/tasks/autobyteus-1`); await page.getByTestId('task-comments').waitFor();
  await shot(page, 'task-page-760', { fullPage: true });
  const over = await page.$$eval('[data-testid="task-comments"] li, [data-testid="task-comment-form"]', (els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).length);
  assert(over === 0, `${over} overflowing`); return { overflowing: over };
});
await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify({ results, errors }, null, 2));
console.log(JSON.stringify({ results: results.map((r) => [r.name, r.result, r.error?.split('\n')[0]]), errors: errors.slice(0, 10) }, null, 1));
await browser.close();

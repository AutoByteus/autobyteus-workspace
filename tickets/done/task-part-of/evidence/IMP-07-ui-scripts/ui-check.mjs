// Implementation-scoped rendered check of the task-part-of UI against a test-owned stack (not a probe/sign-off).
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const [base, projectId, outDir] = process.argv.slice(2);
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const results = []; const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (name, opts = {}) => page.screenshot({ path: path.join(outDir, `${name}.png`), ...opts });
const check = async (name, fn) => { try { const obs = await fn(); results.push({ name, result: 'Pass', obs }); } catch (e) { results.push({ name, result: 'Fail', error: String(e.stack || e) }); await shot(`${name}-failure`).catch(() => {}); } };
const assert = (c, m) => { if (!c) throw new Error(m); };
const idOf = async (key) => page.evaluate(async ({ projectId, key }) => {
  const r = await fetch('/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: `{ projectTasks(projectId: "${projectId}") { taskId taskKey } }` }) });
  return (await r.json()).data.projectTasks.find((t) => t.taskKey === key).taskId; }, { projectId, key });
const board = `${base}/projects/${projectId}`;
await page.goto(board); await page.waitForTimeout(4000); await page.reload(); await page.getByTestId('project-task-row-text').first().waitFor({ timeout: 60000 });

await check('board-1440', async () => {
  await page.waitForTimeout(500); await shot('board-1440');
  const cards = await page.$$eval('[data-testid="project-task-row-text"]', (els) => els.map((el) => { const card = el.closest('a,button,[data-testid="project-task-row-link"]')?.parentElement ?? el.parentElement;
    const rel = card.querySelector('[data-testid="project-task-row-relations"]');
    return { text: el.textContent.trim(), relations: rel ? [...rel.children].map((c) => `${c.getAttribute('data-testid') ?? c.firstElementChild?.getAttribute('data-testid')}:${c.textContent.replace(/\s+/g, ' ').trim()}`) : null,
      pillTitle: rel?.querySelector('[data-testid="task-parts-progress"]')?.getAttribute('title') ?? null, lineTitle: rel?.querySelector('[data-testid="task-part-of-marker"]')?.getAttribute('title') ?? null }; }));
  const by = Object.fromEntries(cards.map((c) => [c.text, c]));
  assert(by['Cross-node collaboration'].relations.join() === 'task-parts-progress:2 of 4 done', JSON.stringify(by['Cross-node collaboration']));
  assert(by['Cross-node collaboration'].pillTitle === '2 of 4 done · 1 cancelled', 'pill title');
  assert(by['Onboarding redesign'].relations.join() === 'task-parts-progress:2 of 2 done', 'green');
  assert(by['Old migration cleanup'].relations === null, 'only cancelled → no pill');
  assert(by['Release notes for 1.5.6'].relations === null, 'plain card');
  assert(by['Write the protocol docs'].relations.length === 2 && by['Write the protocol docs'].relations[0].startsWith('project-task-row-dependency') && by['Write the protocol docs'].relations[1].includes('Part ofautobyteus-1'), JSON.stringify(by['Write the protocol docs']));
  assert(by['Write the protocol docs'].lineTitle === 'Part of autobyteus-1: Cross-node collaboration (In Progress)', by['Write the protocol docs'].lineTitle);
  const lanes = await page.$$eval('[data-testid="project-task-row-text"]', (els) => els.length);
  return { cards, lanes };
});
await check('parent-page', async () => {
  await page.goto(`${board}/tasks/autobyteus-1`); await page.getByTestId('task-parts').waitFor();
  await shot('parent-page-1440', { fullPage: true });
  const summary = (await page.getByTestId('task-parts-summary').innerText()).replace(/\s+/g, ' ');
  assert(summary === '2 of 4 done · 1 cancelled', summary);
  const rows = await page.$$eval('[data-testid="task-parts"] li', (els) => els.map((el) => el.innerText.replace(/\s+/g, ' ').trim()));
  assert(rows.length === 5 && rows[0].startsWith('autobyteus-2'), JSON.stringify(rows));
  assert(await page.getByTestId('task-parts-close-hint').isVisible(), 'hint');
  const order = await page.$$eval('[data-testid="task-page-reading-surface"] ~ section', (els) => els.map((e) => e.getAttribute('data-testid')));
  assert(order[0] === 'task-parts' && order[1] === 'task-dependencies', JSON.stringify(order));
  const box = await page.getByTestId('task-parts').boundingBox(); const desc = await page.getByTestId('task-page-reading-surface').boundingBox(); const deps = await page.getByTestId('task-dependencies').boundingBox();
  const row = await page.locator('[data-testid="task-parts"] li a').first().boundingBox();
  const newPart = await page.getByTestId('task-parts-new').boundingBox();
  return { summary, rows, gapAbove: box.y - (desc.y + desc.height), gapBelow: deps.y - (box.y + box.height), rowHeight: row.height, newPartHeight: newPart.height };
});
await check('delete-note', async () => {
  await page.getByTestId('task-page-delete').click(); await page.getByTestId('task-page-delete-confirmation').waitFor();
  const note = await page.getByTestId('task-page-delete-parts-note').innerText();
  assert(note === 'Its 5 parts stay as separate Tasks.', note); await shot('parent-delete-confirmation-1440');
  await page.getByTestId('task-page-delete-cancel').click(); return { note };
});
await check('part-page', async () => {
  await page.goto(`${board}/tasks/autobyteus-4`); await page.getByTestId('task-part-of').waitFor(); await shot('part-page-1440', { fullPage: true });
  const row = (await page.locator('[data-testid="task-part-of"] li').innerText()).replace(/\s+/g, ' ').trim();
  assert(row.startsWith('autobyteus-1') && row.includes('In Progress') && row.includes('Cross-node collaboration'), row);
  assert(!(await page.getByTestId('task-parts-new').count()), 'no New part on a part');
  await page.locator('[data-testid="task-part-of"] li a').click(); await page.waitForURL(/tasks\/autobyteus-1$/); return { row };
});
await check('editor-new-part', async () => {
  await page.goto(`${board}/tasks/autobyteus-1`); await page.getByTestId('task-parts-new').click();
  await page.getByTestId('task-part-of-selected').waitFor(); await shot('new-part-editor-1440', { fullPage: true });
  const selected = (await page.getByTestId('task-part-of-selected').innerText()).replace(/\s+/g, ' ');
  assert(selected.includes('autobyteus-1'), selected);
  const fields = await page.$$eval('[data-testid="task-part-of-picker"], [data-testid="task-dependency-picker"]', (els) => els.map((e) => e.getAttribute('data-testid')));
  assert(fields[0] === 'task-part-of-picker', JSON.stringify(fields));
  await page.locator('#task-page-description').fill('Ship the relay to the beta channel');
  await page.getByTestId('task-page-save').click(); await page.waitForURL(/projects\/[^/]+\?notice=task-created|projects\/[^/]+$/);
  return { selected, fields };
});
await check('editor-search-blocked', async () => {
  await page.goto(`${board}/tasks/autobyteus-7/edit`); await page.getByTestId('task-part-of-input').waitFor();
  await page.getByTestId('task-part-of-input').click(); await page.getByTestId('task-part-of-options').waitFor(); await shot('editor-search-1440', { fullPage: true });
  const options = await page.$$eval('[data-testid="task-part-of-options"] [role="option"]', (els) => els.map((e) => ({ text: e.innerText.replace(/\s+/g, ' ').trim(), disabled: e.getAttribute('aria-disabled') })));
  assert(options.some((o) => o.disabled === 'true' && o.text.includes('Already part of a Task')), JSON.stringify(options));
  await page.keyboard.press('Enter'); const chosen = (await page.getByTestId('task-part-of-selected').innerText()).replace(/\s+/g, ' ');
  await shot('editor-chosen-1440', { fullPage: true });
  await page.getByTestId('task-page-save').click(); await page.waitForURL(/tasks\/autobyteus-7(\?|$)/);
  await page.getByTestId('task-part-of').waitFor(); return { options, chosen };
});
await check('editor-has-parts', async () => {
  await page.goto(`${board}/tasks/autobyteus-8/edit`); await page.getByTestId('task-part-of-has-parts').waitFor(); await shot('editor-has-parts-1440', { fullPage: true });
  return { text: await page.getByTestId('task-part-of-has-parts').innerText() };
});
await check('board-narrow-760', async () => {
  await page.setViewportSize({ width: 760, height: 900 }); await page.goto(board); await page.getByTestId('project-task-row-text').first().waitFor(); await page.waitForTimeout(500);
  await shot('board-760', { fullPage: true });
  const overflow = await page.$$eval('[data-testid="project-task-row-relations"]', (els) => els.map((el) => { const card = el.parentElement.getBoundingClientRect(); const r = el.getBoundingClientRect(); return r.right <= card.right + 0.5; }));
  assert(overflow.every(Boolean), 'relation line overflows its card'); return { lines: overflow.length };
});
await fs.writeFile(path.join(outDir, 'result.json'), JSON.stringify({ results, errors }, null, 2));
console.log(JSON.stringify({ results: results.map((r) => [r.name, r.result, r.error?.split('\n')[0]]), errors: errors.slice(0, 10) }, null, 1));
await browser.close();

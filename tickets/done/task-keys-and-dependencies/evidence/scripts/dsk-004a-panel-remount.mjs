import { createRequire } from 'node:module';
const [webDir, endpoint, pidA, pidB, shotPath] = process.argv.slice(2);
const { chromium } = createRequire(webDir + '/package.json')('playwright-core');
const b = await chromium.connectOverCDP(endpoint); const page = b.contexts()[0].pages().find(p => p.url().includes('/renderer/index.html'));
await page.setViewportSize({ width: 1440, height: 900 });
const panel = page.locator('[data-test="right-side-projects-panel"]');
const sel = panel.getByTestId('projects-panel-picker-select');
const out = [];
for (let round = 0; round < 3; round++) {
  await sel.selectOption(`project:${pidB}`); await page.waitForTimeout(800);
  const t0 = Date.now(); await sel.selectOption(`project:${pidA}`);
  const samples = [];
  while (Date.now() - t0 < 3000) {
    const s = await panel.locator('[data-testid^="project-task-row-project_task_"]').evaluateAll(es => es.map(e => [e.querySelector('[data-testid="task-key"]')?.getAttribute('data-key'), e.querySelector('[data-testid^="task-dependency-badge-"]') ? 'B' : '-']));
    samples.push({ ms: Date.now() - t0, rows: s.length, badges: s.filter(x => x[1] === 'B').map(x => x[0]) });
    if (s.length && s.filter(x => x[1] === 'B').length === 2) break;
    await page.waitForTimeout(20);
  }
  out.push({ round, first: samples.find(x => x.rows > 0), done: samples[samples.length - 1], samples: samples.length });
}
console.log(JSON.stringify(out, null, 1));
await page.screenshot({ path: shotPath });
await b.close();

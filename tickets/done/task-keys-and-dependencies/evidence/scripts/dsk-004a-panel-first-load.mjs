import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const [webDir, endpoint, runId, pidA, outJson, shotPath] = process.argv.slice(2);
const { chromium } = createRequire(webDir + '/package.json')('playwright-core');
const b = await chromium.connectOverCDP(endpoint);
const page = await (async () => { for (let i = 0; i < 100; i++) { const p = b.contexts()[0]?.pages().find(p => p.url().includes('/renderer/index.html')); if (p) return p; await new Promise(r => setTimeout(r, 200)); } })();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.setViewportSize({ width: 1440, height: 900 });
await page.evaluate(h => { location.hash = h; }, `#/chat?id=${encodeURIComponent(runId)}`);
await page.locator('[data-test="right-side-tab-list"] [data-tab-name="projects"]').waitFor({ timeout: 60000 });
await page.locator('[data-test="right-side-tab-list"] [data-tab-name="projects"]').click();
const panel = page.locator('[data-test="right-side-projects-panel"]');
const sel = panel.getByTestId('projects-panel-picker-select'); await sel.waitFor({ timeout: 30000 });
const initialChoice = await sel.inputValue();
const t0 = Date.now(); if (initialChoice !== `project:${pidA}`) await sel.selectOption(`project:${pidA}`);
const samples = [];
while (Date.now() - t0 < 8000) {
  const s = await panel.locator('[data-testid^="project-task-row-project_task_"]').evaluateAll(es => es.map(e => [e.querySelector('[data-testid="task-key"]')?.getAttribute('data-key'), e.querySelector('[data-testid^="task-dependency-badge-"]')?.innerText.replace(/\s+/g, ' ').trim() ?? null]));
  const last = samples[samples.length - 1];
  const sig = JSON.stringify(s);
  if (!last || last.sig !== sig) samples.push({ ms: Date.now() - t0, sig, rows: s.length, badges: s.filter(x => x[1]) });
  await page.waitForTimeout(15);
}
await page.screenshot({ path: shotPath });
const result = { initialChoice, samples: samples.map(({ sig, ...x }) => x), errors };
await fs.writeFile(outJson, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 1));
await b.close();

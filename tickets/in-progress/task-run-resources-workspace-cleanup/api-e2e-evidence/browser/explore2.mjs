import * as L from './lib.mjs';
const browser = await L.chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(L.state().frontendUrl + '/workspace', { waitUntil: 'networkidle', timeout: 120000 });
await L.sleep(2000);
await page.locator('[data-test="workspace-row"]').nth(1).click();
await L.sleep(1500);
const dump = async (label) => {
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-test="app-left-panel-run-history"] [data-test], [data-test="app-left-panel-run-history"] [role="treeitem"]')]
    .map(e => `${e.getAttribute('data-test')}|${e.getAttribute('role')}|${(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,70)}`));
  console.log('==', label); console.log(rows.slice(0, 60).join('\n'));
};
await dump('after workspace expand');
await page.locator('[data-test="workspace-agent-row"]').first().click();
await L.sleep(1500);
await dump('after agent group expand');
const run = page.locator('[data-test^="workspace-run-row"], [data-test*="run-row"]').first();
console.log('run rows', await page.locator('[data-test*="run-row"]').count());
if (await run.count()) { await run.click(); await L.sleep(4000); await dump('after run click'); }
await page.screenshot({ path: new URL('./explore-2.png', import.meta.url).pathname });
await browser.close();

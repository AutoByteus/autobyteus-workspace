import * as L from './lib.mjs';
const browser = await L.chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto(L.state().frontendUrl + '/workspace', { waitUntil: 'networkidle', timeout: 120000 });
await L.sleep(1500);
await page.locator('[data-test="workspace-row"]').nth(1).click(); await L.sleep(1000);
await page.locator('[data-test^="workspace-team-definition-row-"]').first().click(); await L.sleep(1000);
await page.locator('[data-test^="agent-org-definition-"]').first().click(); await L.sleep(1000);
const dump = async (label) => { const rows = await page.evaluate(() => [...document.querySelectorAll('[data-test="app-left-panel-run-history"] [data-test]')]
  .map(e => `${e.getAttribute('data-test').slice(0,70)}|${e.getAttribute('role')}|${(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,50)}`)
  .filter(s => !/branches|status-dot|avatar\||activity-dot/.test(s)));
  console.log('==', label); console.log(rows.slice(0, 80).join('\n')); };
await dump('groups expanded');
// expand team run and org run rows
const teamRun = page.locator('[data-test^="workspace-team-row-"]').first();
if (await teamRun.count()) { await teamRun.click(); await L.sleep(2500); }
const orgRun = page.locator('[data-test^="agent-org-run-row-"], [data-test^="agent-org-run-"]').first();
console.log('org run candidates', await page.locator('[data-test^="agent-org-run"]').count());
if (await orgRun.count()) { await orgRun.click(); await L.sleep(2500); }
await dump('runs expanded');
await page.screenshot({ path: new URL('./explore-5.png', import.meta.url).pathname, fullPage: true });
await browser.close();

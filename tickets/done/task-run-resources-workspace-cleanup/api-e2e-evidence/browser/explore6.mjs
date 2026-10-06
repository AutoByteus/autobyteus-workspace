import * as L from './lib.mjs';
const browser = await L.chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto(L.state().frontendUrl + '/workspace', { waitUntil: 'networkidle', timeout: 120000 });
await L.sleep(1500);
await page.locator('[data-test="workspace-row"]').nth(1).click(); await L.sleep(800);
await page.locator('[data-test^="workspace-team-definition-row-"]').first().click(); await L.sleep(800);
await page.locator('[data-test^="workspace-team-row-"]').first().click(); await L.sleep(2500);
const center = async (label) => { console.log('==', label);
  console.log(await page.evaluate(() => [...document.querySelectorAll('[data-test="workspace-center-pane"] [data-test], [data-test="workspace-center-pane"] [role="tab"], [data-test="workspace-center-pane"] button')]
   .map(e => `${e.getAttribute('data-test')}|${e.getAttribute('role')}|${(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,50)}`).slice(0,60).join('\n'))); };
await center('team run selected');
await page.screenshot({ path: new URL('./explore-6.png', import.meta.url).pathname });
// Agent root: run row selected shows host with Team tab?
await page.locator('[data-test="workspace-agent-row"]').first().click(); await L.sleep(800);
await page.locator('[data-test="workspace-agent-run-row"]').first().click(); await L.sleep(2500);
await center('agent run selected');
await page.screenshot({ path: new URL('./explore-6b.png', import.meta.url).pathname });
await browser.close();

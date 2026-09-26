import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../../autobyteus-web/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const dir = new URL('.', import.meta.url).pathname;
const info = JSON.parse(await fs.readFile(dir + 'live-stack-info.json'));
const ev = { startedAt: new Date().toISOString(), errors: [], graphql: [] };
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
page.on('pageerror', e => ev.errors.push(e.message));
page.on('request', r => { if (new URL(r.url()).pathname === '/graphql') { try { const v = r.postDataJSON(); ev.graphql.push({ name: v.operationName, variables: v.variables }); } catch {} } });
try {
  await page.goto(info.frontendUrl + '/applications', { waitUntil: 'domcontentloaded' });
  await page.getByText('Brief Studio', { exact: true }).first().waitFor({ timeout: 30000 });
  ev.listUrl = page.url();
  ev.listText = (await page.locator('body').innerText()).slice(0, 5000);
  await page.screenshot({ path: dir + 'rev003-application-list.png', fullPage: true });
  await page.getByText('Brief Studio', { exact: true }).first().click();
  await page.locator('[data-testid="application-launch-setup-panel"]').waitFor({ timeout: 60000 });
  await page.locator('[data-testid="application-launch-setup-slot-header"]').waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  ev.setupUrl = page.url();
  ev.setupText = (await page.locator('body').innerText()).slice(0, 13000);
  ev.selects = await page.locator('[data-testid="application-launch-setup-panel"] select').evaluateAll(nodes => nodes.map(n => ({value: n.value, options: [...n.options].map(x => ({label: x.textContent, value: x.value, disabled: x.disabled}))})));
  await page.screenshot({ path: dir + 'rev003-application-setup.png', fullPage: true });
  ev.status = 'Pass';
} catch (e) {
  ev.status = 'Fail'; ev.error = e.message;
  ev.url = page.url(); ev.body = (await page.locator('body').innerText().catch(() => '')).slice(-8000);
  await page.screenshot({ path: dir + 'rev003-application-failure.png', fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await fs.writeFile(dir + 'rev003-application-browser-evidence.json', JSON.stringify(ev, null, 2));
}
console.log(ev.status, ev.error || '', ev.setupUrl || ev.url, ev.selects?.length);

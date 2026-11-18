// api417 API-15: the phone web app (/mobile served by the isolated instance's node), paired through Phone Access at the
// node's real private LAN address, previews the run's HTML artifact. Headless Chrome, 390x844 mobile emulation.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(process.env.WEB_DIR + '/package.json');
const { chromium } = require('playwright-core');
const [phoneBase, loopbackBase, runId, out] = process.argv.slice(2);
const rest = async (method, route, body) => { const r = await fetch(`${loopbackBase}/rest${route}`, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const settings = await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
const session = await rest('POST', '/remote-access/pairing-sessions', { serverBaseUrl: phoneBase, trustedPrivateHttpAcknowledged: true });
if (session.status !== 201) throw new Error('pairing session ' + session.status + JSON.stringify(session.body));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US' });
const page = await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const sel = id => `[data-testid="${id}"]`;
await page.goto(session.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.locator(sel('mobile-pair-button')).click({ timeout: 60000 });
await page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60000 });
const credential = await page.evaluate(() => { const raw = localStorage.getItem('autobyteus.remote_access.mobile_session'); return { present: !!raw, keys: raw ? Object.keys(JSON.parse(raw)) : [], origin: location.origin }; });
await page.screenshot({ path: out + '-1-paired-list.png' });
await page.locator(`[data-testid^="mobile-run-row-"][data-testid*="${runId}"] ${sel('mobile-run-open')}`).first().click();
await page.locator(sel('mobile-run-menu-button')).waitFor({ timeout: 60000 });
await page.locator(sel('mobile-run-menu-button')).click();
await page.locator(sel('mobile-run-menu-artifacts')).click();
await page.locator(sel('mobile-artifacts')).waitFor({ timeout: 30000 });
let frame = null; const deadline = Date.now() + 40000;
while (Date.now() < deadline) {
  frame = page.frames().find(f => f !== page.mainFrame() && f.url().startsWith('blob:'));
  if (frame) { try { if (await frame.evaluate(() => window.__report && window.__report.done)) break; } catch {} }
  await page.waitForTimeout(300);
}
if (!frame) { await page.screenshot({ path: out + '-fail.png' }); throw new Error('no preview frame: ' + page.frames().map(f => f.url())); }
await page.waitForTimeout(1500);
const report = await frame.evaluate(() => window.__report);
const iframes = await page.evaluate(() => [...document.querySelectorAll('iframe')].map(i => ({ src: i.getAttribute('src'), sandbox: i.getAttribute('sandbox') })));
const credentialAfter = await page.evaluate(() => !!localStorage.getItem('autobyteus.remote_access.mobile_session'));
await page.screenshot({ path: out + '-2-artifact-preview.png' });
const result = { at: new Date().toISOString(), browser: browser.version(), phoneBase, phoneAccessSettings: settings.status, pairing: session.status, credential, credentialStillStoredAfterPreview: credentialAfter, iframes, report, pageErrors: errors };
fs.writeFileSync(out + '.json', JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify(result, null, 1));
await browser.close();

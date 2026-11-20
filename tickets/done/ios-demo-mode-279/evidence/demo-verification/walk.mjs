import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-web-design/package.json');
const { chromium } = require('playwright-core');
const [w, h, label, steps] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4], process.argv[5] ?? ''];
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: w < 900, locale: 'en-US' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e.message).slice(0, 200)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
await page.goto('http://127.0.0.1:3279/ios', { waitUntil: 'networkidle' });
let n = 0;
const shot = async (name) => { await page.waitForTimeout(800); await page.screenshot({ path: `/tmp/abt279/shots/${label}-${String(++n).padStart(2, '0')}-${name}.png` }); };
const visible = async () => (await page.locator('button, a, [role=button], [role=menuitem]').evaluateAll(els => els.filter(e => e.getBoundingClientRect().width > 0).map(e => (e.getAttribute('aria-label') || e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean))).slice(0, 60);
await shot('start');
console.log('START', JSON.stringify(await visible()));
for (const step of steps.split('|').filter(Boolean)) {
  const [kind, arg] = step.split('=');
  try {
    if (kind === 'click') await page.getByText(arg, { exact: false }).first().click({ timeout: 8000 });
    else if (kind === 'role') await page.getByRole('button', { name: new RegExp(arg, 'i') }).first().click({ timeout: 8000 });
    else if (kind === 'label') await page.locator(`[aria-label*="${arg}"]`).first().click({ timeout: 8000 });
    else if (kind === 'type') { const box = page.locator('textarea').last(); await box.fill(arg); await box.press('Enter'); }
    else if (kind === 'item') await page.getByRole('menuitem', { name: new RegExp(arg, 'i') }).first().click({ timeout: 8000 });
    else if (kind === 'lastback') await page.getByRole('button', { name: 'Back', exact: true }).last().click({ timeout: 8000 });
    else if (kind === 'typesend') { const box = page.locator('textarea:visible').last(); await box.fill(arg); await page.getByRole('button', { name: 'Send message' }).last().click(); }
    else if (kind === 'wait') await page.waitForTimeout(Number(arg));
    else if (kind === 'back') await page.goBack();
    else if (kind === 'goto') await page.goto(arg, { waitUntil: 'networkidle' });
    await shot(`${kind}-${(arg ?? '').replace(/[^a-z0-9]+/gi, '_').slice(0, 30)}`);
    console.log(`STEP ${step} OK`, JSON.stringify(await visible()).slice(0, 900));
  } catch (e) { console.log(`STEP ${step} FAIL`, String(e.message).split('\n')[0]); await shot(`fail-${kind}`); }
}
console.log('TEXT', (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1500));
console.log('ERRORS', JSON.stringify(errors));
await browser.close();

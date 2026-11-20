import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-web-design/package.json');
const { chromium } = require('playwright-core');
const b = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const p = await b.newPage({ viewport: { width: 440, height: 956 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push('pageerror ' + e.message.slice(0, 160))); p.on('console', m => { if (['error','warning'].includes(m.type())) errs.push(m.text().slice(0,160)); }); p.on('request', r => { if (!r.url().startsWith(process.env.DEMO_BASE) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) errs.push('external ' + r.url().slice(0,100)); });
const out = { places: {} }; const BAD = /synthetic|fixture|mock|prototype|placeholder|lorem|todo/i;
const sheet = row => p.locator(`[data-testid="mobile-run-${row}-select-sheet"]`);
const opts = row => sheet(row).locator(`[data-testid="mobile-run-${row}-select-option"]`);
const open = async row => { await p.locator(`[data-testid="mobile-run-${row}-select-toggle"]`).click(); await sheet(row).waitFor({ timeout: 8000 }); await p.waitForTimeout(300); };
const sweep = async (place) => {
  const rec = {}; await open('runtime'); const rts = (await opts('runtime').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim()); await p.keyboard.press('Escape'); await p.waitForTimeout(300); if (await sheet('runtime').count()) await p.mouse.click(5, 100);
  for (let i = 0; i < rts.length; i++) {
    await open('runtime'); await opts('runtime').nth(i).click(); await p.waitForTimeout(600);
    await open('model'); const ms = (await opts('model').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
    const refresh = sheet('model').getByText(/Refresh models/i); if (await refresh.count()) { await refresh.first().click().catch(() => undefined); await p.waitForTimeout(800); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    for (let j = 0; j < ms.length; j++) { if (!(await sheet('model').count())) await open('model'); await opts('model').nth(j).click(); await p.waitForTimeout(400); }
    rec[rts[i]] = ms; const bad = ms.filter(m => BAD.test(m)); if (bad.length) (out.bad ??= []).push({ place, runtime: rts[i], bad });
  }
  out.places[place] = rec;
};
await p.goto((process.env.DEMO_BASE + '/'), { waitUntil: 'networkidle' });
await p.waitForTimeout(500); await p.waitForTimeout(1000);
await p.getByRole('button', { name: 'New run' }).click(); await p.waitForTimeout(1200); await sweep('New run');
await p.getByRole('button', { name: 'Close' }).first().click().catch(() => undefined); await p.waitForTimeout(600);
{ const older = p.getByText(/Show older/); if (await older.count()) { await older.first().click(); await p.waitForTimeout(500); } } await p.getByRole('button', { name: /, Stopped$/ }).first().click(); out.stoppedRun = await p.locator('[data-testid="mobile-run-name"]').first().innerText().catch(() => null); await p.waitForTimeout(1000);
await p.getByRole('button', { name: 'More' }).click(); await p.getByRole('menuitem', { name: 'Settings' }).click(); await p.waitForTimeout(1500);
await sweep('Settings (stopped run)');
out.saveEnabled = !(await p.locator('[data-testid="mobile-run-settings-save"]').isDisabled());
out.errs = [...new Set(errs)]; console.log(JSON.stringify(out, null, 1)); await b.close();

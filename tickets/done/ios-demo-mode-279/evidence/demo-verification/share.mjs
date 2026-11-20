import { createRequire } from 'node:module';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-web-design/package.json');
const { chromium } = require('playwright-core');
const b = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const res = {};
const cases = { pairing: 'http://192.168.1.20:29695/mobile/?pairing=abc123', demo: 'autobyteus://demo', other: 'my-computer.local', empty: '' };
for (const [k, t] of Object.entries(cases)) {
  const ctx = await b.newContext({ viewport: { width: 440, height: 956 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120))); p.on('console', m => { if (['error','warning'].includes(m.type())) errs.push(m.text().slice(0, 120)); }); p.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:3279') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) errs.push('external ' + r.url().slice(0, 80)); });
  await p.goto('http://127.0.0.1:3279/ios-share?text=' + encodeURIComponent(t), { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const share = (await p.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 160);
  await p.screenshot({ path: `/tmp/abt279/share-${k}-1.png` });
  const done = p.getByRole('button', { name: /Done/ }); if (await done.count()) await done.click().catch(() => undefined);
  await p.goto('http://127.0.0.1:3279/ios', { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
  const next = (await p.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 200);
  const field = await p.locator('input:visible').first().inputValue().catch(() => null);
  await p.screenshot({ path: `/tmp/abt279/share-${k}-2.png` });
  await p.goto('http://127.0.0.1:3279/ios', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  const third = (await p.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 80);
  res[k] = { share, next, field, thirdOpen: third, errs };
  await ctx.close();
}
console.log(JSON.stringify(res, null, 1)); await b.close();

// Apple-reviewer sweep of the iOS demo reference (autobyteus-279, Solution Designer). Opens every run row, every ⋮
// entry, every file, and the first screen's paths; records visible text, empty screens, error words and browser errors.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-web-design/package.json');
const { chromium } = require('playwright-core');
const [w, h, label] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]];
const OUT = `/tmp/abt279b/sweep-${label}`; fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: w < 900, locale: 'en-US' });
const page = await ctx.newPage();
const errors = []; const findings = []; const log = [];
page.on('pageerror', e => errors.push(`pageerror ${String(e.message).slice(0, 200)}`));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()} ${m.text().slice(0, 200)}`); });
page.on('requestfailed', r => errors.push(`requestfailed ${r.url().slice(0, 120)} ${r.failure()?.errorText}`));
page.on('request', r => { const u = r.url(); if (!u.startsWith(process.env.DEMO_BASE) && !u.startsWith('data:') && !u.startsWith('blob:')) errors.push(`external-request ${u.slice(0, 160)}`); });
let n = 0;
const sleep = ms => page.waitForTimeout(ms);
const shot = async name => { await sleep(500); await page.screenshot({ path: `${OUT}/${String(++n).padStart(3, '0')}-${name.replace(/[^a-z0-9]+/gi, '_').slice(0, 50)}.png` }); };
const BAD = /prototype|synthetic|fixture|mock|lorem|placeholder|todo|coming soon|not reachable|unreachable|failed|error|cannot|can't|couldn't|unsupported|not available|undefined|null|NaN|\[object/i;
const text = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
const check = async (where) => {
  const t = await text();
  const bad = [...new Set((t.match(new RegExp(BAD.source, 'gi')) ?? []).map(s => s.toLowerCase()))];
  if (bad.length) { const ctxs = bad.map(b => { const i = t.toLowerCase().indexOf(b); return t.slice(Math.max(0, i - 60), i + 60); }); findings.push({ where, words: bad, context: ctxs }); }
  if (t.length < 40) findings.push({ where, empty: t });
  log.push({ where, len: t.length, head: t.slice(0, 160) });
};
const back = async () => {
  const b = page.getByRole('button', { name: /^(Back|Back to runs|Close|Close scanner|Close menu)$/ });
  const c = await b.count(); if (c) { await b.last().click({ timeout: 3000 }).catch(() => undefined); await sleep(500); return true; }
  await page.goBack().catch(() => undefined); await sleep(500); return false;
};
await page.goto((process.env.DEMO_BASE + '/'), { waitUntil: 'networkidle' });

// Other ways to connect

const otherButtons = await page.locator('button:visible').evaluateAll(els => els.map(e => (e.getAttribute('aria-label') || e.innerText).trim()).filter(Boolean));
log.push({ where: 'other ways buttons', buttons: otherButtons });
// Scan, then back

await page.goto((process.env.DEMO_BASE + '/'), { waitUntil: 'networkidle' });
await page.waitForTimeout(500); await sleep(1200); await shot('run-list'); await check('run list');
// unfold everything and show older
for (let i = 0; i < 6; i++) {
  const t = page.locator('[data-testid="mobile-run-toggle"]'); const k = await t.count(); let clicked = 0;
  for (let j = 0; j < k; j++) { const el = t.nth(j); const row = el.locator('xpath=ancestor::li[1]'); if ((await row.getAttribute('aria-expanded').catch(() => null)) === 'false') { await el.click().catch(() => undefined); clicked++; await sleep(300); } }
  const older = page.getByText(/Show older/); if (await older.count()) { await older.first().click().catch(() => undefined); clicked++; await sleep(400); }
  if (!clicked) break;
}
await shot('run-list-unfolded');
const rows = await page.locator('[data-test="mobile-run-row"]').evaluateAll(els => els.map(li => ({ key: li.getAttribute('data-testid').replace('mobile-run-row-', ''), name: li.querySelector('[data-testid="mobile-run-name"]')?.textContent?.trim() ?? '', depth: li.getAttribute('data-depth') })));
log.push({ where: 'rows', count: rows.length, rows: rows.map(r => `${r.depth}:${r.name}`) });
for (const row of rows) {
  const open = page.locator(`[data-testid="mobile-run-row-${row.key}"] [data-testid="mobile-run-open"]`);
  if (!(await open.count())) { log.push({ where: `row ${row.name}`, note: 'no open button (group row)' }); continue; }
  await open.click().catch(e => findings.push({ where: `row ${row.name}`, openFail: String(e.message).slice(0, 120) }));
  await sleep(1500); await shot(`run-${row.name}`); await check(`run ${row.depth}:${row.name}`);
  const more = page.getByRole('button', { name: 'More' });
  if (await more.count()) {
    await more.first().click(); await sleep(400);
    const items = await page.getByRole('menuitem').evaluateAll(els => els.map(e => e.innerText.trim()));
    log.push({ where: `run ${row.name} ⋮`, items });
    await page.keyboard.press('Escape'); await sleep(300);
    for (const item of items) {
      await more.first().click(); await sleep(300);
      await page.getByRole('menuitem', { name: item }).first().click().catch(() => undefined); await sleep(1500);
      await shot(`run-${row.name}-${item}`); await check(`run ${row.name} › ${item}`);
      // open the first file in Files / Artifacts
      if (/Files|Artifacts/.test(item)) {
        const file = page.locator('text=/\\.(md|csv|png|ts)$/').first();
        if (await file.count()) { await file.click().catch(() => undefined); await sleep(1500); await shot(`run-${row.name}-${item}-file`); await check(`run ${row.name} › ${item} › first file`); await back(); }
      }
      await back();
      if (!(await page.getByRole('button', { name: 'More' }).count())) break;
    }
  }
  await page.getByRole('button', { name: 'Back to runs' }).click().catch(() => undefined); await sleep(800);
}
// composer upload button in a run
await page.locator('[data-testid^="mobile-run-row-"] [data-testid="mobile-run-open"]').first().click().catch(() => undefined); await sleep(1200);
const up = page.getByRole('button', { name: 'Upload files' }); if (await up.count()) { const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 3000 }).catch(() => null), up.first().click().catch(() => undefined)]); log.push({ where: 'composer Upload files', fileChooser: Boolean(chooser) }); await shot('upload'); await check('composer › Upload files'); }
fs.writeFileSync(`${OUT}/sweep.json`, JSON.stringify({ label, w, h, findings, errors: [...new Set(errors)], log }, null, 1));
console.log(JSON.stringify({ label, rows: rows.length, findings: findings.length, errors: [...new Set(errors)].length }));
await browser.close();

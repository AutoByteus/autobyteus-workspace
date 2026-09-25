// Temporary AC-119 probe: open binding-started historical runs in the web UI at desktop width.
import { chromium } from '/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';
const base = process.argv[2] ?? 'http://127.0.0.1:18751';
const out = process.argv[3];
const targets = [
  { label: 'agent-binding-run', summary: 'Hello from Telegram. What is 2+2?', expect: ['2+2 equals 4.', 'Thanks. And what is 3+3?', '3+3 equals 6.'] },
  { label: 'agent-legacy-metadata-variant', summary: 'legacy metadata variant', expect: ['2+2 equals 4.', '3+3 equals 6.'] },
  { label: 'team-binding-run', summary: 'Professor, name one prime number', expect: ['Seven.'] },
];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${base}/workspace`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/workspace-history-desktop-1440.png` });
const results = [];
for (const t of targets) {
  const r = { label: t.label, found: false, opened: false, missing: [], externalMetadataVisible: null };
  // Expand the workspace, then the definition groups (collapsed by default), only when the run button is not visible.
  let item = page.locator('button', { hasText: t.summary }).first();
  if (!(await item.isVisible().catch(() => false))) {
    for (const name of ['ws-legacy', /Telegram Helper\s*\(2\)/, /Classroom Relay\s*\(1\)/]) {
      const g = page.locator('button', { hasText: name }).first();
      if (await g.isVisible().catch(() => false)) { await g.click(); await page.waitForTimeout(700); }
    }
    item = page.locator('button', { hasText: t.summary }).first();
  }
  if (await item.count()) {
    r.found = true;
    await item.click();
    await page.waitForTimeout(3500);
    const text = await page.evaluate(() => document.body.innerText);
    r.missing = t.expect.filter((s) => !text.includes(s));
    r.opened = r.missing.length === 0;
    r.externalMetadataVisible = /externalSource|e2e-peer|e2e-group|BUSINESS_API|telegramChatTitle|E2E chat|tg-legacy|tg-e2e/.test(text);
    await page.screenshot({ path: `${out}/${t.label}-desktop-1440.png` });
  }
  results.push(r);
}
const sidebar = await page.evaluate(() => document.body.innerText.slice(0, 1200));
console.log(JSON.stringify({ results, pageErrors: errors, sidebarTextStart: sidebar }, null, 2));
await browser.close();

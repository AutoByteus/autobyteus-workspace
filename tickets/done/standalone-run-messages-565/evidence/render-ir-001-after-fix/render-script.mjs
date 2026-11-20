import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-run-messages-565/autobyteus-web/package.json');
const { chromium } = require('playwright-core');
const [url, out] = process.argv.slice(2);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
await page.goto(url, { waitUntil: 'load' });
await page.locator('[data-test="team-communication-message-row"]').first().waitFor({ timeout: 30000 });
const facts = {};
const read = async () => page.evaluate(() => {
  const desk = document.querySelector('[data-test="render-desktop"]');
  const phone = document.querySelector('[data-test="render-phone"]');
  const box = (el) => el ? (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }))(el.getBoundingClientRect()) : null;
  const more = desk.querySelector('[data-test="collaboration-messages-load-more"]');
  return {
    header: desk.querySelector('[data-test="collaboration-messages-header"]')?.textContent.replace(/\s+/g, ' ').trim(),
    rows: [...desk.querySelectorAll('[data-test="team-communication-message-row"]')].map((r) => r.querySelector('[data-test="team-communication-message-summary"] p')?.textContent.trim()),
    chips: [...desk.querySelectorAll('[data-test="team-communication-node-chip"]')].map((c) => ({ node: c.dataset.nodeName, label: c.getAttribute('aria-label'), box: box(c) })),
    loadMore: more ? { text: more.textContent.trim(), disabled: more.disabled, box: box(more) } : null,
    moreError: desk.querySelector('[data-test="collaboration-messages-more-error"]')?.textContent.trim() ?? null,
    empty: desk.textContent.includes('No messages yet'),
    listOverflowX: (() => { const l = desk.querySelector('[data-test="team-communication-left-list"]'); return l ? l.scrollWidth > l.clientWidth : null; })(),
    phoneRows: [...phone.querySelectorAll('[data-testid="mobile-team-message-row"] p span:first-child')].map((s) => s.textContent.trim()),
    phoneChips: [...phone.querySelectorAll('[data-testid="mobile-team-message-node"]')].map((c) => c.dataset.nodeName),
    phoneMore: phone.querySelector('[data-testid="mobile-messages-load-more"]')?.textContent.trim() ?? null,
    phoneMoreError: phone.querySelector('[data-testid="mobile-messages-more-error"]')?.textContent.trim() ?? null,
    phoneOverflowX: phone.scrollWidth > phone.clientWidth,
  };
});
for (const mode of ['more', 'loading', 'error', 'done', 'empty']) {
  await page.click(`[data-test="mode-${mode}"]`);
  await page.waitForTimeout(300);
  facts[mode] = await read();
  await page.screenshot({ path: `${out}/messages-${mode}.png`, fullPage: true });
}
await page.click('[data-test="mode-more"]');
await page.waitForTimeout(200);
await page.click('[data-test="collaboration-messages-load-more"]');
await page.click('[data-testid="mobile-messages-load-more"]');
facts.loadMoreClicks = await page.evaluate(() => globalThis.__render565.loadMoreClicks.value);
// The remote row's details: chip in the header and the node line.
await page.locator('[data-test="team-communication-message-summary"]').first().click();
await page.click('[data-test="message-identity-toggle"]');
facts.remoteDetail = (await page.locator('[data-test="message-identity-detail"]').innerText()).split('\n');
await page.screenshot({ path: `${out}/messages-remote-detail.png`, fullPage: true });
await page.locator('[data-test="team-communication-message-summary"]').last().click();
await page.click('[data-test="message-identity-toggle"]');
facts.unnamedDetail = (await page.locator('[data-test="message-identity-detail"]').innerText()).split('\n');
facts.pageErrors = pageErrors;
await fs.writeFile(`${out}/render-facts.json`, JSON.stringify(facts, null, 2));
console.log(JSON.stringify(facts, null, 1));
await browser.close();

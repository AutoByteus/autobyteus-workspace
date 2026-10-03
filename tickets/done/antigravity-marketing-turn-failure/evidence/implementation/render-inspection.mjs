// Implementation-owned component preview, not API/E2E certification.
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../../../autobyteus-web/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const port = (await fs.readFile(new URL('./preview-port.txt', import.meta.url), 'utf8')).trim();
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const observations = [];
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const dialogs = [];
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
    await page.goto(`http://127.0.0.1:${port}/implementation-runtime-error-preview`);
    await page.locator('.error-segment').first().waitFor();
    await page.locator('[data-case="markup"]').click();
    await page.locator('.error-segment p.mt-1').first().filter({ hasText: 'Read limit reached.' }).waitFor();
    await page.locator('summary').focus();
    await page.keyboard.press('Enter');
    const detailOpen = await page.locator('details').evaluate(element => element.open);
    const geometry = await page.evaluate(() => ({
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      message: document.querySelector('.error-segment p.mt-1').textContent,
      injectedMarkup: document.querySelectorAll('.error-segment img, .error-segment script').length,
      focusedElement: document.activeElement.tagName,
      card: document.querySelector('.error-segment').getBoundingClientRect().toJSON(),
    }));
    await page.screenshot({ path: new URL(`./render-markup-${width}.png`, import.meta.url).pathname, fullPage: true });
    await page.locator('[data-case="claude"]').click();
    await page.locator('.error-segment p.mt-1').first().filter({ hasText: 'Rate limit reached.' }).waitFor();
    await page.screenshot({ path: new URL(`./render-claude-${width}.png`, import.meta.url).pathname, fullPage: true });
    const claudeMessage = await page.locator('.error-segment p.mt-1').first().textContent();
    if (!detailOpen || geometry.injectedMarkup || dialogs.length || geometry.documentWidth > width || geometry.message.includes('PRIVATE_TOKEN')) {
      throw new Error(`Preview inspection failed: ${JSON.stringify({ geometry, dialogs, detailOpen })}`);
    }
    observations.push({ width, detailOpen, geometry, dialogs, claudeMessage });
    await page.close();
  }
} finally { await browser.close(); }
await fs.writeFile(new URL('./render-inspection.json', import.meta.url), JSON.stringify({ scope: 'implementation rendered self-check; static public payload injection, not actual server/WebSocket journey', observations, browserClosed: true }, null, 2) + '\n');
console.log(JSON.stringify(observations, null, 2));

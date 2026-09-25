// Temporary AC-116 probe: Settings nav + deep link at desktop width (1440x900).
import { chromium } from '/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';
const base = process.argv[2] ?? 'http://127.0.0.1:18751';
const out = process.argv[3];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const inspect = async (label) => {
  await page.waitForSelector('text=API Keys', { timeout: 60000 });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const navButtons = [...document.querySelectorAll('nav button, nav a, aside button, aside a')].map((b) => ({
      text: b.innerText.trim(), classes: b.className, ariaCurrent: b.getAttribute('aria-current'), rect: b.getBoundingClientRect().toJSON(),
    })).filter((b) => b.text);
    const headings = [...document.querySelectorAll('h1,h2,h3')].map((h) => h.innerText.trim()).filter(Boolean).slice(0, 6);
    return { url: location.href, innerWidth: innerWidth, anyMessagingText: /messaging/i.test(document.body.innerText), navButtons, headings };
  });
  await page.screenshot({ path: `${out}/${label}.png`, fullPage: false });
  return info;
};
await page.goto(`${base}/settings`, { waitUntil: 'networkidle' });
const settings = await inspect('settings-desktop-1440');
await page.goto(`${base}/settings?section=messaging`, { waitUntil: 'networkidle' });
const deepLink = await inspect('settings-deeplink-messaging-desktop-1440');
console.log(JSON.stringify({ settings, deepLink, pageErrors: errors }, null, 2));
await browser.close();

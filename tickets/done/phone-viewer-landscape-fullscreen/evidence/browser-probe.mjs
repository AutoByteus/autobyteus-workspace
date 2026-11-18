// autobyteus-432 AC-006: the paired /mobile in a desktop browser (no app bridge) against a test-owned node.
// Usage: node browser-probe.mjs <playwright-core dir> <mobile pairing URL (abx432-node.lan)> <container> <output dir>
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const [playwrightDir, pairingUrl, container, outputDir] = process.argv.slice(2);
const require = createRequire(path.join(playwrightDir, 'package.json'));
const { chromium } = require('playwright-core');
fs.mkdirSync(outputDir, { recursive: true });

const inNode = (...args) => execFileSync('docker', ['exec', '--user', 'vncuser', '--env', 'DISPLAY=:99', container, ...args], { encoding: 'utf8' }).trim();
const mouse = () => inNode('xdotool', 'getmouselocation').split(' ').slice(0, 2).join(' ');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = { steps: [] };
const step = (name, value) => { results.steps.push({ name, ...value }); console.log(JSON.stringify({ name, ...value })); };

const host = new URL(pairingUrl);
const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: [`--host-resolver-rules=MAP ${host.hostname} 127.0.0.1`],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const state = () => page.evaluate(() => ({
  query: location.search,
  fullscreenElement: document.fullscreenElement ? document.fullscreenElement.tagName : null,
  fullscreenEnabled: document.fullscreenEnabled,
  bar: !!document.querySelector('[data-testid="mobile-screen-bar"]'),
  handle: !!document.querySelector('[data-testid="mobile-node-desktop-handle"]'),
  picture: document.querySelector('[data-testid="mobile-node-desktop-picture"]')?.style.transform ?? null,
}));
try {
  await page.goto(pairingUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
  // A draft run (never sent a message, so no model is called) gives the run ⋮ menu.
  await page.locator('[data-testid="mobile-new-run-button"]').click({ timeout: 60_000 });
  await page.locator('[data-testid="mobile-run-model-select-toggle"]').click();
  await page.locator('[data-testid="mobile-run-model-select-search"]').fill('qwen3.6');
  await page.locator('[data-testid="mobile-run-model-select-option"]').first().click();
  await page.locator('[data-testid="mobile-run-launch"]').click();
  await page.locator('[data-testid="mobile-run-menu-button"]').click();
  await page.locator('[data-testid="mobile-run-menu-desktop"]').click();
  const status = page.locator('[data-testid="mobile-node-desktop-status"]');
  await status.filter({ hasText: 'Connected · View only' }).waitFor({ timeout: 30_000 });
  await page.locator('[data-testid="mobile-node-desktop-stage"] canvas').waitFor({ timeout: 30_000 });
  await sleep(1000);
  step('opened', await state());

  // Full screen by a click (a user gesture): the browser's own full screen.
  await page.locator('[data-testid="mobile-node-desktop-full-screen"]').click();
  await sleep(1000);
  step('full-screen-entered', await state());
  await page.screenshot({ path: path.join(outputDir, 'AC006-1-browser-full-screen.png') });

  // View only Fill by a double click, then back to Fit; nothing reaches the desktop.
  inNode('xdotool', 'mousemove', '300', '300');
  const stage = await page.locator('[data-testid="mobile-node-desktop-gestures"]').boundingBox();
  const cx = stage.x + stage.width / 2;
  const cy = stage.y + stage.height / 2;
  await page.mouse.click(cx, cy);
  await sleep(80);
  await page.mouse.click(cx + 2, cy + 1);
  await sleep(500);
  const filled = (await state()).picture;
  await page.screenshot({ path: path.join(outputDir, 'AC006-2-fill.png') });
  await page.mouse.click(cx, cy);
  await sleep(80);
  await page.mouse.click(cx + 2, cy + 1);
  await sleep(500);
  step('fill-and-fit', { filled, fittedAgain: (await state()).picture, mouseOnNode: mouse(), expected: 'x:300 y:300' });

  // The browser leaves its full screen by itself (Esc): the route follows.
  await page.keyboard.press('Escape');
  await sleep(1000);
  let afterEsc = await state();
  let leftBy = 'Escape';
  if (afterEsc.fullscreenElement) {
    // Headless Chrome may keep Esc for the page; leave as the browser would, from outside the viewer's code.
    await page.evaluate(() => document.exitFullscreen());
    await sleep(1000);
    afterEsc = await state();
    leftBy = 'document.exitFullscreen() from the probe (Esc not handled by headless Chrome)';
  }
  step('browser-left-full-screen', { leftBy, ...afterEsc });

  // Enter again and leave by the viewer's handle: the browser's full screen goes too.
  await page.locator('[data-testid="mobile-node-desktop-full-screen"]').click();
  await sleep(1000);
  const again = await state();
  await page.locator('[data-testid="mobile-node-desktop-handle"]').click();
  await sleep(1000);
  step('handle-leaves-both', { entered: again, after: await state() });

  // A reload with full=1 has no user gesture: the browser refuses, the in-page full screen stays.
  await page.locator('[data-testid="mobile-node-desktop-full-screen"]').click();
  await sleep(800);
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(4000);
  step('reload-with-full', { ...(await state()), pageErrors: errors });
  results.result = 'done';
} catch (error) {
  results.error = String(error?.stack ?? error);
  await page.screenshot({ path: path.join(outputDir, 'AC006-failure.png') }).catch(() => undefined);
} finally {
  fs.writeFileSync(path.join(outputDir, 'AC006-results.json'), JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ result: results.result ?? 'error', error: results.error ?? null }));

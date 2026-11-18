// autobyteus-407 AC-018: the paired /mobile in a desktop browser against a test-owned node.
// Usage: node browser-probe.mjs <playwright-core dir> <mobile pairing URL (abx407-node.lan)> <container> <output dir>
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
const dimensions = () => /dimensions:\s+(\d+x\d+)/.exec(inNode('xdpyinfo'))?.[1];
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
const sockets = [];
page.on('websocket', (socket) => {
  const url = socket.url().replace(/(access_token=)[^&]+/, '$1<redacted>');
  const record = { url, closed: false };
  sockets.push(record);
  socket.on('close', () => { record.closed = true; });
});
try {
  await page.goto(pairingUrl, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Pair this phone' }).click();
  // A draft run (never sent a message, so no model is called) gives the run ⋮ menu.
  await page.locator('[data-testid="mobile-new-run-button"]').click({ timeout: 60_000 });
  await page.locator('[data-testid="mobile-run-model-select-toggle"]').click();
  await page.locator('[data-testid="mobile-run-model-select-search"]').fill('qwen3-max');
  await page.locator('[data-testid="mobile-run-model-select-option"]').first().click();
  await page.locator('[data-testid="mobile-run-launch"]').click();
  await page.locator('[data-testid="mobile-run-menu-button"]').click();
  await page.locator('[data-testid="mobile-run-menu-desktop"]').click();
  const status = page.locator('[data-testid="mobile-node-desktop-status"]');
  await status.filter({ hasText: 'Connected · View only' }).waitFor({ timeout: 30_000 });
  await page.locator('[data-testid="mobile-node-desktop-stage"] canvas').waitFor({ timeout: 30_000 });
  await sleep(1000);
  await page.screenshot({ path: path.join(outputDir, 'AC018-1-view-only.png') });
  step('opened', { query: new URL(page.url()).search, status: await status.textContent(), dimensions: dimensions() });

  // View only: clicks and drags on the picture never reach the desktop.
  inNode('xdotool', 'mousemove', '300', '300');
  const stage = page.locator('[data-testid="mobile-node-desktop-stage"]');
  const box = await stage.boundingBox();
  await page.mouse.click(box.x + 100, box.y + 100);
  await page.mouse.click(box.x + box.width - 50, box.y + box.height - 50);
  await sleep(800);
  step('view-only-clicks', { mouseOnNode: mouse(), expected: 'x:300 y:300' });

  // Ctrl+wheel (trackpad pinch) zooms the picture; a drag pans it; Fit returns to fit.
  const picture = page.locator('[data-testid="mobile-node-desktop-picture"]');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -150);
  await page.keyboard.up('Control');
  await sleep(300);
  const zoomed = await picture.evaluate((element) => element.style.transform);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 60, { steps: 5 });
  await page.mouse.up();
  const panned = await picture.evaluate((element) => element.style.transform);
  await page.screenshot({ path: path.join(outputDir, 'AC018-2-zoomed.png') });
  const fitVisible = await page.locator('[data-testid="mobile-node-desktop-fit"]').isVisible();
  await page.locator('[data-testid="mobile-node-desktop-fit"]').click();
  const fitted = await picture.evaluate((element) => element.style.transform);
  // Double click (two quick clicks) also returns to fit.
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -150);
  await page.keyboard.up('Control');
  await page.mouse.click(box.x + 200, box.y + 200);
  await sleep(80);
  await page.mouse.click(box.x + 202, box.y + 201);
  await sleep(400);
  const afterDoubleTap = await picture.evaluate((element) => element.style.transform);
  step('zoom', { zoomed, panned, fitVisible, fitted, afterDoubleTap, mouseOnNode: mouse(), dimensions: dimensions() });

  // Full screen in View only: bars hidden; one click shows them; Back would leave it too.
  await page.locator('[data-testid="mobile-node-desktop-full-screen"]').click();
  await sleep(500);
  const fullQuery = new URL(page.url()).search;
  const barHidden = !(await page.locator('[data-testid="mobile-screen-bar"]').isVisible());
  await page.screenshot({ path: path.join(outputDir, 'AC018-3-full-screen-view-only.png') });
  await page.mouse.click(box.x + 300, box.y + 300);
  await sleep(800);
  step('full-screen-view-only', { fullQuery, barHidden, afterTapQuery: new URL(page.url()).search, barBack: await page.locator('[data-testid="mobile-screen-bar"]').isVisible() });

  // Control: the switch reconnects; a click reaches the desktop at the clicked point.
  await page.locator('[data-testid="mobile-node-desktop-mode"]').click();
  await status.filter({ hasText: 'Connected · Control' }).waitFor({ timeout: 30_000 });
  await sleep(1000);
  const canvas = page.locator('[data-testid="mobile-node-desktop-stage"] canvas');
  const canvasBox = await canvas.boundingBox();
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await sleep(800);
  step('control-click', { mouseOnNode: mouse(), expectedNear: 'x:960 y:540', canvas: canvasBox, sockets: sockets.map((s) => s.url) });

  // Control full screen: a handle brings the controls back.
  await page.locator('[data-testid="mobile-node-desktop-full-screen"]').click();
  await sleep(500);
  await page.screenshot({ path: path.join(outputDir, 'AC018-4-full-screen-control.png') });
  const handle = page.locator('[data-testid="mobile-node-desktop-handle"]');
  const handleVisible = await handle.isVisible();
  await handle.click();
  await sleep(500);
  step('full-screen-control', { handleVisible, afterHandleQuery: new URL(page.url()).search, barBack: await page.locator('[data-testid="mobile-screen-bar"]').isVisible() });
  results.dimensionsAtEnd = dimensions();
  results.result = 'done';
} catch (error) {
  results.error = String(error?.stack ?? error);
  await page.screenshot({ path: path.join(outputDir, 'AC018-failure.png') }).catch(() => undefined);
} finally {
  results.sockets = sockets;
  fs.writeFileSync(path.join(outputDir, 'AC018-results.json'), JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ result: results.result ?? 'error', error: results.error ?? null }));

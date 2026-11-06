#!/usr/bin/env node
// Temporary, ticket-owned WebKit journey for autobyteus-277 (API/E2E IOS-02, QR-004): the phone shell in WebKit, the engine
// of iOS Safari and WKWebView, with Playwright's iPhone 13 profile, against a held stack
// (`pnpm -C autobyteus-web test:e2e:mobile-shell --hold --output-dir=<dir>`). The phone pairs with a private-network origin
// that the browser routes to alpha (HTTP and WebSocket), as the mobile-shell probe does. Every screen is visited; page
// errors and console errors are recorded.
// Usage: node ios-webkit-journey.mjs <hold.json> <output dir> [webkit executable]
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const [holdFile, outDir, executablePath] = process.argv.slice(2);
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign/autobyteus-web/package.json');
const { webkit, devices } = require('playwright-core');
const hold = JSON.parse(await fs.readFile(holdFile, 'utf8'));
const alpha = hold.alpha;
const origin = `http://192.168.77.10:${hold.alphaPort}`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const redact = text => String(text).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…').replace(/pairing=[^&\s"']+/g, 'pairing=…');
const evidence = { startedAt: new Date().toISOString(), engine: null, screens: {}, errors: [], result: 'Fail' };
await fs.mkdir(outDir, { recursive: true });
const browser = await webkit.launch(executablePath ? { executablePath } : {});
evidence.engine = `WebKit ${browser.version()} (Playwright), ${devices['iPhone 13'].userAgent}`;
const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US', timezoneId: 'UTC' });
await context.route(`${origin}/**`, async route => route.fulfill({ response: await route.fetch({ url: route.request().url().replace(origin, alpha) }) }));
const wsOrigin = origin.replace(/^http/, 'ws');
await context.routeWebSocket(url => url.href.startsWith(wsOrigin), ws => {
  const upstream = new WebSocket(ws.url().replace(wsOrigin, alpha.replace(/^http/, 'ws')));
  const queued = [];
  upstream.addEventListener('open', () => { for (const m of queued.splice(0)) upstream.send(m); });
  upstream.addEventListener('message', e => { try { ws.send(typeof e.data === 'string' ? e.data : String(e.data)); } catch { /* closed */ } });
  upstream.addEventListener('close', () => { try { ws.close(); } catch { /* closed */ } });
  ws.onMessage(m => { if (upstream.readyState === 1) upstream.send(m); else queued.push(m); });
  ws.onClose(() => upstream.close());
});
const page = await context.newPage();
page.on('pageerror', error => evidence.errors.push(redact(`pageerror: ${error.message}`)));
page.on('console', message => { if (message.type() === 'error') evidence.errors.push(redact(`console: ${message.text()}`)); });
const sel = id => `[data-testid="${id}"]`;
const at = async (name) => {
  await sleep(700);
  evidence.screens[name] = await page.evaluate(() => ({ horizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 160) }));
  await page.screenshot({ path: path.join(outDir, `IOS-02-${name}.png`) });
};
try {
  await fetch(`${alpha}/rest/remote-access/settings`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phoneAccessEnabled: true }) });
  const session = await (await fetch(`${alpha}/rest/remote-access/pairing-sessions`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ serverBaseUrl: origin, trustedPrivateHttpAcknowledged: true }) })).json();
  await page.goto(session.mobileUrl, { waitUntil: 'domcontentloaded' });
  await page.locator(sel('mobile-pair-button')).click({ timeout: 60_000 });
  await page.locator('[data-test="mobile-run-row"]').first().waitFor({ timeout: 60_000 });
  evidence.context = await page.evaluate(() => ({ secure: window.isSecureContext, randomUUID: typeof crypto.randomUUID, dvh: CSS.supports('height', '100dvh'), safeArea: CSS.supports('padding', 'env(safe-area-inset-bottom)') }));
  await at('list');
  const older = page.locator(sel('mobile-run-list-show-older'));
  if ((await older.count()) && (await older.innerText()).startsWith('Show older')) await older.click();
  await page.locator(`[data-testid="mobile-run-row-team:${hold.runs.delivery}"] ${sel('mobile-run-open')}`).click();
  await page.locator(`${sel('mobile-run-screen')}[data-state="open"]`).waitFor({ timeout: 30_000 });
  await at('run');
  // A message to the Team's coordinator (a send path that works over plain HTTP).
  const box = page.locator(`${sel('mobile-run-conversation')} textarea`).last();
  await box.fill('From WebKit. Marker IOS-WEBKIT-1');
  await page.locator(`${sel('mobile-run-conversation')} button[aria-label="Send message"]`).last().click();
  await page.waitForFunction(() => document.querySelector('[data-testid="mobile-run-conversation"]')?.innerText.includes('IOS-WEBKIT-1'), null, { timeout: 30_000 });
  evidence.messageShown = true;
  await page.locator(sel('mobile-run-menu-button')).click();
  await at('menu');
  await page.locator(sel('mobile-run-menu-files')).click();
  await page.locator(sel('mobile-files-row')).first().waitFor({ timeout: 30_000 });
  await at('files');
  await page.locator(sel('mobile-files-row')).filter({ hasText: 'docs' }).first().click();
  await sleep(600);
  await page.locator(sel('mobile-files-row')).filter({ hasText: 'guide.md' }).first().click();
  await page.locator(sel('mobile-file-viewer')).waitFor({ timeout: 30_000 });
  await at('file-open');
  await page.goBack(); await sleep(600); await page.goBack(); await sleep(600);
  evidence.backTo = await page.evaluate(() => (document.querySelector('[data-testid="mobile-run-screen"]') ? 'run' : 'other'));
  await page.locator(sel('mobile-run-menu-button')).click();
  await page.locator(sel('mobile-run-menu-messages')).click();
  await page.locator(sel('mobile-team-reference-row')).first().waitFor({ timeout: 30_000 });
  await at('messages');
  await page.goBack(); await sleep(600); await page.goBack(); await sleep(800);
  await page.locator(sel('mobile-new-run-button')).click();
  await page.locator(sel('mobile-new-run')).waitFor();
  await at('new-run');
  await page.locator(sel('mobile-new-run-close')).click();
  await page.locator(sel('mobile-node-button')).click();
  await page.locator(sel('mobile-connection-sheet')).waitFor();
  await at('connection-sheet');
  const known = /agent-package-definitions|Could not connect to the server|Failed to load resource/;
  evidence.unknownErrors = evidence.errors.filter(line => !known.test(line));
  evidence.result = evidence.unknownErrors.length === 0 && Object.values(evidence.screens).every(screen => !screen.horizontalScroll) && evidence.backTo === 'run' ? 'Pass' : 'Fail';
} catch (error) {
  evidence.error = redact(error.stack ?? String(error));
  await page.screenshot({ path: path.join(outDir, 'IOS-02-failure.png') }).catch(() => undefined);
} finally {
  await browser.close();
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outDir, 'ios-webkit-journey.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`ios webkit journey: ${evidence.result}${evidence.error ? `\n${evidence.error}` : ''}`);
}

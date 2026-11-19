// Shared by the iOS demo probes (autobyteus-279, design spec Verification Plan; AC-003, AC-004, AC-007): the demo build
// (`pnpm build:mobile-web --demo` → dist-mobile-demo/public) served as the iOS app serves it, opened in Chrome at the
// iPhone and iPad sizes. A probe fails on any finding (error words, an empty screen), console error or warning, page
// error, failed request or request that leaves the page (the demo has no network).
//
// Ported from the Solution Designer's App Reviewer sweep (evidence/demo-verification: crawl, sheets, final, upload, share),
// pointed at the build instead of the design reference. The first screen and the share sheet are the iOS app's own
// screens (XCUITests); these probes start where the app hands over to the web view: the demo's run list.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDemoBuildServer } from './fixtures/demo-build-server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** The sizes of the design's Verification Plan: iPhone 17 Pro Max, iPad portrait, iPad landscape. */
export const SIZES = [
  { label: 'iphone-440x956', width: 440, height: 956 },
  { label: 'ipad-portrait-820x1180', width: 820, height: 1180 },
  { label: 'ipad-landscape-1180x820', width: 1180, height: 820 },
];

/** Words a reviewer must never see in the demo (the sweep's list). */
export const BAD = /prototype|synthetic|fixture|mock|lorem|placeholder|todo|coming soon|not reachable|unreachable|failed|error|cannot|can't|couldn't|unsupported|not available|undefined|null|NaN|\[object/i;

const argument = (name) => {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
};
const chromeCandidates = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'];

/**
 * Runs `probe` once per size against the demo build. Each run gets a fresh browser context (a fresh demo, as each start
 * of the iOS demo is) and the size's own record; the process exits 1 when any run has a finding or an error.
 */
export const runDemoProbe = async (name, probe, sizes = SIZES) => {
  const build = path.resolve(argument('build') ?? path.join(webRoot, 'dist-mobile-demo/public'));
  if (!existsSync(path.join(build, 'index.html'))) throw new Error(`No demo build at ${build}: run \`pnpm build:mobile-web --demo\` first.`);
  const outputDir = path.resolve(argument('output-dir') ?? path.join(webRoot, 'test-results', name));
  mkdirSync(outputDir, { recursive: true });
  const executablePath = argument('browser-executable') ?? process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ?? chromeCandidates.find((candidate) => existsSync(candidate));
  const server = await startDemoBuildServer(build);
  const browser = await chromium.launch({ headless: true, executablePath });
  const results = [];
  try {
    for (const size of sizes) {
      const context = await browser.newContext({
        viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2, hasTouch: true, isMobile: size.width < 900, locale: 'en-US',
      });
      // noVNC reads the clipboard on focus where Chrome reports it as askable; WebKit never does (see the handoff).
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: server.baseUrl });
      const page = await context.newPage();
      const record = { size: size.label, findings: [], errors: [], log: [] };
      page.on('pageerror', (error) => record.errors.push(`pageerror ${String(error.message).slice(0, 200)}`));
      page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) record.errors.push(`${message.type()} ${message.text().slice(0, 200)}`); });
      page.on('requestfailed', (request) => record.errors.push(`requestfailed ${request.url().slice(0, 120)} ${request.failure()?.errorText ?? ''}`));
      page.on('request', (request) => {
        const url = request.url();
        if (!url.startsWith(server.baseUrl) && !url.startsWith('data:') && !url.startsWith('blob:')) record.errors.push(`external-request ${url.slice(0, 160)}`);
      });
      let shots = 0;
      const tools = {
        page, size, record,
        sleep: (ms) => page.waitForTimeout(ms),
        shot: async (label) => {
          await page.waitForTimeout(400);
          shots += 1;
          await page.screenshot({ path: path.join(outputDir, `${size.label}-${String(shots).padStart(3, '0')}-${label.replace(/[^a-z0-9]+/gi, '_').slice(0, 50)}.png`) });
        },
        text: () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim()),
        /** Records the words of BAD on the screen, or an empty screen, as a finding. */
        check: async (where) => {
          const text = await tools.text();
          const words = [...new Set((text.match(new RegExp(BAD.source, 'gi')) ?? []).map((word) => word.toLowerCase()))];
          if (words.length) record.findings.push({ where, words, context: words.map((word) => { const at = text.toLowerCase().indexOf(word); return text.slice(Math.max(0, at - 60), at + 60); }) });
          if (text.length < 40) record.findings.push({ where, empty: text });
          record.log.push({ where, length: text.length, head: text.slice(0, 160) });
        },
        expect: (where, ok, detail) => { if (!ok) record.findings.push({ where, expected: detail }); },
      };
      await page.goto(`${server.baseUrl}/`, { waitUntil: 'networkidle' });
      await page.locator('[data-testid="mobile-run-list"]').waitFor({ timeout: 30_000 });
      try {
        await probe(tools);
      } catch (error) {
        record.findings.push({ where: 'probe', failed: String(error?.message ?? error).split('\n')[0] });
        await tools.shot('probe-failed').catch(() => undefined);
      }
      record.errors = [...new Set(record.errors)];
      results.push(record);
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
  writeFileSync(path.join(outputDir, `${name}.json`), `${JSON.stringify(results, null, 1)}\n`);
  const failed = results.filter((record) => record.findings.length || record.errors.length);
  for (const record of results) console.log(`${name} ${record.size}: ${record.findings.length} findings, ${record.errors.length} errors`);
  if (failed.length) {
    for (const record of failed) console.error(JSON.stringify({ size: record.size, findings: record.findings, errors: record.errors }, null, 1));
    process.exitCode = 1;
  }
  return results;
};

/** The run list's rows (key, name, depth), after unfolding every row and showing older runs. */
export const unfoldRunList = async ({ page, sleep }) => {
  for (let pass = 0; pass < 6; pass += 1) {
    let clicked = 0;
    const toggles = page.locator('[data-testid="mobile-run-toggle"]');
    for (let index = 0; index < await toggles.count(); index += 1) {
      const toggle = toggles.nth(index);
      if ((await toggle.getAttribute('aria-expanded')) === 'false') { await toggle.click(); clicked += 1; await sleep(250); }
    }
    const older = page.locator('[data-testid="mobile-run-list-show-older"]');
    if (await older.count()) { await older.first().click(); clicked += 1; await sleep(400); }
    if (!clicked) break;
  }
  return page.locator('[data-test="mobile-run-row"]').evaluateAll((items) => items.map((item) => ({
    key: item.getAttribute('data-testid'), name: item.querySelector('[data-testid="mobile-run-name"]')?.textContent?.trim() ?? '', depth: item.getAttribute('data-depth'),
  })));
};

/** Opens a run by its row's name (showing older runs when it is among them). */
export const openRunNamed = async ({ page, sleep }, name) => {
  const row = async () => page.locator('[data-test="mobile-run-row"]', { has: page.locator('[data-testid="mobile-run-name"]', { hasText: new RegExp(`^${name}$`) }) }).first();
  if (!(await (await row()).count())) { await page.locator('[data-testid="mobile-run-list-show-older"]').click(); await sleep(400); }
  await (await row()).locator('[data-testid="mobile-run-open"]').click();
  await page.locator('[data-testid="mobile-run-conversation"]').waitFor({ timeout: 15_000 });
  await sleep(800);
};

/** Sends a message from the open run's composer and waits for the scripted reply to finish. */
export const sendFromComposer = async ({ page, sleep }, content) => {
  await page.locator('[data-testid="mobile-run-conversation"] textarea').last().fill(content);
  await page.getByRole('button', { name: 'Send message' }).last().click();
  await sleep(9000);
};

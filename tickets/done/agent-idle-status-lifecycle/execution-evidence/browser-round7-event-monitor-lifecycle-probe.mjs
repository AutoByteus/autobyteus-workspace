import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const playwrightCorePath = process.env.PLAYWRIGHT_CORE_PATH;
if (!playwrightCorePath) throw new Error('PLAYWRIGHT_CORE_PATH is required.');
const { chromium } = require(playwrightCorePath);

const baseUrl = process.env.BROWSER_PROBE_URL ?? 'http://127.0.0.1:18144/__validation-round7';
const evidenceDir = new URL('./', import.meta.url);
const observations = [];
const browserMessages = [];
const expectEqual = (actual, expected, label) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  observations.push({ label, actual });
};

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (message) => browserMessages.push({ type: message.type(), text: message.text() }));
  page.on('pageerror', (error) => browserMessages.push({ type: 'pageerror', text: error.message }));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  const status = page.getByTestId('agent-status');
  const dot = page.getByTestId('agent-status-dot');
  const revision = page.getByTestId('event-monitor-revision');
  const count = page.getByTestId('event-monitor-count');
  const dotHas = async (className) => (await dot.getAttribute('class'))?.includes(className) ?? false;

  expectEqual(await status.textContent(), 'offline', 'initial canonical status');
  expectEqual(await revision.textContent(), '0', 'initial Event Monitor revision');

  await page.getByTestId('error-a').click();
  expectEqual(await status.textContent(), 'error', 'canonical error status');
  expectEqual(await dotHas('bg-red-500'), true, 'canonical error renders red dot');
  expectEqual(await revision.textContent(), '0', 'status-only mutation is Event Monitor-neutral');

  await page.getByTestId('tool-start-a').click();
  expectEqual(await status.textContent(), 'error', 'tool start cannot repair canonical error');
  expectEqual(await revision.textContent(), '1', 'real tool summary advances Event Monitor revision');
  expectEqual(await count.textContent(), '1', 'tool start creates one retained Event Monitor visual');

  await page.getByTestId('tool-log-a').click();
  expectEqual(await status.textContent(), 'error', 'tool log remains lifecycle-neutral');
  expectEqual(await revision.textContent(), '1', 'tool log is Event Monitor revision-neutral');
  expectEqual(await page.getByTestId('tool-log-count').textContent(), '1', 'tool log remains retained');

  await page.getByTestId('running-a').click();
  expectEqual(await status.textContent(), 'running', 'canonical running recovers from error');
  expectEqual(await dotHas('bg-blue-500'), true, 'canonical running renders blue dot');
  expectEqual(await revision.textContent(), '1', 'running recovery retains Event Monitor revision');

  await page.getByTestId('idle-a').click();
  expectEqual(await status.textContent(), 'idle', 'canonical idle closes turn A');
  expectEqual(await dotHas('bg-green-500'), true, 'canonical idle renders green dot');

  await page.getByTestId('tool-result-a').click();
  expectEqual(await status.textContent(), 'idle', 'delayed tool result cannot reopen canonical idle');
  expectEqual(await page.getByTestId('tool-result').textContent(), '{"output":"round7-delayed-result-retained"}', 'delayed tool result remains retained');
  expectEqual(await count.textContent(), '1', 'delayed result preserves one Event Monitor visual');

  await page.getByTestId('running-b').click();
  expectEqual(await status.textContent(), 'running', 'new canonical turn B opens running');
  await page.getByTestId('idle-b').click();
  expectEqual(await status.textContent(), 'idle', 'new canonical turn B returns idle');
  expectEqual(await dotHas('bg-green-500'), true, 'final renderer state converges to idle green');

  await page.screenshot({
    path: new URL('browser-round7-event-monitor-lifecycle-final.png', evidenceDir).pathname,
    fullPage: true,
  });
  const result = { result: 'Pass', url: baseUrl, observations, browserMessages };
  await fs.writeFile(
    new URL('browser-round7-event-monitor-lifecycle-probe-result.json', evidenceDir),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await browser.close();
}

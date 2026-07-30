import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const playwrightCorePath = process.env.PLAYWRIGHT_CORE_PATH;
if (!playwrightCorePath) {
  throw new Error('PLAYWRIGHT_CORE_PATH must point to require.resolve(\'playwright-core\') from the worktree root.');
}
const { chromium } = require(playwrightCorePath);

const baseUrl = process.env.BROWSER_PROBE_URL ?? 'http://127.0.0.1:18124/__validation-lifecycle';
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (message) => browserMessages.push({ type: message.type(), text: message.text() }));
  page.on('pageerror', (error) => browserMessages.push({ type: 'pageerror', text: error.message }));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  const status = page.getByTestId('agent-status');
  const agentDot = page.getByTestId('agent-status-dot');
  const teamDot = page.getByTestId('team-status-dot');
  const statusClass = async (locator) => locator.getAttribute('class');

  expectEqual(await status.textContent(), 'offline', 'initial agent status');
  expectEqual((await statusClass(agentDot))?.includes('bg-gray-400'), true, 'initial agent dot is offline gray');

  await page.getByTestId('run-a').click();
  expectEqual(await status.textContent(), 'running', 'turn A canonical running status');
  expectEqual((await statusClass(agentDot))?.includes('bg-blue-500'), true, 'turn A agent dot is running blue');
  expectEqual((await statusClass(teamDot))?.includes('bg-blue-500'), true, 'turn A team dot converges to running blue');

  await page.getByTestId('idle-a').click();
  expectEqual(await status.textContent(), 'idle', 'turn A canonical idle status');
  expectEqual((await statusClass(agentDot))?.includes('bg-green-500'), true, 'turn A agent dot is idle green');

  await page.getByTestId('late-a').click();
  expectEqual(await status.textContent(), 'idle', 'late retired-turn activity preserves canonical idle');
  expectEqual((await statusClass(agentDot))?.includes('bg-green-500'), true, 'late activity does not reopen running dot');
  expectEqual(await page.getByTestId('message-count').textContent(), '1', 'late activity remains visible as one message');

  await page.getByTestId('run-b').click();
  expectEqual(await status.textContent(), 'running', 'new turn B opens running');
  await page.getByTestId('idle-b').click();
  expectEqual(await status.textContent(), 'idle', 'turn B returns to idle');
  expectEqual((await statusClass(teamDot))?.includes('bg-green-500'), true, 'team dot converges to final idle green');

  await page.screenshot({ path: new URL('browser-lifecycle-final.png', evidenceDir).pathname, fullPage: true });
  const result = {
    result: 'Pass',
    url: baseUrl,
    observations,
    browserMessages,
  };
  await fs.writeFile(new URL('browser-lifecycle-probe-result.json', evidenceDir), `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await browser.close();
}

import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright-core', { paths: [process.cwd(), path.join(process.cwd(), 'autobyteus-web')] }));

const evidenceDir = path.join(process.cwd(), 'tickets/done/taskagent-team-tab-ui/api-e2e-evidence');
const logLines = [];
const log = (...args) => {
  const line = args.map((arg) => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
  logLines.push(line);
  console.log(line);
};
const fail = (message) => { throw new Error(message); };
const expectText = async (locator, expected, label) => {
  const value = (await locator.textContent())?.trim() ?? '';
  log(`${label}:`, value);
  if (!value.includes(expected)) {
    fail(`${label} expected to include ${expected} but was ${value}`);
  }
};
const waitForProbeMessage = async (page, text) => {
  await page.waitForFunction((expected) => {
    return Array.from(document.querySelectorAll('[data-test="probe-message"]')).some((node) => (node.textContent || '').includes(expected));
  }, text, { timeout: 10000 });
};
const snapshot = async (page, label) => {
  const value = await page.evaluate(() => window.__round3Probe?.snapshot?.() ?? null);
  log(`${label} snapshot:`, value);
  return value;
};
const assertAddress = (snapshotValue, index, expectedAddress) => {
  const sent = snapshotValue?.sentMessages?.[index];
  if (!sent) fail(`Missing sent message ${index}`);
  const actual = JSON.stringify(sent.address);
  const expected = JSON.stringify(expectedAddress);
  log(`sent[${index}] address:`, actual);
  if (actual !== expected) fail(`Sent address mismatch at ${index}: expected ${expected}, got ${actual}`);
};

let browser;
try {
  await fs.mkdir(evidenceDir, { recursive: true });
  browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });
  page.on('console', (msg) => log(`[browser:${msg.type()}]`, msg.text()));
  page.on('pageerror', (err) => log('[browser:pageerror]', err.stack || err.message));
  page.on('requestfailed', (request) => log('[browser:requestfailed]', request.method(), request.url(), request.failure()?.errorText));

  const url = 'http://127.0.0.1:3000/__api_e2e_focus_send_browser';
  log('Opening browser fixture:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[data-test="round3-ready"]', { timeout: 30000 });
  await page.screenshot({ path: path.join(evidenceDir, 'round3-browser-ready.png'), fullPage: true });
  await expectText(page.locator('[data-test="round3-backend-url"]'), '127.0.0.1:29695', 'backend url');
  await expectText(page.locator('[data-test="probe-focused-route"]'), 'coordinator', 'initial focused route');

  log('Opening Tasks section');
  await page.locator('[data-test="team-active-tasks-header"]').click();
  await page.waitForSelector('[data-test="active-task-focus-primary"]', { timeout: 10000 });
  await page.screenshot({ path: path.join(evidenceDir, 'round3-browser-tasks-open.png'), fullPage: true });

  const taskAgentText = 'Browser task-agent focus send round 3';
  log('Clicking task-agent primary Focus');
  await page.locator('[data-test="active-task-focus-primary"]').first().click();
  await expectText(page.locator('[data-test="probe-focused-route"]'), 'team-run__worker__task_0001', 'task-agent focused route');
  await expectText(page.locator('[data-test="probe-active-run-id"]'), 'task-agent-run-1', 'task-agent active run id');
  await page.locator('[data-test="browser-composer"] textarea').fill(taskAgentText);
  await page.locator('[data-test="browser-composer"] button[title="Send message"]').click();
  await waitForProbeMessage(page, taskAgentText);
  let afterTaskAgent = await snapshot(page, 'after task-agent send');
  assertAddress(afterTaskAgent, 0, {
    segments: [
      { kind: 'member', memberRouteKey: 'worker' },
      { kind: 'task_agent', taskAgentRunId: 'task-agent-run-1' },
    ],
  });
  await page.screenshot({ path: path.join(evidenceDir, 'round3-browser-task-agent-focus-send.png'), fullPage: true });

  const taskTeamText = 'Browser task-team member focus send round 3';
  log('Selecting task-team row and clicking member Focus');
  await page.locator('[data-test="task-team-active-task-row"] [data-test="active-task-select-row"]').click();
  await page.locator('[data-test="active-task-member-row"]').first().click();
  await expectText(page.locator('[data-test="probe-focused-route"]'), 'task-team-run-1/solution_designer', 'task-team member focused route');
  await expectText(page.locator('[data-test="probe-active-run-id"]'), 'task-team-run-1::solution_designer', 'task-team member active run id');
  await page.locator('[data-test="browser-composer"] textarea').fill(taskTeamText);
  await page.locator('[data-test="browser-composer"] button[title="Send message"]').click();
  await waitForProbeMessage(page, taskTeamText);
  const afterTaskTeam = await snapshot(page, 'after task-team member send');
  assertAddress(afterTaskTeam, 1, {
    segments: [
      { kind: 'member', memberRouteKey: 'SoftwareEngineeringTeam' },
      { kind: 'task_team', taskTeamRunId: 'task-team-run-1' },
      { kind: 'member', memberRouteKey: 'solution_designer' },
    ],
  });
  await page.screenshot({ path: path.join(evidenceDir, 'round3-browser-task-team-member-focus-send.png'), fullPage: true });

  log('PASS Round 3 browser probe');
} catch (err) {
  log('FAIL Round 3 browser probe:', err?.stack || err?.message || err);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await fs.writeFile(path.join(evidenceDir, 'round3-browser-probe.log'), `${logLines.join('\n')}\n`, 'utf8');
}

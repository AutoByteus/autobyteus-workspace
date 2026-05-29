import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const repoRoot = '/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause';
const artifactDir = path.join(repoRoot, 'tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts');
const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:3000';
const requireFromWeb = createRequire(path.join(repoRoot, 'autobyteus-web/package.json'));
const { chromium } = requireFromWeb('playwright-core');

const screenshots = {
  agentsList: path.join(artifactDir, 'api-e2e-round13-script-agents-list-before-run-20260529.png'),
  workspaceError: path.join(artifactDir, 'api-e2e-round13-script-files-tab-error-20260529.png'),
};
const summaryPath = path.join(artifactDir, 'api-e2e-round13-browser-files-tab-reproduction-20260529.json');
const logPath = path.join(artifactDir, 'api-e2e-round13-browser-files-tab-reproduction-20260529.log');
const events = [];
const consoleEntries = [];
let browser;
let page;

function log(event, data = {}) {
  const entry = { at: new Date().toISOString(), event, ...data };
  events.push(entry);
  console.log(JSON.stringify(entry));
}

async function main() {
  await fs.mkdir(artifactDir, { recursive: true });
  browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'en-US' });
  page = await context.newPage();
  page.on('console', (message) => {
    const entry = { at: new Date().toISOString(), type: message.type(), text: message.text() };
    consoleEntries.push(entry);
    if (message.type() === 'error' || /Cannot access|FileExplorerTabs|ReferenceError/i.test(entry.text)) log('browser_console', entry);
  });
  page.on('pageerror', (error) => {
    const entry = { at: new Date().toISOString(), type: 'pageerror', text: String(error), stack: error?.stack };
    consoleEntries.push(entry);
    log('page_error', entry);
  });

  await page.goto(`${frontendUrl}/agents?view=list`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByText('Daily Assistant', { exact: true }).waitFor({ state: 'visible', timeout: 30000 });
  await page.screenshot({ path: screenshots.agentsList, fullPage: false });
  log('screenshot', { name: 'agentsList', filePath: screenshots.agentsList });

  const dailyAssistantCard = page.locator('.group.h-full').filter({ hasText: 'Daily Assistant' }).first();
  await dailyAssistantCard.waitFor({ state: 'visible', timeout: 30000 });
  await dailyAssistantCard.getByRole('button', { name: 'Run' }).click();
  log('click', { label: 'Daily Assistant Run' });
  await page.waitForURL('**/workspace', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: screenshots.workspaceError, fullPage: false });
  log('screenshot', { name: 'workspaceError', filePath: screenshots.workspaceError });

  const bodyText = await page.locator('body').innerText({ timeout: 10000 });
  const result = /Error 500/i.test(bodyText) && /Cannot access 'handleKeydown' before initialization/i.test(bodyText)
    ? 'reproduced_failure'
    : 'not_reproduced';
  const summary = {
    result,
    frontendUrl,
    finalUrl: page.url(),
    bodyText: bodyText.slice(0, 6000),
    screenshots,
    consoleEntries,
    events,
  };
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  log('result', { result, summaryPath });
  if (result !== 'reproduced_failure') process.exitCode = 2;
}

try {
  await main();
} catch (error) {
  const summary = { result: 'script_error', error: String(error), stack: error?.stack, consoleEntries, events };
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2)).catch(() => undefined);
  log('result', { result: 'script_error', error: String(error), summaryPath });
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  await fs.writeFile(logPath, events.map((entry) => JSON.stringify(entry)).join('\n') + '\n').catch(() => undefined);
}

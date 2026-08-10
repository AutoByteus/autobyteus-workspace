import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(path.join(process.cwd(), 'autobyteus-web/package.json'));
const { chromium } = require('playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const meta = JSON.parse(await fs.readFile(path.join(here, 'real-classroom-owned-runtime.json'), 'utf8'));
const previous = JSON.parse(await fs.readFile(path.join(here, 'real-classroom-ui-evidence.json'), 'utf8'));
const evidence = {
  startedAt: new Date().toISOString(),
  baseUrl: `http://127.0.0.1:${meta.frontendPort}`,
  teamRunId: meta.uiTeamRunId,
  marker: previous.token,
  assertions: {},
  browserEvents: [],
};
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  const page = await context.newPage();
  page.on('console', (message) => evidence.browserEvents.push({ type: `console:${message.type()}`, text: message.text() }));
  page.on('pageerror', (error) => evidence.browserEvents.push({ type: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => evidence.browserEvents.push({ type: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}` }));

  await page.goto(`${evidence.baseUrl}/workspace`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const openHistory = page.getByRole('button', { name: 'Open runs/history', exact: true });
  await openHistory.waitFor({ state: 'visible', timeout: 30_000 });
  await openHistory.click();

  // The desktop history panel intentionally discovers only registered filesystem
  // workspaces. Register the isolated run root through the same UI a user uses,
  // then expand it so the normal workspace-scoped history query runs.
  const addWorkspace = page.getByTitle(/add workspace/i).first();
  await addWorkspace.click();
  const pathInput = page.locator('[data-test="workspace-path-input"]');
  await pathInput.fill(path.join(meta.runtimeDir, 'temp_workspace'));
  await page.locator('[data-test="confirm-create-workspace"]').click();
  const workspaceRow = page.locator(`[data-test="workspace-row"][data-workspace-root="${path.join(meta.runtimeDir, 'temp_workspace')}"]`);
  await workspaceRow.waitFor({ state: 'visible', timeout: 30_000 });
  const workspaceButton = workspaceRow.getByRole('button').first();
  if ((await workspaceRow.getAttribute('aria-expanded')) === 'true') await workspaceButton.click();
  await workspaceButton.click();

  const teamLabel = page.getByText('Classroom Simulation Team', { exact: true }).first();
  await teamLabel.waitFor({ state: 'visible', timeout: 30_000 });
  evidence.assertions.historyLoadedAfterExplicitOpen = true;

  const historyBody = await page.locator('body').innerText();
  evidence.historyBodyText = historyBody.slice(0, 40_000);
  await page.screenshot({ path: path.join(here, 'real-classroom-ui-history-open.png'), fullPage: true });

  await teamLabel.click();
  const teamRun = page.locator(`[data-test="workspace-team-row-${meta.uiTeamRunId}"]`);
  await teamRun.waitFor({ state: 'visible', timeout: 20_000 });
  await teamRun.click();
  const professor = page.locator(`[data-test="workspace-team-member-${meta.uiTeamRunId}-professor"]`);
  await professor.waitFor({ state: 'visible', timeout: 20_000 });
  await professor.click();

  await page.waitForFunction((marker) => document.body.innerText.includes(marker), evidence.marker, { timeout: 60_000 });
  const selectedBody = await page.locator('body').innerText();
  evidence.selectedBodyText = selectedBody.slice(0, 60_000);
  evidence.assertions.summaryPresent = selectedBody.includes('Run one short real classroom exchange');
  evidence.assertions.professorPresent = /professor/i.test(selectedBody);
  evidence.assertions.studentPresent = /student/i.test(selectedBody);
  evidence.assertions.markerHydratedAfterHistorySelection = selectedBody.includes(evidence.marker);
  evidence.assertions.toolHistoryHydrated = selectedBody.includes('run_bash') && selectedBody.includes('send_message_to');
  evidence.assertions.thinkingHydrated = selectedBody.includes('Thinking');
  evidence.assertions.fileBackedAnswerHydrated = selectedBody.includes('student-answer.md');
  await page.screenshot({ path: path.join(here, 'real-classroom-ui-history-selected.png'), fullPage: true });

  if (Object.values(evidence.assertions).some((value) => value !== true)) {
    throw new Error(`Historical Classroom assertions failed: ${JSON.stringify(evidence.assertions)}`);
  }
  evidence.result = 'Pass';
  evidence.completedAt = new Date().toISOString();
  await context.close();
} catch (error) {
  evidence.result = 'Fail';
  evidence.failure = { message: error?.message ?? String(error), stack: error?.stack };
  evidence.completedAt = new Date().toISOString();
  throw error;
} finally {
  if (browser) await browser.close().catch(() => {});
  await fs.writeFile(path.join(here, 'real-classroom-ui-history-followup.json'), JSON.stringify(evidence, null, 2));
}

console.log(`Real Classroom history follow-up passed for ${evidence.teamRunId}`);

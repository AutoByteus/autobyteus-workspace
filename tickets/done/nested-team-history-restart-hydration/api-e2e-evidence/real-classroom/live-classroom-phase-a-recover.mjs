import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';

const evidenceDir = path.resolve('api-e2e-evidence/real-classroom');
const frontendPort = (await fs.readFile(path.join(evidenceDir, 'frontend-port.txt'), 'utf8')).trim();
const baseUrl = `http://127.0.0.1:${frontendPort}`;
const screenshotPath = path.join(evidenceDir, 'live-task-member-before-restart.png');
const promptMarker = 'Create a real pending nested-history restart probe.';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
page.setDefaultTimeout(90_000);
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(`${baseUrl}/workspace`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-test="workspace-row"] button').first().click();
  await page.locator('[data-test="workspace-team-definition-row-nested-classroom-test"]').click();
  const rootRunRow = page.locator('[data-test^="workspace-team-row-"]').filter({ hasText: promptMarker });
  await rootRunRow.click();
  const rootRowTestId = await rootRunRow.getAttribute('data-test');
  const rootTeamRunId = rootRowTestId?.replace('workspace-team-row-', '') ?? '';
  if (!rootTeamRunId) throw new Error('LIVE_PHASE_A_ROOT_TEAM_RUN_ID_MISSING');

  const configuredNestedDisclosure = page.locator(
    `[data-test="workspace-team-member-disclosure"][data-team-run-id="${rootTeamRunId}"]` +
    '[data-member-address="/StudentStudyGroup"]',
  );
  await configuredNestedDisclosure.click();
  const taskTeamRow = page.locator(
    '[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]',
  );
  await taskTeamRow.waitFor();
  await taskTeamRow.locator('[data-test="workspace-team-transient-disclosure"]').click();
  const taskStudentOne = page.locator(
    '[data-test="workspace-team-transient-execution-row"]' +
    '[data-transient-kind="task_team_child"]' +
    '[data-member-address="/StudentStudyGroup/student_one"]',
  );
  await taskStudentOne.click();

  const center = page.locator('[data-test="workspace-center-pane"]');
  await center.getByText('submit_task_result', { exact: true }).waitFor();
  await center.getByText('API_E2E_REAL_COLD_HISTORY_OK', { exact: false }).first().waitFor();
  const beforeRestartText = await center.innerText();
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await page.getByRole('button', { name: 'Terminate team', exact: true }).click();
  await center.getByText('Offline', { exact: true }).waitFor();

  await fs.writeFile(path.join(evidenceDir, 'live-phase-a-result.json'), `${JSON.stringify({
    rootTeamRunId,
    promptMarker,
    beforeRestartConversationContainsTask: beforeRestartText.includes(promptMarker),
    beforeRestartContainsTool: beforeRestartText.includes('submit_task_result'),
    beforeRestartContainsToken: beforeRestartText.includes('API_E2E_REAL_COLD_HISTORY_OK'),
    toolApprovalIntentionallyLeftPending: !beforeRestartText.includes('Task result submitted successfully'),
    terminated: true,
    screenshotPath,
    consoleErrors,
  }, null, 2)}\n`);
  process.stdout.write(`${rootTeamRunId}\n`);
} finally {
  await browser.close();
}

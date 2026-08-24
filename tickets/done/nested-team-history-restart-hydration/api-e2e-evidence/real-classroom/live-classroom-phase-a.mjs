import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';

const evidenceDir = path.resolve('api-e2e-evidence/real-classroom');
const frontendPort = (await fs.readFile(path.join(evidenceDir, 'frontend-port.txt'), 'utf8')).trim();
const baseUrl = `http://127.0.0.1:${frontendPort}`;
const screenshotPath = path.join(evidenceDir, 'live-task-member-before-restart.png');
const prompt = [
  'Create a real pending nested-history restart probe.',
  'Delegate exactly one task to /StudentStudyGroup and ask student_one to call submit_task_result',
  'with exactly API_E2E_REAL_COLD_HISTORY_OK.',
  'Do not do any other work.',
].join(' ');

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
page.setDefaultTimeout(120_000);
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  await page.goto(`${baseUrl}/agent-teams?view=team-list`, { waitUntil: 'domcontentloaded' });
  const heading = page.getByRole('heading', { name: 'Nested Classroom Test Team', exact: true });
  await heading.waitFor();
  const card = heading.locator('xpath=ancestor::div[contains(@class,"group")][1]');
  await card.getByRole('button', { name: 'Run', exact: true }).click();

  await page.getByText('Team Definition', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Select a model', exact: true }).click();
  await page.locator('li').filter({ hasText: /^deepseek-v4-flash$/ }).click();
  await page.getByRole('button', { name: 'Run Team', exact: true }).click();

  const composer = page.locator('textarea[placeholder="Type a message..."]');
  await composer.waitFor();
  await composer.fill(prompt);
  await page.getByTitle('Send message').click();

  const center = page.locator('[data-test="workspace-center-pane"]');
  await center.getByText('delegate_task', { exact: true }).waitFor();
  await center.getByRole('button', { name: 'Approve', exact: true }).click();

  const taskTeamRow = page.locator(
    '[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]',
  );
  await taskTeamRow.waitFor();
  const rootRunRow = page.locator('[data-test^="workspace-team-row-"]').filter({ hasText: 'Create a real pending nested-history restart probe.' });
  await rootRunRow.waitFor();
  const rootRowTestId = await rootRunRow.getAttribute('data-test');
  const rootTeamRunId = rootRowTestId?.replace('workspace-team-row-', '') ?? '';
  if (!rootTeamRunId) throw new Error('LIVE_PHASE_A_ROOT_TEAM_RUN_ID_MISSING');

  await taskTeamRow.locator('[data-test="workspace-team-transient-disclosure"]').click();
  const taskStudentOne = page.locator(
    '[data-test="workspace-team-transient-execution-row"]' +
    '[data-transient-kind="task_team_child"]' +
    '[data-member-address="/StudentStudyGroup/student_one"]',
  );
  await taskStudentOne.waitFor();
  await taskStudentOne.click();
  await center.getByText('submit_task_result', { exact: true }).waitFor();
  await center.getByText('API_E2E_REAL_COLD_HISTORY_OK', { exact: false }).waitFor();
  await center.getByRole('button', { name: 'Approve', exact: true }).waitFor();
  const beforeRestartText = await center.innerText();
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await page.getByRole('button', { name: 'Terminate team', exact: true }).click();
  await center.getByText('Offline', { exact: true }).waitFor();

  await fs.writeFile(path.join(evidenceDir, 'live-phase-a-result.json'), `${JSON.stringify({
    rootTeamRunId,
    prompt,
    beforeRestartConversationContainsTask: beforeRestartText.includes('Create a real pending nested-history restart probe.'),
    beforeRestartContainsTool: beforeRestartText.includes('submit_task_result'),
    beforeRestartContainsToken: beforeRestartText.includes('API_E2E_REAL_COLD_HISTORY_OK'),
    toolApprovalIntentionallyLeftPending: true,
    terminated: true,
    screenshotPath,
    consoleErrors,
  }, null, 2)}\n`);
  process.stdout.write(`${rootTeamRunId}\n`);
} finally {
  await browser.close();
}

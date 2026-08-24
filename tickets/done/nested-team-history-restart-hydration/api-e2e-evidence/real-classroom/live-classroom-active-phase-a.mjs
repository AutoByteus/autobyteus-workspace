import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';

const evidenceDir = path.resolve('api-e2e-evidence/real-classroom');
const frontendPort = (await fs.readFile(path.join(evidenceDir, 'frontend-port.txt'), 'utf8')).trim();
const baseUrl = `http://127.0.0.1:${frontendPort}`;
const screenshotPath = path.join(evidenceDir, 'live-active-task-member-before-cold-restart.png');
const promptMarker = 'Create a real active nested-history cold restart probe.';
const token = 'API_E2E_REAL_ACTIVE_COLD_RESTART_OK';
const prompt = [
  promptMarker,
  'Delegate exactly one task to /StudentStudyGroup and ask student_one to call submit_task_result',
  `with exactly ${token}.`,
  'Do not do any other work.',
].join(' ');

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
page.setDefaultTimeout(180_000);
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

  const rootRunRow = page.locator('[data-test^="workspace-team-row-"]').filter({ hasText: promptMarker });
  await rootRunRow.waitFor();
  const rootRowTestId = await rootRunRow.getAttribute('data-test');
  const rootTeamRunId = rootRowTestId?.replace('workspace-team-row-', '') ?? '';
  if (!rootTeamRunId) throw new Error('ACTIVE_PHASE_A_ROOT_TEAM_RUN_ID_MISSING');

  const configuredNestedDisclosure = page.locator(
    `[data-test="workspace-team-member-disclosure"][data-team-run-id="${rootTeamRunId}"]` +
    '[data-member-address="/StudentStudyGroup"]',
  );
  const taskTeamRow = page.locator(
    '[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]',
  ).filter({ hasText: token });
  if (!(await taskTeamRow.isVisible().catch(() => false))) {
    await configuredNestedDisclosure.click();
  }
  await taskTeamRow.waitFor();
  await taskTeamRow.locator('[data-test="workspace-team-transient-disclosure"]').click();
  const taskStudentOne = page.locator(
    '[data-test="workspace-team-transient-execution-row"]' +
    '[data-transient-kind="task_team_child"]' +
    '[data-member-address="/StudentStudyGroup/student_one"]',
  ).filter({ has: page.locator(`[data-root-team-run-id="${rootTeamRunId}"]`) });
  // Attribute scoping differs between production builds, so fall back to the last visible matching task child.
  const matchingChildren = page.locator(
    '[data-test="workspace-team-transient-execution-row"]' +
    '[data-transient-kind="task_team_child"]' +
    '[data-member-address="/StudentStudyGroup/student_one"]',
  );
  const targetChild = (await taskStudentOne.count()) > 0 ? taskStudentOne.first() : matchingChildren.last();
  await targetChild.waitFor();
  const childAttributes = await targetChild.evaluate((element) => Object.fromEntries([...element.attributes].map((a) => [a.name, a.value])));
  await targetChild.click();
  await center.getByText('submit_task_result', { exact: true }).waitFor();
  await center.getByText(token, { exact: false }).first().waitFor();
  await center.getByRole('button', { name: 'Approve', exact: true }).waitFor();
  const beforeRestartText = await center.innerText();
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const result = {
    rootTeamRunId,
    prompt,
    promptMarker,
    token,
    childAttributes,
    beforeRestartContainsTaskDescription: beforeRestartText.includes('As the /StudentStudyGroup team coordinator'),
    beforeRestartContainsReasoning: beforeRestartText.includes('Thinking'),
    beforeRestartContainsTool: beforeRestartText.includes('submit_task_result'),
    beforeRestartContainsToken: beforeRestartText.includes(token),
    toolApprovalIntentionallyLeftPending: true,
    rootIntentionallyLeftActiveForAbruptServerRestart: true,
    screenshotPath,
    consoleErrors,
  };
  if (!result.beforeRestartContainsTaskDescription || !result.beforeRestartContainsReasoning
    || !result.beforeRestartContainsTool || !result.beforeRestartContainsToken) {
    throw new Error(`ACTIVE_PHASE_A_ASSERTION_FAILED:${JSON.stringify(result)}`);
  }
  await fs.writeFile(path.join(evidenceDir, 'live-active-phase-a-result.json'), `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await browser.close();
}

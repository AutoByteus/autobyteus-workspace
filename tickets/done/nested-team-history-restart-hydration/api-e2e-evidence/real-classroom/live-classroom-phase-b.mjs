import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';

const evidenceDir = path.resolve('api-e2e-evidence/real-classroom');
const baseUrl = `http://127.0.0.1:${(await fs.readFile(path.join(evidenceDir, 'frontend-port.txt'), 'utf8')).trim()}`;
const rootTeamRunId = 'nested_classroom_test_team_081587e1388b4407a50c84adcc955d91';
const taskAgentRunId = 'student_one_83f7eac2a00e49f8a0b92c521dc0cee1';
const directRootAgentRunId = 'test_teacher_b2c7cb32c72e4fcba2bca923e4cabf2e';
const token = 'API_E2E_REAL_COLD_HISTORY_OK';
const taskDescriptionMarker = 'As the /StudentStudyGroup team coordinator';
const resultPath = path.join(evidenceDir, 'live-phase-b-result.json');
const teamScreenshotPath = path.join(evidenceDir, 'live-task-member-after-cold-restart-team.png');
const activityScreenshotPath = path.join(evidenceDir, 'live-task-member-after-cold-restart-activity.png');

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
  await page.locator(`[data-test="workspace-team-row-${rootTeamRunId}"]`).click();

  const center = page.locator('[data-test="workspace-center-pane"]');
  await center.getByText('Teacher', { exact: true }).first().waitFor();
  const directRootText = await center.innerText();

  const storeSelection = await page.evaluate(async ({ rootTeamRunId, taskAgentRunId }) => {
    const app = document.querySelector('#__nuxt')?.__vue_app__;
    if (!app) throw new Error('NUXT_VUE_APP_NOT_FOUND');
    const piniaKey = Reflect.ownKeys(app._context.provides).find((key) => String(key) === 'Symbol(pinia)');
    const pinia = piniaKey ? app._context.provides[piniaKey] : null;
    if (!pinia) throw new Error('PINIA_NOT_FOUND');
    const history = pinia._s.get('runHistory');
    const contexts = pinia._s.get('agentTeamContexts');
    if (!history || !contexts) throw new Error('RUN_HISTORY_STORES_NOT_FOUND');
    await history.openTeamMemberRun(rootTeamRunId, taskAgentRunId);
    const context = contexts.getTeamContextById(rootTeamRunId);
    return {
      selectedTeamRunId: history.selectedTeamRunId,
      selectedTeamMemberAddress: history.selectedTeamMemberAddress,
      focusedAgentRunId: context?.view?.getFocusedAgentRunId?.() ?? null,
      focusedMemberAddress: context?.view?.getFocusedMemberAddress?.() ?? null,
      taskAgentPresent: Boolean(context?.view?.hasAgentRun?.(taskAgentRunId)),
    };
  }, { rootTeamRunId, taskAgentRunId });

  await center.getByText('student_one', { exact: true }).first().waitFor();
  await center.getByText('submit_task_result', { exact: true }).waitFor();
  await center.getByText(token, { exact: false }).first().waitFor();
  await center.getByText(taskDescriptionMarker, { exact: false }).first().waitFor();
  const coldCenterText = await center.innerText();

  const teamTab = page.getByText('Team', { exact: true }).last();
  await teamTab.click();
  const teamPanel = page.locator('body');
  await teamPanel.getByText('Task assigned', { exact: true }).waitFor();
  await teamPanel.getByText(taskDescriptionMarker, { exact: false }).last().waitFor();
  const teamSurfaceText = await page.locator('body').innerText();
  await page.screenshot({ path: teamScreenshotPath, fullPage: true });

  const activityTab = page.getByText('Activity', { exact: true }).last();
  await activityTab.click();
  await page.waitForTimeout(1000);
  await page.getByText('submit_task_result', { exact: true }).last().waitFor();
  const activitySurfaceText = await page.locator('body').innerText();
  await page.screenshot({ path: activityScreenshotPath, fullPage: true });

  const result = {
    rootTeamRunId,
    directRootAgentRunId,
    taskAgentRunId,
    storeSelection,
    directRootControl: {
      nonEmpty: directRootText.trim().length > 0,
      containsDelegationPrompt: directRootText.includes('Create a real pending nested-history restart probe.'),
      containsDelegateTool: directRootText.includes('delegate_task'),
    },
    coldTaskMember: {
      containsTaskInput: coldCenterText.includes(taskDescriptionMarker),
      containsReasoning: coldCenterText.includes('Thinking'),
      containsTool: coldCenterText.includes('submit_task_result'),
      containsToken: coldCenterText.includes(token),
      offlineAfterRestart: coldCenterText.includes('Offline'),
    },
    teamCommunicationControl: {
      taskAssignedVisible: teamSurfaceText.includes('Task assigned'),
      delegatedTaskVisible: teamSurfaceText.includes(taskDescriptionMarker),
    },
    activityControl: {
      nonEmpty: activitySurfaceText.includes('submit_task_result'),
      toolVisible: activitySurfaceText.includes('submit_task_result'),
      tokenVisible: activitySurfaceText.includes(token),
    },
    screenshots: { teamScreenshotPath, activityScreenshotPath },
    consoleErrors,
  };
  const required = [
    result.storeSelection.taskAgentPresent,
    result.storeSelection.focusedAgentRunId === taskAgentRunId,
    result.directRootControl.nonEmpty,
    result.directRootControl.containsDelegationPrompt,
    result.directRootControl.containsDelegateTool,
    ...Object.values(result.coldTaskMember),
    ...Object.values(result.teamCommunicationControl),
    ...Object.values(result.activityControl),
  ];
  if (required.some((value) => value !== true)) {
    throw new Error(`LIVE_PHASE_B_ASSERTION_FAILED:${JSON.stringify(result)}`);
  }
  await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await browser.close();
}

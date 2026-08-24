import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';

const evidenceDir=path.resolve('api-e2e-evidence/real-classroom');
const baseUrl=`http://127.0.0.1:${(await fs.readFile(path.join(evidenceDir,'frontend-port.txt'),'utf8')).trim()}`;
const rootTeamRunId='nested_classroom_test_team_ef79cfb19d364f558b6f5e5ae2e08194';
const taskTeamRunId='team_local_team_nested_classroom_test_student_st_1eb9bd0abbba4bb587c2af48aafe4bfc';
const taskAgentRunId='student_one_e7a87cdb646e4678ac5ffacf5a82dcbe';
const directRootAgentRunId='test_teacher_bef770a8abd34551bbdd38d8be2a06cf';
const promptMarker='Create a real active nested-history cold restart probe.';
const taskMarker='Nested-team cold restart probe task.';
const token='API_E2E_REAL_ACTIVE_COLD_RESTART_OK';
const teamScreenshotPath=path.join(evidenceDir,'live-active-task-member-after-cold-restart-team.png');
const activityScreenshotPath=path.join(evidenceDir,'live-active-task-member-after-cold-restart-activity.png');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1600,height:1100}}); page.setDefaultTimeout(90_000);
const consoleErrors=[]; page.on('console',m=>{if(m.type()==='error') consoleErrors.push(m.text());});
try {
  await page.goto(`${baseUrl}/workspace`,{waitUntil:'domcontentloaded'});
  await page.locator('[data-test="workspace-row"] button').first().click();
  await page.locator('[data-test="workspace-team-definition-row-nested-classroom-test"]').click();
  const rootRow=page.locator(`[data-test="workspace-team-row-${rootTeamRunId}"]`);
  await rootRow.waitFor(); await rootRow.click();
  const center=page.locator('[data-test="workspace-center-pane"]');
  await center.getByText('Teacher',{exact:true}).first().waitFor();
  await center.getByText(promptMarker,{exact:false}).first().waitFor();
  await center.getByText('delegate_task',{exact:true}).waitFor();
  const directRootText=await center.innerText();

  const configuredNestedDisclosure=page.locator(`[data-test="workspace-team-member-disclosure"][data-team-run-id="${rootTeamRunId}"][data-member-address="/StudentStudyGroup"]`);
  await configuredNestedDisclosure.click();
  const taskTeamRow=page.locator('[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]');
  await taskTeamRow.waitFor();
  const taskTeamAddress=await taskTeamRow.getAttribute('data-member-address');
  await taskTeamRow.locator('[data-test="workspace-team-transient-disclosure"]').click();
  const taskChild=page.locator('[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team_child"][data-member-address="/StudentStudyGroup/student_one"]');
  await taskChild.waitFor(); await taskChild.click();
  await center.getByText('student_one',{exact:true}).first().waitFor();
  await center.getByText(taskMarker,{exact:false}).first().waitFor();
  await center.getByText('submit_task_result',{exact:true}).waitFor();
  await center.getByText(token,{exact:false}).first().waitFor();
  const coldCenterText=await center.innerText();

  const right=page.locator('[data-test="workspace-right-panel"]');
  await right.locator('[data-tab-name="teamMembers"]').click();
  await right.getByText('Task assigned',{exact:true}).waitFor();
  await right.getByText(taskMarker,{exact:false}).last().waitFor();
  const teamText=await right.innerText();
  await page.screenshot({path:teamScreenshotPath,fullPage:true});

  await right.locator('[data-tab-name="progress"]').click();
  const activityFeed=right.locator('[data-test="activity-feed-scroll-container"]');
  await activityFeed.waitFor();
  await activityFeed.getByText('submit_task_result',{exact:false}).last().waitFor();
  const activityText=await activityFeed.innerText();
  const eventCountText=await right.getByText(/\d+ Events/).innerText();
  await page.screenshot({path:activityScreenshotPath,fullPage:true});

  const result={
    rootTeamRunId,taskTeamRunId,taskAgentRunId,directRootAgentRunId,
    directRootControl:{nonEmpty:directRootText.trim().length>0,containsPrompt:directRootText.includes(promptMarker),containsDelegateTool:directRootText.includes('delegate_task')},
    taskTreeControl:{taskTeamVisible:taskTeamAddress==='/StudentStudyGroup',taskChildVisible:true},
    coldTaskMember:{containsTaskInput:coldCenterText.includes(taskMarker),containsReasoning:coldCenterText.includes('Thinking'),containsTool:coldCenterText.includes('submit_task_result'),containsToken:coldCenterText.includes(token)},
    teamCommunicationControl:{taskAssignedVisible:teamText.includes('Task assigned'),delegatedTaskVisible:teamText.includes(taskMarker)},
    activityControl:{eventCountText,nonEmpty:!/^(0 Events)$/.test(eventCountText.trim()),toolVisible:activityText.includes('submit_task_result')},
    screenshots:{teamScreenshotPath,activityScreenshotPath},consoleErrors,
  };
  const checks=[...Object.values(result.directRootControl),...Object.values(result.taskTreeControl),...Object.values(result.coldTaskMember),...Object.values(result.teamCommunicationControl),result.activityControl.nonEmpty,result.activityControl.toolVisible];
  if(checks.some(v=>v!==true)) throw new Error(`ACTIVE_PHASE_B_ASSERTION_FAILED:${JSON.stringify(result)}`);
  await fs.writeFile(path.join(evidenceDir,'live-active-phase-b-result.json'),`${JSON.stringify(result,null,2)}\n`);
  console.log(JSON.stringify(result,null,2));
} finally {await browser.close();}

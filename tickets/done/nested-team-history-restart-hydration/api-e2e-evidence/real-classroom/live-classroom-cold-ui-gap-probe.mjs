import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';
const evidenceDir=path.resolve('api-e2e-evidence/real-classroom');
const baseUrl=`http://127.0.0.1:${(await fs.readFile(path.join(evidenceDir,'frontend-port.txt'),'utf8')).trim()}`;
const rootTeamRunId='nested_classroom_test_team_ef79cfb19d364f558b6f5e5ae2e08194';
const taskAgentRunId='student_one_e7a87cdb646e4678ac5ffacf5a82dcbe';
const promptMarker='Create a real active nested-history cold restart probe.';
const taskMarker='Nested-team cold restart probe task.';
const token='API_E2E_REAL_ACTIVE_COLD_RESTART_OK';
const teamShot=path.join(evidenceDir,'live-active-cold-ui-team-control-and-missing-task-row.png');
const configuredShot=path.join(evidenceDir,'live-active-cold-ui-configured-empty-control.png');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1600,height:1100}});page.setDefaultTimeout(90_000);
const consoleErrors=[];page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
try{
  await page.goto(`${baseUrl}/workspace`,{waitUntil:'domcontentloaded'});
  await page.locator('[data-test="workspace-row"] button').first().click();
  await page.locator('[data-test="workspace-team-definition-row-nested-classroom-test"]').click();
  await page.locator(`[data-test="workspace-team-row-${rootTeamRunId}"]`).click();
  const center=page.locator('[data-test="workspace-center-pane"]');
  await center.getByText('Teacher',{exact:true}).first().waitFor();
  await center.getByText(promptMarker,{exact:false}).first().waitFor();
  await center.getByText('delegate_task',{exact:true}).waitFor();
  const directRootText=await center.innerText();
  const nestedDisclosure=page.locator(`[data-test="workspace-team-member-disclosure"][data-team-run-id="${rootTeamRunId}"][data-member-address="/StudentStudyGroup"]`);
  await nestedDisclosure.click();
  await page.waitForTimeout(800);
  const historicalTaskRows=page.locator('[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]');
  const historicalTaskRowCount=await historicalTaskRows.count();

  const right=page.locator('[data-test="workspace-right-panel"]');
  await right.locator('[data-tab-name="teamMembers"]').click();
  await right.getByText('Task assigned',{exact:true}).waitFor();
  await right.getByText(taskMarker,{exact:false}).last().waitFor();
  const teamText=await right.innerText();
  await page.screenshot({path:teamShot,fullPage:true});

  const exactTaskSelectionError=await page.evaluate(async({rootTeamRunId,taskAgentRunId})=>{
    const app=document.querySelector('#__nuxt')?.__vue_app__;
    const key=app&&Reflect.ownKeys(app._context.provides).find(k=>String(k)==='Symbol(pinia)');
    const pinia=key?app._context.provides[key]:null;
    const history=pinia?._s?.get('runHistory');
    if(!history)return 'RUN_HISTORY_STORE_NOT_FOUND';
    try{await history.openTeamMemberRun(rootTeamRunId,taskAgentRunId);return null;}catch(error){return error instanceof Error?error.message:String(error);}
  },{rootTeamRunId,taskAgentRunId});

  const result={
    rootTeamRunId,taskAgentRunId,
    directRootControl:{nonEmpty:directRootText.trim().length>0,containsPrompt:directRootText.includes(promptMarker),containsDelegateTool:directRootText.includes('delegate_task')},
    teamCommunicationControl:{taskRecordVisible:teamText.includes('Task assigned'),taskDescriptionVisible:teamText.includes(taskMarker),interruptedStatusVisible:teamText.includes('Interrupted')},
    coldTaskNavigation:{historicalTaskRowCount,exactTaskSelectionError,taskRowAbsent:historicalTaskRowCount===0,exactTaskRejectedAsNotLive:exactTaskSelectionError===`AgentRun '${taskAgentRunId}' is not live.`},
    screenshots:{teamShot},consoleErrors,
  };
  const expected=[...Object.values(result.directRootControl),...Object.values(result.teamCommunicationControl),result.coldTaskNavigation.taskRowAbsent,result.coldTaskNavigation.exactTaskRejectedAsNotLive];
  if(expected.some(v=>v!==true))throw new Error(`COLD_UI_GAP_PROBE_UNEXPECTED:${JSON.stringify(result)}`);
  await fs.writeFile(path.join(evidenceDir,'live-cold-ui-gap-result.json'),`${JSON.stringify(result,null,2)}\n`);
  console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}

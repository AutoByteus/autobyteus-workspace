import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';

const evidenceDir = path.resolve('api-e2e-evidence/real-classroom');
const baseUrl = `http://127.0.0.1:${(await fs.readFile(path.join(evidenceDir, 'frontend-port.txt'), 'utf8')).trim()}`;
const screenshotPath = path.join(evidenceDir, 'live-active-task-member-before-cold-restart.png');
const promptMarker = 'Create a real active nested-history cold restart probe.';
const token = 'API_E2E_REAL_ACTIVE_COLD_RESTART_OK';

const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page = await browser.newPage({viewport:{width:1600,height:1100}});
page.setDefaultTimeout(90_000);
const consoleErrors=[];
page.on('console',m=>{if(m.type()==='error') consoleErrors.push(m.text());});
try {
  await page.goto(`${baseUrl}/workspace`,{waitUntil:'domcontentloaded'});
  await page.locator('[data-test="workspace-row"] button').first().click();
  await page.locator('[data-test="workspace-team-definition-row-nested-classroom-test"]').click();
  const rootRunRow=page.locator('[data-test^="workspace-team-row-"]').filter({hasText:promptMarker});
  await rootRunRow.waitFor();
  await rootRunRow.click();
  const rootTeamRunId=(await rootRunRow.getAttribute('data-test'))?.replace('workspace-team-row-','')??'';
  if(!rootTeamRunId) throw new Error('ACTIVE_RECOVER_ROOT_TEAM_RUN_ID_MISSING');
  const configuredNestedDisclosure=page.locator(`[data-test="workspace-team-member-disclosure"][data-team-run-id="${rootTeamRunId}"][data-member-address="/StudentStudyGroup"]`);
  await configuredNestedDisclosure.click();
  const taskTeamRow=page.locator('[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]');
  await taskTeamRow.waitFor();
  const taskTeamAttributes=await taskTeamRow.evaluate(el=>Object.fromEntries([...el.attributes].map(a=>[a.name,a.value])));
  await taskTeamRow.locator('[data-test="workspace-team-transient-disclosure"]').click();
  const targetChild=page.locator('[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team_child"][data-member-address="/StudentStudyGroup/student_one"]').last();
  await targetChild.waitFor();
  const childAttributes=await targetChild.evaluate(el=>Object.fromEntries([...el.attributes].map(a=>[a.name,a.value])));
  await targetChild.click();
  const center=page.locator('[data-test="workspace-center-pane"]');
  await center.getByText('submit_task_result',{exact:true}).waitFor();
  await center.getByText(token,{exact:false}).first().waitFor();
  const beforeRestartText=await center.innerText();
  await page.screenshot({path:screenshotPath,fullPage:true});
  const result={
    rootTeamRunId,promptMarker,token,taskTeamAttributes,childAttributes,
    beforeRestartContainsTaskDescription:beforeRestartText.includes('Nested-team cold restart probe task.'),
    beforeRestartContainsReasoning:beforeRestartText.includes('Thinking'),
    beforeRestartContainsTool:beforeRestartText.includes('submit_task_result'),
    beforeRestartContainsToken:beforeRestartText.includes(token),
    toolApprovalIntentionallyLeftPending:true,
    rootIntentionallyLeftActiveForAbruptServerRestart:true,
    screenshotPath,consoleErrors,
  };
  if(!result.beforeRestartContainsTaskDescription||!result.beforeRestartContainsReasoning||!result.beforeRestartContainsTool||!result.beforeRestartContainsToken) throw new Error(`ACTIVE_RECOVER_ASSERTION_FAILED:${JSON.stringify(result)}`);
  await fs.writeFile(path.join(evidenceDir,'live-active-phase-a-result.json'),`${JSON.stringify(result,null,2)}\n`);
  console.log(JSON.stringify(result,null,2));
} finally {await browser.close();}

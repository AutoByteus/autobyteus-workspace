import fs from 'node:fs';
import { chromium } from 'file:///Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:1600,height:1100}});
const page=await context.newPage();
const warnings=[]; const taskQueryCounts=[];
page.on('console',m=>{if(['warning','error'].includes(m.type()))warnings.push({at:new Date().toISOString(),type:m.type(),text:m.text()})});
page.on('response',async r=>{if(r.url()==='http://127.0.0.1:60004/graphql'){try{const text=await r.text();if(text.includes('getTaskDelegationRecords')){const parsed=JSON.parse(text);taskQueryCounts.push(parsed.data?.getTaskDelegationRecords?.length ?? -1)}}catch{}}});
await page.goto('http://127.0.0.1:31004/agent-teams?view=team-list',{waitUntil:'networkidle',timeout:120000});
await page.getByRole('button',{name:'Run',exact:true}).click();
await page.getByRole('button',{name:'Select a model',exact:true}).click();
await page.getByText('gpt-5.6-luna',{exact:true}).last().click();
await page.getByRole('button',{name:'Run Team',exact:true}).click();
await page.waitForURL('**/workspace**',{timeout:120000});
await page.waitForTimeout(1800);
const prompt='Delegate exactly one task to StudentStudyGroup. The nested team must submit exactly TASK_UI_VISIBLE_017C with submit_task_result. Then accept it using review_task_result. Do not delegate any other task.';
const input=page.getByPlaceholder('Type a message...');await input.fill(prompt);await input.press('Enter');
const samples=[];
for(let i=0;i<90;i++){
  await page.waitForTimeout(1000);
  const approvals=page.getByRole('button',{name:'Approve',exact:true});
  const approvalCount=await approvals.count();
  for(let j=0;j<approvalCount;j++) { try { const b=approvals.nth(j); if(await b.isVisible()) await b.click(); } catch{} }
  const body=await page.locator('body').innerText();
  const headers=await page.locator('[data-test="team-delegated-tasks-header"]').allInnerTexts();
  const entries=await page.locator('[data-test="team-delegated-task-summary-row"]').count();
  const taskTeamRows=await page.locator('[data-test="workspace-team-transient-execution-row"]').count();
  samples.push({second:i+1,headers,entries,taskTeamRows,approvalCount,hasDelegate:body.includes('delegate_task'),hasSubmit:body.includes('submit_task_result'),hasReview:body.includes('review_task_result'),teacherIdle:/Teacher\s+(Idle|Ready)/.test(body)});
  if([5,10,20,40,70].includes(i+1)) await page.screenshot({path:`/tmp/task-ui-017c-${i+1}s.png`,fullPage:true});
  if(body.includes('TASK_UI_VISIBLE_017C') && body.includes('review_task_result') && approvalCount===0 && i>15) break;
}
await page.screenshot({path:'/tmp/repro-live-task-ui-approve-api-rev-017.png',fullPage:true});
const result={url:page.url(),samples,taskQueryCounts,warnings,bodyTail:(await page.locator('body').innerText()).slice(-10000)};
fs.writeFileSync('/tmp/repro-live-task-ui-approve-api-rev-017.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({url:result.url,lastSamples:samples.slice(-20),taskQueryCounts,warnings:warnings.slice(0,30),bodyTail:result.bodyTail},null,2));
await browser.close();

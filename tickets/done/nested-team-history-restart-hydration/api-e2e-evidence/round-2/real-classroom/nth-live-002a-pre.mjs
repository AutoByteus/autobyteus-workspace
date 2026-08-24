import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';
const evidenceDir=path.resolve('api-e2e-evidence/round-2/real-classroom');
const baseUrl=`http://127.0.0.1:${(await fs.readFile(path.join(evidenceDir,'frontend-port.txt'),'utf8')).trim()}`;
const runtime=(await fs.readFile(path.join(evidenceDir,'runtime-root.txt'),'utf8')).trim();
const refPath=path.join(runtime,'temp_workspace/api-e2e-round2-references/team-address-reference.txt');
const request='NTH_LIVE_002A_TEAM_PRE_20260823';
const ack='NTH_LIVE_002A_TEAM_ACK_PRE_20260823';
const prompt=[
  request+'.',
  'Use ordinary send_message_to exactly once to recipient_address "/StudentStudyGroup".',
  `The message must contain exact request marker ${request} and ask the receiving coordinator to reply to /Teacher using send_message_to with exact acknowledgment marker ${ack}.`,
  `Attach this exact reference file on your send_message_to call: ${refPath}.`,
  'Do not use delegate_task. Do not address /StudentStudyGroup/student_one directly.'
].join(' ');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1600,height:1100}}); page.setDefaultTimeout(180_000);
const consoleErrors=[]; page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
const center=page.locator('[data-test="workspace-center-pane"]');
async function clickPendingApproval(expectedTool){
 await center.getByText(expectedTool,{exact:true}).last().waitFor();
 const approve=center.getByRole('button',{name:'Approve',exact:true}).last();
 if(await approve.isVisible().catch(()=>false)) await approve.click();
}
try{
 await page.goto(`${baseUrl}/agent-teams/?view=team-list`,{waitUntil:'domcontentloaded'});
 const heading=page.getByRole('heading',{name:'Nested Classroom Test Team',exact:true}); await heading.waitFor();
 const card=heading.locator('xpath=ancestor::div[contains(@class,"group")][1]');
 await card.getByRole('button',{name:'Run',exact:true}).click();
 await page.getByText('Team Definition',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Select a model',exact:true}).click();
 await page.locator('li').filter({hasText:/^deepseek-v4-flash$/}).click();
 await page.getByRole('button',{name:'Run Team',exact:true}).click();
 const composer=page.locator('textarea[placeholder="Type a message..."]'); await composer.waitFor();
 await composer.fill(prompt); await page.getByTitle('Send message').click();
 await clickPendingApproval('send_message_to');
 const rootRunRow=page.locator('[data-test^="workspace-team-row-"]').filter({hasText:request}); await rootRunRow.waitFor();
 const rootTeamRunId=(await rootRunRow.getAttribute('data-test')).replace('workspace-team-row-','');
 const nestedDisclosure=page.locator(`[data-test="workspace-team-member-disclosure"][data-team-run-id="${rootTeamRunId}"][data-member-address="/StudentStudyGroup"]`);
 if(await nestedDisclosure.getAttribute('aria-expanded')!=='true') await nestedDisclosure.click();
 const studentRow=page.locator(`[data-test="workspace-team-member-${rootTeamRunId}-/StudentStudyGroup/student_one"]`); await studentRow.waitFor(); await studentRow.click();
 await center.getByText(ack,{exact:false}).first().waitFor();
 const studentToolVisible=await center.getByText('send_message_to',{exact:true}).last().isVisible().catch(()=>false);
 const studentApprove=center.getByRole('button',{name:'Approve',exact:true}).last();
 const studentApprovalRequired=await studentApprove.isVisible().catch(()=>false);
 if(studentApprovalRequired) await studentApprove.click();
 const teacherRow=page.locator(`[data-test="workspace-team-member-${rootTeamRunId}-/Teacher"]`); await teacherRow.click();
 await center.getByText(ack,{exact:false}).last().waitFor();
 const teacherCenterText=await center.innerText();
 const right=page.locator('[data-test="workspace-right-panel"]'); await right.locator('[data-tab-name="teamMembers"]').click();
 await right.getByText(request,{exact:false}).last().waitFor(); await right.getByText(ack,{exact:false}).last().waitFor();
 const communicationText=await right.innerText();
 const screenshotPath=path.join(evidenceDir,'nth-live-002a-pre-before-stop.png'); await page.screenshot({path:screenshotPath,fullPage:true});
 const terminate=rootRunRow.getByRole('button',{name:'Terminate team',exact:true}); await terminate.click();
 await terminate.waitFor({state:'detached'}).catch(()=>{});
 const result={scenario:'NTH-LIVE-002A',phase:'pre-restart',rootTeamRunId,request,ack,prompt,refPath,studentToolVisible,studentApprovalRequired,teacherCenterContainsAck:teacherCenterText.includes(ack),communicationContainsRequest:communicationText.includes(request),communicationContainsAck:communicationText.includes(ack),communicationContainsReferenceBasename:communicationText.includes(path.basename(refPath)),screenshotPath,consoleErrors};
 if(!result.teacherCenterContainsAck||!result.communicationContainsRequest||!result.communicationContainsAck) throw new Error(`NTH_LIVE_002A_PRE_ASSERTION_FAILED:${JSON.stringify(result)}`);
 await fs.writeFile(path.join(evidenceDir,'nth-live-002a-pre-result.json'),JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result,null,2));
}finally{await browser.close()}

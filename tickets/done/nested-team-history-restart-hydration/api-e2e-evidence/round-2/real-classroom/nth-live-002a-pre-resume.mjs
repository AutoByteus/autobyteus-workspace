import fs from 'node:fs/promises'; import path from 'node:path';
import { chromium } from '../../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';
const e=path.resolve('api-e2e-evidence/round-2/real-classroom'); const base=`http://127.0.0.1:${(await fs.readFile(path.join(e,'frontend-port.txt'),'utf8')).trim()}`;
const runtime=(await fs.readFile(path.join(e,'runtime-root.txt'),'utf8')).trim(); const rootDirs=await fs.readdir(path.join(runtime,'memory/agent_teams')); const rootTeamRunId=rootDirs.find(x=>x.startsWith('nested_classroom_test_team_'));
const request='NTH_LIVE_002A_TEAM_PRE_20260823',ack='NTH_LIVE_002A_TEAM_ACK_PRE_20260823'; const refPath=path.join(runtime,'temp_workspace/api-e2e-round2-references/team-address-reference.txt');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}); const page=await browser.newPage({viewport:{width:1600,height:1100}}); page.setDefaultTimeout(180000); const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const center=page.locator('[data-test="workspace-center-pane"]');
try{
 console.log('open workspace',rootTeamRunId); await page.goto(`${base}/workspace/`,{waitUntil:'domcontentloaded'});
 await page.locator('[data-test="workspace-row"] button').first().click(); await page.locator('[data-test="workspace-team-definition-row-nested-classroom-test"]').click();
 const root=page.locator(`[data-test="workspace-team-row-${rootTeamRunId}"]`); await root.waitFor(); await root.click();
 console.log('await live stream then approve teacher'); await center.getByText('send_message_to',{exact:true}).last().waitFor(); const ta=center.getByRole('button',{name:'Approve',exact:true}).last(); await ta.waitFor(); await page.waitForTimeout(7000); await ta.click(); await ta.waitFor({state:'detached',timeout:30000});
 const disclosure=page.locator(`[data-test="workspace-team-member-disclosure"][data-team-run-id="${rootTeamRunId}"][data-member-address="/StudentStudyGroup"]`); if(await disclosure.getAttribute('aria-expanded')!=='true')await disclosure.click();
 const student=page.locator(`[data-test="workspace-team-member-${rootTeamRunId}-/StudentStudyGroup/student_one"]`); await student.waitFor(); await student.click();
 console.log('wait student tool'); await center.getByText(ack,{exact:false}).first().waitFor(); await center.getByText('send_message_to',{exact:true}).last().waitFor(); const sa=center.getByRole('button',{name:'Approve',exact:true}).last(); await sa.waitFor(); await sa.click();
 console.log('wait teacher receipt'); const teacher=page.locator(`[data-test="workspace-team-member-${rootTeamRunId}-/Teacher"]`); await teacher.click(); await center.getByText(ack,{exact:false}).last().waitFor(); const teacherText=await center.innerText();
 const right=page.locator('[data-test="workspace-right-panel"]'); await right.locator('[data-tab-name="teamMembers"]').click(); await right.getByText(request,{exact:false}).last().waitFor(); await right.getByText(ack,{exact:false}).last().waitFor(); const comm=await right.innerText();
 const shot=path.join(e,'nth-live-002a-pre-before-stop.png'); await page.screenshot({path:shot,fullPage:true});
 console.log('terminate'); const terminate=root.getByRole('button',{name:'Terminate team',exact:true}); await terminate.waitFor(); await terminate.click(); await terminate.waitFor({state:'detached'});
 const result={scenario:'NTH-LIVE-002A',phase:'pre-restart',rootTeamRunId,request,ack,refPath,teacherCenterContainsAck:teacherText.includes(ack),communicationContainsRequest:comm.includes(request),communicationContainsAck:comm.includes(ack),communicationContainsReferenceBasename:comm.includes(path.basename(refPath)),screenshotPath:shot,consoleErrors:errors}; if(!result.teacherCenterContainsAck||!result.communicationContainsRequest||!result.communicationContainsAck)throw new Error(JSON.stringify(result)); await fs.writeFile(path.join(e,'nth-live-002a-pre-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser.close()}

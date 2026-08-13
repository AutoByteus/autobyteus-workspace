import fs from 'node:fs';
import { chromium } from '../../../../../../node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';
const [runtime='autobyteus',model='gpt-5.6-luna',slug='autobyteus']=process.argv.slice(2);
const base='http://127.0.0.1:31240';
const endpoint='http://127.0.0.1:60240/graphql';
const outDir=new URL('./browser/',import.meta.url).pathname;
const expectedReply=`CLASSROOM_STUDENT_REPLY_${slug.toUpperCase()}`;
const expectedComplete=`CLASSROOM_SIMULATION_COMPLETE_${slug.toUpperCase()}`;
const startedAt=new Date().toISOString();
fs.mkdirSync(outDir,{recursive:true});
async function gql(query,variables={}){const r=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});const j=await r.json();if(!r.ok||j.errors?.length||!j.data)throw new Error(`GRAPHQL_FAILED:${r.status}:${JSON.stringify(j.errors??j)}`);return j.data;}
const historyQuery=`query{listWorkspaceRunHistory(limitPerAgent:200){workspaceRootPath teamDefinitions{teamDefinitionId teamDefinitionName runs{teamRunId teamDefinitionId createdAt isActive rootTeam members{memberAddress agentRunId runtimeKind status}}}}}`;
const messageQuery=`query($id:String!){getTeamCommunicationMessages(teamRunId:$id){messageId content referenceFiles{path type} senderAddress{rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId} receiverAddress{rootTeamRunId taskTeamRunIds memberAddress taskAgentRunId}}}`;
const nested=(d)=>d.listWorkspaceRunHistory.flatMap(w=>w.teamDefinitions).filter(t=>t.teamDefinitionId==='classroom-simulation-team').flatMap(t=>t.runs);
const before=nested(await gql(historyQuery)); const beforeIds=new Set(before.map(r=>r.teamRunId));
const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1800,height:1200}});
const consoleEvents=[]; page.on('console',m=>{if(['error','warning'].includes(m.type()))consoleEvents.push({type:m.type(),text:m.text()});});
let root=null,termination=null,result=null;
try{
 await page.goto(`${base}/agent-teams?view=team-list`,{waitUntil:'networkidle',timeout:120000});
 const heading=page.getByRole('heading',{name:'Classroom Simulation Team',exact:true}); await heading.waitFor({state:'visible',timeout:120000});
 const card=heading.locator('xpath=ancestor::div[.//button[normalize-space()="Run"]][1]'); await card.getByRole('button',{name:'Run',exact:true}).click();
 await page.waitForURL('**/workspace**',{timeout:120000});
 await page.locator('#team-run-runtime-kind').selectOption(runtime); await page.waitForTimeout(700);
 await page.getByRole('button',{name:'Select a model',exact:true}).click(); await page.getByPlaceholder('Search models...').fill(model);
 const esc=model.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); await page.locator('li').filter({hasText:new RegExp(esc,'i')}).first().click();
 if(runtime==='codex_app_server')await page.locator('#team-run-reasoning_effort').selectOption('medium');
 const effective={runtimeKind:await page.locator('#team-run-runtime-kind').inputValue(),reasoningEffort:await page.locator('#team-run-reasoning_effort').count()?await page.locator('#team-run-reasoning_effort').inputValue():null};
 const auto=page.locator('#team-auto-execute'); if((await auto.getAttribute('class'))?.includes('bg-gray'))await auto.click();
 await page.screenshot({path:`${outDir}/classroom-${slug}-launch.png`,fullPage:true});
 await page.getByRole('button',{name:'Run Team',exact:true}).click(); const input=page.getByPlaceholder('Type a message...'); await input.waitFor({state:'visible',timeout:180000});
 const prompt=[`Run pwd using run_bash and create classroom-runs/api-rev-040-${slug}/homework.md under that exact workspace.`,`The homework must ask the student to answer 6 * 7 and reply to /professor using send_message_to with the exact token ${expectedReply}, attaching the student's answer file as a reference.`,`Send the homework to ./student using send_message_to with the homework file as a reference. Wait for the student's reply.`,`After the reply is received, respond to me with exactly ${expectedComplete}.`].join(' ');
 await input.fill(prompt); await input.press('Enter');
 for(let i=0;i<120;i++){const fresh=nested(await gql(historyQuery)).find(r=>!beforeIds.has(r.teamRunId));if(fresh){root=fresh;break;}await page.waitForTimeout(500);} if(!root)throw new Error('FRESH_CLASSROOM_RUN_NOT_FOUND');
 let messages=[]; let replySeen=false; let completionSeen=false;
 for(let i=0;i<600;i++){await page.waitForTimeout(400); for(const label of ['Approve','Allow','Accept']){const bs=page.getByRole('button',{name:label,exact:true});for(let j=0;j<await bs.count();j++){try{if(await bs.nth(j).isVisible())await bs.nth(j).click();}catch{}}} messages=(await gql(messageQuery,{id:root.teamRunId})).getTeamCommunicationMessages; replySeen=messages.some(m=>m.content.includes(expectedReply)&&m.senderAddress.memberAddress==='/student'&&m.receiverAddress.memberAddress==='/professor'); completionSeen=await page.getByText(expectedComplete,{exact:true}).count()>0;if(replySeen&&completionSeen)break;}
 const request=messages.filter(m=>m.senderAddress.memberAddress==='/professor'&&m.receiverAddress.memberAddress==='/student');
 const replies=messages.filter(m=>m.content.includes(expectedReply)&&m.senderAddress.memberAddress==='/student'&&m.receiverAddress.memberAddress==='/professor');
 const rooted=new Set(root.members.map(m=>m.memberAddress));
 const conditions={freshRun:!beforeIds.has(root.teamRunId),rootedTopology:['/professor','/student'].every(x=>rooted.has(x)),effectiveRuntime:effective.runtimeKind===runtime,effectiveReasoning:runtime!=='codex_app_server'||effective.reasoningEffort==='medium',exactOneProfessorRequest:request.length===1,requestHasReference:request[0]?.referenceFiles?.length>0,exactOneStudentReply:replies.length===1,replyHasReference:replies[0]?.referenceFiles?.length>0,exactPersistentAddresses:messages.every(m=>m.senderAddress.rootTeamRunId===root.teamRunId&&m.receiverAddress.rootTeamRunId===root.teamRunId&&m.senderAddress.taskTeamRunIds.length===0&&m.receiverAddress.taskTeamRunIds.length===0),completionVisible:completionSeen,noConsoleErrors:consoleEvents.filter(x=>x.type==='error').length===0};
 await page.screenshot({path:`${outDir}/classroom-${slug}-final.png`,fullPage:true});
 result={schemaVersion:1,slug,runtime,model,startedAt,completedAt:new Date().toISOString(),passed:Object.values(conditions).every(Boolean),rootTeamRunId:root.teamRunId,conditions,effective,messages,consoleEvents};
}catch(error){result={schemaVersion:1,slug,runtime,model,startedAt,completedAt:new Date().toISOString(),passed:false,rootTeamRunId:root?.teamRunId??null,fatalError:error instanceof Error?`${error.name}: ${error.message}\n${error.stack??''}`:String(error),consoleEvents};try{await page.screenshot({path:`${outDir}/classroom-${slug}-failure.png`,fullPage:true});}catch{}}
finally{if(root?.teamRunId){try{termination=(await gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`,{id:root.teamRunId})).terminateAgentTeamRun;}catch(error){termination={success:false,message:String(error)}}}result={...result,termination};fs.writeFileSync(`${outDir}/classroom-${slug}.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({slug,runtime,passed:result.passed,rootTeamRunId:result.rootTeamRunId,conditions:result.conditions,fatalError:result.fatalError??null,termination},null,2));await browser.close();}
if(!result.passed||!termination?.success)process.exitCode=2;

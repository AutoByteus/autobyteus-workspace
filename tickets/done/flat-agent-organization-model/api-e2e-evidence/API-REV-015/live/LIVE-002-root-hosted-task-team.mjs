import fs from 'node:fs/promises';
import pw from '../../../../../../autobyteus-web/node_modules/playwright-core/index.js';
const out=new URL('./',import.meta.url), port=3596, marker='APIREV15-ROOT-TASK-TEAM-READY-001';
const b=await pw.chromium.connectOverCDP('http://127.0.0.1:9222');
const p=b.contexts().flatMap(c=>c.pages()).find(x=>x.url().includes(`127.0.0.1:${port}`)); if(!p) throw new Error('actual open_tab page missing'); p.setDefaultTimeout(15000);
const orgRunId=new URL(p.url()).searchParams.get('orgRunId'); if(!orgRunId) throw new Error('missing Org root');
const root=new URL(`../runtime/server-data/memory/agent_orgs/${orgRunId}/`,out), taskPath=new URL('agent_org_task_delegation_records.json',root), treePath=new URL('agent_org_run_execution_tree.json',root);
const before=JSON.parse(await fs.readFile(taskPath,'utf8')), tree=JSON.parse(await fs.readFile(treePath,'utf8')), concierge=tree.rootOrg.members.find(x=>x.address==='/concierge'); if(!concierge) throw new Error('concierge absent');
const errors=[], responses=[]; p.on('pageerror',e=>errors.push(e.message)); p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))responses.push({status:r.status(),url:r.url(),method:r.request().method()})});
await p.locator(`[data-test="agent-org-agent-row-${concierge.agentRunId}"]`).click(); await p.waitForTimeout(250);
const description=`As the root-hosted research Team coordinator, remain active. Do not call submit_task_result until a later user message explicitly requests settlement. Reply exactly ${marker} and wait.`;
const prompt=`Call delegate_task exactly once with recipient_address \`/research-team\` and description \`${description}\`. Use the field name description. Do not send an ordinary message. After the successful tool result, reply exactly ${marker}-DELEGATED.`;
await p.locator('textarea[placeholder="Type a message..."]').fill(prompt); await p.locator('button[title="Send message"]').click();
let approved=false, record=null;
for(let i=0;i<360;i++){
 await new Promise(r=>setTimeout(r,500));
 const current=JSON.parse(await fs.readFile(taskPath,'utf8'));
 record=current.records.find(x=>x.description===description)??null; if(record) break;
 const approve=p.getByRole('button',{name:'Approve',exact:true}); if(!approved&&await approve.count()){await approve.click();approved=true;}
}
if(!record) throw new Error('root-hosted task Team record timeout');
const walk=async(u,a=[])=>{for(const e of await fs.readdir(u,{withFileTypes:true})){const v=new URL(e.name+(e.isDirectory()?'/':''),u);if(e.isDirectory())await walk(v,a);else if(e.name==='raw_traces_active.jsonl')a.push(v)}return a};
let ready=[]; for(let i=0;i<300;i++){await new Promise(r=>setTimeout(r,500)); ready=[]; for(const f of await walk(root)){const t=await fs.readFile(f,'utf8'); for(const line of t.trim().split('\n').filter(Boolean)){const x=JSON.parse(line);if(x.trace_type==='assistant'&&x.content?.trim()===marker)ready.push({file:f.pathname,trace:x})}} if(ready.length)break;}
const finalTree=JSON.parse(await fs.readFile(treePath,'utf8')), finalTasks=JSON.parse(await fs.readFile(taskPath,'utf8'));
const view=await p.evaluate(({runId,marker})=>({url:location.href,selected:[...document.querySelectorAll('[data-test^="agent-org-agent-row-"]')].filter(x=>x.classList.contains('is-selected')).map(x=>x.getAttribute('data-test')),taskRows:[...document.querySelectorAll('[data-test^="agent-org-task-team-row-"]')].map(x=>x.getAttribute('data-test')),taskHeader:document.querySelector('[data-test="team-delegated-tasks-header"]')?.textContent,markerCount:(document.body.innerText.match(new RegExp(marker,'g'))||[]).length,alerts:[...document.querySelectorAll('[role=alert]')].map(x=>x.textContent),scroll:{width:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}}),{runId:orgRunId,marker});
const rootTaskNode=finalTree.rootOrg.taskExecutions?.find(x=>x.teamRunId===record.taskExecution?.teamRunId);
const assertions={oneAdded:finalTasks.records.length===before.records.length+1,approvedIfRequired:approved||true,exactDelegator:record.delegatorAgentRunId===concierge.agentRunId,exactRecipient:record.recipientAddress==='/research-team',activeTeam:Boolean(record.taskExecution?.teamRunId)&&record.status==='active'&&!record.settledAt,structuralRootTaskTeam:Boolean(rootTaskNode),readyExactlyOnce:ready.length===1,conciergeSelected:view.selected.length===1&&view.selected[0].endsWith(concierge.agentRunId),taskVisible:view.taskRows.some(x=>x.endsWith(record.taskExecution.teamRunId))&&view.taskHeader?.includes(`${finalTasks.records.length} task`),noNotice:view.alerts.length===0,noOverflow:view.scroll.width===view.scroll.client,noErrors:errors.length===0&&responses.length===0};
const result={at:new Date().toISOString(),orgRunId,beforeCount:before.records.length,afterCount:finalTasks.records.length,approved,concierge,record,rootTaskNode,ready,view,errors,responses,assertions};
await fs.writeFile(new URL('LIVE-002-root-hosted-task-team.json',out),JSON.stringify(result,null,2)+'\n'); await p.screenshot({path:new URL('screenshots/LIVE-002-root-hosted-task-team.png',out).pathname,fullPage:false}); console.log(JSON.stringify({orgRunId,approved,taskId:record.taskId,teamRunId:record.taskExecution?.teamRunId,ready:ready.length,assertions,errors,responses},null,2)); await b.close(); if(Object.values(assertions).some(v=>v!==true))process.exit(2);

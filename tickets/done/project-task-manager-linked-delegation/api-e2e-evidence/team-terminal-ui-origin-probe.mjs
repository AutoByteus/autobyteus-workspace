import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const e='tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence';
const i=JSON.parse(await fs.readFile(e+'/api-004-restart-after-import.json')).result;
const start=JSON.parse(await fs.readFile(e+'/api-004-start.json'));
const done=JSON.parse(await fs.readFile(e+'/api-004-done-b.json'));
const {chromium}=createRequire(new URL('./autobyteus-web/package.json',`file://${process.cwd()}/`))('playwright-core');
const browser=await chromium.connectOverCDP(i.controlEndpoint);const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('index.html'));assert(page);
const out={instanceId:i.instanceId,started:new Date().toISOString(),frames:[],mode:'Diagnostic origin only: no business mutation'};
page.on('websocket',ws=>ws.on('framereceived',r=>{try{out.frames.push({url:ws.url(),message:JSON.parse(String(r.payload))});}catch{}}));
const rows=async()=>await page.locator('[data-test="workspace-agent-run-task-tree"] [data-agent-run-id]').evaluateAll(els=>els.map(el=>({id:el.getAttribute('data-agent-run-id'),label:el.getAttribute('aria-label')})));
try {
 out.before=await rows();out.beforeText=await page.locator('body').innerText();await page.screenshot({path:e+'/api-004-team-terminal-stale-live.png'});
 const response=await fetch(i.graphqlUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'query($r:String!){agentRunCollaboration(runId:$r)}',variables:{r:start.hostRunId}})});const json=await response.json();assert(!json.errors);out.view=json.data.agentRunCollaboration;
 const members=start.internalTree.taskExecutions.find(t=>t.teamRunId===start.lifetimes.B.executions[0].execution.teamRunId).members;
 assert.equal(members.length,2);for(const member of members){assert.match(out.before.find(r=>r.id===member.agentRunId)?.label??'',/idle/);assert.equal(out.view.root_agent.agent_statuses.find(s=>s.agent_run_id===member.agentRunId).status,'offline');}
 out.liveDisparityConfirmed=true;
 await page.reload();await page.locator('[data-testid="agent-workspace-surface"]').waitFor({timeout:60000});
 const end=Date.now()+30000;while(Date.now()<end){out.after=await rows();if(members.every(m=>/offline/.test(out.after.find(r=>r.id===m.agentRunId)?.label??'')))break;await new Promise(r=>setTimeout(r,500));}
 for(const member of members)assert.match(out.after.find(r=>r.id===member.agentRunId)?.label??'',/offline/);
 await page.screenshot({path:e+'/api-004-team-terminal-reload-offline.png'});
 out.liveEventMessages=done.ws.filter(r=>r.url.includes('/ws/agent-collaboration/')&&r.message.type==='ROOT_EXECUTION_EVENT');
 out.result='Origin isolation Pass: released Team configured members remained idle live, exact current snapshot offline, normal reload restores retained offline rows. Current acceptance remains Fail, not repaired by reload.';
 console.log(out.result);
} catch(error) {out.error=String(error);process.exitCode=1;console.log(out.error);}
finally{await fs.writeFile(e+'/api-004-team-terminal-origin.json',JSON.stringify(out,null,2)+'\n');await browser.close();}

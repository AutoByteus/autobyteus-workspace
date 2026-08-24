import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/autobyteus-web/node_modules/playwright-core/index.mjs';
const UI='http://127.0.0.1:3107', API='http://localhost:8006/graphql', ROOT='/home/autobyteus/workspace/autobyteus-workspace';
const E='/Users/normy/autobyteus_org/autobyteus-worktrees/remote-node-new-workspace-team-run-visibility/tickets/done/remote-node-new-workspace-team-run-visibility/probes/api-e2e';
const lines=[], network=[], errors=[]; let teamRunId=null, workspaceId=null, browser=null;
const say=(name,data='')=>{const line=`${new Date().toISOString()} ${name}${data?` ${JSON.stringify(data)}`:''}`;lines.push(line);console.log(line)};
const gql=async(operationName,query,variables={})=>{const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operationName,query,variables})});return {status:r.status,body:await r.json()}};
const WORKSPACES=`query GetAllWorkspaces { workspaces { workspaceId workspaceRootPath isTemp } }`;
const HISTORY=`query ListWorkspaceRunHistory($limitPerAgent: Int = 100) { listWorkspaceRunHistory(limitPerAgent: $limitPerAgent) { workspaceRootPath workspaceName teamDefinitions { teamDefinitionId teamDefinitionName runs { teamRunId workspaceRootPath isActive members { memberAddress runtimeKind workspaceRootPath } } } } }`;
const TERMINATE=`mutation TerminateAgentTeamRun($teamRunId:String!){terminateAgentTeamRun(teamRunId:$teamRunId){success message}}`;
const DELETE=`mutation DeleteStoredTeamRun($teamRunId:String!){deleteStoredTeamRun(teamRunId:$teamRunId){success message}}`;
const REMOVE=`mutation RemoveWorkspace($input:RemoveWorkspaceInput!){removeWorkspace(input:$input){success message workspaceId workspaceRootPath}}`;
const runs=h=>(h.body.data?.listWorkspaceRunHistory??[]).flatMap(g=>(g.teamDefinitions??[]).flatMap(t=>(t.runs??[]).map(r=>({...r,groupRoot:g.workspaceRootPath}))));
const write=async(name,data)=>fs.writeFile(`${E}/${name}`,`${JSON.stringify(data,null,2)}\n`);
try {
  const baselineWs=await gql('GetAllWorkspaces',WORKSPACES), baselineHistory=await gql('ListWorkspaceRunHistory',HISTORY,{limitPerAgent:100});
  assert.equal(baselineWs.body.data.workspaces.some(w=>w.workspaceRootPath===ROOT),false);
  assert.equal(runs(baselineHistory).some(r=>r.workspaceRootPath===ROOT),false);
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const context=await browser.newContext({viewport:{width:1600,height:1050}}), page=await context.newPage(); page.setDefaultTimeout(45_000);
  page.on('console',m=>{if(m.type()==='error')errors.push({source:'console',text:m.text()})}); page.on('pageerror',e=>errors.push({source:'pageerror',text:e.message}));
  page.on('response',async response=>{const req=response.request();if(!req.url().includes('/graphql')||req.method()!=='POST')return;let requestBody={};try{requestBody=req.postDataJSON()}catch{};let responseBody={};try{responseBody=await response.json()}catch{};network.push({operationName:requestBody.operationName,variables:requestBody.variables,response:responseBody,status:response.status()})});
  await page.goto(`${UI}/agent-teams`,{waitUntil:'networkidle',timeout:60_000});
  await page.locator('div.group').filter({hasText:'Software Engineering Team'}).getByRole('button',{name:'Run',exact:true}).click();
  await page.waitForURL('**/workspace'); await page.waitForTimeout(2500);
  await page.locator('#team-run-runtime-kind').selectOption('codex_app_server'); await page.waitForTimeout(700);
  await page.getByRole('button',{name:'Select a model',exact:true}).click(); await page.getByPlaceholder('Search models...').fill('GPT-5.6-Sol'); await page.locator('li').filter({hasText:'GPT-5.6-Sol'}).first().click();
  await page.locator('#team-run-reasoning_effort').selectOption('high'); await page.locator('#team-run-service_tier').selectOption('fast'); await page.locator('#team-auto-execute').click();
  const newTab=page.getByRole('tab',{name:'New',exact:true}); await newTab.click(); const input=page.locator('input[placeholder="/absolute/path/to/workspace"]'); await input.fill(ROOT);
  assert.equal(await newTab.getAttribute('aria-selected'),'true'); assert.equal(await input.inputValue(),ROOT); assert.equal(await page.getByRole('button',{name:'Run Team',exact:true}).isDisabled(),false);
  await page.screenshot({path:`${E}/36-control-order-prelaunch.png`,fullPage:true}); say('control-order-configured',{path:ROOT,runtime:'codex_app_server',model:'gpt-5.6-sol'});
  const start=network.length; await page.getByRole('button',{name:'Run Team',exact:true}).click(); const deadline=Date.now()+180_000;
  while(Date.now()<deadline){const n=network.slice(start);if(n.some(x=>x.operationName==='CreateWorkspace')&&n.some(x=>x.operationName==='CreateAgentTeamRun'))break;await page.waitForTimeout(500)}
  const ops=network.slice(start), wsOps=ops.filter(x=>x.operationName==='CreateWorkspace'), teamOps=ops.filter(x=>x.operationName==='CreateAgentTeamRun');
  assert.equal(wsOps.length,1);assert.equal(teamOps.length,1);assert.equal(wsOps[0].variables.input.rootPath,ROOT);workspaceId=wsOps[0].response.data.createWorkspace.workspaceId;teamRunId=teamOps[0].response.data.createAgentTeamRun.teamRunId;assert.ok(teamRunId);assert.equal(teamOps[0].response.data.createAgentTeamRun.success,true);
  const configs=teamOps[0].variables.input.memberConfigs;assert.equal(configs.length,6);assert.ok(configs.every(c=>c.workspaceId===workspaceId&&c.workspaceRootPath===ROOT));
  await page.waitForTimeout(4000);const history=await gql('ListWorkspaceRunHistory',HISTORY,{limitPerAgent:100});const row=runs(history).find(r=>r.teamRunId===teamRunId);assert.ok(row);assert.equal(row.workspaceRootPath,ROOT);assert.equal(row.groupRoot,ROOT);await write('37-control-order-history.json',history);
  await page.reload({waitUntil:'domcontentloaded',timeout:60_000});await page.waitForTimeout(8000);const workspaceRow=page.locator(`[data-test="workspace-row"][data-workspace-root="${ROOT}"]`);await workspaceRow.waitFor({state:'visible'});await workspaceRow.locator('button').first().click();const def=page.locator('[data-test^="workspace-team-definition-row-"]').filter({hasText:'Software Engineering Team'});await def.waitFor({state:'visible'});await def.click();await page.locator(`[data-test="workspace-team-row-${teamRunId}"]`).waitFor({state:'visible'});await page.screenshot({path:`${E}/38-control-order-postreload.png`,fullPage:true});
  assert.deepEqual(errors,[]);say('control-order-live-pass',{workspaceId,teamRunId,createWorkspaceCount:1,createTeamCount:1,reloadRowVisible:true,errors:0});
} catch(error){say('CONTROL-PROBE-FAIL',{name:error?.name,message:error?.message,stack:error?.stack});throw error}
finally{
 const cleanup=[];if(teamRunId){cleanup.push({action:'terminate',result:await gql('TerminateAgentTeamRun',TERMINATE,{teamRunId})});for(let i=0;i<30;i++){const h=await gql('ListWorkspaceRunHistory',HISTORY,{limitPerAgent:100});const r=runs(h).find(x=>x.teamRunId===teamRunId);if(!r||!r.isActive)break;await new Promise(x=>setTimeout(x,1000))}cleanup.push({action:'delete',result:await gql('DeleteStoredTeamRun',DELETE,{teamRunId})})}if(workspaceId)cleanup.push({action:'remove-workspace',result:await gql('RemoveWorkspace',REMOVE,{input:{workspaceId}})});const postWs=await gql('GetAllWorkspaces',WORKSPACES),postH=await gql('ListWorkspaceRunHistory',HISTORY,{limitPerAgent:100});cleanup.push({action:'verify',targetWorkspacePresent:postWs.body.data.workspaces.some(w=>w.workspaceRootPath===ROOT),targetTeamPresent:teamRunId?runs(postH).some(r=>r.teamRunId===teamRunId):false});await write('39-control-order-network.json',network);await write('40-control-order-errors.json',errors);await write('41-control-order-cleanup.json',cleanup);await fs.writeFile(`${E}/42-control-order.log`,`${lines.join('\n')}\n`);if(browser)await browser.close();say('control-order-cleanup-complete',cleanup.at(-1))}

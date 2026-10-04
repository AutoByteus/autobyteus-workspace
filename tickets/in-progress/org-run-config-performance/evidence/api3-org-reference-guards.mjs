// Temporary exact-imported product guard probe; route fault only, no source/state edits/inference.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const root=process.cwd(),out=path.join(root,'tickets/in-progress/org-run-config-performance/evidence');
const info=JSON.parse(await fs.readFile(path.join(out,'api3-packaged-start.json'),'utf8')).result;
const {chromium,selectors}=createRequire(path.join(root,'autobyteus-web/package.json'))('playwright-core');selectors.setTestIdAttribute('data-test');
const browser=await chromium.connectOverCDP(info.controlEndpoint),page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('/renderer/index.html'));assert(page);page.setDefaultTimeout(20000);
const ev={startedAt:new Date().toISOString(),instanceId:info.instanceId,cases:[],requests:[],pageErrors:[],sentFrames:[]};
const save=()=>fs.writeFile(path.join(out,'api3-org-reference-guards.json'),JSON.stringify(ev,null,2)+'\n');
const small=JSON.parse(await fs.readFile(path.join(out,'api3-packaged-small-history.json'),'utf8'));
const tree=JSON.parse(await fs.readFile(path.join(info.dataRoot,'server-data/memory/agent_orgs',small.samples[0].sample.rowId,'agent_org_run_execution_tree.json'),'utf8'));
const target=tree.rootOrg.members.flatMap(t=>t.members).find(a=>a.address==='/software_engineering_team/api_e2e_engineer').agentDefinitionId;assert(target.startsWith('team-local-agent:'));
page.on('pageerror',e=>ev.pageErrors.push(e.message));page.on('request',r=>{if(r.url()===info.graphqlUrl)ev.requests.push(r.postDataJSON());});page.on('websocket',w=>w.on('framesent',f=>ev.sentFrames.push(String(f.payload))));
const open=async()=>{await page.getByRole('button',{name:'Agent Orgs',exact:true}).click();await page.getByTestId('org-card-autobyteus-org').getByRole('button',{name:'Run',exact:true}).click();await page.getByTestId('run-agent-org').waitFor();};
let handler,release;
try{
 for(const kind of ['error','null','wrong-ownership']){
  await page.reload();await page.getByRole('button',{name:'Agent Orgs',exact:true}).waitFor();
  let injected=false;const held=new Promise(r=>{release=r;});const began=ev.requests.length;
  handler=async route=>{
   const request=route.request().postDataJSON();
   if(!injected&&request?.operationName==='GetAgentOrgReferencedAgent'&&request.variables.id===target){
    injected=true;await held;
    if(kind==='wrong-ownership'){
     const response=await route.fetch(),body=await response.json();assert(body.data.agentDefinition.id===target);body.data.agentDefinition.ownershipScope='SHARED';body.data.agentDefinition.ownerTeamId=null;
     await route.fulfill({response,json:body});
    }else await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(kind==='null'?{data:{agentDefinition:null}}:{data:{agentDefinition:null},errors:[{message:'Controlled owned reference unavailable'}]})});
   }else await route.continue();
  };
  await page.route(info.graphqlUrl,handler);await open();await page.waitForFunction(()=>document.querySelector('[data-test="org-config-reference-diagnostic"]'));
  for(let n=0;n<200&&!injected;n++)await page.waitForTimeout(50);assert(injected,'Required target physical read not observed');assert(await page.getByTestId('run-agent-org').isDisabled());
  release();await page.getByTestId('org-config-reference-diagnostic').filter({hasText:target}).waitFor();assert(await page.getByTestId('run-agent-org').isDisabled());
  const blocked=await page.getByTestId('org-config-reference-diagnostic').innerText();await page.screenshot({path:path.join(out,'api3-org-reference-'+kind+'.png')});
  await page.unroute(info.graphqlUrl,handler);handler=null;const recoveryStart=ev.requests.length;await page.reload();await page.getByRole('button',{name:'Agent Orgs',exact:true}).waitFor();await open();
  await page.waitForFunction(()=>{const o=document.querySelector('#org-run-runtime-kind option[value="codex_app_server"]');return o&&!o.disabled;});await page.locator('#org-run-runtime-kind').selectOption('codex_app_server');
  await page.getByTestId('agent-org-run-config').getByRole('button',{name:'Select a model',exact:true}).first().click();await page.getByRole('option',{name:'GPT-6.1-Sol (default reasoning: low)',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('[data-test="run-agent-org"]').disabled);
  const freshReads=ev.requests.slice(recoveryStart).filter(r=>r.operationName==='GetAgentOrgReferencedAgent'&&r.variables.id===target);assert(freshReads.length>=1,'Recovery reused stale failed snapshot instead of physical read');
  assert.equal(await page.getByTestId('org-config-reference-diagnostic').count(),0);
  const row={kind,result:'Pass',target,blocked,freshReadCount:freshReads.length,initialReads:ev.requests.slice(began,recoveryStart).filter(r=>r.operationName==='GetAgentOrgReferencedAgent').length,recoveryExact:'codex_app_server/gpt-6.1-sol'};ev.cases.push(row);await save();await fs.appendFile(path.join(out,'../api-e2e-test-case-ledger.md'),'\n- API-007 required-reference '+kind+': Pass; api3-org-reference-guards.json.\n');
 }
 assert.deepEqual(ev.pageErrors,[]);assert(!ev.requests.some(r=>/CreateAgentOrgRun|UpdateAgentOrgDefinition/.test(r.operationName??'')));assert(!ev.sentFrames.some(f=>f.includes('SEND_MESSAGE')));
 const manifest=JSON.parse(await fs.readFile(path.join(out,'launch-row-fixture-manifest.json'),'utf8'));
 for(const f of manifest.files)for(const base of [manifest.source,path.join(info.dataRoot,'fixture-agent-package')])assert.equal(createHash('sha256').update(await fs.readFile(path.join(base,f.path))).digest('hex'),f.sha256);
 ev.fixtureFilesChecked=manifest.files.length;ev.result='Pass';
}catch(e){ev.result='Fail';ev.failure=e.stack;ev.dom=await page.locator('body').innerText().catch(()=>null);console.error(e.stack);process.exitCode=1;}
finally{release?.();if(handler)await page.unroute(info.graphqlUrl,handler);ev.completedAt=new Date().toISOString();await save();}
process.exit(process.exitCode??0);

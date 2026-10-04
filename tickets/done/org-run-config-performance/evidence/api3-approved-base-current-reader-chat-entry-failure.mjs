// Temporary operational persisted-data probe: current package, actual approved-base bytes, no inference.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
const W=process.cwd(),E=path.join(W,'tickets/in-progress/org-run-config-performance/evidence');
const info=JSON.parse(await fs.readFile(path.join(E,'api3-transition-start.json'),'utf8')).result;
const before=JSON.parse(await fs.readFile(path.join(E,'api3-baseline-before-transition.json'),'utf8'));
assert.equal(info.dataRoot,before.info.dataRoot);assert(info.executablePath.startsWith(W+'/'));
const memory=path.join(info.dataRoot,'server-data/memory/agent_orgs'),id=before.representativeIds[0];
const tree=JSON.parse(await fs.readFile(path.join(E,'api3-approved-base-packages',id,'agent_org_run_execution_tree.json'),'utf8')).rootOrg;
const ev={startedAt:new Date().toISOString(),info,oldRootId:id,requests:[],frames:[],pageErrors:[],sentFrames:[],checks:{},result:'Not Tested'};
const hash=b=>createHash('sha256').update(b).digest('hex');const save=()=>fs.writeFile(path.join(E,'api3-approved-base-current-reader.json'),JSON.stringify(ev,null,2)+'\n');
const gql=async(query,variables={})=>{const r=await fetch(info.graphqlUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});const b=await r.json();ev.requests.push({query,variables,status:r.status,body:b});assert.equal(r.status,200);assert(!b.errors,JSON.stringify(b));return b.data;};
const checkBytes=async()=>{for(const f of before.allStoredPackageFiles)assert.equal(hash(await fs.readFile(path.join(memory,f.rootId,f.name))),f.sha256,'Approved-base bytes changed '+f.rootId+'/'+f.name);return before.allStoredPackageFiles.length;};
const rowQuery='query($id:String!){getAgentOrgRootHistory(orgRunId:$id){root_run_id is_active summary org}}';
const {chromium,selectors}=createRequire(path.join(W,'autobyteus-web/package.json'))('playwright-core');selectors.setTestIdAttribute('data-test');
const browser=await chromium.connectOverCDP(info.controlEndpoint),page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('/renderer/index.html'));page.setDefaultTimeout(20000);page.on('pageerror',e=>ev.pageErrors.push(e.message));page.on('websocket',s=>s.on('framesent',f=>ev.sentFrames.push(String(f.payload))));
const {default:WebSocket}=await import(createRequire(path.join(W,'autobyteus-server-ts/package.json')).resolve('ws'));let socket,active=false;
const until=async fn=>{const end=Date.now()+20000;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Bounded public condition not reached');};
try{
 ev.checks.beforeBytes=await checkBytes();
 const rows=(await gql('{listCollaborationRootHistory{... on AgentOrgRootHistoryObject{root_run_id is_active org}}}')).listCollaborationRootHistory;
 assert.equal(rows.length,before.rootCount);assert(rows.every(r=>!r.is_active));assert.deepEqual(rows.map(r=>r.root_run_id).sort(),[...new Set(before.allStoredPackageFiles.map(f=>f.rootId))].sort());ev.checks.currentFullReaderRoots=rows.length;
 const scoped=(await gql(rowQuery,{id})).getAgentOrgRootHistory;assert.equal(scoped.root_run_id,id);assert.equal(scoped.is_active,false);ev.checks.scopedOldRoot='Pass';
 const restored=(await gql('mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success message agentOrgRunId}}',{id})).restoreAgentOrgRun;assert(restored.success);assert.equal(restored.agentOrgRunId,id);active=true;
 socket=new WebSocket(info.backendUrl.replace('http:','ws:')+'/ws/agent-org/'+id);socket.on('message',d=>ev.frames.push(JSON.parse(String(d))));socket.on('close',code=>ev.closedCode=code);
 await until(()=>ev.frames.some(f=>f.type==='ROOT_EXECUTION_VIEW_SNAPSHOT')&&ev.frames.some(f=>f.type==='ROOT_LIFECYCLE'&&f.payload.is_active));
 const checkpoint=(await gql('query($id:String!){getAgentOrgExecutionCheckpoint(orgRunId:$id){orgRunId changeSequence hasOpenExecutionWork}}',{id})).getAgentOrgExecutionCheckpoint;assert.equal(checkpoint.orgRunId,id);assert.equal(checkpoint.hasOpenExecutionWork,false);ev.checks.checkpoint=checkpoint;
 await page.reload();await page.getByRole('button',{name:'Chat',exact:true}).waitFor();await page.getByRole('button',{name:'Open runs/history',exact:true}).click();
 const bucket=page.getByTestId('workspace-row').filter({hasText:'Temp Workspace'});await bucket.waitFor();if(await bucket.getAttribute('aria-expanded')!=='true')await bucket.getByRole('button').first().click();
 const group=page.getByTestId('agent-org-definition-autobyteus-org');await group.waitFor();if(await group.getAttribute('aria-expanded')!=='true')await group.click();
 await page.getByTestId('agent-org-run-open-'+id).click();await page.getByRole('heading',{name:'Choose an Agent or Team',exact:true}).waitFor();ev.checks.normalRecipientFreeOldHistory='Pass';
 const team=tree.members.find(t=>t.address==='/product_team'),agent=team.members.find(a=>a.address==='/product_team/product_ui_ux_designer');await page.getByTestId('agent-org-team-row-'+team.teamRunId).click();ev.checks.teamFocus={teamRunId:team.teamRunId,coordinatorAddress:team.coordinatorAddress};
 await page.getByTestId('agent-org-agent-row-'+agent.agentRunId).click();await until(async()=>await page.getByTestId('agent-org-agent-row-'+agent.agentRunId).getAttribute('aria-selected')==='true');ev.checks.agentFocus={agentRunId:agent.agentRunId,address:agent.address};
 await page.screenshot({path:path.join(E,'api3-approved-base-current-reader.png')});ev.dom=await page.locator('body').innerText();
 assert((await gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}',{id})).terminateAgentOrgRun.success);active=false;await until(()=>ev.closedCode!==undefined&&ev.frames.some(f=>f.type==='ROOT_LIFECYCLE'&&!f.payload.is_active));assert.equal(ev.closedCode,1000);
 assert.equal((await gql(rowQuery,{id})).getAgentOrgRootHistory.is_active,false);ev.checks.afterBytes=await checkBytes();
 const fixture=JSON.parse(await fs.readFile(path.join(E,'api3-baseline-setup.json'),'utf8')).fixture;for(const f of fixture.files){assert.equal(hash(await fs.readFile(path.join(fixture.source,f.path))),f.sha256);assert.equal(hash(await fs.readFile(path.join(fixture.path,f.path))),f.sha256);}ev.checks.fixtureFiles=fixture.files.length;
 assert.equal(ev.pageErrors.length,0);assert(!ev.sentFrames.some(f=>f.includes('SEND_MESSAGE')));ev.result='Pass';console.log(JSON.stringify({result:ev.result,checks:ev.checks,pageErrors:ev.pageErrors}));
}catch(e){ev.result='Fail';ev.failure=e.stack;ev.dom=await page.locator('body').innerText().catch(()=>null);await page.screenshot({path:path.join(E,'api3-approved-base-current-reader-failure.png')}).catch(()=>{});console.error(e.stack);process.exitCode=1;}
finally{if(active)await gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success}}',{id}).catch(()=>{});socket?.close();ev.completedAt=new Date().toISOString();await save();await fs.appendFile(path.join(E,'../api-e2e-test-case-ledger.md'),`\n- API-009 approved-base513-package current normal-reader/restore/WS/checkpoint/bucket/Team/member focus/no-inference immutable1026files: ${ev.result}; api3-approved-base-current-reader.json.\n`);}
process.exit(process.exitCode??0);

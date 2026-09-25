#!/usr/bin/env node
// Real AGY Team + Org browser continuation across two separate backend OS processes.
// Opt in explicitly: RUN_AGY_E2E=1 node autobyteus-web/tests/e2e/agy-process-restart-focus-continuation-probe.mjs
import fs from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (process.env.RUN_AGY_E2E !== '1') throw new Error('Set RUN_AGY_E2E=1 to execute real AGY provider turns.');
const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '../..');
const rootDir = path.resolve(webDir, '..');
const serverDir = path.join(rootDir, 'autobyteus-server-ts');
const require = createRequire(path.join(serverDir, 'package.json'));
const WebSocket = require('ws');
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core');
const chrome = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ticketDir = path.join(rootDir, 'tickets/in-progress/antigravity-cli-runtime-redesign-20260924');
const outDir = path.join(ticketDir, 'api-e2e-round5-process-restart-browser');
const evidence = { startedAt: new Date().toISOString(), commit: null, runtime: {}, identities: {}, cases: {}, processes: [], failures: [], cleanup: {} };
const assert = (v, message) => { if (!v) throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const port = () => new Promise((resolve, reject) => { const s=net.createServer(); s.once('error',reject); s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n));}); });
const wait = async (label, fn, ms=120000) => { const until=Date.now()+ms; let last; while(Date.now()<until){try{const v=await fn();if(v)return v;}catch(e){last=e;}await sleep(250);}throw new Error(`Timeout ${label}${last?`: ${last.message}`:''}`); };
const spawnOwned = (cmd,args,cwd,env,log) => { const stream=createWriteStream(log,{flags:'w'});const child=spawn(cmd,args,{cwd,env,detached:true,stdio:['ignore','pipe','pipe']});child.stdout.pipe(stream);child.stderr.pipe(stream);child.on('close',()=>stream.end());return child; };
const stopOwned = async child => { if(!child)return null;if(child.exitCode===null&&child.signalCode===null){process.kill(-child.pid,'SIGTERM');await Promise.race([new Promise(r=>child.once('close',r)),sleep(10000)]);}if(child.exitCode===null&&child.signalCode===null){process.kill(-child.pid,'SIGKILL');await Promise.race([new Promise(r=>child.once('close',r)),sleep(5000)]);}assert(child.exitCode!==null||child.signalCode!==null,`owned process ${child.pid} did not exit`);return {pid:child.pid,exitCode:child.exitCode,signalCode:child.signalCode}; };
const run = (cmd,args,cwd,env,log) => new Promise((resolve,reject)=>{const c=spawnOwned(cmd,args,cwd,env,log);c.on('close',(code)=>code===0?resolve():reject(new Error(`${cmd} ${args.join(' ')} exit ${code}; see ${log}`)));});
const gql = async (base,query,variables={}) => {const r=await fetch(`${base}/graphql`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)});const j=await r.json();if(!r.ok||j.errors?.length||!j.data)throw new Error(`GraphQL ${r.status}: ${JSON.stringify(j.errors||j)}`);return j.data;};
const wsOpen = async url => {const socket=new WebSocket(url);const frames=[];socket.on('message',raw=>{try{frames.push(JSON.parse(String(raw)));}catch{}});await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject);});return {socket,frames};};
const wsClose = ({socket}) => new Promise(resolve=>{if(socket.readyState===WebSocket.CLOSED)return resolve();const timer=setTimeout(resolve,2000);socket.once('close',()=>{clearTimeout(timer);resolve();});socket.close();});
const model = async base => {const r=await gql(base,'query($runtimeKind: String){providerModelCatalogSnapshots(runtimeKind:$runtimeKind){llmModels{modelIdentifier}}}',{runtimeKind:'antigravity_cli'});const xs=r.providerModelCatalogSnapshots.flatMap(x=>x.llmModels.map(m=>m.modelIdentifier));const preferred=process.env.AGY_E2E_TOOL_MODEL;if(preferred&&xs.includes(preferred))return preferred;return xs.includes('gemini-3.8-flash-low')?'gemini-3.8-flash-low':xs[0];};
const agent = async (base,name,instructions) => (await gql(base,'mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',{input:{name,role:'assistant',description:'AGY process restart browser E2E',instructions,toolNames:[]}})).createAgentDefinition.id;
const browserOpen = async (page, frontend, workspace) => {await page.goto(`${frontend}/workspace`,{waitUntil:'domcontentloaded'});await page.locator('[data-test="app-left-panel-run-history"]').waitFor({timeout:30000});const row=page.locator(`[data-test="workspace-row"][data-workspace-root="${workspace}"]`);if(await row.count()===0){const add=page.locator('[data-test="app-left-panel-run-history"] button[title]').first();await add.click();await page.locator('[data-test="workspace-path-input"]').fill(workspace);await page.locator('[data-test="confirm-create-workspace"]').click();}await wait('workspace row',()=>row.count());if(await row.getAttribute('aria-expanded')!=='true')await row.locator('button').first().click();};
const sendBrowser = async (page, text, oldMarker, newMarker) => {
  const surface = page.locator('[data-testid="agent-workspace-surface"], [data-testid="team-workspace-surface"]').first();
  await surface.waitFor({ timeout: 30000 });
  const feed = surface.locator('[data-testid="agent-conversation-feed"]');
  // The old marker occurs once in the user's prompt and once in the AGY reply.
  // Checking the focused, visible feed (not the API projection or composer)
  // guards against losing the old answer during browser history hydration.
  const visibleReplyCount = async marker => (await feed.innerText()).split(marker).length - 1;
  await wait(`old AGY reply visible before send: ${oldMarker}`,
    async () => (await visibleReplyCount(oldMarker)) >= 2);
  const oldReplyCountBeforeSend = await visibleReplyCount(oldMarker);
  const input = surface.locator('textarea').last();
  await wait('enabled composer', async () => await input.isEnabled());
  await input.fill(text);
  await surface.getByRole('button', { name: 'Send message' }).click();
  await wait(`old and new AGY replies visible after send: ${newMarker}`, async () =>
    (await visibleReplyCount(oldMarker)) >= 2
    && (await visibleReplyCount(newMarker)) >= 2
    && !(await surface.innerText()).includes('AgentOrg send target is not ready or is stale.'), 180000);
  return {
    url: page.url(),
    oldReplyCountBeforeSend,
    oldReplyCountAfterSend: await visibleReplyCount(oldMarker),
    newReplyCountAfterSend: await visibleReplyCount(newMarker),
    surfaceText: (await surface.innerText()).slice(-2000),
  };
};
const findTeamRuns = tree => {const found=[];const visit=x=>{if(!x||typeof x!=='object')return;if(x.kind==='configured_agent'&&typeof x.agent_run_id==='string')found.push({address:x.address,agentRunId:x.agent_run_id,platformAgentRunId:x.platform_agent_run_id||null});for(const v of Object.values(x))if(v&&typeof v==='object')Array.isArray(v)?v.forEach(visit):visit(v);};visit(tree);return [...new Map(found.map(x=>[x.agentRunId,x])).values()];};
const orgNodes = tree => {const d=tree.rootOrg.members.find(x=>x.address==='/director');const t=tree.rootOrg.members.find(x=>x.address==='/team');const w=t.members.find(x=>x.address==='/team/worker');return {direct:d,worker:w};};
let ownedRoot,backend,frontend,browser,page;
try {
  assert(existsSync(chrome),`Chrome missing at ${chrome}`);
  assert(existsSync(path.join(serverDir,'dist/app.js')),'Build backend first: pnpm -C autobyteus-server-ts build');
  await fs.mkdir(outDir,{recursive:true});
  ownedRoot=await fs.mkdtemp(path.join(os.tmpdir(),'agy-r5-process-browser-'));
  const dataRoot=path.join(ownedRoot,'server-data'),workspace=path.join(ownedRoot,'workspace');
  await fs.mkdir(path.join(dataRoot,'db'),{recursive:true});await fs.mkdir(workspace,{recursive:true});
  const db=path.join(dataRoot,'db','r5.db'),dbUrl=pathToFileURL(db).href;
  const backendPort=await port(),frontendPort=await port();
  const base=`http://127.0.0.1:${backendPort}`,front=`http://127.0.0.1:${frontendPort}`;
  evidence.runtime={dataRoot,workspace,backendUrl:base,frontendUrl:front};
  const env={...process.env,APP_ENV:'development',DB_TYPE:'sqlite',DATABASE_URL:dbUrl,AUTOBYTEUS_SERVER_HOST:base,DISABLE_HTTP_REQUEST_LOGS:'true'};
  await fs.writeFile(path.join(dataRoot,'.env'),`APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${base}\n`);
  await run('corepack',['pnpm','-C',serverDir,'exec','prisma','migrate','deploy','--schema','./prisma/schema.prisma'],rootDir,env,path.join(outDir,'migrate.log'));
  const startBackend=async label=>{const child=spawnOwned(process.execPath,[path.join(serverDir,'dist/app.js'),'--host','127.0.0.1','--port',String(backendPort),'--data-dir',dataRoot],serverDir,env,path.join(outDir,`${label}.log`));await wait(`${label} health`,async()=>{assert(child.exitCode===null&&child.signalCode===null,`${label} exited before ready`);try{return (await fetch(`${base}/rest/health`,{signal:AbortSignal.timeout(2000)})).ok;}catch{return false;}},90000);evidence.processes.push({label,pid:child.pid,readyAt:new Date().toISOString()});return child;};
  backend=await startBackend('backend-A');
  const m=await model(base);assert(m,'No AGY model in real catalog');const id=randomUUID();evidence.runtime.model=m;
  const instructions='On a user request for a marker, reply with that exact marker only. Do not use tools, shell, files, or diagnostics.';
  const a=await agent(base,`agy-r5-team-a-${id}`,instructions),b=await agent(base,`agy-r5-team-b-${id}`,instructions);
  const td=(await gql(base,'mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',{input:{name:`agy-r5-team-${id}`,description:'AGY restart browser Team',instructions,coordinatorMemberName:'first',nodes:[{memberName:'first',ref:a,refScope:'SHARED'},{memberName:'second',ref:b,refScope:'SHARED'}]}})).createAgentTeamDefinition.id;
  const cfg=(address,def)=>({memberAddress:address,agentDefinitionId:def,llmModelIdentifier:m,llmConfig:{},autoExecuteTools:true,skillAccessMode:'NONE',runtimeKind:'antigravity_cli',workspaceRootPath:workspace});
  const createdTeam=await gql(base,'mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}',{input:{teamDefinitionId:td,teamConfigs:[{teamAddress:'/',llmModelIdentifier:m,llmConfig:{},autoExecuteTools:true,skillAccessMode:'NONE',runtimeKind:'antigravity_cli',workspaceRootPath:workspace}],memberConfigs:[cfg('/first',a),cfg('/second',b)]}});assert(createdTeam.createAgentTeamRun.success,createdTeam.createAgentTeamRun.message);
  const teamId=createdTeam.createAgentTeamRun.teamRunId;const teamQuery='query($teamRunId:String!){getTeamRunResumeConfig(teamRunId:$teamRunId){executionTree}}';
  const beforeTeam=(await gql(base,teamQuery,{teamRunId:teamId})).getTeamRunResumeConfig.executionTree;const teamMembers=findTeamRuns(beforeTeam);assert(teamMembers.length>=2,'Team member IDs missing');
  const second=teamMembers.find(x=>x.address==='/second')||teamMembers.at(-1);evidence.identities.team={rootRunId:teamId,members:teamMembers,selected:second};
  const director=await agent(base,`agy-r5-director-${id}`,instructions),worker=await agent(base,`agy-r5-worker-${id}`,instructions);
  const nestedDef=(await gql(base,'mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',{input:{name:`agy-r5-nested-${id}`,description:'AGY restart Org nested Team',instructions,coordinatorMemberName:'worker',nodes:[{memberName:'worker',ref:worker,refScope:'SHARED'}]}})).createAgentTeamDefinition.id;
  const orgDef=(await gql(base,'mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}',{input:{name:`agy-r5-org-${id}`,description:'AGY restart browser Org',instructions,members:[{memberName:'director',ref:director,refType:'AGENT',refScope:'SHARED'},{memberName:'team',ref:nestedDef,refType:'AGENT_TEAM',refScope:'SHARED'}],handoffs:[]}})).createAgentOrgDefinition.id;
  const createdOrg=await gql(base,'mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}',{input:{agentOrgDefinitionId:orgDef,rootConfiguration:{runtimeKind:'antigravity_cli',llmModelIdentifier:m,llmConfig:null,autoExecuteTools:true,skillAccessMode:'NONE',workspaceRootPath:workspace},agentOverrides:[],teamOverrides:[]}});assert(createdOrg.createAgentOrgRun.success,createdOrg.createAgentOrgRun.message);
  const orgId=createdOrg.createAgentOrgRun.agentOrgRunId;const orgQuery='query($orgRunId:String!){getAgentOrgRunConfig(orgRunId:$orgRunId){executionTree isActive}}';const beforeOrg=(await gql(base,orgQuery,{orgRunId:orgId})).getAgentOrgRunConfig;const nodes=orgNodes(beforeOrg.executionTree);evidence.identities.org={rootRunId:orgId,direct:{address:'/director',agentRunId:nodes.direct.agentRunId,platformAgentRunId:nodes.direct.platformAgentRunId},worker:{address:'/team/worker',agentRunId:nodes.worker.agentRunId,platformAgentRunId:nodes.worker.platformAgentRunId}};
  // Establish persisted conversations in backend A. These are real AGY turns, not stubs.
  const teamWs=await wsOpen(`ws://127.0.0.1:${backendPort}/ws/agent-team/${teamId}`);
  const firstTeam=`BEFORE-TEAM-${id}`;teamWs.socket.send(JSON.stringify({type:'SEND_MESSAGE',payload:{content:`Reply with exactly ${firstTeam}.`,agent_run_id:second.agentRunId,context_file_paths:[],image_urls:[],message_id:randomUUID(),dedupe_key:randomUUID()}}));
  await wait('Team first TURN_COMPLETED',()=>teamWs.frames.some(f=>f.type==='TURN_COMPLETED'&&f.payload?.agent_run_id===second.agentRunId),150000);await wsClose(teamWs);
  const orgWs=await wsOpen(`ws://127.0.0.1:${backendPort}/ws/agent-org/${orgId}`);
  await wait('Org active handshake',()=>orgWs.frames.some(f=>f.type==='ROOT_LIFECYCLE'&&f.payload?.is_active===true),20000);
  const firstOrg=`BEFORE-ORG-${id}`;orgWs.socket.send(JSON.stringify({type:'SEND_MESSAGE',payload:{root_subject_kind:'agent_org',root_run_id:orgId,target_agent_run_id:nodes.direct.agentRunId,command_id:randomUUID(),content:`Reply with exactly ${firstOrg}.`,context_file_paths:[],image_urls:[],message_id:randomUUID(),dedupe_key:randomUUID()}}));
  await wait('Org first TURN_COMPLETED',()=>orgWs.frames.some(f=>f.type==='ROOT_EXECUTION_EVENT'&&f.payload?.event?.member_address==='/director'&&f.payload?.event?.agent_run_id===nodes.direct.agentRunId&&f.payload?.event?.message?.type==='TURN_COMPLETED'),150000);await wsClose(orgWs);
  const workerWs=await wsOpen(`ws://127.0.0.1:${backendPort}/ws/agent-org/${orgId}`);await wait('Org worker stream ready',()=>workerWs.frames.some(f=>f.type==='ROOT_LIFECYCLE'&&f.payload?.is_active===true),20000);
  const firstWorker=`BEFORE-WORKER-${id}`;workerWs.socket.send(JSON.stringify({type:'SEND_MESSAGE',payload:{root_subject_kind:'agent_org',root_run_id:orgId,target_agent_run_id:nodes.worker.agentRunId,command_id:randomUUID(),content:`Reply with exactly ${firstWorker}.`,context_file_paths:[],image_urls:[],message_id:randomUUID(),dedupe_key:randomUUID()}}));
  await wait('Org worker first TURN_COMPLETED',()=>workerWs.frames.some(f=>f.type==='ROOT_EXECUTION_EVENT'&&f.payload?.event?.member_address==='/team/worker'&&f.payload?.event?.agent_run_id===nodes.worker.agentRunId&&f.payload?.event?.message?.type==='TURN_COMPLETED'),150000);await wsClose(workerWs);
  evidence.cases.beforeRestart={result:'Pass',teamMarker:firstTeam,orgMarker:firstOrg,workerMarker:firstWorker,teamFrameCount:teamWs.frames.length,orgFrameCount:orgWs.frames.length,workerFrameCount:workerWs.frames.length};
  const teamBoundBeforeStop=findTeamRuns((await gql(base,teamQuery,{teamRunId:teamId})).getTeamRunResumeConfig.executionTree);
  const orgBoundBeforeStop=orgNodes((await gql(base,orgQuery,{orgRunId:orgId})).getAgentOrgRunConfig.executionTree);
  evidence.identities.team.membersBeforeStop=teamBoundBeforeStop;
  evidence.identities.org.directBeforeStop={agentRunId:orgBoundBeforeStop.direct.agentRunId,platformAgentRunId:orgBoundBeforeStop.direct.platformAgentRunId};
  evidence.identities.org.workerBeforeStop={agentRunId:orgBoundBeforeStop.worker.agentRunId,platformAgentRunId:orgBoundBeforeStop.worker.platformAgentRunId};
  evidence.processes.at(-1).stopped=await stopOwned(backend);backend=null;
  assert(!(await fetch(`${base}/rest/health`,{signal:AbortSignal.timeout(1000)}).then(()=>true).catch(()=>false)),'Backend A still reachable after shutdown');
  backend=await startBackend('backend-B');assert(evidence.processes[0].pid!==evidence.processes[1].pid,'Restart reused same OS PID');
  const teamAfter=(await gql(base,teamQuery,{teamRunId:teamId})).getTeamRunResumeConfig.executionTree;const orgAfter=(await gql(base,orgQuery,{orgRunId:orgId})).getAgentOrgRunConfig.executionTree;
  assert(JSON.stringify(findTeamRuns(teamAfter))===JSON.stringify(teamBoundBeforeStop),'Team run/provider binding changed across restart');const afterNodes=orgNodes(orgAfter);assert(afterNodes.direct.agentRunId===orgBoundBeforeStop.direct.agentRunId&&afterNodes.worker.agentRunId===orgBoundBeforeStop.worker.agentRunId&&afterNodes.direct.platformAgentRunId===orgBoundBeforeStop.direct.platformAgentRunId&&afterNodes.worker.platformAgentRunId===orgBoundBeforeStop.worker.platformAgentRunId,'Org member/provider IDs changed across restart');
  evidence.cases.processRestart={result:'Pass',oldPid:evidence.processes[0].pid,newPid:evidence.processes[1].pid,sameDataRoot:true,teamIdentityStable:true,orgIdentityStable:true};
  frontend=spawnOwned('corepack',['pnpm','dev','--host','127.0.0.1','--port',String(frontendPort)],webDir,{...process.env,NODE_ENV:'development',NUXT_TEST:'true',BACKEND_NODE_BASE_URL:base},path.join(outDir,'frontend.log'));
  await wait('Nuxt ready',async()=>{assert(frontend.exitCode===null&&frontend.signalCode===null,'Nuxt exited');try{return (await fetch(`${front}/workspace`,{signal:AbortSignal.timeout(3000)})).ok;}catch{return false;}},90000);
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage']});page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));evidence.runtime.browserErrors=errors;
  await browserOpen(page,front,workspace);
  // Team: click exact same persisted member, then send in the real composer.
  const group=page.locator(`[data-test^="workspace-team-definition-row-"]`).filter({hasText:`agy-r5-team-${id}`}).first();await wait('Team history definition',()=>group.count());if(await group.getAttribute('aria-expanded')!=='true')await group.click();
  const teamRow=page.locator(`[data-test="workspace-team-row-${teamId}"]`);await teamRow.waitFor();await teamRow.click();
  const memberRow=page.locator(`[data-test="workspace-team-member-${teamId}-/second"]`);await memberRow.waitFor();await memberRow.click();
  await wait('Team same member selected',async()=>await memberRow.getAttribute('aria-selected')==='true');
  const teamAfterText=`AFTER-TEAM-${id}`;const teamUi=await sendBrowser(page,`Reply with exactly ${teamAfterText}.`,firstTeam,teamAfterText);
  evidence.cases.teamBrowser={result:'Pass',selectedMemberRunId:second.agentRunId,selectedAddress:'/second',...teamUi};await page.screenshot({path:path.join(outDir,'team-after-restart.png')});
  const teamProjection=(await gql(base,'query($teamRunId:String!,$agentRunId:String!){getTeamMemberRunProjection(teamRunId:$teamRunId,agentRunId:$agentRunId){agentRunId conversation}}',{teamRunId:teamId,agentRunId:second.agentRunId})).getTeamMemberRunProjection;
  assert(teamProjection.agentRunId===second.agentRunId&&JSON.stringify(teamProjection.conversation).includes(firstTeam)&&JSON.stringify(teamProjection.conversation).includes(teamAfterText),'Team old/new persisted projection missing after browser continuation');
  evidence.cases.teamPersistence={result:'Pass',oldAndNewMarkers:true};
  // Org: click persisted direct member, then send a new turn after backend restart.
  const orgGroup=page.locator(`[data-test="agent-org-definition-${orgDef}"]`);await orgGroup.waitFor();if(await orgGroup.getAttribute('aria-expanded')!=='true')await orgGroup.click();
  const orgRow=page.locator(`[data-test="agent-org-run-open-${orgId}"]`);await orgRow.waitFor();await orgRow.click();
  const directRow=page.locator(`[data-test="agent-org-agent-row-${nodes.direct.agentRunId}"]`);await directRow.waitFor();await directRow.click();await wait('Org same direct member selected',async()=>await directRow.getAttribute('aria-selected')==='true');
  const orgAfterText=`AFTER-ORG-${id}`;const orgUi=await sendBrowser(page,`Reply with exactly ${orgAfterText}.`,firstOrg,orgAfterText);evidence.cases.orgBrowser={result:'Pass',selectedMemberRunId:nodes.direct.agentRunId,selectedAddress:'/director',...orgUi};await page.screenshot({path:path.join(outDir,'org-after-restart.png')});
  const nestedTeamRow=page.locator('[data-test^="agent-org-team-row-"]').filter({hasText:'team'}).first();
  assert(await nestedTeamRow.count()===1,'Nested Org Team row missing after direct continuation');
  if(await nestedTeamRow.getAttribute('aria-expanded')!=='true')await nestedTeamRow.click();
  const workerRow=page.locator(`[data-test="agent-org-agent-row-${nodes.worker.agentRunId}"]`);await workerRow.waitFor();await workerRow.click();await wait('Org same nested worker selected',async()=>await workerRow.getAttribute('aria-selected')==='true');
  const workerAfterText=`AFTER-WORKER-${id}`;const workerUi=await sendBrowser(page,`Reply with exactly ${workerAfterText}.`,firstWorker,workerAfterText);evidence.cases.orgNestedBrowser={result:'Pass',selectedMemberRunId:nodes.worker.agentRunId,selectedAddress:'/team/worker',...workerUi};await page.screenshot({path:path.join(outDir,'org-worker-after-restart.png')});
  const orgProjectionQuery='query($orgRunId:String!,$memberAddress:String!,$agentRunId:String!){getAgentOrgMemberRunProjection(orgRunId:$orgRunId,memberAddress:$memberAddress,agentRunId:$agentRunId){agentRunId memberAddress conversation}}';
  const orgProjection=(await gql(base,orgProjectionQuery,{orgRunId:orgId,memberAddress:'/director',agentRunId:nodes.direct.agentRunId})).getAgentOrgMemberRunProjection;
  assert(orgProjection.agentRunId===nodes.direct.agentRunId,'Org projection member ID mismatch');assert(JSON.stringify(orgProjection.conversation).includes(firstOrg)&&JSON.stringify(orgProjection.conversation).includes(orgAfterText),'Org old/new turns missing after browser continuation');
  const workerProjection=(await gql(base,orgProjectionQuery,{orgRunId:orgId,memberAddress:'/team/worker',agentRunId:nodes.worker.agentRunId})).getAgentOrgMemberRunProjection;
  assert(workerProjection.agentRunId===nodes.worker.agentRunId&&JSON.stringify(workerProjection.conversation).includes(firstWorker)&&JSON.stringify(workerProjection.conversation).includes(workerAfterText),'Nested Org old/new turns missing after browser continuation');
  evidence.cases.orgPersistence={result:'Pass',directAndNestedOldAndNewMarkers:true};
  evidence.result='Pass';
} catch(e) {evidence.result='Fail';evidence.failures.push({message:e.message,stack:e.stack});process.exitCode=1;
} finally {
  if(page)await page.screenshot({path:path.join(outDir,'final-state.png')}).catch(()=>{});
  if(browser)await browser.close().catch(e=>evidence.failures.push({cleanup:e.message}));
  if(frontend)evidence.cleanup.frontend=await stopOwned(frontend).catch(e=>({error:e.message}));
  if(backend)evidence.cleanup.backend=await stopOwned(backend).catch(e=>({error:e.message}));
  if(ownedRoot){await fs.rm(ownedRoot,{recursive:true,force:true});evidence.cleanup.ownedDataRootRemoved=true;}
  evidence.finishedAt=new Date().toISOString();await fs.mkdir(outDir,{recursive:true});await fs.writeFile(path.join(outDir,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({result:evidence.result,cases:evidence.cases,failures:evidence.failures,outputDir:outDir},null,2));
}

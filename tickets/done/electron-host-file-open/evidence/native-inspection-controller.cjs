// Implementation-only rendered-result inspection controller. Not API/E2E sign-off.
// Attaches only to the exact isolated-app receipt, controls saved inspection/projection
// responses and initial metadata failure, leaves real Electron IPC and file bytes intact.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline/promises');
const {createRequire} = require('node:module');
const req = createRequire(path.join(process.cwd(), 'autobyteus-web/package.json'));
const {chromium} = req('playwright-core');
const ts = req('typescript');
const vm = require('node:vm');
const output = path.dirname(__filename);
(async () => {
 const receipt = JSON.parse(await fs.readFile(path.join(output, 'native-start.json'), 'utf8'));
 if (!receipt.ok) throw new Error('No successful owned launch');
 const instance = receipt.result;
 const browser = await chromium.connectOverCDP(instance.controlEndpoint);
 const page = browser.contexts()[0].pages().find(p => p.url().includes('/renderer/index.html'));
 if (!page) throw new Error('Owned renderer not found');
 const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'electron-preview-owned-'));
 const rootB = path.join(fixture, 'B'), rootA = path.join(fixture, 'A');
 await fs.mkdir(rootB); await fs.mkdir(rootA);
 const files = Object.fromEntries(['brief', 'user', 'missing', 'directory'].map(name=>[name,path.join(rootB,name+'.md')]));
 await fs.writeFile(files.brief, '# NATIVE SELECTED B EVIDENCE\n\nReal IPC bytes. Read-only selected member preview.\n');
 await fs.writeFile(files.user, '# SECOND OWNED TAB\n\nPreserve alongside the linked preview.\n');
 await fs.mkdir(files.directory);
 const module = {exports:{}};
 const source = await fs.readFile('autobyteus-web/services/agentOrgExecution/__tests__/taskBearingOrgFixture.ts','utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});
 const view = JSON.parse(JSON.stringify(module.exports.taskBearingView()));
 view.is_active=false; view.agent_statuses=[];
 const root=view.execution_tree.rootOrg;
 root.orgDefinitionName='Owned File Preview Inspection';
 root.members[0].launchConfiguration.workspaceRootPath=rootA;
 const team=root.members[2];
 team.defaultLaunchConfiguration.workspaceRootPath=rootB;
 team.members.forEach(member=>{member.launchConfiguration.workspaceRootPath=rootB});
 const selectedId='agent-task-lead';
 let metadataEnabled=false;
 const evidence={instanceId:instance.instanceId,fixture,rootA,rootB,files,selectedId,
  boundaries:'Saved Org inspection/member projections controlled over GraphQL; initial metadata I/O refused, later metadata query real; native preload/main/bytes and rendered components real; no model/provider/user data.',
  requests:[],errors:[],observations:[],cleanup:{}};
 page.on('pageerror',e=>evidence.errors.push(String(e)));
 const save=()=>fs.writeFile(path.join(output,'native-visual.json'),JSON.stringify(evidence,null,2)+'\n');
 await page.route('**/graphql',async route=>{
  const request=route.request(); if(request.method()!=='POST')return route.continue();
  let body;try{body=request.postDataJSON()}catch{return route.continue()}
  const op=body.operationName || /(?:query|mutation)\s+(\w+)/.exec(body.query)?.[1];
  const variables=body.variables||{}; evidence.requests.push({op,variables,metadataEnabled});
  let response;
  if(op==='GetAgentOrgRunInspection')response={data:{getAgentOrgRunInspection:{root_subject_kind:'agent_org',root_run_id:'org-run',root_org:view}}};
  if(op==='GetAgentOrgMemberRunProjection')response={data:{getAgentOrgMemberRunProjection:{...variables,
   summary:'Owned selected task member',lastActivityAt:'2026-10-06T18:00:00.000Z',
   conversation: variables.agentRunId===selectedId ? [{kind:'message',role:'assistant',ts:1791309600,
    content:`Owned task member file inspection.\n\n[Open brief](${files.brief})\n\n[Open user tab](${files.user})\n\n[Missing file](${files.missing})\n\n[Directory file](${files.directory})`}] : [],
   activities:[],hasEarlierActiveTraceEvents:false}}};
  if(op==='GetWorkspaceMetadata'&&!metadataEnabled)response={errors:[{message:'Controlled initial metadata lookup unavailable'}],data:null};
  if(op==='GetRunFileChanges')response={data:{getRunFileChanges:[]}};
  if(response)await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
  else await route.continue();
 });
 console.log(JSON.stringify({ready:true,instanceId:instance.instanceId,controlPort:instance.controlPort,url:page.url(),files}));
 const input=readline.createInterface({input:process.stdin,output:process.stdout,terminal:false});
 try {
  for await(const line of input){
   let command;try{command=JSON.parse(line)}catch{console.log('Invalid JSON');continue}
   try {
    let result;
    if(command.action==='navigate'){
     await page.evaluate(()=>{location.hash='/workspace?rootSubjectKind=agent_org&orgRunId=org-run&mode=history&memberAddress=%2Fteam%2Flead&agentRunId=agent-task-lead'}); result={navigated:true};
    } else if(command.action==='observe'){
     result=await page.evaluate(()=>({url:location.href,text:document.body.innerText,
      buttons:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width).map(e=>({text:e.innerText,title:e.title,label:e.getAttribute('aria-label'),actionId:e.getAttribute('data-event-monitor-file-action-id')}))}));
    } else if(command.action==='metadata') {metadataEnabled=command.enabled; result={metadataEnabled};}
    else if(command.action==='click') {await page.locator(command.selector).click();result={clicked:command.selector};}
    else if(command.action==='key') {await page.keyboard.press(command.key);result={key:command.key};}
    else if(command.action==='state'){
     result=await page.evaluate(()=>{
      const app=document.querySelector('#__nuxt').__vue_app__;
      const pinia=app.config.globalProperties.$pinia, active=pinia._s.get('activeContext'), files=pinia._s.get('fileExplorer');
      const target=active?.activeWorkspaceTarget,id=target?.context.config.workspaceId;
      return {target:target?{kind:target.kind,runId:target.context.state.runId,root:target.workspaceRootPath,config:target.context.config}:null,
       files:id?files._getWorkspaceState(id)?.openFiles:null,activeFile:id?files.getActiveFile(id):null,
       node:pinia._s.get('windowNodeContext')?.$state,
       rendered:document.querySelector('#contentViewer')?.innerText,
       controls:[...document.querySelectorAll('#contentViewer button')].map(e=>({text:e.innerText,title:e.title}))};
     });
    } else if(command.action==='screenshot') {const filename=path.join(output,command.name+'.png');await page.screenshot({path:filename});result={path:filename};}
    else if(command.action==='close')break;
    else throw new Error('Unknown inspection action');
    evidence.observations.push({at:new Date().toISOString(),command,result});await save();console.log(JSON.stringify({ok:true,result}));
   } catch(error){console.log(JSON.stringify({ok:false,error:String(error)}));}
  }
 } finally {
  await page.unroute('**/graphql');await browser.close();await fs.rm(fixture,{recursive:true,force:true});
  evidence.cleanup.fixtureRemoved=true;await save();
 }
})().catch(e=>{console.error(e);process.exitCode=1});

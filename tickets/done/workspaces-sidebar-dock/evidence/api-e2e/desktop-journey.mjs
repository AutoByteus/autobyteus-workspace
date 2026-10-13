// Ticket-owned realistic product preservation probe, not a new general harness.
// Run complete start→assertions→stop inside owned Xvfb under non-root clean HOME.
// Uses canonical isolated-app CLI, current --from-worktree, public GraphQL + real agent WS,
// repository scripted AGY via own PATH wrapper (no credentials/inference). Caller provisions wrapper/home.
import fs from 'node:fs/promises'; import { existsSync } from 'node:fs';
import path from 'node:path'; import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module'; import assert from 'node:assert/strict'; import { randomUUID, createHash } from 'node:crypto';
const root=process.cwd(), out=process.argv[2], web=path.join(root,'autobyteus-web');
const require=createRequire(path.join(web,'package.json')), {chromium}=require('playwright-core'), WebSocket=require('ws');
const cli=path.join(web,'scripts/isolated-app/cli.mjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(name,fn,ms=90000)=>{const end=Date.now()+ms;while(Date.now()<end){const v=await fn();if(v)return v;await delay(150)}throw new Error('Timed out: '+name)};
const ev={startedAt:new Date().toISOString(),uid:process.getuid(),platform:process.platform+'-'+process.arch,checkpoints:[],errors:[],requests:[],frames:[],cleanup:{}};
const save=()=>fs.writeFile(path.join(out,'evidence.json'),JSON.stringify(ev,null,2)+'\n');
const checkpoint=async(msg,details)=>{ev.checkpoints.push({at:new Date().toISOString(),msg,details});await save()};
const runCli=async(args)=>await new Promise((resolve,reject)=>{const c=spawn(process.execPath,[cli,...args],{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});let s='',err='';c.stdout.on('data',d=>s+=d);c.stderr.on('data',d=>err+=d);c.once('error',reject);c.once('close',code=>{try{const payload=JSON.parse(s);resolve({code,payload,stderr:err})}catch(e){reject(new Error(`CLI non-JSON: ${s} ${err}`))}})});
const okCli=async(args)=>{const r=await runCli(args);assert.equal(r.code,0,JSON.stringify(r));assert(r.payload.ok,JSON.stringify(r));return r.payload.result};
let instance,browser,page;const sockets=[];
const gql=async(query,variables={})=>{const r=await fetch(instance.graphqlUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})});const b=await r.json();assert(r.ok&&!b.errors?.length,JSON.stringify(b));return b.data};
const sendTo=async id=>{const ws=new WebSocket(instance.backendUrl.replace('http','ws')+'/ws/agent/'+id);sockets.push(ws);ws.on('message',data=>{try{const b=JSON.parse(String(data));ev.frames.push({agent:id,type:b.type,event:b.payload?.event?.kind})}catch{}});await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j)});return content=>ws.send(JSON.stringify({type:'SEND_MESSAGE',payload:{agent_run_id:id,message_id:randomUUID(),dedupe_key:randomUUID(),content,context_file_paths:[],image_urls:[]}}))};
const tool=(name,args)=>'CALL_TOOL:'+JSON.stringify({name,arguments:args});
const proj=async id=>(await gql('query($id:String!){getRunProjection(runId:$id){conversation}}',{id})).getRunProjection.conversation;
const taskList=async id=>(await gql('query($id:String!){projectTasks(projectId:$id){taskId description status root{kind ingressAgentRunId recipientAddress start status closed hostRoot{kind runId}}}}',{id})).projectTasks;
const child=async(host,t)=>(await gql('query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}',{h:host,a:t.root.recipientAddress,r:t.root.ingressAgentRunId})).agentRunCollaborationMemberProjection.conversation;
const runtimes=async()=>{const records=[];for(const name of await fs.readdir('/proc')){if(!/^\d+$/.test(name))continue;try{const command=(await fs.readFile(`/proc/${name}/cmdline`,'utf8')).replaceAll('\0',' ');if(!command.includes('agy-failure-cli.mjs')||!command.includes(instance.dataRoot+path.sep))continue;const environment=await fs.readFile(`/proc/${name}/environ`,'utf8');if(!environment.split('\0').includes(`HOME=${process.env.HOME}`))continue;const stat=await fs.readFile(`/proc/${name}/stat`,'utf8');records.push({pid:Number(name),startTicks:stat.slice(stat.lastIndexOf(')')+2).split(' ')[19],command})}catch{}}return records.sort((a,b)=>a.pid-b.pid)};
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
try{
 assert(process.getuid()>0,'Electron cannot run root');assert(!existsSync(path.join(out,'evidence.json')),'Fresh evidence required');
 ev.source=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 instance=await okCli(['start','--from-worktree']);ev.instance=instance;await save();
 assert(instance.ownsDataRoot&&instance.executablePath.startsWith(path.join(web,'electron-dist')+path.sep),'Not an owned current-worktree build');
 ev.build={executableSha256:await hash(instance.executablePath),serverEntrySha256:await hash(path.join(path.dirname(instance.executablePath),'resources/server/dist/app.js')),
  currentServerEntrySha256:await hash(path.join(root,'autobyteus-server-ts/dist/app.js')),appAsarSha256:await hash(path.join(path.dirname(instance.executablePath),'resources/app.asar'))};
 assert.equal(ev.build.serverEntrySha256,ev.build.currentServerEntrySha256,'Embedded server differs from current build');
 await checkpoint('Owned current Electron ready; launch alone is not journey proof');
 const definition=async(name,tools)=>(await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',{i:{name,role:'assistant',description:name,instructions:'Follow the task.',toolNames:tools}})).createAgentDefinition.id;
 const hostDef=await definition('Dock Engineer',['delegate_task','send_message_to']),workerDef=await definition('Dock Worker',[]);ev.workerDefinition=workerDef;
 const workspace=async name=>{const dir=path.join(instance.dataRoot,name);await fs.mkdir(dir);const id=(await gql('mutation($i:CreateWorkspaceInput!){createWorkspace(input:$i){workspaceId}}',{i:{rootPath:dir}})).createWorkspace.workspaceId;
  await gql('mutation($id:String!){createFileOrFolder(workspaceId:$id,path:"preserved.md",isFile:true)}',{id});
  await gql('mutation($id:String!,$c:String!){writeFileContent(workspaceId:$id,filePath:"preserved.md",content:$c)}',{id,c:'# PRESERVED_DOCUMENT_'+name+'\nExisting document must survive layout actions.\n'});return{id,dir,name}};
 const a=await workspace('Dock Alpha'),b=await workspace('Dock Beta');
 const run=async w=>{const r=(await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}',{i:{agentDefinitionId:hostDef,workspaceRootPath:w.dir,workspaceId:w.id,llmModelIdentifier:'gemini-3.8-flash-low',runtimeKind:'antigravity_cli',autoExecuteTools:true,llmConfig:null}})).createAgentRun;assert(r.success,r.message);return r.runId};
 const hostA=await run(a),hostB=await run(b),sendA=await sendTo(hostA),sendB=await sendTo(hostB);
 sendA('PRESERVED_CONVERSATION_ALPHA');sendB('PRESERVED_CONVERSATION_BETA');
 await until('persisted alpha marker',async()=>JSON.stringify(await proj(hostA)).includes('PRESERVED_CONVERSATION_ALPHA'));
 await until('persisted beta marker',async()=>JSON.stringify(await proj(hostB)).includes('PRESERVED_CONVERSATION_BETA'));
 const project=(await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}',{i:{name:'Dock Preservation Project'}})).createProject.projectId;
 const task=(await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}',{i:{projectId:project,description:'PRESERVED_TASK: keep the active worker and this exact task intact.'}})).createProjectTask.taskId;
 sendA(tool('delegate_task',{recipient_address:'/dock_worker',task_id:task}));
 const assigned=await until('real scoped delegated Task worker',async()=>{const t=(await taskList(project)).find(t=>t.taskId===task);return t?.root?.start==='started'&&t});
 sendA(tool('send_message_to',{target_agent_run_id:assigned.root.ingressAgentRunId,content:'BACKGROUND_STEP:{"seconds":3600,"exitCode":0}'}));
 await until('active worker background task acknowledged',async()=>JSON.stringify(await child(hostA,assigned)).includes('STARTED'));
 const file=async w=>(await gql('query($id:String!){fileContent(workspaceId:$id,filePath:"preserved.md")}',{id:w.id})).fileContent;
 const data=async()=>({alpha:await proj(hostA),beta:await proj(hostB),task:await taskList(project),worker:await child(hostA,assigned),documents:[await file(a),await file(b)],runtimeProcesses:await runtimes()});
 ev.seed={a,b,hostA,hostB,project,task,worker:assigned.root.ingressAgentRunId};ev.before=await data();assert(ev.before.runtimeProcesses.length===3,'Expected active hostA/hostB/worker CLI processes');
 assert(!assigned.root.closed,'Task worker already closed');await checkpoint('Real API/WS seeded conversations, documents, Task delegation and active background worker',ev.seed);
 browser=await chromium.connectOverCDP(instance.controlEndpoint);page=browser.contexts()[0].pages().find(p=>/renderer\/index\.html/.test(p.url()));assert(page,'Missing real Electron renderer');
 ev.browser=browser.version();page.on('pageerror',e=>ev.errors.push({type:'pageerror',message:e.message}));page.on('console',m=>{if(m.type()==='error')ev.errors.push({type:'console',message:m.text()})});
 page.on('request',r=>{if(r.url().endsWith('/graphql'))try{const p=r.postDataJSON();ev.requests.push({operation:p?.operationName,variables:p?.variables})}catch{}});
 await page.waitForFunction(()=>!!document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$router);
 await page.evaluate(()=>document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push('/workspace'));
 const windowId=execFileSync('xdotool',['search','--onlyvisible','--pid',String(instance.pid)],{encoding:'utf8'}).trim().split('\n')[0];assert(windowId,'No owned X11 window');ev.windowId=windowId;
 const resize=async(width,height)=>{execFileSync('xdotool',['windowsize',windowId,String(width),String(height)]);await delay(350);
  const delta=await page.evaluate(({width,height})=>({width:width-innerWidth,height:height-innerHeight}),{width,height});
  if(delta.width||delta.height){execFileSync('xdotool',['windowsize',windowId,String(width+delta.width),String(height+delta.height)]);await delay(350)}
  const got=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio}));assert.equal(got.width,width);assert.equal(got.height,height);ev.nativeResizes??=[];ev.nativeResizes.push(got)};
 await resize(1440,900);
 const selected=()=>page.evaluate(()=>{const s=document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s;const t=s.get('activeContext')?.activeWorkspaceTarget;return{selected:s.get('agentSelection')?.subject,target:t?.agentRunId??t?.context.state.runId,conversation:t?.context.state.conversation.id}});
 const select=async(w,id,marker)=>{
  const group=page.locator(`[data-test="workspace-row"][data-workspace-root="${w.dir}"]`);await group.waitFor({timeout:60000});const toggle=group.locator('button').first();if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
  const role=group.locator('..').locator('[data-test="workspace-agent-row"]').filter({hasText:'Dock Engineer'});await role.waitFor({timeout:60000});if(await role.getAttribute('aria-expanded')==='false')await role.click();
  const row=page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${id}"]`);await row.waitFor({timeout:60000});await row.click();await until('exact selected conversation',async()=>(await selected()).target===id);
  await page.locator('[data-testid="agent-conversation-feed"]').getByText(marker,{exact:true}).waitFor({timeout:60000});await checkpoint('Trusted workspace/run selection '+marker,await selected())};
 const click=test=>page.locator(`[data-test="${test}"]`).click();
 const snap=async label=>{const value=await page.evaluate(()=>{const r=name=>{const e=document.querySelector(`[data-test="${name}"]`);if(!e)return null;const b=e.getBoundingClientRect();return{x:b.x,width:b.width,right:b.right}};return{url:location.href,width:innerWidth,height:innerHeight,left:r('app-left-panel-shell'),center:r('workspace-center-pane'),right:r('workspace-right-panel'),drawer:r('app-left-navigation-drawer'),backdrop:r('app-left-drawer-backdrop')}});ev.snapshots??=[];ev.snapshots.push({label,...value,selection:await selected()});await page.screenshot({path:path.join(out,label+'.png')});await save();return value};
 const drag=async x=>{const h=await page.locator('[data-test="workspace-right-resize-handle"]').boundingBox();assert(h,'Missing divider');await page.mouse.move(h.x+h.width/2,h.y+100);await page.mouse.down();await page.mouse.move(x,h.y+100,{steps:15});await page.mouse.up();await delay(250)};
 const proveDock=async(label)=>{const s=await snap(label);assert(s.left&&s.center&&s.right&&!s.drawer&&!s.backdrop,'Expected real nonmodal docks');assert(s.left.right<=s.center.x+1&&s.center.width>=200&&s.right.width>=400,'Unusable/overlapping current Electron geometry');
  const textarea=page.locator('[data-test="workspace-center-pane"] textarea');await textarea.click();assert(await textarea.evaluate(e=>e===document.activeElement),'Desktop composer focus blocked')};
 await select(a,hostA,'PRESERVED_CONVERSATION_ALPHA');
 const invariant=await selected(),url=page.url();await click('app-left-panel-collapse');await delay(250);await drag(0);
 const composer=page.locator('[data-test="workspace-center-pane"] textarea');await composer.fill('UNSENT_DESKTOP_DRAFT_ALPHA');
 // Activity is a real tool, not a fixture tab.
 await page.locator('[role="tab"][data-tab-name="progress"]').click();
 for(let i=0;i<3;i++){await click('workspace-left-strip-workspaces');await delay(250);await proveDock('desktop-docked-'+i);assert.deepEqual(await selected(),invariant,'Workspaces changed selected run');assert.equal(page.url(),url,'Workspaces changed route');
  assert.equal(await page.locator('[role="tab"][data-tab-name="progress"]').getAttribute('aria-selected'),'true');assert.equal(await composer.inputValue(),'UNSENT_DESKTOP_DRAFT_ALPHA');
  if(i<2){await click('app-left-panel-collapse');await delay(250)}}
 await select(b,hostB,'PRESERVED_CONVERSATION_BETA');await select(a,hostA,'PRESERVED_CONVERSATION_ALPHA');assert.equal(await composer.inputValue(),'UNSENT_DESKTOP_DRAFT_ALPHA','Real conversation switching lost draft');
 await resize(700,900);await click('workspace-left-strip-workspaces');await delay(250);const narrow=await snap('desktop-narrow');assert(narrow.drawer&&narrow.backdrop);
 await page.keyboard.press('Tab');assert(await page.locator('[data-test="app-left-navigation-drawer"]').evaluate(e=>e.contains(document.activeElement)),'Native-resize drawer trap missing');await page.keyboard.press('Escape');await delay(250);
 await resize(1440,900);if(await page.locator('[data-test="workspace-left-strip-workspaces"]').count())await click('workspace-left-strip-workspaces');await delay(250);await proveDock('desktop-wide-recovery');
 ev.after=await data();assert.deepEqual(ev.after.documents,ev.before.documents,'Existing documents changed');assert.deepEqual(ev.after.task,ev.before.task,'Task/root/status changed');assert.deepEqual(ev.after.alpha,ev.before.alpha,'Alpha stored conversation changed');assert.deepEqual(ev.after.beta,ev.before.beta,'Beta stored conversation changed');assert.deepEqual(ev.after.worker,ev.before.worker,'Active worker conversation changed');assert.deepEqual(ev.after.runtimeProcesses,ev.before.runtimeProcesses,'Active runtime PID/start identity changed');
 assert.deepEqual(ev.errors,[],'Browser errors in current desktop journey');await checkpoint('Direct preservation proof: documents, Tasks/root, persisted conversations and 3 active runtime identities unchanged');ev.result='Pass';
}catch(e){ev.result='Fail';ev.error={message:e.message,stack:e.stack};process.exitCode=1;await checkpoint('Validation did not pass',ev.error);if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
}finally{
 for(const ws of sockets)ws.close();await browser?.close().catch(()=>{});
 if(instance){try{await fs.copyFile(instance.logPath,path.join(out,'isolated-app.log'));ev.cleanup.stop=await okCli(['stop',instance.instanceId]);ev.cleanup.list=await okCli(['list']);assert(!ev.cleanup.list.instances?.some(i=>i.instanceId===instance.instanceId),'Own instance still listed');assert(ev.cleanup.stop.controlPortReleased&&ev.cleanup.stop.serverPortReleased,'Owned ports not free')}catch(e){ev.cleanup.error=e.message;process.exitCode=1}}
 ev.finishedAt=new Date().toISOString();await save();
}
console.log(JSON.stringify({result:ev.result,error:ev.error,cleanup:ev.cleanup,evidence:path.join(out,'evidence.json')},null,2));

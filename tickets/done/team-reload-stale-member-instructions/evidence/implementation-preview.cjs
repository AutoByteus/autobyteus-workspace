// Temporary normal Nuxt development preview; no real backend or API/E2E sign-off.
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'),net=require('node:net');
const {spawn}=require('node:child_process');
const root=process.cwd(), web=path.join(root,'autobyteus-web'), out=path.join(root,'tickets/in-progress/team-reload-stale-member-instructions/evidence');
const {chromium}=require(path.join(web,'node_modules/playwright-core'));
const fixture=path.join(web,'pages/implementation-team-reload-preview.vue');
const listen=s=>new Promise(r=>s.listen(0,'127.0.0.1',()=>r(s.address().port)));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let child,browser; const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});res.end('{"data":{"serverSettings":[],"workspaces":[]}}');});
(async()=>{try{
const backend=await listen(server), sock=net.createServer(), port=await listen(sock); await new Promise(r=>sock.close(r));
fs.writeFileSync(fixture, `<script setup lang="ts">
import AgentTeamList from '~/components/agentTeams/AgentTeamList.vue';
import AgentDetail from '~/components/agents/AgentDetail.vue';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { BOUND_APOLLO_CLIENT_KEY } from '~/plugins/30.apollo.client';
const agents=useAgentDefinitionStore(), teams=useAgentTeamDefinitionStore();
const version=ref(1), fail=ref(false), showDetail=ref(false);
const agent=()=>({ id:'team-local-agent:bridge:worker',name:'Worker',instructions:'Preview instructions v'+version.value,description:'Preview description v'+version.value,toolNames:version.value===1?['read_file','write_file']:['read_file'],skillNames:[],skillScope:'CONFIGURED',ownershipScope:'TEAM_LOCAL',ownerTeamId:'bridge',inputProcessorNames:[],llmResponseProcessorNames:[],toolExecutionResultProcessorNames:[],toolInvocationPreprocessorNames:[],lifecycleProcessorNames:[] });
const team=()=>({id:'bridge',name:'Bridge preview',description:'Team v'+version.value,instructions:'Preview Team instructions',coordinatorMemberName:'worker',nodes:[{memberName:'worker',ref:'worker',refScope:'TEAM_LOCAL'}]});
agents.agentDefinitions=[agent()] as any; teams.agentTeamDefinitions=[team()] as any;
const client={ mutate:async()=>({data:{refreshAgentTeamDefinitionCatalog:true}}),query:async({query}:any)=>{ await new Promise(r=>setTimeout(r,1000)); const text=query.loc?.source.body||''; if(text.includes('agentDefinitions')){if(fail.value){fail.value=false;throw new Error('Preview member read unavailable');} return {data:{agentDefinitions:[agent()]}};}return {data:{agentTeamDefinitions:[team()]}}; } };
(useNuxtApp() as any)[BOUND_APOLLO_CLIENT_KEY]=client;
</script>
<template><div class="h-screen"><div class="p-3 bg-slate-100 flex gap-4"><button @click="version++">Complete preview edit</button><button @click="fail=true">Fail next member read</button><button @click="showDetail=!showDetail">Inspect Worker</button></div><AgentDetail v-if="showDetail" agent-definition-id="team-local-agent:bridge:worker" return-to-team-id="bridge" @navigate="showDetail=false"/><AgentTeamList v-else /></div></template>`);
const env=Object.fromEntries(['HOME','PATH','USER','LANG','TMPDIR','SHELL'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
child=spawn(path.join(web,'node_modules/.bin/nuxi'),['dev','--host','127.0.0.1','--port',String(port)],{cwd:web,detached:true,env:{...env,NUXT_TELEMETRY_DISABLED:'1',BACKEND_NODE_BASE_URL:`http://127.0.0.1:${backend}`},stdio:['ignore','pipe','pipe']});
const log=fs.createWriteStream(path.join(out,'implementation-preview-dev.log'));child.stdout.pipe(log);child.stderr.pipe(log);
const url=`http://127.0.0.1:${port}/implementation-team-reload-preview`;
for(let i=0;i<120;i++){try{if((await fetch(url)).ok)break;}catch{} await wait(1000);}
browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.getByRole('button',{name:'Reload',exact:true}).waitFor();
await page.getByRole('button',{name:'Inspect Worker',exact:true}).click();await page.screenshot({path:path.join(out,'implementation-preview-worker-v1.png')});
await page.getByRole('button',{name:'Inspect Worker',exact:true}).click();await page.getByRole('button',{name:'Complete preview edit',exact:true}).click();await page.getByRole('button',{name:'Reload',exact:true}).click();await wait(200);await page.screenshot({path:path.join(out,'implementation-preview-loading.png')});await wait(2300);
await page.getByRole('button',{name:'Inspect Worker',exact:true}).click();await page.screenshot({path:path.join(out,'implementation-preview-worker-v2.png')});
const workerText=await page.locator('body').innerText();await page.getByRole('button',{name:'Inspect Worker',exact:true}).click();await page.getByRole('button',{name:'Fail next member read',exact:true}).click();await page.getByRole('button',{name:'Reload',exact:true}).click();await wait(1500);await page.screenshot({path:path.join(out,'implementation-preview-error.png')});const errorText=await page.locator('body').innerText();await page.getByRole('button',{name:'Reload',exact:true}).click();await wait(2300);await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'implementation-preview-retry-narrow.png')});
fs.writeFileSync(path.join(out,'implementation-preview-observations.json'),JSON.stringify({url,ports:{backend,frontend:port},workerText,errorText,errors,limitation:'Temporary preview fixture with controlled client, actual TeamList/AgentDetail and production stores; not real source/API/navigation validation.'},null,2));
}finally{if(browser)await browser.close();if(child)process.kill(-child.pid,'SIGTERM');fs.rmSync(fixture,{force:true});server.closeAllConnections();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});

import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {gql,config,stop,restore,save,info,evidence} from './api-live-utils.mjs';
import {createFixture} from './api-live-fixture.mjs';
const require=createRequire(new URL('../../../../autobyteus-server-ts/package.json',import.meta.url));
const WebSocket=require('ws');
const runtime=process.argv[2];
const models={autobyteus:'qwen/qwen3.8-27b:lmstudio@localhost:1234',codex_app_server:'gpt-5.6-luna',claude_agent_sdk:'haiku'};
const output=path.join(evidence,`api-continuation-${runtime}.json`);
const resuming=process.argv.includes('--resume');
const result=resuming ? JSON.parse(await fs.readFile(output,'utf8')) : {runtime,checkpoints:[],result:'In progress'};
let socket,fixture;
const checkpoint=async(label,data)=>{result.checkpoints.push({label,data});await fs.writeFile(output,JSON.stringify(result,null,2));console.log(label,JSON.stringify(data));};
const waitFor=async(label,test,ms=360000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await test())return;await new Promise(r=>setTimeout(r,200));}throw new Error('Timeout: '+label);};
async function connect(id){
 socket=new WebSocket(info.serverUrl.replace('http','ws')+'/ws/agent-org/'+id);
 const events=[];socket.on('message',raw=>{ events.push(JSON.parse(raw.toString())); void fs.appendFile(path.join(evidence,`api-events-${runtime}.jsonl`),raw.toString()+'\n'); });
 await waitFor('Org snapshot',()=>events.some(e=>e.type==='ROOT_EXECUTION_VIEW_SNAPSHOT'),20000);
 return events;
}
async function send(events,id,agent,content){
 const start=events.length,command_id=randomUUID();
 socket.send(JSON.stringify({type:'SEND_MESSAGE',payload:{root_subject_kind:'agent_org',root_run_id:id,target_agent_run_id:agent,command_id,content,context_file_paths:[],image_urls:[],message_id:randomUUID(),dedupe_key:randomUUID()}}));
 await waitFor('turn completion',()=>{
  const slice=events.slice(start),ack=slice.find(e=>e.type==='AGENT_COMMAND_ACK'&&e.payload.command_id===command_id);
  if(ack&&ack.payload.state!=='accepted')throw new Error(JSON.stringify(ack));
  const error=slice.find(e=>e.type==='ERROR');if(error)throw new Error(JSON.stringify(error));
  const presentations=slice.filter(e=>e.payload?.event?.agent_run_id===agent).map(e=>e.payload.event.message);
  const failed=presentations.find(e=>e?.type==='AGENT_ERROR');if(failed)throw new Error(JSON.stringify(failed));
  return presentations.some(e=>e?.type==='TURN_COMPLETED')||presentations.some(e=>e?.type==='ASSISTANT_COMPLETE');
 });
 await new Promise(r=>setTimeout(r,1200));
 return events.slice(start);
}
try {
 fixture=resuming?result.fixture:await createFixture(runtime,models[runtime]);result.fixture=fixture;await checkpoint(resuming?'poweroff-resume-existing-data':'created',fixture);
 const before=await config(fixture.orgRunId),team=before.executionTree.rootOrg.members.find(m=>m.address==='/team'),lead=team.members.find(m=>m.address==='/team/lead'),unused=team.members.find(m=>m.address==='/team/unused');
 result.identities={lead:lead.agentRunId,unused:unused.agentRunId};
 let events,binding;
 const token=resuming?result.token:'CITRUS-'+randomUUID().slice(0,8); result.token=token;
 if(!resuming){
 assert.equal(lead.platformAgentRunId,null);assert.equal(unused.platformAgentRunId,null);
 events=await connect(fixture.orgRunId);
 const initial=await send(events,fixture.orgRunId,lead.agentRunId,`Remember continuity token ${token}. Use run_bash to run pwd and create before.txt containing INITIAL in the current working directory, without cd or an absolute file path. Reply briefly with the pwd and token.`);
 await checkpoint('first-turn',initial);
 assert.equal((await fs.readFile(path.join(fixture.a,'before.txt'),'utf8')).trim(),'INITIAL');
 const established=await config(fixture.orgRunId),estTeam=established.executionTree.rootOrg.members.find(m=>m.address==='/team');
 binding=estTeam.members.find(m=>m.agentRunId===lead.agentRunId).platformAgentRunId;
 if(runtime!=='autobyteus')assert(binding,'Established provider binding is required');
 assert.equal(estTeam.members.find(m=>m.agentRunId===unused.agentRunId).platformAgentRunId,null);
 socket.close();socket=null;assert.equal((await stop(fixture.orgRunId)).success,true);
 const saved=await save(fixture.orgRunId,fixture.b);assert.equal(saved.success,true,JSON.stringify(saved));
 const read=await config(fixture.orgRunId);assert.equal(read.isActive,false);
 const savedTeam=read.executionTree.rootOrg.members.find(m=>m.address==='/team');
 assert.equal(savedTeam.members.find(m=>m.agentRunId===lead.agentRunId).platformAgentRunId,binding);
 assert.equal(savedTeam.members.find(m=>m.agentRunId===unused.agentRunId).platformAgentRunId,null);
 await checkpoint('stopped-save-reopen-no-activation',{saved,read});
 } else {
 assert.equal(before.isActive,false);assert.equal(lead.launchConfiguration.workspaceRootPath,fixture.b);
 assert.equal(unused.platformAgentRunId,null);binding=lead.platformAgentRunId;
 await checkpoint('canonical-B-read-after-poweroff',before);
 }
 assert.equal((await restore(fixture.orgRunId)).success,true);events=await connect(fixture.orgRunId);
 const continuation=await send(events,fixture.orgRunId,lead.agentRunId,'Use run_bash to run pwd and write the exact continuity token from our previous turn into continued.txt in the current working directory, without cd or an absolute file path. Reply briefly with pwd and that token.');
 await checkpoint('continued-turn',continuation);
 assert.equal((await fs.readFile(path.join(fixture.b,'continued.txt'),'utf8')).trim(),token);
 await assert.rejects(fs.access(path.join(fixture.a,'continued.txt')));
 const after=await config(fixture.orgRunId);
 assert.equal(after.executionTree.rootOrg.members.find(m=>m.address==='/team').members.find(m=>m.agentRunId===lead.agentRunId).platformAgentRunId,binding);
 const firstUnused=await send(events,fixture.orgRunId,unused.agentRunId,'Use run_bash to run pwd and write UNUSED into unused.txt in the current working directory, without cd or an absolute file path. Reply briefly with pwd.');
 await checkpoint('never-started-child',firstUnused);
 assert.equal((await fs.readFile(path.join(fixture.b,'unused.txt'),'utf8')).trim(),'UNUSED');
 assert.equal(await fs.readFile(path.join(fixture.a,'original.txt'),'utf8'),'Original project file stays at A.\n');
 result.result='Pass';
} catch(error){result.result='Fail-or-blocked pending classification';result.error=String(error);console.error(String(error));process.exitCode=1;}
finally{
 if(socket)socket.close();if(fixture){try{result.stop=await stop(fixture.orgRunId);}catch(e){result.stopError=String(e);}}
 await fs.writeFile(output,JSON.stringify(result,null,2));console.log('RESULT',result.result);
}

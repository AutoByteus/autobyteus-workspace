import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {gql,config,stop,restore,save,info,evidence} from './api-live-utils.mjs';
import {createFixture} from './api-live-fixture.mjs';
const require=createRequire(new URL('../../../../autobyteus-server-ts/package.json',import.meta.url));
const WebSocket=require('ws');
let socket;
const waitFor=async(label,test,ms=360000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await test())return;await new Promise(r=>setTimeout(r,200));}throw new Error('Timeout: '+label);};
export async function connect(id){
 socket=new WebSocket(info.serverUrl.replace('http','ws')+'/ws/agent-org/'+id);
 const events=[];socket.on('message',raw=>{ events.push(JSON.parse(raw.toString())); void fs.appendFile(path.join(evidence,'api-task-events.jsonl'),raw.toString()+'\n'); });
 await waitFor('Org snapshot',()=>events.some(e=>e.type==='ROOT_EXECUTION_VIEW_SNAPSHOT'),20000);
 return events;
}
export async function send(events,id,agent,content){
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
export function close(){socket?.close();}

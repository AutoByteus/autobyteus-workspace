// Temporary real HTTP/WS probe; only test-owned root/Agent IDs accepted.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../../..');
const require=createRequire(path.join(root,'autobyteus-server-ts/package.json'));
const WebSocket=require('ws');
const info=JSON.parse(await fs.readFile(path.join(here,'server-info.json'),'utf8'));
const input=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
if (!input.orgRunId.startsWith('aorg_validation_org_') || !input.agentRunId.startsWith('aorg_validation_agent_')) throw Error('not test-owned');
const frames=[]; const socket=new WebSocket(info.serverUrl.replace('http:','ws:')+'/ws/agent-org/'+input.orgRunId);
let sent=false;let done=false;
const commandId=input.commandId??randomUUID();
const timer=setTimeout(()=>{done=true;socket.close();},input.timeoutMs??120000);
socket.on('message',raw=>{
 const msg=JSON.parse(raw.toString());frames.push(msg);
 if(msg.type==='ROOT_EXECUTION_VIEW_SNAPSHOT'&&!sent){
   sent=true;
   const payload={root_subject_kind:'agent_org',root_run_id:input.orgRunId,target_agent_run_id:input.agentRunId,command_id:commandId,content:input.content,context_file_paths:input.contextFilePaths??[],image_urls:[],message_id:input.messageId??randomUUID(),dedupe_key:input.dedupeKey??randomUUID()};
   frames.push({probe:'SEND_MESSAGE',payload}); socket.send(JSON.stringify({type:'SEND_MESSAGE',payload}));
 }
 const event=msg.payload?.event;
 const completed=event?.agent_run_id===input.agentRunId && event?.message?.type==='TURN_COMPLETED';
 const ack=msg.type==='AGENT_COMMAND_ACK' && msg.payload?.command_id===commandId;
 if ((completed || (input.stopOnAck && ack)) && !done) {done=true;setTimeout(()=>socket.close(),400);}

});
socket.on('error',error=>frames.push({probe:'SOCKET_ERROR',message:error.message}));
await new Promise(resolve=>socket.on('close',resolve));clearTimeout(timer);
await fs.writeFile(process.argv[3],JSON.stringify(frames,null,2));
console.log(JSON.stringify({frames:frames.length,sent,commandId,types:[...new Set(frames.map(f=>f.type))]}));

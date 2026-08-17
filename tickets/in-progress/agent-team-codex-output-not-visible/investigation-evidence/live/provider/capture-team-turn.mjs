import { writeFile } from 'node:fs/promises';
const [teamRunId, agentRunId, outputPath] = process.argv.slice(2);
if (!teamRunId || !agentRunId || !outputPath) throw new Error('usage');
const teamWsUrl = process.env.TEAM_WS_URL ?? 'ws://127.0.0.1:60417/ws/agent-team';
const timeoutMs = Number(process.env.TURN_TIMEOUT_MS ?? 300000);
const startedAt = Date.now();
const messages=[];
let terminalAt=null;
let websocketError=null;
await new Promise((resolve)=>{
 const ws=new WebSocket(`${teamWsUrl}/${teamRunId}`);
 const timeout=setTimeout(()=>{websocketError=`timeout after ${timeoutMs}ms`;try{ws.close()}catch{};resolve()},timeoutMs);
 ws.addEventListener('message',(event)=>{
  const raw=String(event.data); let message;
  try{message=JSON.parse(raw)}catch{message={type:'UNPARSEABLE',raw}}
  const atMs=Date.now()-startedAt; messages.push({atMs,message});
  const payload=message.payload??{};
  if(['TURN_COMPLETED','TURN_FAILED','TURN_CANCELLED'].includes(message.type)&&payload.agent_run_id===agentRunId){
    terminalAt={type:message.type,atMs}; setTimeout(()=>{clearTimeout(timeout);try{ws.close()}catch{};resolve()},5000);
  }
 });
 ws.addEventListener('error',(event)=>{websocketError=event.message??'websocket error'});
 ws.addEventListener('close',()=>{clearTimeout(timeout);resolve()});
});
const result={teamRunId,agentRunId,startedAt:new Date(startedAt).toISOString(),durationMs:Date.now()-startedAt,terminalAt,websocketError,messages};
await writeFile(outputPath,`${JSON.stringify(result,null,2)}\n`);
const typeCounts={}; for(const e of messages)typeCounts[e.message.type]=(typeCounts[e.message.type]??0)+1;
console.log(JSON.stringify({teamRunId,agentRunId,durationMs:result.durationMs,terminalAt,websocketError,messageCount:messages.length,typeCounts},null,2));

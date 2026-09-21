// TEMPORARY API-REV-003 passive observer; remove after isolated validation.
import {useAgentTeamContextsStore} from '~/stores/agentTeamContextsStore';
import {useAgentTeamRunStore} from '~/stores/agentTeamRunStore';
import {useAgentActivityStore} from '~/stores/agentActivityStore';
export default defineNuxtPlugin(()=>{
 if(location.origin!=='http://127.0.0.1:50381')return;
 const tabId=crypto.randomUUID();
 const record=(v:any)=>{void fetch('http://127.0.0.1:50382/observe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({at:new Date().toISOString(),tabId,...v})}).catch(()=>{});};
 const Native=window.WebSocket;
 window.WebSocket=new Proxy(Native,{construct(Target,args){const ws=Reflect.construct(Target,args);const url=String(args[0]);
 if(url.includes('/ws/agent-team/aorg_validation_team_')){
  ws.addEventListener('message',(e:MessageEvent)=>{let frame;try{frame=JSON.parse(String(e.data))}catch{return;} record({kind:'incoming',url,frame});setTimeout(()=>snapshot('post-incoming'),0);});
  const send=ws.send;ws.send=function(data:any){let frame;try{frame=JSON.parse(String(data))}catch{frame=String(data)}record({kind:'frontend-outgoing',url,frame});return send.call(this,data);};
 }return ws;}});
 let previous='';
 const snapshot=(trigger:string)=>{try{
 const contexts=useAgentTeamContextsStore();const activity=useAgentActivityStore();const runs=useAgentTeamRunStore();
 const roots=contexts.allTeamRuns.filter(t=>t.view.getRootTeamRunId().startsWith('aorg_validation_team_')).map(t=>({root:t.view.getRootTeamRunId(),focused:t.view.getFocusedAgentRunId(),ready:runs.isTeamStreamReady(t.view.getRootTeamRunId()),members:t.view.listAgentContextEntries().map(e=>({id:e.agentRunId,address:e.memberAddress,status:e.agentContext.state.currentStatus,autoExecuteTools:e.agentContext.config.autoExecuteTools,draft:e.agentContext.requirement,tools:e.agentContext.state.conversation.messages.flatMap((m:any)=>m.segments??[]).filter((s:any)=>s.invocationId),activity:activity.getToolActivities(e.agentRunId)}))}));
 const serialized=JSON.stringify(roots);if(serialized!==previous){previous=serialized;record({kind:'owning-context-state',trigger,roots});}
 }catch(e){record({kind:'observer-error',error:String(e)});}};
 setInterval(()=>snapshot('periodic-read-only'),500);record({kind:'observer-installed'});
});

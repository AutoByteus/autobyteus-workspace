// TEMPORARY test-owned passive observation, ACTIVITY-RETAIN API-REV-001.
import {useAgentActivityStore} from '~/stores/agentActivityStore';
import {useActiveContextStore} from '~/stores/activeContextStore';
export default defineNuxtPlugin(()=>{if(location.origin!=='http://127.0.0.1:50391')return;
const rawFetch=window.fetch.bind(window); const tabId=crypto.randomUUID();
const log=(v:any)=>void rawFetch('http://127.0.0.1:50392/observe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({at:new Date().toISOString(),tabId,...v})}).catch(()=>{});
window.fetch=function(...args:any[]){if(String(args[0]).includes('/graphql')) log({kind:'frontend-graphql',body:args[1]?.body});return (rawFetch as any)(...args);};
const Native=window.WebSocket;window.WebSocket=new Proxy(Native,{construct(T,args){const ws=Reflect.construct(T,args),url=String(args[0]);if(url.includes('127.0.0.1:50254/ws/agent')){ws.addEventListener('message',(e:MessageEvent)=>{try{log({kind:'incoming',url,frame:JSON.parse(String(e.data))})}catch{}});const send=ws.send;ws.send=function(data:any){try{log({kind:'frontend-outgoing',url,frame:JSON.parse(String(data))})}catch{}return send.call(this,data);};}return ws;}});
let previous='';setInterval(()=>{try{const a=useAgentActivityStore(),c=useActiveContextStore().activeAgentContext;const state={selected:c?.state.runId,status:c?.state.currentStatus,config:c?.config,draft:c?.requirement,attachments:c?.contextFilePaths,activities:[...a.activitiesByRunId.keys()].map(id=>({id,items:a.getActivities(id)}))};const s=JSON.stringify(state);if(s!==previous){previous=s;log({kind:'state',state});}}catch(e){log({kind:'observer-error',error:String(e)});}},200);});

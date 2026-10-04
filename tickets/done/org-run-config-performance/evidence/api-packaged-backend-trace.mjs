import fs from 'node:fs/promises';import path from 'node:path';import {performance} from 'node:perf_hooks';
const out=path.join(process.cwd(),'tickets/in-progress/org-run-config-performance/evidence');const targets=await(await fetch('http://127.0.0.1:9229/json/list')).json();
const target=targets.find(x=>x.url==='file:///Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/server/dist/app.js');if(!target)throw Error('Owned backend debugger absent');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
let id=0;const calls=new Map();ws.addEventListener('message',e=>{const x=JSON.parse(e.data);if(x.id){const c=calls.get(x.id);if(c){calls.delete(x.id);x.error?c.reject(Error(JSON.stringify(x.error))):c.resolve(x.result);}}});
const rpc=(method,params)=>new Promise((resolve,reject)=>{const n=++id;calls.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const r=await rpc('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
const mode=process.env.TRACE_MODE??'install';
if(mode==='install'){
 const result=await evaluate(await fs.readFile(path.join(out,'api-packaged-backend-hooks.js'),'utf8'));await fs.writeFile(path.join(out,'api-packaged-backend-hooks-install.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}else{
 const info=JSON.parse(await fs.readFile(path.join(out,'api-packaged-start.json'),'utf8')).result;
 const input=JSON.parse(await fs.readFile(path.join(out,'api-packaged-small-history.json'),'utf8')).samples[0].sample.postData;
 const traces=[];
 try{for(let n=1;n<=3;n++){
   await evaluate('Object.assign(globalThis.__orgBackendTiming,{enabled:true,spans:[],aggregates:{},next:0});true');
   const began=performance.now(),response=await fetch(info.graphqlUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operationName:'CreateAgentOrgRun',query:'mutation CreateAgentOrgRun($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}',variables:{input}})}),body=await response.json(),elapsed=performance.now()-began;
   const result=await evaluate('globalThis.__orgBackendTiming.enabled=false;({spans:globalThis.__orgBackendTiming.spans,aggregates:globalThis.__orgBackendTiming.aggregates})');traces.push({n,elapsedMs:elapsed,status:response.status,body,...result});
   if(body.errors||!body.data?.createAgentOrgRun?.success)throw Error(JSON.stringify(body));const runId=body.data.createAgentOrgRun.agentOrgRunId;await fetch(info.graphqlUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'mutation Stop($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}',variables:{id:runId}})}).then(r=>r.json()).then(x=>{if(!x.data?.terminateAgentOrgRun?.success)throw Error(JSON.stringify(x));});console.log(JSON.stringify({n,elapsedMs:elapsed,spans:result.spans.length,root:result.spans.find(x=>x.label==='AgentOrgRunService.create')}));
 }}finally{const restored=await evaluate('globalThis.__orgBackendTiming.enabled=false;globalThis.__orgBackendTiming.restore.forEach(fn=>fn());delete globalThis.__orgBackendTiming;true');await fs.writeFile(path.join(out,'api-packaged-backend-trace.json'),JSON.stringify({purpose:'Timing-only instrumented API creation; separate from uninstrumented UI performance samples',traces,restored},null,2)+'\n');}
}
ws.close();process.exit(0);

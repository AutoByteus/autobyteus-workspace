import { writeFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const inspectorPort = Number(process.argv[2] || 9238);
const evidencePath = process.argv[3];
if (!evidencePath) throw new Error('evidence output path is required');
const serverRoot = process.cwd();
const ts = () => new Date().toISOString();
const note = (record) => appendFileSync(evidencePath, `${JSON.stringify({ts:ts(), source:'inspector-controller', ...record})}\n`);
writeFileSync(evidencePath, '');

let target;
for (let i = 0; i < 200; i++) {
  try {
    const res = await fetch(`http://127.0.0.1:${inspectorPort}/json/list`);
    const list = await res.json();
    target = list[0];
    if (target?.webSocketDebuggerUrl) break;
  } catch {}
  await new Promise(r => setTimeout(r, 50));
}
if (!target?.webSocketDebuggerUrl) throw new Error('inspector target unavailable');

const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
let call;
ws.onmessage = (event) => {
  const msg = JSON.parse(String(event.data));
  if (msg.id && pending.has(msg.id)) {
    const {resolve,reject} = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  }
  if (msg.method === 'Debugger.breakpointResolved') note({event:'breakpointResolved', params:msg.params});
  if (msg.method === 'Debugger.paused') {
    note({event:'paused', reason:msg.params?.reason});
    if (call) void call('Debugger.resume').then(() => note({event:'resumed'}));
  }
  if (msg.method === 'Inspector.detached') note({event:'detached', params:msg.params});
};
await new Promise((resolve,reject)=>{ws.onopen=resolve; ws.onerror=reject;});
call = (method, params={}) => new Promise((resolve,reject)=>{
  const id=++seq; pending.set(id,{resolve,reject}); ws.send(JSON.stringify({id,method,params}));
});
await call('Runtime.enable');
await call('Debugger.enable');

const emit = (stage, fields) => `(()=>{try{process._rawDebug('[API16_CORR]'+JSON.stringify(Object.assign({ts:new Date().toISOString(),stage:${JSON.stringify(stage)}},${fields})));}catch(e){try{process._rawDebug('[API16_CORR_ERR]'+JSON.stringify({ts:new Date().toISOString(),stage:${JSON.stringify(stage)},error:String(e)}));}catch{}}return false})()`;
const specs = [
  ['dist/agent-tools/mcp/agent-tools-mcp-routes.js',33,'MCP_HTTP_INGRESS',`{method:request?.method,sessionId:request?.params?.sessionId,body:typeof request?.body==='string'?request.body:null}`],
  ['dist/agent-tools/mcp/agent-tools-mcp-routes.js',63,'MCP_ROUTE_DISPATCH_START',`{sessionId:request?.params?.sessionId,rpcId:parseResult?.payload?.id,rpcMethod:parseResult?.payload?.method,toolName:parseResult?.payload?.params?.name,senderRunId:resolvedSession?.session?.sender?.senderRunId}`],
  ['dist/agent-tools/mcp/agent-tools-mcp-routes.js',68,'MCP_ROUTE_DISPATCH_COMPLETE',`{sessionId:request?.params?.sessionId,rpcId:parseResult?.payload?.id,kind:dispatchResult?.kind,statusCode:dispatchResult?.statusCode}`],
  ['dist/agent-tools/mcp/agent-tools-mcp-routes.js',71,'MCP_HTTP_RESPONSE_SEND',`{sessionId:request?.params?.sessionId,rpcId:parseResult?.payload?.id,statusCode:dispatchResult?.statusCode}`],
  ['dist/agent-tools/mcp/agent-tools-mcp-method-dispatcher.js',95,'MCP_DISPATCHER_TOOL_START',`{rpcId:id,toolName,sessionId:session?.sessionId,senderRunId:session?.sender?.senderRunId}`],
  ['dist/agent-tools/mcp/agent-tools-mcp-method-dispatcher.js',96,'MCP_DISPATCHER_TOOL_COMPLETE',`{rpcId:id,toolName,resultKind:executionResult?.kind}`],
  ['dist/agent-tools/mcp/agent-tool-mcp-tool-executor.js',18,'MCP_EXECUTOR_START',`{sessionId:input?.session?.sessionId,toolName:input?.toolName,senderRunId:input?.session?.sender?.senderRunId}`],
  ['dist/agent-tools/mcp/agent-tool-mcp-tool-executor.js',22,'MCP_EXECUTOR_ADAPTER_COMPLETE',`{sessionId:input?.session?.sessionId,toolName:input?.toolName,resultKind:result?.kind}`],
  ['dist/agent-tools/mcp/agent-tool-mcp-tool-executor.js',23,'MCP_EXECUTOR_NOTIFY_COMPLETE',`{sessionId:input?.session?.sessionId,toolName:input?.toolName,resultKind:result?.kind}`],
  ['dist/agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.js',31,'TASK_MCP_ADAPTER_START',`{toolName:entry?.name,sessionId:session?.sessionId,senderRunId:session?.sender?.senderRunId,rootKind:capabilities?.taskDelegation?.identity?.root?.rootSubjectKind,rootRunId:capabilities?.taskDelegation?.identity?.root?.rootRunId,memberAddress:capabilities?.taskDelegation?.identity?.memberAddress,agentRunId:capabilities?.taskDelegation?.identity?.agentRunId}`],
  ['dist/agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.js',32,'TASK_MCP_ADAPTER_COMPLETE',`{toolName:entry?.name,sessionId:session?.sessionId,resultStatus:result?.status,taskId:result?.task_id}`],
  ['dist/agent-tools/task-delegation/task-delegation-tool-run-router.js',7,'TASK_ROUTER_SUBMIT',`{rootKind:context?.identity?.root?.rootSubjectKind,rootRunId:context?.identity?.root?.rootRunId,memberAddress:context?.identity?.memberAddress,agentRunId:context?.identity?.agentRunId,message:input?.message}`],
  ['dist/agent-collaboration/execution/task/root-task-lifecycle-engine.js',82,'TASK_ENGINE_SUBMIT_START',`{rootKind:context?.identity?.root?.rootSubjectKind,rootRunId:context?.identity?.root?.rootRunId,memberAddress:context?.identity?.memberAddress,agentRunId:context?.identity?.agentRunId,recordCount:this?.records?.length}`],
  ['dist/agent-collaboration/execution/task/root-task-lifecycle-engine.js',85,'TASK_ENGINE_FIFO_ADMISSION',`{rootRunId:context?.identity?.root?.rootRunId,agentRunId:context?.identity?.agentRunId,recordCount:this?.records?.length}`],
  ['dist/agent-collaboration/execution/task/root-task-lifecycle-command-queue.js',19,'TASK_FIFO_SUBMIT',`{kind:command?.kind,open:this?.externalAdmissionOpen,failStopped:this?.rootFailStopped,running:this?.running,queued:this?.entries?.length}`],
  ['dist/agent-collaboration/execution/task/root-task-lifecycle-command-queue.js',54,'TASK_FIFO_ENQUEUE',`{kind:command?.kind,running:this?.running,queuedBefore:this?.entries?.length}`],
  ['dist/agent-collaboration/execution/task/root-task-lifecycle-command-queue.js',75,'TASK_FIFO_COMMAND_START',`{kind:entry?.command?.kind,running:this?.running,queuedRemaining:this?.entries?.length}`],
  ['dist/agent-collaboration/execution/task/root-task-lifecycle-engine.js',139,'TASK_SUBMIT_AT_HEAD',`{rootRunId:identity?.root?.rootRunId,memberAddress:identity?.memberAddress,agentRunId:identity?.agentRunId,recordCount:this?.records?.length}`],
  ['dist/agent-collaboration/execution/task/root-task-lifecycle-engine.js',150,'TASK_COMMIT_START',`{taskId:task?.taskId,fromStatus:task?.status,toStatus:next?.status,updates:next?.updates?.length}`],
  ['dist/agent-team-execution/task-delegation/team-task-lifecycle-adapter.js',84,'TEAM_ADAPTER_COMMIT_START',`{taskId:input?.previous?.taskId,fromStatus:input?.previous?.status,toStatus:input?.next?.status,recordCount:input?.nextRecords?.length}`],
  ['dist/agent-team-execution/task-delegation/team-task-lifecycle-adapter.js',97,'TEAM_ADAPTER_DURABLE_COMPLETE',`{taskId:input?.previous?.taskId,toStatus:input?.next?.status,committed:result?.committed}`],
  ['dist/agent-collaboration/execution/task/root-task-lifecycle-engine.js',151,'TASK_COMMIT_COMPLETE',`{taskId:task?.taskId,status:next?.status,recordStatus:this?.records?.find?.(x=>x.taskId===task.taskId)?.status}`],
  ['dist/agent-collaboration/execution/task/root-task-lifecycle-engine.js',152,'TASK_NOTIFICATION_COMPLETE',`{taskId:task?.taskId,status:next?.status,warning:warning??null}`],
];
for (const [rel,line,stage,fields] of specs) {
  const url=pathToFileURL(`${serverRoot}/${rel}`).href;
  const result=await call('Debugger.setBreakpointByUrl',{url,lineNumber:line-1,columnNumber:0,condition:emit(stage,fields)});
  note({event:'breakpointSet',stage,url,line,result});
}
await call('Runtime.runIfWaitingForDebugger');
note({event:'serverResumed',breakpointCount:specs.length});
await new Promise(resolve=>{ws.onclose=resolve;});
note({event:'inspectorClosed'});

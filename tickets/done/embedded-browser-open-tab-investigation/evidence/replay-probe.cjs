// Investigation-only probe: real production converter/parser/handler/controller, mocked UI/IPC.
// No connections to the user app, no production writes. Run: node <this-file> <repo-root>
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = process.argv[2];
const ts = require('/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/node_modules/typescript');
const cache = new Map(), calls = [];
let embedded = true, available = true;
const mocks = {
 '~/stores/browserShellStore': {useBrowserShellStore:()=>({browserAvailable:available,focusSession:async id=>calls.push(['focus',id])})},
 '~/stores/windowNodeContextStore': {useWindowNodeContextStore:()=>({isEmbeddedWindow:embedded})},
 '~/composables/useRightSideTabs': {useRightSideTabs:()=>({setActiveTab:tab=>calls.push(['select',tab])})}
};
function load(file){
 file=path.resolve(file);
 if(!fs.existsSync(file) && file.endsWith('.js'))file=file.slice(0,-3)+'.ts';
 if(!path.extname(file))file+='.ts';
 if(cache.has(file))return cache.get(file).exports;
 const mod={exports:{}};cache.set(file,mod);
 const source=fs.readFileSync(file,'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const req=id=>mocks[id] ?? (id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id));
 vm.runInThisContext('(function(require,module,exports){'+js+'\n})',{filename:file})(req,mod,mod.exports);
 return mod.exports;
}
(async()=>{
 const {handleBrowserToolExecutionSucceeded:handle}=load(root+'/autobyteus-web/services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts');
 const {AgyStreamEventConverter}=load(root+'/autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts');
 const records=JSON.parse(fs.readFileSync(path.join(__dirname,'incident-events.json'),'utf8'));
 const out=[];
 async function probe(label,payload,expected){calls.length=0;await handle(payload);assert.deepEqual(calls,expected,label);out.push({label,calls:[...calls],assertion:'PASS'});}
 for(const r of records){
  const payload={invocation_id:r.tool_call_id,tool_name:r.tool_name,turn_id:r.turn_id,result:r.tool_result};
  await probe('Exact recorded incident '+r.tool_result.output.tab_id,payload,[]);
  await probe('Same payload, canonical result only '+r.tool_result.output.tab_id,{...payload,result:r.tool_result.output},[['focus',r.tool_result.output.tab_id],['select','browser']]);
 }
 const converter=new AgyStreamEventConverter('probe-run','probe-conversation','probe-model');converter.startTurn('probe-turn');
 const open={tab_id:'probe1',status:'opened',url:'about:blank',title:'Harmless probe'};
 const events=converter.convert({event:'step_update',step_update:{conversation_id:'probe-conversation',step_index:1,step_type:'tool',state:'DONE',tool_name:'call_mcp_tool',tool_info:{name:'call_mcp_tool',parameters:{ServerName:'autobyteus_agent_tools',ToolName:'open_tab',Arguments:{url:'about:blank'}},output:JSON.stringify(open)}}});
 const event=events.find(e=>e.eventType==='TOOL_EXECUTION_SUCCEEDED');assert(event);assert.deepEqual(event.payload.result,{provider_state:'DONE',output:open});
 await probe('Production AGY converter -> renderer handler',event.payload,[]);
 await probe('Canonical object control',{...event.payload,result:open},[['focus','probe1'],['select','browser']]);
 await probe('Canonical JSON string control',{...event.payload,result:JSON.stringify(open)},[['focus','probe1'],['select','browser']]);
 embedded=false;await probe('Remote window preserves suppression',{...event.payload,result:open},[]);embedded=true;
 available=false;await probe('Unavailable browser preserves suppression',{...event.payload,result:open},[]);available=true;
 const {BrowserShellController}=load(root+'/autobyteus-web/electron/browser/browser-shell-controller.ts');
 let upsert,lease=null;const summaries=new Map();
 const controller=new BrowserShellController({onSessionUpserted:fn=>(upsert=fn,()=>{}),onSessionClosed:()=>()=>{},onPopupOpened:()=>()=>{},getSessionSummary:id=>summaries.get(id)||null,getSessionSummaryOrThrow:id=>{assert(summaries.has(id));return summaries.get(id)},getSessionLeaseOwner:()=>lease,claimSessionLease:(_,owner)=>lease=owner});
 controller.registerShell({shellId:1,browserWindow:{on:()=>{}},attachBrowserView:()=>{},send:()=>{}});
 summaries.set('probe1',{...open,device_emulation:{mode:'desktop',profile:null}});upsert(summaries.get('probe1'));
 assert.deepEqual(controller.getSnapshot(1),{activeTabId:null,sessions:[]});
 out.push({label:'Native session upsert alone does not attach to shell',snapshot:controller.getSnapshot(1),assertion:'PASS'});
 const focused=controller.focusSession(1,'probe1');assert.equal(focused.activeTabId,'probe1');assert.equal(focused.sessions.length,1);
 out.push({label:'Explicit focus attaches session to shell snapshot',snapshot:focused,assertion:'PASS'});
 console.log(JSON.stringify({scope:'Diagnostic boundary replay, not full Electron E2E; UI/IPC and manager doubles',productionRoot:root,cases:out.length,results:out},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});

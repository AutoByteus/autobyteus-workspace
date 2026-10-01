// One-time characterization from the released commit, not the evolving runtime.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const root=process.cwd(),base='8caa610ff438c288d9aca9f2efe2c33924fbf517',req=createRequire(root+'/autobyteus-ts/package.json'),ts=req('typescript');
const cache=new Map(),sources={};
function load(file){if(file.endsWith('.js'))file=file.slice(0,-3)+'.ts';if(cache.has(file))return cache.get(file).exports;const src=cp.execFileSync('git',['show',base+':'+file],{encoding:'utf8'});sources[file]=crypto.createHash('sha256').update(src).digest('hex');const m={exports:{}};cache.set(file,m);new Function('require','module','exports',ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText)(id=>id.startsWith('.')?load(path.posix.join(path.posix.dirname(file),id)):req(id),m,m.exports);return m.exports;}
const from=p=>load('autobyteus-ts/src/'+p);
const os=require('node:os');
const {Message,MessageRole}=from('llm/utils/messages.ts');
const {WorkingContextFinalizer,createCompactedMemoryUserMessage}=from('memory/working-context-finalizer.ts');
const {MemoryManager}=from('memory/memory-manager.ts');
const {FileMemoryStore}=from('memory/store/file-store.ts');
const {WorkingContextSnapshotStore}=from('memory/store/working-context-snapshot-store.ts');
const {WorkingContextSnapshotBootstrapper}=from('memory/restore/working-context-snapshot-bootstrapper.ts');
const {WorkingContextSnapshotSerializer}=from('memory/working-context-snapshot-serializer.ts');
const {ToolInvocation}=from('agent/tool-invocation.ts');
const {ToolResultEvent}=from('agent/events/agent-events.ts');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ir003-released-raw-ahead-')),agentId='synthetic';
try {
 const store=new FileMemoryStore(dir,agentId),snapshots=new WorkingContextSnapshotStore(dir,agentId);
 const manager=new MemoryManager({store,workingContextSnapshotStore:snapshots,agentId});
 manager.replaceWorkingContext(new WorkingContextFinalizer().finalize({messages:[new Message(MessageRole.SYSTEM,{content:'System'})]}));
 const turn=manager.startTurn();manager.ingestToolIntents([new ToolInvocation('inspect',{},'a',turn)],turn);
 manager.ingestToolResults([new ToolResultEvent('inspect',{committed:true},'a',undefined,{},turn)],turn,{appendToWorkingContext:false});
 const raw=manager.listTurnRawTracesOrdered().find(t=>t.traceType==='tool_result');
 const reopened=new MemoryManager({store:new FileMemoryStore(dir,agentId),workingContextSnapshotStore:snapshots,agentId});
 new WorkingContextSnapshotBootstrapper(snapshots).bootstrap(reopened,'ignored',{maxItemChars:null});
 const result=reopened.getWorkingContextMessages().find(m=>m.role===MessageRole.TOOL).tool_payload;
 const report={base,scope:'Unchanged released source, synthetic actual writer raw-ahead cut and normal bootstrap; no provider/private data.',raw:{toolResult:raw.toolResult,toolError:raw.toolError},recovered:{toolResult:result.toolResult,toolError:result.toolError},fullValidation:WorkingContextSnapshotSerializer.validate(snapshots.read(agentId)),sources};
 require('node:assert/strict').equal(raw.toolError,null);require('node:assert/strict').match(result.toolError,/interrupted/);
 fs.writeFileSync('tickets/in-progress/context-compaction-simplification-analysis/implementation-evidence/ir-003/released-raw-ahead-defect.json',JSON.stringify(report,null,2)+'\n');console.log('Reproduced released null-error corruption without source edits.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}

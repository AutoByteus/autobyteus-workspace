// Design feasibility probes of unchanged production modules; no application bootstrap/model calls.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const root=process.argv[2],req=createRequire(process.argv[3]+'/autobyteus-ts/package.json'),ts=req('typescript');
const cache=new Map(),sources={},results=[];
function load(file){if(!fs.existsSync(file)&&file.endsWith('.js'))file=file.slice(0,-3)+'.ts';if(cache.has(file))return cache.get(file).exports;const src=fs.readFileSync(file,'utf8');sources[path.relative(root,file)]=crypto.createHash('sha256').update(src).digest('hex');const m={exports:{}};cache.set(file,m);new Function('require','module','exports','__dirname','__filename',ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText)(id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id)):req(id),m,m.exports,path.dirname(file),file);return m.exports;}
const from=p=>load(root+'/autobyteus-ts/src/'+p);
const {Message,MessageRole}=from('llm/utils/messages.ts');
const {WorkingContextFinalizer,createCompactedMemoryUserMessage}=from('memory/working-context-finalizer.ts');
const {WorkingContextSnapshotSerializer:S}=from('memory/working-context-snapshot-serializer.ts');
const {MemoryManager}=from('memory/memory-manager.ts');
const {FileMemoryStore}=from('memory/store/file-store.ts');
const {WorkingContextSnapshotStore}=from('memory/store/working-context-snapshot-store.ts');
const {WorkingContextSnapshotBootstrapper}=from('memory/restore/working-context-snapshot-bootstrapper.ts');
const {ToolInvocation}=from('agent/tool-invocation.ts');
const {ToolResultEvent}=from('agent/events/agent-events.ts');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'compaction-sr019-'));
const observations=[]; const summary='Keep the confirmed summary and pending approval.';
try {
 for(const scenario of [{resultCount:0},{resultCount:1},{resultCount:2},{resultCount:2,rawAhead:true}]) {
  const {resultCount,rawAhead=false}=scenario; const snapshotResults=rawAhead?0:resultCount;
  const agentId='sr019-'+resultCount+(rawAhead?'-raw-ahead':''), dir=path.join(temp,agentId);
  const store=new FileMemoryStore(dir,agentId), snapshots=new WorkingContextSnapshotStore(dir,agentId);
  const manager=new MemoryManager({store,workingContextSnapshotStore:snapshots,agentId});
  manager.replaceWorkingContext(new WorkingContextFinalizer().finalize({messages:[new Message(MessageRole.SYSTEM,{content:'System'}),createCompactedMemoryUserMessage(summary)]}));
  const turnId=manager.startTurn();
  manager.ingestToolIntents([new ToolInvocation('inspect',{path:'synthetic-a'},'call-a',turnId),new ToolInvocation('inspect',{path:'synthetic-b'},'call-b',turnId)],turnId);
  for(let i=0;i<resultCount;i++)manager.ingestToolResults([new ToolResultEvent('inspect',{ok:true},i===0?'call-a':'call-b',undefined,{},turnId)],turnId,{appendToWorkingContext:!rawAhead});
  const original=snapshots.read(agentId), beforeBytes=fs.readFileSync(snapshots.getFilePath? snapshots.getFilePath(agentId):path.join(dir,'agents',agentId,'working_context_snapshot.json'));
  assert.equal(S.validateEnvelope(original),true); assert.equal(S.validate(original),snapshotResults===2);
  const reopened=new MemoryManager({store:new FileMemoryStore(dir,agentId),workingContextSnapshotStore:snapshots,agentId});
  new WorkingContextSnapshotBootstrapper(snapshots).bootstrap(reopened,'ignored',{maxItemChars:null});
  const after=snapshots.read(agentId); assert.equal(S.validate(after),true); assert(reopened.getWorkingContextMessages().some(m=>m.content===summary));
  const row={resultCount,snapshotResults,rawAhead,writerSnapshot:original,envelope:true,preRepairFullValidation:snapshotResults===2,postRestoreFullValidation:true,summaryPreserved:true,beforeBytes:beforeBytes.length,restoredToolResultCount:reopened.getWorkingContextMessages().filter(m=>m.role===MessageRole.TOOL).length};
  observations.push(row);results.push({name:'Writer cut point: '+snapshotResults+' snapshot / '+resultCount+' raw results restores without losing summary',status:'PASS'}); console.log('PASS '+results.at(-1).name);
 }
 fs.writeFileSync(process.argv[4],JSON.stringify({scope:'Actual unchanged MemoryManager writer and bootstrapper; synthetic temporary data. Not a target successor-guard implementation/test.',sources,results,observations},null,2)+'\n');
} finally {fs.rmSync(temp,{recursive:true,force:true});console.log('Owned temporary data removed');}

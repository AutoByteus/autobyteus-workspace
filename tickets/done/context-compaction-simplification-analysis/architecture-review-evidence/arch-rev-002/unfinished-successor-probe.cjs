// Design feasibility probes of unchanged production modules; no application bootstrap/model calls.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const root=process.argv[2],req=createRequire(process.argv[3]+'/autobyteus-ts/package.json'),ts=req('typescript');
const cache=new Map(),sources={},results=[];
function load(file){if(!fs.existsSync(file)&&file.endsWith('.js'))file=file.slice(0,-3)+'.ts';if(cache.has(file))return cache.get(file).exports;const src=fs.readFileSync(file,'utf8');sources[path.relative(root,file)]=crypto.createHash('sha256').update(src).digest('hex');const m={exports:{}};cache.set(file,m);new Function('require','module','exports','__dirname','__filename',ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText)(id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id)):req(id),m,m.exports,path.dirname(file),file);return m.exports;}
const from=p=>load(root+'/autobyteus-ts/src/'+p);
const {MemoryManager}=from('memory/memory-manager.ts');
const {FileMemoryStore}=from('memory/store/file-store.ts');
const {WorkingContextSnapshotStore}=from('memory/store/working-context-snapshot-store.ts');
const {WorkingContextSnapshotBootstrapper}=from('memory/restore/working-context-snapshot-bootstrapper.ts');
const {WorkingContextFinalizer,createCompactedMemoryUserMessage}=from('memory/working-context-finalizer.ts');
const {Message,MessageRole}=from('llm/utils/messages.ts');
const {ToolInvocation}=from('agent/tool-invocation.ts');
const {WorkingContextSnapshotSerializer:S}=from('memory/working-context-snapshot-serializer.ts');
const {NativeWorkingContextSnapshotV5Converter:C}=from('memory/migration/native-working-context-snapshot-v5-converter.ts');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'arch-rev-002-'));
const id='review-synthetic-pending', summary='Approved constraint: do not deploy; pending verification.';
const store=new FileMemoryStore(temp,id), snapshots=new WorkingContextSnapshotStore(temp,id);
const make=()=>new MemoryManager({store,workingContextSnapshotStore:snapshots,agentId:id});
const m=make();
let original,converted;
function check(name,f){f();results.push({name,status:'PASS'});console.log('PASS '+name);}
try {
 m.replaceWorkingContext(new WorkingContextFinalizer().finalize({messages:[new Message(MessageRole.SYSTEM,{content:'System'}),createCompactedMemoryUserMessage(summary)]}));
 // Same persisted-intent method called by normal LlmPhase before tool execution. No tool is executed here.
 m.ingestToolIntents([new ToolInvocation('read_file',{path:'/synthetic/input.txt'},'call-pending','turn-1')],'turn-1');
 original=snapshots.read(id);
 check('Production ingestion persists an unfinished tool batch with summary and provenance',()=>{assert.equal(original.messages.at(-1).role,'assistant');assert(original.messages.at(-1).tool_payload.tool_calls.length===1);assert(original.messages.some(x=>x.content===summary));});
 check('Current envelope accepts this writer output but full post-repair validation rejects it',()=>{assert.equal(S.validateEnvelope(original),true);assert.equal(S.validate(original),false);});
 const resumed=make();
 new WorkingContextSnapshotBootstrapper(snapshots).bootstrap(resumed,'unused',{maxItemChars:null});
 check('Existing bootstrap repairs and resumes the same snapshot without losing its summary',()=>{assert.equal(S.validate(snapshots.read(id)),true);assert(resumed.getWorkingContextMessages().some(x=>x.content===summary));assert.equal(resumed.getWorkingContextMessages().at(-1).role,'tool');});
 const versionless=structuredClone(original);delete versionless.schema_version;
 converted=new C().convert({expectedSnapshotAgentId:id,sourceBytes:new TextEncoder().encode(JSON.stringify(versionless)),eligibleActiveReferenceFacts:store.listTurnRawTracesOrdered()});
 check('Historical converter empties the otherwise identical versionless unfinished successor',()=>{assert.notEqual(converted.kind,'identity_rejected');assert.equal(converted.workingContext.buildMessages().length,0);});
 fs.writeFileSync(process.argv[4],JSON.stringify({scope:'Current-source characterization only: production ingestion and resume, synthetic temp storage, no process kill/app bootstrap/provider or target recognizer implementation. Versionless case removes only root label per proposed writer.',sources,results,writerOutput:original,conversion:{kind:converted.kind,mode:converted.mode,omissions:converted.omissions,messageCount:converted.workingContext.buildMessages().length}},null,2)+'\n');
} finally {fs.rmSync(temp,{recursive:true,force:true});}

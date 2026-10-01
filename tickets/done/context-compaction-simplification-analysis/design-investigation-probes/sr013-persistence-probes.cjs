// Design feasibility probes of unchanged production modules; no application bootstrap/model calls.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const root=process.argv[2],req=createRequire(process.argv[3]+'/autobyteus-ts/package.json'),ts=req('typescript');
const cache=new Map(),sources={},results=[];
function load(file){if(!fs.existsSync(file)&&file.endsWith('.js'))file=file.slice(0,-3)+'.ts';if(cache.has(file))return cache.get(file).exports;const src=fs.readFileSync(file,'utf8');sources[path.relative(root,file)]=crypto.createHash('sha256').update(src).digest('hex');const m={exports:{}};cache.set(file,m);new Function('require','module','exports','__dirname','__filename',ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText)(id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id)):req(id),m,m.exports,path.dirname(file),file);return m.exports;}
const from=p=>load(root+'/autobyteus-ts/src/'+p);
const {Message,MessageRole}=from('llm/utils/messages.ts');
const {WorkingContextFinalizer,createCompactedMemoryUserMessage,createNaturalUserMessageProvenance}=from('memory/working-context-finalizer.ts');
const {WorkingContextSnapshotSerializer:S}=from('memory/working-context-snapshot-serializer.ts');
const {WorkingContextSnapshotStore}=from('memory/store/working-context-snapshot-store.ts');
const {WorkingContextSnapshotBootstrapper}=from('memory/restore/working-context-snapshot-bootstrapper.ts');
const {RunMemoryFileStore}=from('memory/store/run-memory-file-store.ts');
const {RawTraceArchiveManager}=from('memory/store/raw-trace-archive-manager.ts');
const {RawTraceItem}=from('memory/models/raw-trace-item.ts');
const {WorkingContextMessageUnitBuilder}=from('memory/compaction/working-context-message-unit-builder.ts');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'compaction-sr013-')),agentId='synthetic-run';
const snap=new WorkingContextSnapshotStore(temp,agentId,{agentRootSubdir:''}),store=new RunMemoryFileStore(temp),archive=new RawTraceArchiveManager(temp);
const record=(id,content,seq)=>new RawTraceItem({id,ts:seq,turnId:'t1',seq,traceType:'user',content,sourceEvent:'design_probe'});
const items=[record('a','Already represented by earlier summary.',1),record('b','New completed work.',2),record('tail','Continue with remaining work.',3)];
const makeContext=(summary,ids)=>new WorkingContextFinalizer().finalize({messages:[new Message(MessageRole.SYSTEM,{content:'System'}),createCompactedMemoryUserMessage(summary),...items.filter(x=>ids.includes(x.id)).map(x=>createNaturalUserMessageProvenance(new Message(MessageRole.USER,{content:x.content}),{kind:'current_user',rawTraceIds:[x.id],turnId:'t1'}))]});
const oldSummary='## Episodic memory\nInvestigated old work.\n## Semantic memory\nPreserve files.';
const old=makeContext(oldSummary,['a','b','tail']);const payload=S.serialize(old,{agent_id:agentId});
function check(name,f){f();results.push({name,status:'PASS'});console.log('PASS '+name);}
try{
 store.add(items);snap.write(agentId,payload);
 check('Existing v5 category-rendered text remains directly readable without category files',()=>{assert(S.validate(snap.read(agentId)));const units=new WorkingContextMessageUnitBuilder().build(S.deserialize(snap.read(agentId)).workingContext.buildMessages());assert.equal(units.find(u=>u.kind==='compacted_memory').messages[0].content,oldSummary);assert(!fs.existsSync(path.join(temp,'episodic.jsonl')));});
 check('Current bootstrap gate rejects that otherwise valid saved text without lineage',()=>assert.throws(()=>new WorkingContextSnapshotBootstrapper(snap).bootstrap({store:{agentId},loadCurrentCompactionOutput:()=>null},'',{}),/without a lineage head/));
 const before=fs.readFileSync(path.join(temp,'working_context_snapshot.json'),'utf8');
 const boundary={boundaryType:'native_compaction',boundaryKey:'native_compaction_selection:synthetic',runtimeKind:'AUTOBYTEUS',sourceEvent:'design_probe'};
 let stage;
 check('Existing archive owner can persist complete archive copies without pruning active traces',()=>{stage=archive.archiveRecords(items.slice(0,2).map(x=>x.toDict()),boundary);assert(stage&&stage.segment.status==='complete');assert.deepEqual(store.listTurnRawTracesOrdered().map(x=>x.id),['a','b','tail']);assert.equal(fs.readFileSync(path.join(temp,'working_context_snapshot.json'),'utf8'),before);assert(fs.existsSync(path.join(temp,stage.segment.file_name)));});
 check('A stop after archive-copy preparation leaves the old snapshot and source evidence intact',()=>{const reopenedStore=new RunMemoryFileStore(temp);assert.equal(fs.readFileSync(path.join(temp,'working_context_snapshot.json'),'utf8'),before);assert.deepEqual(reopenedStore.readCompleteRawTraceCorpusDicts().map(x=>x.id),['a','b','tail']);assert.deepEqual(reopenedStore.listTurnRawTracesOrdered().map(x=>x.id),['a','b','tail']);});
 check('Reusing a completed archive boundary needs no second archive segment',()=>{const next=archive.archiveRecords(items.slice(0,2).map(x=>x.toDict()),boundary);assert.equal(next.created,false);assert.equal(archive.listCompleteSegments().length,1);});
 check('Save replacement first, then prune archived IDs: retained trace and all corpus evidence survive',()=>{const next=makeContext('## Goal and constraints\n- Preserve files.\n## Current state\n- New work completed.',['tail']);const nextPayload=S.serialize(next,{agent_id:agentId});assert(S.validate(nextPayload));snap.write(agentId,nextPayload);assert(store.removeActiveRawTracesArchivedByBoundary(boundary.boundaryKey));assert.deepEqual(store.listTurnRawTracesOrdered().map(x=>x.id),['tail']);assert.deepEqual(store.readCompleteRawTraceCorpusDicts().map(x=>x.id),['a','b','tail']);assert(S.validate(snap.read(agentId)));assert(store.removeActiveRawTracesArchivedByBoundary(boundary.boundaryKey));assert.deepEqual(store.listTurnRawTracesOrdered().map(x=>x.id),['tail']);});
 const sizes={snapshotBytes:fs.statSync(path.join(temp,'working_context_snapshot.json')).size,archiveBytes:fs.statSync(path.join(temp,stage.segment.file_name)).size,traceCount:3};
 fs.writeFileSync(path.join(__dirname,'sr013-persistence-results.json'),JSON.stringify({kind:'unchanged-source design feasibility probes; not target integration tests',node:process.version,typescript:ts.version,results,sizes,currentArchiveRelativePath:stage.segment.file_name,sources,limitations:['Synthetic fixtures, not production volume census.','No production target implementation: staged commit is an explicit orchestration of existing owner primitives.','No fsync/power-loss guarantee, application crash injection or actual provider calls.','Current bootstrap rejection is a reproduced coupling, not fixed source.']},null,2)+'\n');
}finally{fs.rmSync(temp,{recursive:true,force:true});}

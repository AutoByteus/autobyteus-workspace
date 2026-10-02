// Read-only source-module probes. TS is transpiled without type checking; no application bootstrap or live model.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const root=process.argv[2];
const sharedRequire=createRequire(process.argv[3]+'/autobyteus-ts/package.json');
const ts=sharedRequire('typescript');
const cache=new Map(),sources={};
function load(file){
  if(!fs.existsSync(file)&&file.endsWith('.js'))file=file.slice(0,-3)+'.ts';
  if(cache.has(file))return cache.get(file).exports;
  const source=fs.readFileSync(file,'utf8'); sources[path.relative(root,file)]=crypto.createHash('sha256').update(source).digest('hex');
  const mod={exports:{}};cache.set(file,mod);
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  const req=id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id)):sharedRequire(id);
  new Function('require','module','exports','__dirname','__filename',code)(req,mod,mod.exports,path.dirname(file),file);
  return mod.exports;
}
const from=p=>load(root+'/autobyteus-ts/src/'+p);
const {Message,MessageRole}=from('llm/utils/messages.ts');
const {WorkingContextFinalizer,createCompactedMemoryUserMessage,createNaturalUserMessageProvenance}=from('memory/working-context-finalizer.ts');
const {WorkingContextSnapshotSerializer:S}=from('memory/working-context-snapshot-serializer.ts');
const {WorkingContextMessageUnitBuilder:U}=from('memory/compaction/working-context-message-unit-builder.ts');
const {CompactionConversationHistoryRenderer:R}=from('memory/compaction/compaction-conversation-history-renderer.ts');
const results=[];
function check(name,fn){fn();results.push({name,status:'PASS'});console.log('PASS '+name)}
function context(summary,user='Continue running tests.'){
  return new WorkingContextFinalizer().finalize({messages:[new Message(MessageRole.SYSTEM,{content:'System instructions remain.'}),createCompactedMemoryUserMessage(summary),createNaturalUserMessageProvenance(new Message(MessageRole.USER,{content:user}),{kind:'current_user',rawTraceIds:['raw-user'],turnId:'t1'})]});
}
check('Current v5 snapshot stores and restores plain Markdown checkpoint without memory-category IDs',()=>{
 const text='## Task\nFix retry.\n## Next steps\nRun tests.';
 const c=context(text);const p=S.serialize(c,{agent_id:'synthetic-agent'});
 assert(S.validate(p));assert.equal(p.schema_version,5);
 const restored=S.deserialize(p).workingContext;
 assert.deepEqual(restored.buildMessages().map(m=>m.toDict()),c.buildMessages().map(m=>m.toDict()));
 assert(!JSON.stringify(p).includes('episodeIds'));
 assert.equal(new U().build(restored.buildMessages()).filter(u=>u.kind==='compacted_memory').length,1);
});
check('Current v5 snapshot also round-trips older category-rendered summary as ordinary checkpoint text',()=>{
 const text='## Episodic memory\nInvestigated retry.\n## Semantic memory\nNever delete existing files.';
 const p=S.serialize(context(text),{agent_id:'synthetic-agent'});
 assert(S.validate(p)); const parts=new U().build(S.deserialize(p).workingContext.buildMessages());
 assert.equal(parts.find(u=>u.kind==='compacted_memory').messages[0].content,text);
});
check('Current renderer reproducer: per-item 2000-character cap can remove a mid-checkpoint constraint',()=>{
 const text='A'.repeat(1300)+'IMPORTANT_CONSTRAINT_DO_NOT_DELETE'+'B'.repeat(1700);
 const units=new U().build(context(text).buildMessages()).filter(u=>u.kind==='compacted_memory');
 const rendered=new R().render(units,2000);
 assert(!rendered.includes('IMPORTANT_CONSTRAINT_DO_NOT_DELETE'));
 assert(new R().render(units,null).includes('IMPORTANT_CONSTRAINT_DO_NOT_DELETE'));
});
check('Current renderer reproducer: same cap can remove a genuine user constraint',()=>{
 const user='A'.repeat(1300)+'USER_APPROVAL_REQUIRED_BEFORE_WRITE'+'B'.repeat(1700);
 const units=new U().build(context('prior',user).buildMessages()).filter(u=>u.kind==='message');
 assert(!new R().render(units,2000).includes('USER_APPROVAL_REQUIRED_BEFORE_WRITE'));
 assert(new R().render(units,null).includes('USER_APPROVAL_REQUIRED_BEFORE_WRITE'));
});
fs.writeFileSync(path.join(__dirname,'autobyteus-design-probe-results.json'),JSON.stringify({kind:'read-only actual-source probes; no target implementation',node:process.version,typescript:ts.version,passed:results.length,results,sources,limitations:['Snapshot probes exercise serializer/finalizer/unit-builder, not the existing bootstrapper lineage gate.','Fixtures are synthetic; no production dataset sampled.','Renderer reproductions are expected current shortcomings, not checks of an implemented fix.']},null,2)+'\n');

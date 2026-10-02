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
const {NativeWorkingContextSnapshotV5Converter:C}=from('memory/migration/native-working-context-snapshot-v5-converter.ts');
const settings=load(root+'/autobyteus-server-ts/src/config/compaction-model-settings.ts');
const summary='## Episodic memory\nVerified existing work.\n## Semantic memory\nApproval remains pending.';
const context=new WorkingContextFinalizer().finalize({messages:[new Message(MessageRole.SYSTEM,{content:'System'}),createCompactedMemoryUserMessage(summary)]});
const payload=S.serialize(context,{agent_id:'synthetic-sr018'});
function check(name,f){f();results.push({name,status:'PASS'});console.log('PASS '+name);}
check('Existing current-shape v5 summary is readable without consulting category files',()=>{assert(S.validate(payload));assert(S.deserialize(payload).workingContext.buildMessages().some(m=>m.content===summary));});
check('Removing only obsolete root version currently rejects otherwise identical content',()=>{const x={...payload};delete x.schema_version;assert.equal(S.validate(x),false);});
check('Adding an irrelevant root attribute currently rejects otherwise identical content',()=>assert.equal(S.validate({...payload,obsolete_compactor_hint:'inert'}),false));
check('Wrong known-field type remains an actual structural failure',()=>assert.equal(S.validate({...payload,messages:[{...payload.messages[1],content:123}]}),false));
check('Missing current provenance is not repaired by a tolerant-root proposal',()=>{const x=structuredClone(payload);delete x.messages[1].metadata;assert.equal(S.validate(x),false);});
check('Released converter treats a versionless payload as unsupported and produces no summary',()=>{const x={...payload};delete x.schema_version;const c=new C().convert({expectedSnapshotAgentId:'synthetic-sr018',sourceBytes:new TextEncoder().encode(JSON.stringify(x)),eligibleActiveReferenceFacts:[]});assert.notEqual(c.kind,'identity_rejected');assert.equal(c.workingContext.buildMessages().length,0);});
check('Existing settings codec rejects unknown root fields rather than projecting them',()=>assert.throws(()=>settings.parseCompactionModelSettings(JSON.stringify({modelIdentifier:null,llmConfig:null,obsolete:'inert'}))));
check('Existing settings null/null default is valid without legacy input',()=>assert.deepEqual(settings.parseCompactionModelSettings(JSON.stringify(settings.DEFAULT_COMPACTION_MODEL_SETTINGS)),{modelIdentifier:null,llmConfig:null}));
fs.writeFileSync(process.argv[4],JSON.stringify({scope:'Unchanged-production characterization; no target implementation, model call, app startup, private dataset or acceptance claim.',sources,results,fixture:payload},null,2)+'\n');

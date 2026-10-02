// One-time characterization from the released commit, not the evolving runtime.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const root=process.cwd(),base='8caa610ff438c288d9aca9f2efe2c33924fbf517',req=createRequire(root+'/autobyteus-ts/package.json'),ts=req('typescript');
const cache=new Map(),sources={};
function load(file){if(file.endsWith('.js'))file=file.slice(0,-3)+'.ts';if(cache.has(file))return cache.get(file).exports;const src=cp.execFileSync('git',['show',base+':'+file],{encoding:'utf8'});sources[file]=crypto.createHash('sha256').update(src).digest('hex');const m={exports:{}};cache.set(file,m);new Function('require','module','exports',ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText)(id=>id.startsWith('.')?load(path.posix.join(path.posix.dirname(file),id)):req(id),m,m.exports);return m.exports;}
const from=p=>load('autobyteus-ts/src/'+p);
const {Message:M,MessageRole:R,ToolCallPayload:C,ToolResultPayload:T}=from('llm/utils/messages.ts');
const {WorkingContextFinalizer:F,createCompactedMemoryUserMessage:summary,createNaturalUserMessageProvenance:user}=from('memory/working-context-finalizer.ts');
const {WorkingContextSnapshotSerializer:S}=from('memory/working-context-snapshot-serializer.ts');
const context=new F().finalize({messages:[new M(R.SYSTEM,{content:'system'}),summary('Checkpoint 🧠'),user(new M(R.USER,{content:'Do this 🚀',image_urls:['img'],audio_urls:['audio'],video_urls:['video']}),{kind:'current_user',rawTraceIds:['raw-u'],turnId:'turn-u'}),new M(R.ASSISTANT,{content:'look',tool_payload:new C([{id:'a',name:'inspect',arguments:{open:{value:42}},nativeToolCallContext:{provider:'openai_responses',functionCallItem:{opaque:true}}},{id:'b',name:'inspect',arguments:{}}])}),new M(R.TOOL,{tool_payload:new T('a','inspect',{ok:true})}),new M(R.TOOL,{tool_payload:new T('b','inspect',null)})]});
const payload=JSON.parse(JSON.stringify(S.serialize(context,{agent_id:'agent-frozen'}))), rows=[];
function sample(name,edit){const p=structuredClone(payload);const changed=edit?.(p);const value=changed===undefined?p:changed;rows.push({name,payload:value,valid:S.validate(value)});}
sample('canonical complete');sample('empty',p=>{p.messages=[]});
for(const v of [1,3,4,6,null,'5']) sample('root version '+v,p=>{p.schema_version=v});
sample('absent version',p=>{delete p.schema_version});sample('extra root',p=>{p.obsolete=true});
sample('wrong shape root',()=>({hello:true}));sample('null root',()=>null);
for(const [field,v] of [['agent_id',''],['agent_id',15],['messages',null]])sample('invalid '+field+' '+v,p=>{p[field]=v});
sample('missing message',p=>{p.messages[0]=null});sample('array message',p=>{p.messages[0]=[]});
sample('unknown role',p=>{p.messages[0].role='unknown'});
for(const field of ['content','reasoning_content','image_urls','audio_urls','video_urls','tool_payload']){
 sample('omitted optional '+field,p=>{delete p.messages[0][field]});
 sample('null optional '+field,p=>{p.messages[0][field]=null});
 sample('invalid '+field,p=>{p.messages[0][field]=42});
}
sample('extra message',p=>{p.messages[0].obsolete=true});
sample('missing provenance',p=>{p.messages[0].metadata={}});
sample('metadata array',p=>{p.messages[0].metadata=[]});
sample('open metadata',p=>{p.messages[0].metadata.other={arbitrary:[1,true]}});
const prov=p=>p.messages[1].metadata.autobyteus_memory_provenance;
sample('prov extra',p=>{prov(p).extra=true});sample('prov reordered',p=>{p.messages[1].metadata.autobyteus_memory_provenance={constituents:prov(p).constituents,kind:'composed_user'}});
sample('range outside',p=>{prov(p).constituents[0].textRange.end=999});sample('overlap',p=>{prov(p).constituents[1].textRange.start=0});sample('media outside',p=>{prov(p).constituents[1].imageRange.end=2});
sample('summary twice',p=>{p.messages.push(structuredClone(p.messages[1]))});
sample('user single provenance',p=>{p.messages[1].metadata=structuredClone(p.messages[0].metadata)});
sample('adjacent user',p=>{p.messages.splice(2,0,structuredClone(p.messages[1]))});
for(const v of [null,[],['x','x'],[' x '],[''],[4]])sample('raw ids '+JSON.stringify(v),p=>{p.messages[0].metadata.autobyteus_memory_provenance.rawTraceIds=v});
for(const v of [null,'',' t ',15])sample('turn '+JSON.stringify(v),p=>{p.messages[0].metadata.autobyteus_memory_provenance.turnId=v});
sample('zero results',p=>{p.messages.splice(3)});sample('partial results',p=>{p.messages.pop()});sample('orphan',p=>{p.messages.splice(2,1)});sample('wrong result name',p=>{p.messages[3].tool_payload.tool_name='bad'});sample('reordered results',p=>{[p.messages[3],p.messages[4]]=[p.messages[4],p.messages[3]]});
const calls=p=>p.messages[2].tool_payload.tool_calls;
sample('empty calls',p=>{p.messages[2].tool_payload.tool_calls=[]});sample('duplicate calls',p=>{calls(p)[1].id='a'});sample('blank call',p=>{calls(p)[0].id=''});sample('numeric matching ids',p=>{calls(p)[0].id=123;p.messages[3].tool_payload.tool_call_id=123});
sample('call extra',p=>{calls(p)[0].extra=true});sample('args null historical default',p=>{calls(p)[0].arguments=null});sample('args array',p=>{calls(p)[0].arguments=[]});sample('missing args historical default',p=>{delete calls(p)[0].arguments});sample('bad native',p=>{calls(p)[0].nativeToolCallContext={provider:'unknown'}});sample('null native',p=>{calls(p)[0].nativeToolCallContext=null});
for(const [provider,key] of [['gemini','functionCallPart'],['anthropic','toolUseBlock'],['mistral','toolCall'],['ollama','toolCall'],['openai_responses','responseOutputItems']])for(const valid of [true,false])sample(provider+' native '+valid,p=>{calls(p)[0].nativeToolCallContext={provider,[key]:valid?(key==='responseOutputItems'?[{open:true}]:{open:true}):'bad',opaque:{preserve:true}}});
fs.mkdirSync('autobyteus-ts/tests/fixtures/memory',{recursive:true});fs.writeFileSync('autobyteus-ts/tests/fixtures/memory/released-native-snapshot-shapes.json',JSON.stringify({base,sources,canonical:payload,cases:rows},null,2)+'\n');console.log(rows.length+' released characterization cases captured');

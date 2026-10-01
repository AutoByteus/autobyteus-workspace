// Temporary API-C11: real built process + HTTP + actual writer/normal bootstrap. No provider call.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {startBuiltTestServer,removeOwnedTestRuntime,resolveTestDatabaseLocation,executeGraphql} from '../../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';
import {MemoryManager} from '../../../../../autobyteus-ts/dist/memory/memory-manager.js';
import {FileMemoryStore} from '../../../../../autobyteus-ts/dist/memory/store/file-store.js';
import {WorkingContextSnapshotStore} from '../../../../../autobyteus-ts/dist/memory/store/working-context-snapshot-store.js';
import {WorkingContextSnapshotSerializer} from '../../../../../autobyteus-ts/dist/memory/working-context-snapshot-serializer.js';
import {WorkingContextSnapshotBootstrapper} from '../../../../../autobyteus-ts/dist/memory/restore/working-context-snapshot-bootstrapper.js';
import {WorkingContextFinalizer,createCompactedMemoryUserMessage,createNaturalUserMessageProvenance} from '../../../../../autobyteus-ts/dist/memory/working-context-finalizer.js';
import {ReleasedNativeSnapshotV5Codec} from '../../../../../autobyteus-ts/dist/memory/migration/native-working-context-snapshot-shapes.js';
import {Message,MessageRole} from '../../../../../autobyteus-ts/dist/llm/utils/messages.js';
import {RawTraceItem} from '../../../../../autobyteus-ts/dist/memory/models/raw-trace-item.js';
import {ToolInvocation} from '../../../../../autobyteus-ts/dist/agent/tool-invocation.js';
import {ToolResultEvent} from '../../../../../autobyteus-ts/dist/agent/events/agent-events.js';
import {AgentRunMetadataStore} from '../../../../../autobyteus-server-ts/dist/run-history/store/agent-run-metadata-store.js';
const here=path.dirname(fileURLToPath(import.meta.url)), w=path.resolve(here,'../../../../..');
const runtimeRoot=path.join(w,'autobyteus-server-ts/tests/.tmp/api-rev-003-structural');
const databaseUrlOverride='file:./db/api-rev-003-structural.db',database=resolveTestDatabaseLocation(databaseUrlOverride);
assert(!fs.existsSync(runtimeRoot)&&!fs.existsSync(database.databasePath),'Refuse existing target');
const memoryDir=path.join(runtimeRoot,'memory'),key='AUTOBYTEUS_COMPACTION_MODEL_SETTINGS';
const ledger=path.resolve(here,'../../api-e2e-test-case-ledger.md');
const record={case:'API-C11',started:new Date().toISOString(),runtimeRoot,database,pids:[],checkpoints:[],result:'Running'};
const save=()=>fs.writeFileSync(path.join(here,'API-C11.json'),JSON.stringify(record,null,2));
const checkpoint=(label,details)=>{record.checkpoints.push({label,details});save();fs.appendFileSync(ledger,'\nAPI-C11 checkpoint: '+label+'. See API-C11.json.\n');};
const hash=(p)=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const tree=(root)=>Object.fromEntries(fs.readdirSync(root,{recursive:true}).filter(p=>p.startsWith('agents/')&&fs.statSync(path.join(root,p)).isFile()).sort().map(p=>[p,hash(path.join(root,p))]));
const cuts=[{id:'cut-zero',results:0},{id:'cut-partial',results:1},{id:'cut-complete',results:2},{id:'cut-raw-ahead',results:2,rawAhead:true},{id:'released-v5',results:0,historical:true}];
let server,starts=0;
const start=async()=>{server=await startBuiltTestServer({runtimeRoot,databaseUrlOverride});starts++;record.pids.push(server.child.pid);record.serverUrl=server.serverUrl;save();};
const stop=async()=>{if(server){const stopped=server;await stopped.stop();fs.writeFileSync(path.join(here,'API-C11-server-'+starts+'.log'),stopped.output());server=null;}};
const settings=()=>executeGraphql(server.serverUrl,'{ getServerSettings { key value } }');
const set=async(value)=>{const data=await executeGraphql(server.serverUrl,'mutation($key:String!,$value:String!){updateServerSetting(key:$key,value:$value)}',{key,value:JSON.stringify(value)});assert.match(data.updateServerSetting,/updated successfully/);};
const history=async(id)=>executeGraphql(server.serverUrl,'query($id:String!){getAgentRunMemoryView(runId:$id,includeRawTraces:true){runId workingContext{role content} rawTraces{toolCallId toolResult toolError}}}',{id});
try {
 fs.mkdirSync(memoryDir,{recursive:true});
 const legacyPath=path.join(runtimeRoot,'agents/autobyteus-memory-compactor/agent-config.json');
 fs.mkdirSync(path.dirname(legacyPath),{recursive:true});
 fs.writeFileSync(legacyPath,JSON.stringify({modelIdentifier:'retired-must-not-import',llmConfig:{temperature:0.123}}));
 const legacyHash=hash(legacyPath);
 for(const cut of cuts){
  const snapshots=new WorkingContextSnapshotStore(memoryDir,cut.id);
  const manager=new MemoryManager({store:new FileMemoryStore(memoryDir,cut.id),workingContextSnapshotStore:snapshots,agentId:cut.id});
  const context=new WorkingContextFinalizer().finalize({messages:[new Message(MessageRole.SYSTEM,{content:'Synthetic system'}),createCompactedMemoryUserMessage('Keep checkpoint 🧠; approval pending.')]});
  manager.replaceWorkingContext(context);
  if(cut.historical) {
   const content='Keep checkpoint 🧠; approval pending.';
   new FileMemoryStore(memoryDir,cut.id).add([new RawTraceItem({id:'history-raw-1',traceType:'user',sourceEvent:'LLMUserMessageReady',content,turnId:'turn-1',seq:1,ts:1})]);
   const historical=new WorkingContextFinalizer().finalize({messages:[createNaturalUserMessageProvenance(new Message(MessageRole.USER,{content}),{kind:'retained_user',rawTraceIds:['history-raw-1'],turnId:'turn-1'})]});
   snapshots.write(cut.id,ReleasedNativeSnapshotV5Codec.serialize(historical,{agent_id:cut.id}));
  }
  else{
   const turn=manager.startTurn();
   manager.ingestToolIntents(['a','b'].map(id=>new ToolInvocation('inspect',{id},id,turn)),turn);
   for(let i=0;i<cut.results;i++) manager.ingestToolResults([new ToolResultEvent('inspect',{committed:i},['a','b'][i],undefined,{},turn)],turn,{appendToWorkingContext:!cut.rawAhead});
   assert.deepEqual(Object.keys(snapshots.read(cut.id)),['agent_id','messages']);
  }
  await new AgentRunMetadataStore(memoryDir).writeMetadata(cut.id,{runId:cut.id,agentDefinitionId:'synthetic-api-c11',workspaceRootPath:runtimeRoot,memoryDir:path.join(memoryDir,'agents',cut.id),llmModelIdentifier:'deepseek-v4-flash',llmConfig:null,autoExecuteTools:false,runtimeKind:'autobyteus',platformAgentRunId:null});
 }
 const before=tree(memoryDir);record.seedHashes=before;save();
 await start();
 assert.deepEqual(tree(memoryDir),before,'Startup must preserve current writer packages and supported v5');
 assert.equal(hash(legacyPath),legacyHash);
 assert(!(await settings()).getServerSettings.some(x=>x.key===key));
 assert(!fs.readFileSync(path.join(runtimeRoot,'.env'),'utf8').includes(key));
 for(const cut of cuts){const view=await history(cut.id);assert(JSON.stringify(view).includes('Keep checkpoint 🧠; approval pending.'));record.checkpoints.push({label:'history before resume '+cut.id,details:view});}
 checkpoint('fresh built startup + HTTP absence/no default persistence + writer/v5 byte preservation',{legacyHash});
 await set({modelIdentifier:'unavailable-explicit-fixture',llmConfig:{temperature:0.2},schema_version:999,obsolete:'ignored'});
 assert.deepEqual(JSON.parse((await settings()).getServerSettings.find(x=>x.key===key).value),{modelIdentifier:'unavailable-explicit-fixture',llmConfig:{temperature:0.2}});
 await stop();
 const resumed=[];
 for(const cut of cuts){
  const snapshots=new WorkingContextSnapshotStore(memoryDir,cut.id);
  const manager=new MemoryManager({store:new FileMemoryStore(memoryDir,cut.id),workingContextSnapshotStore:snapshots,agentId:cut.id});
  new WorkingContextSnapshotBootstrapper(snapshots).bootstrap(manager,'Unused',{maxItemChars:null});
  const payload=snapshots.read(cut.id);
  assert.deepEqual(Object.keys(payload),['agent_id','messages']);
  assert(WorkingContextSnapshotSerializer.validate(payload));
  const results=manager.getWorkingContextMessages().filter(m=>m.role===MessageRole.TOOL).map(m=>m.tool_payload);
  if(!cut.historical){
   assert.equal(results.length,2);
   for(let i=0;i<cut.results;i++){assert.deepEqual(results[i].toolResult,{committed:i});assert.equal(results[i].toolError,null);}
   for(let i=cut.results;i<2;i++){assert.equal(results[i].toolResult,null);assert.match(results[i].toolError,/interrupt/i);}
  }
  resumed.push({id:cut.id,results,payload});
 }
 fs.writeFileSync(path.join(here,'API-C11-resumed.json'),JSON.stringify(resumed,null,2));
 checkpoint('normal bootstrap separately repairs all actual writer cuts and projects released v5',resumed.map(x=>({id:x.id,results:x.results})));
 const afterResume=tree(memoryDir);
 await start();
 assert.deepEqual(tree(memoryDir),afterResume);
 assert.equal(hash(legacyPath),legacyHash);
 assert.deepEqual(JSON.parse((await settings()).getServerSettings.find(x=>x.key===key).value),{modelIdentifier:'unavailable-explicit-fixture',llmConfig:{temperature:0.2}});
 for(const cut of cuts) assert(JSON.stringify(await history(cut.id)).includes('Keep checkpoint 🧠; approval pending.'));
 checkpoint('second real process reloads exact explicit tuple and repaired versionless history; legacy unchanged',{});
 await set({modelIdentifier:null,llmConfig:null});
 await stop();await start();
 assert.deepEqual(JSON.parse((await settings()).getServerSettings.find(x=>x.key===key).value),{modelIdentifier:null,llmConfig:null});
 assert.equal(hash(legacyPath),legacyHash);
 checkpoint('third real process retains explicit inherit tuple without old preference import',{});
 record.result='Pass';
}catch(error){record.result='Fail';record.error={name:error.name,message:error.message,stack:error.stack};throw error;}
finally{
 try {await stop();} finally{await removeOwnedTestRuntime(runtimeRoot,database);record.cleanup={runtimeRemoved:!fs.existsSync(runtimeRoot),databaseRemoved:!fs.existsSync(database.databasePath),keyRemoved:!fs.existsSync(database.rootKeyPath)};record.finished=new Date().toISOString();save();fs.appendFileSync(ledger,'\nAPI-C11 final '+record.result+'; API-C11.json and all 3 process logs/cleanup.\n');}
}
console.log(JSON.stringify({case:record.case,result:record.result,cleanup:record.cleanup}));

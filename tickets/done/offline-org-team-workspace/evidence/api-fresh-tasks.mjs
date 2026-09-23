import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createFixture} from './api-live-fixture.mjs';import {config,stop,restore,save,evidence,info} from './api-live-utils.mjs';import {connect,send,close} from './api-task-ws.mjs';
const result={result:'In progress',checkpoints:[]};let f;
const record=async(label,data)=>{result.checkpoints.push({label,data});await fs.writeFile(evidence+'/api-fresh-tasks.json',JSON.stringify(result,null,2));console.log(label);};
const wait=async(test)=>{const end=Date.now()+240000;while(Date.now()<end){const r=await test();if(r)return r;await new Promise(r=>setTimeout(r,500));}throw Error('Task timed out');};
try{
 f=await createFixture('claude_agent_sdk','haiku');result.fixture=f;await record('created',f);let c=await config(f.orgRunId);const director=c.executionTree.rootOrg.members.find(m=>m.address==='/direct').agentRunId;
 let events=await connect(f.orgRunId);
 async function delegate(phase){await send(events,f.orgRunId,director,`Call delegate_task once for recipient_address /team/unused, description: 'Use run_bash to run pwd and write ${phase} to ${phase.toLowerCase()}.txt using a relative filename in current working directory. Do not cd. Then submit_task_result with pwd and result.' Do not perform the task yourself. When a submitted result arrives, accept it with review_task_result. Keep replies brief.`);return await wait(async()=>{const x=await config(f.orgRunId);const tasks=x.executionTree.rootOrg.taskExecutions;return tasks.length>=(phase==='HISTORICAL'?1:2)?x:null;});}
 c=await delegate('HISTORICAL');await record('historical-created',c);
 await wait(async()=>{try{return (await fs.readFile(f.a+'/historical.txt','utf8')).trim()==='HISTORICAL';}catch{return false;}});
 await new Promise(r=>setTimeout(r,5000));close();await stop(f.orgRunId);const before=await config(f.orgRunId);await record('stopped-before-save',before);
 assert((await save(f.orgRunId,f.b)).success);const saved=await config(f.orgRunId);assert.deepEqual(saved.executionTree.rootOrg.taskExecutions,before.executionTree.rootOrg.taskExecutions);await record('saved-preserving-historical',saved);
 assert((await restore(f.orgRunId)).success);events=await connect(f.orgRunId);c=await delegate('FRESH');await record('fresh-created',c);
 await wait(async()=>{try{return (await fs.readFile(f.b+'/fresh.txt','utf8')).trim()==='FRESH';}catch{return false;}});
 await assert.rejects(fs.access(f.a+'/fresh.txt'));assert.equal((await fs.readFile(f.a+'/historical.txt','utf8')).trim(),'HISTORICAL');const final=await config(f.orgRunId);assert.deepEqual(final.executionTree.rootOrg.taskExecutions[0],before.executionTree.rootOrg.taskExecutions[0]);await record('final',final);result.result='Pass';
}catch(e){result.result='Unresolved';result.error=String(e);console.log(String(e));process.exitCode=1;}finally{close();if(f)result.stop=await stop(f.orgRunId);await fs.writeFile(evidence+'/api-fresh-tasks.json',JSON.stringify(result,null,2));console.log(result.result);}

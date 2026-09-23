import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createFixture} from './api-r2-fixture.mjs';import {config,save,stop,evidence} from './api-r2-utils.mjs';import {connect,send,close} from './api-r2-ws.mjs';
const f=await createFixture('claude_agent_sdk','haiku');
f.c=path.join(path.dirname(f.a),'C');f.d=path.join(path.dirname(f.a),'D');
for(const p of [f.b,f.c,f.d]){await fs.mkdir(p,{recursive:true});await fs.writeFile(path.join(p,'target.txt'),path.basename(p)+' original content\n');}
const c=await config(f.orgRunId);f.lead=c.executionTree.rootOrg.members.find(m=>m.address==='/team').members.find(m=>m.address==='/team/lead').agentRunId;
const events=await connect(f.orgRunId);
try{await send(events,f.orgRunId,f.lead,'Remember synthetic browser revalidation marker APRICOT-R2. Reply with that marker only. Do not use tools or start any tasks.');}finally{close();await stop(f.orgRunId);}
f.conversationBefore=events;assert((await save(f.orgRunId,f.c)).success);f.before=await config(f.orgRunId);assert.equal(f.before.isActive,false);
await fs.writeFile(evidence+'/api-r2-fixture.json',JSON.stringify(f,null,2));await fs.writeFile(evidence+'/api-r2-fault.json',JSON.stringify({rootPath:f.b}));console.log(JSON.stringify({orgRunId:f.orgRunId,lead:f.lead,a:f.a,b:f.b,c:f.c,d:f.d,label:f.label},null,2));

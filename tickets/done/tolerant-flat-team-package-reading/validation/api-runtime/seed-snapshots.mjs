import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {Message,MessageRole} from '../../../../../autobyteus-ts/dist/llm/utils/messages.js';
import {WorkingContextFinalizer,createNaturalUserMessageProvenance} from '../../../../../autobyteus-ts/dist/memory/working-context-finalizer.js';
import {WorkingContextSnapshotSerializer as S} from '../../../../../autobyteus-ts/dist/memory/working-context-snapshot-serializer.js';
const E=path.dirname(fileURLToPath(import.meta.url)),W=path.resolve(E,'../../../../..'),D=path.join(W,'autobyteus-server-ts/tests/.tmp/team-package-complete-api001');
for(const [id,rel,history] of [['api-migrated-direct','api-migrated-org/api-migrated-direct',true],['api-migrated-worker','api-migrated-org/api-migrated-mounted/api-migrated-worker',false],['api-flat-lead','api-flat-history/api-flat-lead',false]]){
 const messages=[new Message(MessageRole.SYSTEM,{content:'You are a test-owned responder. Answer the human concisely; do not initiate tools or unrelated work.'})];
 if(history)messages.push(createNaturalUserMessageProvenance(new Message(MessageRole.USER,{content:'Remember the secret word BLUEBERRY-915 for the next message. This is test history.'}),{kind:'current_user',rawTraceIds:['api-old-user'],turnId:'api-old-turn'}),new Message(MessageRole.ASSISTANT,{content:'I will remember BLUEBERRY-915.'}));
 const snapshot=S.serialize(new WorkingContextFinalizer().finalize({messages}),{agent_id:id});if(!S.validate(snapshot))throw new Error('invalid generated current snapshot');
 const p=path.join(D,'memory/agent_teams',rel);await fs.mkdir(p,{recursive:true});await fs.writeFile(path.join(p,'working_context_snapshot.json'),JSON.stringify(snapshot));
}
await fs.writeFile(path.join(D,'.env'),'AUTOBYTEUS_AGENT_PACKAGE_ROOTS=/Users/normy/autobyteus_org/autobyteus-agents\n');console.log('Generated strict canonical v5 snapshots for three test-owned native members. No provider/history result claimed.');

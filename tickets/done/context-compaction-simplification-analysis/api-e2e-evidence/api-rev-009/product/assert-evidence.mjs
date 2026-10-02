import fs from 'node:fs';
import assert from 'node:assert/strict';
import { AgentRootExecutionViewDtoSchema, CollaborationStreamServerMessageSchema } from '../../../../../../autobyteus-collaboration-stream-contracts/dist/index.js';
const here=new URL('./',import.meta.url);
const read=n=>JSON.parse(fs.readFileSync(new URL(n,here),'utf8'));
let rootCount=0;
for(const name of fs.readdirSync(here).filter(n=>n.endsWith('.api.json'))){
 const raw=read(name).response.data?.agentRunCollaboration;
 if(raw){AgentRootExecutionViewDtoSchema.parse(raw);rootCount++;}
}
let frameCount=0;
for(const frame of read('wire-before-reload.json').result.result){
 if(frame.direction==='in'&&frame.url.includes('/ws/agent-collaboration/')){CollaborationStreamServerMessageSchema.parse(JSON.parse(frame.data));frameCount++;}
}
const wire=fs.readFileSync(new URL('loopback-wire.jsonl',here),'utf8').trim().split('\n').map(JSON.parse);
const requests=wire.filter(x=>x.event==='request');
assert.equal(requests.length,45);
assert.equal(wire.filter(x=>x.event==='guard_failure'||x.event==='fixture_hold_timeout').length,0);
for(const ids of [[5,6,7],[8,9,10],[17,18,19],[20,21,22],[33,34,35],[37,38,39],[40,41,42],[43,44,45]]){
 const group=requests.filter(x=>ids.includes(x.id));
 assert.equal(group.length,3);assert.equal(new Set(group.map(x=>x.sha256)).size,1);
 for(const x of group)assert(wire.some(r=>r.event==='response_error'&&r.id===x.id&&r.status===503));
}
const parent=requests.filter(x=>x.kind==='parent');
const latestUser=x=>[...x.body.messages].reverse().find(m=>m.role==='user')?.content;
for(const marker of ['API9-AGENT-A','API9-AGENT-B','API9-TEAM-A','API9-TEAM-B']){
 assert.equal(parent.filter(x=>String(latestUser(x)).trim()===marker).length,1);
}
assert.equal(wire.filter(x=>x.event==='tool_response').length,1);
assert(parent.some(x=>x.body.messages.some(m=>m.role==='tool'&&String(m.content).includes('Mira'))));
const before=read('real-reconnect-before.api.json').response.data.agentRunCollaboration.root_agent;
const after=read('real-reconnect-after.api.json').response.data.agentRunCollaboration.root_agent;
assert.deepEqual(before.agent_input_states,after.agent_input_states);assert.equal(after.agent_input_states.length,2);
for(const kind of ['agent','team']){
 const projection=read(`finding-${kind}-projection.api.json`).response.data.agentRunCollaborationMemberProjection;
 const input=after.agent_input_states.find(x=>x.agent_run_id===projection.agentRunId).state;
 assert.equal(input.entries.length,1);assert.equal(input.entries[0].state,'held');
 const projected=projection.conversation.filter(x=>x.content===input.entries[0].content);
 assert.equal(projected.length,1);
 assert.equal(read(`finding-${kind}-dom.json`).result.result.length,2);
 assert.equal(parent.filter(x=>String(latestUser(x))===input.entries[0].content).length,0);
 const cold=read(`cold-real-${kind}-result.json`).result.result;
 assert.equal(cold.stopped,false);assert.equal(cold.completed,false);assert.equal(cold.compacting,false);
}
const sentinel=read('real-reconnect-sentinel.json').result.result;
assert.equal(sentinel.sentinel,null);assert.notEqual(sentinel.timeOrigin,read('reconnect-two-held-before.json').result.result.timeOrigin);
assert.equal(read('native-menu-reload-proof.json').result.result.sentinel,null);
const stored=read('final-stored-root.api.json').response.data.agentRunCollaboration.root_agent;
assert.equal(stored.is_active,false);assert.deepEqual(stored.agent_input_states,[]);
const result={evidenceAssertions:'Pass — validates observations, not product acceptance',productResult:'Fail',finding:'API009-F001 duplicate held user bubbles after actual reload',strictRootSnapshots:rootCount,strictCollaborationFrames:frameCount,productRequests:requests.length,parentRequests:parent.length,compactionRequests:requests.length-parent.length,remoteInferenceRequests:0,threeAttemptFailureGroups:8,toolResponses:1,actualSameProcessSnapshotEquality:true,actualColdNativeCardsAbsent:true,duplicateBubbleCopiesPerChild:2};
fs.writeFileSync(new URL('assert-evidence-result.json',here),JSON.stringify(result,null,2)+'\n');
console.log(result);

import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildConversationFromProjection } from '~/services/runHydration/runProjectionConversation';
import { handleAgentInputState } from '~/services/agentStreaming/handlers/agentInputStateHandler';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentContext } from '~/types/agent/AgentContext';
const read=(name:string)=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const projection=read('after-projection.api.json').response.data.agentRunCollaborationMemberProjection;
const snapshot=read('after-snapshot.json');
const input=snapshot.state, held=input.entries[0];
const findings:any[]=[];
const create=(entries:any[])=>new AgentContext({runtimeKind:'autobyteus'} as any,new AgentRunState(projection.agentRunId,buildConversationFromProjection(projection.agentRunId,entries,{agentDefinitionId:'sd036',agentName:'SD036',llmModelIdentifier:'owned-loopback'})));
const copies=(context:any)=>context.conversation.messages.filter((x:any)=>x.type==='user'&&x.text===held.content);
describe('SD036 diagnostic isolation using own fresh production capture — not acceptance',()=>{
 it('history alone creates exactly one anonymous copy',()=>{
  const c=create(projection.conversation),rows=copies(c);
  expect(rows).toHaveLength(1);expect(rows[0].messageId).toBeUndefined();expect(rows[0].dedupeKey).toBeUndefined();
  findings.push({condition:'history only',copies:rows});
 });
 it('live snapshot alone creates exactly one identified Held copy',()=>{
  const c=create([]);handleAgentInputState(input,c);
  expect(copies(c)).toHaveLength(1);expect(copies(c)[0].messageId).toBe(held.message_id);
  findings.push({condition:'live only',copies:copies(c)});
 });
 it('unchanged production history plus live handler creates exactly two copies',()=>{
  const c=create(projection.conversation);handleAgentInputState(input,c);
  expect(copies(c)).toHaveLength(2);expect(copies(c).filter((x:any)=>x.pendingInput?.state==='held')).toHaveLength(1);
  findings.push({condition:'history plus live',copies:copies(c)});
 });
 it('duplicate delivery of the same snapshot is not the source of the second copy',()=>{
  const c=create(projection.conversation);expect(handleAgentInputState(input,c)).toBe(true);
  expect(handleAgentInputState(input,c)).toBe(false);expect(copies(c)).toHaveLength(2);
  findings.push({condition:'same snapshot twice',count:copies(c).length});
 });
 it('counterfactual identity supplied to serialized history is still discarded by current builder',()=>{
  const entries=structuredClone(projection.conversation);
  Object.assign(entries.find((x:any)=>x.content===held.content),{message_id:held.message_id,dedupe_key:held.dedupe_key});
  const c=create(entries);expect(copies(c)[0].messageId).toBeUndefined();
  handleAgentInputState(input,c);expect(copies(c)).toHaveLength(2);
  findings.push({condition:'in-memory upstream keys only; current builder unchanged',count:copies(c).length});
 });
 it('counterfactual exact identity on built history allows unchanged handler to correlate one copy',()=>{
  const c=create(projection.conversation);
  Object.assign(copies(c)[0],{messageId:held.message_id,dedupeKey:held.dedupe_key});
  handleAgentInputState(input,c);
  expect(copies(c)).toHaveLength(1);expect(copies(c)[0].pendingInput.state).toBe('held');
  findings.push({condition:'in-memory exact identity after builder; no production edit',copies:copies(c)});
 });
 it('different identity is preserved rather than merged because its text is equal',()=>{
  const c=create(projection.conversation);
  Object.assign(copies(c)[0],{messageId:'sd036-distinct',dedupeKey:'sd036-distinct'});
  handleAgentInputState(input,c);expect(copies(c)).toHaveLength(2);
  findings.push({condition:'in-memory distinct identity with identical text',count:copies(c).length});
 });
 it('writes diagnostic observations only into this experiment directory',()=>{
  writeFileSync(new URL('identity-boundary-results.json',import.meta.url),JSON.stringify(findings,null,2));
  expect(findings).toHaveLength(7);
 });
});

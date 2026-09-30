import { describe,it,expect,vi } from 'vitest';
import { handleAgentInputState } from '../agentInputStateHandler';
import { handleAgentStatus } from '../agentStatusHandler';
import { beginLocalUserSubmission } from '~/services/runSubmission/localUserSubmission';
import { resolveAgentPrimaryAction } from '~/services/runSubmission/agentPrimaryAction';
import { parseServerMessage } from '../../protocol/messageParser';
import { toAgentPresentationProjectionMessage,toAgentProjectionMessage } from '../../teamStreamDtoAdapters';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentInputStateDto } from '@autobyteus/agent-presentation-contracts';
vi.mock('~/stores/runHistoryStore',()=>({useRunHistoryStore:()=>({applyRunNavigationEffect:vi.fn()})}));
const block={operationId:'operation',failureEpoch:1,position:{kind:'held_turn' as const,turnId:'A-turn'},state:'awaiting_user' as const,code:'failed',message:'failed'};
const snapshot=(revision:number,entries:AgentInputStateDto['entries'],recovery:AgentInputStateDto['recoverableBlock']=block):AgentInputStateDto=>({run_instance_id:'live-1',revision,entries,recoverableBlock:recovery});
const entry=(id:string,state:'held'|'queued'|'forwarded'):AgentInputStateDto['entries'][number]=>({sequence:id==='A'?1:2,message_id:id,dedupe_key:`input:${id}`,turn_id:state==='queued'?null:`${id}-turn`,content:`real ${id}`,state,sender_type:'user',file_attachments:[{uri:'/workspace/plan.md',file_type:'Markdown',file_name:'plan.md'}]});
const context=()=>({state:{runId:'run',currentStatus:AgentStatus.Idle,recoverableBlock:null,inputProjection:null,conversation:{messages:[],updatedAt:''},markEventMonitorPresentationChanged(){}},requirement:'real A',contextFilePaths:[],requestedSkillNames:[],submissionPending:false,get conversation(){return this.state.conversation}} as any);
describe('live compaction input projection',()=>{
 it('merges optimistic identity and admitted attachments, holds A without false completion and queues B without duplicate bubbles',()=>{
  const c=context();beginLocalUserSubmission(c,{text:'real A',attachments:[],navigationTarget:null,identity:{messageId:'A',dedupeKey:'input:A'}});
  c.conversation.messages.push({type:'ai',text:'',segments:[],isComplete:false,timestamp:new Date()});
  expect(handleAgentInputState(snapshot(1,[entry('A','held'),entry('B','queued')]),c)).toBe(true);
  expect(c.conversation.messages.filter((m:any)=>m.type==='user')).toHaveLength(2);
  expect(c.conversation.messages[0]).toMatchObject({messageId:'A',text:'real A',pendingInput:{state:'held'},contextFilePaths:[{locator:'/workspace/plan.md'}]});
  handleAgentStatus({status:'error',recoverableBlock:block},c);
  expect(c.conversation.messages[1].isComplete).toBe(false);
  expect(resolveAgentPrimaryAction({hasContext:true,status:c.state.currentStatus,submissionPending:false,isUploading:false,hasDraft:true})).toEqual({kind:'send',enabled:true});
  expect(handleAgentInputState(snapshot(1,[]),c)).toBe(false);
  handleAgentInputState(snapshot(2,[entry('A','forwarded'),entry('B','queued')],{...block,state:'recovering'}),c);
  expect(c.conversation.messages[0].pendingInput.state).toBe('forwarded');
  expect(resolveAgentPrimaryAction({hasContext:true,status:c.state.currentStatus,submissionPending:false,isUploading:false,hasDraft:true}).kind).toBe('interrupt');
  handleAgentInputState(snapshot(3,[],null),c);expect(c.conversation.messages[0].pendingInput).toBeUndefined();
 });
 it('preserves consumed A and run-level error with no active input; a new runtime clears stale badges without replay',()=>{
  const c=context();c.conversation.messages=[{type:'user',messageId:'A',text:'real A',timestamp:new Date()},{type:'ai',text:'actual answer',segments:[],isComplete:true,timestamp:new Date()}];
  const next={...block,position:{kind:'next_turn' as const,failedTurnId:'A-turn'}};
  handleAgentInputState(snapshot(1,[entry('B','queued')],next),c);
  expect(c.state.currentStatus).toBe(AgentStatus.Error);expect(c.conversation.messages[0].pendingInput).toBeUndefined();
  expect(c.conversation.messages[1]).toMatchObject({text:'actual answer',isComplete:true});
  handleAgentInputState({...snapshot(0,[],null),run_instance_id:'new-live'},c);
  expect(c.state.recoverableBlock).toBeNull();expect(c.conversation.messages.every((m:any)=>!m.pendingInput)).toBe(true);
  expect(c.conversation.messages).toHaveLength(3);
 });
 it('strictly parses current state on standalone and routes the same payload through Team/Org projections',()=>{
  const payload=snapshot(1,[entry('A','held')]);
  expect(parseServerMessage(JSON.stringify({type:'AGENT_INPUT_STATE',payload}))).toEqual({type:'AGENT_INPUT_STATE',payload});
  expect(()=>parseServerMessage(JSON.stringify({type:'AGENT_INPUT_STATE',payload:{...payload,outbox:[]}}))).toThrow();
  expect(toAgentPresentationProjectionMessage({type:'AGENT_INPUT_STATE',payload},'run')).toEqual({type:'AGENT_INPUT_STATE',payload});
  expect(toAgentProjectionMessage({type:'AGENT_INPUT_STATE',payload:{...payload,agent_run_id:'run',change_sequence:1}},'run')).toEqual({type:'AGENT_INPUT_STATE',payload});
 });
});

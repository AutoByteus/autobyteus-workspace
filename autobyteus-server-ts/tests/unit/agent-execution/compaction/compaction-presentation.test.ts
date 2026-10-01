import {describe,expect,it} from 'vitest';
import {AgentRunPresentationAdapter} from '../../../../src/agent-collaboration/execution/events/collaboration-agent-presentation-adapter.js';
import {projectAgentPresentationMessage} from '../../../../src/agent-collaboration/execution/events/agent-presentation-message-projector.js';
import {projectTeamAgentEventMessage} from '../../../../src/services/agent-streaming/team-agent-event-websocket-projector.js';
import {AgentRunEventType} from '../../../../src/agent-execution/domain/agent-run-event.js';
describe('coordinated direct compaction presentation contract',()=>{
 it.each([null,'codex'])('keeps provider-native identity %s separate from direct diagnostics',provider=>{
  const adapter=new AgentRunPresentationAdapter(()=>null);
  const result=adapter.adapt({eventType:AgentRunEventType.COMPACTION_STATUS,runId:'run',statusHint:null,payload:{phase:'completed',turn_id:'turn',compaction_operation_id:'op',compaction_invocation_id:'invoke',compaction_model_identifier:'model',summarizer_provider:'openai',completion_status:'unknown',summary_char_count:600,summary_token_count:160,provider}});
  expect(result.kind).toBe('publish');if(result.kind!=='publish')throw new Error('rejected');
  const message=projectAgentPresentationMessage(result.event);
  expect(message.payload).toMatchObject({provider,summarizer_provider:'openai',completion_status:'unknown',summary_token_count:160,compaction_operation_id:'op'});
  const team=projectTeamAgentEventMessage({agentRunId:'run',memberAddress:'/agent'} as any,result.event as any,7);
  expect(team.payload).toMatchObject({...message.payload,agent_run_id:'run',change_sequence:7});
  expect(message.payload).not.toHaveProperty('compaction_run_id');
 });
});

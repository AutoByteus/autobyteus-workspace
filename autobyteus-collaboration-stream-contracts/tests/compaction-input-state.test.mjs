import test from 'node:test';
import assert from 'node:assert/strict';
import { RootExecutionViewDtoSchema, CollaborationStreamServerMessageSchema } from '../dist/index.js';
const launch={runtimeKind:'autobyteus',llmModelIdentifier:'parent',llmConfig:null,autoExecuteTools:false,workspaceRootPath:null};
const block={operationId:'op',failureEpoch:1,position:{kind:'held_turn',turnId:'turn-A'},state:'awaiting_user',code:'failed',message:'retry required'};
const state={run_instance_id:'instance',revision:2,recoverableBlock:block,entries:[{sequence:1,message_id:'A',dedupe_key:'input:A',turn_id:'turn-A',state:'held',content:'real A',sender_type:'user',file_attachments:[]}]};
const snapshot=()=>({root_subject_kind:'agent_org',root_run_id:'org',root_org:{
 base_change_sequence:0,is_active:true,
 execution_tree:{subjectKind:'agent_org',createdAt:'2026-09-01',archivedAt:null,applicationBinding:null,handoffs:[],rootOrg:{address:'/',orgDefinitionId:'definition',orgDefinitionName:'Org',orgRunId:'org',defaultLaunchConfiguration:launch,collaborators:[],members:[{address:'/worker',agentDefinitionId:'worker',role:null,description:null,agentRunId:'run',platformAgentRunId:null,launchConfiguration:launch}],taskExecutions:[]}},
 communication_messages:{schemaVersion:1,subjectKind:'agent_org',orgRunId:'org',messages:[]},
 agent_statuses:[{member_address:'/worker',agent_run_id:'run',status:'error',trigger:null,tool_name:null,error_message:null,error_details:null,recoverableBlock:block}],
 agent_input_states:[{agent_run_id:'run',state:structuredClone(state)}],
}});
test('current versionless Org snapshot carries exact live held/queued state',()=>{
 const value=snapshot();const parsed=RootExecutionViewDtoSchema.parse(value);assert.deepEqual(parsed,value);
 assert.deepEqual(CollaborationStreamServerMessageSchema.parse({type:'ROOT_EXECUTION_VIEW_SNAPSHOT',payload:value}).payload,value);
 const next=snapshot();next.root_org.agent_input_states[0].state.recoverableBlock.position={kind:'next_turn',failedTurnId:'A-completed'};
 next.root_org.agent_input_states[0].state.entries=[];
 assert.equal(RootExecutionViewDtoSchema.parse(next).root_org.agent_input_states[0].state.recoverableBlock.position.kind,'next_turn');
});
test('rejects duplicate/unowned input projections and missing live input field',()=>{
 const duplicate=snapshot();duplicate.root_org.agent_input_states.push(duplicate.root_org.agent_input_states[0]);
 assert.throws(()=>RootExecutionViewDtoSchema.parse(duplicate),/input-state identity mismatch/);
 const foreign=snapshot();foreign.root_org.agent_input_states[0].agent_run_id='another-run';
 assert.throws(()=>RootExecutionViewDtoSchema.parse(foreign),/input-state identity mismatch/);
 const missing=snapshot();delete missing.root_org.agent_input_states;
 assert.throws(()=>RootExecutionViewDtoSchema.parse(missing));
});
test('live projection is strict and has no durable outbox or retired child fields',()=>{
 for(const mutate of [s=>s.root_org.agent_input_states[0].state.outbox=[],s=>s.root_org.agent_input_states[0].state.revision=-1,s=>s.root_org.agent_statuses[0].recoverableBlock.childRunId='child']){
  const value=snapshot();mutate(value);assert.throws(()=>RootExecutionViewDtoSchema.parse(value));
 }
});

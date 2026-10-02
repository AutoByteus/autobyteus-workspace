<template><main class="min-h-screen bg-slate-100 p-4 sm:p-8"><div class="mx-auto max-w-3xl space-y-6">
<h1 class="text-xl font-semibold">Compaction recovery — synthetic implementation preview</h1>
<div class="flex flex-wrap gap-2"><button class="rounded border bg-white p-2" @click="reset(false)">Held input</button><button class="rounded border bg-white p-2" @click="reset(true)">Answered input</button><button class="rounded border bg-white p-2" @click="repeatFailure=true">Fail next recovery</button><button class="rounded border bg-white p-2" @click="reset(false)">Reset preview</button></div>
<section class="space-y-5 rounded-xl border bg-white p-5">
<template v-for="(message,index) in context.conversation.messages" :key="index"><UserMessage v-if="message.type==='user'" :message="message" /><div v-else class="rounded-lg bg-slate-50 p-4 text-slate-800">{{ message.text }}</div></template>
</section>
<div class="rounded-xl border bg-white"><AgentUserInputTextArea :target="target" /></div>
<p class="text-xs text-slate-600">Synthetic state only. No provider, backend mutation or message delivery.</p>
</div></main></template>
<script setup lang="ts">
import {reactive,ref} from 'vue'
import UserMessage from '~/components/conversation/UserMessage.vue'
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue'
import {AgentContext} from '~/types/agent/AgentContext'
import {AgentRunState} from '~/types/agent/AgentRunState'
import {AgentStatus} from '~/types/agent/AgentStatus'
import {handleAgentInputState} from '~/services/agentStreaming/handlers/agentInputStateHandler'
import {beginLocalUserSubmission} from '~/services/runSubmission/localUserSubmission'
definePageMeta({layout:false})
const context=reactive(new AgentContext({agentDefinitionId:'fixture',agentDefinitionName:'Fixture'} as any,new AgentRunState('preview',{id:'preview',messages:[],createdAt:'',updatedAt:''} as any)))
let revision=0,serial=0,answered=false
const repeatFailure=ref(false)
const entry=(id:string,text:string,state:'held'|'queued'|'forwarded',sequence:number)=>({sequence,message_id:id,dedupe_key:id,turn_id:state==='queued'?null:`${id}-turn`,state,content:text,sender_type:'user' as const,file_attachments:[]})
const project=(entries:any[],state:'awaiting_user'|'recovering'|null)=>handleAgentInputState({run_instance_id:'preview-instance',revision:++revision,entries,recoverableBlock:state?{operationId:'preview-operation',failureEpoch:1,position:answered?{kind:'next_turn',failedTurnId:'A-turn'}:{kind:'held_turn',turnId:'A-turn'},state,code:'fixture',message:'Synthetic compaction failure'}:null},context)
function reset(isAnswered:boolean){answered=isAnswered;repeatFailure.value=false;context.requirement='';context.submissionPending=false;context.state.conversation.messages=[];beginLocalUserSubmission(context,{text:'A: Continue the audit-only plan. Do not deploy.',attachments:[],navigationTarget:null,identity:{messageId:'A',dedupeKey:'A'}});context.submissionPending=false;if(answered)context.conversation.messages.push({type:'ai',text:'The audit inventory is complete. Implementation remains unapproved.',isComplete:true,segments:[],timestamp:new Date()});project(answered?[]:[entry('A','A: Continue the audit-only plan. Do not deploy.','held',1)],'awaiting_user')}
const target={key:'preview',context,draftOwner:null,access:'live' as const,async send(){const id=`B${++serial}`,text=context.requirement;beginLocalUserSubmission(context,{text,attachments:[],navigationTarget:null,identity:{messageId:id,dedupeKey:id}});context.submissionPending=false;const entries=answered?[]:[entry('A','A: Continue the audit-only plan. Do not deploy.','forwarded',1)];entries.push(entry(id,text,'queued',serial+1));project(entries,'recovering');await new Promise(r=>setTimeout(r,1800));if(repeatFailure.value){repeatFailure.value=false;project(entries.map(e=>e.message_id==='A'?{...e,state:'held'}:e),'awaiting_user')}else{project([],null);context.state.currentStatus=AgentStatus.Idle;context.conversation.messages.push({type:'ai',text:'Recovery completed for this preview. Original input was not duplicated.',isComplete:true,segments:[],timestamp:new Date()})}},interrupt(){project([],null);context.state.currentStatus=AgentStatus.Idle}}
reset(false)
</script>

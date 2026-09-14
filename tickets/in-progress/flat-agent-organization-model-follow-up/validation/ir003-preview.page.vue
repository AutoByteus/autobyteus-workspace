<template>
  <main class="h-screen bg-slate-100 p-5 flex flex-col gap-4">
    <h1 class="text-xl font-semibold">Task approval hydration — isolated transport preview</h1>
    <p>No backend or provider connected. Actual Team owner, inspection, tool component and command path.</p>
    <button class="border rounded bg-white p-2 self-start" @click="selectTask">Inspect task with pending approval</button>
    <p>Focused: {{ team?.view.getFocusedAgentRunId() }} · {{ inspection }} · Commands: {{ commands.length }}</p>
    <textarea v-if="context" v-model="context.requirement" aria-label="Retained task draft" class="border rounded p-2" />
    <section v-if="selected" class="bg-white p-4 rounded border space-y-4">
      <h2 class="font-semibold">Task worker</h2>
      <p v-for="(message, index) in context!.conversation.messages" :key="index">{{ message.text }}</p>
      <ToolCallIndicator v-for="tool in tools" :key="tool.invocationId" :presentation="buildToolCardPresentation(tool)" />
    </section>
    <pre class="whitespace-pre-wrap text-sm">{{ commands.join('\n') }}</pre>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, shallowRef } from 'vue'
import { buildTestTeamContext, testAgentNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { inspectMountedTeamMember } from '~/services/runOpen/teamMemberInspectionCoordinator'
import { isProjectableToolSegment } from '~/services/agentStreaming/handlers/toolActivityProjection'
import { buildToolCardPresentation } from '~/utils/toolCardPresentation'
import ToolCallIndicator from '~/components/conversation/ToolCallIndicator.vue'
import { BOUND_APOLLO_CLIENT_KEY } from '~/plugins/30.apollo.client'
const ROOT='preview-approval-team', TASK='preview-task', INV='preview-submit'
const app=useNuxtApp(), contexts=useAgentTeamContextsStore(), runs=useAgentTeamRunStore(), selection=useAgentSelectionStore()
const team=shallowRef<any>(), inspection=ref('not inspected'), commands=ref<string[]>([])
const context=computed(()=>team.value?.view.getAgentContext(TASK))
const selected=computed(()=>team.value?.view.getFocusedAgentRunId()===TASK)
const tools=computed(()=>context.value?.conversation.messages.flatMap((m:any)=>m.type==='ai'?m.segments.filter(isProjectableToolSegment):[])??[])
let seq=0
const emit=(type:string,payload:any)=>FixtureSocket.latest.onmessage?.({data:JSON.stringify({type,payload})})
class FixtureSocket {
 static OPEN=1;static CONNECTING=0;static latest:FixtureSocket
 readyState=1;onopen:any;onclose:any;onmessage:any;onerror:any
 constructor() {FixtureSocket.latest=this;setTimeout(()=>this.onopen?.(),0)}
 close() {this.readyState=3;this.onclose?.({code:1000,reason:'preview closed'})}
 send(wire:string) {commands.value.push(wire);const msg=JSON.parse(wire);if(msg.type==='APPROVE_TOOL') {
 emit('TOOL_APPROVED',{change_sequence:++seq,agent_run_id:TASK,invocation_id:INV,tool_name:'submit_task_result',turn_id:'turn',reason:null})
 }}
}
const originalSocket=globalThis.WebSocket, originalApollo=(app as any)[BOUND_APOLLO_CLIENT_KEY]
const selectTask=async()=>{const result=await inspectMountedTeamMember({teamRunId:ROOT,agentRunId:TASK,commit:()=>selection.selectRun(ROOT,'team')});inspection.value=result.disposition}
onMounted(async()=>{
 globalThis.WebSocket=FixtureSocket as any
 ;(app as any)[BOUND_APOLLO_CLIENT_KEY]={query:async({variables}:any)=>({data:{getTeamMemberRunProjection:{agentRunId:variables.agentRunId,
 conversation:[{kind:'message',role:'assistant',content:'Historical task work is retained alongside the live decision.',ts:1700000000},{kind:'tool_call_pending',invocationId:INV,toolName:'submit_task_result',toolArgs:{message:'old history args'},ts:1700000001}],
 activities:[{kind:'tool',invocationId:INV,toolName:'submit_task_result',status:'parsed',arguments:{message:'old history args'},ts:1700000001}],hasEarlierActiveTraceEvents:false}}})}
 const raw=buildTestTeamContext({teamRunId:ROOT,coordinatorAddress:'/lead',focusedAgentRunId:'lead',rootChildren:[testAgentNode('/lead',{agentRunId:'lead',autoExecuteTools:false}),testAgentNode('/worker',{agentRunId:'worker',autoExecuteTools:false})]})
 contexts.teams=new Map([[ROOT,raw]]);team.value=contexts.getTeamContextById(ROOT);selection.selectRun(ROOT,'team');runs.connectToTeamStream(ROOT)
 setTimeout(()=>{
 emit('CONNECTED',{session_id:'preview',root_team_run_id:ROOT})
 emit('TEAM_EXECUTION_VIEW_SNAPSHOT',{root_team_run_id:ROOT,base_change_sequence:0,execution_tree:team.value.view.getExecutionTree(),tasks:[],messages:[],agent_statuses:team.value.view.listAgentContextEntries().map((e:any)=>({agent_run_id:e.agentRunId,member_address:e.memberAddress,status:'idle',trigger:null,tool_name:null,error_message:null,error_details:null}))})
 emit('TASK_DELEGATION_EVENT',{event_type:'TASK_AGENT_ACTIVATED',change_sequence:++seq,parent_team_run_id:ROOT,execution:{kind:'task_agent',address:'/worker',agent_run_id:TASK,platform_agent_run_id:null,started_at:'2026-09-14T10:00:00Z',settled_at:null},task:testTaskRecord({taskId:'task-1',delegatorAgentRunId:'lead',recipientAddress:'/worker',target:{agentRunId:TASK}})})
 emit('TOOL_APPROVAL_REQUESTED',{change_sequence:++seq,agent_run_id:TASK,invocation_id:INV,tool_name:'submit_task_result',turn_id:'turn',arguments:{message:'Actual completed task result'}})
 context.value.requirement='Retain this draft'
 },100)
})
onBeforeUnmount(()=>{runs.disconnectTeamStream(ROOT);globalThis.WebSocket=originalSocket;(app as any)[BOUND_APOLLO_CLIENT_KEY]=originalApollo})
</script>

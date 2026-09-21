<template>
  <main class="flex h-screen flex-col bg-slate-50 text-slate-900">
    <header class="flex shrink-0 flex-wrap items-center gap-2 border-b p-2 text-xs">
      <strong>IR-047 · isolated flat Team publication</strong>
      <button v-for="row in rows" :key="row.agentRunId" class="rounded border p-2" :data-run="row.agentRunId"
        @click="team?.view.focusAgent(row.agentRunId!)">{{ row.agentRunId }} · {{ row.currentStatus }}</button>
      <span data-test="sequence">Sequence: {{ team?.view.getChangeSequence() }}</span>
    </header>
    <div class="min-h-0 flex-1"><TeamWorkspaceView /></div>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef, watchEffect } from 'vue'
import TeamWorkspaceView from '~/components/workspace/team/TeamWorkspaceView.vue'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useActiveContextStore } from '~/stores/activeContextStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { TeamStreamingService } from '~/services/agentStreaming/TeamStreamingService'
import { buildTestTeamContext, testAgentNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures'
import { collectAgentExecutionLocations } from '~/services/teamExecution/teamExecutionTreeSelectors'
import { parseTeamStreamServerMessage } from '@autobyteus/team-stream-contracts'
definePageMeta({layout:false})
const store=useAgentTeamContextsStore(), selection=useAgentSelectionStore(), active=useActiveContextStore()
const history=useRunHistoryStore()
// Isolate external history I/O; all publication/selection/input/monitor owners are real.
history.refreshRunNavigationTopology=async()=>undefined
history.reconcileFocusedTeamMemberProjection=async()=>undefined
const team=computed(()=>store.getTeamContextById('flat-team'))
const rows=computed(()=>team.value?.view.listNavigationRows().filter(r=>r.agentRunId)??[])
const callbacks=new Map<string,(value:any)=>void>(),sent:any[]=[],witnesses:any[]=[]
const service=new TeamStreamingService('ws://render.invalid/team',{wsClient:{state:'connected',
  connect(){},disconnect(){},send(value:any){sent.push(value)},on(event:string,callback:any){callbacks.set(event,callback)},off(){}} as any})
const execution=(id:string)=>({kind:'task_agent',address:'/verifier',agent_run_id:id,platform_agent_run_id:null,started_at:'2026-08-10T12:00:01.000Z',settled_at:null})
const task=(id:string)=>testTaskRecord({taskId:`task-${id}`,delegatorAgentRunId:'lead',recipientAddress:'/verifier',target:{agentRunId:id},description:`Verify ${id}`})
const status=(id:string,state='idle')=>({agent_run_id:id,status:state,trigger:null,tool_name:null,error_message:null,error_details:null})
const emit=(type:string,payload:any)=>{const wire=JSON.stringify({type,payload});parseTeamStreamServerMessage(wire);callbacks.get('onMessage')!(wire)}
const snapshot=(ids:string[],base=0)=>{const tree=structuredClone(team.value!.view.getExecutionTree());tree.root_team.task_executions=ids.map(execution) as any;return {root_team_run_id:'flat-team',base_change_sequence:base,execution_tree:tree,tasks:ids.map(task),messages:[],agent_statuses:['lead','configured-verifier',...ids].map(id=>({...status(id),member_address:id==='lead'?'/lead':'/verifier'}))}}
let stop=()=>{}
onMounted(()=>{
 store.teams=new Map([['flat-team',buildTestTeamContext({teamRunId:'flat-team',coordinatorAddress:'/lead',focusedAgentRunId:'lead',rootChildren:[testAgentNode('/lead',{agentRunId:'lead'}),testAgentNode('/verifier',{agentRunId:'configured-verifier'})]})]])
 selection.selectRun('flat-team','team');service.connect('flat-team',team.value!)
 emit('CONNECTED',{session_id:'initial',root_team_run_id:'flat-team'});emit('TEAM_EXECUTION_VIEW_SNAPSHOT',snapshot([]))
 const lead=team.value!.view.getAgentContext('lead')
 stop=watchEffect(()=>{const view=team.value!.view;witnesses.push({sequence:view.getChangeSequence(),entries:view.listAgentContextEntries().map(e=>e.agentRunId).sort(),tree:collectAgentExecutionLocations(view.getExecutionTree()).map(e=>e.agentRunId).sort(),tasks:view.listTaskHistoryRows().map(t=>t.targetAgentRunId).sort()})},{flush:'sync'})
 ;(window as any).__ir047={
  activate(){emit('TASK_DELEGATION_EVENT',{event_type:'TASK_AGENT_ACTIVATED',change_sequence:1,parent_team_run_id:'flat-team',task:task('fresh-verifier'),execution:execution('fresh-verifier')});emit('AGENT_STATUS',{...status('fresh-verifier','running'),change_sequence:2})},
  present(){emit('MEMBER_INPUT_MESSAGE',{change_sequence:3,recipient_agent_run_id:'fresh-verifier',message_id:'input-1',dedupe_key:'input-1',content:'Exact task input',input_origin:'inter_agent_delivery',received_at:'2026-08-10T12:00:02.000Z',context_file_paths:[],sender_agent_run_id:'lead',parent_communication_message_id:'communication-1'})},
  snapshot(){service.disconnect();service.connect('flat-team',team.value!);emit('CONNECTED',{session_id:'replacement',root_team_run_id:'flat-team'});emit('TEAM_EXECUTION_VIEW_SNAPSHOT',snapshot(['fresh-verifier','fresh-second'],7));emit('AGENT_STATUS',{...status('fresh-second','running'),change_sequence:8})},
  state(){const v=team.value!.view;return {sequence:v.getChangeSequence(),recovery:v.needsStreamRecovery(),focused:v.getFocusedAgentRunId(),sameLead:v.getAgentContext('lead')===lead,draft:lead!.requirement,rows:v.listNavigationRows(),witnesses,sent}},
 }
})
onUnmounted(()=>{stop();service.disconnect()})
</script>

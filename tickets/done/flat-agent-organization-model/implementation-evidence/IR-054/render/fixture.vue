<template>
  <main class="flex h-screen flex-col bg-slate-50 text-slate-900">
    <header class="flex shrink-0 flex-wrap items-center gap-2 border-b p-2 text-xs">
      <strong>IR-054 · isolated history status</strong>
      <button v-for="id in ['lead','first','repeat','live-task']" :key="id" class="rounded border p-2" :data-run="id" @click="inspect(id)">{{ id }}</button>
      <button class="rounded border p-2" data-test="ready" @click="ready">Deliver strict live snapshot</button>
    </header>
    <div class="min-h-0 flex-1"><TeamWorkspaceView /></div>
  </main>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import TeamWorkspaceView from '~/components/workspace/team/TeamWorkspaceView.vue'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useActiveContextStore } from '~/stores/activeContextStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { reconcileDiscoveredActiveRuns } from '~/stores/runHistoryLoadActions'
import { inspectMountedTeamMember } from '~/services/runOpen/teamMemberInspectionCoordinator'
import { TeamStreamingService } from '~/services/agentStreaming/TeamStreamingService'
import { buildRetainedTeamHistoryFixture, HISTORY_TEAM_ROOT as ROOT } from '~/test-support/retainedTeamHistoryFixture'
import { parseTeamStreamServerMessage } from '@autobyteus/team-stream-contracts'
definePageMeta({layout:false})
const contexts=useAgentTeamContextsStore(), selection=useAgentSelectionStore(), active=useActiveContextStore(), history=useRunHistoryStore(), runs=useAgentTeamRunStore()
const fixture=buildRetainedTeamHistoryFixture(), callbacks=new Map<string,(wire:string)=>void>(),sent:any[]=[]
history.refreshRunNavigationTopology=async()=>undefined
history.reconcileFocusedTeamMemberProjection=async()=>undefined
const service=new TeamStreamingService('ws://render.invalid',{wsClient:{state:'connected',connect(){},disconnect(){},send(value:any){sent.push(value)},on(event:string,cb:any){callbacks.set(event,cb)},off(){}} as any})
runs.isTeamStreamReady=()=>service.isReady
runs.isTeamStreamReopenRequired=()=>service.isReopenRequired
runs.connectToTeamStream=()=>undefined
const emit=(frame:any)=>{const wire=JSON.stringify(frame);parseTeamStreamServerMessage(wire);callbacks.get('onMessage')!(wire)}
const ready=()=>{emit({type:'CONNECTED',payload:{session_id:'render',root_team_run_id:ROOT}});emit(fixture.snapshot)}
const inspect=async(id:string)=>{const result=await inspectMountedTeamMember({teamRunId:ROOT,agentRunId:id,commit:()=>{}});if(result.disposition!=='committed')throw new Error(result.message)}
onMounted(async()=>{
 contexts.teams=new Map([[ROOT,fixture.team]]);selection.selectRun(ROOT,'team');service.connect(ROOT,contexts.getTeamContextById(ROOT)!)
 await reconcileDiscoveredActiveRuns({workspaceGroups:[{workspaceRootPath:'/fixture',workspaceName:'fixture',agentDefinitions:[],teamDefinitions:[{teamDefinitionId:'test-team-definition',teamDefinitionName:'History Team',runs:[{teamRunId:ROOT,isActive:true}]}]}]} as any)
 ;(window as any).__ir054={state(){const view=contexts.getTeamContextById(ROOT)!.view;return {ready:service.isReady,sequence:view.getChangeSequence(),focus:view.getFocusedAgentRunId(),access:active.activeWorkspaceTarget?.access,hasInteraction:'interaction' in (active.activeWorkspaceTarget??{}),statuses:Object.fromEntries(view.listAgentContextEntries().map(e=>[e.agentRunId,e.agentContext.state.currentStatus])),rows:view.listNavigationRows(),rootActive:view.isRootTeamActive(),sent,recovery:view.needsStreamRecovery()}}}
})
onUnmounted(()=>service.disconnect())
</script>

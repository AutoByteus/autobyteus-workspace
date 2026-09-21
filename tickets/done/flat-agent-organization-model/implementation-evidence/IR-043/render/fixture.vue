<template>
  <main class="flex h-screen flex-col bg-slate-50 text-slate-900">
    <header class="flex shrink-0 flex-wrap items-center gap-2 border-b p-2 text-xs">
      <strong>IR-043 · isolated retained Team inspection</strong>
      <span data-test="target-id">{{ target?.context.state.runId }} / {{ target?.access }}</span>
      <span data-test="root-active">Root active: {{ team?.view.isRootTeamActive() }}</span>
      <button data-test="back" class="rounded border p-2" @click="back">Back to lead</button>
    </header>
    <div v-if="target && 'team' in target" class="flex min-h-0 flex-1 flex-col lg:flex-row">
      <TeamWorkspaceSurface v-if="target.context.state.runId !== 'lead'" :target="target" class="min-h-0 min-w-0 flex-1" />
      <div v-if="target.context.state.runId !== 'lead'" class="h-48 shrink-0 lg:h-full lg:w-80"><ActivityFeed /></div>
      <div v-if="target.context.state.runId === 'lead'" class="min-h-0 w-full bg-white lg:ml-auto lg:w-[540px] lg:border-l">
        <CollaborationOverviewPanel :messages="target.collaborationMessages" :tasks="target.collaborationTasks" />
      </div>
    </div>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, provide } from 'vue'
import { createMemoryHistory, createRouter, routerKey } from 'vue-router'
import ActivityFeed from '~/components/progress/ActivityFeed.vue'
import TeamWorkspaceSurface from '~/components/workspace/team/TeamWorkspaceSurface.vue'
import CollaborationOverviewPanel from '~/components/workspace/collaboration/CollaborationOverviewPanel.vue'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useActiveContextStore } from '~/stores/activeContextStore'
import { openWorkspaceExecutionLink } from '~/services/workspace/workspaceNavigationService'
import { buildTestTeamContext, testAgentNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures'
definePageMeta({ layout: false })
const navigation = createRouter({history:createMemoryHistory(),routes:[{path:'/workspace',component:{template:'<div />'}}]})
provide(routerKey,navigation)
const contexts=useAgentTeamContextsStore()
const active=useActiveContextStore()
const target=computed(()=>active.activeWorkspaceTarget)
const team=computed(()=>contexts.getTeamContextById('render-team'))
const back=async()=>{await openWorkspaceExecutionLink({kind:'team',teamRunId:'render-team',agentRunId:'lead'})}
onMounted(async()=>{
  const root=buildTestTeamContext({teamRunId:'render-team',coordinatorAddress:'/lead',isActive:true,
    rootChildren:[testAgentNode('/lead',{agentRunId:'lead'}),testAgentNode('/verifier',{agentRunId:'configured-verifier'})],
    tasks:['task-verifier-one','task-verifier-two'].map(id=>testTaskRecord({taskId:id,delegatorAgentRunId:'lead',recipientAddress:'/verifier',target:{agentRunId:id},status:'accepted',description:'Verify the published report',updates:[
      {kind:'submission',submission_id:`result-${id}`,message:'Verification complete for this exact assignment.',reference_files:[],created_at:'2026-09-01T00:03:00.000Z'},
      {kind:'review',review_id:`review-${id}`,reviewed_submission_id:`result-${id}`,decision:'accept',comment:null,reference_files:[],created_at:'2026-09-01T00:04:00.000Z'},
    ]})),
    taskExecutions:['task-verifier-one','task-verifier-two'].map(id=>({kind:'task_agent',address:'/verifier',agent_run_id:id,platform_agent_run_id:null,started_at:'2026-09-01T00:02:00.000Z',settled_at:'2026-09-01T00:05:00.000Z'})),
  })
  contexts.addTeamContext(root)
  useAgentSelectionStore().selectRun('render-team','team')
  await navigation.push('/workspace')
})
</script>

<template>
  <main class="flex h-screen flex-col bg-slate-50 text-slate-900">
    <header class="flex shrink-0 flex-wrap items-center gap-2 border-b p-2 text-xs">
      <strong>IR-042 · isolated cold navigation</strong>
      <span data-test="history-count">History rows: {{ history.agentOrgHistory.length }}</span>
      <span data-test="target-id">{{ target?.context.state.runId }} / {{ target?.access }}</span>
      <button data-test="back" class="rounded border p-2" @click="navigation.back()">Back</button>
    </header>
    <div v-if="target" class="flex min-h-0 flex-1">
      <div v-if="target.context.state.runId !== 'agent-director'" class="min-w-0 flex-1">
        <TeamWorkspaceSurface v-if="'team' in target" :target="target" />
        <AgentWorkspaceSurface v-else :target="target" />
      </div>
      <div v-else class="min-h-0 w-full bg-white lg:ml-auto lg:w-[540px] lg:border-l">
        <CollaborationOverviewPanel :messages="target.collaborationMessages" :tasks="target.collaborationTasks" />
      </div>
    </div>
    <div v-else>Waiting for synthetic stream</div>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, provide, shallowReactive, watch } from 'vue'
import { createMemoryHistory, createRouter, routerKey, routeLocationKey } from 'vue-router'
import AgentWorkspaceSurface from '~/components/workspace/agent/AgentWorkspaceSurface.vue'
import TeamWorkspaceSurface from '~/components/workspace/team/TeamWorkspaceSurface.vue'
import CollaborationOverviewPanel from '~/components/workspace/collaboration/CollaborationOverviewPanel.vue'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
definePageMeta({ layout: false })
const navigation = createRouter({history:createMemoryHistory(),routes:[{path:'/workspace',component:{template:'<div />'}}]})
const exactRoute=shallowReactive({path:'/workspace',query:{rootSubjectKind:'agent_org',orgRunId:'org-run',mode:'active',memberAddress:'/director'}})
provide(routerKey,navigation)
provide(routeLocationKey,exactRoute as any)
const history=useRunHistoryStore()
const contexts=useAgentOrgContextsStore()
const target=computed(()=>contexts.contextFor('org-run')?.activeTarget())
watch(navigation.currentRoute,next=>{
  exactRoute.query=next.query as any
  contexts.select('org-run',next.query.agentRunId ? {kind:'agent_execution',agentRunId:String(next.query.agentRunId)} : '/director')
})
onMounted(async()=>{
  await navigation.push({path:'/workspace',query:exactRoute.query})
  contexts.select('org-run','/director')
  contexts.connect('org-run')
})
onBeforeUnmount(()=>contexts.disconnect('org-run'))
</script>

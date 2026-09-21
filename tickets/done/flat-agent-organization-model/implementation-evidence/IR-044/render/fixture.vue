<template>
  <main class="flex h-screen flex-col bg-slate-50 text-slate-900">
    <header class="flex shrink-0 flex-wrap items-center gap-2 border-b p-2 text-xs">
      <strong>IR-044 · isolated Org composer</strong>
      <button class="rounded border p-2" data-test="direct" @click="select('agent-director')">Direct Agent</button>
      <button class="rounded border p-2" data-test="mounted" @click="select('agent-team-worker-configured')">Mounted Team Agent</button>
      <span data-test="identity">{{ target?.context.state.runId }}</span>
      <span data-test="pending">Pending: {{ target?.context.submissionPending }}</span>
    </header>
    <div v-if="target" class="min-h-0 flex-1">
      <TeamWorkspaceSurface v-if="'team' in target" :target="target" />
      <AgentWorkspaceSurface v-else :target="target" />
    </div>
    <div v-else class="p-4">Preparing synthetic current root…</div>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, watchEffect } from 'vue'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useActiveContextStore } from '~/stores/activeContextStore'
import AgentWorkspaceSurface from '~/components/workspace/agent/AgentWorkspaceSurface.vue'
import TeamWorkspaceSurface from '~/components/workspace/team/TeamWorkspaceSurface.vue'
definePageMeta({layout:false})
const orgs=useAgentOrgContextsStore()
const active=useActiveContextStore()
const target=computed(()=>active.activeWorkspaceTarget)
const select=(agentRunId:string)=>orgs.contextFor('org-run')?.select({kind:'agent_execution',agentRunId})
watchEffect(()=>{const org=orgs.contextFor('org-run');if(org&&!org.selection)select('agent-director')})
onMounted(()=>{
  ;(window as any).__ir044=()=>Object.fromEntries((orgs.contextFor('org-run')?.listAgentContextEntries()??[]).map(({agentRunId,context})=>[agentRunId,{draft:context.requirement,pending:context.submissionPending,messages:context.conversation.messages}]))
  orgs.connect('org-run')
})
onUnmounted(()=>orgs.disconnect('org-run'))
</script>

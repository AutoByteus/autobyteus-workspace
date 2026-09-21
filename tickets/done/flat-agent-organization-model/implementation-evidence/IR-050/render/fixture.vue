<template>
  <main class="flex h-screen flex-col bg-slate-50 text-slate-900">
    <header class="flex shrink-0 flex-wrap items-center gap-2 border-b p-2 text-xs">
      <strong>IR-050 · exact Org context files</strong>
      <button class="rounded border p-2" data-test="direct" @click="select('agent-director')">Direct Agent</button>
      <button class="rounded border p-2" data-test="mounted" @click="select('agent-team-worker-configured')">Mounted Team Agent</button>
      <button class="rounded border p-2" data-test="stop" @click="stop">Stop Org</button><span data-test="access">{{ target?.access }}</span>
      <button class="rounded border p-2" data-test="task" @click="select('agent-task-worker')">Exact task Agent</button><span data-test="identity">{{ target?.context.state.runId }}</span>
      <span data-test="phase">{{ orgs.contextFor('org-run')?.phase }}</span>
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
const stop=()=>orgs.stopAndInspect('org-run').catch(()=>undefined)
const target=computed(()=>active.activeWorkspaceTarget)
const select=(agentRunId:string)=>orgs.contextFor('org-run')?.select({kind:'agent_execution',agentRunId})
watchEffect(()=>{const org=orgs.contextFor('org-run');if(org&&!org.selection)select('agent-director')})
onMounted(()=>{
  ;(window as any).__ir048=()=>Object.fromEntries((orgs.contextFor('org-run')?.listAgentContextEntries()??[]).map(({agentRunId,context})=>[agentRunId,{draft:context.requirement,attachments:context.contextFilePaths,pending:context.submissionPending,messages:context.conversation.messages}]))
  ;(window as any).__ir048Context=()=>active.activeAgentContext
  orgs.openForInspection('org-run').catch(()=>undefined)
})
onUnmounted(()=>orgs.disconnect('org-run'))
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-8 text-slate-900">
    <h1 class="mb-2 text-lg font-semibold">Sidebar Stop — implementation preview</h1>
    <p class="mb-6 text-sm">Test-owned row props and contexts; no live workers or backend.</p>
    <section data-preview="surface" class="w-[340px] rounded-md bg-white p-3">
      <div class="mb-3 flex items-center justify-between text-sm">
        <span>Normal run color reference</span>
        <button data-preview="reference" type="button" class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Normal run color reference">
          <Icon icon="heroicons:stop-20-solid" class="h-3.5 w-3.5" />
        </button>
      </div>
      <WorkspaceTransientExecutionRow v-for="row in rows" :key="row.rowKey" :row="row" :stop-root="root" :has-children="true"
        :is-selected="selected === row.rowKey" :expanded="true" @select="selected = row.rowKey; selections++" @toggle="toggles++" />
    </section>
    <output class="mt-3 block text-xs" data-preview="counts">{{ selections }} selections / {{ toggles }} toggles</output>
  </main>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import WorkspaceTransientExecutionRow from '~/components/workspace/history/WorkspaceTransientExecutionRow.vue'
import { buildClosureContext } from '~/services/agentCollaboration/__tests__/agentRootClosureFixture'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
definePageMeta({ layout: false })
const root = { rootKind: 'AGENT' as const, rootRunId: 'host-run' }
const context = buildClosureContext()
for (const id of ['writer-run', 'rp-run', 'rb-run']) context.getAgentContext(id)!.state.currentStatus = AgentStatus.Running
useAgentRunCollaborationStore().contexts = { 'host-run': context }
const selected = ref(''), selections = ref(0), toggles = ref(0)
const rows: RunHistoryTransientExecutionRow[] = [
  { kind: 'transient_execution', transientKind: 'task_agent', rowKey: 'writer', teamRunId: 'host-run', memberAddress: '/computer_use_agent', agentRunId: 'writer-run', teamRunIdForNode: null, memberKind: 'agent', displayName: 'Writer copy', currentStatus: AgentStatus.Running, delegatedBy: 'pm', depth: 0, hasChildren: true },
  { kind: 'transient_execution', transientKind: 'task_team', rowKey: 'reviewers', teamRunId: 'host-run', memberAddress: '/product_team', agentRunId: null, teamRunIdForNode: 'review-team', memberKind: 'agent_team', displayName: 'Review Team copy', currentStatus: AgentStatus.Running, delegatedBy: 'pm', depth: 0, hasChildren: true },
]
</script>

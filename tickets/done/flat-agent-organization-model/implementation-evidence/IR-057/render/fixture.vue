<template>
  <main class="flex h-screen flex-col bg-white text-slate-900">
    <header class="border-b bg-slate-50 p-3 text-sm">IR057 · Controlled Restore/readiness inspection · {{ locale }} / {{ scenario }}</header>
    <AgentOrgWorkspaceView v-if="ready" class="min-h-0 flex-1" />
  </main>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import AgentOrgWorkspaceView from '~/components/workspace/org/AgentOrgWorkspaceView.vue'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { getApolloClient } from '~/utils/apolloClient'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useActiveContextStore } from '~/stores/activeContextStore'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
definePageMeta({ layout: false })
const route = useRoute(), store = useAgentOrgContextsStore(), active = useActiveContextStore()
const locale = route.query.locale === 'zh-CN' ? 'zh-CN' : 'en'
const scenario = String(route.query.scenario || 'restored')
const ready = ref(false)
const client = getApolloClient(), originalQuery = client.query, originalMutate = client.mutate
const NativeSocket = window.WebSocket
const calls: any[] = []
let initialContext: any, savedView: string | null = null
onMounted(async () => {
  await localizationRuntime.setPreference(locale)
  client.query = (async (input: any) => {
    const name = input.query.definitions[0].name.value
    calls.push({ kind: 'query', name, variables: input.variables })
    if (name === 'GetAgentOrgRunInspection') {
      if (scenario === 'cold') throw new Error('Controlled saved inspection unavailable')
      const view = taskBearingView(); view.is_active = false; view.agent_statuses = []
      return { data: { getAgentOrgRunInspection: { schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: view } } }
    }
    if (input.variables?.agentRunId) return { data: { getAgentOrgMemberRunProjection: { agentRunId: input.variables.agentRunId, memberAddress: input.variables.memberAddress, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }
    return { data: {} }
  }) as any
  client.mutate = (async (input: any) => {
    const name = input.mutation.definitions[0].name.value
    calls.push({ kind: 'mutation', name, variables: input.variables })
    if (name !== 'RestoreAgentOrgRun') throw new Error('Unexpected mutation')
    return { data: { restoreAgentOrgRun: { success: true, agentOrgRunId: 'org-run' } } }
  }) as any
  window.WebSocket = class extends NativeSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      if (String(url).includes('agent-org')) { calls.push({ kind: 'socket-failure', url: String(url) }); throw new Error('Controlled restored stream readiness unavailable') }
      super(url, protocols)
    }
  }
  ;(window as any).__ir057 = {
    capture() { initialContext = active.activeAgentContext; savedView = JSON.stringify(store.contextFor('org-run')?.view) },
    state() { const org = store.contextFor('org-run'); return { calls, phase: org?.phase, lastKnownActive: org?.isActive, selection: org?.selection, address: org?.selectedAddress, exactContextRetained: active.activeAgentContext === initialContext, snapshotUnchanged: JSON.stringify(org?.view) === savedView, error: store.errorFor('org-run'), access: active.activeWorkspaceTarget?.access, draft: active.activeAgentContext?.requirement, pending: active.activeAgentContext?.submissionPending, messages: active.activeAgentContext?.conversation.messages, mode: route.query.mode, recoveryText: localizationRuntime.translate('workspace.agentOrg.recovery.exhausted'), coldText: localizationRuntime.translate('workspace.agentOrg.inspectionUnavailable') } },
  }
  ready.value = true
})
onBeforeUnmount(() => { client.query = originalQuery; client.mutate = originalMutate; window.WebSocket = NativeSocket })
</script>

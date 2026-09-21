<template>
  <main class="flex min-h-screen flex-col bg-white text-slate-900">
    <header class="border-b bg-slate-50 p-2 text-xs">IR058 · Controlled transport / real history projection · {{ address }}</header>
    <div v-if="ready" class="flex min-h-0 flex-1 flex-col sm:flex-row">
      <aside class="max-h-[45vh] overflow-auto border-b p-2 sm:max-h-none sm:w-80 sm:flex-none sm:border-r">
        <WorkspaceAgentOrgHistoryCollection v-for="node in history.getTreeNodes()" :key="node.stableKey" :workspace-id="node.workspaceId" :groups="node.agentOrgDefinitions" :state="state" :actions="actions" />
      </aside>
      <AgentOrgWorkspaceView class="h-[760px] min-w-0 flex-1" />
    </div>
  </main>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorkspaceAgentOrgHistoryCollection from '~/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue'
import AgentOrgWorkspaceView from '~/components/workspace/org/AgentOrgWorkspaceView.vue'
import type { WorkspaceHistorySectionActions, WorkspaceHistorySectionState } from '~/components/workspace/history/workspaceHistorySectionContracts'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { getApolloClient } from '~/utils/apolloClient'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useAgentOrgRunStore } from '~/stores/agentOrgRunStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { parseAgentOrgHistoryItems } from '~/stores/runHistoryStoreSupport'
import { useWorkspaceHistorySubjectActions } from '~/composables/useWorkspaceHistorySubjectActions'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
definePageMeta({ layout: false })
const route = useRoute(), router = useRouter(), history = useRunHistoryStore(), orgs = useAgentOrgContextsStore(), runs = useAgentOrgRunStore()
const subject = useWorkspaceHistorySubjectActions(), nodeStore = useWindowNodeContextStore()
const address = String(route.query.memberAddress || '/director'), scenario = String(route.query.scenario || 'success')
const ready = ref(false), calls: any[] = []
const client = getApolloClient(), originalQuery = client.query, originalMutate = client.mutate
const originalReplace = router.replace.bind(router), originalReady = nodeStore.waitForBoundBackendReady
const NativeSocket = window.WebSocket
const deferred = () => { let resolve: any, reject: any; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const old = deferred(), fresh = deferred(), stop = deferred()
let held = false, stopped = false, refreshes = 0, originalContext: any, originalConversation = '', initialSelection: any
const response = () => ({ data: { listCollaborationRootHistory: [{ root_subject_kind: 'agent_org', root_run_id: 'org-run', created_at: '2026-09-01T00:00:00.000Z', archived_at: null, is_active: true, summary: 'Keep this exact conversation', org: taskBearingView().execution_tree }] } })
class Socket {
  static OPEN = 1; static CONNECTING = 0; static instances: Socket[] = []
  readyState = 1; onmessage: any = null; onclose: any = null; onerror: any = null; sent: string[] = []
  constructor() { Socket.instances.push(this) }
  send(value: string) { this.sent.push(value) }
  close() { this.readyState = 3; this.onclose?.() }
  emit(message: unknown) { this.onmessage?.({ data: JSON.stringify(message) }) }
}
const state = {
  isAgentOrgDefinitionExpanded: () => true, isAgentOrgRunExpanded: () => true, isAgentOrgTeamExpanded: () => true,
  isAgentOrgRunSelected: (id: string) => id === String(route.query.orgRunId),
  isAgentOrgMemberSelected: (_id: string, member: string) => member === orgs.contextFor('org-run')?.selectedAddress,
  isAgentOrgTerminating: (id: string) => Boolean(orgs.operations[id]) || runs.terminatingRunIds.has(id),
  agentOrgTerminationError: (id: string) => runs.terminationErrors[id] ?? orgs.errorFor(id), agentOrgContextFor: orgs.contextFor,
} as WorkspaceHistorySectionState
const actions = { onTerminateAgentOrg: async (run) => {
  try { await subject.execute({ rootSubjectKind: 'agent_org', rootRunId: run.rootRunId, action: 'stop' }) }
  catch (error) { calls.push({ kind: 'stop-error', message: String(error) }) }
} } as WorkspaceHistorySectionActions
onMounted(async () => {
  await localizationRuntime.setPreference('en')
  nodeStore.waitForBoundBackendReady = async () => true
  router.replace = ((location: any) => originalReplace({ ...location, path: '/ir058-activity' })) as any
  window.WebSocket = Socket as any
  client.query = (async (input: any) => {
    const name = input.query.definitions[0].name.value
    calls.push({ kind: 'query', name, variables: input.variables })
    if (name === 'ListCollaborationRootHistory') return held ? (++refreshes === 1 ? old.promise : fresh.promise) : response()
    if (name === 'GetAgentOrgRunInspection') {
      const view = taskBearingView(); if (stopped) { view.is_active = false; view.agent_statuses = [] }
      return { data: { getAgentOrgRunInspection: { schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: view } } }
    }
    if (input.variables?.agentRunId) return { data: { getAgentOrgMemberRunProjection: {
      agentRunId: input.variables.agentRunId, memberAddress: input.variables.memberAddress,
      conversation: [{ kind: 'message', role: 'user', content: `Retained conversation for ${input.variables.memberAddress}`, ts: 1700000000 }], activities: [], hasEarlierActiveTraceEvents: false,
    } } }
    return { data: {} }
  }) as any
  client.mutate = (async (input: any) => {
    calls.push({ kind: 'mutation', name: input.mutation.definitions[0].name.value, variables: input.variables })
    return stop.promise
  }) as any
  history.agentOrgHistory = parseAgentOrgHistoryItems(response().data.listCollaborationRootHistory)
  await orgs.openForInspection('org-run')
  const socket = Socket.instances[0]!
  socket.emit({ type: 'CONNECTED', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', session_id: 'session' } })
  socket.emit({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', schema_version: 1, root_org: taskBearingView() } })
  ;(window as any).__ir058 = {
    capture() { const org = orgs.contextFor('org-run')!; originalContext = org.selectedTarget()!.context; originalConversation = JSON.stringify(originalContext.conversation.messages); initialSelection = org.selection; held = true; void history.refreshAgentOrgHistory() },
    confirm() { stopped = scenario === 'success'; stop.resolve({ data: { terminateAgentOrgRun: { success: stopped, message: stopped ? null : 'Stop rejected' } } }) },
    releaseOld() { old.resolve(response()) }, failFresh() { fresh.reject(new Error('Follow-up history unavailable')) },
    state() { const org = orgs.contextFor('org-run'), ctx = org?.selectedTarget()?.context; return { calls, refreshes, phase: org?.phase, active: org?.isActive, address: org?.selectedAddress, selection: org?.selection, selectionRetained: JSON.stringify(org?.selection) === JSON.stringify(initialSelection), exactContextRetained: ctx === originalContext, conversationRetained: JSON.stringify(ctx?.conversation.messages) === originalConversation, status: ctx?.state.currentStatus, draft: ctx?.requirement, mode: route.query.mode, rootRunId: route.query.orgRunId, pending: Boolean(orgs.operations['org-run']), historyError: history.historyFamilyErrors.agentOrg, error: orgs.errorFor('org-run'), socketSends: Socket.instances.flatMap(s=>s.sent).length, rows: history.getTreeNodes().flatMap(n=>n.agentOrgDefinitions).flatMap(g=>g.runs).map(r=>({ rootRunId:r.rootRunId, active:r.isActive, summary:r.summary })) } },
  }
  const deadline = Date.now() + 5000
  while (orgs.contextFor('org-run')?.phase !== 'live') {
    if (Date.now() > deadline) throw new Error('Controlled live snapshot did not settle')
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  ready.value = true
})
onBeforeUnmount(() => { client.query = originalQuery; client.mutate = originalMutate; window.WebSocket = NativeSocket; router.replace = originalReplace; nodeStore.waitForBoundBackendReady = originalReady; orgs.disconnect('org-run') })
</script>

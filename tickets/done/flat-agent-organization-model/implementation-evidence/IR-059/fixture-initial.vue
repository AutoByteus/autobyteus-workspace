<template>
  <main class="flex min-h-screen flex-col bg-white text-slate-900">
    <header class="border-b bg-slate-50 p-2 text-xs">IR059 · Installed Apollo / controlled Link · {{ address }}</header>
    <div v-if="ready" class="flex min-h-0 flex-1 flex-col sm:flex-row">
      <aside class="max-h-[45vh] overflow-auto border-b p-2 sm:max-h-none sm:w-80 sm:flex-none sm:border-r">
        <WorkspaceAgentOrgHistoryCollection v-for="node in history.getTreeNodes()" :key="node.stableKey" :workspace-id="node.workspaceId" :groups="node.agentOrgDefinitions" :state="state" :actions="actions" />
      </aside>
      <AgentOrgWorkspaceView class="h-[760px] min-w-0 flex-1" />
    </div>
  </main>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorkspaceAgentOrgHistoryCollection from '~/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue'
import AgentOrgWorkspaceView from '~/components/workspace/org/AgentOrgWorkspaceView.vue'
import type { WorkspaceHistorySectionActions, WorkspaceHistorySectionState } from '~/components/workspace/history/workspaceHistorySectionContracts'
import { ControlledOrgApollo, OrgTestSocket, historyData, inspectionData, memberData } from '~/test-support/agentOrgApolloFixture'
import { getApolloClient } from '~/utils/apolloClient'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useAgentOrgRunStore } from '~/stores/agentOrgRunStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { parseAgentOrgHistoryItems } from '~/stores/runHistoryStoreSupport'
import { useWorkspaceHistorySubjectActions } from '~/composables/useWorkspaceHistorySubjectActions'
import { useWorkspaceHistoryTreeState } from '~/composables/useWorkspaceHistoryTreeState'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
definePageMeta({ layout: false })
const route = useRoute(), router = useRouter(), history = useRunHistoryStore(), orgs = useAgentOrgContextsStore(), runs = useAgentOrgRunStore()
const subject = useWorkspaceHistorySubjectActions(), nodeStore = useWindowNodeContextStore()
const address = String(route.query.memberAddress), id = String(route.query.orgRunId)
const ready = ref(false), errors: string[] = [], transport = new ControlledOrgApollo()
const client = getApolloClient(), originalLink = client.link, originalReady = nodeStore.waitForBoundBackendReady
const originalReplace = router.replace.bind(router), NativeSocket = window.WebSocket
const correlated = (data: any) => JSON.parse(JSON.stringify(data).replaceAll('org-run', id))
const ROOT = 'GetAgentOrgRunInspection', MEMBER = 'GetAgentOrgMemberRunProjection', HISTORY = 'ListCollaborationRootHistory'
const tree = useWorkspaceHistoryTreeState({ runHistoryStore: history, selectionStore: useAgentSelectionStore(), selectedAgentOrg: computed(() => { const org = orgs.contextFor(id); return { rootRunId: id, focusAddress: org?.selectedAddress ?? null, selection: org?.selection ?? null } }) })
const state = {
  isAgentOrgDefinitionExpanded: () => true, isAgentOrgRunExpanded: () => true, isAgentOrgTeamExpanded: () => true,
  isAgentOrgRunSelected: (root: string) => root === id, isAgentOrgMemberSelected: tree.isAgentOrgMemberSelected,
  isAgentOrgTerminating: (root: string) => Boolean(orgs.operations[root]) || runs.terminatingRunIds.has(root),
  agentOrgTerminationError: (root: string) => runs.terminationErrors[root] ?? orgs.errorFor(root), agentOrgContextFor: orgs.contextFor,
} as WorkspaceHistorySectionState
const actions = { onTerminateAgentOrg: async (run) => {
  try { await subject.execute({ rootSubjectKind: 'agent_org', rootRunId: run.rootRunId, action: 'stop' }) }
  catch (error) { errors.push(String(error)) }
} } as WorkspaceHistorySectionActions
onMounted(async () => {
  await localizationRuntime.setPreference('en')
  nodeStore.waitForBoundBackendReady = async () => true
  router.replace = ((location: any) => originalReplace({ ...location, path: '/ir059-inspection' })) as any
  window.WebSocket = OrgTestSocket as any
  client.setLink(transport.client.link)
  history.agentOrgHistory = parseAgentOrgHistoryItems(correlated(historyData(true)).listCollaborationRootHistory)
  orgs.select(id, address)
  void history.refreshAgentOrgHistory()
  ;(window as any).__ir059 = {
    begin() { transport.named(ROOT)[0]!.respond(correlated(inspectionData(true))) },
    confirm() { transport.named('TerminateAgentOrgRun')[0]!.respond({ terminateAgentOrgRun: { success: true, message: null, agentOrgRunId: id } }) },
    finalRoot() { transport.named(ROOT)[1]!.respond(correlated(inspectionData(false))) },
    members(which: string) { transport.named(MEMBER).slice(which === 'old' ? 0 : 7, which === 'old' ? 7 : 14).forEach(r => r.respond(memberData(r.operation.variables, which === 'old' ? 'Before Stop' : 'Final retained output'))) },
    history() { transport.named(HISTORY)[0]!.respond(correlated(historyData(true))); transport.pending(HISTORY).forEach(r => r.fail('Follow-up history unavailable')) },
    reopen() { return orgs.openForInspection(id) },
    state() { const org = orgs.contextFor(id), ctx = org?.selectedTarget()?.context; return {
      errors, phase: org?.phase, active: org?.isActive, address: org?.selectedAddress, exactRun: ctx?.state.runId,
      messages: ctx?.conversation.messages, activities: ctx ? useAgentActivityStore().getActivities(ctx.state.runId) : [],
      status: ctx?.state.currentStatus, draft: ctx?.requirement, mode: route.query.mode, rootRunId: id,
      pending: Boolean(orgs.operations[id]), historyError: history.historyFamilyErrors.agentOrg, socketSends: OrgTestSocket.instances.flatMap(s => s.sent).length,
      requests: transport.requests.map(r => ({ name:r.operation.operationName, variables:r.operation.variables, independent:r.operation.getContext().queryDeduplication, delivered:r.delivered })),
      rows: history.getTreeNodes().flatMap(n=>n.agentOrgDefinitions).flatMap(g=>g.runs).map(r=>({rootRunId:r.rootRunId,active:r.isActive,summary:r.summary})),
    } },
  }
  ready.value = true
})
onBeforeUnmount(() => { orgs.disconnect(id); client.setLink(originalLink); transport.client.stop(); window.WebSocket = NativeSocket; router.replace = originalReplace; nodeStore.waitForBoundBackendReady = originalReady })
</script>

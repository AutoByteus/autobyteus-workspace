<template>
  <div class="h-screen flex flex-col bg-slate-50">
    <div class="border-b p-2 text-xs text-slate-600">Implementation fixture — controlled transport, not provider acceptance <button class="ml-2 underline" @click="showNav = !showNav">Toggle fixture navigation</button></div>
    <div v-if="ready" class="flex min-h-0 flex-1">
      <aside class="fixture-sidebar" :class="{shown:showNav}" style="width:288px;flex-shrink:0"><AppLeftPanel /></aside>
      <RouterView class="min-w-0 flex-1" />
    </div>
    <div v-else>{{ error || 'Preparing owned fixture…' }}</div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, provide, shallowReactive, defineComponent, h, watch } from 'vue'
import { createRouter, createMemoryHistory, RouterView, routerKey, routeLocationKey, routerViewLocationKey, viewDepthKey, useRouter } from 'vue-router'
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client/core'
import AppLeftPanel from '~/components/AppLeftPanel.vue'
import WorkspaceAdaptiveLayout from '~/components/layout/WorkspaceAdaptiveLayout.vue'
import { useWorkspaceRouteSelection } from '~/composables/workspace/useWorkspaceRouteSelection'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useServerSettingsStore } from '~/stores/serverSettings'
import { useWorkspaceStore } from '~/stores/workspace'
import { useVoiceInputStore } from '~/stores/voiceInputStore'
import { stageAgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgContextHydration'
import { parseAgentOrgHistoryItems } from '~/stores/runHistoryStoreSupport'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
import { rootView, memberData, historyData, OrgTestSocket } from '~/test-support/agentOrgApolloFixture'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { beginLocalUserSubmission, finalizeLocalSubmissionAttachments } from '~/services/runSubmission/localUserSubmission'
import { RESPONSIVE_WORKSPACE_SHELL_KEY, useResponsiveWorkspaceShell } from '~/composables/layout/useResponsiveWorkspaceShell'
definePageMeta({ layout: false })
provide(RESPONSIVE_WORKSPACE_SHELL_KEY, useResponsiveWorkspaceShell().responsiveWorkspaceShellState)
const ready = ref(false), error = ref(''), showNav = ref(false)
const outerRouter = useRouter()
const Workspace = defineComponent({ setup() { useVoiceInputStore().initialize = async () => undefined as any; useWorkspaceRouteSelection(); return () => h(WorkspaceAdaptiveLayout, { showFileContent: false }) } })
const router = createRouter({ history: createMemoryHistory(), routes: [
  { path: '/workspace', component: Workspace }, { path: '/agents', component: { template: '<div class="p-6">Agent definitions — explicit leave</div>' } },
] })
router.afterEach(to => { void outerRouter.replace({ path: '/ir001-render', query: to.query }) })
provide(viewDepthKey, 0)
provide(routerKey, router)
const routeProxy: Record<string, unknown> = {}
for (const key of Object.keys(router.currentRoute.value)) Object.defineProperty(routeProxy, key, { get: () => (router.currentRoute.value as any)[key], enumerable: true })
provide(routeLocationKey, shallowReactive(routeProxy) as any)
provide(routerViewLocationKey, router.currentRoute)
const app = useNuxtApp()
onMounted(async () => {
  try {
    const history = useRunHistoryStore(), orgs = useAgentOrgContextsStore(), selection = useAgentSelectionStore()
    const windowNode = useWindowNodeContextStore()
    windowNode.waitForBoundBackendReady = async () => false
    useServerSettingsStore().fetchServerSettings = async () => undefined as any
    history.fetchTree = async () => undefined as any
    history.refreshAgentOrgHistory = async () => undefined as any
    history.fetchWorkspaceHistory = async () => undefined as any
    history.resolveWorkspaceMetadataByRootPath = async () => null
    history.ensureWorkspaceByRootPath = async () => null
    const requests: any[] = [], trace: any[] = []
    let holdTeam = false
    const view = rootView(true)
    view.agent_statuses = view.agent_statuses.map(s => ({ ...s, status: 'offline' }))
    const client = new ApolloClient({ cache: new InMemoryCache(), link: new ApolloLink(operation => new Observable(observer => {
      const name = operation.operationName
      const deliver = () => {
        const data = name === 'GetAgentOrgMemberRunProjection' ? memberData(operation.variables, 'Retained conversation')
          : name === 'GetAgentOrgRunInspection' ? { getAgentOrgRunInspection: { schema_version: 1, root_subject_kind: 'agent_org', root_run_id: 'org-run', root_org: view } }
          : name === 'GetTeamMemberRunProjection' ? { getTeamMemberRunProjection: { __typename: 'TeamMemberRunProjection', agentRunId: operation.variables.agentRunId,
              summary: 'Prior Team', lastActivityAt: '2026-09-13T00:00:00Z', conversation: [{ kind: 'message', role: 'assistant', content: 'Prior Team retained conversation', ts: 1700000001 }], activities: [], hasEarlierActiveTraceEvents: false } }
          : name === 'ListCollaborationRootHistory' ? historyData(true) : {}
        trace.push({ kind: 'response', name, variables: operation.variables })
        observer.next({ data }); observer.complete()
      }
      requests.push({ name, variables: operation.variables, deliver, released: false })
      if (!(holdTeam && name === 'GetTeamMemberRunProjection')) deliver()
    })) })
    ;(app as any).__boundApolloClient = client
    window.WebSocket = OrgTestSocket as any
    const teams = useAgentTeamContextsStore()
    teams.addTeamContext(buildTestTeamContext({ workspaceRootPath: '/fixture', teamRunId: 'prior-team', teamDefinitionName: 'Prior standalone Team', coordinatorAddress: '/lead', focusedAgentRunId: 'lead',
      rootChildren: ['lead', 'unused'].map(id => testAgentNode(`/${id}`, { agentRunId: id, currentStatus: AgentStatus.Offline })) }))
    const stage = await stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: 'org-run', view })
    stage.commitActivities(); orgs.contexts['org-run'] = shallowReactive(stage.context)
    orgs.select('org-run', '/team/lead')
    const agent = stage.context.selectedTarget()!.context!
    agent.requirement = 'Keep this unsent draft'
    let handle: ReturnType<typeof beginLocalUserSubmission>
    useWorkspaceStore().workspaces['test-workspace'] = { workspaceId: 'test-workspace', name: 'Fixture workspace', workspaceConfig: {}, absolutePath: '/fixture', workspaceRootPath: '/fixture', kind: 'filesystem' }
    useWorkspaceStore().workspacesFetched = true
    history.refreshTreeQuietly = async () => undefined as any
    history.workspaceGroups = [{ workspaceRootPath: '/fixture', workspaceName: 'Fixture workspace', agentDefinitions: [], teamDefinitions: [] }]
    history.agentOrgHistory = parseAgentOrgHistoryItems(historyData(true).listCollaborationRootHistory)
    history.refreshRunNavigationTopology('fixture-seed')
    selection.selectRun('prior-team', 'team')
    selection.$onAction(({ name, args }) => trace.push({ kind: 'selection', name, args }))
    orgs.$onAction(({ name, args }) => trace.push({ kind: 'org', name, args: args.slice(0, 2) }))
    watch(() => router.currentRoute.value.fullPath, path => trace.push({ kind: 'route', path }), { flush: 'sync' })
    await router.push({ path: '/workspace', query: { rootSubjectKind: 'agent_org', orgRunId: 'org-run', memberAddress: '/team/lead', mode: 'active' } })
    ;(window as any).ir001 = {
      trace, requests, router, history, orgs, selection, client,
      startStream() {
        const socket = OrgTestSocket.instances.at(-1)!
        socket.emit({ type: 'CONNECTED', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', session_id: 'render' } })
        socket.emit({ type: 'ROOT_EXECUTION_VIEW_SNAPSHOT', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', schema_version: 1, root_org: view } })
      },
      begin() {
        handle = beginLocalUserSubmission(agent, { text: 'Read the attached note', attachments: [{ kind: 'uploaded', phase: 'draft', id: 'note', storedFilename: 'note.txt', displayName: 'note.txt', type: 'Text', locator: '/rest/context-files/draft/note.txt' }], navigationTarget: null })
        agent.requirement = 'Keep this unsent draft'
      },
      publish() {
        const socket = OrgTestSocket.instances.at(-1)!
        socket.emit({ type: 'ROOT_EXECUTION_EVENT', payload: { root_subject_kind: 'agent_org', root_run_id: 'org-run', change_sequence: ++view.base_change_sequence,
          event: { kind: 'agent_presentation', member_address: '/team/lead', agent_run_id: 'agent-lead-configured', message: { type: 'AGENT_STATUS', payload: { status: 'idle', trigger: null, tool_name: null, error_message: null, error_details: null } } } } })
      },
      holdTeam() { holdTeam = true },
      releaseTeam() { holdTeam = false; requests.filter(r => r.name === 'GetTeamMemberRunProjection' && !r.released).forEach(r => { r.released = true; r.deliver() }) },
      finalize() { finalizeLocalSubmissionAttachments(handle, [{ ...handle.message.contextFilePaths![0], phase: 'final', locator: '/rest/context-files/final/note.txt' }]); handle.context.submissionPending = false },
      snapshot() { return { path: router.currentRoute.value.fullPath, selected: selection.selectedRunId, address: orgs.contextFor('org-run')?.selectedAddress, draft: orgs.contextFor('org-run')?.selectedTarget()?.context?.requirement, phase: orgs.contextFor('org-run')?.phase, messageSame: agent.conversation.messages.includes(handle?.message), trace } },
    }
    ready.value = true
  } catch (cause) { error.value = String(cause); console.error(cause) }
})
</script>

<style scoped>
@media (max-width: 600px) { .fixture-sidebar { display:none; } .fixture-sidebar.shown { display:block; position:absolute; z-index:80; inset:62px 0 0 0; background:white; width:100%!important; } }
</style>

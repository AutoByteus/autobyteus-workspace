<template>
  <div class="relative flex h-full min-h-0 flex-col bg-white" data-test="agent-org-workspace-view">
    <div v-if="isHistorical && context && !target" class="flex h-full items-center justify-center px-6 text-center text-gray-500" data-test="agent-org-stopped-history">
      <div class="max-w-md space-y-3">
        <WorkspaceRecoveryNotice v-if="recoveryNotice" :message="recoveryNotice" />
        <span class="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon icon="heroicons:building-office-2-20-solid" class="h-6 w-6" />
        </span>
        <div>
          <h2 class="text-lg font-semibold text-gray-700">{{ t('workspace.agentOrg.stoppedHistory.title') }}</h2>
          <p class="mt-1">{{ t('workspace.agentOrg.stoppedHistory.description') }}</p>
        </div>
      </div>
    </div>
    <div v-else-if="!context && !streamError" class="flex h-full items-center justify-center text-slate-500">
      {{ t('workspace.agentOrg.connecting') }}
    </div>
    <div v-else-if="!context" class="flex min-h-0 flex-1 items-start justify-center px-3 pt-3 sm:px-4">
      <WorkspaceRecoveryNotice class="w-full max-w-xl" :message="recoveryNotice || ''" />
    </div>
    <template v-else-if="!target">
      <WorkspaceRecoveryNotice v-if="recoveryNotice" :message="recoveryNotice" />
      <div class="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-gray-500" data-test="agent-org-active-unfocused">
        <div class="max-w-md space-y-3">
          <span class="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Icon icon="heroicons:building-office-2-20-solid" class="h-6 w-6" />
          </span>
          <div>
            <h2 class="text-lg font-semibold text-gray-700">{{ t('workspace.agentOrg.activeUnfocused.title') }}</h2>
            <p class="mt-1">{{ t('workspace.agentOrg.activeUnfocused.description') }}</p>
          </div>
        </div>
      </div>
    </template>
    <AgentOrgMemberRunConfigPanel
      v-else-if="target && center.isConfigMode"
      :target="target"
      :key="targetIdentity || 'none'"
      @back="center.showChat"
    />
    <AgentWorkspaceSurface
      v-else-if="target.kind === 'agent_org_direct_agent' || target.kind === 'agent_org_task_agent'"
      class="min-h-0 flex-1"
      :target="target"
      :show-header-actions="headerActionsAvailable"
      :recovery-notice="recoveryNotice"
      @new-agent="openNewOrgRun"
      @edit-config="openMemberConfiguration"
    />
    <TeamWorkspaceSurface
      v-else-if="target.kind === 'agent_org_team_member' || target.kind === 'agent_org_task_team_member'"
      class="min-h-0 flex-1"
      :target="target"
      :show-header-actions="headerActionsAvailable"
      :recovery-notice="recoveryNotice"
      @new-team="openNewOrgRun"
      @edit-config="openMemberConfiguration"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useActiveContextStore } from '~/stores/activeContextStore'
import AgentWorkspaceSurface from '~/components/workspace/agent/AgentWorkspaceSurface.vue'
import TeamWorkspaceSurface from '~/components/workspace/team/TeamWorkspaceSurface.vue'
import WorkspaceRecoveryNotice from '~/components/workspace/common/WorkspaceRecoveryNotice.vue'
import AgentOrgMemberRunConfigPanel from '~/components/workspace/org/AgentOrgMemberRunConfigPanel.vue'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'

const route = useRoute()
const router = useRouter()
const active = useActiveContextStore()
const center = useWorkspaceCenterViewStore()
const { t } = useLocalization()
const orgRunId = computed(() => String(route.query.orgRunId || ''))
const isHistorical = computed(() => route.query.mode === 'history')
const context = computed(() => active.agentOrgContextFor(orgRunId.value))
const streamError = computed(() => active.agentOrgErrorFor(orgRunId.value))
const recoveryNotice = computed(() => {
  if (!streamError.value) return null
  // A successful Restore can require recovery before a live snapshot changes the route.
  // The retained history URL is not evidence that no run was started.
  const inspectionFailed = isHistorical.value && context.value?.phase !== 'reopen_required'
  return t(inspectionFailed ? 'workspace.agentOrg.inspectionUnavailable' : 'workspace.agentOrg.recovery.exhausted')
})
const target = computed(() => {
  const current = active.activeWorkspaceTarget
  return current && 'root' in current
    ? current
    : null
})
const targetIdentity = computed(() => target.value
  ? `${target.value.root.orgRunId}\u0000${target.value.address}\u0000${target.value.context.state.runId}`
  : null)
const open = () => {
  if (orgRunId.value) void active.inspectAgentOrg(orgRunId.value).catch(() => undefined)
}
const selectRouteExecution = () => {
  if (!orgRunId.value) return
  const agentRunId = String(route.query.agentRunId || '')
  const address = String(route.query.memberAddress || '')
  if (agentRunId) {
    const identity = context.value?.index.agents.get(agentRunId)
    if (identity && address && identity.address !== address) {
      active.selectAgentOrg(orgRunId.value, null)
      return
    }
    active.selectAgentOrg(orgRunId.value, { kind: 'agent_execution', agentRunId })
  } else if (address) active.selectAgentOrg(orgRunId.value, address)
}
watch([() => route.query.agentRunId, () => route.query.memberAddress, context], selectRouteExecution, { immediate: true })
const openNewOrgRun = () => {
  const source = context.value?.executionTree.rootOrg
  if (!source) return
  const definitionId = source.orgDefinitionId
  center.showChat()
  void router.push({
    path: '/workspace',
    query: { rootSubjectKind: 'agent_org', definitionId, sourceOrgRunId: source.orgRunId, mode: 'configuration' },
  })
}
const headerActionsAvailable = computed(() => Boolean(target.value && (target.value.access === 'live'
  || target.value.kind === 'agent_org_direct_agent' || target.value.kind === 'agent_org_team_member')))
const openMemberConfiguration = () => {
  if (headerActionsAvailable.value) center.showConfig()
}

onMounted(() => {
  center.showChat()
  open()
})
onBeforeUnmount(() => { if (orgRunId.value) active.disconnectAgentOrg(orgRunId.value) })
watch(orgRunId, (nextRunId, previousRunId) => {
  center.showChat()
  if (previousRunId && previousRunId !== nextRunId) active.disconnectAgentOrg(previousRunId)
  open()
})
watch(() => context.value?.phase, (phase) => {
  if (phase !== 'live' && phase !== 'historical') return
  const mode = phase === 'live' ? 'active' : 'history'
  if (route.query.rootSubjectKind === 'agent_org' && route.query.orgRunId === orgRunId.value && route.query.mode !== mode) {
    void router.replace({ path: '/workspace', query: { ...route.query, mode } })
  }
}, { immediate: true })
watch(targetIdentity, (nextIdentity, previousIdentity) => {
  if (previousIdentity && nextIdentity !== previousIdentity) center.showChat()
})
</script>

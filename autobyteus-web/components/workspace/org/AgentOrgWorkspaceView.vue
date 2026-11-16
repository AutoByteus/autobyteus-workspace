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
    <div v-else-if="center.isConfigMode" class="flex h-full min-h-0 flex-col bg-white" data-test="agent-org-run-config-editor">
      <div class="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <h3 class="truncate text-sm font-semibold text-gray-800">{{ t('workspace.agentOrg.runConfig.orgLabel') }}</h3>
        <button type="button" data-test="agent-org-config-back-to-events"
          class="inline-flex h-8 w-8 items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-50"
          :aria-label="t('workspace.components.workspace.config.RunConfigPanel.back_to_event_view')"
          @click="center.showChat">
          <Icon icon="heroicons:arrow-left-20-solid" class="h-4 w-4" />
        </button>
      </div>
      <ExistingRunConfigEditor :target="{ kind: 'agent_org', orgRunId: target.root.orgRunId }" />
    </div>
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
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRunStart } from '~/composables/runSettings/useRunStart'
import { Icon } from '@iconify/vue'
import { useActiveContextStore } from '~/stores/activeContextStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useRunTreeStore } from '~/stores/runTreeStore'
import AgentWorkspaceSurface from '~/components/workspace/agent/AgentWorkspaceSurface.vue'
import TeamWorkspaceSurface from '~/components/workspace/team/TeamWorkspaceSurface.vue'
import WorkspaceRecoveryNotice from '~/components/workspace/common/WorkspaceRecoveryNotice.vue'
import ExistingRunConfigEditor from '~/components/workspace/config/ExistingRunConfigEditor.vue'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'

const route = useRoute()
const router = useRouter()
const active = useActiveContextStore()
const orgContexts = useAgentOrgContextsStore()
const runTrees = useRunTreeStore()
const center = useWorkspaceCenterViewStore()
const runStart = useRunStart()
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
  // An agent of the Org, or a run it delegated (its tree row, rule 2; CR-461-102).
  if (agentRunId) orgContexts.selectRouteAgent(orgRunId.value, agentRunId, address)
  else if (address) active.selectAgentOrg(orgRunId.value, address)
}
watch([() => route.query.agentRunId, () => route.query.memberAddress, context], selectRouteExecution, { immediate: true })
// A delegated run the route names opens once the Org's tree has its row (its tree may arrive after the view).
watch(() => runTrees.rowsOf({ kind: 'agent_org', runId: orgRunId.value }), () => {
  const agentRunId = String(route.query.agentRunId || '')
  if (agentRunId && !context.value?.index.agents.has(agentRunId)) selectRouteExecution()
})
/** ＋ opens the Org launch page prefilled from this run (REQ-013). */
const openNewOrgRun = () => {
  const source = context.value?.executionTree.rootOrg
  if (!source) return
  center.showChat()
  void runStart.copyOrgRun(source.orgRunId, source.orgDefinitionId)
}
const headerActionsAvailable = computed(() => Boolean(target.value))
/** Every focused agent of the Org has its own settings (autobyteus-366): a member, or a copy of the Org's. */
const openMemberConfiguration = () => {
  if (target.value) center.showConfig()
}

onMounted(() => {
  center.showChat()
  open()
})
watch(orgRunId, () => {
  center.showChat()
  open()
})
watch(() => context.value?.phase, (phase) => {
  if (phase !== 'live' && phase !== 'historical') return
  const mode = phase === 'live' ? 'active' : 'history'
  if (route.query.rootSubjectKind === 'agent_org' && route.query.orgRunId === orgRunId.value && route.query.mode !== mode) {
    void router.replace({ path: '/workspace', query: { ...route.query, mode } })
  }
}, { immediate: true })
// Settings stay open across focus changes, with their unsaved edits (REQ-005); with nothing focused they close. A run
// the Org delegated opens as its own run (autobyteus-461 rule 2): while it binds, the Org has its tree row picked but no
// target yet, and that moment is a focus change, not "nothing focused" (CR-461-095, D-IMP-1; the pick is the store's
// since SR-084, AFS-002).
watch(targetIdentity, (nextIdentity, previousIdentity) => {
  if (previousIdentity && !nextIdentity && !context.value?.selectedTarget() && !orgContexts.selectedRowKey(orgRunId.value)) center.showChat()
})
</script>

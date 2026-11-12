<template>
  <!-- The run section's Runs view (workspace-tree-vs-chooser REQ-008, from autobyteus-378): your runs, newest first,
       each with the work it delegated nested under it, live; the newest five, the rest behind "Show older". The run
       section's header (RunSectionHeader) is above it; no folder or Project grouping. -->
  <div class="run-list-panel flex h-full flex-col bg-white">
    <div
      ref="scrollRef"
      role="region"
      :aria-label="t('runList.title')"
      class="run-list-scroll min-h-0 flex-1 overflow-y-auto px-1 pb-2"
      data-test="run-list-scroll"
    >
      <div v-if="runHistoryStore.loading && runList.entries.length === 0" class="px-3 py-4 text-xs text-gray-500" role="status" data-test="run-list-loading">
        {{ t('runList.loading') }}
      </div>

      <div v-else-if="loadError && runList.entries.length === 0" class="px-3 py-4" role="alert" data-test="run-list-error">
        <p class="text-xs text-red-600">{{ t('runList.error') }}</p>
        <button type="button" class="mt-2 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" data-test="run-list-retry" @click="retry">
          {{ t('runList.retry') }}
        </button>
      </div>

      <template v-else>
        <p v-if="loadError" class="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600" role="alert" data-test="run-list-stale-error">
          <span>{{ t('runList.staleError') }}</span>
          <button type="button" class="rounded px-1 font-medium underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" @click="retry">{{ t('runList.retry') }}</button>
        </p>

        <button v-if="runList.entries.length === 0" type="button" class="flex w-full items-start rounded-md px-2 py-1 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" data-test="run-list-empty" @click="startChat">
          <span class="ml-[1.125rem] mr-1.5 inline-flex h-5 flex-shrink-0 items-center"><span class="mr-1.5 h-2 w-2 rounded-full bg-gray-300" aria-hidden="true" /></span>
          <span class="mr-1.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600" aria-hidden="true"><Icon icon="heroicons:chat-bubble-left-right" class="h-3.5 w-3.5" /></span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium">{{ t('runList.emptyTitle') }}</span>
            <span class="block text-[0.6875rem] leading-4 text-gray-500">{{ t('runList.emptyHelp') }}</span>
          </span>
        </button>

        <template v-else>
          <ul class="space-y-0.5" role="list" :aria-label="t('runList.title')" data-test="run-list">
            <RunListRow
              v-for="entry in runList.shownEntries"
              :key="entry.key"
              :entry="entry"
              :state="sectionState"
              :avatars="avatars"
              :actions="sectionActions"
              :folder-label="folderLabel(entry.folderRootPath)"
              :relative="relative"
            />
          </ul>
          <RunListFold
            v-if="runList.olderEntries.length > 0"
            :older-count="runList.olderEntries.length"
            :older-shown="runList.olderShown"
            :can-archive-older="archiveOlder.canArchiveOlder.value"
            :archiving="archiveOlder.archiving.value"
            @toggle="runList.setOlderShown(!runList.olderShown)"
            @archive-older="archiveOlder.requestArchiveOlder"
          />
        </template>
      </template>
    </div>

    <ConfirmationModal
      :show="showDeleteConfirmation"
      :title="deleteConfirmationTitle"
      :message="deleteConfirmationMessage"
      :confirm-button-text="deleteConfirmationConfirmText"
      variant="danger"
      typography-size="large"
      @confirm="confirmDeleteRun"
      @cancel="closeDeleteConfirmation"
    />
    <ConfirmationModal
      :show="archiveOlder.showConfirmation.value"
      :title="t('workspace.history.groupArchive.confirmTitle')"
      :message="archiveOlder.confirmationMessage.value"
      :confirm-button-text="t('workspace.history.groupArchive.confirmButton')"
      variant="primary"
      typography-size="large"
      @confirm="archiveOlder.confirmArchiveOlder"
      @cancel="archiveOlder.cancelArchiveOlder"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import ConfirmationModal from '~/components/common/ConfirmationModal.vue'
import RunListRow from '~/components/runList/RunListRow.vue'
import RunListFold from '~/components/runList/RunListFold.vue'
import type { WorkspaceHistoryAvatarBindings } from '~/components/workspace/history/workspaceHistorySectionContracts'
import type { RunListSectionActions, RunListSectionState } from '~/components/runList/runListSectionContracts'
import { useRevealSelectedTreeRow } from '~/components/workspace/history/useRevealSelectedTreeRow'
import { useRunStart } from '~/composables/runSettings/useRunStart'
import { useLocalization } from '~/composables/useLocalization'
import { useToasts } from '~/composables/useToasts'
import { useRunHistoryAvatarState } from '~/composables/useRunHistoryAvatarState'
import { useRunListDisclosure } from '~/composables/useRunListDisclosure'
import { useRouteSelectedAgentOrg } from '~/composables/runHistory/useRouteSelectedAgentOrg'
import { useRunListArchiveOlder } from '~/composables/useRunListArchiveOlder'
import { useWorkspaceHistoryMutations } from '~/composables/useWorkspaceHistoryMutations'
import { useWorkspaceHistorySelectionActions } from '~/composables/useWorkspaceHistorySelectionActions'
import { useWorkspaceHistorySubjectActions } from '~/composables/useWorkspaceHistorySubjectActions'
import { chatRouteRunId } from '~/services/workspace/workspaceNavigationService'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { useAgentOrgRunStore } from '~/stores/agentOrgRunStore'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useAgentRunStore } from '~/stores/agentRunStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { normalizeRootPath } from '~/stores/runHistoryReadModel'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useRunListStore } from '~/stores/runListStore'
import { useWorkspaceStore } from '~/stores/workspace'

const props = withDefaults(defineProps<{
  /** Whether the center shows a run (`useShellPrimaryNavigation().isWorkspacesActive`); gates the reveal. */
  runShown?: boolean
}>(), { runShown: false })
const emit = defineEmits<{ (event: 'run-selected', payload: { type: 'agent' | 'team'; runId: string }): void }>()

const { t } = useLocalization()
const { addToast } = useToasts()
const route = useRoute() as ReturnType<typeof useRoute> | undefined
const router = useRouter()
const runStart = useRunStart()
const runHistoryStore = useRunHistoryStore()
const runList = useRunListStore()
const selectionStore = useAgentSelectionStore()
const agentRunStore = useAgentRunStore()
const teamRunStore = useAgentTeamRunStore()
const { stopPendingTeamIds } = storeToRefs(teamRunStore)
const agentOrgRunStore = useAgentOrgRunStore()
const agentOrgContextsStore = useAgentOrgContextsStore()
const collaboration = useAgentRunCollaborationStore()
const workspaceStore = useWorkspaceStore()
const agentDefinitionStore = useAgentDefinitionStore()
const agentTeamDefinitionStore = useAgentTeamDefinitionStore()
const agentOrgDefinitionStore = useAgentOrgDefinitionStore()
const toastOf = (message: string, type: 'success' | 'error' | 'warning' | 'info'): void => addToast(message, type === 'warning' ? 'info' : type)

const selectedAgentOrg = useRouteSelectedAgentOrg()
const disclosure = useRunListDisclosure({
  runHistoryStore, runListStore: runList, selectionStore, selectedAgentOrg,
  hasSelectedChild: (runId) => Boolean(collaboration.selectedChild(runId)),
})
// When the panel appears, the open run's row is brought into view, only while a run is shown in the center.
const scrollRef = ref<HTMLElement | null>(null)
useRevealSelectedTreeRow(scrollRef, toRef(props, 'runShown'))

const avatars: WorkspaceHistoryAvatarBindings = useRunHistoryAvatarState({
  loading: computed(() => runHistoryStore.loading),
  agentDefinitions: computed(() => agentDefinitionStore.agentDefinitions),
  teamDefinitions: computed(() => agentTeamDefinitionStore.agentTeamDefinitions),
  orgDefinitions: computed(() => agentOrgDefinitionStore.definitions),
})

/** Leaves the Agent Org route when the open Org run was archived or deleted. */
const leaveRemovedAgentOrgRoute = async (orgRunId: string): Promise<void> => {
  if (route?.query.rootSubjectKind !== 'agent_org' || String(route.query.orgRunId || '').trim() !== orgRunId) return
  await router.replace({ path: '/workspace' })
}
const mutations = useWorkspaceHistoryMutations({
  terminateRun: (runId) => agentRunStore.terminateRun(runId),
  terminateTeamRun: (teamRunId) => teamRunStore.terminateTeamRun(teamRunId),
  // The Runs view lists no New chat drafts, so this is never reached from it; the composable needs one.
  removeDraftRun: async (runId) => { await agentRunStore.closeAgent(runId, { terminate: false }); return true },
  deleteRun: (runId) => runHistoryStore.deleteRun(runId),
  deleteTeamRun: (teamRunId) => runHistoryStore.deleteTeamRun(teamRunId),
  deleteAgentOrgRun: (orgRunId) => runHistoryStore.deleteAgentOrgRun(orgRunId),
  archiveRun: (runId) => runHistoryStore.archiveRun(runId),
  archiveTeamRun: (teamRunId) => runHistoryStore.archiveTeamRun(teamRunId),
  archiveAgentOrgRun: (orgRunId) => runHistoryStore.archiveAgentOrgRun(orgRunId),
  onAgentOrgMutationSuccess: leaveRemovedAgentOrgRoute,
  addToast: toastOf,
  stopPendingTeamIds,
})
const {
  showDeleteConfirmation, deleteConfirmationTitle, deleteConfirmationConfirmText, deleteConfirmationMessage,
  closeDeleteConfirmation, confirmDeleteRun,
} = mutations
const archiveOlder = useRunListArchiveOlder({
  olderEntries: computed(() => runList.olderEntries),
  archiveRuns: (targets) => runHistoryStore.archiveRuns(targets),
  onAgentOrgArchived: leaveRemovedAgentOrgRoute,
  addToast: toastOf,
})

const selection = useWorkspaceHistorySelectionActions({
  runHistoryStore,
  selectionStore,
  setTeamExpanded: disclosure.setTeamExpanded,
  toggleTeam: disclosure.toggleTeam,
  expandTeamMemberAncestors: (_workspaceId, teamRunId, agentRunId) => disclosure.expandTeamMemberAncestors(teamRunId, agentRunId),
  emitRunSelected: (payload) => emit('run-selected', payload),
  presentTeamStreamRecoveryFeedback: (feedback) => addToast(t(feedback === 'wait'
    ? 'workspace.components.workspace.history.RunSectionPanel.stream_recovery_wait'
    : 'workspace.components.workspace.history.RunSectionPanel.stream_recovery_retry'), 'info'),
})
const { execute: executeSubjectAction } = useWorkspaceHistorySubjectActions()

const sectionState: RunListSectionState = {
  get selectedRunId() {
    // On Chat, the highlighted row is the displayed chat (none on New chat).
    if (route?.path?.startsWith('/chat')) return chatRouteRunId(route.query)
    return disclosure.selectedRunId.value
  },
  isTeamRunSelected: (teamRunId) => selectionStore.selectedType === 'team' && selectionStore.selectedRunId === teamRunId,
  isRunTerminating: (runId) => Boolean(mutations.terminatingRunIds.value[runId]),
  isTeamTerminating: (teamRunId) => Boolean(stopPendingTeamIds.value[teamRunId]),
  isRunDeleting: (runId) => Boolean(mutations.deletingRunIds.value[runId]),
  isTeamDeleting: (teamRunId) => Boolean(mutations.deletingTeamIds.value[teamRunId]),
  isRunArchiving: (runId) => Boolean(mutations.archivingRunIds.value[runId]),
  isTeamArchiving: (teamRunId) => Boolean(mutations.archivingTeamIds.value[teamRunId]),
  formatRelativeTime: (isoTime) => runHistoryStore.formatRelativeTime(isoTime),
  isRunExpanded: disclosure.isRunExpanded,
  toggleRun: disclosure.toggleRun,
  isTeamExpanded: disclosure.isTeamExpanded,
  isTeamMemberExpanded: disclosure.isRowExpanded,
  toggleTeamMember: disclosure.toggleTeamMember,
  isAgentOrgRunExpanded: disclosure.isAgentOrgRunExpanded,
  toggleAgentOrgRun: disclosure.toggleAgentOrgRun,
  isAgentOrgTeamExpanded: disclosure.isAgentOrgTeamExpanded,
  toggleAgentOrgTeam: disclosure.toggleAgentOrgTeam,
  isAgentOrgTaskTeamExpanded: disclosure.isAgentOrgTaskTeamExpanded,
  toggleAgentOrgTaskTeam: disclosure.toggleAgentOrgTaskTeam,
  isAgentOrgRunSelected: disclosure.isAgentOrgRunSelected,
  isAgentOrgMemberSelected: disclosure.isAgentOrgMemberSelected,
  isAgentOrgTerminating: (rootRunId) => Boolean(agentOrgContextsStore.operations[rootRunId]) || agentOrgRunStore.terminatingRunIds.has(rootRunId),
  isAgentOrgDeleting: (rootRunId) => Boolean(mutations.deletingAgentOrgIds.value[rootRunId]),
  isAgentOrgArchiving: (rootRunId) => Boolean(mutations.archivingAgentOrgIds.value[rootRunId]),
  agentOrgTerminationError: (rootRunId) => agentOrgRunStore.terminationErrors[rootRunId] ?? agentOrgContextsStore.errorFor(rootRunId),
  agentOrgContextFor: (rootRunId) => agentOrgContextsStore.contextFor(rootRunId),
}

const orgAction = (action: 'open' | 'stop') => (run: { rootRunId: string }) =>
  executeSubjectAction({ rootSubjectKind: 'agent_org', rootRunId: run.rootRunId, action })
const sectionActions: RunListSectionActions = {
  onSelectRun: selection.onSelectRun,
  onOpenAgentRun: selection.onOpenAgentRun,
  onTerminateRun: mutations.onTerminateRun,
  onArchiveRun: mutations.onArchiveRun,
  onDeleteRun: mutations.onDeleteRun,
  onSelectTeam: (team) => selection.onSelectTeam(team),
  onOpenTeamRun: (team) => selection.onOpenTeamRun(team),
  onTerminateTeam: mutations.onTerminateTeam,
  onArchiveTeam: mutations.onArchiveTeam,
  onDeleteTeam: mutations.onDeleteTeam,
  onSelectTeamMember: (member) => selection.onSelectTeamMember(member),
  onOpenAgentOrgRun: orgAction('open'),
  onSelectAgentOrgMember: (run, memberAddress) => executeSubjectAction({ rootSubjectKind: 'agent_org', rootRunId: run.rootRunId, action: 'select', memberAddress }),
  onInspectAgentOrgExecution: (run, agentRunId, memberAddress) => executeSubjectAction({ rootSubjectKind: 'agent_org', rootRunId: run.rootRunId, action: 'inspect', agentRunId, memberAddress }),
  onArchiveAgentOrg: mutations.onArchiveAgentOrg,
  onDeleteAgentOrg: mutations.onDeleteAgentOrg,
  onTerminateAgentOrg: (run) => orgAction('stop')(run).catch(() => undefined),
}

const loadError = computed(() => runHistoryStore.historyFamilyErrors?.workspace || runHistoryStore.agentOrgHistoryError || null)
const retry = (): void => { void runHistoryStore.fetchTree().catch(() => undefined) }
const startChat = (): void => { void runStart.newChat().catch(() => undefined) }

/** The row tooltip's folder: the temp workspace by name, else the folder's last segment. */
const tempRootPath = computed(() => normalizeRootPath(workspaceStore.tempWorkspace?.absolutePath ?? workspaceStore.tempWorkspace?.workspaceRootPath))
const folderLabel = (rootPath: string | null): string | null => {
  if (!rootPath) return null
  if (rootPath === tempRootPath.value) return t('runList.folderTemp')
  return rootPath.split('/').filter(Boolean).at(-1) || rootPath
}

// Ages ("6m", "2h") move on every minute.
const relativeTimeTick = ref(0)
let relativeTimeTimer: ReturnType<typeof setInterval> | null = null
const relative = (isoTime: string): string => { void relativeTimeTick.value; return runHistoryStore.formatRelativeTime(isoTime) }
onMounted(() => { relativeTimeTimer = setInterval(() => { relativeTimeTick.value += 1 }, 60_000) })
onBeforeUnmount(() => { if (relativeTimeTimer !== null) clearInterval(relativeTimeTimer) })
</script>

<style scoped>
/* The nested delegated rows' container queries (`WorkspaceStableExecutionRow`) name this container. */
.run-list-panel {
  container: workspace-history-panel / inline-size;
}
/* The Runs view's trees never slide rows (autobyteus-390): a row pushed by rows added, grown (a late Task line) or
   expanded above it is shown at its new place at once, and an Agent run's rows never drop from the top of the window on
   expand. Vue moves a `tree-row` group only when its move class has a transform transition, which it checks on a clone
   inside the group, so this turns the move off for every tree here. A finished Task's row still fades and closes by its
   own leave rules (treeRowLeave.css), which the Workspaces and Projects views keep with their move. */
.run-list-scroll :deep(.tree-row-move) {
  transition: none;
}
</style>

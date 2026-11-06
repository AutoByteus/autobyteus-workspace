<template>
  <!-- One run you started (UIS-001/002): disclosure cell, the main button (status, identity, name and title), the
       actions; then its delegated work, live (Agent run: Task rows; Team run: members; Org run: members). -->
  <li class="rounded-md" data-test="run-list-row" :data-kind="entry.kind" :data-run-id="entry.runId">
    <div
      class="group/run-row flex w-full items-stretch rounded-md text-sm transition-colors"
      :class="selected ? 'bg-indigo-50 text-indigo-900' : 'text-gray-700 hover:bg-gray-50'"
    >
      <button
        v-if="entry.kind === 'agent' && hasDelegated"
        type="button"
        class="ml-1 mt-[0.4375rem] inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center self-start rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        data-test="run-list-disclosure"
        :aria-expanded="state.isRunExpanded(entry.runId)"
        :aria-label="disclosureLabel"
        :title="disclosureLabel"
        @click="state.toggleRun(entry.runId)"
      >
        <Icon icon="heroicons:chevron-down-20-solid" class="h-3.5 w-3.5 transition-transform" :class="state.isRunExpanded(entry.runId) ? 'rotate-0' : '-rotate-90'" aria-hidden="true" />
      </button>
      <span v-else-if="entry.kind === 'agent'" class="ml-1 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <span v-else class="ml-1 mt-[0.4375rem] inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center self-start text-gray-400" aria-hidden="true">
        <Icon icon="heroicons:chevron-down-20-solid" class="h-3.5 w-3.5 transition-transform" :class="expanded ? 'rotate-0' : '-rotate-90'" data-test="run-list-row-chevron" />
      </span>

      <button
        type="button"
        :data-test="mainTestId"
        :data-run-id="entry.runId"
        class="flex min-w-0 flex-1 items-start py-1 pl-1.5 pr-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
        :aria-current="selected ? 'true' : undefined"
        :aria-expanded="entry.kind === 'agent' ? undefined : expanded"
        :aria-controls="entry.kind === 'org' && expanded ? orgTreeId : undefined"
        :title="rowTitle"
        @click="open"
      >
        <span class="inline-flex h-5 flex-shrink-0 items-center">
          <StatusDot v-if="entry.kind === 'agent'" class="mr-1.5" :status="entry.run.currentStatus" />
          <TeamAggregateStatusDot v-else-if="entry.kind === 'team'" class="mr-1.5" :status="teamRunStatus(entry.team)" />
          <span v-else class="mr-1.5 h-2 w-2 rounded-full" :class="entry.isActive ? 'bg-emerald-500' : 'bg-gray-300'" :aria-label="t(entry.isActive ? 'workspace.agentOrg.history.running' : 'workspace.agentOrg.history.stopped')" />
        </span>
        <span v-if="entry.kind === 'agent'" class="mr-1.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-[0.625rem] font-semibold text-gray-600" aria-hidden="true">
          <img
            v-if="avatars.showAgentAvatar(entry.folderRootPath ?? '', entry.agentDefinitionId, entry.avatarUrl)"
            :src="entry.avatarUrl || ''"
            alt=""
            class="h-full w-full object-cover"
            @error="avatars.onAgentAvatarError(entry.folderRootPath ?? '', entry.agentDefinitionId, entry.avatarUrl)"
          >
          <span v-else>{{ avatars.getAgentInitials(entry.name) }}</span>
        </span>
        <span v-else-if="entry.kind === 'team'" class="mr-1.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-gray-600" aria-hidden="true">
          <img
            v-if="avatars.showTeamAvatar(entry.team)"
            :key="avatars.getTeamAvatarUrl(entry.team)"
            :src="avatars.getTeamAvatarUrl(entry.team)"
            alt=""
            class="h-full w-full object-cover"
            @error="avatars.onTeamAvatarError(entry.team, ($event.target as HTMLImageElement).getAttribute('src') || '')"
          >
          <Icon v-else icon="heroicons:user-group-20-solid" class="h-3.5 w-3.5" />
        </span>
        <span v-else class="mr-1.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100 text-gray-600" aria-hidden="true">
          <img
            v-if="avatars.showOrgAvatar(entry.definitionId)"
            :key="avatars.getOrgAvatarUrl(entry.definitionId)"
            :src="avatars.getOrgAvatarUrl(entry.definitionId)"
            alt=""
            class="h-full w-full object-cover"
            @error="avatars.onOrgAvatarError(entry.definitionId, ($event.target as HTMLImageElement).getAttribute('src') || '')"
          >
          <Icon v-else icon="heroicons:building-office-2-20-solid" class="h-3.5 w-3.5" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate" :class="entry.kind === 'agent' ? 'font-medium' : 'font-semibold'" data-test="run-list-row-name">{{ entry.name }}</span>
          <span class="block truncate text-[0.6875rem] font-normal leading-4" :class="selected ? 'text-indigo-700' : 'text-gray-500'" data-test="run-list-row-title">{{ label }}</span>
        </span>
      </button>

      <RunListRowActions
        :stoppable="entry.isActive"
        :archivable="stored"
        :deletable="stored"
        :busy-stop="busy.stop"
        :busy-archive="busy.archive"
        :busy-delete="busy.remove"
        :labels="actionLabels"
        :age="age"
        @stop="stop"
        @archive="archive"
        @delete="remove"
      />
    </div>

    <!-- A Stop that failed says why under the Org row (existing feedback). -->
    <p v-if="orgTerminationError" class="px-7 py-1 text-xs text-red-600" role="alert" data-test="run-list-org-stop-error">{{ orgTerminationError }}</p>
    <!-- Task Agents and task Teams this run delegated to; they leave when their Task closes. Kept mounted while folded,
         so the rows keep their Task answers and show complete on unfold (autobyteus-390). -->
    <AgentRunTaskRows
      v-if="entry.kind === 'agent'"
      v-show="state.isRunExpanded(entry.runId)"
      :run-id="entry.runId"
      :label="label"
      :run-selected="state.selectedRunId === entry.runId"
      :has-collaboration="entry.run.hasCollaboration === true"
      @select-run="actions.onSelectRun(entry.run)"
      @open-run="openAgentRun(entry.run)"
    />
    <WorkspaceTeamExecutionTree
      v-else-if="entry.kind === 'team' && expanded"
      :team="entry.team"
      :tree-label="label"
      :avatars="avatars"
      :is-team-selected="selected"
      :is-row-expanded="(rowKey: string) => state.isTeamMemberExpanded(entry.runId, rowKey)"
      :format-relative-time="relative"
      @select="selectTeamRow"
      @toggle="(row: RunHistoryTeamExecutionRow) => state.toggleTeamMember(entry.runId, row.rowKey)"
      @open-run="entry.kind === 'team' && actions.onOpenTeamRun(entry.team)"
    />
    <AgentOrgRunMemberTree
      v-else-if="entry.kind === 'org' && expanded"
      :run="entry.orgRun"
      :name="entry.name"
      :tree-id="orgTreeId"
      :state="state"
      :actions="actions"
    />
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import StatusDot from '~/components/workspace/common/StatusDot.vue'
import TeamAggregateStatusDot from '~/components/workspace/history/TeamAggregateStatusDot.vue'
import AgentRunTaskRows from '~/components/workspace/history/AgentRunTaskRows.vue'
import WorkspaceTeamExecutionTree from '~/components/workspace/history/WorkspaceTeamExecutionTree.vue'
import AgentOrgRunMemberTree from '~/components/workspace/history/AgentOrgRunMemberTree.vue'
import RunListRowActions from '~/components/runList/RunListRowActions.vue'
import { teamRunStatus } from '~/components/workspace/history/workspaceHistoryTeamBranchStatus'
import { formatRunLabel, formatTeamRunLabel } from '~/components/workspace/history/workspaceHistoryRunLabels'
import type { WorkspaceHistoryAvatarBindings } from '~/components/workspace/history/workspaceHistorySectionContracts'
import type { RunListSectionActions, RunListSectionState } from '~/components/runList/runListSectionContracts'
import { useLocalization } from '~/composables/useLocalization'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import type { RunHistoryTeamExecutionRow } from '~/stores/runHistoryTypes'
import type { RunTreeRow } from '~/utils/runTreeProjection'
import type { RunListEntry } from '~/utils/runListProjection'

const props = defineProps<{
  entry: RunListEntry
  state: RunListSectionState
  avatars: WorkspaceHistoryAvatarBindings
  actions: RunListSectionActions
  /** The row tooltip's folder name (the temp workspace by name), or null. */
  folderLabel: string | null
  /** The relative age ("6m", "2h"), kept current by the list. */
  relative: (isoTime: string) => string
}>()

const { t } = useLocalization()
const collaboration = useAgentRunCollaborationStore()

const label = computed(() => {
  const entry = props.entry
  if (entry.kind === 'agent') return formatRunLabel(entry.run.summary)
  if (entry.kind === 'team') return formatTeamRunLabel(entry.team)
  return entry.orgRun.summary || t('workspace.agentOrg.history.newRun', { name: entry.name })
})
const rowTitle = computed(() => props.folderLabel ? t('runList.rowTitle', { name: props.entry.name, folder: props.folderLabel }) : props.entry.name)
const age = computed(() => props.relative(props.entry.lastActivityAt))
const mainTestId = computed(() => props.entry.kind === 'agent' ? 'workspace-agent-run-row'
  : props.entry.kind === 'team' ? `workspace-team-row-${props.entry.runId}` : `agent-org-run-open-${props.entry.runId}`)
const orgTreeId = computed(() => `run-list-org-${encodeURIComponent(props.entry.runId)}`)

const selected = computed(() => {
  const entry = props.entry
  if (entry.kind === 'agent') return props.state.selectedRunId === entry.runId && !collaboration.selectedChild(entry.runId)
  if (entry.kind === 'team') return props.state.isTeamRunSelected(entry.runId)
  return props.state.isAgentOrgRunSelected?.(entry.runId) ?? false
})
const expanded = computed(() => props.entry.kind === 'team'
  ? props.state.isTeamExpanded(props.entry.runId)
  : props.entry.kind === 'org' && (props.state.isAgentOrgRunExpanded?.(props.entry.runId) ?? false))
const orgTerminationError = computed(() => props.entry.kind === 'org' ? props.state.agentOrgTerminationError?.(props.entry.runId) ?? null : null)
const hasDelegated = computed(() => props.entry.kind === 'agent' && collaboration.taskRows(props.entry.runId).length > 0)
const disclosureLabel = computed(() => t(props.state.isRunExpanded(props.entry.runId) ? 'runList.collapse' : 'runList.expand', { name: props.entry.name }))

/** Stopped and stored: Archive and Delete are offered. */
const stored = computed(() => {
  const entry = props.entry
  if (entry.isActive) return false
  if (entry.kind === 'agent') return entry.run.source === 'history'
  return entry.kind === 'team' ? entry.team.deleteLifecycle === 'READY' : true
})
const busy = computed(() => {
  const { entry, state } = props
  const id = entry.runId
  if (entry.kind === 'agent') {
    return { stop: state.isRunTerminating(id), archive: state.isRunArchiving(id) || state.isRunDeleting(id), remove: state.isRunDeleting(id) || state.isRunArchiving(id) }
  }
  if (entry.kind === 'team') {
    const pending = state.isTeamArchiving(id) || state.isTeamDeleting(id) || state.isTeamTerminating(id)
    return { stop: state.isTeamTerminating(id), archive: pending, remove: pending }
  }
  const pending = (state.isAgentOrgArchiving?.(id) ?? false) || (state.isAgentOrgDeleting?.(id) ?? false)
  return { stop: state.isAgentOrgTerminating?.(id) ?? false, archive: pending, remove: pending }
})
const HISTORY_LABELS = 'workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection'
const actionLabels = computed(() => {
  if (props.entry.kind === 'agent') {
    return { stop: t(`${HISTORY_LABELS}.terminate_run`), archive: t(`${HISTORY_LABELS}.archive_run`), delete: t(`${HISTORY_LABELS}.delete_run_permanently`) }
  }
  if (props.entry.kind === 'team') {
    return { stop: t(`${HISTORY_LABELS}.terminate_team`), archive: t(`${HISTORY_LABELS}.archive_team_history`), delete: t(`${HISTORY_LABELS}.delete_team_history_permanently`) }
  }
  return { stop: t('workspace.agentOrg.history.stopLabel'), archive: t('workspace.agentOrg.history.archiveLabel'), delete: t('workspace.agentOrg.history.deleteLabel') }
})

/** The run row shows the run's own agent again (not a delegated copy under it). */
const openAgentRun = (run: RunTreeRow) => {
  collaboration.selectChild(run.runId, null)
  return props.actions.onSelectRun(run)
}
const open = () => {
  const entry = props.entry
  if (entry.kind === 'agent') return openAgentRun(entry.run)
  if (entry.kind === 'team') return props.actions.onSelectTeam(entry.team)
  // Opening an Org run shows its members under it, so a stopped Org can continue from a member's saved state.
  if (!expanded.value) props.state.toggleAgentOrgRun?.(entry.runId)
  return props.actions.onOpenAgentOrgRun?.(entry.orgRun)
}
const selectTeamRow = (row: RunHistoryTeamExecutionRow) => {
  if (props.entry.kind !== 'team' || !row.agentRunId) return
  return props.actions.onSelectTeamMember({ teamRunId: props.entry.runId, memberAddress: row.memberAddress, agentRunId: row.agentRunId })
}
const stop = () => {
  const entry = props.entry
  if (entry.kind === 'agent') return props.actions.onTerminateRun(entry.runId)
  if (entry.kind === 'team') return props.actions.onTerminateTeam(entry.runId)
  return props.actions.onTerminateAgentOrg?.(entry.orgRun)
}
const archive = () => {
  const entry = props.entry
  if (entry.kind === 'agent') return props.actions.onArchiveRun(entry.run)
  if (entry.kind === 'team') return props.actions.onArchiveTeam(entry.team)
  return props.actions.onArchiveAgentOrg?.(entry.orgRun)
}
const remove = () => {
  const entry = props.entry
  if (entry.kind === 'agent') return props.actions.onDeleteRun(entry.run)
  if (entry.kind === 'team') return props.actions.onDeleteTeam(entry.team)
  return props.actions.onDeleteAgentOrg?.(entry.orgRun)
}
</script>

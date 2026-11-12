<template>
  <!-- One Org run's members and delegated work, under its row. Rows of a DONE Task leave with motion. -->
  <TransitionGroup :id="treeId" tag="div" name="tree-row" :data-test="`agent-org-run-children-${run.rootRunId}`" class="team-execution-tree ml-3 space-y-0.5" role="tree" :aria-label="t('workspace.agentOrg.history.executionHierarchy', { name })" @before-leave="onBeforeLeave" @after-leave="onLeaveSettled" @leave-cancelled="onLeaveSettled">
    <template v-for="display in rows" :key="display.row.key">
      <button
        v-if="display.row.kind === 'agent'"
        type="button"
        class="org-execution-row relative flex min-h-7 w-full items-center rounded-md text-left text-sm disabled:cursor-wait disabled:opacity-60"
        :class="isMemberSelected(display.row.address, display.row.agentRunId) ? 'is-selected text-indigo-900' : 'text-gray-600 hover:bg-gray-50'"
        :style="rowStyle(display.row.depth)"
        :aria-label="agentRowLabel(display.row)"
        :aria-level="display.row.depth + 1"
        :aria-selected="isMemberSelected(display.row.address, display.row.agentRunId)"
        :data-test="`agent-org-agent-row-${display.row.agentRunId}`"
        :data-status="display.row.status"
        role="treeitem"
        @click="actions.onSelectAgentOrgMember?.(run, display.row.address)"
      >
        <WorkspaceHierarchyBranches :depth="display.row.depth" :continuing-ancestor-depths="display.continuingAncestorDepths" :has-following-sibling="display.hasFollowingSibling" />
        <span class="ml-2 mr-1 h-3.5 w-3.5 flex-none" aria-hidden="true" />
        <StatusDot class="mr-1.5" :status="display.row.status" />
        <span class="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[0.5625rem] font-semibold text-gray-600">{{ initials(display.row.address) }}</span>
        <span class="truncate">{{ label(display.row.address) }}</span>
      </button>
      <button
        v-else-if="display.row.kind === 'team'"
        type="button"
        class="org-execution-row relative flex min-h-7 w-full items-center rounded-md text-left text-sm disabled:cursor-wait disabled:opacity-60"
        :class="isMemberSelected(display.row.address) ? 'is-selected text-indigo-900' : 'text-gray-600 hover:bg-gray-50'"
        :style="rowStyle(display.row.depth)"
        :aria-expanded="isTeamExpanded(display.row.address)"
        :aria-label="teamRowLabel(display.row)"
        :aria-level="display.row.depth + 1"
        :aria-selected="isMemberSelected(display.row.address)"
        :data-test="`agent-org-team-row-${display.row.teamRunId}`"
        role="treeitem"
        @click="selectTeam(display.row.address)"
      >
        <WorkspaceHierarchyBranches :depth="display.row.depth" :continuing-ancestor-depths="display.continuingAncestorDepths" :has-following-sibling="display.hasFollowingSibling" />
        <Icon icon="heroicons:chevron-down-20-solid" class="ml-2 mr-1 h-3.5 w-3.5 text-gray-400" :class="isTeamExpanded(display.row.address) ? '' : '-rotate-90'" />
        <TeamAggregateStatusDot class="mr-1.5" :status="display.row.status" />
        <Icon icon="heroicons:user-group-20-solid" class="mr-1.5 h-4 w-4 text-gray-500" />
        <span class="truncate font-semibold">{{ label(display.row.address) }}</span>
      </button>
      <!-- SR-007: a running copy has the stop icon beside its row (never inside the row's button). -->
      <div v-else-if="display.row.kind === 'task_agent'" class="relative">
        <button type="button" @click="actions.onInspectAgentOrgExecution?.(run, display.row.agentRunId, display.row.address)" :aria-selected="isMemberSelected(display.row.address, display.row.agentRunId)" class="org-execution-row relative flex min-h-7 w-full items-center rounded-md text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" :class="isMemberSelected(display.row.address, display.row.agentRunId) ? 'is-selected text-indigo-900' : 'text-gray-600 hover:bg-gray-50'" :title="`${display.row.address} · ${display.row.agentRunId}`" :style="rowStyle(display.row.depth)" :aria-label="agentRowLabel(display.row)" :aria-level="display.row.depth + 1" :data-test="`agent-org-task-agent-row-${display.row.agentRunId}`" :data-agent-run-id="display.row.agentRunId" :data-status="display.row.status" role="treeitem">
          <WorkspaceHierarchyBranches :depth="display.row.depth" :continuing-ancestor-depths="display.continuingAncestorDepths" :has-following-sibling="display.hasFollowingSibling" />
          <span class="ml-2 mr-1 h-3.5 w-3.5 flex-none" aria-hidden="true" />
          <!-- A task Agent shows the same solid status dot and initials as a member; no visible
               "Started by" line. The starter stays in the accessible label. -->
          <StatusDot class="mr-1.5 flex-none" :status="display.row.status" />
          <span class="mr-1.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-gray-200 text-[0.5625rem] font-semibold text-gray-600" data-test="agent-org-task-agent-avatar">{{ initials(display.row.address) }}</span>
          <span class="truncate">{{ label(display.row.address) }}</span>
        </button>
        <DelegatedStopButton class="absolute right-1 top-1/2 -translate-y-1/2" :root="orgRoot" :reference="{ agentRunId: display.row.agentRunId }" :name="label(display.row.address)" />
      </div>
      <!-- autobyteus-278: a run this Org delegated to another node: the shared delegated row (node, title, Retry). -->
      <WorkspaceTransientExecutionRow
        v-else-if="display.row.kind === 'remote'"
        :row="display.row.transient"
        :team-status="display.row.teamStatus ?? undefined"
        :is-selected="display.row.transient.agentRunId !== null && isMemberSelected(display.row.openAddress, display.row.openAgentRunId)"
        :has-children="display.row.transient.hasChildren"
        :expanded="display.row.transient.teamRunIdForNode ? (state.isAgentOrgTaskTeamExpanded?.(run.rootRunId, display.row.transient.teamRunIdForNode) ?? true) : false"
        :continuing-ancestor-depths="[...display.continuingAncestorDepths]"
        :has-following-sibling="display.hasFollowingSibling"
        :stop-root="orgRoot"
        @select="actions.onInspectAgentOrgExecution?.(run, display.row.openAgentRunId, display.row.openAddress)"
        @toggle="(row) => row.teamRunIdForNode && state.toggleAgentOrgTaskTeam?.(run.rootRunId, row.teamRunIdForNode)"
      />
      <div v-else class="relative">
        <button type="button" @click="selectTaskTeam(display.row)" class="org-execution-row relative flex min-h-7 w-full items-center rounded-md text-left text-sm text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" :title="`${display.row.address} · ${display.row.teamRunId}`" :aria-label="taskTeamRowLabel(display.row)" :aria-expanded="display.row.hasChildren ? display.row.expanded : undefined" :style="rowStyle(display.row.depth)" :aria-level="display.row.depth + 1" :data-test="`agent-org-task-team-row-${display.row.teamRunId}`" role="treeitem">
          <WorkspaceHierarchyBranches :depth="display.row.depth" :continuing-ancestor-depths="display.continuingAncestorDepths" :has-following-sibling="display.hasFollowingSibling" />
          <Icon v-if="display.row.hasChildren" icon="heroicons:chevron-down-20-solid" class="ml-2 mr-1 h-3.5 w-3.5 flex-none text-gray-400" :class="display.row.expanded ? '' : '-rotate-90'" :data-test="`agent-org-task-team-disclosure-${display.row.teamRunId}`" aria-hidden="true" />
          <span v-else class="ml-2 mr-1 h-3.5 w-3.5 flex-none" aria-hidden="true" />
          <TeamAggregateStatusDot class="mr-1.5 flex-none" :status="display.row.status" />
          <!-- Teams share the people-group identity, in the tree's slate. -->
          <Icon icon="heroicons:user-group-20-solid" class="mr-1.5 h-4 w-4 flex-none text-slate-500" data-team-icon="temporary-task-team" />
          <span class="truncate font-semibold">{{ label(display.row.address) }}</span>
        </button>
        <DelegatedStopButton class="absolute right-1 top-1/2 -translate-y-1/2" :root="orgRoot" :reference="{ teamRunId: display.row.teamRunId }" :name="label(display.row.address)" />
      </div>
    </template>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import StatusDot from '~/components/workspace/common/StatusDot.vue'
import TeamAggregateStatusDot from './TeamAggregateStatusDot.vue'
import WorkspaceHierarchyBranches from './WorkspaceHierarchyBranches.vue'
import DelegatedStopButton from './DelegatedStopButton.vue'
import WorkspaceTransientExecutionRow from './WorkspaceTransientExecutionRow.vue'
import type { DelegatedRoot } from '~/services/runConfigEditing/delegatedLaunchSelectionClient'
import type { RunListSectionActions, RunListSectionState } from '~/components/runList/runListSectionContracts'
import { useLocalization } from '~/composables/useLocalization'
import type { AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes'
import type { AgentStatus } from '~/types/agent/AgentStatus'
import type { TeamStatus } from '~/utils/workspaceTeamAggregateStatus'
import { useLeavingTreeRows } from './useLeavingTreeRows'
import { projectAgentOrgHistoryRows, type AgentOrgHistoryAgentRow, type AgentOrgHistoryDelegator, type AgentOrgHistoryTaskAgentRow, type AgentOrgHistoryTaskTeamRow, type AgentOrgHistoryTeamRow } from '~/utils/agentOrgHistoryRows'

const props = defineProps<{
  run: AgentOrgRunHistoryItem
  /** The Org's name, for the tree's accessible name. */
  name: string
  /** The tree's element id, for the Org row's `aria-controls`. */
  treeId: string
  state: RunListSectionState
  actions: RunListSectionActions
}>()
const { t } = useLocalization()
// The Org run's open button sits in the row above this tree.
const { onBeforeLeave, onLeaveSettled } = useLeavingTreeRows(
  (tree) => tree.previousElementSibling?.querySelector<HTMLElement>('[data-test^="agent-org-run-open-"]') ?? null)
const isMemberSelected = (address: string, agentRunId?: string) => props.state.isAgentOrgMemberSelected?.(props.run.rootRunId, address, agentRunId) ?? false
const isTeamExpanded = (address: string) => props.state.isAgentOrgTeamExpanded?.(props.run.rootRunId, address) ?? false
const label = memberDisplayName
const initials = (address: string) => label(address).split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
const startedBy = (delegator: AgentOrgHistoryDelegator) =>
  t('workspace.members.started_by', { name: delegator.address ? label(delegator.address) : delegator.agentRunId })
const agentStatusLabelKey = (status: AgentStatus) => `workspace.history.hierarchy.status.${status}`
const teamStatusLabelKey = (status: TeamStatus) => `workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_${status}`
const agentRowLabel = (row: AgentOrgHistoryAgentRow | AgentOrgHistoryTaskAgentRow) => {
  const status = t(agentStatusLabelKey(row.status))
  const starter = 'delegatedBy' in row && row.delegatedBy ? `, ${startedBy(row.delegatedBy)}` : ''
  return `${label(row.address)}, ${status}${starter}, ${row.address}, ${row.agentRunId}`
}
const taskTeamRowLabel = (row: AgentOrgHistoryTaskTeamRow) =>
  `${label(row.address)}. ${t(teamStatusLabelKey(row.status))}${row.delegatedBy ? `, ${startedBy(row.delegatedBy)}` : ''}, ${row.address}, ${row.teamRunId}`
const teamRowLabel = (row: AgentOrgHistoryTeamRow) => `${label(row.address)}. ${t(teamStatusLabelKey(row.status))}`
const rowStyle = (depth: number) => ({ paddingLeft: `calc((${depth} + 1) * 0.875rem)` })
const rows = computed(() => projectAgentOrgHistoryRows({
  run: props.run,
  context: props.state.agentOrgContextFor?.(props.run.rootRunId) ?? null,
  isTeamExpanded,
  isTaskTeamExpanded: (teamRunId) => props.state.isAgentOrgTaskTeamExpanded?.(props.run.rootRunId, teamRunId) ?? true,
}))
const selectTeam = (address: string) => {
  props.state.toggleAgentOrgTeam?.(props.run.rootRunId, address)
  return props.actions.onSelectAgentOrgMember?.(props.run, address)
}
const orgRoot = computed<DelegatedRoot>(() => ({ rootKind: 'AGENT_ORG', rootRunId: props.run.rootRunId }))
const selectTaskTeam = (row: AgentOrgHistoryTaskTeamRow) => {
  if (row.hasChildren) props.state.toggleAgentOrgTaskTeam?.(props.run.rootRunId, row.teamRunId)
  return props.actions.onInspectAgentOrgExecution?.(props.run, row.coordinatorAgentRunId, row.coordinatorAddress)
}
</script>

<style scoped src="./treeRowLeave.css"></style>
<style scoped>
.org-execution-row { isolation: isolate; }
.org-execution-row > :not(.hierarchy-branches) { position: relative; z-index: 2; }
.org-execution-row.is-selected { border-radius: 0; background-color: #eef2ff; box-shadow: inset 2px 0 #6366f1; }
</style>

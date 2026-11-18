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
        <StatusDot class="mr-1.5" :status="display.row.status" :background-tasks-running="display.row.backgroundTasksRunning" />
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
        <TeamAggregateStatusDot class="mr-1.5" :status="display.row.status" :background-tasks-running="display.row.backgroundTasksRunning" />
        <Icon icon="heroicons:user-group-20-solid" class="mr-1.5 h-4 w-4 text-gray-500" />
        <span class="truncate font-semibold">{{ label(display.row.address) }}</span>
      </button>
      <!-- A run this Org delegated, here or on another node (SR-084): the shared delegated row, as in every view (FU-031). -->
      <WorkspaceDelegatedRunRow
        v-else
        :row="display.delegatedRun!"
        :team-status="display.teamStatus ?? undefined"
        :is-selected="display.delegatedRun!.agentRunId !== null && isMemberSelected(display.row.address, display.delegatedRun!.agentRunId)"
        :has-children="display.delegatedRun!.hasChildren"
        :expanded="display.expanded"
        :continuing-ancestor-depths="[...display.continuingAncestorDepths]"
        :has-following-sibling="display.hasFollowingSibling"
        :stop-root="orgRoot"
        @select="openDelegated(display.tree)"
        @toggle="state.toggleAgentOrgTaskTeam?.(run.rootRunId, display.tree.key)"
      />
    </template>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import StatusDot from '~/components/workspace/common/StatusDot.vue'
import TeamAggregateStatusDot from './TeamAggregateStatusDot.vue'
import WorkspaceHierarchyBranches from './WorkspaceHierarchyBranches.vue'
import WorkspaceDelegatedRunRow from './WorkspaceDelegatedRunRow.vue'
import type { DelegatedRoot } from '~/services/runConfigEditing/delegatedLaunchSelectionClient'
import type { RunListSectionActions, RunListSectionState } from '~/components/runList/runListSectionContracts'
import { useLocalization } from '~/composables/useLocalization'
import type { AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { TeamStatus } from '~/utils/workspaceTeamAggregateStatus'
import { useLeavingTreeRows } from './useLeavingTreeRows'
import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import type { RunHistoryDelegatedRunRow } from '~/stores/runHistoryTypes'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { useRunStatusStore } from '~/stores/runStatusStore'
import { isTeamRow, runTreeDisplayRows } from '~/utils/runTree/runTreeDisplayRows'
import { resolveTeamStatus, teamActivityOf } from '~/utils/workspaceTeamAggregateStatus'
import { agentActivityLabel } from '~/utils/agentActivityPresentation'

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
const agentStatusLabelKey = (status: AgentStatus) => `workspace.history.hierarchy.status.${status}`
const teamStatusLabelKey = (status: TeamStatus) => `workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_${status}`
const agentRowLabel = (row: OrgAgentRow) => `${label(row.address)}, ${agentActivityLabel(row, t, () => t(agentStatusLabelKey(row.status)))}, ${row.address}, ${row.agentRunId}`
const teamRowLabel = (row: OrgTeamRow) => `${label(row.address)}. ${agentActivityLabel(teamActivityOf(row.status, row.backgroundTasksRunning), t, () => t(teamStatusLabelKey(row.status)))}`
const rowStyle = (depth: number) => ({ paddingLeft: `calc((${depth} + 1) * 0.875rem)` })

// The Org run's tree, built on the server (autobyteus-461 SR-084): its open view's stream feeds it, else it is read while
// the Org is expanded, and read again when its rows change. Its own agents and mounted teams show as the Org's rows.
const trees = useRunTreeStore()
const runStatus = useRunStatusStore()
const treeRef = computed(() => ({ kind: 'agent_org' as const, runId: props.run.rootRunId }))
watch(() => props.run.rootRunId, (_id, _previous, onCleanup) => onCleanup(trees.hold(treeRef.value)), { immediate: true })

/** `backgroundTasksRunning`: the agent's own, or the mounted team's agents' sum (autobyteus-448). */
type OrgAgentRow = Readonly<{ key: string; kind: 'agent'; address: string; agentRunId: string; status: AgentStatus; backgroundTasksRunning: number; depth: number }>
type OrgTeamRow = Readonly<{ key: string; kind: 'team'; address: string; teamRunId: string; status: TeamStatus; backgroundTasksRunning: number; depth: number }>
type OrgDisplayRow = Readonly<{
  row: OrgAgentRow | OrgTeamRow | Readonly<{ key: string; kind: 'delegated'; address: string }>
  tree: RunTreeRowDto
  delegatedRun: RunHistoryDelegatedRunRow | null
  teamStatus: TeamStatus | null
  expanded: boolean
  continuingAncestorDepths: readonly number[]
  hasFollowingSibling: boolean
}>
const statusOf = (id: string): AgentStatus => (runStatus.statusOf(id) ?? AgentStatus.Offline) as AgentStatus
/** An Org's own row (its agents, its mounted teams and their members) opens in the Org; any other row is a run it delegated. */
const isOwn = (row: RunTreeRowDto) => row.openTarget?.runKind === 'agent_org' || row.kind === 'org_agent' || row.kind === 'org_team'
/** A mounted team folds by its address (the Org's own state); a delegated row by its key, expanded unless the user folded it. */
const isExpanded = (row: RunTreeRowDto) => row.kind === 'org_team' ? isTeamExpanded(row.address ?? '')
  : props.state.isAgentOrgTaskTeamExpanded?.(props.run.rootRunId, row.key) ?? true
const rows = computed<OrgDisplayRow[]>(() => runTreeDisplayRows({
  rows: trees.rowsOf(treeRef.value), rootKey: null, topRunId: props.run.rootRunId, isExpanded,
  statusOf: (row, id) => row.kind === 'team' || row.kind === 'peer_team' ? runStatus.runStateOf({ kind: 'agent_team', runId: id })?.status ?? null : runStatus.statusOf(id),
}).map((display) => {
  const tree = display.tree
  const base = { tree, expanded: isExpanded(tree), continuingAncestorDepths: display.continuingAncestorDepths, hasFollowingSibling: display.hasFollowingSibling }
  if (tree.kind === 'org_team') {
    // An Org's mounted team is one of its own parts: its status is its members', as the Org's own stream reports them.
    const status = resolveTeamStatus(tree.statusIds.map(statusOf), true)
    return { ...base, row: { key: tree.key, kind: 'team', address: tree.address ?? '', teamRunId: tree.key.slice('org_team:'.length), status,
      backgroundTasksRunning: runStatus.treeRowBackgroundTasksOf(tree, tree.key), depth: display.row.depth },
      delegatedRun: null, teamStatus: null }
  }
  if (isOwn(tree)) {
    return { ...base, row: { key: tree.key, kind: 'agent', address: tree.address ?? '', agentRunId: tree.openTarget!.agentRunId,
      status: statusOf(tree.statusIds[0]!), backgroundTasksRunning: runStatus.backgroundTasksOf(tree.statusIds[0]!), depth: display.row.depth },
      delegatedRun: null, teamStatus: null }
  }
  return { ...base, row: { key: tree.key, kind: 'delegated', address: tree.address ?? '' }, delegatedRun: display.row, teamStatus: display.teamStatus }
}))
const selectTeam = (address: string) => {
  props.state.toggleAgentOrgTeam?.(props.run.rootRunId, address)
  return props.actions.onSelectAgentOrgMember?.(props.run, address)
}
const orgRoot = computed<DelegatedRoot>(() => ({ rootKind: 'AGENT_ORG', rootRunId: props.run.rootRunId }))
/** A delegated row opens where the server says (SR-084): a team row at its coordinator; a team row also folds. */
const openDelegated = (tree: RunTreeRowDto) => {
  const target = tree.openTarget
  if (!target) return
  // A team row's address is the team's, not its coordinator's: the target alone names the agent.
  return props.actions.onInspectAgentOrgExecution?.(props.run, target.agentRunId, isTeamRow(tree) ? '' : tree.address ?? '')
}
</script>

<style scoped src="./treeRowLeave.css"></style>
<style scoped>
.org-execution-row { isolation: isolate; }
.org-execution-row > :not(.hierarchy-branches) { position: relative; z-index: 2; }
.org-execution-row.is-selected { border-radius: 0; background-color: #eef2ff; box-shadow: inset 2px 0 #6366f1; }
</style>

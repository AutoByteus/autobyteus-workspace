<template>
  <div v-if="groups.length" class="mt-1 space-y-0.5" data-test="workspace-agent-orgs">
    <div class="px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-400">
      {{ t('workspace.agentOrg.history.collectionLabel') }}
    </div>
    <div v-for="group in groups" :key="group.stableKey" class="rounded-md">
      <button
        type="button"
        class="flex w-full items-center rounded-md px-2 py-1 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
        :data-test="`agent-org-definition-${group.definitionId}`"
        :aria-expanded="isDefinitionExpanded(group.definitionId)"
        @click="toggleDefinition(group.definitionId)"
      >
        <Icon icon="heroicons:chevron-down-20-solid" class="mr-1 h-3.5 w-3.5 text-gray-400 transition-transform" :class="isDefinitionExpanded(group.definitionId) ? '' : '-rotate-90'" />
        <span class="mr-1.5 inline-flex h-5 w-5 flex-none items-center justify-center overflow-hidden rounded bg-gray-100 text-gray-600">
          <img v-if="avatars.showOrgAvatar(group.definitionId)" :key="avatars.getOrgAvatarUrl(group.definitionId)"
            :src="avatars.getOrgAvatarUrl(group.definitionId)" :alt="group.name" class="h-full w-full object-cover"
            @error="avatars.onOrgAvatarError(group.definitionId, ($event.target as HTMLImageElement).getAttribute('src') || '')" >
          <Icon v-else icon="heroicons:building-office-2-20-solid" class="h-3.5 w-3.5" />
        </span>
        <span class="truncate font-medium">{{ group.name }}</span>
        <span class="ml-1 text-xs text-gray-400">({{ group.runs.length }})</span>
      </button>

      <div v-if="isDefinitionExpanded(group.definitionId)" class="ml-3 mt-0.5 space-y-0.5">
        <div v-for="run in group.runs" :key="run.stableKey" class="rounded-md">
          <div class="group/org-row flex items-center justify-between rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-gray-50">
            <button
              type="button"
              :data-test="`agent-org-run-open-${run.rootRunId}`"
              class="flex min-w-0 flex-1 items-center text-left"
              :class="isRunSelected(run.rootRunId) ? 'text-indigo-900' : ''"
              :aria-current="isRunSelected(run.rootRunId) ? 'true' : undefined"
              :aria-expanded="isRunExpanded(run.rootRunId)"
              :aria-controls="isRunExpanded(run.rootRunId) ? hierarchyId(run.rootRunId) : undefined"
              :aria-selected="isRunSelected(run.rootRunId)"
              role="treeitem"
              @click="openRun(run)"
            >
              <Icon
                icon="heroicons:chevron-down-20-solid"
                class="mr-1 h-3.5 w-3.5 flex-none text-gray-400 transition-transform"
                :class="isRunExpanded(run.rootRunId) ? '' : '-rotate-90'"
                :data-test="`agent-org-run-disclosure-${run.rootRunId}`"
                aria-hidden="true"
              />
              <span class="mr-1.5 h-2 w-2 flex-none rounded-full" :class="run.isActive ? 'bg-emerald-500' : 'bg-gray-300'" :aria-label="run.isActive ? t('workspace.agentOrg.history.running') : t('workspace.agentOrg.history.stopped')" />
              <span class="truncate font-medium">{{ run.summary || t('workspace.agentOrg.history.newRun', { name: group.name }) }}</span>
            </button>
            <button
              v-if="run.isActive"
              type="button"
              class="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              :title="t('workspace.agentOrg.history.stopLabel')"
              :aria-label="t('workspace.agentOrg.history.stopLabel')"
              :disabled="isTerminating(run.rootRunId)"
              @click.stop="actions.onTerminateAgentOrg?.(run)"
            >
              <Icon icon="heroicons:stop-20-solid" class="h-3.5 w-3.5" />
            </button>
            <span class="ml-2 text-xs text-gray-400">{{ relative(run.createdAt) }}</span>
          </div>
          <p v-if="terminationError(run.rootRunId)" class="px-7 py-1 text-xs text-red-600" role="alert">
            {{ terminationError(run.rootRunId) }}
          </p>

          <div v-if="isRunExpanded(run.rootRunId)" :id="hierarchyId(run.rootRunId)" :data-test="`agent-org-run-children-${run.rootRunId}`" class="team-execution-tree ml-3 space-y-0.5" role="tree" :aria-label="t('workspace.agentOrg.history.executionHierarchy', { name: group.name })">
            <template v-for="display in rowsFor(run)" :key="display.row.key">
              <button
                v-if="display.row.kind === 'agent'"
                type="button"
                class="org-execution-row relative flex min-h-7 w-full items-center rounded-md text-left text-sm disabled:cursor-wait disabled:opacity-60"
                :class="isMemberSelected(run.rootRunId, display.row.address, display.row.agentRunId) ? 'is-selected text-indigo-900' : 'text-gray-600 hover:bg-gray-50'"
                :style="rowStyle(display.row.depth)"
                :aria-label="agentRowLabel(display.row)"
                :aria-level="display.row.depth + 1"
                :aria-selected="isMemberSelected(run.rootRunId, display.row.address, display.row.agentRunId)"
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
                :class="isMemberSelected(run.rootRunId, display.row.address) ? 'is-selected text-indigo-900' : 'text-gray-600 hover:bg-gray-50'"
                :style="rowStyle(display.row.depth)"
                :aria-expanded="isTeamExpanded(run.rootRunId, display.row.address)"
                :aria-label="teamRowLabel(display.row)"
                :aria-level="display.row.depth + 1"
                :aria-selected="isMemberSelected(run.rootRunId, display.row.address)"
                :data-test="`agent-org-team-row-${display.row.teamRunId}`"
                role="treeitem"
                @click="selectTeam(run, display.row.address)"
              >
                <WorkspaceHierarchyBranches :depth="display.row.depth" :continuing-ancestor-depths="display.continuingAncestorDepths" :has-following-sibling="display.hasFollowingSibling" />
                <Icon icon="heroicons:chevron-down-20-solid" class="ml-2 mr-1 h-3.5 w-3.5 text-gray-400" :class="isTeamExpanded(run.rootRunId, display.row.address) ? '' : '-rotate-90'" />
                <TeamAggregateStatusDot class="mr-1.5" :status="display.row.status" />
                <Icon icon="heroicons:user-group-20-solid" class="mr-1.5 h-4 w-4 text-gray-500" />
                <span class="truncate font-semibold">{{ label(display.row.address) }}</span>
              </button>
              <button type="button" v-else-if="display.row.kind === 'task_agent'" @click="actions.onInspectAgentOrgExecution?.(run, display.row.agentRunId, display.row.address)" :aria-selected="isMemberSelected(run.rootRunId, display.row.address, display.row.agentRunId)" class="org-execution-row relative flex min-h-7 w-full items-center rounded-md text-sm" :class="isMemberSelected(run.rootRunId, display.row.address, display.row.agentRunId) ? 'is-selected text-indigo-900' : 'text-gray-600 hover:bg-gray-50'" :title="`${display.row.address} · ${display.row.agentRunId}`" :style="rowStyle(display.row.depth)" :aria-label="agentRowLabel(display.row)" :aria-level="display.row.depth + 1" :data-test="`agent-org-task-agent-row-${display.row.agentRunId}`" :data-status="display.row.status" role="treeitem">
                <WorkspaceHierarchyBranches :depth="display.row.depth" :continuing-ancestor-depths="display.continuingAncestorDepths" :has-following-sibling="display.hasFollowingSibling" />
                <span class="ml-2 mr-1 h-3.5 w-3.5 flex-none" aria-hidden="true" />
                <StatusDot class="mr-1.5" :status="display.row.status" :variant="display.row.taskKind === 'direct' ? 'transient' : 'solid'" />
                <span class="truncate">{{ display.row.taskKind === 'direct' ? taskLabel(display.row.address) : label(display.row.address) }} · {{ display.row.agentRunId.slice(-6) }}</span>
              </button>
              <button type="button" v-else @click="actions.onInspectAgentOrgExecution?.(run, display.row.coordinatorAgentRunId, display.row.coordinatorAddress)" class="org-execution-row relative flex min-h-7 w-full items-center rounded-md text-sm text-gray-600 hover:bg-gray-50" :title="`${display.row.address} · ${display.row.teamRunId}`" :aria-label="`${taskLabel(display.row.address)} · ${display.row.teamRunId}`" :style="rowStyle(display.row.depth)" :aria-level="display.row.depth + 1" :data-test="`agent-org-task-team-row-${display.row.teamRunId}`" role="treeitem">
                <WorkspaceHierarchyBranches :depth="display.row.depth" :continuing-ancestor-depths="display.continuingAncestorDepths" :has-following-sibling="display.hasFollowingSibling" />
                <span class="ml-2 mr-1 h-3.5 w-3.5" aria-hidden="true" />
                <Icon icon="heroicons:user-group-20-solid" class="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                <span class="truncate">{{ taskLabel(display.row.address) }} · {{ display.row.teamRunId.slice(-6) }}</span>
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import StatusDot from '~/components/workspace/common/StatusDot.vue'
import TeamAggregateStatusDot from './TeamAggregateStatusDot.vue'
import WorkspaceHierarchyBranches from './WorkspaceHierarchyBranches.vue'
import type { WorkspaceHistoryAvatarBindings, WorkspaceHistorySectionActions, WorkspaceHistorySectionState } from './workspaceHistorySectionContracts'
import { useLocalization } from '~/composables/useLocalization'
import type { AgentOrgHistoryDefinitionGroup, AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes'
import type { AgentStatus } from '~/types/agent/AgentStatus'
import { projectAgentOrgHistoryRows, type AgentOrgHistoryAgentRow, type AgentOrgHistoryTaskAgentRow, type AgentOrgHistoryTeamRow } from '~/utils/agentOrgHistoryRows'

const props = defineProps<{
  workspaceId: string
  groups: AgentOrgHistoryDefinitionGroup[]
  state: WorkspaceHistorySectionState
  avatars: Pick<WorkspaceHistoryAvatarBindings, 'getOrgAvatarUrl' | 'showOrgAvatar' | 'onOrgAvatarError'>
  actions: WorkspaceHistorySectionActions
}>()
const { t } = useLocalization()
const hierarchyId = (rootRunId: string) => `org-hierarchy-${encodeURIComponent(props.workspaceId)}-${encodeURIComponent(rootRunId)}`
const isDefinitionExpanded = (definitionId: string) => props.state.isAgentOrgDefinitionExpanded?.(props.workspaceId, definitionId) ?? false
const toggleDefinition = (definitionId: string) => props.state.toggleAgentOrgDefinition?.(props.workspaceId, definitionId)
const isRunExpanded = (rootRunId: string) => props.state.isAgentOrgRunExpanded?.(rootRunId) ?? false
const isRunSelected = (rootRunId: string) => props.state.isAgentOrgRunSelected?.(rootRunId) ?? false
const isMemberSelected = (rootRunId: string, address: string, agentRunId?: string) => props.state.isAgentOrgMemberSelected?.(rootRunId, address, agentRunId) ?? false
const isTeamExpanded = (rootRunId: string, address: string) => props.state.isAgentOrgTeamExpanded?.(rootRunId, address) ?? false
const isTerminating = (rootRunId: string) => props.state.isAgentOrgTerminating?.(rootRunId) ?? false
const terminationError = (rootRunId: string) => props.state.agentOrgTerminationError?.(rootRunId) ?? null
const label = (address: string) => address.split('/').filter(Boolean).at(-1)?.replace(/[_-]+/g, ' ') || address
const initials = (address: string) => label(address).split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
const taskLabel = (address: string) => t('workspace.agentOrg.history.taskLabel', { name: label(address) })
const agentStatusLabelKey = (status: AgentStatus) => `workspace.history.hierarchy.status.${status}`
const teamStatusLabelKey = (status: AgentStatus) => `workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_${status}`
const agentRowLabel = (row: AgentOrgHistoryAgentRow | AgentOrgHistoryTaskAgentRow) => `${label(row.address)}, ${t(agentStatusLabelKey(row.status))}, ${row.address}, ${row.agentRunId}`
const teamRowLabel = (row: AgentOrgHistoryTeamRow) => `${label(row.address)}. ${t(teamStatusLabelKey(row.status))}`
const rowStyle = (depth: number) => ({ paddingLeft: `calc((${depth} + 1) * 0.875rem)` })
const relative = (createdAt: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(createdAt)) / 1000))
  if (seconds < 60) return t('workspace.agentOrg.history.relativeNow')
  if (seconds < 3600) return t('workspace.agentOrg.history.relativeMinutes', { count: Math.floor(seconds / 60) })
  if (seconds < 86400) return t('workspace.agentOrg.history.relativeHours', { count: Math.floor(seconds / 3600) })
  return t('workspace.agentOrg.history.relativeDays', { count: Math.floor(seconds / 86400) })
}
const rowsFor = (run: AgentOrgRunHistoryItem) => projectAgentOrgHistoryRows({
  run,
  context: props.state.agentOrgContextFor?.(run.rootRunId) ?? null,
  isTeamExpanded: (address) => isTeamExpanded(run.rootRunId, address),
})
const openRun = (run: AgentOrgRunHistoryItem) => {
  props.state.toggleAgentOrgRun?.(run.rootRunId)
  return props.actions.onOpenAgentOrgRun?.(run)
}
const selectTeam = (run: AgentOrgRunHistoryItem, address: string) => {
  props.state.toggleAgentOrgTeam?.(run.rootRunId, address)
  return props.actions.onSelectAgentOrgMember?.(run, address)
}
</script>

<style scoped>
.org-execution-row { isolation: isolate; }
.org-execution-row > :not(.hierarchy-branches) { position: relative; z-index: 2; }
.org-execution-row.is-selected { border-radius: 0; background-color: #eef2ff; box-shadow: inset 2px 0 #6366f1; }
</style>

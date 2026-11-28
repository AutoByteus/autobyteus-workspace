<template>
  <div v-if="groups.length" class="mt-1 space-y-0.5" data-test="workspace-agent-orgs">
    <div class="px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-400">
      {{ t('workspace.agentOrg.history.collectionLabel') }}
    </div>
    <div v-for="group in groups" :key="group.stableKey" class="rounded-md">
      <div class="group/org-header flex items-center rounded-md px-2 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center text-left"
        :data-test="`agent-org-definition-${group.definitionId}`"
        :aria-expanded="isDefinitionExpanded(group.definitionId)"
        @click="toggleDefinition(group.definitionId)"
      >
        <Icon icon="heroicons:chevron-down-20-solid" class="mr-1 h-3.5 w-3.5 text-gray-400 transition-transform" :class="isDefinitionExpanded(group.definitionId) ? '' : '-rotate-90'" />
        <DefinitionAvatar class="mr-1.5 h-5 w-5 rounded bg-gray-100 text-gray-600" kind="org" :name="group.name"
          :avatar-url="definitionAvatars.avatarOf('org', group.definitionId)" icon-class="h-3.5 w-3.5" :alt="group.name" />
        <span class="truncate font-medium">{{ group.name }}</span>
        <span class="ml-1 text-xs text-gray-400">({{ group.runs.length }})</span>
      </button>
      <button
        v-if="actions.onArchiveAgentOrgGroup"
        type="button"
        :data-test="`agent-org-group-archive-${group.definitionId}`"
        class="ml-2 inline-flex h-5 w-5 flex-none items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-amber-50 hover:text-amber-600 focus:opacity-100 md:opacity-0 md:group-hover/org-header:opacity-100 md:group-focus-within/org-header:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
        :title="t('workspace.history.groupArchive.archiveAll')"
        :aria-label="t('workspace.history.groupArchive.archiveAll')"
        :disabled="props.state.isGroupArchiving?.(agentOrgGroupArchiveKey(workspaceId, group.definitionId)) ?? false"
        @click.stop="actions.onArchiveAgentOrgGroup(workspaceId, group)"
      >
        <Icon icon="heroicons:archive-box-20-solid" class="h-3.5 w-3.5" />
      </button>
      </div>

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
            <div class="ml-2 flex flex-none items-center gap-1">
              <button
                v-if="run.isActive"
                type="button"
                class="inline-flex h-5 w-5 items-center justify-center rounded text-red-500 hover:bg-red-50 hover:text-red-600 disabled:text-gray-400 disabled:hover:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
                :title="t('workspace.agentOrg.history.stopLabel')"
                :aria-label="t('workspace.agentOrg.history.stopLabel')"
                :disabled="isTerminating(run.rootRunId)"
                @click.stop="actions.onTerminateAgentOrg?.(run)"
              >
                <Icon icon="heroicons:stop-20-solid" class="h-3.5 w-3.5" />
              </button>
              <button
                v-if="!run.isActive"
                type="button"
                :data-test="`agent-org-run-archive-${run.rootRunId}`"
                class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-amber-50 hover:text-amber-600 md:opacity-0 md:group-hover/org-row:opacity-100 md:group-focus-within/org-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                :title="t('workspace.agentOrg.history.archiveLabel')"
                :aria-label="t('workspace.agentOrg.history.archiveLabel')"
                :disabled="isArchiving(run.rootRunId) || isDeleting(run.rootRunId)"
                @click.stop="actions.onArchiveAgentOrg?.(run)"
              >
                <Icon icon="heroicons:archive-box-20-solid" class="h-3.5 w-3.5" />
              </button>
              <button
                v-if="!run.isActive"
                type="button"
                :data-test="`agent-org-run-delete-${run.rootRunId}`"
                class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/org-row:opacity-100 md:group-focus-within/org-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                :title="t('workspace.agentOrg.history.deleteLabel')"
                :aria-label="t('workspace.agentOrg.history.deleteLabel')"
                :disabled="isDeleting(run.rootRunId) || isArchiving(run.rootRunId)"
                @click.stop="actions.onDeleteAgentOrg?.(run)"
              >
                <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
              </button>
              <span class="ml-1 text-xs text-gray-400">{{ relative(run.createdAt) }}</span>
            </div>
          </div>
          <p v-if="terminationError(run.rootRunId)" class="px-7 py-1 text-xs text-red-600" role="alert">
            {{ terminationError(run.rootRunId) }}
          </p>

          <!-- The Org run's tree, from the server (SR-084): the one Org tree of every view. -->
          <AgentOrgRunMemberTree v-if="isRunExpanded(run.rootRunId)" :run="run" :name="group.name" :tree-id="hierarchyId(run.rootRunId)"
            :state="state as never" :actions="actions as never" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import AgentOrgRunMemberTree from './AgentOrgRunMemberTree.vue'
import type { WorkspaceHistorySectionActions, WorkspaceHistorySectionState } from './workspaceHistorySectionContracts'
import { useLocalization } from '~/composables/useLocalization'
import { agentOrgGroupArchiveKey } from '~/composables/useWorkspaceHistoryGroupArchive'
import type { AgentOrgHistoryDefinitionGroup, AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes'
import DefinitionAvatar from '~/components/common/DefinitionAvatar.vue'
import { useDefinitionAvatarStore } from '~/stores/definitionAvatarStore'

const definitionAvatars = useDefinitionAvatarStore()

const props = defineProps<{
  workspaceId: string
  groups: AgentOrgHistoryDefinitionGroup[]
  state: WorkspaceHistorySectionState
  actions: WorkspaceHistorySectionActions
}>()
const { t } = useLocalization()
const hierarchyId = (rootRunId: string) => `org-hierarchy-${encodeURIComponent(props.workspaceId)}-${encodeURIComponent(rootRunId)}`
const isDefinitionExpanded = (definitionId: string) => props.state.isAgentOrgDefinitionExpanded?.(props.workspaceId, definitionId) ?? false
const toggleDefinition = (definitionId: string) => props.state.toggleAgentOrgDefinition?.(props.workspaceId, definitionId)
const isRunExpanded = (rootRunId: string) => props.state.isAgentOrgRunExpanded?.(rootRunId) ?? false
const isRunSelected = (rootRunId: string) => props.state.isAgentOrgRunSelected?.(rootRunId) ?? false
const isTerminating = (rootRunId: string) => props.state.isAgentOrgTerminating?.(rootRunId) ?? false
const isDeleting = (rootRunId: string) => props.state.isAgentOrgDeleting?.(rootRunId) ?? false
const isArchiving = (rootRunId: string) => props.state.isAgentOrgArchiving?.(rootRunId) ?? false
const terminationError = (rootRunId: string) => props.state.agentOrgTerminationError?.(rootRunId) ?? null
const relative = (createdAt: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(createdAt)) / 1000))
  if (seconds < 60) return t('workspace.agentOrg.history.relativeNow')
  if (seconds < 3600) return t('workspace.agentOrg.history.relativeMinutes', { count: Math.floor(seconds / 60) })
  if (seconds < 86400) return t('workspace.agentOrg.history.relativeHours', { count: Math.floor(seconds / 3600) })
  return t('workspace.agentOrg.history.relativeDays', { count: Math.floor(seconds / 86400) })
}
const openRun = (run: AgentOrgRunHistoryItem) => {
  props.state.toggleAgentOrgRun?.(run.rootRunId)
  return props.actions.onOpenAgentOrgRun?.(run)
}
</script>

<style scoped src="./treeRowLeave.css"></style>
<style scoped>
.org-execution-row { isolation: isolate; }
.org-execution-row > :not(.hierarchy-branches) { position: relative; z-index: 2; }
.org-execution-row.is-selected { border-radius: 0; background-color: #eef2ff; box-shadow: inset 2px 0 #6366f1; }
</style>

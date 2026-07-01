<template>
  <section class="rounded-md">
    <div
      class="group/workspace-row flex items-center rounded-md text-sm text-gray-700 transition-colors hover:bg-gray-50 focus-within:bg-gray-50"
      data-test="workspace-row"
      :data-workspace-id="workspaceNode.workspaceId"
      :data-workspace-root="workspaceNode.workspaceRootPath"
      :aria-expanded="state.isWorkspaceExpanded(workspaceNode.workspaceId)"
    >
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center px-2 py-1.5 text-left"
        :aria-expanded="state.isWorkspaceExpanded(workspaceNode.workspaceId)"
        @click="state.toggleWorkspace(workspaceNode)"
      >
        <Icon
          icon="heroicons:chevron-down-20-solid"
          class="mr-1.5 h-4 w-4 text-gray-400 transition-transform"
          :class="state.isWorkspaceExpanded(workspaceNode.workspaceId) ? 'rotate-0' : '-rotate-90'"
        />
        <Icon icon="heroicons:folder-20-solid" class="mr-1.5 h-4 w-4 text-gray-500" />
        <span class="truncate">{{ workspaceNode.workspaceName }}</span>
      </button>
      <button
        v-if="workspaceNode.canRemoveFromWorkspaces"
        type="button"
        class="mr-1 inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 focus:opacity-100 md:opacity-0 md:group-hover/workspace-row:opacity-100 md:group-focus-within/workspace-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
        :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.remove_from_workspaces')"
        :aria-label="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.remove_from_workspaces')"
        :disabled="state.isWorkspaceRemoving(workspaceNode.workspaceId)"
        @click.stop="actions.onRemoveWorkspace(workspaceNode)"
      >
        <Icon icon="heroicons:x-mark-20-solid" class="h-4 w-4" />
      </button>
    </div>

    <div v-if="state.isWorkspaceExpanded(workspaceNode.workspaceId)" class="ml-2 mt-0.5 space-y-1">
      <div
        v-if="state.isWorkspaceHistoryLoading(workspaceNode.workspaceId)"
        class="px-3 py-1 text-xs text-gray-400"
      >{{ $t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.loading_workspace_history') }}</div>
      <div
        v-else-if="state.workspaceHistoryError(workspaceNode.workspaceId)"
        class="px-3 py-1 text-xs text-red-500"
      >{{ state.workspaceHistoryError(workspaceNode.workspaceId) }}</div>
      <div
        v-else-if="workspaceSessions.length === 0"
        class="px-3 py-1 text-xs text-gray-400"
      >{{ $t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.no_task_history_in_this_workspace') }}</div>

      <div v-else class="space-y-0.5">
        <template
          v-for="session in workspaceSessions"
          :key="session.sessionKey"
        >
          <WorkspaceHistorySessionRow
            :workspace-id="workspaceNode.workspaceId"
            :session="session"
            :state="state"
            :actions="actions"
          />
          <WorkspaceHistoryTeamMemberRows
            v-if="session.kind === 'team' && state.isSessionExpanded(session.sessionKey)"
            :workspace-id="workspaceNode.workspaceId"
            :session="session"
            :state="state"
            :actions="actions"
          />
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import WorkspaceHistorySessionRow from '~/components/workspace/history/WorkspaceHistorySessionRow.vue';
import WorkspaceHistoryTeamMemberRows from '~/components/workspace/history/WorkspaceHistoryTeamMemberRows.vue';
import type {
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts';
import type { WorkspaceHistorySessionRow as WorkspaceHistorySessionRowModel } from '~/stores/runHistorySessionProjection';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

defineProps<{
  workspaceNode: RunTreeWorkspaceNode;
  workspaceSessions: WorkspaceHistorySessionRowModel[];
  state: WorkspaceHistorySectionState;
  actions: WorkspaceHistorySectionActions;
}>();
</script>

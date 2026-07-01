<template>
  <div
    class="group/session-row flex items-start justify-between rounded-md px-2 py-1.5 text-sm transition-colors"
    :class="isSelected
      ? 'bg-indigo-50 text-indigo-900'
      : 'text-gray-700 hover:bg-gray-50'"
    :data-test="session.kind === 'team'
      ? `workspace-team-row-${session.sessionId}`
      : `workspace-session-row-${session.sessionKey}`"
    :data-session-key="session.sessionKey"
    :aria-expanded="session.kind === 'team' ? state.isSessionExpanded(session.sessionKey) : undefined"
    @click="actions.onSelectSession(session, workspaceId)"
  >
    <span
      class="mr-2 flex h-5 flex-shrink-0 items-center"
      data-test="workspace-session-leading-lane"
    >
      <button
        v-if="session.kind === 'team'"
        type="button"
        class="inline-flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :data-session-key="session.sessionKey"
        :aria-expanded="state.isSessionExpanded(session.sessionKey)"
        @click.stop="state.toggleSession(session.sessionKey)"
        @keydown.enter.stop
        @keydown.space.stop
      >
        <Icon
          icon="heroicons:chevron-down-20-solid"
          class="h-3.5 w-3.5 text-gray-400 transition-transform"
          :class="state.isSessionExpanded(session.sessionKey) ? 'rotate-0' : '-rotate-90'"
          data-test="workspace-team-run-disclosure"
          aria-hidden="true"
        />
      </button>
      <span
        v-else
        class="inline-flex h-3.5 w-3.5 flex-shrink-0"
        data-test="workspace-session-disclosure-placeholder"
        aria-hidden="true"
      />
      <span
        class="ml-1.5 inline-flex h-3.5 w-2 flex-shrink-0 items-center justify-center"
        data-test="workspace-session-status-dot"
        aria-hidden="true"
      >
        <StatusDot :kind="session.kind" :status="session.status" />
      </span>
    </span>

    <button
      type="button"
      class="min-w-0 flex-1 text-left"
      @click.stop="actions.onSelectSession(session, workspaceId)"
    >
      <span class="min-w-0 flex-1">
        <span class="block truncate font-medium">{{ session.displayLabel.title }}</span>
        <span class="block truncate text-xs" :class="isSelected ? 'text-indigo-700' : 'text-gray-500'">
          {{ session.displayLabel.subtitle }}
        </span>
      </span>
    </button>

    <div class="ml-2 flex flex-shrink-0 items-center gap-1 pt-0.5">
      <template v-if="session.kind === 'agent'">
        <button
          v-if="session.agentRun.isActive"
          type="button"
          class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.terminate_run')"
          :disabled="state.isRunTerminating(session.agentRun.runId)"
          @click.stop="actions.onTerminateRun(session.agentRun.runId)"
        >
          <Icon icon="heroicons:stop-20-solid" class="h-3.5 w-3.5" />
        </button>
        <button
          v-else-if="session.agentRun.source === 'draft'"
          type="button"
          class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/session-row:opacity-100 md:group-focus-within/session-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
          :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.remove_draft_run')"
          :disabled="state.isRunDeleting(session.agentRun.runId)"
          @click.stop="actions.onDeleteRun(session.agentRun)"
        >
          <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
        </button>
        <button
          v-else-if="session.agentRun.source === 'history' && !session.agentRun.isActive"
          type="button"
          class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-amber-50 hover:text-amber-600 md:opacity-0 md:group-hover/session-row:opacity-100 md:group-focus-within/session-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
          :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.archive_run')"
          :disabled="state.isRunArchiving(session.agentRun.runId) || state.isRunDeleting(session.agentRun.runId)"
          @click.stop="actions.onArchiveRun(session.agentRun)"
        >
          <Icon icon="heroicons:archive-box-20-solid" class="h-3.5 w-3.5" />
        </button>
        <button
          v-if="session.agentRun.source === 'history' && !session.agentRun.isActive"
          type="button"
          class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/session-row:opacity-100 md:group-focus-within/session-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
          :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.delete_run_permanently')"
          :disabled="state.isRunDeleting(session.agentRun.runId) || state.isRunArchiving(session.agentRun.runId)"
          @click.stop="actions.onDeleteRun(session.agentRun)"
        >
          <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
        </button>
      </template>

      <template v-else>
        <button
          v-if="session.teamRun.teamRunId.startsWith('temp-')"
          type="button"
          class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/session-row:opacity-100 md:group-focus-within/session-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
          :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.remove_draft_team')"
          :disabled="state.isTeamDeleting(session.teamRun.teamRunId)"
          @click.stop="actions.onDeleteTeam(session.teamRun)"
        >
          <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
        </button>
        <button
          v-else-if="state.canTerminateTeam(session.teamRun.currentStatus)"
          type="button"
          class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.terminate_team')"
          :disabled="state.isTeamTerminating(session.teamRun.teamRunId)"
          @click.stop="actions.onTerminateTeam(session.teamRun.teamRunId)"
        >
          <Icon icon="heroicons:stop-20-solid" class="h-3.5 w-3.5" />
        </button>
        <button
          v-else-if="session.teamRun.deleteLifecycle === 'READY'"
          type="button"
          class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-amber-50 hover:text-amber-600 md:opacity-0 md:group-hover/session-row:opacity-100 md:group-focus-within/session-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
          :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.archive_team_history')"
          :disabled="state.isTeamArchiving(session.teamRun.teamRunId) || state.isTeamDeleting(session.teamRun.teamRunId)"
          @click.stop="actions.onArchiveTeam(session.teamRun)"
        >
          <Icon icon="heroicons:archive-box-20-solid" class="h-3.5 w-3.5" />
        </button>
        <button
          v-if="!session.teamRun.teamRunId.startsWith('temp-') && !state.canTerminateTeam(session.teamRun.currentStatus) && session.teamRun.deleteLifecycle === 'READY'"
          type="button"
          class="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-[opacity,color,background-color] duration-150 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover/session-row:opacity-100 md:group-focus-within/session-row:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
          :title="$t('workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.delete_team_history_permanently')"
          :disabled="state.isTeamDeleting(session.teamRun.teamRunId) || state.isTeamArchiving(session.teamRun.teamRunId)"
          @click.stop="actions.onDeleteTeam(session.teamRun)"
        >
          <Icon icon="heroicons:trash-20-solid" class="h-3.5 w-3.5" />
        </button>
      </template>

      <span class="text-xs text-gray-400">
        {{ state.formatRelativeTime(session.lastActivityAt) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import type {
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts';
import type { WorkspaceHistorySessionRow } from '~/stores/runHistorySessionProjection';

const props = defineProps<{
  workspaceId: string;
  session: WorkspaceHistorySessionRow;
  state: WorkspaceHistorySectionState;
  actions: WorkspaceHistorySectionActions;
}>();

const isSelected = computed(() => props.state.selectedSessionKey === props.session.sessionKey);
</script>

<template>
  <div class="flex h-full flex-col bg-white">
    <div class="flex items-center justify-between border-t border-gray-200 px-3 py-2">
      <h3 class="text-sm font-semibold text-gray-700">Workspaces</h3>
      <button
        type="button"
        class="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
        :title="$t('workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.add_workspace')"
        @click="onCreateWorkspace"
      >
        <Icon icon="heroicons:plus-20-solid" class="h-4 w-4" />
      </button>
    </div>

    <form
      v-if="showCreateWorkspaceInline"
      class="border-t border-gray-100 px-3 py-2"
      data-test="create-workspace-form"
      @submit.prevent="confirmCreateWorkspace"
    >
      <div class="space-y-2">
        <input
          id="workspace-path-input"
          ref="workspacePathInputRef"
          v-model="workspacePathDraft"
          data-test="workspace-path-input"
          type="text"
          class="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100"
          :class="workspacePathError ? 'border-red-300 focus:border-red-300 focus:ring-red-200' : ''"
          :placeholder="$t('workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.users_you_project')"
          :disabled="creatingWorkspace"
          @keydown.enter.prevent="confirmCreateWorkspace"
          @keydown.esc.prevent="closeCreateWorkspaceInput"
        >
        <p v-if="workspacePathError" class="text-xs text-red-600">
          {{ workspacePathError }}
        </p>
        <div class="flex items-center justify-end gap-2">
          <button
            data-test="cancel-create-workspace"
            type="button"
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="creatingWorkspace"
            @click="closeCreateWorkspaceInput"
          >
            Cancel
          </button>
          <button
            data-test="confirm-create-workspace"
            type="submit"
            class="rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="creatingWorkspace"
          >
            {{ creatingWorkspace ? 'Adding...' : 'Add' }}
          </button>
        </div>
      </div>
    </form>

    <div class="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
      <div v-if="runHistoryStore.loading" class="px-3 py-4 text-xs text-gray-500">{{ $t('workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.loading_task_history') }}</div>

      <div v-else-if="runHistoryStore.error" class="px-3 py-4 text-xs text-red-600">
        {{ runHistoryStore.error }}
      </div>

      <div
        v-else-if="workspaceNodes.length === 0"
        class="px-3 py-4 text-xs text-gray-500"
      >{{ $t('workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.no_run_history_yet') }}</div>

      <div v-else class="space-y-1">
        <WorkspaceHistoryWorkspaceSection
          v-for="workspaceNode in workspaceNodes"
          :key="workspaceNode.workspaceId"
          :workspace-node="workspaceNode"
          :workspace-teams="workspaceTeams(workspaceNode.workspaceRootPath)"
          :workspace-team-history-groups="workspaceTeamHistoryGroups(workspaceNode.workspaceRootPath)"
          :state="sectionState"
          :avatars="sectionAvatarBindings"
          :actions="sectionActions"
        />
      </div>
    </div>

    <ConfirmationModal
      :show="showDeleteConfirmation"
      title=""
      :message="deleteConfirmationMessage"
      confirm-button-text="Delete"
      variant="danger"
      typography-size="large"
      @confirm="confirmDeleteRun"
      @cancel="closeDeleteConfirmation"
    />

    <ConfirmationModal
      :show="showRemoveWorkspaceConfirmation"
      :title="$t('workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.remove_workspace_title')"
      :message="removeWorkspaceConfirmationMessage"
      :confirm-button-text="$t('workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.remove_workspace_confirm')"
      variant="danger"
      typography-size="large"
      @confirm="confirmRemoveWorkspace"
      @cancel="closeRemoveWorkspaceConfirmation"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { Icon } from '@iconify/vue';
import ConfirmationModal from '~/components/common/ConfirmationModal.vue';
import WorkspaceHistoryWorkspaceSection from '~/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue';
import type {
  WorkspaceHistoryAvatarBindings,
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useToasts } from '~/composables/useToasts';
import { pickFolderPath } from '~/composables/useNativeFolderDialog';
import { useRunHistoryAvatarState } from '~/composables/useRunHistoryAvatarState';
import { useWorkspaceHistorySelectionActions } from '~/composables/useWorkspaceHistorySelectionActions';
import { useWorkspaceHistoryTreeState } from '~/composables/useWorkspaceHistoryTreeState';
import { useWorkspaceHistoryWorkspaceCreation } from '~/composables/useWorkspaceHistoryWorkspaceCreation';
import { useWorkspaceHistoryWorkspaceRemoval } from '~/composables/useWorkspaceHistoryWorkspaceRemoval';
import { useWorkspaceHistoryMutations } from '~/composables/useWorkspaceHistoryMutations';
import { useLocalization } from '~/composables/useLocalization';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

const emit = defineEmits<{
  (e: 'run-selected', payload: { type: 'agent'; runId: string }): void;
  (e: 'run-selected', payload: { type: 'team'; runId: string }): void;
  (e: 'run-created', payload: { type: 'agent'; definitionId: string }): void;
}>();

const HISTORY_REFRESH_INTERVAL_MS = 5000;

const runHistoryStore = useRunHistoryStore();
const workspaceStore = useWorkspaceStore();
const selectionStore = useAgentSelectionStore();
const agentRunStore = useAgentRunStore();
const teamRunStore = useAgentTeamRunStore();
const { stopPendingTeamIds } = storeToRefs(teamRunStore);
const agentDefinitionStore = useAgentDefinitionStore();
const agentTeamDefinitionStore = useAgentTeamDefinitionStore();
const windowNodeContextStore = useWindowNodeContextStore();
const { isEmbeddedWindow } = storeToRefs(windowNodeContextStore);
const { addToast } = useToasts();
const { t } = useLocalization();
const addWorkspaceToast = (message: string, type: 'success' | 'error' | 'warning' | 'info'): void => {
  addToast(message, type === 'warning' ? 'info' : type);
};

const treeState = useWorkspaceHistoryTreeState({
  runHistoryStore,
  selectionStore,
});
const { workspaceNodes, workspaceTeams, workspaceTeamHistoryGroups } = treeState;
const {
  getAgentInitials,
  getTeamInitials,
  getTeamAvatarUrl,
  getTeamMemberDisplayName,
  getTeamMemberInitials,
  getTeamMemberAvatarUrl,
  showAgentAvatar,
  showTeamAvatar,
  showTeamMemberAvatar,
  onAgentAvatarError,
  onTeamAvatarError,
  onTeamMemberAvatarError,
} = useRunHistoryAvatarState({
  loading: computed(() => runHistoryStore.loading),
  agentDefinitions: computed(() => agentDefinitionStore.agentDefinitions),
  teamDefinitions: computed(() => agentTeamDefinitionStore.agentTeamDefinitions),
});

const {
  showCreateWorkspaceInline,
  workspacePathDraft,
  workspacePathError,
  creatingWorkspace,
  workspacePathInputRef,
  onCreateWorkspace,
  closeCreateWorkspaceInput,
  confirmCreateWorkspace,
} = useWorkspaceHistoryWorkspaceCreation({
  isEmbeddedWindow,
  createWorkspace: (rootPath: string) => runHistoryStore.createWorkspace(rootPath),
  fetchAllWorkspaces: () => workspaceStore.fetchAllWorkspaces(),
  pickFolderPath,
  onWorkspaceCreated: (workspaceRootPath: string) => {
    treeState.setWorkspaceExpandedByRootPath(workspaceRootPath, true);
  },
});

const {
  terminatingRunIds,
  deletingRunIds,
  deletingTeamIds,
  archivingRunIds,
  archivingTeamIds,
  showDeleteConfirmation,
  deleteConfirmationMessage,
  onTerminateRun,
  onTerminateTeam,
  onArchiveRun,
  onArchiveTeam,
  onDeleteRun,
  onDeleteTeam,
  closeDeleteConfirmation,
  confirmDeleteRun,
} = useWorkspaceHistoryMutations({
  terminateRun: (runId: string) => agentRunStore.terminateRun(runId),
  terminateTeamRun: (teamRunId: string) => teamRunStore.terminateTeamRun(teamRunId),
  removeDraftRun: async (runId: string) => {
    await agentRunStore.closeAgent(runId, { terminate: false });
    return true;
  },
  deleteRun: (runId: string) => runHistoryStore.deleteRun(runId),
  deleteTeamRun: (teamRunId: string) => runHistoryStore.deleteTeamRun(teamRunId),
  archiveRun: (runId: string) => runHistoryStore.archiveRun(runId),
  archiveTeamRun: (teamRunId: string) => runHistoryStore.archiveTeamRun(teamRunId),
  addToast: addWorkspaceToast,
  stopPendingTeamIds,
});

const {
  pendingWorkspace,
  removingWorkspaceIds,
  showRemoveConfirmation: showRemoveWorkspaceConfirmation,
  onRemoveWorkspace,
  closeRemoveConfirmation: closeRemoveWorkspaceConfirmation,
  confirmRemoveWorkspace,
} = useWorkspaceHistoryWorkspaceRemoval({
  removeWorkspace: (workspaceId: string) => workspaceStore.removeWorkspace(workspaceId),
  pruneWorkspaceHistory: (workspaceId, rootPath) => runHistoryStore.pruneWorkspace(workspaceId, rootPath),
  pruneWorkspaceExpansion: (workspaceId) => treeState.pruneWorkspace(workspaceId),
  addToast: addWorkspaceToast,
});

const {
  onSelectRun,
  onSelectTeam,
  onSelectTeamMember,
  onCreateRun,
} = useWorkspaceHistorySelectionActions({
  runHistoryStore,
  selectionStore,
  setTeamExpanded: treeState.setTeamExpanded,
  toggleTeam: treeState.toggleTeam,
  expandTeamMemberAncestors: treeState.expandTeamMemberAncestors,
  emitRunSelected: (payload) => {
    if (payload.type === 'agent') {
      emit('run-selected', { type: 'agent', runId: payload.runId });
      return;
    }
    emit('run-selected', { type: 'team', runId: payload.runId });
  },
  emitRunCreated: (payload) => emit('run-created', payload),
  presentTeamStreamRecoveryFeedback: (feedback) => {
    const key = feedback === 'wait'
      ? 'workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.stream_recovery_wait'
      : 'workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.stream_recovery_retry';
    addToast(t(key), 'info');
  },
});

const onToggleWorkspace = async (workspaceNode: RunTreeWorkspaceNode): Promise<void> => {
  const wasExpanded = treeState.isWorkspaceExpanded(workspaceNode.workspaceId);
  treeState.toggleWorkspace(workspaceNode.workspaceId);
  if (!wasExpanded) {
    await runHistoryStore.fetchWorkspaceHistory(workspaceNode.workspaceId).catch(() => undefined);
  }
};

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const removeWorkspaceConfirmationMessage = computed(() => {
  const workspace = pendingWorkspace.value;
  if (!workspace) return '';
  const name = escapeHtml(workspace.workspaceName || t(
    'workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.this_workspace',
  ));
  const root = escapeHtml(workspace.workspaceRootPath);
  const questionPrefix = escapeHtml(t(
    'workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.remove_workspace_question_prefix',
  ));
  const questionSuffix = escapeHtml(t(
    'workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.remove_workspace_question_suffix',
  ));
  const body = escapeHtml(t(
    'workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.remove_workspace_non_destructive_body',
  ));
  return `${questionPrefix} <strong>${name}</strong> ${questionSuffix}<br><br>${body}<br><br><span class="break-all text-xs text-gray-500">${root}</span>`;
});

const sectionState: WorkspaceHistorySectionState = {
  get selectedRunId() {
    return treeState.selectedRunId.value;
  },
  isTeamRunSelected: (teamRunId: string) =>
    selectionStore.selectedType === 'team' && selectionStore.selectedRunId === teamRunId,
  isRunTerminating: (runId: string) => Boolean(terminatingRunIds.value[runId]),
  isTeamTerminating: (teamRunId: string) => Boolean(stopPendingTeamIds.value[teamRunId]),
  isRunDeleting: (runId: string) => Boolean(deletingRunIds.value[runId]),
  isTeamDeleting: (teamRunId: string) => Boolean(deletingTeamIds.value[teamRunId]),
  isRunArchiving: (runId: string) => Boolean(archivingRunIds.value[runId]),
  isTeamArchiving: (teamRunId: string) => Boolean(archivingTeamIds.value[teamRunId]),
  isWorkspaceRemoving: (workspaceId: string) => Boolean(removingWorkspaceIds.value[workspaceId]),
  isWorkspaceHistoryLoading: (workspaceId: string) => Boolean(runHistoryStore.workspaceHistoryLoadingById[workspaceId]),
  workspaceHistoryError: (workspaceId: string) => runHistoryStore.workspaceHistoryErrorById[workspaceId] || null,
  formatRelativeTime: (isoTime: string) => runHistoryStore.formatRelativeTime(isoTime),
  isWorkspaceExpanded: treeState.isWorkspaceExpanded,
  toggleWorkspace: onToggleWorkspace,
  isAgentExpanded: treeState.isAgentExpanded,
  toggleAgent: treeState.toggleAgent,
  isTeamDefinitionExpanded: treeState.isTeamDefinitionExpanded,
  toggleTeamDefinition: treeState.toggleTeamDefinition,
  isTeamExpanded: treeState.isTeamExpanded,
  isTeamMemberExpanded: treeState.isTeamMemberExpanded,
  toggleTeamMember: treeState.toggleTeamMember,
};


const sectionAvatarBindings: WorkspaceHistoryAvatarBindings = {
  showAgentAvatar,
  onAgentAvatarError,
  getAgentInitials,
  showTeamAvatar,
  getTeamAvatarUrl,
  onTeamAvatarError,
  getTeamInitials,
  showTeamMemberAvatar,
  getTeamMemberAvatarUrl,
  onTeamMemberAvatarError,
  getTeamMemberDisplayName,
  getTeamMemberInitials,
};

const sectionActions: WorkspaceHistorySectionActions = {
  onRemoveWorkspace,
  onCreateRun,
  onSelectRun,
  onTerminateRun,
  onArchiveRun,
  onDeleteRun,
  onSelectTeam,
  onTerminateTeam,
  onArchiveTeam,
  onDeleteTeam,
  onSelectTeamMember,
};

let refreshTimerId: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await Promise.all([
    runHistoryStore.loadWorkspaceCatalogForNavigation().catch(() => undefined),
    agentDefinitionStore.fetchAllAgentDefinitions().catch(() => undefined),
    agentTeamDefinitionStore.fetchAllAgentTeamDefinitions().catch(() => undefined),
  ]);
  refreshTimerId = setInterval(() => {
    for (const workspaceId of treeState.expandedWorkspaceIds()) {
      void runHistoryStore.refreshWorkspaceHistoryQuietly(workspaceId);
    }
  }, HISTORY_REFRESH_INTERVAL_MS);
});

onBeforeUnmount(() => {
  if (refreshTimerId !== null) {
    clearInterval(refreshTimerId);
    refreshTimerId = null;
  }
});
</script>

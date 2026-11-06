<template>
  <!-- The left panel's run section (workspace-tree-vs-chooser): one header choosing the view, then that view: your runs
       (RunListPanel), by folder (the Workspaces tree) or by Project. A view only shows: no add actions, no folder X. -->
  <div class="workspace-history-panel flex h-full flex-col bg-white">
    <RunSectionHeader />
    <RunListPanel v-if="modeStore.mode === 'runs'" class="min-h-0 flex-1" :run-shown="runShown" @run-selected="forwardRunSelected" />
    <div v-else id="run-section-panel" ref="treeScrollRef" role="region" aria-labelledby="run-section-title" class="min-h-0 flex-1 overflow-y-auto px-1 pb-2" data-test="workspace-history-tree-scroll">
      <ProjectsRunsTree v-if="modeStore.mode === 'projects'" :state="sectionState" :avatars="sectionAvatarBindings" :actions="sectionActions" :run-shown="runShown" />
      <template v-else>
      <div v-if="runHistoryStore.loading" class="px-3 py-4 text-xs text-gray-500">{{ $t('workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.loading_task_history') }}</div>

      <div v-if="runHistoryStore.historyFamilyErrors?.workspace" class="px-3 py-2 text-xs text-red-600">
        {{ runHistoryStore.historyFamilyErrors?.workspace }}
      </div>
      <div v-if="runHistoryStore.agentOrgHistoryError" class="px-3 py-2 text-xs text-red-600">
        {{ runHistoryStore.agentOrgHistoryError }}
      </div>

      <!-- A folder is listed only while it has a run (REQ-009); the chat chooser lists every folder (VIS-014). -->
      <div v-if="!runHistoryStore.loading && workspaceNodes.length === 0" class="px-3 py-5 text-center" data-test="workspaces-tree-empty">
        <Icon icon="heroicons:folder" class="mx-auto h-6 w-6 text-gray-300" aria-hidden="true" />
        <p class="mt-2 text-sm font-medium text-gray-700">{{ t('workspaceFolders.emptyTitle') }}</p>
        <p class="mt-1 text-xs leading-5 text-gray-500">{{ t('workspaceFolders.emptyHelp') }}</p>
      </div>

      <div v-if="workspaceNodes.length > 0" class="space-y-1">
        <WorkspaceHistoryWorkspaceSection
          v-for="workspaceNode in workspaceNodes"
          :key="workspaceNode.stableKey"
          :workspace-node="workspaceNode"
          :workspace-teams="workspaceTeams(workspaceNode.workspaceRootPath)"
          :workspace-team-history-groups="workspaceTeamHistoryGroups(workspaceNode.workspaceRootPath)"
          :state="sectionState"
          :avatars="sectionAvatarBindings"
          :actions="sectionActions"
        />
      </div>
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
      :show="showGroupArchiveConfirmation"
      :title="$t('workspace.history.groupArchive.confirmTitle')"
      :message="groupArchiveConfirmationMessage"
      :confirm-button-text="$t('workspace.history.groupArchive.confirmButton')"
      variant="primary"
      typography-size="large"
      @confirm="confirmGroupArchive"
      @cancel="closeGroupArchiveConfirmation"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import ConfirmationModal from '~/components/common/ConfirmationModal.vue';
import WorkspaceHistoryWorkspaceSection from '~/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue';
import RunSectionHeader from '~/components/workspace/history/RunSectionHeader.vue';
import RunListPanel from '~/components/runList/RunListPanel.vue';
import ProjectsRunsTree from '~/components/workspace/history/ProjectsRunsTree.vue';
import { useRunSectionModeStore, type RunSectionMode } from '~/stores/runSectionModeStore';
import type {
  WorkspaceHistoryAvatarBindings,
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentOrgRunStore } from '~/stores/agentOrgRunStore';
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useToasts } from '~/composables/useToasts';
import { useRunHistoryAvatarState } from '~/composables/useRunHistoryAvatarState';
import { useWorkspaceHistorySelectionActions } from '~/composables/useWorkspaceHistorySelectionActions';
import { useWorkspaceHistoryTreeState } from '~/composables/useWorkspaceHistoryTreeState';
import { useRevealSelectedTreeRow } from '~/components/workspace/history/useRevealSelectedTreeRow';
import { chatRouteRunId } from '~/services/workspace/workspaceNavigationService';
import { useWorkspaceHistoryMutations } from '~/composables/useWorkspaceHistoryMutations';
import { useWorkspaceHistoryGroupArchive } from '~/composables/useWorkspaceHistoryGroupArchive';
import { useWorkspaceHistorySubjectActions } from '~/composables/useWorkspaceHistorySubjectActions';
import { useLocalization } from '~/composables/useLocalization';
import { useRunStart } from '~/composables/runSettings/useRunStart';
import { useRunHistorySectionLoad } from '~/composables/runHistory/useRunHistorySectionLoad';
import { useRouteSelectedAgentOrg } from '~/composables/runHistory/useRouteSelectedAgentOrg';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

const props = withDefaults(defineProps<{
  /** Whether the center shows a run (`useShellPrimaryNavigation().isWorkspacesActive`); gates the reveal. */
  runShown?: boolean;
}>(), { runShown: false });

const emit = defineEmits<{
  (e: 'run-selected', payload: { type: 'agent'; runId: string }): void;
  (e: 'run-selected', payload: { type: 'team'; runId: string }): void;
}>();

const forwardRunSelected = (payload: { type: 'agent' | 'team'; runId: string }): void => {
  if (payload.type === 'agent') emit('run-selected', { type: 'agent', runId: payload.runId });
  else emit('run-selected', { type: 'team', runId: payload.runId });
};

/** The history read window per view (DS-002): every run for the Runs view (its fold and "Archive all older"), 6 otherwise. */
const historyWindowOf = (mode: RunSectionMode): number | null => (mode === 'runs' ? null : 6);

const runHistoryStore = useRunHistoryStore();
const agentOrgRunStore = useAgentOrgRunStore();
const agentOrgContextsStore = useAgentOrgContextsStore();
const route = useRoute() as ReturnType<typeof useRoute> | undefined;
const router = useRouter();
const runStart = useRunStart();
const selectionStore = useAgentSelectionStore();
const agentRunStore = useAgentRunStore();
const teamRunStore = useAgentTeamRunStore();
const { stopPendingTeamIds } = storeToRefs(teamRunStore);
const agentDefinitionStore = useAgentDefinitionStore();
const agentTeamDefinitionStore = useAgentTeamDefinitionStore();
const agentOrgDefinitionStore = useAgentOrgDefinitionStore();
const { addToast } = useToasts();
const { t } = useLocalization();
const modeStore = useRunSectionModeStore();
const addWorkspaceToast = (message: string, type: 'success' | 'error' | 'warning' | 'info'): void => {
  addToast(message, type === 'warning' ? 'info' : type);
};

const selectedAgentOrg = useRouteSelectedAgentOrg();
const treeState = useWorkspaceHistoryTreeState({
  runHistoryStore,
  selectionStore,
  selectedAgentOrg,
});
// When the panel appears, the open run's row is brought into view (REQ-003), only while a run is
// shown in the center (`runShown`: the shell's Workspaces highlight, passed by the host panel).
const treeScrollRef = ref<HTMLElement | null>(null);
useRevealSelectedTreeRow(treeScrollRef, computed(() => props.runShown));
const { workspaceNodes, workspaceTeams, workspaceTeamHistoryGroups } = treeState;
const { execute: executeSubjectAction } = useWorkspaceHistorySubjectActions();
const {
  getOrgAvatarUrl,
  showOrgAvatar,
  onOrgAvatarError,
  getAgentInitials,
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
  orgDefinitions: computed(() => agentOrgDefinitionStore.definitions),
});

/** Leaves the Agent Org route when the open Org run was archived or deleted. */
const leaveRemovedAgentOrgRoute = async (orgRunId: string): Promise<void> => {
  if (route?.query.rootSubjectKind !== 'agent_org' || String(route.query.orgRunId || '').trim() !== orgRunId) return;
  await router.replace({ path: '/workspace' });
};

const {
  terminatingRunIds,
  deletingRunIds,
  deletingTeamIds,
  deletingAgentOrgIds,
  archivingRunIds,
  archivingTeamIds,
  archivingAgentOrgIds,
  showDeleteConfirmation,
  deleteConfirmationTitle,
  deleteConfirmationConfirmText,
  deleteConfirmationMessage,
  onTerminateRun,
  onTerminateTeam,
  onArchiveRun,
  onArchiveTeam,
  onArchiveAgentOrg,
  onDeleteRun,
  onDeleteTeam,
  onDeleteAgentOrg,
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
  deleteAgentOrgRun: (orgRunId: string) => runHistoryStore.deleteAgentOrgRun(orgRunId),
  archiveRun: (runId: string) => runHistoryStore.archiveRun(runId),
  archiveTeamRun: (teamRunId: string) => runHistoryStore.archiveTeamRun(teamRunId),
  archiveAgentOrgRun: (orgRunId: string) => runHistoryStore.archiveAgentOrgRun(orgRunId),
  onAgentOrgMutationSuccess: (orgRunId: string) => leaveRemovedAgentOrgRoute(orgRunId),
  addToast: addWorkspaceToast,
  stopPendingTeamIds,
});

const {
  isGroupArchiving,
  showGroupArchiveConfirmation,
  groupArchiveConfirmationMessage,
  onArchiveAgentGroup,
  onArchiveListedAgentGroup,
  onArchiveTeamGroup,
  onArchiveAgentOrgGroup,
  closeGroupArchiveConfirmation,
  confirmGroupArchive,
} = useWorkspaceHistoryGroupArchive({
  archiveAgentRunGroup: (workspaceRootPath, agentDefinitionId) =>
    runHistoryStore.archiveAgentRunGroup(workspaceRootPath, agentDefinitionId),
  archiveTeamRuns: (teamRunIds) => runHistoryStore.archiveTeamRuns(teamRunIds),
  archiveRun: (runId) => runHistoryStore.archiveRun(runId),
  archiveAgentOrgRuns: (orgRunIds) => runHistoryStore.archiveAgentOrgRuns(orgRunIds),
  onAgentOrgArchived: leaveRemovedAgentOrgRoute,
  addToast: addWorkspaceToast,
});

const {
  onSelectRun,
  onOpenAgentRun,
  onSelectTeam,
  onOpenTeamRun,
  onSelectTeamMember,
} = useWorkspaceHistorySelectionActions({
  runHistoryStore,
  selectionStore,
  setTeamExpanded: treeState.setTeamExpanded,
  toggleTeam: treeState.toggleTeam,
  expandTeamMemberAncestors: treeState.expandTeamMemberAncestors,
  emitRunSelected: (payload) => forwardRunSelected(payload),
  presentTeamStreamRecoveryFeedback: (feedback) => {
    const key = feedback === 'wait'
      ? 'workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.stream_recovery_wait'
      : 'workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.stream_recovery_retry';
    addToast(t(key), 'info');
  },
});

/** `+` on an agent group: a New chat preset to that agent and folder; it supersedes any run open in flight. */
const onCreateRun = async (workspaceRootPath: string, agentDefinitionId: string): Promise<void> => {
  selectionStore.beginSelectionIntent();
  try {
    await runStart.newChatInWorkspace({ workspaceRootPath, agentDefinitionId });
  } catch (error) {
    console.error('Failed to start a chat:', error);
  }
};

const onToggleWorkspace = async (workspaceNode: RunTreeWorkspaceNode): Promise<void> => {
  const presentationId = 'stableKey' in workspaceNode
    ? String(workspaceNode.stableKey)
    : workspaceNode.workspaceId;
  const wasExpanded = treeState.isWorkspaceExpanded(presentationId);
  treeState.toggleWorkspace(presentationId);
  if (!wasExpanded) {
    if (!workspaceNode.workspaceId.startsWith('history:')) {
      await runHistoryStore.fetchWorkspaceHistory(workspaceNode.workspaceId).catch(() => undefined);
    }
  }
};

const sectionState: WorkspaceHistorySectionState = {
  get selectedRunId() {
    // On Chat, the highlighted row is the displayed chat (none on New chat).
    if (route?.path?.startsWith('/chat')) return chatRouteRunId(route.query);
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
  isAgentOrgDefinitionExpanded: treeState.isAgentOrgDefinitionExpanded,
  toggleAgentOrgDefinition: treeState.toggleAgentOrgDefinition,
  isAgentOrgRunExpanded: treeState.isAgentOrgRunExpanded,
  toggleAgentOrgRun: treeState.toggleAgentOrgRun,
  isAgentOrgTeamExpanded: treeState.isAgentOrgTeamExpanded,
  toggleAgentOrgTeam: treeState.toggleAgentOrgTeam,
  isAgentOrgTaskTeamExpanded: treeState.isAgentOrgTaskTeamExpanded,
  toggleAgentOrgTaskTeam: treeState.toggleAgentOrgTaskTeam,
  isAgentOrgRunSelected: treeState.isAgentOrgRunSelected,
  isAgentOrgMemberSelected: treeState.isAgentOrgMemberSelected,
  isAgentOrgTerminating: (rootRunId: string) => Boolean(agentOrgContextsStore.operations[rootRunId]) || agentOrgRunStore.terminatingRunIds.has(rootRunId),
  isAgentOrgDeleting: (rootRunId: string) => Boolean(deletingAgentOrgIds.value[rootRunId]),
  isAgentOrgArchiving: (rootRunId: string) => Boolean(archivingAgentOrgIds.value[rootRunId]),
  agentOrgTerminationError: (rootRunId: string) => agentOrgRunStore.terminationErrors[rootRunId] ?? agentOrgContextsStore.errorFor(rootRunId),
  agentOrgContextFor: (rootRunId: string) => agentOrgContextsStore.contextFor(rootRunId),
  isGroupArchiving,
};


const sectionAvatarBindings: WorkspaceHistoryAvatarBindings = {
  showAgentAvatar,
  onAgentAvatarError,
  getOrgAvatarUrl,
  showOrgAvatar,
  onOrgAvatarError,
  getAgentInitials,
  showTeamAvatar,
  getTeamAvatarUrl,
  onTeamAvatarError,
  showTeamMemberAvatar,
  getTeamMemberAvatarUrl,
  onTeamMemberAvatarError,
  getTeamMemberDisplayName,
  getTeamMemberInitials,
};

const sectionActions: WorkspaceHistorySectionActions = {
  onCreateRun,
  onSelectRun,
  onOpenAgentRun,
  onTerminateRun,
  onArchiveRun,
  onDeleteRun,
  onSelectTeam,
  onOpenTeamRun,
  onTerminateTeam,
  onArchiveTeam,
  onDeleteTeam,
  onSelectTeamMember,
  onOpenAgentOrgRun: (run) => executeSubjectAction({
    rootSubjectKind: 'agent_org', rootRunId: run.rootRunId, action: 'open',
  }),
  onSelectAgentOrgMember: (run, memberAddress) => executeSubjectAction({
    rootSubjectKind: 'agent_org', rootRunId: run.rootRunId, action: 'select', memberAddress,
  }),
  onInspectAgentOrgExecution: (run, agentRunId, memberAddress) => executeSubjectAction({
    rootSubjectKind: 'agent_org', rootRunId: run.rootRunId, action: 'inspect', agentRunId, memberAddress,
  }),
  onArchiveAgentOrg,
  onDeleteAgentOrg,
  onArchiveAgentGroup,
  onArchiveListedAgentGroup,
  onArchiveTeamGroup,
  onArchiveAgentOrgGroup,
  onTerminateAgentOrg: (run) => executeSubjectAction({
    rootSubjectKind: 'agent_org', rootRunId: run.rootRunId, action: 'stop',
  }).catch(() => undefined),
};

// The run section's history load and 5 s poll; the read window follows the view (DS-002).
useRunHistorySectionLoad({ window: () => historyWindowOf(modeStore.mode), polling: () => true });
</script>

<style scoped>
.workspace-history-panel {
  container: workspace-history-panel / inline-size;
}
</style>

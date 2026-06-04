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
          :key="workspaceNode.workspaceRootPath"
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
      message="Delete this history permanently. This cannot be undone."
      confirm-button-text="Delete"
      variant="danger"
      typography-size="large"
      @confirm="confirmDeleteRun"
      @cancel="closeDeleteConfirmation"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
import { useWorkspaceHistoryMutations } from '~/composables/useWorkspaceHistoryMutations';
import { useSelfEvolutionCapabilityStore } from '~/stores/selfEvolutionCapabilityStore';
import { useSelfEvolutionStore } from '~/stores/selfEvolutionStore';
import type { TeamMemberTreeRow } from '~/stores/runHistoryTypes';

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
const agentDefinitionStore = useAgentDefinitionStore();
const agentTeamDefinitionStore = useAgentTeamDefinitionStore();
const selfEvolutionCapabilityStore = useSelfEvolutionCapabilityStore();
const selfEvolutionStore = useSelfEvolutionStore();
const windowNodeContextStore = useWindowNodeContextStore();
const { isEmbeddedWindow } = storeToRefs(windowNodeContextStore);
const { addToast } = useToasts();
const addWorkspaceToast = (message: string, type: 'success' | 'error' | 'warning' | 'info'): void => {
  addToast(message, type === 'warning' ? 'info' : type);
};

const treeState = useWorkspaceHistoryTreeState({
  runHistoryStore,
  selectionStore,
});
const { workspaceNodes, workspaceTeams, workspaceTeamHistoryGroups } = treeState;
const selfEvolutionStartingKeys = ref<Record<string, boolean>>({});

type VisibleSelfEvolutionTarget =
  | { kind: 'agent'; key: string; runId: string }
  | { kind: 'team-member'; key: string; teamRunId: string; memberRunId: string };

const setSelfEvolutionStarting = (key: string, value: boolean): void => {
  selfEvolutionStartingKeys.value = { ...selfEvolutionStartingKeys.value, [key]: value };
};

const flattenTeamMembersForEligibility = (members: TeamMemberTreeRow[]): TeamMemberTreeRow[] =>
  members.flatMap((member) => [member, ...flattenTeamMembersForEligibility(member.children)]);

const visibleSelfEvolutionTargets = computed<VisibleSelfEvolutionTarget[]>(() => {
  if (!selfEvolutionCapabilityStore.isEnabled) {
    return [];
  }
  const targets: VisibleSelfEvolutionTarget[] = [];
  for (const workspace of workspaceNodes.value) {
    if (!treeState.isWorkspaceExpanded(workspace.workspaceRootPath)) {
      continue;
    }
    for (const agent of workspace.agents) {
      if (!treeState.isAgentExpanded(workspace.workspaceRootPath, agent.agentDefinitionId)) {
        continue;
      }
      for (const run of agent.runs) {
        if (run.source === 'draft') {
          continue;
        }
        targets.push({ kind: 'agent', key: selfEvolutionStore.agentKey(run.runId), runId: run.runId });
      }
    }
    for (const team of workspaceTeams(workspace.workspaceRootPath)) {
      if (!treeState.isTeamExpanded(team.teamRunId)) {
        continue;
      }
      for (const member of flattenTeamMembersForEligibility(team.memberTree.length > 0 ? team.memberTree : team.members)) {
        if (member.memberKind !== 'agent' || !member.memberRunId) {
          continue;
        }
        targets.push({
          kind: 'team-member',
          key: selfEvolutionStore.teamMemberKey(member.teamRunId, member.memberRunId),
          teamRunId: member.teamRunId,
          memberRunId: member.memberRunId,
        });
      }
    }
  }
  return targets;
});

const visibleSelfEvolutionTargetSignature = computed(() =>
  visibleSelfEvolutionTargets.value.map((target) => target.key).sort().join('|'),
);

const ensureVisibleSelfEvolutionEligibility = (): void => {
  for (const target of visibleSelfEvolutionTargets.value) {
    if (
      selfEvolutionStore.eligibilityByKey[target.key] ||
      selfEvolutionStore.loadingKeys[target.key]
    ) {
      continue;
    }
    if (target.kind === 'agent') {
      void selfEvolutionStore.fetchAgentRunEligibility(target.runId).catch(() => undefined);
      continue;
    }
    void selfEvolutionStore.fetchTeamMemberEligibility(target.teamRunId, target.memberRunId)
      .catch(() => undefined);
  }
};

const selfEvolutionEligibilityTitle = (key: string, fallback: string): string => {
  const eligibility = selfEvolutionStore.eligibilityByKey[key];
  if (selfEvolutionStore.loadingKeys[key] || !eligibility) {
    return 'Checking self-evolution eligibility...';
  }
  if (!eligibility.eligible) {
    return eligibility.reasons[0] || 'This run is not eligible for self-evolution.';
  }
  if (eligibility.warnings.length > 0) {
    return `${fallback} (${eligibility.warnings[0]})`;
  }
  return fallback;
};

watch(visibleSelfEvolutionTargetSignature, () => {
  ensureVisibleSelfEvolutionEligibility();
}, { immediate: true });

const onStartRunSelfEvolution = async (run: Parameters<WorkspaceHistorySectionActions['onSelectRun']>[0]): Promise<void> => {
  const key = selfEvolutionStore.agentKey(run.runId);
  setSelfEvolutionStarting(key, true);
  try {
    const eligibility = await selfEvolutionStore.fetchAgentRunEligibility(run.runId);
    if (!eligibility.eligible) {
      addToast(eligibility.reasons[0] || 'This run is not eligible for self-evolution.', 'error');
      return;
    }
    const result = await selfEvolutionStore.startAgentRunSelfEvolution(run.runId);
    addToast(`Self-evolution started: ${result.evolutionRunId}`, 'success');
  } catch (error) {
    addToast(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    setSelfEvolutionStarting(key, false);
  }
};

const onStartTeamMemberSelfEvolution = async (member: Parameters<WorkspaceHistorySectionActions['onSelectTeamMember']>[0]): Promise<void> => {
  if (!member.memberRunId) {
    return;
  }
  const key = selfEvolutionStore.teamMemberKey(member.teamRunId, member.memberRunId);
  setSelfEvolutionStarting(key, true);
  try {
    const eligibility = await selfEvolutionStore.fetchTeamMemberEligibility(member.teamRunId, member.memberRunId);
    if (!eligibility.eligible) {
      addToast(eligibility.reasons[0] || 'This team member run is not eligible for self-evolution.', 'error');
      return;
    }
    const result = await selfEvolutionStore.startTeamMemberSelfEvolution(member.teamRunId, member.memberRunId);
    addToast(`Self-evolution started: ${result.evolutionRunId}`, 'success');
  } catch (error) {
    addToast(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    setSelfEvolutionStarting(key, false);
  }
};


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
    treeState.setWorkspaceExpanded(workspaceRootPath, true);
  },
});

const {
  terminatingRunIds,
  terminatingTeamIds,
  deletingRunIds,
  deletingTeamIds,
  archivingRunIds,
  archivingTeamIds,
  showDeleteConfirmation,
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
  removeDraftTeam: async (teamRunId: string) => teamRunStore.discardDraftTeamRun(teamRunId),
  deleteRun: (runId: string) => runHistoryStore.deleteRun(runId),
  deleteTeamRun: (teamRunId: string) => runHistoryStore.deleteTeamRun(teamRunId),
  archiveRun: (runId: string) => runHistoryStore.archiveRun(runId),
  archiveTeamRun: (teamRunId: string) => runHistoryStore.archiveTeamRun(teamRunId),
  addToast: addWorkspaceToast,
  canTerminateTeam: treeState.canTerminateTeam,
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
  emitRunSelected: (payload) => {
    if (payload.type === 'agent') {
      emit('run-selected', { type: 'agent', runId: payload.runId });
      return;
    }
    emit('run-selected', { type: 'team', runId: payload.runId });
  },
  emitRunCreated: (payload) => emit('run-created', payload),
});

const sectionState: WorkspaceHistorySectionState = {
  get selectedRunId() {
    return treeState.selectedRunId.value;
  },
  activeStatusClass: treeState.activeStatusClass,
  isRunTerminating: (runId: string) => Boolean(terminatingRunIds.value[runId]),
  isTeamTerminating: (teamRunId: string) => Boolean(terminatingTeamIds.value[teamRunId]),
  isRunDeleting: (runId: string) => Boolean(deletingRunIds.value[runId]),
  isTeamDeleting: (teamRunId: string) => Boolean(deletingTeamIds.value[teamRunId]),
  isRunArchiving: (runId: string) => Boolean(archivingRunIds.value[runId]),
  isTeamArchiving: (teamRunId: string) => Boolean(archivingTeamIds.value[teamRunId]),
  formatRelativeTime: (isoTime: string) => runHistoryStore.formatRelativeTime(isoTime),
  isWorkspaceExpanded: treeState.isWorkspaceExpanded,
  toggleWorkspace: treeState.toggleWorkspace,
  isAgentExpanded: treeState.isAgentExpanded,
  toggleAgent: treeState.toggleAgent,
  isTeamDefinitionExpanded: treeState.isTeamDefinitionExpanded,
  toggleTeamDefinition: treeState.toggleTeamDefinition,
  isTeamExpanded: treeState.isTeamExpanded,
  runStatusClass: treeState.runStatusClass,
  teamStatusClass: treeState.teamStatusClass,
  canTerminateTeam: treeState.canTerminateTeam,
  get isSelfEvolutionEnabled() {
    return selfEvolutionCapabilityStore.isEnabled;
  },
  isSelfEvolutionEligible: (key: string) => selfEvolutionStore.eligibilityByKey[key]?.eligible === true,
  isSelfEvolutionEligibilityLoading: (key: string) =>
    Boolean(selfEvolutionStore.loadingKeys[key]) ||
    (selfEvolutionCapabilityStore.isEnabled && !selfEvolutionStore.eligibilityByKey[key]),
  selfEvolutionEligibilityTitle,
  isSelfEvolutionStarting: (key: string) => Boolean(selfEvolutionStartingKeys.value[key]),
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
  onStartRunSelfEvolution,
  onStartTeamMemberSelfEvolution,
};

let refreshTimerId: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await Promise.all([
    workspaceStore.fetchAllWorkspaces().catch(() => undefined),
    agentDefinitionStore.fetchAllAgentDefinitions().catch(() => undefined),
    agentTeamDefinitionStore.fetchAllAgentTeamDefinitions().catch(() => undefined),
    selfEvolutionCapabilityStore.ensureResolved().catch(() => undefined),
  ]);
  await runHistoryStore.fetchTree();
  ensureVisibleSelfEvolutionEligibility();
  refreshTimerId = setInterval(() => {
    void runHistoryStore.refreshTreeQuietly().finally(() => {
      ensureVisibleSelfEvolutionEligibility();
    });
  }, HISTORY_REFRESH_INTERVAL_MS);
});

onBeforeUnmount(() => {
  if (refreshTimerId !== null) {
    clearInterval(refreshTimerId);
    refreshTimerId = null;
  }
});
</script>

import { ref, type Ref } from 'vue';
import { useRunTreeStore, type TeamMemberTreeRow } from '~/stores/runTreeStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { pickFolderPath } from '~/composables/useNativeFolderDialog';
import type { RunTreeRow } from '~/utils/runTreeProjection';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface RunTreeStoreActionsDependency {
  fetchTree: () => Promise<void>;
  selectTreeRun: (row: RunTreeRow | TeamMemberTreeRow) => Promise<void>;
  deleteRun: (agentId: string) => Promise<boolean>;
  deleteTeamRun: (teamId: string) => Promise<boolean>;
  createWorkspace: (rootPath: string) => Promise<string>;
  createDraftRun: (options: { workspaceRootPath: string; agentDefinitionId: string }) => Promise<string>;
}

interface WorkspaceStoreActionsDependency {
  fetchAllWorkspaces: () => Promise<void>;
}

interface AgentRunStoreActionsDependency {
  terminateRun: (agentId: string) => Promise<boolean>;
}

interface AgentTeamRunStoreActionsDependency {
  terminateTeamRun: (teamId: string) => Promise<void>;
}

interface RunTreeActionsDependencies {
  runTreeStore: RunTreeStoreActionsDependency;
  workspaceStore: WorkspaceStoreActionsDependency;
  agentRunStore: AgentRunStoreActionsDependency;
  agentTeamRunStore: AgentTeamRunStoreActionsDependency;
  pickFolderPath: () => Promise<string | null>;
  hasNativePicker: () => boolean;
}

interface UseRunTreeActionsOptions {
  isEmbeddedWindow: Ref<boolean>;
  addToast: (message: string, kind: ToastKind) => void;
  onAgentSelected: (agentId: string) => void;
  onTeamSelected: (teamId: string) => void;
  onAgentCreated: (agentDefinitionId: string) => void;
  onWorkspaceCreated?: (workspaceRootPath: string) => void;
  deps?: Partial<RunTreeActionsDependencies>;
}

const defaultDependencies = (): RunTreeActionsDependencies => ({
  runTreeStore: useRunTreeStore(),
  workspaceStore: useWorkspaceStore(),
  agentRunStore: useAgentRunStore(),
  agentTeamRunStore: useAgentTeamRunStore(),
  pickFolderPath,
  hasNativePicker: () => Boolean(window.electronAPI?.showFolderDialog),
});

export const useRunTreeActions = (options: UseRunTreeActionsOptions) => {
  const deps = {
    ...defaultDependencies(),
    ...options.deps,
  } as RunTreeActionsDependencies;

  const terminatingAgentIds = ref<Record<string, boolean>>({});
  const terminatingTeamIds = ref<Record<string, boolean>>({});
  const deletingAgentIds = ref<Record<string, boolean>>({});
  const deletingTeamIds = ref<Record<string, boolean>>({});

  const showDeleteConfirmation = ref(false);
  const pendingDeleteAgentId = ref<string | null>(null);
  const pendingDeleteTeamId = ref<string | null>(null);

  const showCreateWorkspaceInline = ref(false);
  const workspacePathDraft = ref('');
  const workspacePathError = ref('');
  const creatingWorkspace = ref(false);

  const initializePanelData = async (): Promise<void> => {
    await Promise.all([
      deps.workspaceStore.fetchAllWorkspaces().catch(() => undefined),
      deps.runTreeStore.fetchTree(),
    ]);
  };

  const selectRun = async (run: RunTreeRow): Promise<void> => {
    try {
      await deps.runTreeStore.selectTreeRun(run);
      options.onAgentSelected(run.agentId);
    } catch (error) {
      console.error('Failed to open run:', error);
    }
  };

  const selectTeamMember = async (member: TeamMemberTreeRow): Promise<void> => {
    try {
      await deps.runTreeStore.selectTreeRun(member);
      options.onTeamSelected(member.teamId);
    } catch (error) {
      console.error('Failed to open team member run:', error);
    }
  };

  const terminateRun = async (agentId: string): Promise<void> => {
    const terminateErrorMessage = 'Failed to terminate run. Please try again.';
    if (terminatingAgentIds.value[agentId]) {
      return;
    }

    terminatingAgentIds.value = {
      ...terminatingAgentIds.value,
      [agentId]: true,
    };

    try {
      const terminated = await deps.agentRunStore.terminateRun(agentId);
      if (!terminated) {
        console.error(`Failed to terminate run '${agentId}'.`);
        options.addToast(terminateErrorMessage, 'error');
      }
    } catch (error) {
      console.error('Failed to terminate run:', error);
      options.addToast(terminateErrorMessage, 'error');
    } finally {
      const next = { ...terminatingAgentIds.value };
      delete next[agentId];
      terminatingAgentIds.value = next;
    }
  };

  const terminateTeam = async (teamId: string): Promise<void> => {
    const terminateErrorMessage = 'Failed to terminate team. Please try again.';
    if (terminatingTeamIds.value[teamId]) {
      return;
    }

    terminatingTeamIds.value = {
      ...terminatingTeamIds.value,
      [teamId]: true,
    };

    try {
      await deps.agentTeamRunStore.terminateTeamRun(teamId);
    } catch (error) {
      console.error('Failed to terminate team:', error);
      options.addToast(terminateErrorMessage, 'error');
    } finally {
      const next = { ...terminatingTeamIds.value };
      delete next[teamId];
      terminatingTeamIds.value = next;
    }
  };

  const requestDeleteRun = (run: RunTreeRow): void => {
    if (run.source !== 'history' || run.isActive) {
      return;
    }

    const agentId = run.agentId;
    if (deletingAgentIds.value[agentId]) {
      return;
    }

    pendingDeleteAgentId.value = agentId;
    pendingDeleteTeamId.value = null;
    showDeleteConfirmation.value = true;
  };

  const requestDeleteTeam = (teamId: string): void => {
    if (deletingTeamIds.value[teamId]) {
      return;
    }
    pendingDeleteAgentId.value = null;
    pendingDeleteTeamId.value = teamId;
    showDeleteConfirmation.value = true;
  };

  const closeDeleteConfirmation = (): void => {
    showDeleteConfirmation.value = false;
    pendingDeleteAgentId.value = null;
    pendingDeleteTeamId.value = null;
  };

  const confirmDelete = async (): Promise<void> => {
    const deleteRunErrorMessage = 'Failed to delete run. Please try again.';
    const deleteTeamErrorMessage = 'Failed to delete team history. Please try again.';
    const agentId = pendingDeleteAgentId.value;
    const teamId = pendingDeleteTeamId.value;
    closeDeleteConfirmation();

    if (agentId) {
      if (deletingAgentIds.value[agentId]) {
        return;
      }
      deletingAgentIds.value = {
        ...deletingAgentIds.value,
        [agentId]: true,
      };
      try {
        const deleted = await deps.runTreeStore.deleteRun(agentId);
        if (!deleted) {
          options.addToast(deleteRunErrorMessage, 'error');
          return;
        }
        options.addToast('Run deleted permanently.', 'success');
      } catch (error) {
        console.error('Failed to delete run:', error);
        options.addToast(deleteRunErrorMessage, 'error');
      } finally {
        const next = { ...deletingAgentIds.value };
        delete next[agentId];
        deletingAgentIds.value = next;
      }
      return;
    }

    if (!teamId || deletingTeamIds.value[teamId]) {
      return;
    }

    deletingTeamIds.value = {
      ...deletingTeamIds.value,
      [teamId]: true,
    };
    try {
      const deleted = await deps.runTreeStore.deleteTeamRun(teamId);
      if (!deleted) {
        options.addToast(deleteTeamErrorMessage, 'error');
        return;
      }
      options.addToast('Team history deleted permanently.', 'success');
    } catch (error) {
      console.error('Failed to delete team history:', error);
      options.addToast(deleteTeamErrorMessage, 'error');
    } finally {
      const next = { ...deletingTeamIds.value };
      delete next[teamId];
      deletingTeamIds.value = next;
    }
  };

  const createDraftRun = async (workspaceRootPath: string, agentDefinitionId: string): Promise<void> => {
    try {
      await deps.runTreeStore.createDraftRun({ workspaceRootPath, agentDefinitionId });
      options.onAgentCreated(agentDefinitionId);
    } catch (error) {
      console.error('Failed to create draft run:', error);
    }
  };

  const resetCreateWorkspaceInline = (): void => {
    showCreateWorkspaceInline.value = false;
    workspacePathDraft.value = '';
    workspacePathError.value = '';
  };

  const createWorkspaceFromPath = async (rootPath: string): Promise<boolean> => {
    try {
      creatingWorkspace.value = true;
      workspacePathError.value = '';
      const normalizedRootPath = await deps.runTreeStore.createWorkspace(rootPath);
      options.onWorkspaceCreated?.(normalizedRootPath);
      await deps.workspaceStore.fetchAllWorkspaces();
      resetCreateWorkspaceInline();
      return true;
    } catch (error) {
      console.error('Failed to add workspace:', error);
      workspacePathDraft.value = rootPath;
      workspacePathError.value = 'Failed to add workspace. Please verify the path and try again.';
      showCreateWorkspaceInline.value = true;
      return false;
    } finally {
      creatingWorkspace.value = false;
    }
  };

  const startWorkspaceCreationFlow = async (): Promise<void> => {
    if (creatingWorkspace.value) {
      return;
    }

    if (options.isEmbeddedWindow.value && deps.hasNativePicker()) {
      workspacePathError.value = '';
      const selectedPath = await deps.pickFolderPath();
      if (!selectedPath) {
        return;
      }
      await createWorkspaceFromPath(selectedPath);
      return;
    }

    if (showCreateWorkspaceInline.value) {
      closeCreateWorkspaceInput();
      return;
    }
    workspacePathError.value = '';
    workspacePathDraft.value = '';
    showCreateWorkspaceInline.value = true;
  };

  const closeCreateWorkspaceInput = (): void => {
    if (creatingWorkspace.value) {
      return;
    }
    resetCreateWorkspaceInline();
  };

  const confirmCreateWorkspace = async (): Promise<void> => {
    const rootPath = workspacePathDraft.value.trim();
    if (!rootPath) {
      workspacePathError.value = 'Workspace path is required.';
      return;
    }
    await createWorkspaceFromPath(rootPath);
  };

  return {
    terminatingAgentIds,
    terminatingTeamIds,
    deletingAgentIds,
    deletingTeamIds,
    showDeleteConfirmation,
    showCreateWorkspaceInline,
    workspacePathDraft,
    workspacePathError,
    creatingWorkspace,
    initializePanelData,
    selectRun,
    selectTeamMember,
    terminateRun,
    terminateTeam,
    requestDeleteRun,
    requestDeleteTeam,
    closeDeleteConfirmation,
    confirmDelete,
    createDraftRun,
    startWorkspaceCreationFlow,
    closeCreateWorkspaceInput,
    confirmCreateWorkspace,
  };
};

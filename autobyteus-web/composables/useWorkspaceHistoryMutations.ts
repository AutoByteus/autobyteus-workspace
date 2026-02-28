import { ref } from 'vue';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import type { TeamTreeNode } from '~/stores/runHistoryTypes';
import type { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

export const useWorkspaceHistoryMutations = (params: {
  terminateRun: (runId: string) => Promise<boolean>;
  terminateTeamRun: (teamRunId: string) => Promise<unknown>;
  deleteRun: (runId: string) => Promise<boolean>;
  deleteTeamRun: (teamRunId: string) => Promise<boolean>;
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  canTerminateTeam: (status: AgentTeamStatus) => boolean;
}) => {
  const terminatingRunIds = ref<Record<string, boolean>>({});
  const terminatingTeamIds = ref<Record<string, boolean>>({});
  const deletingRunIds = ref<Record<string, boolean>>({});
  const deletingTeamIds = ref<Record<string, boolean>>({});
  const showDeleteConfirmation = ref(false);
  const pendingDeleteRunId = ref<string | null>(null);
  const pendingDeleteTeamRunId = ref<string | null>(null);

  const onTerminateTeam = async (teamRunId: string): Promise<void> => {
    const terminateErrorMessage = 'Failed to terminate team. Please try again.';
    if (terminatingTeamIds.value[teamRunId]) {
      return;
    }

    terminatingTeamIds.value = {
      ...terminatingTeamIds.value,
      [teamRunId]: true,
    };

    try {
      await params.terminateTeamRun(teamRunId);
    } catch (error) {
      console.error('Failed to terminate team:', error);
      params.addToast(terminateErrorMessage, 'error');
    } finally {
      const next = { ...terminatingTeamIds.value };
      delete next[teamRunId];
      terminatingTeamIds.value = next;
    }
  };

  const onTerminateRun = async (runId: string): Promise<void> => {
    const terminateErrorMessage = 'Failed to terminate run. Please try again.';
    if (terminatingRunIds.value[runId]) {
      return;
    }

    terminatingRunIds.value = {
      ...terminatingRunIds.value,
      [runId]: true,
    };

    try {
      const terminated = await params.terminateRun(runId);
      if (!terminated) {
        console.error(`Failed to terminate run '${runId}'.`);
        params.addToast(terminateErrorMessage, 'error');
      }
    } catch (error) {
      console.error('Failed to terminate run:', error);
      params.addToast(terminateErrorMessage, 'error');
    } finally {
      const next = { ...terminatingRunIds.value };
      delete next[runId];
      terminatingRunIds.value = next;
    }
  };

  const onDeleteRun = (run: RunTreeRow): void => {
    if (run.source !== 'history' || run.isActive) {
      return;
    }

    const runId = run.runId;
    if (deletingRunIds.value[runId]) {
      return;
    }

    pendingDeleteRunId.value = runId;
    pendingDeleteTeamRunId.value = null;
    showDeleteConfirmation.value = true;
  };

  const onDeleteTeam = (team: TeamTreeNode): void => {
    if (params.canTerminateTeam(team.currentStatus) || team.deleteLifecycle !== 'READY') {
      return;
    }

    const teamRunId = team.teamRunId.trim();
    if (!teamRunId || deletingTeamIds.value[teamRunId]) {
      return;
    }

    pendingDeleteRunId.value = null;
    pendingDeleteTeamRunId.value = teamRunId;
    showDeleteConfirmation.value = true;
  };

  const closeDeleteConfirmation = (): void => {
    showDeleteConfirmation.value = false;
    pendingDeleteRunId.value = null;
    pendingDeleteTeamRunId.value = null;
  };

  const confirmDeleteRun = async (): Promise<void> => {
    const deleteErrorMessage = 'Failed to delete run. Please try again.';
    const deleteTeamErrorMessage = 'Failed to delete team history. Please try again.';
    const runId = pendingDeleteRunId.value;
    const teamRunId = pendingDeleteTeamRunId.value;
    closeDeleteConfirmation();

    if (runId) {
      if (deletingRunIds.value[runId]) {
        return;
      }

      deletingRunIds.value = {
        ...deletingRunIds.value,
        [runId]: true,
      };

      try {
        const deleted = await params.deleteRun(runId);
        if (!deleted) {
          params.addToast(deleteErrorMessage, 'error');
          return;
        }
        params.addToast('Run deleted permanently.', 'success');
      } catch (error) {
        console.error('Failed to delete run:', error);
        params.addToast(deleteErrorMessage, 'error');
      } finally {
        const next = { ...deletingRunIds.value };
        delete next[runId];
        deletingRunIds.value = next;
      }
      return;
    }

    if (!teamRunId || deletingTeamIds.value[teamRunId]) {
      return;
    }

    deletingTeamIds.value = {
      ...deletingTeamIds.value,
      [teamRunId]: true,
    };

    try {
      const deleted = await params.deleteTeamRun(teamRunId);
      if (!deleted) {
        params.addToast(deleteTeamErrorMessage, 'error');
        return;
      }
      params.addToast('Team history deleted permanently.', 'success');
    } catch (error) {
      console.error('Failed to delete team history:', error);
      params.addToast(deleteTeamErrorMessage, 'error');
    } finally {
      const next = { ...deletingTeamIds.value };
      delete next[teamRunId];
      deletingTeamIds.value = next;
    }
  };

  return {
    terminatingRunIds,
    terminatingTeamIds,
    deletingRunIds,
    deletingTeamIds,
    showDeleteConfirmation,
    onTerminateRun,
    onTerminateTeam,
    onDeleteRun,
    onDeleteTeam,
    closeDeleteConfirmation,
    confirmDeleteRun,
  };
};

import { ref } from 'vue';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import type { TeamTreeNode } from '~/stores/runHistoryTypes';
import type { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { useLocalization } from '~/composables/useLocalization';

export const useWorkspaceHistoryMutations = (params: {
  terminateRun: (runId: string) => Promise<boolean>;
  terminateTeamRun: (teamRunId: string) => Promise<unknown>;
  removeDraftRun: (runId: string) => Promise<boolean>;
  removeDraftTeam: (teamRunId: string) => Promise<boolean>;
  deleteRun: (runId: string) => Promise<boolean>;
  deleteTeamRun: (teamRunId: string) => Promise<boolean>;
  archiveRun: (runId: string) => Promise<boolean>;
  archiveTeamRun: (teamRunId: string) => Promise<boolean>;
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  canTerminateTeam: (status: AgentTeamStatus) => boolean;
}) => {
  const { t } = useLocalization();
  const terminatingRunIds = ref<Record<string, boolean>>({});
  const terminatingTeamIds = ref<Record<string, boolean>>({});
  const deletingRunIds = ref<Record<string, boolean>>({});
  const deletingTeamIds = ref<Record<string, boolean>>({});
  const archivingRunIds = ref<Record<string, boolean>>({});
  const archivingTeamIds = ref<Record<string, boolean>>({});
  const showDeleteConfirmation = ref(false);
  const pendingDeleteRunId = ref<string | null>(null);
  const pendingDeleteTeamRunId = ref<string | null>(null);

  const removeDraftRun = async (runId: string): Promise<void> => {
    const removeErrorMessage = 'Failed to remove draft run. Please try again.';
    if (deletingRunIds.value[runId]) {
      return;
    }

    deletingRunIds.value = {
      ...deletingRunIds.value,
      [runId]: true,
    };

    try {
      const removed = await params.removeDraftRun(runId);
      if (!removed) {
        params.addToast(removeErrorMessage, 'error');
        return;
      }
      params.addToast('Draft run removed.', 'success');
    } catch (error) {
      console.error('Failed to remove draft run:', error);
      params.addToast(removeErrorMessage, 'error');
    } finally {
      const next = { ...deletingRunIds.value };
      delete next[runId];
      deletingRunIds.value = next;
    }
  };

  const removeDraftTeam = async (teamRunId: string): Promise<void> => {
    const removeErrorMessage = 'Failed to remove draft team. Please try again.';
    if (deletingTeamIds.value[teamRunId]) {
      return;
    }

    deletingTeamIds.value = {
      ...deletingTeamIds.value,
      [teamRunId]: true,
    };

    try {
      const removed = await params.removeDraftTeam(teamRunId);
      if (!removed) {
        params.addToast(removeErrorMessage, 'error');
        return;
      }
      params.addToast('Draft team removed.', 'success');
    } catch (error) {
      console.error('Failed to remove draft team:', error);
      params.addToast(removeErrorMessage, 'error');
    } finally {
      const next = { ...deletingTeamIds.value };
      delete next[teamRunId];
      deletingTeamIds.value = next;
    }
  };

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
    if (run.source === 'draft') {
      void removeDraftRun(run.runId);
      return;
    }

    if (run.source !== 'history' || run.isActive) {
      return;
    }

    const runId = run.runId;
    if (deletingRunIds.value[runId] || archivingRunIds.value[runId]) {
      return;
    }

    pendingDeleteRunId.value = runId;
    pendingDeleteTeamRunId.value = null;
    showDeleteConfirmation.value = true;
  };

  const onDeleteTeam = (team: TeamTreeNode): void => {
    if (team.teamRunId.trim().startsWith('temp-')) {
      void removeDraftTeam(team.teamRunId.trim());
      return;
    }

    if (params.canTerminateTeam(team.currentStatus) || team.deleteLifecycle !== 'READY') {
      return;
    }

    const teamRunId = team.teamRunId.trim();
    if (!teamRunId || deletingTeamIds.value[teamRunId] || archivingTeamIds.value[teamRunId]) {
      return;
    }

    pendingDeleteRunId.value = null;
    pendingDeleteTeamRunId.value = teamRunId;
    showDeleteConfirmation.value = true;
  };

  const onArchiveRun = async (run: RunTreeRow): Promise<void> => {
    if (run.source !== 'history' || run.isActive) {
      return;
    }

    const runId = run.runId.trim();
    if (!runId || archivingRunIds.value[runId] || deletingRunIds.value[runId]) {
      return;
    }

    archivingRunIds.value = {
      ...archivingRunIds.value,
      [runId]: true,
    };

    try {
      const archived = await params.archiveRun(runId);
      if (!archived) {
        params.addToast(
          t('workspace.composables.useWorkspaceHistoryMutations.archive_run_failed'),
          'error',
        );
        return;
      }
      params.addToast(
        t('workspace.composables.useWorkspaceHistoryMutations.run_archived'),
        'success',
      );
    } catch (error) {
      console.error('Failed to archive run:', error);
      params.addToast(
        t('workspace.composables.useWorkspaceHistoryMutations.archive_run_failed'),
        'error',
      );
    } finally {
      const next = { ...archivingRunIds.value };
      delete next[runId];
      archivingRunIds.value = next;
    }
  };

  const onArchiveTeam = async (team: TeamTreeNode): Promise<void> => {
    if (
      team.teamRunId.trim().startsWith('temp-') ||
      params.canTerminateTeam(team.currentStatus) ||
      team.deleteLifecycle !== 'READY'
    ) {
      return;
    }

    const teamRunId = team.teamRunId.trim();
    if (!teamRunId || archivingTeamIds.value[teamRunId] || deletingTeamIds.value[teamRunId]) {
      return;
    }

    archivingTeamIds.value = {
      ...archivingTeamIds.value,
      [teamRunId]: true,
    };

    try {
      const archived = await params.archiveTeamRun(teamRunId);
      if (!archived) {
        params.addToast(
          t('workspace.composables.useWorkspaceHistoryMutations.archive_team_failed'),
          'error',
        );
        return;
      }
      params.addToast(
        t('workspace.composables.useWorkspaceHistoryMutations.team_archived'),
        'success',
      );
    } catch (error) {
      console.error('Failed to archive team history:', error);
      params.addToast(
        t('workspace.composables.useWorkspaceHistoryMutations.archive_team_failed'),
        'error',
      );
    } finally {
      const next = { ...archivingTeamIds.value };
      delete next[teamRunId];
      archivingTeamIds.value = next;
    }
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
      if (deletingRunIds.value[runId] || archivingRunIds.value[runId]) {
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

    if (!teamRunId || deletingTeamIds.value[teamRunId] || archivingTeamIds.value[teamRunId]) {
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
    archivingRunIds,
    archivingTeamIds,
    onTerminateRun,
    onTerminateTeam,
    onArchiveRun,
    onArchiveTeam,
    onDeleteRun,
    onDeleteTeam,
    closeDeleteConfirmation,
    confirmDeleteRun,
  };
};

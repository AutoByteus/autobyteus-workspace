import { computed, ref, type Ref } from 'vue';
import type { AgentOrgRunHistoryItem, TeamTreeNode } from '~/stores/runHistoryTypes';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import { useLocalization } from '~/composables/useLocalization';

export type PendingHistoryDeleteTarget =
  | Readonly<{ kind: 'agent'; runId: string }>
  | Readonly<{ kind: 'team'; teamRunId: string }>
  | Readonly<{ kind: 'agent_org'; orgRunId: string }>;

type AgentOrgMutationKind = 'archive' | 'delete';

export const useWorkspaceHistoryMutations = (params: {
  terminateRun: (runId: string) => Promise<boolean>;
  terminateTeamRun: (teamRunId: string) => Promise<boolean>;
  removeDraftRun: (runId: string) => Promise<boolean>;
  deleteRun: (runId: string) => Promise<boolean>;
  deleteTeamRun: (teamRunId: string) => Promise<boolean>;
  deleteAgentOrgRun: (orgRunId: string) => Promise<boolean>;
  archiveRun: (runId: string) => Promise<boolean>;
  archiveTeamRun: (teamRunId: string) => Promise<boolean>;
  archiveAgentOrgRun: (orgRunId: string) => Promise<boolean>;
  onAgentOrgMutationSuccess?: (orgRunId: string, kind: AgentOrgMutationKind) => Promise<void> | void;
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  stopPendingTeamIds: Ref<Record<string, boolean>>;
}) => {
  const { t } = useLocalization();
  const terminatingRunIds = ref<Record<string, boolean>>({});
  const stopPendingTeamIds = params.stopPendingTeamIds;
  const deletingRunIds = ref<Record<string, boolean>>({});
  const deletingTeamIds = ref<Record<string, boolean>>({});
  const deletingAgentOrgIds = ref<Record<string, boolean>>({});
  const archivingRunIds = ref<Record<string, boolean>>({});
  const archivingTeamIds = ref<Record<string, boolean>>({});
  const archivingAgentOrgIds = ref<Record<string, boolean>>({});
  const pendingDeleteTarget = ref<PendingHistoryDeleteTarget | null>(null);
  const showDeleteConfirmation = computed(() => pendingDeleteTarget.value !== null);
  const deleteConfirmationTitle = computed(() => pendingDeleteTarget.value?.kind === 'agent_org'
    ? t('workspace.agentOrg.history.deleteLabel')
    : '');
  const deleteConfirmationConfirmText = computed(() => pendingDeleteTarget.value?.kind === 'agent_org'
    ? t('workspace.agentOrg.history.deleteLabel')
    : 'Delete');
  const deleteConfirmationMessage = computed(() => {
    if (pendingDeleteTarget.value?.kind === 'team') {
      return 'Delete this Team history permanently? This cannot be undone.';
    }
    if (pendingDeleteTarget.value?.kind === 'agent_org') {
      return t('workspace.agentOrg.history.deleteConfirmation');
    }
    return 'Delete this history permanently. This cannot be undone.';
  });

  const markPending = (target: Ref<Record<string, boolean>>, id: string): void => {
    target.value = { ...target.value, [id]: true };
  };
  const clearPending = (target: Ref<Record<string, boolean>>, id: string): void => {
    const next = { ...target.value };
    delete next[id];
    target.value = next;
  };

  const removeDraftRun = async (runId: string): Promise<void> => {
    const removeErrorMessage = 'Failed to remove draft run. Please try again.';
    if (deletingRunIds.value[runId]) return;
    markPending(deletingRunIds, runId);
    try {
      const removed = await params.removeDraftRun(runId);
      params.addToast(removed ? 'Draft run removed.' : removeErrorMessage, removed ? 'success' : 'error');
    } catch (error) {
      console.error('Failed to remove draft run:', error);
      params.addToast(removeErrorMessage, 'error');
    } finally { clearPending(deletingRunIds, runId); }
  };

  const onTerminateTeam = async (teamRunId: string): Promise<void> => {
    const terminateErrorMessage = 'Failed to terminate team. Please try again.';
    if (stopPendingTeamIds.value[teamRunId]) return;
    try {
      if (!await params.terminateTeamRun(teamRunId)) params.addToast(terminateErrorMessage, 'error');
    } catch (error) {
      console.error('Failed to terminate team:', error);
      params.addToast(terminateErrorMessage, 'error');
    }
  };

  const onTerminateRun = async (runId: string): Promise<void> => {
    const terminateErrorMessage = 'Failed to terminate run. Please try again.';
    if (terminatingRunIds.value[runId]) return;
    markPending(terminatingRunIds, runId);
    try {
      if (!await params.terminateRun(runId)) params.addToast(terminateErrorMessage, 'error');
    } catch (error) {
      console.error('Failed to terminate run:', error);
      params.addToast(terminateErrorMessage, 'error');
    } finally { clearPending(terminatingRunIds, runId); }
  };

  const onDeleteRun = (run: RunTreeRow): void => {
    if (run.source === 'draft') { void removeDraftRun(run.runId); return; }
    if (run.source !== 'history' || run.isActive) return;
    const runId = run.runId.trim();
    if (!runId || deletingRunIds.value[runId] || archivingRunIds.value[runId]) return;
    pendingDeleteTarget.value = { kind: 'agent', runId };
  };

  const onDeleteTeam = (team: TeamTreeNode): void => {
    if (team.isActive || team.deleteLifecycle !== 'READY') return;
    const teamRunId = team.teamRunId.trim();
    if (!teamRunId || deletingTeamIds.value[teamRunId] || archivingTeamIds.value[teamRunId]
      || stopPendingTeamIds.value[teamRunId]) return;
    pendingDeleteTarget.value = { kind: 'team', teamRunId };
  };

  const onDeleteAgentOrg = (run: AgentOrgRunHistoryItem): void => {
    const orgRunId = run.rootRunId.trim();
    if (run.isActive || !orgRunId || deletingAgentOrgIds.value[orgRunId]
      || archivingAgentOrgIds.value[orgRunId]) return;
    pendingDeleteTarget.value = { kind: 'agent_org', orgRunId };
  };

  const onArchiveRun = async (run: RunTreeRow): Promise<void> => {
    if (run.source !== 'history' || run.isActive) return;
    const runId = run.runId.trim();
    if (!runId || archivingRunIds.value[runId] || deletingRunIds.value[runId]) return;
    markPending(archivingRunIds, runId);
    try {
      const archived = await params.archiveRun(runId);
      params.addToast(t(archived
        ? 'workspace.composables.useWorkspaceHistoryMutations.run_archived'
        : 'workspace.composables.useWorkspaceHistoryMutations.archive_run_failed'), archived ? 'success' : 'error');
    } catch (error) {
      console.error('Failed to archive run:', error);
      params.addToast(t('workspace.composables.useWorkspaceHistoryMutations.archive_run_failed'), 'error');
    } finally { clearPending(archivingRunIds, runId); }
  };

  const onArchiveTeam = async (team: TeamTreeNode): Promise<void> => {
    if (team.isActive || team.deleteLifecycle !== 'READY') return;
    const teamRunId = team.teamRunId.trim();
    if (!teamRunId || archivingTeamIds.value[teamRunId] || deletingTeamIds.value[teamRunId]) return;
    markPending(archivingTeamIds, teamRunId);
    try {
      const archived = await params.archiveTeamRun(teamRunId);
      params.addToast(t(archived
        ? 'workspace.composables.useWorkspaceHistoryMutations.team_archived'
        : 'workspace.composables.useWorkspaceHistoryMutations.archive_team_failed'), archived ? 'success' : 'error');
    } catch (error) {
      console.error('Failed to archive team history:', error);
      params.addToast(t('workspace.composables.useWorkspaceHistoryMutations.archive_team_failed'), 'error');
    } finally { clearPending(archivingTeamIds, teamRunId); }
  };

  const notifyAgentOrgMutationSuccess = async (orgRunId: string, kind: AgentOrgMutationKind): Promise<void> => {
    try { await params.onAgentOrgMutationSuccess?.(orgRunId, kind); }
    catch (error) {
      console.error('AgentOrg history changed but route cleanup failed:', error);
      params.addToast(t('workspace.agentOrg.history.navigationCleanupFailed'), 'warning');
    }
  };

  const onArchiveAgentOrg = async (run: AgentOrgRunHistoryItem): Promise<void> => {
    const orgRunId = run.rootRunId.trim();
    if (run.isActive || !orgRunId || archivingAgentOrgIds.value[orgRunId]
      || deletingAgentOrgIds.value[orgRunId]) return;
    markPending(archivingAgentOrgIds, orgRunId);
    try {
      const archived = await params.archiveAgentOrgRun(orgRunId);
      if (!archived) { params.addToast(t('workspace.agentOrg.history.archiveFailed'), 'error'); return; }
      params.addToast(t('workspace.agentOrg.history.archived'), 'success');
      await notifyAgentOrgMutationSuccess(orgRunId, 'archive');
    } catch (error) {
      console.error('Failed to archive AgentOrg history:', error);
      params.addToast(t('workspace.agentOrg.history.archiveFailed'), 'error');
    } finally { clearPending(archivingAgentOrgIds, orgRunId); }
  };

  const closeDeleteConfirmation = (): void => { pendingDeleteTarget.value = null; };

  const confirmDeleteRun = async (): Promise<void> => {
    const target = pendingDeleteTarget.value;
    closeDeleteConfirmation();
    if (!target) return;

    if (target.kind === 'agent') {
      const { runId } = target;
      if (deletingRunIds.value[runId] || archivingRunIds.value[runId]) return;
      markPending(deletingRunIds, runId);
      try {
        const deleted = await params.deleteRun(runId);
        params.addToast(deleted ? 'Run deleted permanently.' : 'Failed to delete run. Please try again.', deleted ? 'success' : 'error');
      } catch (error) {
        console.error('Failed to delete run:', error);
        params.addToast('Failed to delete run. Please try again.', 'error');
      } finally { clearPending(deletingRunIds, runId); }
      return;
    }

    if (target.kind === 'team') {
      const { teamRunId } = target;
      if (deletingTeamIds.value[teamRunId] || archivingTeamIds.value[teamRunId]
        || stopPendingTeamIds.value[teamRunId]) return;
      markPending(deletingTeamIds, teamRunId);
      try {
        const deleted = await params.deleteTeamRun(teamRunId);
        params.addToast(deleted ? 'Team history deleted permanently.'
          : 'Failed to delete team history. Please try again.', deleted ? 'success' : 'error');
      } catch (error) {
        console.error('Failed to delete team history:', error);
        params.addToast('Failed to delete team history. Please try again.', 'error');
      } finally { clearPending(deletingTeamIds, teamRunId); }
      return;
    }

    const { orgRunId } = target;
    if (deletingAgentOrgIds.value[orgRunId] || archivingAgentOrgIds.value[orgRunId]) return;
    markPending(deletingAgentOrgIds, orgRunId);
    try {
      const deleted = await params.deleteAgentOrgRun(orgRunId);
      if (!deleted) { params.addToast(t('workspace.agentOrg.history.deleteFailed'), 'error'); return; }
      params.addToast(t('workspace.agentOrg.history.deleted'), 'success');
      await notifyAgentOrgMutationSuccess(orgRunId, 'delete');
    } catch (error) {
      console.error('Failed to delete AgentOrg history:', error);
      params.addToast(t('workspace.agentOrg.history.deleteFailed'), 'error');
    } finally { clearPending(deletingAgentOrgIds, orgRunId); }
  };

  return {
    terminatingRunIds,
    stopPendingTeamIds,
    deletingRunIds,
    deletingTeamIds,
    deletingAgentOrgIds,
    showDeleteConfirmation,
    deleteConfirmationTitle,
    deleteConfirmationConfirmText,
    deleteConfirmationMessage,
    archivingRunIds,
    archivingTeamIds,
    archivingAgentOrgIds,
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
  };
};

import { computed, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { WorkspaceHistoryTeamDefinitionDisplayGroup } from '~/components/workspace/history/workspaceHistoryTeamDefinitionGroups';
import type {
  AgentOrgHistoryDefinitionGroup,
  AgentRunGroupArchiveOutcome,
  RunGroupArchiveOutcome,
  WorkspaceHistoryWorkspaceNode,
} from '~/stores/runHistoryTypes';
import type { RunTreeRow } from '~/utils/runTreeProjection';
import { escapeHtml } from '~/utils/escapeHtml';

type AgentGroupNode = WorkspaceHistoryWorkspaceNode['agents'][number];

type PendingGroupArchive =
  | Readonly<{ kind: 'agent'; key: string; name: string; workspaceRootPath: string; agentDefinitionId: string }>
  | Readonly<{ kind: 'team'; key: string; name: string; teamRunIds: string[] }>
  | Readonly<{ kind: 'agent_org'; key: string; name: string; orgRunIds: string[] }>;

export const agentGroupArchiveKey = (workspaceRootPath: string, agentDefinitionId: string): string =>
  `agent:${workspaceRootPath}:${agentDefinitionId}`;
export const teamGroupArchiveKey = (workspacePresentationId: string, groupKey: string): string =>
  `team:${workspacePresentationId}:${groupKey}`;
export const agentOrgGroupArchiveKey = (workspacePresentationId: string, definitionId: string): string =>
  `agent_org:${workspacePresentationId}:${definitionId}`;

/** An agent group can be archived once it holds a saved run; drafts and unsaved local runs never count. */
export const canArchiveAgentGroup = (agentNode: Pick<AgentGroupNode, 'runs'>): boolean =>
  agentNode.runs.some((run) => run.source === 'history');

const isBlockingAgentRun = (run: RunTreeRow): boolean => run.source === 'history' && run.isActive;

/**
 * Group-header "Archive all" UI policy: all-or-nothing running-run check before the
 * confirmation, confirmation, per-group pending state, dispatch per group kind,
 * one summary toast and Agent Org route cleanup.
 */
export const useWorkspaceHistoryGroupArchive = (params: {
  archiveAgentRunGroup: (workspaceRootPath: string, agentDefinitionId: string) => Promise<AgentRunGroupArchiveOutcome>;
  archiveTeamRuns: (teamRunIds: string[]) => Promise<RunGroupArchiveOutcome>;
  archiveAgentOrgRuns: (orgRunIds: string[]) => Promise<RunGroupArchiveOutcome>;
  onAgentOrgArchived?: (orgRunId: string) => Promise<void> | void;
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) => {
  const { t } = useLocalization();
  const archivingGroupKeys = ref<Record<string, boolean>>({});
  const pendingGroupArchive = ref<PendingGroupArchive | null>(null);
  const showGroupArchiveConfirmation = computed(() => pendingGroupArchive.value !== null);

  const runCount = (count: number): string => count === 1
    ? t('workspace.history.groupArchive.runCountOne')
    : t('workspace.history.groupArchive.runCountOther', { count });

  // ConfirmationModal renders its message as HTML, and translation decodes entities after
  // interpolation, so the finished text is escaped as a whole.
  const groupArchiveConfirmationMessage = computed(() => {
    const target = pendingGroupArchive.value;
    if (!target) return '';
    const { name } = target;
    if (target.kind === 'agent') return escapeHtml(t('workspace.history.groupArchive.confirmAllRuns', { name }));
    const count = target.kind === 'team' ? target.teamRunIds.length : target.orgRunIds.length;
    return escapeHtml(t('workspace.history.groupArchive.confirmCountedRuns', { name, runs: runCount(count) }));
  });

  const isGroupArchiving = (groupKey: string): boolean => Boolean(archivingGroupKeys.value[groupKey]);
  const setGroupArchiving = (groupKey: string, archiving: boolean): void => {
    const next = { ...archivingGroupKeys.value };
    if (archiving) next[groupKey] = true;
    else delete next[groupKey];
    archivingGroupKeys.value = next;
  };

  const showBlocked = (): void => params.addToast(t('workspace.history.groupArchive.stopRunningFirst'), 'warning');

  const requestGroupArchive = (target: PendingGroupArchive, hasBlockingRun: boolean): void => {
    if (isGroupArchiving(target.key)) return;
    if (hasBlockingRun) { showBlocked(); return; }
    pendingGroupArchive.value = target;
  };

  const onArchiveAgentGroup = (workspaceNode: WorkspaceHistoryWorkspaceNode, agentNode: AgentGroupNode): void => {
    if (!canArchiveAgentGroup(agentNode)) return;
    requestGroupArchive({
      kind: 'agent',
      key: agentGroupArchiveKey(workspaceNode.workspaceRootPath, agentNode.agentDefinitionId),
      name: agentNode.agentName,
      workspaceRootPath: workspaceNode.workspaceRootPath,
      agentDefinitionId: agentNode.agentDefinitionId,
    }, agentNode.runs.some(isBlockingAgentRun));
  };

  const onArchiveTeamGroup = (
    workspacePresentationId: string,
    group: WorkspaceHistoryTeamDefinitionDisplayGroup,
  ): void => {
    requestGroupArchive({
      kind: 'team',
      key: teamGroupArchiveKey(workspacePresentationId, group.key),
      name: group.teamDefinitionName,
      teamRunIds: group.runs.map((team) => team.teamRunId),
    }, group.runs.some((team) => team.isActive || team.deleteLifecycle !== 'READY'));
  };

  const onArchiveAgentOrgGroup = (workspacePresentationId: string, group: AgentOrgHistoryDefinitionGroup): void => {
    requestGroupArchive({
      kind: 'agent_org',
      key: agentOrgGroupArchiveKey(workspacePresentationId, group.definitionId),
      name: group.name,
      orgRunIds: group.runs.map((run) => run.rootRunId),
    }, group.runs.some((run) => run.isActive));
  };

  const closeGroupArchiveConfirmation = (): void => { pendingGroupArchive.value = null; };

  const leaveArchivedAgentOrgRoutes = async (orgRunIds: string[]): Promise<void> => {
    try {
      for (const orgRunId of orgRunIds) await params.onAgentOrgArchived?.(orgRunId);
    } catch (error) {
      console.error('AgentOrg history changed but route cleanup failed:', error);
      params.addToast(t('workspace.agentOrg.history.navigationCleanupFailed'), 'warning');
    }
  };

  const reportOutcome = ({ archivedRunIds, failedRunIds }: RunGroupArchiveOutcome): void => {
    const runs = runCount(archivedRunIds.length);
    if (failedRunIds.length === 0) {
      params.addToast(t('workspace.history.groupArchive.archived', { runs }), 'success');
    } else if (archivedRunIds.length === 0) {
      params.addToast(t('workspace.history.groupArchive.failed'), 'error');
    } else {
      params.addToast(t('workspace.history.groupArchive.archivedWithFailures', { runs, failed: failedRunIds.length }), 'error');
    }
  };

  const confirmGroupArchive = async (): Promise<void> => {
    const target = pendingGroupArchive.value;
    closeGroupArchiveConfirmation();
    if (!target || isGroupArchiving(target.key)) return;
    setGroupArchiving(target.key, true);
    try {
      if (target.kind === 'agent') {
        const outcome = await params.archiveAgentRunGroup(target.workspaceRootPath, target.agentDefinitionId);
        if (outcome.activeRunIds.length > 0) { showBlocked(); return; }
        reportOutcome(outcome);
        return;
      }
      if (target.kind === 'team') {
        reportOutcome(await params.archiveTeamRuns(target.teamRunIds));
        return;
      }
      const outcome = await params.archiveAgentOrgRuns(target.orgRunIds);
      reportOutcome(outcome);
      await leaveArchivedAgentOrgRoutes(outcome.archivedRunIds);
    } catch (error) {
      console.error(`Failed to archive all runs of group '${target.key}':`, error);
      params.addToast(t('workspace.history.groupArchive.failed'), 'error');
    } finally {
      setGroupArchiving(target.key, false);
    }
  };

  return {
    isGroupArchiving,
    showGroupArchiveConfirmation,
    groupArchiveConfirmationMessage,
    onArchiveAgentGroup,
    onArchiveTeamGroup,
    onArchiveAgentOrgGroup,
    closeGroupArchiveConfirmation,
    confirmGroupArchive,
  };
};

import { computed, ref, type Ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { RunArchiveTargets } from '~/stores/runHistoryMutationActions';
import type { RunGroupArchiveOutcome } from '~/stores/runHistoryTypes';
import type { RunListEntry } from '~/utils/runListProjection';
import { escapeHtml } from '~/utils/escapeHtml';

/** A run "Archive all older" covers: every Team and Org run, and every saved Agent run (not one no read lists yet). */
const isArchivable = (entry: RunListEntry): boolean => entry.kind !== 'agent' || entry.run.source === 'history';
/** As for a group's "Archive all": a running run, or a Team run that is being stopped or deleted, blocks them all. */
const blocks = (entry: RunListEntry): boolean => entry.isActive || (entry.kind === 'team' && entry.team.deleteLifecycle !== 'READY');

/**
 * "Archive all older" (autobyteus-378 DS-003, UIT-010): all-or-nothing over the runs beyond the newest five. While
 * any of them is running nothing is archived and "Stop running runs first." shows; otherwise the existing
 * confirmation, then every run is archived with one refresh and one summary toast.
 */
export const useRunListArchiveOlder = (params: {
  olderEntries: Readonly<Ref<readonly RunListEntry[]>>;
  archiveRuns: (targets: RunArchiveTargets) => Promise<RunGroupArchiveOutcome>;
  /** Leaves the Org route when the open Org run was archived. */
  onAgentOrgArchived?: (orgRunId: string) => Promise<void> | void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}) => {
  const { t } = useLocalization();
  const archivable = computed(() => params.olderEntries.value.filter(isArchivable));
  const pending = ref<RunListEntry[] | null>(null);
  const archiving = ref(false);

  const runCount = (count: number): string => count === 1
    ? t('workspace.history.groupArchive.runCountOne')
    : t('workspace.history.groupArchive.runCountOther', { count });
  // ConfirmationModal renders its message as HTML, and translation decodes entities after interpolation, so the
  // finished text is escaped as a whole.
  const confirmationMessage = computed(() => pending.value
    ? escapeHtml(t('workspace.history.groupArchive.confirmCountedRuns', { name: t('runList.olderRuns'), runs: runCount(pending.value.length) }))
    : '');

  const requestArchiveOlder = (): void => {
    if (archiving.value || archivable.value.length === 0) return;
    if (archivable.value.some(blocks)) {
      params.addToast(t('workspace.history.groupArchive.stopRunningFirst'), 'info');
      return;
    }
    pending.value = archivable.value.slice();
  };
  const cancelArchiveOlder = (): void => { pending.value = null; };

  const report = ({ archivedRunIds, failedRunIds }: RunGroupArchiveOutcome): void => {
    const runs = runCount(archivedRunIds.length);
    if (failedRunIds.length === 0) params.addToast(t('workspace.history.groupArchive.archived', { runs }), 'success');
    else if (archivedRunIds.length === 0) params.addToast(t('workspace.history.groupArchive.failed'), 'error');
    else params.addToast(t('workspace.history.groupArchive.archivedWithFailures', { runs, failed: failedRunIds.length }), 'error');
  };

  const confirmArchiveOlder = async (): Promise<void> => {
    const targets = pending.value ?? [];
    pending.value = null;
    if (targets.length === 0 || archiving.value) return;
    archiving.value = true;
    const idsOf = (kind: RunListEntry['kind']) => targets.filter((entry) => entry.kind === kind).map((entry) => entry.runId);
    try {
      const outcome = await params.archiveRuns({ agentRunIds: idsOf('agent'), teamRunIds: idsOf('team'), orgRunIds: idsOf('org') });
      report(outcome);
      const archivedOrgs = idsOf('org').filter((runId) => outcome.archivedRunIds.includes(runId));
      for (const orgRunId of archivedOrgs) await params.onAgentOrgArchived?.(orgRunId);
    } catch (error) {
      console.error('Failed to archive older runs:', error);
      params.addToast(t('workspace.history.groupArchive.failed'), 'error');
    } finally {
      archiving.value = false;
    }
  };

  return {
    canArchiveOlder: computed(() => archivable.value.length > 0),
    archiving,
    showConfirmation: computed(() => pending.value !== null),
    confirmationMessage,
    requestArchiveOlder,
    cancelArchiveOlder,
    confirmArchiveOlder,
  };
};

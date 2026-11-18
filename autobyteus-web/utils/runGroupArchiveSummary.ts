import type { useLocalization } from '~/composables/useLocalization';
import type { RunGroupArchiveOutcome } from '~/stores/runHistoryTypes';

type Translate = ReturnType<typeof useLocalization>['t'];

/**
 * The one summary toast of an "Archive all": how many runs were archived and how many failed, followed by the server's
 * reason for each run it refused (autobyteus-461 CR-461-087, AC-008: DS-13's refusal names the delegated run that is
 * working). When every run was refused for a reason, the reasons are the message.
 */
export const runGroupArchiveSummary = (
  { archivedRunIds, failedRunIds, failureReasons = [] }: RunGroupArchiveOutcome,
  t: Translate,
): Readonly<{ message: string; type: 'success' | 'error' }> => {
  const runs = archivedRunIds.length === 1
    ? t('workspace.history.groupArchive.runCountOne')
    : t('workspace.history.groupArchive.runCountOther', { count: archivedRunIds.length });
  if (failedRunIds.length === 0) return { message: t('workspace.history.groupArchive.archived', { runs }), type: 'success' };
  const reasons = [...new Set(failureReasons)].join(' ');
  const summary = archivedRunIds.length > 0
    ? t('workspace.history.groupArchive.archivedWithFailures', { runs, failed: failedRunIds.length })
    : reasons ? '' : t('workspace.history.groupArchive.failed');
  return { message: [summary, reasons].filter(Boolean).join(' '), type: 'error' };
};

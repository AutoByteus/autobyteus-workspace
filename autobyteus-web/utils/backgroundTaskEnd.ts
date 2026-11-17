import type { BackgroundTaskEndReason } from '~/types/backgroundTask';
import type { BackgroundTaskPanelRow } from '~/types/backgroundTaskView';

/** How an ended background task ended, as the desktop panel and the phone both show it (each in its own words). */
export type BackgroundTaskEnd =
  | { kind: BackgroundTaskEndReason }
  | { kind: 'exit_code'; code: number };

/**
 * The end of one row: its end reason when the runtime reported one, else its exit code, else null (the views then
 * show the runtime's summary as it is). A running row has none. The views never read the summary for a reason.
 */
export const describeBackgroundTaskEnd = (row: BackgroundTaskPanelRow): BackgroundTaskEnd | null => {
  if (row.status === 'running') return null;
  if (row.endReason !== null) return { kind: row.endReason };
  if (row.exitCode !== null) return { kind: 'exit_code', code: row.exitCode };
  return null;
};

import type { BackgroundTask, BackgroundTaskStatus } from './backgroundTask';

/** Presentation-only status; not a streamed lifecycle/idle-policy extension. */
export type BackgroundTaskPanelStatus = BackgroundTaskStatus | 'unknown';
export type BackgroundTaskSnapshotRow = Omit<BackgroundTask, 'kind' | 'status' | 'command' | 'summary'> & {
  kind: 'shell';
  status: BackgroundTaskPanelStatus;
  command: null;
  summary: null;
  exitCode: number | null;
};
export type BackgroundTaskPanelRow = BackgroundTask | BackgroundTaskSnapshotRow;

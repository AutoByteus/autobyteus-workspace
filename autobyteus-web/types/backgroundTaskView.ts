import type { BackgroundTask, BackgroundTaskStatus } from './backgroundTask';

/** Presentation-only status; not a streamed lifecycle/idle-policy extension. */
export type BackgroundTaskPanelStatus = BackgroundTaskStatus | 'unknown';
export type BackgroundTaskSnapshotRow = Omit<BackgroundTask, 'kind' | 'status' | 'command' | 'summary' | 'endReason'> & {
  kind: 'shell';
  status: BackgroundTaskPanelStatus;
  command: null;
  summary: null;
  /** A polled observation never knows why a task ended, only its exit code. */
  endReason: null;
};
export type BackgroundTaskPanelRow = BackgroundTask | BackgroundTaskSnapshotRow;

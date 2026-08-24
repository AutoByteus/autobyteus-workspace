export type AppUpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'no-update'
  | 'error';

export type AppUpdateErrorKind =
  | 'network'
  | 'release-preparing'
  | 'metadata'
  | 'download'
  | 'install'
  | 'unavailable'
  | 'unknown';

export type AppUpdateOperation =
  | 'startup-check'
  | 'manual-check'
  | 'download'
  | 'install'
  | 'updater-event';

export interface AppUpdateState {
  status: AppUpdateStatus;
  currentVersion: string;
  availableVersion: string | null;
  downloadPercent: number | null;
  downloadTransferredBytes: number | null;
  downloadTotalBytes: number | null;
  releaseNotes: string | null;
  message: string;
  errorKind: AppUpdateErrorKind | null;
  errorOperation: AppUpdateOperation | null;
  checkedAt: string | null;
}

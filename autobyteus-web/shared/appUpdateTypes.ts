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

/** Desktop update channel: `beta` also receives pre-releases (vX.Y.Z-beta.N). */
export type AppUpdateChannel = 'stable' | 'beta';

export interface AppUpdateState {
  status: AppUpdateStatus;
  currentVersion: string;
  /** True when the running build is a pre-release (for example 1.4.90-beta.3). */
  currentVersionIsPrerelease: boolean;
  updateChannel: AppUpdateChannel;
  /**
   * True once an update has been downloaded in this app process. The staged update
   * installs on quit (autoInstallOnAppQuit), and a later check does not unstage it,
   * so this stays true until the app restarts.
   */
  updateStaged: boolean;
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

/**
 * Result of the `app-update:set-channel` command.
 * - `accepted: false`: the value was invalid or an update is checking, downloading,
 *   downloaded or installing; the channel is unchanged.
 * - `accepted: true, persisted: false`: the channel applies for this session only
 *   because saving the preference failed.
 */
export interface AppUpdateChannelChangeResult {
  accepted: boolean;
  persisted: boolean;
  state: AppUpdateState;
}

/**
 * The single rule for when the update channel cannot change. The main process
 * refuses `set-channel` and the About page disables the switch on the same rule.
 * A staged update is locked even after a later check moves the status on, because
 * it would still install on quit.
 */
export function isAppUpdateChannelLocked(state: Pick<AppUpdateState, 'status' | 'updateStaged'>): boolean {
  return (
    state.status === 'checking'
    || state.status === 'downloading'
    || state.status === 'installing'
    || state.updateStaged
  );
}

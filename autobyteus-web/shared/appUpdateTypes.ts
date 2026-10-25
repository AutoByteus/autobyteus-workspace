export type AppUpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'no-update'
  | 'error'
  /** This launch never checks for updates (isolated app instances); the UI stays quiet. */
  | 'disabled';

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
  /** A check of the app's own update schedule after the launch check (REQ-012). */
  | 'periodic-check'
  | 'manual-check'
  | 'download'
  | 'install'
  | 'updater-event';

/** The app's own automatic update checks: at launch and then every interval (REQ-012, REQ-013). */
export interface AppUpdateAutoCheck {
  enabled: boolean;
  /** Whole minutes from 15 to 1440. */
  intervalMinutes: number;
}

export const APP_UPDATE_CHECK_INTERVAL_MIN_MINUTES = 15;
export const APP_UPDATE_CHECK_INTERVAL_MAX_MINUTES = 1440;
export const DEFAULT_APP_UPDATE_AUTO_CHECK: Readonly<AppUpdateAutoCheck> = Object.freeze({ enabled: true, intervalMinutes: 60 });

export function isValidAppUpdateCheckInterval(minutes: unknown): minutes is number {
  return typeof minutes === 'number' && Number.isInteger(minutes)
    && minutes >= APP_UPDATE_CHECK_INTERVAL_MIN_MINUTES && minutes <= APP_UPDATE_CHECK_INTERVAL_MAX_MINUTES;
}

export function isAppUpdateAutoCheck(value: unknown): value is AppUpdateAutoCheck {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.enabled === 'boolean' && isValidAppUpdateCheckInterval(candidate.intervalMinutes);
}

/** Desktop update channel: `beta` also receives pre-releases (vX.Y.Z-beta.N). */
export type AppUpdateChannel = 'stable' | 'beta';

/**
 * The app's update notification, kept by the desktop shell. `waiting` until the app runs the
 * found version (or a later one); then `handled` until the user clears it or a newer version
 * replaces it.
 */
export interface AppUpdateNotification {
  version: string;
  fromVersion: string;
  foundAt: string;
  read: boolean;
  state: 'waiting' | 'handled';
  handledVersion: string | null;
  /** GitHub release page of `version`; null when the release feed is not GitHub (the e2e test feed). */
  releasePageUrl: string | null;
}

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
  /** When the last check finished (any source); null before the first one. */
  checkedAt: string | null;
  notification: AppUpdateNotification | null;
  /** The app's automatic checks; null when this launch never checks (disabled updates). */
  autoCheck: AppUpdateAutoCheck | null;
}

/**
 * Result of the `app-update:set-channel` command.
 * - `accepted: false`: the value was invalid or `isAppUpdateChannelLocked(state)` is
 *   true (checking, downloading, installing, or an update is staged); the channel is
 *   unchanged.
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

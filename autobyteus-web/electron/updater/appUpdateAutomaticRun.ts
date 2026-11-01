import type { AppUpdateNotificationRecord } from './appUpdateNotificationRecord';

/** An accepted automatic install that has not quit the app within this bound has failed (SR-003 AR-001, signal c). */
export const INSTALL_QUIT_BOUND_MS = 60_000;

type Timers = Readonly<{
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}>;

/**
 * The state of the app's automatic update (autobyteus-356) for one process: the version being downloaded, the version
 * whose install was requested, the quit bound, and the once-only failure handling. `AppUpdater` owns the sequence
 * (when to download and install); this owns what an automatic run remembers and records.
 */
export class AppUpdateAutomaticRun {
  /** The version an automatic download is fetching (DS-001); null otherwise. */
  private downloadingVersion: string | null = null;
  /** The version whose automatic install this process requested: never started again here (SR-003 AR-001). */
  private installRequestedVersion: string | null = null;
  private installFailureHandled = false;
  private quitBoundTimer: unknown = null;

  constructor(private readonly dependencies: Readonly<{
    record: () => AppUpdateNotificationRecord | null;
    /** Called once after a failed automatic install (the application relaunches the old version when it can). */
    recoverAfterFailedInstall: () => void | Promise<void>;
    quitBoundMs?: number;
    timers?: Timers;
  }>) {}

  /** `version` must not be updated automatically: its install failed before (record), or was requested in this process. */
  blocks(version: string): boolean {
    return this.installRequestedVersion === version || this.dependencies.record()?.blocksAutomatic(version) === true;
  }

  beginDownload(version: string): void { this.downloadingVersion = version; }

  /** The automatic download failed: recorded once (it does not block; the next check tries again). */
  downloadFailed(reason: string): boolean {
    const version = this.downloadingVersion;
    if (!version) return false;
    this.downloadingVersion = null;
    this.dependencies.record()?.recordAutomaticFailure(version, 'download', reason);
    return true;
  }

  downloadDone(): void { this.downloadingVersion = null; }

  /** The automatic install of `version` was accepted: recorded before anything stops, and blocked for this process. */
  installAccepted(version: string): void {
    this.installRequestedVersion = version;
    this.installFailureHandled = false;
    this.dependencies.record()?.recordAutomaticInstall(version);
  }

  /**
   * `quitAndInstall` was called: when an automatic install is pending (accepted and not failed), the app must quit
   * within the bound. A manual install is never bounded (its behavior is unchanged).
   */
  awaitQuit(onExpired: () => void): void {
    if (!this.installRequestedVersion || this.installFailureHandled) return;
    this.clearQuitBound();
    const timers = this.dependencies.timers ?? defaultTimers;
    this.quitBoundTimer = timers.setTimeout(() => { this.quitBoundTimer = null; onExpired(); }, this.dependencies.quitBoundMs ?? INSTALL_QUIT_BOUND_MS);
  }

  /** The app is quitting: the install goes ahead. */
  quitStarted(): void { this.clearQuitBound(); }

  /**
   * The automatic install failed (the install catch, an updater error during the install, or the quit bound). Recorded
   * as an install failure, which blocks the version, and recovery runs, once per requested install. False when no
   * automatic install is under way or the failure was already handled.
   */
  installFailed(reason: string): boolean {
    const version = this.installRequestedVersion;
    if (!version || this.installFailureHandled) return false;
    this.installFailureHandled = true;
    this.clearQuitBound();
    this.dependencies.record()?.recordAutomaticFailure(version, 'install', reason);
    void Promise.resolve().then(() => this.dependencies.recoverAfterFailedInstall()).catch(() => undefined);
    return true;
  }

  private clearQuitBound(): void {
    if (this.quitBoundTimer === null) return;
    (this.dependencies.timers ?? defaultTimers).clearTimeout(this.quitBoundTimer);
    this.quitBoundTimer = null;
  }
}

const defaultTimers: Timers = {
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

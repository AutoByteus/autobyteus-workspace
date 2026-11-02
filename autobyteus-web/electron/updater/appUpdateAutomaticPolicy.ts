import type { AppUpdateState } from '../../shared/appUpdateTypes';
import { logger } from '../logger';
import { AppUpdateAutomaticRun } from './appUpdateAutomaticRun';
import { safeAppUpdateMessage } from './appUpdateErrorClassifier';
import { AppUpdateInstallReadiness } from './appUpdateInstallReadiness';
import type { AppUpdateNotificationRecord } from './appUpdateNotificationRecord';

export const UPDATE_DOWNLOADED_MESSAGE = 'Update downloaded. Restart to install.';
const PREPARING_MESSAGE = 'Update downloaded. Preparing to install...';

/** Plain reasons the automatic path records: never the raw native text, nor "try again" for a version it won't retry (REQ-004). */
const REASON_NATIVE_REFUSAL = 'The system updater could not prepare this update.';
const REASON_READY_BOUND = 'The update was still not ready to install after 15 minutes.';
const REASON_AFTER_STOP = 'The app could not restart to install the update.';

/** What the policy needs from `AppUpdater`, which owns the update's state and the actions a click also runs. */
export type AppUpdateAutomaticHost = Readonly<{
  state: () => AppUpdateState;
  apply: (partial: Partial<AppUpdateState>) => void;
  notification: () => AppUpdateState['notification'];
  download: () => Promise<AppUpdateState>;
  install: () => { accepted: boolean };
  downloadInFlight: () => boolean;
}>;

type PolicyOptions = Readonly<{
  platform: NodeJS.Platform;
  record: () => AppUpdateNotificationRecord | null;
  settleInstall: () => Promise<boolean>;
  recoverAfterFailedInstall: () => void | Promise<void>;
  installQuitBoundMs?: number;
}>;

/**
 * "Update automatically" for the app (autobyteus-356, DS-001, DS-002): when a found version downloads, when a downloaded
 * version installs, and what a failure means. It calls the same download and install a click runs, and reads the switch at
 * every event, so turning it off stops what has not started.
 */
export class AppUpdateAutomaticPolicy {
  private readonly run: AppUpdateAutomaticRun;
  private readonly readiness: AppUpdateInstallReadiness;
  private settlingFailedPreparation = false;

  constructor(private readonly host: AppUpdateAutomaticHost, options: PolicyOptions) {
    this.run = new AppUpdateAutomaticRun({
      record: options.record,
      settleInstall: options.settleInstall,
      recoverAfterFailedInstall: options.recoverAfterFailedInstall,
      quitBoundMs: options.installQuitBoundMs,
    });
    this.readiness = new AppUpdateInstallReadiness({
      platform: options.platform,
      onReady: (version) => {
        this.host.apply({ automaticInstallPreparing: false });
        this.installAutomatically(version);
      },
      onBoundExpired: (version) => {
        this.run.preparationFailed(version, REASON_READY_BOUND);
        // Squirrel may still finish: the status stays `downloaded`, the update stays staged and a click still works.
        this.host.apply({ automaticInstallPreparing: false, message: UPDATE_DOWNLOADED_MESSAGE, notification: this.host.notification() });
      },
    });
    this.readiness.start();
  }

  /** No check or download runs during the wait: every updater `error` meanwhile is about this update's preparation. */
  get waiting(): boolean { return this.readiness.pendingVersion !== null; }

  get settlingPreparationFailure(): boolean { return this.settlingFailedPreparation; }

  /** A check found `version`. Squirrel already holding it needs no second native fetch. */
  found(version: string): void {
    const state = this.host.state();
    if (!state.automaticUpdate || this.run.blocks(version)) return;
    if (state.updateStaged && this.readiness.readyFor(version)) {
      this.host.apply({ status: 'downloaded', message: UPDATE_DOWNLOADED_MESSAGE });
      this.installAutomatically(version);
      return;
    }
    this.run.beginDownload(version);
    void this.host.download().then((after) => {
      if (after.status === 'error' && after.errorOperation === 'download') this.downloadFailed(after.message);
    });
  }

  /** electron-updater reported a download, whatever the switch says. */
  downloaded(version: string | null): void {
    this.readiness.downloadReported(version);
    this.run.downloadDone();
    if (version) this.installWhenReady(version);
  }

  /** The switch changed: on continues an update that was found or downloaded; off drops a wait. */
  switched(enabled: boolean): void {
    const { status, availableVersion: version } = this.host.state();
    if (!enabled) {
      if (!this.waiting) return;
      this.readiness.endWait();
      this.host.apply({ automaticInstallPreparing: false, message: UPDATE_DOWNLOADED_MESSAGE });
    } else if (version && status === 'available') this.found(version);
    else if (version && status === 'downloaded') this.installWhenReady(version);
  }

  /** A click's install was accepted: from here it follows the manual path, so its wait and bound end. */
  installAccepted(): void { this.readiness.endWait(); }

  /**
   * The `error` handler's first two steps. A wait pending: this update could not be prepared, and nothing has stopped, so
   * it blocks the version with no recovery, and Squirrel holds nothing. Then the rest of that same refusal (a second
   * `error`, the rejected download) changes nothing. False: today's handling applies.
   */
  claimError(error: unknown): boolean {
    const version = this.readiness.pendingVersion;
    if (version) {
      logger.error(`[updater] The system updater could not prepare ${version}.`, error);
      this.readiness.endWait();
      this.run.preparationFailed(version, REASON_NATIVE_REFUSAL);
      this.host.apply({
        status: 'error', errorKind: 'install-preparation', errorOperation: 'install',
        message: safeAppUpdateMessage('install-preparation'), updateStaged: false, automaticInstallPreparing: false,
        notification: this.host.notification(),
      });
      this.settlingFailedPreparation = this.host.downloadInFlight();
      return true;
    }
    if (!this.settlingFailedPreparation) return false;
    logger.warn('[updater] A further error of the same refused update.', error);
    return true;
  }

  downloadEnded(): void { this.settlingFailedPreparation = false; }

  downloadFailed(reason: string): void {
    if (this.run.downloadFailed(reason)) this.host.apply({ notification: this.host.notification() });
  }

  /** Recorded once (blocking the version), then the install in flight settles and recovery runs if it had begun. */
  installFailed(): void {
    if (this.run.installFailed(REASON_AFTER_STOP)) this.host.apply({ notification: this.host.notification() });
  }

  installRequestedFor(version: string | null): boolean { return this.run.installRequestedFor(version); }
  awaitQuit(onExpired: () => void): void { this.run.awaitQuit(onExpired); }
  quitStarted(): void { this.run.quitStarted(); }

  private installWhenReady(version: string): void {
    if (!this.host.state().automaticUpdate || this.run.blocks(version)) return;
    if (this.readiness.readyFor(version)) {
      this.installAutomatically(version);
      return;
    }
    this.readiness.wait(version);
    this.host.apply({ automaticInstallPreparing: true, message: PREPARING_MESSAGE });
  }

  /** Installs at once (DEC-001 = A); recorded only when the install was accepted. */
  private installAutomatically(version: string): void {
    if (!this.host.state().automaticUpdate || this.run.blocks(version)) return;
    if (!this.host.install().accepted) return;
    this.run.installAccepted(version);
    this.host.apply({ notification: this.host.notification() });
  }
}

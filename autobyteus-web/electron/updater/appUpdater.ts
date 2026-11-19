import * as path from 'path';
import { app, BrowserWindow, net } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { ProgressInfo, UpdateInfo } from 'electron-updater';
import type {
  AppUpdateAutomaticChangeResult,
  AppUpdateChannelChangeResult,
  AppUpdateOperation,
  AppUpdateState,
  AppUpdateStatus,
} from '../../shared/appUpdateTypes';
import { isAppUpdateChannelLocked } from '../../shared/appUpdateTypes';
import { logger } from '../logger';
import { AppUpdateErrorReporter } from './appUpdateErrorReporter';
import type { ManagedUpdateSession, ManagedUpdateEvent } from '../application/managedUpdateSession';
import { isAppUpdateChannel, loadAppUpdateChannel, saveAppUpdateChannel } from './appUpdateChannelStore';
import { AppUpdateNotificationRecord } from './appUpdateNotificationRecord';
import { loadAppUpdateAutomatic, saveAppUpdateAutomatic } from './appUpdateAutomaticStore';
import { AppUpdateAutomaticPolicy, UPDATE_DOWNLOADED_MESSAGE } from './appUpdateAutomaticPolicy';
import { AppUpdateInstallAttempt } from './appUpdateInstallAttempt';
import { resolveAppReleasePageUrl } from './appReleasePage';
import { APP_UPDATE_STATE_CHANNEL, type AppUpdateController } from './appUpdateController';
import { AppUpdateCheckSchedule, type AppUpdateCheckSource } from './appUpdateCheckSchedule';
import { registerAppUpdateIpc } from './appUpdateIpc';
import { isPrereleaseVersion, normalizeReleaseNotes, toIsoNow } from './appUpdateStateFormat';

const CHANNEL_RECHECK_STATUSES: ReadonlySet<AppUpdateStatus> = new Set([
  'idle',
  'no-update',
  'available',
  'error',
]);

/** While the app update is in one of these, no automatic check runs (REQ-014). */
const BUSY_STATUSES: ReadonlySet<AppUpdateStatus> = new Set(['checking', 'downloading', 'downloaded', 'installing']);

const CHECK_OPERATIONS: Readonly<Record<AppUpdateCheckSource | 'manual', AppUpdateOperation>> = {
  manual: 'manual-check',
  startup: 'startup-check',
  periodic: 'periodic-check',
};

type AppUpdaterOptions = {
  managedSession?: ManagedUpdateSession;
  showRestartUnavailable?: (message: string) => void;
  prepareForInstall?: () => Promise<void>;
  /** After a failed automatic install (autobyteus-356): the application relaunches the old version when it can. */
  recoverAfterFailedInstall?: () => void | Promise<void>;
  /** The automatic install's quit bound (60 s by default). */
  installQuitBoundMs?: number;
  /** The platform the install order depends on; `process.platform` by default. */
  platform?: NodeJS.Platform;
  /** The launch check's delay (8 s by default). */
  autoCheckDelayMs?: number;
  /** Whether the machine is online; Electron's `net.isOnline()` by default. */
  isOnline?: () => boolean;
  /** e2e only: check this generic feed instead of the packaged GitHub feed (REQ-019). */
  testFeedUrl?: string | null;
  /** The packaged publish config (`app-update.yml`) the release link is read from. */
  appUpdateConfigPath?: string | null;
};

export class AppUpdater implements AppUpdateController {
  private state: AppUpdateState;
  private initialized = false;
  private activeOperation: AppUpdateOperation | null = null;
  private readonly errors = new AppUpdateErrorReporter(partial => this.applyState(partial));
  private notificationRecord: AppUpdateNotificationRecord | null = null;
  private schedule: AppUpdateCheckSchedule | null = null;
  private automatic: AppUpdateAutomaticPolicy | null = null;
  private downloadInFlight = false;
  private installAttempt: AppUpdateInstallAttempt | null = null;
  private readonly autoCheckDelayMs: number | undefined;
  private readonly isOnline: () => boolean;
  private readonly testFeedUrl: string | null;
  private readonly appUpdateConfigPath: string | null;

  constructor(private readonly options: AppUpdaterOptions = {}) {
    this.autoCheckDelayMs = options.autoCheckDelayMs;
    this.isOnline = options.isOnline ?? (() => net.isOnline());
    this.testFeedUrl = options.testFeedUrl ?? null;
    this.appUpdateConfigPath = options.appUpdateConfigPath !== undefined ? options.appUpdateConfigPath
      : process.resourcesPath ? path.join(process.resourcesPath, 'app-update.yml') : null;
    const currentVersion = app.getVersion();
    this.state = {
      activationMode: options.managedSession ? 'managed-quit' : 'native',
      status: 'idle',
      currentVersion,
      currentVersionIsPrerelease: isPrereleaseVersion(currentVersion),
      updateChannel: 'stable',
      updateStaged: false,
      availableVersion: null,
      downloadPercent: null,
      downloadTransferredBytes: null,
      downloadTotalBytes: null,
      releaseNotes: null,
      message: 'Update status is idle.',
      errorKind: null,
      errorOperation: null,
      checkedAt: null,
      notification: null,
      autoCheck: null,
      automaticUpdate: false,
      automaticInstallPreparing: false,
    };
  }

  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = !this.options.managedSession;
    autoUpdater.logger = {
      info: (message: string) => logger.info(`[updater] ${message}`),
      warn: (message: string) => logger.warn(`[updater] ${message}`),
      error: (message: string) => logger.error(`[updater] ${message}`),
      debug: (message: string) => logger.debug(`[updater] ${message}`),
    } as any;

    if (this.testFeedUrl) {
      autoUpdater.setFeedURL({ provider: 'generic', url: this.testFeedUrl });
    }
    this.notificationRecord = new AppUpdateNotificationRecord(app.getPath('userData'), this.state.currentVersion);
    this.automatic = new AppUpdateAutomaticPolicy({
      state: () => this.getState(),
      apply: (partial) => this.applyState(partial),
      notification: () => this.currentNotification(),
      download: () => this.downloadUpdate(),
      install: () => this.installUpdateAndRestart(),
      downloadInFlight: () => this.downloadInFlight,
    }, {
      platform: this.options.platform ?? process.platform,
      activation: this.options.managedSession ? 'managed-quit' : 'native',
      record: () => this.notificationRecord,
      settleInstall: async () => (await this.installAttempt?.abort()) ?? false,
      recoverAfterFailedInstall: () => this.options.recoverAfterFailedInstall?.(),
      installQuitBoundMs: this.options.installQuitBoundMs,
    });
    // The app quitting is the automatic install going ahead (it clears the quit bound).
    app.on('before-quit', () => this.automatic?.quitStarted());
    const schedule = new AppUpdateCheckSchedule({
      userDataPath: app.getPath('userData'),
      target: this,
      isOnline: this.isOnline,
      launchDelayMs: this.autoCheckDelayMs,
    });
    // The schedule owns its settings; the state only follows them (AR-004).
    schedule.onChange(() => this.applyState({ autoCheck: schedule.settings() }));
    this.schedule = schedule;
    this.state = {
      ...this.state,
      updateChannel: loadAppUpdateChannel(app.getPath('userData')),
      automaticUpdate: loadAppUpdateAutomatic(app.getPath('userData')),
      notification: this.currentNotification(),
      autoCheck: schedule.settings(),
    };
    this.applyChannelPolicy();
    this.options.managedSession?.settingsChanged(this.state);
    this.options.managedSession?.automaticInstallBlockChanged(this.notificationRecord.automaticInstallBlockedVersion);
    this.options.managedSession?.onChange(event => this.managedEvent(event));

    this.registerAutoUpdaterListeners();
    registerAppUpdateIpc(this, schedule);
    this.broadcastState();
  }

  /** Starts the automatic checks (launch, then every interval) in packaged builds. */
  startAutoCheck(): void {
    if (!app.isPackaged) {
      logger.info('Skipping automatic update checks in unpackaged/dev runtime.');
      return;
    }
    if (!this.initialized) this.initialize();
    this.schedule?.start();
  }

  /** An app update is checking, downloading, downloaded (staged) or installing. */
  isBusy(): boolean {
    return BUSY_STATUSES.has(this.state.status) || this.state.updateStaged;
  }

  getState(): AppUpdateState {
    return { ...this.state };
  }

  async checkForUpdates(source: AppUpdateCheckSource | 'manual' = 'manual'): Promise<AppUpdateState> {
    if (!this.initialized) {
      this.initialize();
    }

    if (!app.isPackaged) {
      if (source === 'manual') {
        this.applyState({
          status: 'error',
          message: 'Updates are only available in packaged builds.',
          errorKind: 'unavailable',
          errorOperation: 'manual-check',
          checkedAt: toIsoNow(),
        });
      }
      return this.getState();
    }

    if (this.state.status === 'checking' || this.state.status === 'downloading' || this.automatic?.waiting || (this.options.managedSession && this.state.updateStaged)) {
      return this.getState();
    }

    const operation = CHECK_OPERATIONS[source];
    this.activeOperation = operation;

    // `checkedAt` marks a finished check: it is set by the result, not here (REQ-015).
    this.applyState({
      status: 'checking',
      message: 'Checking for updates...',
      errorKind: null,
      errorOperation: null,
      downloadPercent: null,
      downloadTransferredBytes: null,
      downloadTotalBytes: null,
    });

    try {
      this.applyChannelPolicy();
      await autoUpdater.checkForUpdates();
    } catch (error) {
      this.errors.report(error, 'Failed to check for updates.', operation);
    } finally {
      if (this.activeOperation === operation) {
        this.activeOperation = null;
      }
    }

    return this.getState();
  }

  async downloadUpdate(): Promise<AppUpdateState> {
    if (!app.isPackaged) {
      this.applyState({
        status: 'error',
        message: 'Updates are only available in packaged builds.',
        errorKind: 'unavailable',
        errorOperation: 'download',
      });
      return this.getState();
    }

    if (this.state.status === 'downloading' || this.automatic?.waiting) {
      return this.getState();
    }

    // After a restart the notification exists before this process has seen the update: check first.
    if (this.state.status !== 'available' && this.state.notification?.state === 'waiting'
      && this.state.status !== 'checking' && this.state.status !== 'downloaded') {
      const checked = await this.checkForUpdates('manual');
      if (checked.status !== 'available') {
        return checked;
      }
    }

    if (this.state.status !== 'available') {
      this.applyState({
        status: 'error',
        message: 'No update is currently available to download.',
        errorKind: 'metadata',
        errorOperation: 'download',
      });
      return this.getState();
    }

    this.activeOperation = 'download';

    this.applyState({
      status: 'downloading',
      message: 'Downloading update...',
      errorKind: null,
      errorOperation: null,
      downloadPercent: 0,
      downloadTransferredBytes: 0,
      downloadTotalBytes: null,
    });

    this.downloadInFlight = true;
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      // macOS: a refused update also rejects the download; the automatic path's own state stands (F-API-002, DS-002).
      if (this.automatic?.settlingPreparationFailure || this.automatic?.installRequestedFor(this.state.availableVersion)) logger.warn('[updater] Download ended by the update\'s refusal.', error);
      else this.errors.report(error, 'Failed to download update.', 'download');
    } finally {
      this.downloadInFlight = false;
      this.automatic?.downloadEnded();
      if (this.activeOperation === 'download') {
        this.activeOperation = null;
      }
    }

    return this.getState();
  }

  installUpdateAndRestart(): { accepted: boolean } {
    if (this.state.status !== 'downloaded' || (this.options.managedSession && !this.state.updateStaged)) {
      return { accepted: false };
    }

    if (this.options.managedSession) {
      const result = this.options.managedSession.requestRestart();
      if (result.accepted) this.applyState({ status: 'installing', message: 'Installing update and restarting...' });
      return result;
    }
    this.activeOperation = 'install';
    this.automatic?.installAccepted();

    this.applyState({
      automaticInstallPreparing: false,
      status: 'installing',
      message: 'Installing update and restarting...',
      errorKind: null,
      errorOperation: null,
    });

    const failed = (error: unknown): void => {
      this.errors.report(error, 'Failed to install update and restart.', 'install');
      this.automatic?.installFailed();
    };
    this.installAttempt = new AppUpdateInstallAttempt({
      prepare: () => this.options.prepareForInstall?.(),
      quitAndInstall: () => autoUpdater.quitAndInstall(false, true),
      onQuitRequested: () => this.automatic?.awaitQuit(() => failed(new Error('The app did not quit to install the update within 60 seconds.'))),
      onFailed: failed,
    });

    return { accepted: true };
  }

  async setUpdateChannel(channel: unknown): Promise<AppUpdateChannelChangeResult> {
    if (!isAppUpdateChannel(channel) || isAppUpdateChannelLocked(this.state)) {
      return { accepted: false, persisted: false, state: this.getState() };
    }

    // A failed save still applies the channel for this session; the caller reports it.
    const persisted = saveAppUpdateChannel(app.getPath('userData'), channel);
    this.applyState({ updateChannel: channel });
    this.options.managedSession?.settingsChanged(this.state);
    this.applyChannelPolicy();

    // Re-check so an "available" result from the previous channel is replaced.
    if (app.isPackaged && CHANNEL_RECHECK_STATUSES.has(this.state.status)) {
      await this.checkForUpdates('manual');
    }

    return { accepted: true, persisted, state: this.getState() };
  }

  /**
   * "Update automatically" for the app (autobyteus-356). Turning it on continues an update that was found or
   * downloaded; the switch is read again at every event, so turning it off stops what has not started.
   */
  setAutomaticUpdate(enabled: unknown): AppUpdateAutomaticChangeResult {
    if (typeof enabled !== 'boolean') return { accepted: false, persisted: false, state: this.getState() };
    if (!this.initialized) this.initialize();
    const persisted = saveAppUpdateAutomatic(app.getPath('userData'), enabled);
    this.applyState({ automaticUpdate: enabled });
    this.options.managedSession?.settingsChanged(this.state);
    this.automatic?.switched(enabled);
    return { accepted: true, persisted, state: this.getState() };
  }

  markNotificationRead(): AppUpdateState {
    if (this.notificationRecord?.markRead()) this.applyState({ notification: this.currentNotification() });
    return this.getState();
  }

  clearNotification(): AppUpdateState {
    if (this.notificationRecord?.clear()) this.applyState({ notification: this.currentNotification() });
    return this.getState();
  }

  /** The release link names the packaged GitHub feed; a test feed has none (DEC-017). */
  private currentNotification(): AppUpdateState['notification'] {
    const configPath = this.testFeedUrl ? null : this.appUpdateConfigPath;
    return this.notificationRecord?.toNotification(
      (version) => configPath ? resolveAppReleasePageUrl(configPath, version) : null) ?? null;
  }

  /**
   * Applies the channel to electron-updater before every check. Never set
   * `autoUpdater.channel`: its setter forces `allowDowngrade = true`.
   */
  private applyChannelPolicy(): void {
    autoUpdater.allowPrerelease = this.state.updateChannel === 'beta';
    autoUpdater.allowDowngrade = false;
  }

  private registerAutoUpdaterListeners(): void {
    autoUpdater.on('checking-for-update', () => {
      this.applyState({
        status: 'checking',
        message: 'Checking for updates...',
        errorKind: null,
        errorOperation: null,
      });
    });

    autoUpdater.on('update-available', (updateInfo: UpdateInfo) => {
      const retainedManagedStage = this.options.managedSession && this.state.updateStaged && this.state.availableVersion === updateInfo.version;
      if (updateInfo.version) this.notificationRecord?.recordFound(updateInfo.version);
      this.applyState({
        notification: this.currentNotification(),
        status: 'available',
        availableVersion: updateInfo.version || null,
        releaseNotes: normalizeReleaseNotes(updateInfo.releaseNotes),
        message: updateInfo.version
          ? `Version ${updateInfo.version} is available.`
          : 'A new version is available.',
        errorKind: null,
        errorOperation: null,
        checkedAt: toIsoNow(),
        downloadPercent: null,
        downloadTransferredBytes: null,
        downloadTotalBytes: null,
      });
      if (retainedManagedStage) {
        this.applyState({ status: 'downloaded', message: 'Ready for your next quit.' });
      }
      if (updateInfo.version) this.automatic?.found(updateInfo.version);
    });

    autoUpdater.on('update-not-available', () => {
      this.notificationRecord?.recordNotAvailable();
      this.applyState({
        notification: this.currentNotification(),
        status: 'no-update',
        availableVersion: null,
        releaseNotes: null,
        message: 'You already have the latest version.',
        errorKind: null,
        errorOperation: null,
        checkedAt: toIsoNow(),
        downloadPercent: null,
        downloadTransferredBytes: null,
        downloadTotalBytes: null,
      });
    });

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      this.applyState({
        status: 'downloading',
        message: 'Downloading update...',
        errorKind: null,
        errorOperation: null,
        downloadPercent: Math.max(0, Math.min(100, Number(progress.percent.toFixed(2)))),
        downloadTransferredBytes: progress.transferred,
        downloadTotalBytes: progress.total,
      });
    });

    autoUpdater.on('update-downloaded', (updateInfo: UpdateInfo & { downloadedFile?: string }) => {
      if (this.options.managedSession) {
        if (!updateInfo.downloadedFile || !updateInfo.version) { this.errors.report(new Error('Downloaded artifact identity missing'), 'Cannot verify update.', 'download'); return; }
        this.applyState({ updateStaged: false, status: 'downloading', message: 'Verifying downloaded update...' });
        void this.options.managedSession.stageDownloaded(updateInfo.downloadedFile, updateInfo.version);
        return;
      }
      this.applyState({
        status: 'downloaded',
        // Sticky for this process: the staged update installs on quit even if a
        // later check moves the status on.
        updateStaged: true,
        availableVersion: updateInfo.version || this.state.availableVersion,
        message: UPDATE_DOWNLOADED_MESSAGE,
        errorKind: null,
        errorOperation: null,
        downloadPercent: 100,
      });
      this.automatic?.downloaded(this.state.availableVersion);
    });

    autoUpdater.on('error', (error: Error) => {
      if (this.automatic?.claimError(error)) return;
      const operation = this.activeOperation;
      this.errors.report(error, 'Auto-update failed.', operation ?? 'updater-event');
      // Only the operation under way decides which automatic step failed (a native install refusal arrives here).
      if (operation === 'download') this.automatic?.downloadFailed(this.state.message);
      else if (operation === 'install') this.automatic?.installFailed();
    });
  }

  private managedEvent(event: ManagedUpdateEvent): void {
    if (event.type === 'restart-unavailable' || event.type === 'restart-write-failed') {
      const message = 'Manual restart is unavailable. Quit AutoByteus and reopen it from the installed application menu.';
      if (event.type === 'restart-write-failed') this.applyState({ status: 'error', updateStaged: false, errorKind: 'install', errorOperation: 'install', message });
      this.options.showRestartUnavailable?.(message);
    } else if (event.type === 'invalidated') {
      this.applyState({ updateStaged: false, ...(this.state.status === 'downloaded' ? { status: 'available' } : {}) });
    } else if (event.type === 'verification-cancelled') {
      this.automatic?.downloaded(event.version); // end automatic download bookkeeping; no managed install on readiness
      this.applyState({ status: 'available', updateStaged: false, message: 'Update is available for download.',
        downloadPercent: null, downloadTransferredBytes: null, downloadTotalBytes: null });
    } else if (event.type === 'stage-gone') {
      this.notificationRecord?.clearLostStageAttempt(event.version);
      if (!event.automatic) this.notificationRecord?.recordManualInstallFailure(event.version, 'stage-gone');
      this.applyState({ updateStaged: false, status: 'available', notification: this.currentNotification(),
        message: 'The pending update must be verified again. Download it again or wait for the next automatic check.' });
    } else if (event.type === 'ready') {
      this.applyState({ status: 'downloaded', updateStaged: true, availableVersion: event.version,
        downloadPercent: 100, message: 'Ready for your next quit.' });
      this.automatic?.downloaded(event.version);
    } else if (event.type === 'activating') {
      if (event.automatic) this.notificationRecord?.recordAutomaticInstall(event.version);
      else this.notificationRecord?.recordManualInstall(event.version);
      this.applyState({ status: 'installing', notification: this.currentNotification() });
    } else if (event.type === 'stage-failed') {
      this.automatic?.downloadFailed('The downloaded release could not be verified.');
      this.applyState({ updateStaged: false, notification: this.currentNotification() });
      this.errors.report(event.error, 'The downloaded release could not be verified.', 'download');
    } else {
      if (event.automatic) this.notificationRecord?.recordAutomaticFailure(event.version, 'install', 'The protected update could not be installed.');
      else if (event.confirmedOld) this.notificationRecord?.recordManualInstallFailure(event.version);
      this.applyState({ updateStaged: false, notification: this.currentNotification() });
      this.errors.report(event.error, 'The protected update could not be installed.', 'install');
    }
  }

  private applyState(partial: Partial<AppUpdateState>): void {
    const nextState: AppUpdateState = {
      ...this.state,
      ...partial,
    };

    if (partial.status && partial.status !== 'error') {
      nextState.errorKind = null;
      nextState.errorOperation = null;
      this.errors.reset();
    }

    this.state = nextState;
    this.options.managedSession?.automaticInstallBlockChanged(this.notificationRecord?.automaticInstallBlockedVersion ?? null);
    this.broadcastState();
  }

  private broadcastState(): void {
    const snapshot = this.getState();

    for (const window of BrowserWindow.getAllWindows()) {
      if (window.isDestroyed()) {
        continue;
      }
      window.webContents.send(APP_UPDATE_STATE_CHANNEL, snapshot);
    }
  }
}

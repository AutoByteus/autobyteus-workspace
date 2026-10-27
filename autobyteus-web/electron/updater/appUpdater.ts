import * as path from 'path';
import { app, BrowserWindow, net } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { ProgressInfo, UpdateInfo } from 'electron-updater';
import type {
  AppUpdateChannelChangeResult,
  AppUpdateOperation,
  AppUpdateState,
  AppUpdateStatus,
} from '../../shared/appUpdateTypes';
import { isAppUpdateChannelLocked } from '../../shared/appUpdateTypes';
import { logger } from '../logger';
import { classifyAppUpdateError } from './appUpdateErrorClassifier';
import { isAppUpdateChannel, loadAppUpdateChannel, saveAppUpdateChannel } from './appUpdateChannelStore';
import { AppUpdateNotificationRecord } from './appUpdateNotificationRecord';
import { resolveAppReleasePageUrl } from './appReleasePage';
import { APP_UPDATE_STATE_CHANNEL, type AppUpdateController } from './appUpdateController';
import { AppUpdateCheckSchedule, type AppUpdateCheckSource } from './appUpdateCheckSchedule';
import { registerAppUpdateIpc } from './appUpdateIpc';
import { buildErrorDedupeSignature, isPrereleaseVersion, normalizeReleaseNotes, toIsoNow } from './appUpdateStateFormat';

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
  prepareForInstall?: () => Promise<void>;
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
  private lastErrorSignature: string | null = null;
  private notificationRecord: AppUpdateNotificationRecord | null = null;
  private schedule: AppUpdateCheckSchedule | null = null;
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
    };
  }

  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
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
      notification: this.currentNotification(),
      autoCheck: schedule.settings(),
    };
    this.applyChannelPolicy();

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

    if (this.state.status === 'checking' || this.state.status === 'downloading') {
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
      this.handleError(error, 'Failed to check for updates.', operation);
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

    if (this.state.status === 'downloading') {
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

    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      this.handleError(error, 'Failed to download update.', 'download');
    } finally {
      if (this.activeOperation === 'download') {
        this.activeOperation = null;
      }
    }

    return this.getState();
  }

  installUpdateAndRestart(): { accepted: boolean } {
    if (this.state.status !== 'downloaded') {
      return { accepted: false };
    }

    this.activeOperation = 'install';

    this.applyState({
      status: 'installing',
      message: 'Installing update and restarting...',
      errorKind: null,
      errorOperation: null,
    });

    setTimeout(async () => {
      try {
        await this.options.prepareForInstall?.();
        autoUpdater.quitAndInstall(false, true);
      } catch (error) {
        this.handleError(error, 'Failed to install update and restart.', 'install');
      }
    }, 100);

    return { accepted: true };
  }

  async setUpdateChannel(channel: unknown): Promise<AppUpdateChannelChangeResult> {
    if (!isAppUpdateChannel(channel) || isAppUpdateChannelLocked(this.state)) {
      return { accepted: false, persisted: false, state: this.getState() };
    }

    // A failed save still applies the channel for this session; the caller reports it.
    const persisted = saveAppUpdateChannel(app.getPath('userData'), channel);
    this.applyState({ updateChannel: channel });
    this.applyChannelPolicy();

    // Re-check so an "available" result from the previous channel is replaced.
    if (app.isPackaged && CHANNEL_RECHECK_STATUSES.has(this.state.status)) {
      await this.checkForUpdates('manual');
    }

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

    autoUpdater.on('update-downloaded', (updateInfo: UpdateInfo) => {
      this.applyState({
        status: 'downloaded',
        // Sticky for this process: the staged update installs on quit even if a
        // later check moves the status on.
        updateStaged: true,
        availableVersion: updateInfo.version || this.state.availableVersion,
        message: 'Update downloaded. Restart to install.',
        errorKind: null,
        errorOperation: null,
        downloadPercent: 100,
      });
    });

    autoUpdater.on('error', (error: Error) => {
      this.handleError(error, 'Auto-update failed.', this.activeOperation ?? 'updater-event');
    });
  }

  private handleError(
    error: unknown,
    fallbackMessage: string,
    operation: AppUpdateOperation = 'updater-event',
  ): void {
    const classification = classifyAppUpdateError(error, {
      operation,
      fallbackMessage,
    });

    const signature = buildErrorDedupeSignature(
      classification.kind,
      classification.code,
      classification.diagnostic,
    );
    if (this.lastErrorSignature === signature && this.state.status === 'error') {
      return;
    }
    this.lastErrorSignature = signature;

    logger.error(
      `[updater] ${fallbackMessage} `
      + `(kind=${classification.kind}, operation=${classification.operation}, code=${classification.code ?? 'none'})\n`
      + classification.diagnostic,
      error,
    );

    const failedCheck = Object.values(CHECK_OPERATIONS).includes(classification.operation);
    this.applyState({
      status: 'error',
      message: classification.message,
      errorKind: classification.kind,
      errorOperation: classification.operation,
      ...(failedCheck ? { checkedAt: toIsoNow() } : {}),
    });
  }

  private applyState(partial: Partial<AppUpdateState>): void {
    const nextState: AppUpdateState = {
      ...this.state,
      ...partial,
    };

    if (partial.status && partial.status !== 'error') {
      nextState.errorKind = null;
      nextState.errorOperation = null;
      this.lastErrorSignature = null;
    }

    this.state = nextState;
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

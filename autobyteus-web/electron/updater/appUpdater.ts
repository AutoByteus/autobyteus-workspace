import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { ProgressInfo, UpdateInfo } from 'electron-updater';
import type { AppUpdateOperation, AppUpdateState } from '../../shared/appUpdateTypes';
import { logger } from '../logger';
import { classifyAppUpdateError } from './appUpdateErrorClassifier';

export const APP_UPDATE_STATE_CHANNEL = 'app-update-state';
const IPC_GET_STATE = 'app-update:get-state';
const IPC_CHECK = 'app-update:check';
const IPC_DOWNLOAD = 'app-update:download';
const IPC_INSTALL = 'app-update:install';

function toIsoNow(): string {
  return new Date().toISOString();
}

function normalizeReleaseNotes(releaseNotes: UpdateInfo['releaseNotes']): string | null {
  if (typeof releaseNotes === 'string') {
    return releaseNotes;
  }

  if (Array.isArray(releaseNotes)) {
    const notes = releaseNotes
      .map((item) => (item && typeof item.note === 'string' ? item.note.trim() : ''))
      .filter((item) => item.length > 0);

    return notes.length > 0 ? notes.join('\n\n') : null;
  }

  return null;
}

function buildErrorDedupeSignature(
  kind: string,
  code: string | null,
  diagnostic: string,
): string {
  const diagnosticHeadline = diagnostic
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0)
    ?.trim() ?? 'none';

  return `${kind}:${code ?? 'none'}:${diagnosticHeadline}`;
}

export class AppUpdater {
  private state: AppUpdateState;
  private initialized = false;
  private activeOperation: AppUpdateOperation | null = null;
  private lastErrorSignature: string | null = null;

  constructor(private readonly autoCheckDelayMs: number = 8000) {
    this.state = {
      status: 'idle',
      currentVersion: app.getVersion(),
      availableVersion: null,
      downloadPercent: null,
      downloadTransferredBytes: null,
      downloadTotalBytes: null,
      releaseNotes: null,
      message: 'Update status is idle.',
      errorKind: null,
      errorOperation: null,
      checkedAt: null,
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

    this.registerAutoUpdaterListeners();
    this.registerIpcHandlers();
    this.broadcastState();
  }

  startAutoCheck(): void {
    if (!app.isPackaged) {
      logger.info('Skipping startup auto-update check in unpackaged/dev runtime.');
      return;
    }

    setTimeout(() => {
      this.checkForUpdates('startup').catch((error) => {
        this.handleError(error, 'Failed to check for updates at startup.', 'startup-check');
      });
    }, this.autoCheckDelayMs);
  }

  getState(): AppUpdateState {
    return { ...this.state };
  }

  async checkForUpdates(source: 'manual' | 'startup' = 'manual'): Promise<AppUpdateState> {
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

    const operation: AppUpdateOperation = source === 'startup' ? 'startup-check' : 'manual-check';
    this.activeOperation = operation;

    this.applyState({
      status: 'checking',
      message: 'Checking for updates...',
      errorKind: null,
      errorOperation: null,
      checkedAt: toIsoNow(),
      downloadPercent: null,
      downloadTransferredBytes: null,
      downloadTotalBytes: null,
    });

    try {
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

    setTimeout(() => {
      try {
        autoUpdater.quitAndInstall(false, true);
      } catch (error) {
        this.handleError(error, 'Failed to install update and restart.', 'install');
      }
    }, 100);

    return { accepted: true };
  }

  private registerAutoUpdaterListeners(): void {
    autoUpdater.on('checking-for-update', () => {
      this.applyState({
        status: 'checking',
        message: 'Checking for updates...',
        errorKind: null,
        errorOperation: null,
        checkedAt: toIsoNow(),
      });
    });

    autoUpdater.on('update-available', (updateInfo: UpdateInfo) => {
      this.applyState({
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
      this.applyState({
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
        availableVersion: updateInfo.version || this.state.availableVersion,
        message: 'Update downloaded. Restart to install.',
        errorKind: null,
        errorOperation: null,
        downloadPercent: 100,
        checkedAt: toIsoNow(),
      });
    });

    autoUpdater.on('error', (error: Error) => {
      this.handleError(error, 'Auto-update failed.', this.activeOperation ?? 'updater-event');
    });
  }

  private registerIpcHandlers(): void {
    ipcMain.removeHandler(IPC_GET_STATE);
    ipcMain.removeHandler(IPC_CHECK);
    ipcMain.removeHandler(IPC_DOWNLOAD);
    ipcMain.removeHandler(IPC_INSTALL);

    ipcMain.handle(IPC_GET_STATE, async () => this.getState());
    ipcMain.handle(IPC_CHECK, async () => await this.checkForUpdates('manual'));
    ipcMain.handle(IPC_DOWNLOAD, async () => await this.downloadUpdate());
    ipcMain.handle(IPC_INSTALL, async () => this.installUpdateAndRestart());
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

    this.applyState({
      status: 'error',
      message: classification.message,
      errorKind: classification.kind,
      errorOperation: classification.operation,
      checkedAt: toIsoNow(),
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

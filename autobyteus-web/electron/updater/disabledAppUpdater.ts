import { app, ipcMain } from 'electron'
import type { AppUpdateChannelChangeResult, AppUpdateState } from '../../shared/appUpdateTypes'
import {
  APP_UPDATE_IPC_CHECK,
  APP_UPDATE_IPC_COMMAND_CHANNELS,
  APP_UPDATE_IPC_DOWNLOAD,
  APP_UPDATE_IPC_GET_STATE,
  APP_UPDATE_IPC_INSTALL,
  APP_UPDATE_IPC_SET_CHANNEL,
  type AppUpdateController,
} from './appUpdateController'

/**
 * Update controller for launches that never check for updates (isolated `e2e` instances).
 * It answers every update request with the fixed `disabled` state and refuses every action,
 * so the renderer stays quiet instead of reporting a missing updater as an error.
 */
export class DisabledAppUpdater implements AppUpdateController {
  private initialized = false

  initialize(): void {
    if (this.initialized) {
      return
    }
    this.initialized = true

    for (const channel of APP_UPDATE_IPC_COMMAND_CHANNELS) {
      ipcMain.removeHandler(channel)
    }
    ipcMain.handle(APP_UPDATE_IPC_GET_STATE, async () => this.getState())
    ipcMain.handle(APP_UPDATE_IPC_CHECK, async () => this.getState())
    ipcMain.handle(APP_UPDATE_IPC_DOWNLOAD, async () => this.getState())
    ipcMain.handle(APP_UPDATE_IPC_INSTALL, async () => ({ accepted: false }))
    ipcMain.handle(
      APP_UPDATE_IPC_SET_CHANNEL,
      async (): Promise<AppUpdateChannelChangeResult> => ({
        accepted: false,
        persisted: false,
        state: this.getState(),
      }),
    )
  }

  startAutoCheck(): void {
    // Updates are disabled for this launch; there is nothing to schedule.
  }

  getState(): AppUpdateState {
    const currentVersion = app.getVersion()
    return {
      status: 'disabled',
      currentVersion,
      currentVersionIsPrerelease: /^\d+\.\d+\.\d+-/.test(currentVersion),
      updateChannel: 'stable',
      updateStaged: false,
      availableVersion: null,
      downloadPercent: null,
      downloadTransferredBytes: null,
      downloadTotalBytes: null,
      releaseNotes: null,
      message: 'Updates are disabled for this app instance.',
      errorKind: null,
      errorOperation: null,
      checkedAt: null,
    }
  }
}

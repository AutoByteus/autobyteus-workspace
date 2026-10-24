import { ipcMain } from 'electron';
import type { AppUpdateChannelChangeResult, AppUpdateState } from '../../shared/appUpdateTypes';
import type { AppUpdateCheckSchedule } from './appUpdateCheckSchedule';
import {
  APP_UPDATE_IPC_CHECK,
  APP_UPDATE_IPC_CLEAR_NOTIFICATION,
  APP_UPDATE_IPC_COMMAND_CHANNELS,
  APP_UPDATE_IPC_DOWNLOAD,
  APP_UPDATE_IPC_GET_STATE,
  APP_UPDATE_IPC_INSTALL,
  APP_UPDATE_IPC_MARK_NOTIFICATION_READ,
  APP_UPDATE_IPC_SET_AUTO_CHECK,
  APP_UPDATE_IPC_SET_CHANNEL,
} from './appUpdateController';

/** The updater operations the renderer's update commands reach. */
export type AppUpdateIpcUpdater = {
  getState(): AppUpdateState;
  checkForUpdates(source: 'manual'): Promise<AppUpdateState>;
  downloadUpdate(): Promise<AppUpdateState>;
  installUpdateAndRestart(): { accepted: boolean };
  setUpdateChannel(channel: unknown): Promise<AppUpdateChannelChangeResult>;
  markNotificationRead(): AppUpdateState;
  clearNotification(): AppUpdateState;
};

/**
 * Registers the `app-update:*` command handlers (replacing earlier ones). The automatic-check
 * settings go to their owner, the schedule; the answer is the updater's state, which the
 * schedule's change notification has already updated.
 */
export function registerAppUpdateIpc(updater: AppUpdateIpcUpdater, schedule: Pick<AppUpdateCheckSchedule, 'setSettings'>): void {
  for (const channel of APP_UPDATE_IPC_COMMAND_CHANNELS) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle(APP_UPDATE_IPC_GET_STATE, async () => updater.getState());
  ipcMain.handle(APP_UPDATE_IPC_CHECK, async () => await updater.checkForUpdates('manual'));
  ipcMain.handle(APP_UPDATE_IPC_DOWNLOAD, async () => await updater.downloadUpdate());
  ipcMain.handle(APP_UPDATE_IPC_INSTALL, async () => updater.installUpdateAndRestart());
  ipcMain.handle(APP_UPDATE_IPC_SET_CHANNEL, async (_event, channel: unknown) => await updater.setUpdateChannel(channel));
  ipcMain.handle(APP_UPDATE_IPC_MARK_NOTIFICATION_READ, async () => updater.markNotificationRead());
  ipcMain.handle(APP_UPDATE_IPC_CLEAR_NOTIFICATION, async () => updater.clearNotification());
  ipcMain.handle(APP_UPDATE_IPC_SET_AUTO_CHECK, async (_event, settings: unknown) => {
    schedule.setSettings(settings);
    return updater.getState();
  });
}

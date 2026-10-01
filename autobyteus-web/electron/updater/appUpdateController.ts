/**
 * Main-process owner of the `app-update:*` IPC contract for one launch.
 *
 * Every launch registers exactly one controller, so the renderer always gets an answer:
 * `AppUpdater` drives electron-updater; `DisabledAppUpdater` reports `status: 'disabled'`
 * for launches that must never check for updates (isolated instances).
 */
export interface AppUpdateController {
  /** Register the update IPC handlers and publish the initial state. */
  initialize(): void
  /** Schedule the startup update check, when this controller performs checks at all. */
  startAutoCheck(): void
}

export const APP_UPDATE_STATE_CHANNEL = 'app-update-state'
export const APP_UPDATE_IPC_GET_STATE = 'app-update:get-state'
export const APP_UPDATE_IPC_CHECK = 'app-update:check'
export const APP_UPDATE_IPC_DOWNLOAD = 'app-update:download'
export const APP_UPDATE_IPC_INSTALL = 'app-update:install'
export const APP_UPDATE_IPC_SET_CHANNEL = 'app-update:set-channel'

export const APP_UPDATE_IPC_COMMAND_CHANNELS: readonly string[] = Object.freeze([
  APP_UPDATE_IPC_GET_STATE,
  APP_UPDATE_IPC_CHECK,
  APP_UPDATE_IPC_DOWNLOAD,
  APP_UPDATE_IPC_INSTALL,
  APP_UPDATE_IPC_SET_CHANNEL,
])

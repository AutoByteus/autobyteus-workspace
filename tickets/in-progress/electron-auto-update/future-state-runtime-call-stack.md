# Future-State Runtime Call Stack

## Scope Reference

- Requirements: `tickets/in-progress/electron-auto-update/requirements.md`
- Design: `tickets/in-progress/electron-auto-update/proposed-design.md`

## UC-001 Startup Auto-Check

1. `[ENTRY]` Electron main bootstrap (`electron/main.ts:bootstrap`)
2. instantiate updater manager (`electron/updater/appUpdater.ts`)
3. updater manager registers IPC handlers and updater event listeners
4. updater manager checks runtime mode:
- dev/unpackaged -> skip auto-check, keep `idle` state
- packaged -> continue
5. updater manager seeds state: `idle -> checking`
6. updater manager calls `autoUpdater.checkForUpdates()`
7. `autoUpdater` emits one of:
- `update-available` -> state `available`
- `update-not-available` -> state `no-update`
- `error` -> state `error`
8. updater manager broadcasts `app-update-state` to all renderer windows
9. renderer store receives latest state through preload listener
10. update notice component re-renders according to state

## UC-002 Update Available Notification

1. `[ENTRY]` main receives `update-available` event
2. normalize event payload to `AppUpdateState` (`availableVersion`, `releaseNotes`, message)
3. broadcast `app-update-state`
4. preload forwards event to renderer callback (`onAppUpdateState`)
5. `appUpdateStore` updates reactive state
6. `AppUpdateNotice.vue` shows bottom-right card with:
- latest version
- `Download` button
- `Later`/dismiss action

## UC-003 Download Update

1. `[ENTRY]` user clicks `Download` in renderer
2. `AppUpdateNotice` -> `appUpdateStore.downloadUpdate()`
3. store calls `window.electronAPI.downloadAppUpdate()`
4. main IPC handler validates state guard (`available`/`no-update` retry)
5. updater manager calls `autoUpdater.downloadUpdate()`
6. updater emits `download-progress` events repeatedly
7. updater manager maps percent/bytes -> state `downloading`
8. broadcast `app-update-state` on each progress update
9. renderer updates progress bar and text
10. updater emits `update-downloaded` -> state `downloaded`
11. renderer swaps CTA to `Install & Restart`

## UC-004 Install & Restart

1. `[ENTRY]` user clicks `Install & Restart`
2. store calls `window.electronAPI.installAppUpdateAndRestart()`
3. main IPC handler validates `downloaded` state
4. updater manager marks transitional message (`Installing update...`)
5. updater manager calls `autoUpdater.quitAndInstall(false, true)`
6. app quits and restarts into updated version

## UC-005 Error + Retry

1. `[ENTRY]` updater throws/check fails/download fails
2. updater manager catches error and sets state `error` with message
3. manager broadcasts `app-update-state`
4. renderer card shows error text + retry CTA
5. user clicks retry action:
- check retry -> `checkForAppUpdates()`
- download retry -> `downloadAppUpdate()`
6. flow re-enters UC-001 or UC-003

## UC-006 Build/Release Metadata Compatibility

1. `[ENTRY]` packaging command `pnpm build:electron:*`
2. `build/scripts/build.ts` resolves GitHub repository metadata (explicit env > CI context > git remote)
3. electron-builder generates platform update metadata (`latest-*.yml`) and artifacts
4. release workflow uploads metadata + binary + blockmap artifacts (including mac zip family)
5. installed app updater resolves GitHub Releases feed + downloads referenced artifacts

## UC-007 Settings About Version Visibility

1. `[ENTRY]` user opens `/settings` and selects `About`
2. `pages/settings.vue` sets `activeSection = 'about'`
3. `AboutSettingsManager.vue` mounts
4. component reads `useAppUpdateStore` reactive state
5. version label resolves from `appUpdateStore.currentVersion`
6. status text resolves from current updater state/message
7. UI renders one canonical about card with version + update status

## UC-008 Settings About Manual Check

1. `[ENTRY]` user clicks `Check for Updates` in `AboutSettingsManager`
2. component calls `appUpdateStore.checkForUpdates()`
3. store invokes `window.electronAPI.checkForAppUpdates()`
4. main updater handler updates state (`checking` -> `available|no-update|error`)
5. store receives updated state via direct invoke response and broadcast event
6. About panel status/message refreshes in place
7. if status is `available` or `downloaded`, About panel exposes contextual next CTA:
  - `Download Update` for `available`
  - `Install & Restart` for `downloaded`

## Data/Contract Summary

- Main -> Renderer event:
  - channel: `app-update-state`
  - payload: `AppUpdateState`
- Renderer -> Main commands:
  - `app-update:get-state`
  - `app-update:check`
  - `app-update:download`
  - `app-update:install`

## Failure Boundaries

- Provider misconfiguration -> main `error` state (no crash)
- Missing release artifacts -> download/install failure surfaced in UI
- Repeated CTA clicks during active operation -> guarded/no-op state response

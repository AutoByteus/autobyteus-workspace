# Proposed Design

## Scope

Implement first-class Electron auto-update support with explicit user-controlled download/install UX and release artifact compatibility.

## Architecture Direction

Decision: **Add a dedicated updater boundary** in Electron main process and expose a typed renderer contract through preload.

Rationale:
- Keeps updater state-machine logic out of `main.ts` lifecycle noise.
- Provides one normalized event stream for all renderer windows.
- Minimizes regression risk to existing server/node-window concerns.

## Target Architecture

### Main Process

- New module: `electron/updater/appUpdater.ts`
- Responsibilities:
  - Initialize `electron-updater` configuration.
  - Maintain normalized in-memory `AppUpdateState`.
  - Subscribe to updater lifecycle events.
  - Broadcast `app-update-state` to all windows.
  - Register IPC handlers for check/download/install/get-state.

### Preload Boundary

- Extend `window.electronAPI` with:
  - `getAppUpdateState()`
  - `checkForAppUpdates()`
  - `downloadAppUpdate()`
  - `installAppUpdateAndRestart()`
  - `onAppUpdateState(callback)`

### Renderer

- New store: `stores/appUpdateStore.ts`
- New global component: `components/app/AppUpdateNotice.vue`
- App shell integration: mount `AppUpdateNotice` once in `app.vue`.
- Behavior:
  - Auto-initialize in client plugin.
  - Render persistent bottom-right update card in Electron runtime only.
  - Drive CTA transitions from updater state (`available` -> `downloading` -> `downloaded`).

### Build / Release

- `build/scripts/build.ts`:
  - Add updater publish metadata in electron-builder config (GitHub Releases only).
  - Keep `publish: 'never'` for build command behavior (CI upload remains explicit).
- `.github/workflows/release-desktop.yml`:
  - Ensure macOS upload includes zip artifacts and blockmaps in addition to dmg + metadata.

### Provider Resolution and Runtime Guardrails

- Provider resolution precedence (GitHub-only):
  1. explicit repository env (`AUTOBYTEUS_UPDATER_REPOSITORY`),
  2. CI repository context (`GITHUB_REPOSITORY`),
  3. git remote inference.
- Runtime guard:
  - Skip automatic update checks in dev/unpackaged mode.
  - Keep manual IPC check callable for test simulations.

## Updater State Model

Canonical state payload (`AppUpdateState`):

- `status`: `idle | checking | available | downloading | downloaded | no-update | error`
- `currentVersion`: string
- `availableVersion`: string | null
- `downloadPercent`: number | null
- `downloadTransferredBytes`: number | null
- `downloadTotalBytes`: number | null
- `releaseNotes`: string | null
- `message`: string
- `error`: string | null
- `checkedAt`: ISO string | null

## UX Design

Placement: fixed bottom-right card (persistent while relevant), separate from transient toasts.

States:
- `checking`: subtle progress indicator, non-blocking text.
- `available`: shows latest version + `Download` button.
- `downloading`: progress bar + percent; disable conflicting actions.
- `downloaded`: success visual + `Install & Restart` button.
- `error`: actionable retry CTA (`Check Again` or `Download Again`).

Secondary feedback:
- Use toasts for non-persistent confirmations/errors, while card remains source-of-truth.

## IPC Contract

Main handlers:
- `app-update:get-state` -> `AppUpdateState`
- `app-update:check` -> `AppUpdateState`
- `app-update:download` -> `AppUpdateState`
- `app-update:install` -> `{ accepted: boolean }`

Main events:
- `app-update-state` (payload `AppUpdateState`)

## Failure Handling Strategy

- Prevent duplicate operations via status-based guards.
- Never throw uncaught updater errors to process root; convert to state + log.
- If provider metadata missing/misconfigured, expose clear error state in UI.

## Security / Boundary Rules

- Renderer cannot call raw updater APIs directly.
- All updater operations remain behind preload + IPC.
- External link/button actions remain restricted to known updater operations.

## Test Strategy

- Electron unit tests:
  - Updater manager state transitions and guard behavior.
  - Preload bridge update API exposure.
- Nuxt/store/component tests:
  - `appUpdateStore` initializes, subscribes, and maps actions.
  - `AppUpdateNotice` renders state-driven CTA variants.

## File-Level Change Plan (Proposed)

- Add: `autobyteus-web/electron/updater/appUpdater.ts`
- Modify: `autobyteus-web/electron/main.ts`
- Modify: `autobyteus-web/electron/preload.ts`
- Modify: `autobyteus-web/electron/types.d.ts`
- Modify: `autobyteus-web/types/electron.d.ts`
- Add: `autobyteus-web/stores/appUpdateStore.ts`
- Add: `autobyteus-web/components/app/AppUpdateNotice.vue`
- Modify: `autobyteus-web/app.vue`
- Add: `autobyteus-web/plugins/15.appUpdater.client.ts`
- Modify: `autobyteus-web/build/scripts/build.ts`
- Modify: `.github/workflows/release-desktop.yml`
- Add tests:
  - `autobyteus-web/electron/updater/__tests__/appUpdater.spec.ts`
  - `autobyteus-web/stores/__tests__/appUpdateStore.spec.ts`
  - `autobyteus-web/components/app/__tests__/AppUpdateNotice.spec.ts`

## Alternatives Considered

1. Keep updater logic inline in `electron/main.ts`.
- Rejected: would mix concerns and grow fragile lifecycle coupling.

2. Use transient toast-only UX (no persistent card).
- Rejected: weak discoverability for download/install sequence.

3. Auto-download immediately when update is available.
- Rejected for this requirement: user explicitly asked for click-driven update action.

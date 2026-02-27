# Investigation Notes

## Sources Consulted

### Local Files

- `autobyteus-web/package.json`
- `autobyteus-web/electron/main.ts`
- `autobyteus-web/electron/preload.ts`
- `autobyteus-web/electron/types.d.ts`
- `autobyteus-web/types/electron.d.ts`
- `autobyteus-web/app.vue`
- `autobyteus-web/composables/useToasts.ts`
- `autobyteus-web/build/scripts/build.ts`
- `.github/workflows/release-desktop.yml`
- `autobyteus-web/docs/electron_packaging.md`

### Web References (Primary Docs)

- https://www.electron.build/auto-update.html
- https://www.electron.build/electron-builder.Interface.MacConfiguration.html
- https://www.electron.build/publish.html

## Current-System Findings

1. Electron app structure is already production-ready:
- main process entry: `autobyteus-web/electron/main.ts`
- preload bridge: `autobyteus-web/electron/preload.ts`
- renderer shell: `autobyteus-web/app.vue`

2. Auto-update is not currently implemented:
- no `electron-updater` dependency in `autobyteus-web/package.json`
- no updater lifecycle hooks/events/IPC in `main.ts`
- no renderer update state/UI/action controls

3. Existing renderer UX infrastructure is suitable for update notifications:
- global toast system exists (`useToasts`, `ToastContainer`)
- app shell (`app.vue`) can host a persistent update card/banner component

4. Build pipeline uses `electron-builder` but publish provider is not configured in build options:
- `build/scripts/build.ts` defines targets and artifact naming
- top-level `publish` provider configuration is missing from `options`
- build invocation uses `publish: 'never'`, which is fine for "manual upload in CI" but still requires proper publish metadata config for runtime updater feed

5. Release pipeline already uploads update metadata files:
- `.github/workflows/release-desktop.yml` uploads:
  - Linux: `*.AppImage`, `*.AppImage.blockmap`, `latest-linux.yml`
  - macOS: `*.dmg`, `*.dmg.blockmap`, `latest-mac.yml`

6. macOS artifact risk discovered:
- Official docs indicate Squirrel.Mac auto-update requires `zip` target enabled alongside `dmg`.
- Current build config explicitly targets only `dmg` for macOS.
- Current release upload does not include `*.zip` artifacts.
- Implication: macOS auto-update can fail even if `latest-mac.yml` exists.

7. Runtime platform implications:
- Linux AppImage updates work only for installed/running AppImage contexts (not raw dev runtime).
- macOS auto-update requires signed app for real production update flow.

## Constraints and Unknowns

- Update provider strategy is not explicit (GitHub Releases vs generic server URL).
- Current package `repository.url` is stale/non-project; should not be trusted for updater provider inference.
- CI already publishes release assets to GitHub Releases for tag builds; this is the easiest provider path to adopt.

## Triage Decision

- Scope classification: `Medium`
- Rationale:
  - Cross-layer updates: main process + preload/types + renderer state/UI + build/release pipeline + tests.
  - No deep architecture rewrite or backend schema changes.

## Design Implications

- Implement a dedicated updater manager in Electron main process to isolate updater state machine and IPC boundaries.
- Add preload bridge APIs and typed renderer contracts for update lifecycle/actions.
- Add a persistent in-app bottom notification card for UX, plus optional toasts for transitions/errors.
- Configure `electron-builder` publish metadata to target GitHub Releases by default (env-overridable), while keeping artifact upload in CI.
- Update mac build/release targets to include zip artifacts needed for updater compatibility.

## Open Questions (Tracked; no blocker for implementation)

1. Should UI expose a manual “Check for updates” action in addition to startup auto-check? (Implementation will include this, low risk.)
2. Should download start immediately on update available or only after explicit user click? (Implementation will use explicit user click for clear consent/control.)

## Reopen Investigation Addendum (2026-02-27)

### Additional Sources Consulted

- `autobyteus-web/pages/settings.vue`
- `autobyteus-web/pages/__tests__/settings.spec.ts`
- `autobyteus-web/stores/appUpdateStore.ts`
- `autobyteus-web/plugins/15.appUpdater.client.ts`

### Findings

1. Settings page already uses a single-section navigation model (`activeSection`) with one canonical render area.
   - This supports adding one `about` section without duplicating update controls elsewhere.

2. App update state and actions are already centralized in `useAppUpdateStore`.
   - Manual trigger already exists (`checkForUpdates`).
   - Current app version is already stored (`currentVersion`).
   - This avoids creating new updater APIs.

3. No existing About section is present.
   - Users currently cannot discover app version or manually check for updates from a stable settings location.

4. Startup plugin (`15.appUpdater.client.ts`) already initializes updater store once on client.
   - Settings/About can consume existing state directly with no extra initialization path.

### Implications For Reopened Scope

- Reopened scope remains `Medium` because it touches settings navigation, a new settings component, tests, and workflow docs, while reusing existing updater runtime contracts.
- Best UX path is one canonical `Settings > About` destination with:
  - current version display,
  - manual `Check for Updates`,
  - existing updater status/actions surfaced in-place.

## Reopen Investigation Addendum (2026-02-27, Updates UX Polish)

### Additional Sources Consulted

- `autobyteus-web/pages/settings.vue`
- `autobyteus-web/components/settings/AboutSettingsManager.vue`
- `autobyteus-web/stores/appUpdateStore.ts`
- `autobyteus-web/components/app/AppUpdateNotice.vue`

### Findings

1. The settings navigation currently places `About` before `Server Settings`.
   - User requirement is to keep update controls discoverable but cleaner by placing the update entry last.

2. Naming `About` is semantically broad; this screen's actual purpose is update/version management.
   - Renaming to `Updates` better aligns user intent with destination.

3. `no-update` state currently sets `visible = false` immediately in `appUpdateStore`.
   - This causes the global update notice to disappear too quickly after manual checks.

4. Existing architecture can satisfy this without new IPC/electron changes.
   - Required changes are renderer-only: settings navigation/panel labeling plus a small store timing adjustment.

### Triage

- Scope classification remains `Medium` for ticket continuity.
- Change-risk is localized to settings UI + updater store state timing + tests.

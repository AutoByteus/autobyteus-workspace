# Proposed-Design-Based Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the proposed design.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags used: `[ENTRY]`, `[ASYNC]`, `[STATE]`, `[IO]`, `[FALLBACK]`, `[ERROR]`
- No legacy/backward-compat branches are modeled.

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v5`
- Source Artifact: `tickets/desktop-auto-update-workflow/proposed-design.md`
- Source Design Version: `v5`
- Referenced Sections:
  - `Requirements And Use Cases`
  - `Change Inventory`
  - `Use-Case Coverage Matrix`

## Future-State Modeling Rule (Mandatory)

- These flows model target-state updater behavior, not current-state behavior.

## Use Case Index

- UC-001: Startup auto-check and update-available prompt
- UC-002: User download decision and restart/install decision
- UC-003: Release publishing with updater metadata artifacts
- UC-004: Manual renderer-triggered update check
- UC-005: macOS signing enforcement in release workflow

---

## Use Case: UC-001 Startup Auto-Check And Update-Available Prompt

### Goal

Detect a newer version on startup and ask the user whether to download it.

### Preconditions

- App is packaged.
- Release repository has valid `latest*.yml` metadata for current platform.
- Packaged app contains valid `app-update.yml` generated from builder publish config.

### Expected Outcome

- User sees update prompt when newer version exists.

### Primary Runtime Call Stack

```text
[ENTRY] electron/main.ts:bootstrap()
├── electron/main.ts:installIpcHandlers()
├── electron/main.ts:installAppLifecycleHandlers()
├── [ASYNC] electron/main.ts:app.whenReady()
├── electron/main.ts:installProtocols()
└── electron/main.ts:createAppUpdaterController()
    ├── electron/appUpdater.ts:shouldEnableUpdater() [STATE]
    ├── electron/appUpdater.ts:configureFeed(...) [STATE]
    ├── electron/appUpdater.ts:setTimeout(startupCheck)
    └── [ASYNC] electron/appUpdater.ts:checkNow("startup")
        ├── [ASYNC] electron-updater:autoUpdater.checkForUpdates() [IO]
        └── electron/appUpdater.ts:onUpdateAvailable(info)
            └── [ASYNC] electron/appUpdater.ts:promptToDownload(info)
                └── [ASYNC] electron:dialog.showMessageBox(...) [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] no update available
[ASYNC] electron-updater:autoUpdater.checkForUpdates() [IO]
└── electron/appUpdater.ts:onUpdateNotAvailable(info)
```

```text
[ERROR] update check failed (network/feed/auth)
[ASYNC] electron-updater:autoUpdater.checkForUpdates() [IO]
└── electron/appUpdater.ts:onError(error)
```

### State And Data Transformations

- Updater config env -> provider config object (`github` or `generic`).
- Current app version + remote metadata -> update availability event.

### Observability And Debug Points

- Logs at updater init, check start, update-available/update-not-available/error.

### Design Smells / Gaps

- Legacy branch present: `No`

### Open Questions

- Final interval for periodic checks.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-002 User Download Decision And Restart/Install Decision

### Goal

Let the user control when to download/install and restart safely.

### Preconditions

- UC-001 discovered update and user accepted download.

### Expected Outcome

- Update package downloads, user is prompted to restart/install.

### Primary Runtime Call Stack

```text
[ENTRY] electron/appUpdater.ts:promptToDownload(updateInfo)
└── [ASYNC] electron:dialog.showMessageBox(...) [IO]
    └── response == "Download and Install"
        ├── [STATE] electron/appUpdater.ts:downloadInFlight = true
        ├── [ASYNC] electron-updater:autoUpdater.downloadUpdate() [IO]
        └── electron/appUpdater.ts:onUpdateDownloaded(updateInfo)
            └── [ASYNC] electron/appUpdater.ts:promptToRestartAndInstall(version)
                └── [ASYNC] electron:dialog.showMessageBox(...) [IO]
                    └── response == "Restart and Install"
                        └── [ASYNC] electron-updater:autoUpdater.quitAndInstall() [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] user chooses Later on download prompt
electron/appUpdater.ts:promptToDownload(updateInfo)
└── [STATE] electron/appUpdater.ts:deferredVersion = updateInfo.version
    └── [STATE] suppress repeat prompt for same version in this app session
```

```text
[FALLBACK] user chooses Later on restart prompt
electron/appUpdater.ts:promptToRestartAndInstall(version)
└── app keeps running with downloaded update pending
```

```text
[ERROR] download fails
[ASYNC] electron-updater:autoUpdater.downloadUpdate() [IO]
└── electron/appUpdater.ts:showDownloadErrorDialog(error)
```

### State And Data Transformations

- User button selection -> updater control action.
- Downloaded artifact state -> install-ready UI state.

### Observability And Debug Points

- Logs for decision branches (`download now/later`, `restart now/later`, download errors).

### Design Smells / Gaps

- Legacy branch present: `No`

### Open Questions

- Should deferred update prompt reappear after fixed cooldown in same session?

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-003 Release Publishing With Updater Metadata

### Goal

Ensure releases contain all files needed for in-app updater resolution.

### Preconditions

- Build jobs produce platform artifacts and metadata in `electron-dist`.

### Expected Outcome

- GitHub release includes binaries + metadata files (`latest*.yml`, `*.blockmap`).

### Primary Runtime Call Stack

```text
[ENTRY] .github/workflows/desktop-tag-build.yml:build-and-publish-macos-arm64
├── [ASYNC] autobyteus-web:pnpm build:electron:mac [IO]
├── .github/workflows/desktop-tag-build.yml:collect release files from electron-dist
│   ├── glob:*.dmg
│   ├── glob:*.zip
│   ├── glob:*.blockmap
│   └── glob:latest-mac.yml
└── [ASYNC] gh release upload <tag> <files...> [IO]

[ENTRY] .github/workflows/desktop-tag-build.yml:build-and-publish-linux-x64
├── [ASYNC] autobyteus-web:pnpm build:electron:linux [IO]
├── .github/workflows/desktop-tag-build.yml:collect release files from electron-dist
│   ├── glob:*.AppImage/*.appimage
│   ├── glob:*.blockmap (if emitted)
│   └── glob:latest-linux*.yml
└── [ASYNC] gh release upload <tag> <files...> [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] release already exists
workflow:gh release view <tag>
└── workflow:gh release upload --clobber
```

```text
[ERROR] no files matched upload patterns
workflow:file glob step
└── workflow:exit 1
```

```text
[ERROR] metadata file missing while binary exists
workflow:metadata validation step
└── workflow:exit 1  # prevents broken release from being published
```

### State And Data Transformations

- Build outputs -> release asset set.
- Release asset set -> updater-resolvable metadata for runtime clients.

### Observability And Debug Points

- Workflow summary and artifact listing steps.

### Design Smells / Gaps

- Legacy branch present: `No`

### Open Questions

- Do we publish windows metadata in same release flow immediately?

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-004 Manual Renderer-Triggered Update Check

### Goal

Support a settings action to trigger update check on demand.

### Preconditions

- Renderer is running with preload bridge loaded.

### Expected Outcome

- Main process executes same `checkNow()` flow used by scheduled checks.

### Primary Runtime Call Stack

```text
[ENTRY] renderer/settings:update button click
└── electron/preload.ts:checkAppUpdate()
    └── [ASYNC] electron/main.ts:ipcMain.handle("check-app-update")
        └── [ASYNC] electron/appUpdater.ts:checkNow("renderer-request")
            └── [ASYNC] electron-updater:autoUpdater.checkForUpdates() [IO]
```

### Branching / Fallback Paths

```text
[ERROR] updater disabled (dev or flag)
electron/main.ts:check-app-update handler
└── return { success: false, reason: "updater-disabled" }
```

### State And Data Transformations

- Renderer action -> IPC request -> updater check trigger.

### Observability And Debug Points

- Logs for manual trigger reason.

### Design Smells / Gaps

- Legacy branch present: `No`

### Open Questions

- UI location and wording for manual check status feedback.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

---

## Use Case: UC-005 macOS Signing Enforcement In Release Workflow

### Goal

Fail macOS release job when signing prerequisites are not available.

### Preconditions

- macOS build job is running in CI.

### Expected Outcome

- Unsigned macOS artifacts are never published as release updates.

### Primary Runtime Call Stack

```text
[ENTRY] .github/workflows/desktop-tag-build.yml:build-and-publish-macos-arm64
├── workflow:validate required mac signing env/secrets
├── [ASYNC] autobyteus-web:pnpm build:electron:mac [IO]
├── workflow:verify signed app artifact state
└── [ASYNC] gh release upload <tag> <mac assets...> [IO]
```

### Branching / Fallback Paths

```text
[ERROR] missing signing prerequisites
workflow:signing validation step
└── workflow:exit 1
```

```text
[ERROR] build produced unsigned app
workflow:post-build signing verification step
└── workflow:exit 1
```

### State And Data Transformations

- CI env/secrets -> signing capability gate.
- Signed artifact verification -> release eligibility.

### Observability And Debug Points

- Explicit workflow logs for signing pre-check and post-build verification.

### Design Smells / Gaps

- Legacy branch present: `No`

### Open Questions

- Should notarization enforcement be part of the same gate or kept optional?

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

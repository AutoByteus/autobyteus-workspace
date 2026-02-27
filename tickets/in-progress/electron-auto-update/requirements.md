# Requirements

## Status

- Current Status: `Refined`
- Previous Status: `Design-ready`

## Goal / Problem Statement

Users should receive desktop app updates inside the Electron app without manually visiting a website and reinstalling. The app must detect newer releases, clearly inform the user in-app, and let the user download and install updates with a low-friction, trustworthy UX.
Users should also have one canonical, non-duplicated place to view app version and manually trigger update checks when startup auto-check is missed or uncertain.

## Scope Classification

- Classification: `Medium`
- Rationale:
  - Cross-layer implementation touching Electron main, preload bridge, renderer UI/state, and release/build metadata.
  - No backend schema or storage redesign.

## In-Scope Use Cases

- `UC-001`: On startup, packaged app performs update check in background.
- `UC-002`: When update is available, user sees a clear persistent notification in-app with version information.
- `UC-003`: User clicks `Download` and sees progress/status updates.
- `UC-004`: After download, user clicks `Install & Restart` and updater triggers app replacement flow.
- `UC-005`: Errors and no-update states are clearly communicated without app crash or dead-end.
- `UC-006`: Release pipeline artifacts are compatible with updater feed metadata for supported platforms.
- `UC-007`: User opens `Settings > About` and sees current app version + update state.
- `UC-008`: User manually clicks `Check for Updates` from `Settings > About`.

## Out Of Scope / Non-Goals

- Implementing a custom update server backend.
- Supporting hot-patching of server/frontend without shipping a full desktop app release.
- Maintaining manual website-download as the primary upgrade path.

## Constraints / Dependencies

- Must integrate with existing Electron architecture in `autobyteus-web/electron/*`.
- Must preserve sandboxed renderer pattern (`contextBridge` + IPC).
- Must align with existing GitHub Release artifact publishing workflow.
- Must avoid code edits until workflow gate unlock (Stage 5).
- Updater provider is fixed to GitHub Releases only for this project.

## Assumptions

- Desktop releases are tagged and published via `.github/workflows/release-desktop.yml`.
- Update distribution source is GitHub Releases only (no generic/custom provider path).
- Production signing/notarization policy is managed in release environment (outside this ticket).

## Open Questions / Risks

1. Windows updater behavior is implemented but CI currently builds/publishes macOS + Linux only.
2. macOS updater compatibility depends on shipping zip artifacts and corresponding metadata.
3. Local dev runtime (`electron .`) cannot prove real update install path; packaged build validation is required.
4. Settings navigation should stay clean; update controls must remain single-sourced to avoid duplicate UX entrypoints.

## Requirements (Verifiable)

- `R-001` (Main Updater Orchestration):
  - Expected outcome: Main process owns updater lifecycle (check, available, progress, downloaded, error) and emits normalized state events.

- `R-002` (Renderer Control Surface):
  - Expected outcome: Renderer can call typed update actions (`checkForUpdates`, `downloadUpdate`, `installUpdateAndRestart`) via preload APIs.

- `R-003` (Persistent UX Notification):
  - Expected outcome: Renderer displays a persistent bottom update card/banner with status text and contextual CTA buttons.

- `R-004` (Startup Auto-Check):
  - Expected outcome: Packaged app schedules update check automatically after startup readiness.

- `R-005` (Error and Recovery UX):
  - Expected outcome: Update failures surface clear user-facing feedback and allow retry.

- `R-006` (Build Metadata Compatibility):
  - Expected outcome: Electron builder config includes updater publish metadata for runtime feed resolution.

- `R-007` (Release Artifact Compatibility):
  - Expected outcome: Release workflow publishes all updater-referenced assets (including mac zip artifacts when required).

- `R-008` (Test Coverage):
  - Expected outcome: Targeted tests validate renderer state transitions and preload/main updater contract behavior.

- `R-009` (Provider Simplicity):
  - Expected outcome: Build/runtime updater configuration supports GitHub Releases only and removes generic provider branching.

- `R-010` (Canonical About Surface):
  - Expected outcome: Settings contains one `About` section that is the canonical location for app version and manual update check.

- `R-011` (Version Visibility):
  - Expected outcome: `Settings > About` displays current app version sourced from updater/app runtime state.

- `R-012` (Manual Check Action):
  - Expected outcome: `Settings > About` provides a `Check for Updates` action that calls existing updater control surface and reflects resulting status.

## Acceptance Criteria

- `AC-001` Startup check:
  - Packaged app invokes updater check automatically within app startup flow.

- `AC-002` Update available UX:
  - When an update is available, renderer shows persistent notification with new version and `Download` action.

- `AC-003` Download progress:
  - During download, renderer updates status and progress percentage.

- `AC-004` Install action:
  - After download completes, renderer exposes `Install & Restart`; clicking it invokes updater install flow.

- `AC-005` Error handling:
  - Update errors are surfaced in UI (banner/toast) and user can retry check/download.

- `AC-006` Build config:
  - Build configuration generates updater metadata compatible with GitHub Releases.

- `AC-007` Release assets:
  - Release workflow includes files referenced by updater metadata for macOS/Linux build outputs.

- `AC-008` Tests:
  - Electron + Nuxt targeted tests for updater contracts and renderer state handling pass.

- `AC-009` About section:
  - Settings navigation includes an `About` section and renders About panel content without duplicating updater logic.

- `AC-010` Manual check UX:
  - Clicking `Check for Updates` in About triggers updater check and surfaces status feedback (`checking`, `no-update`, `available`, or `error`).

## Requirement Coverage Map

- `R-001` -> `UC-001`, `UC-003`, `UC-004`, `UC-005`
- `R-002` -> `UC-002`, `UC-003`, `UC-004`
- `R-003` -> `UC-002`, `UC-003`, `UC-004`, `UC-005`
- `R-004` -> `UC-001`
- `R-005` -> `UC-005`
- `R-006` -> `UC-001`, `UC-006`
- `R-007` -> `UC-006`
- `R-008` -> `UC-002`, `UC-003`, `UC-004`, `UC-005`
- `R-009` -> `UC-006`
- `R-010` -> `UC-007`, `UC-008`
- `R-011` -> `UC-007`
- `R-012` -> `UC-008`

## Acceptance Criteria Coverage Map (Stage 6)

- `AC-001` -> `S6-001` startup auto-check invocation observed via updater state logs/events
- `AC-002` -> `S6-002` update-available event drives persistent UI card with version + CTA
- `AC-003` -> `S6-003` download-progress events update percentage and status text
- `AC-004` -> `S6-004` downloaded state enables install CTA; install IPC invoked
- `AC-005` -> `S6-005` error event surfaces retry-capable UI state
- `AC-006` -> `S6-006` packaged build output includes updater metadata config
- `AC-007` -> `S6-007` release workflow uploads updater-required assets (mac zip + yml + blockmap, linux appimage + yml + blockmap)
- `AC-008` -> `S6-008` targeted tests pass for preload/main/store/component flows
- `AC-009` -> `S6-009` settings About section renders and is selectable
- `AC-010` -> `S6-010` About manual check invokes updater action and reflects state

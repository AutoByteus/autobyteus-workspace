# Proposed Design Document

## Design Version

- Current Version: `v5`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Initial design for Electron desktop auto-update flow and release metadata publishing | 1 |
| v2 | Round-1 diagnostic findings | Locked provider config strategy and explicit metadata artifact contract for releases | 1 |
| v3 | Round-2 hardening findings | Added release-trigger policy and deferred-prompt behavior expectations | 2 |
| v4 | Deep review findings | Added macOS zip requirement and standardized updater feed strategy via `app-update.yml` | 4 |
| v5 | Deep review findings | Added mandatory macOS signing enforcement in release workflow for updater compatibility | 6 |

## Summary

Implement a desktop auto-update flow for the Electron app so users are notified when a new version exists, can choose to download/install, and are prompted to restart when installation is ready. Updates are full desktop-app updates that include frontend + embedded server runtime changes.

## Goals

- Detect new desktop releases from in-app runtime.
- Prompt user to download/update with explicit user consent.
- Prompt restart after update package is downloaded.
- Ensure CI publishes updater metadata files required by Electron updater clients.
- Keep release source-of-truth as desktop release repository.
- Define deterministic version/release trigger policy across frontend/server changes.

## Non-Goals

- Hot-updating backend engine independently from desktop app binary.
- Partial patching of only web assets or only server assets.
- Introducing backward-compat wrappers for old update mechanisms.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: do not add dual update systems (manual + old updater shim); standardize on a single updater path.

## Requirements And Use Cases

- UC-001: On packaged app startup, check for updates and notify user when a newer version is available.
- UC-002: User chooses update action: download now, then restart/install now or later.
- UC-003: Release pipeline publishes artifacts + updater metadata so runtime update checks can resolve latest version.
- UC-004: Manual “check update now” trigger should be possible from renderer via preload bridge.
- UC-005: macOS release job enforces signing prerequisites so shipped updates are signed.

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Electron startup is in `bootstrap()` and runtime IPC handlers in `installIpcHandlers()`. | `electron/main.ts:532`, `electron/main.ts:795`, `electron/main.ts:799` | None blocking |
| Current Naming Conventions | Electron files use clear concern-based names (`main.ts`, `preload.ts`, `serverStatusManager.ts`). | `electron/` tree and imports in `electron/main.ts` | None |
| Impacted Modules / Responsibilities | Packaging is centralized in `build/scripts/build.ts`; release upload is centralized in `.github/workflows/desktop-tag-build.yml`. | `build/scripts/build.ts:140`, `.github/workflows/desktop-tag-build.yml:190`, `.github/workflows/desktop-tag-build.yml:403` | Windows release pipeline not currently in this workflow |
| Data / Persistence / External IO | Desktop app version comes from `package.json`; release assets are uploaded to `AutoByteus/autobyteus-desktop-releases`. | `package.json:3`, `.github/workflows/desktop-tag-build.yml:11` | Need final decision on update provider config source (env vs hardcoded defaults) |

## Current State (As-Is)

- No auto-updater behavior in `electron/main.ts`.
- Build script hardcodes `publish: 'never'` for build runs and does not define explicit publish provider config in the builder options.
- Release workflow uploads only `.dmg` and `.AppImage` artifacts; it does not explicitly upload `latest*.yml` and `*.blockmap` metadata.

## Target State (To-Be)

- Electron main process initializes updater service on packaged app startup.
- Updater checks for updates at startup and periodically.
- On `update-available`, user sees prompt to download; on `update-downloaded`, user sees restart/install prompt.
- Optional manual update check available through preload + typed renderer API.
- Build + workflow consistently publish release metadata files so updater can resolve versions.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `electron/appUpdater.ts` | Isolate updater orchestration logic from `main.ts` | Electron runtime | New module for lifecycle + prompts |
| C-002 | Modify | `electron/main.ts` | `electron/main.ts` | Wire updater initialization/disposal and optional IPC trigger | Electron runtime lifecycle | Keep bootstrap readable |
| C-003 | Modify | `electron/preload.ts`, `electron/types.d.ts` | same | Expose typed `checkAppUpdate` bridge | Renderer integration boundary | Enables future settings button |
| C-004 | Modify | `build/scripts/build.ts` | same | Define updater provider config with deterministic defaults (`AutoByteus/autobyteus-desktop-releases`) and env overrides | Build/package config | Must generate runtime-usable update metadata |
| C-005 | Modify | `.github/workflows/desktop-tag-build.yml` | same | Upload binaries plus metadata (`latest*.yml`, `*.blockmap`) for each built platform | Release pipeline | Required for updater clients |
| C-007 | Modify | `.github/workflows/desktop-tag-build.yml` | same | Fail fast if mac signing prerequisites are missing or signing output is invalid | Release pipeline | Prevent unsigned mac releases that break updater |
| C-006 | Modify | `docs/electron_packaging.md` | same | Document update architecture and release artifact requirements | Documentation | Post-implementation sync |

## Architecture Overview

- `electron/main.ts` owns app lifecycle and delegates update lifecycle to `electron/appUpdater.ts`.
- `electron/appUpdater.ts` owns updater events, prompts, and periodic checks.
- `build/scripts/build.ts` defines publish provider metadata for runtime updater resolution.
- `.github/workflows/desktop-tag-build.yml` guarantees release assets include metadata and blockmaps.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `electron/appUpdater.ts` | Add | Updater orchestration for startup/interval checks + user prompts | `createAppUpdaterController()` | Input: app lifecycle + env; Output: check/dispose handlers | `electron-updater`, `electron`, `logger` |
| `electron/main.ts` | Modify | App bootstrap and lifecycle wiring | IPC `check-app-update` (optional) | Input: renderer invoke/app ready; Output: update check side effects | `appUpdater` module |
| `electron/preload.ts` | Modify | Secure renderer bridge | `checkAppUpdate()` | Input: renderer call; Output: invoke result | `ipcRenderer` |
| `electron/types.d.ts` | Modify | Type safety for renderer API | typed method declaration | compile-time interface | N/A |
| `build/scripts/build.ts` | Modify | Build configuration | publish provider metadata config | Input: env defaults; Output: build metadata files | electron-builder |
| `.github/workflows/desktop-tag-build.yml` | Modify | Release artifact publishing | N/A | Input: built files; Output: uploaded binaries + metadata | GitHub CLI release upload |
| `docs/electron_packaging.md` | Modify | Operational docs | N/A | Input: implementation changes; Output: updated docs | N/A |

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | N/A | `electron/appUpdater.ts` | Matches existing module naming style (`serverStatusManager`, `node-window-command-relay`) | Clear runtime concern |
| API | N/A | `createAppUpdaterController` | Expresses lifecycle-managed updater instance | Avoid singleton sprawl |
| API | N/A | `checkAppUpdate` (preload) | Renderer intent is explicit and short | Future settings UI |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `electron/appUpdater.ts` | Electron app/dialog, updater lib, logger | `electron/main.ts` | Low | One-way dependency into `main.ts`; no reverse import |
| `electron/main.ts` | appUpdater + server manager + ipc | entire runtime | Medium | Keep appUpdater wiring minimal (init/dispose + IPC only) |
| `build/scripts/build.ts` | electron-builder config | release workflow outputs | Low | Keep provider config centralized in one object |
| workflow yaml | build outputs | published releases | Medium | Explicit glob list for binaries + metadata reduces drift |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Ad-hoc manual-only desktop update expectation | Replace with single updater flow documentation and behavior | No compatibility shim to old manual-only path | Manual run: startup update check + prompt behavior |

## Data Models (If Needed)

- Updater runtime state fields: `enabled`, `checkInFlight`, `downloadInFlight`, `deferredVersion`.
- Config inputs:
  - `DESKTOP_UPDATE_OWNER` (build-time default: `AutoByteus`)
  - `DESKTOP_UPDATE_REPO` (build-time default: `autobyteus-desktop-releases`)
  - optional `AUTO_UPDATE_CHECK_INTERVAL_MS`
- Feed strategy:
  - use builder-generated `app-update.yml` from publish config in `build/scripts/build.ts`
  - do not use runtime `setFeedURL` in normal flow

## Error Handling And Edge Cases

- Not packaged/dev runtime: updater disabled with log.
- Update check network failure: log + no crash.
- Download failure: show user-friendly error dialog.
- User chooses “Later”: defer install action and keep app usable, and suppress repeated prompt for the same version in the same app session.
- Unsupported platform artifact mismatch: fail check safely with logs.
- Unsigned macOS build is incompatible with updater; release job must fail when signing is not available.

## Versioning And Release Trigger Policy

- Any shipped change in `autobyteus-web`, bundled `autobyteus-server-ts`, or bundled `autobyteus-ts` that affects runtime behavior must produce a new desktop app version.
- Desktop version source remains `/Users/normy/autobyteus_org/autobyteus-web/package.json`.
- Update detection is package-version based; no separate “engine-only” installer path is introduced.
- Release tagging convention should remain semver-compatible (`vX.Y.Z` preferred for consistency).

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Startup auto-check + available-update prompt | Yes | Yes | Yes | `UC-001` |
| UC-002 | User-driven download + restart/install decision | Yes | Yes | Yes | `UC-002` |
| UC-003 | CI publishes metadata + binaries for update resolution | Yes | Yes | Yes | `UC-003` |
| UC-004 | Manual check now from renderer | Yes | N/A | Yes | `UC-004` |
| UC-005 | macOS signing enforcement in release workflow | Yes | N/A | Yes | `UC-005` |

## Performance / Security Considerations

- Update checks are periodic and low-frequency (hours).
- No renderer direct file/network update privileges; updater remains main-process only.
- Preload exposes only minimal manual trigger method.

## Migration / Rollout (If Needed)

1. Merge runtime + build + workflow changes.
2. Publish next tagged desktop release with metadata artifacts.
3. Validate update from previous installed version to new version on macOS/Linux.

## Release Artifact Contract (Mandatory For Update Detection)

- macOS upload set must include:
  - `*.dmg`
  - `*.zip`
  - `*.blockmap` (for mac artifact)
  - `latest-mac.yml`
- Linux upload set must include:
  - `*.AppImage` / `*.appimage`
  - matching blockmap file if emitted by builder
  - `latest-linux*.yml`
- Contract validation step in workflow must fail release job if metadata files are missing.
- Release repo visibility for default GitHub provider must be public for end-users (already true for `AutoByteus/autobyteus-desktop-releases`).
- macOS release step must fail if signing identity/certificate is not available.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/Manual) | Status |
| --- | --- | --- | --- |
| C-001 | T-001 | Unit + manual packaged smoke | Planned |
| C-002 | T-002 | Unit + manual startup behavior | Planned |
| C-003 | T-003 | Type check + renderer invoke smoke | Planned |
| C-004 | T-004 | Build artifact inspection | Planned |
| C-005 | T-005 | CI dry run + release asset inspection | Planned |
| C-007 | T-007 | CI signing-gate verification | Planned |
| C-006 | T-006 | Docs review | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Design Smell | Design Update Applied | Status |
| --- | --- | --- | --- | --- |
| 2026-02-16 | Initial planning | None yet | N/A | Open |

## Open Questions

- Should Windows packaging/release be included in the same first pass or as follow-up?
- Do we want staged rollout channels (stable/beta) now or later?

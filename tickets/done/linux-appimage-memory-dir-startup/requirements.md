# Requirements

- Status: `Design-ready`
- Ticket: `linux-appimage-memory-dir-startup`
- Last Updated: `2026-04-02`
- Scope Triage: `Medium`

## Goal / Problem Statement

The packaged Linux AppImage startup regression is fixed, but the current server startup data flow is still harder to reason about than it should be:

- `AppConfig` can be constructed before bootstrap resolves the effective `--data-dir`.
- early startup logs can report a misleading default data directory before the runtime app-data binding is applied,
- and the main entry module imports a broad app graph before config bootstrap is complete.

This ticket now expands to refactor startup so the effective runtime config is established first, then the server app graph is loaded, while preserving the Linux AppImage fix and validating with actual packaged build/startup checks.

## Initial User-Reported Evidence

- Executable: `./AutoByteus_personal_linux-1.2.52.AppImage`
- Observed failure:
  - Server launch command includes `--data-dir /home/ryan-ai/.autobyteus/server-data`
  - Embedded server logs still report `Data directory: /tmp/.mount_.../resources/server`
  - Crash: `Error: ENOENT: no such file or directory, mkdir '/tmp/.mount_.../resources/server/memory'`

## Initial Expectations

- The embedded server must honor the Electron-provided `--data-dir` before any runtime persistence path is resolved.
- Linux AppImage startup must not attempt to write under the mounted packaged server directory.
- Existing desktop/macOS/windows server startup behavior must remain compatible.

## In-Scope Use Cases

- `UC-001`: Server process starts with `--data-dir <user app data dir>`.
  - Expected outcome: bootstrap resolves the effective app data directory before the main runtime graph is imported.
- `UC-002`: Startup logging is emitted during packaged/server bootstrap.
  - Expected outcome: `AppConfig` reports the effective app data directory truthfully rather than printing a stale pre-bootstrap fallback as the runtime directory.
- `UC-003`: Startup-sensitive modules import config-dependent helpers or services.
  - Expected outcome: import-time config/path binding does not observe the wrong runtime directory.
- `UC-004`: Team-member projection still computes member `memoryDir` correctly after the bootstrap refactor.
  - Expected outcome: existing runtime/history projection behavior stays correct.
- `UC-005`: Linux desktop artifact is built and launched after the refactor.
  - Expected outcome: packaged startup still reaches running state and uses `~/.autobyteus/server-data/**`.
- `UC-006`: Regression provenance is still captured from git history.
  - Expected outcome: commit/date/reason remain documented for the original bug introduction.

## Requirements

- `R-001`: Server bootstrap must resolve the effective app-data directory before the main runtime/server graph is imported.
  - Expected outcome: production startup no longer depends on whether imported modules touch config before `initializeConfig()` in `app.ts`.
- `R-002`: `AppConfig` construction/logging must reflect the effective app-data directory chosen by bootstrap for normal server startup.
  - Expected outcome: startup logs become truthful and easier to reason about.
- `R-003`: The refactor must preserve the previously-fixed lazy runtime memory resolution in `team-member-run-view-projection-service.ts`.
  - Expected outcome: team-member projection continues to derive member `memoryDir` from the configured runtime root after initialization.
- `R-004`: Remaining startup-sensitive module-scope config-derived filesystem paths in the touched scope must be made lazy.
  - Expected outcome: the refactored startup boundary is not undermined by eager path constants in touched modules.
- `R-005`: Verification for this ticket must include real packaged Linux build and AppImage startup execution in addition to targeted unit coverage.
  - Expected outcome: Stage 7 includes build-and-run evidence, not only unit tests.
- `R-006`: Ticket investigation must continue to record when and why the original regression was introduced using git history.
  - Expected outcome: change provenance remains captured for release/debug follow-up.

## Acceptance Criteria

- `AC-001`: The server entry flow initializes effective runtime config before importing the broader runtime graph used for startup.
- `AC-002`: Startup logs for packaged Linux startup report the effective app-data and memory directories under `/home/<user>/.autobyteus/server-data/**`.
- `AC-003`: Targeted tests prove no import-time config path binding is reintroduced in the touched startup-sensitive modules.
- `AC-004`: Existing team-member projection tests still pass after the bootstrap refactor.
- `AC-005`: A locally built Linux AppImage starts successfully after the refactor with no `/tmp/.mount_*/resources/server/memory` startup failure.
- `AC-006`: The ticket records that commit `03b8f9a` on `2026-03-30` introduced the original eager team-member memory-layout initialization.

## Constraints / Dependencies

- The external server entry contract remains `dist/app.js --port ... --data-dir ...`.
- The refactor must preserve the runtime/history projection contract introduced by the March 30 refactor.
- Tests and packaging scripts should remain runnable without changing the Electron-side launch interface.

## Assumptions

- Electron-side CLI wiring for `--data-dir` remains correct.
- Dynamic import or equivalent bootstrap separation is acceptable in the Node/Electron server entry path.

## Open Questions / Risks

- There may be more startup-sensitive module-scope config/path binding sites outside the touched scope.
- The stricter provider design (`throw before bootstrap`) may be too disruptive for current tests; a staged refactor may be required.

## Requirement Coverage Map

- `R-001` -> `UC-001`, `UC-003`
- `R-002` -> `UC-002`
- `R-003` -> `UC-004`
- `R-004` -> `UC-003`
- `R-005` -> `UC-005`
- `R-006` -> `UC-006`

# Handoff Summary

- Ticket: `linux-appimage-memory-dir-startup`
- Date: `2026-04-02`
- Stage: `10` (handoff prepared)

## What Was Diagnosed

- The Linux AppImage startup failure was caused by import-time evaluation of `appConfigProvider.config.getMemoryDir()` in `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts`.
- That eager lookup ran before `autobyteus-server-ts/src/app.ts` could apply the Electron-provided `--data-dir`, so runtime persistence fell back to the packaged AppImage server root under `/tmp/.mount_*/resources/server`.
- Git history shows the regression was introduced on `2026-03-30` in commit `03b8f9a` (`Tighten run provisioning and projection contracts`) when member `memoryDir` projection support was added with a module-scope `TeamMemberMemoryLayout` singleton.

## Implemented Refactor

1. Kept the original bug fix.
- Team-member memory-layout resolution remains lazy, so startup no longer binds `memoryDir` during module import.

2. Made startup bootstrap-first.
- `autobyteus-server-ts/src/app.ts` now parses CLI args and initializes effective config before importing the wider runtime graph.
- Added `autobyteus-server-ts/src/server-runtime.ts` to own the broader server startup/runtime graph after bootstrap completes.
- `appConfigProvider` now has an explicit bootstrap initialization path, and `AppConfig` can be constructed with the real app-data directory so constructor logs are truthful.

3. Removed touched eager path binding in startup-sensitive scope.
- `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts` now resolves its config-derived path lazily instead of at module scope.

4. Added regression protection.
- Added `app.test.ts` to prove config bootstrap happens before runtime import.
- Added `file-provider.import.test.ts` and `team-member-run-view-projection-service.import.test.ts` to prove touched modules import without config-path access at module scope.
- Preserved projection behavior coverage and added constructor coverage for bootstrap-time app-data input.

5. Tightened the bootstrap boundary after principle-based review.
- Removed the leftover proxy `buildApp()` export from `autobyteus-server-ts/src/app.ts`.
- Split package exports in `autobyteus-server-ts/src/index.ts` so bootstrap and runtime APIs are exposed from their real owners instead of routing runtime construction through the bootstrap entrypoint.

## Verification Executed

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app.test.ts tests/unit/config/app-config.test.ts tests/unit/mcp-server-management/file-provider.import.test.ts tests/unit/run-history/team-member-run-view-projection-service.import.test.ts tests/unit/run-history/team-member-run-view-projection-service.test.ts` -> passed (`26` tests across `5` files).
- `pnpm -C autobyteus-server-ts build:file` -> passed.
- `git blame -L 60,90 autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts` -> confirmed commit provenance.
- `git show 03b8f9a -- autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts` -> confirmed root-cause change intent and exact introducing line.
- `AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 pnpm -C autobyteus-web build:electron:linux` -> passed; produced a refactored Linux AppImage.
- `timeout 20s ./AutoByteus_personal_linux-1.2.52.AppImage` from `autobyteus-web/electron-dist/` -> passed packaged startup validation; server reached `running` and logged:
  - `App data directory: /home/ryan-ai/.autobyteus/server-data`
  - `APP DATA DIRECTORY: /home/ryan-ai/.autobyteus/server-data`
  - `MEMORY DIRECTORY: /home/ryan-ai/.autobyteus/server-data/memory`
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app.test.ts tests/unit/config/app-config.test.ts tests/unit/mcp-server-management/file-provider.import.test.ts tests/unit/run-history/team-member-run-view-projection-service.import.test.ts tests/unit/run-history/team-member-run-view-projection-service.test.ts` -> passed (`26` tests) after the local cleanup.
- `pnpm -C autobyteus-server-ts build:file` -> passed after the local cleanup.

## Recommendation

- Keep this refactor.
- It improves the actual startup design instead of papering over one crash site.
- It is still realistically scoped because it does not force a repo-wide strict "throw before bootstrap" migration.
- The packaged AppImage validation shows the intended user-facing effect: startup is both stable and easier to reason about from logs.
- The cleanup pass further improves the code structure by making the bootstrap boundary honest in both implementation and exported surface.
- A repeat deep Stage 8 review after the cleanup found no additional structural issues in the touched startup-boundary scope.

## Residual Risk

- `appConfigProvider.getConfig()` still supports lazy fallback construction for callers outside the normal bootstrap path. That is acceptable for this ticket, but stricter repo-wide bootstrap enforcement remains future cleanup.
- You may still want one pipeline/download-artifact check to confirm release packaging uses this patched commit.

## Release / Publication / Deployment

- Release/publication/deployment not required for this finalization.
- No new version or release step was requested.

## Cleanup Status

- Ticket archival: completed
- Repository finalization into `origin/personal`: completed
- Dedicated worktree cleanup: completed
- Local ticket branch cleanup: completed
- Remote ticket branch cleanup: not required

## Ticket State Decision

- Engineering work is complete through Stage 10 handoff preparation.
- The refactor is realistic enough to keep, based on targeted tests plus successful packaged Linux build-and-run validation.

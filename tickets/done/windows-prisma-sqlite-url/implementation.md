# Implementation Plan

## Scope Classification

Small hotfix. The change is limited to SQLite URL formatting for runtime config generation and tests.

## Solution Sketch

- Replace duplicated Electron URL formatting logic with one helper owned by `autobyteus-web/electron/server/`.
- Format SQLite paths as `file:${normalizedPath}` after replacing `\` with `/`.
- Preserve POSIX absolute behavior: `/Users/...` remains `file:/Users/...`.
- Fix Windows absolute behavior at generation time: `C:\Users\...` becomes `file:C:/Users/...`.
- Preserve relative development database behavior: `./db/dev.db` remains `file:./db/dev.db`.
- Do not add legacy/backward-compatible malformed URL healing in runtime startup code.
- Provide a separate repair script/tutorial for existing local installs that already generated bad config or contain the previous packaged Electron generator.
- Update server fallback config generation to normalize slashes the same way.
- Update tests to lock the Windows behavior and first-run `.env` generation behavior.

## Implementation Tracking

- Status: Stage 6 implementation complete after design correction
- Code edit permission: locked after Stage 7 validation; source edits complete.

## Changes Made

- Added `autobyteus-web/electron/server/prismaSqliteUrl.ts`.
- Updated Electron runtime env generation and first-run `.env` generation to use the shared formatter.
- Updated server fallback SQLite URL generation to normalize backslashes.
- Reverted server-side legacy malformed URL healing from product source per project policy.
- Updated server test setup so Prisma migrations can run under Windows test execution.
- Added `scripts/repair-windows-prisma-sqlite-url.ps1` as the single project-level repair script for affected installed Windows artifacts.
- Added `docs/windows-prisma-sqlite-url-repair.md` with user-facing repair instructions and the no-runtime-legacy policy.
- Removed the ticket-local repair script copy after moving the repair path into the project script location.

## Stage 6 Verification

- `pnpm --filter autobyteus exec vitest --config ./electron/vitest.config.ts run electron/server/__tests__/prismaSqliteUrl.spec.ts electron/server/__tests__/serverRuntimeEnv.spec.ts electron/server/services/__tests__/AppDataService.spec.ts`: pass, 20 tests.
- `pnpm --filter autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts`: pass, 18 tests.
- `.\scripts\repair-windows-prisma-sqlite-url.ps1`: pass, idempotent on the repaired local install; no files needed modification.
- `pnpm --filter autobyteus exec tsc -p electron/tsconfig.json --noEmit`: pass.
- `pnpm --filter autobyteus-server-ts exec tsc -p tsconfig.json --noEmit`: not a valid focused signal in current repo state; existing tsconfig includes `tests` under `rootDir=src`, producing TS6059 for many pre-existing test files.

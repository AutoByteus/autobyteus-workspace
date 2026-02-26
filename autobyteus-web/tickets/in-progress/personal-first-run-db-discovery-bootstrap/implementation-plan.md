# Implementation Plan - personal-first-run-db-discovery-bootstrap

## Plan
1. Add shared runtime env builder for Electron server managers:
   - Compute runtime DB path from app data dir.
   - Generate Prisma-compatible `DATABASE_URL`.
   - Set personal-safe discovery defaults with explicit-env override support.
2. Use the shared builder in:
   - `electron/server/macOSServerManager.ts`
   - `electron/server/linuxServerManager.ts`
   - `electron/server/windowsServerManager.ts`
3. Add unit tests for env builder:
   - POSIX path behavior
   - Windows path normalization
   - explicit discovery env overrides
4. Validate with test run.
5. Manual validation checklist (fresh install):
   - Start app with clean `~/.autobyteus/server-data`
   - confirm agent definitions load
   - confirm no forced discovery auto-enable in personal default

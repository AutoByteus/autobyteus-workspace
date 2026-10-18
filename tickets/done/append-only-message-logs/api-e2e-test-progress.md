# API/E2E Test Progress — Append-Only Message Logs

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-18 14:05 | BUILD | Started | — | `pnpm -C autobyteus-server-ts build` then `pnpm -C autobyteus-web build:electron:mac` (log `/tmp/aoml-api/*-build.log`) |
| 2026-10-18 14:20 | BUILD | Checkpoint | — | server build exit=0; the Electron build's prepare-server step finished (it rebuilt the server dist); DMG packaging still running and does not touch `autobyteus-server-ts/dist` |
| 2026-10-18 14:21 | API-01 | Started | — | `vitest run tests/e2e/app-data-migrations` on the built server, clean env |
| 2026-10-18 14:01 | API-01 | Checkpoint | — | 5 of 14 failed: TAU-1, TAU-2 (faithful root leaves the conversion recorded as SUCCEEDED), production-upgrade warning scenario (asserts conversion of a root that by design waits), org token continuation (no conversion after the in-process flat-families). Test-side causes; updating the three test files |
| 2026-10-18 14:05 | API-01 | Completed | Pass | after the test updates: 5 files, 14 tests passed (`evidence/API-01-startup-migrations.log`) |
| 2026-10-18 14:07 | API-02/03/04 | Started | — | one run of all `tests/e2e` with `RUN_AGY_FAILURE_E2E=1` + scripted AGY CLI (covers the ungated suites too); log `/tmp/aoml-api/API-04-full.log` |
| 2026-10-18 14:08 | — | Checkpoint | — | correction: the first three rows' times were estimates; the build started ≈13:35 and API-01 started 13:59:49 (vitest 'Start at') |
| 2026-10-18 14:16 | API-05 | Started | — | writing `tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts` (AOML-1, AOML-2) and running it while API-02/03/04 run |
| 2026-10-18 14:40 | API-05 | Checkpoint | — | AOML-2 v1 (resume hand-built old runs) cannot restore: `persisted provider conversation identity is missing`, then `agy-project/manifest.json` ENOENT (runtime state a real run writes). Redesigned: runs really run on start 0, logs rewritten to the released JSON shape (frozen validators), conversion row removed |
| 2026-10-18 14:52 | API-05 | Completed | Pass | 2 tests passed (`evidence/API-05-append-only-startup-e2e.log`) |
| 2026-10-18 14:13 | — | Checkpoint | — | correction: the three API-05 rows above carry estimated times; API-05 completed at 14:13 (evidence header). Later rows use the shell clock |
| 2026-10-18 14:14 | API-06 | Started | — | released v1.5.6-beta.4 isolated instance iso-57200-6bde on owned root /private/tmp/aoml-api/desktop-root; data package via probes/api-06-released-data.mjs |
| 2026-10-18 14:17 | API-06 | Checkpoint | — | worktree build iso-57762-932a started on the package: conversion SUCCEEDED_WITH_WARNINGS (8 migrated, 2 kept) |
| 2026-10-18 14:22 | API-06 | Checkpoint | — | UI journey done (hub, team, org opened; sends from composer; team delegated; references opened); restart done |
| 2026-10-18 14:23 | API-06 | Completed | Pass | instances stopped (iso-57762-932a stop needed force), data root removed; evidence API-06-* |
| 2026-10-18 14:24 | API-02/03/04 | Checkpoint | — | whole-folder run ended: 1 failed (terminal-websocket-lifecycle, HOME under /tmp symlink), 483 passed, 241 skipped |
| 2026-10-18 14:26 | API-04 | Checkpoint | — | terminal suite rerun with HOME under /private/tmp: 4 passed (cause confirmed: environment) |
| 2026-10-18 14:27 | API-02 | Checkpoint | — | context-file process suites are gated (RUN_CONTEXT_FILE_PROCESS_E2E): startup-recovery 4/4 pass; storage-runtime 1 failed ("converts a copied retained duplicate-address package…": retained-task context file 404) |
| 2026-10-18 14:28 | API-02 | Checkpoint | — | base worktree /private/tmp/aoml-api/base at 65cf41c6b4 being built to run that test on the base (cause: task agent files written in the pre-own-run in-team folder) |
| 2026-10-18 14:30 | API-02 | Completed | Pass | changed-fixture suites pass; context-file-storage-runtime failure reproduced identically on base 65cf41c6b4 (stale pre-own-run test) → FU-API-1; base worktree removed |
| 2026-10-18 14:30 | API-03 | Completed | Pass | whole-folder run + terminal rerun |
| 2026-10-18 14:30 | API-04 | Completed | Pass | scripted-runtime suites all pass |

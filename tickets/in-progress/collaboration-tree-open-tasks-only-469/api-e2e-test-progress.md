# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-11 00:05 | build | Completed | Pass | `pnpm -C autobyteus-server-ts build` on `7ec463393b` (code = `42652879b3`), EXIT 0 |
| 2026-11-11 00:06 | API-E01 | Started | | Whole server E2E (`vitest run tests/e2e`), scripted AGY gate, clean env; log `/tmp/api469/API-E01-server-e2e.log` |
| 2026-11-11 00:10 | API-E01 | Checkpoint | | 4/253 files done; remote-delegation-two-server RC-04 and RC-17 failed (diagnose after the run). Written meanwhile, not yet run: API-E02 test file, probe extension (API-B01), fixture `AGY_FAKE_REPLY_USAGE`. Next: wait for API-E01 to end (files run serially), then API-E02, API-B01, API-F01 |
| 2026-11-11 00:44 | API-E01 | Completed | Fail | 252 files: 17 failed (47 tests), 164 passed, 71 skipped. Triage in progress: baseline wording (RC-04, RC-17, DLC x2, CM-E2E-2), stale under D-4/DEC-006/DEC-008/DEC-010, test process without a bound source, EXC-E2E-007 agent text |
| 2026-11-11 01:20 | API-E01 | Checkpoint | | Updated and rerun green: task-reactivation (7), task-existing-copy 001-005 (EXC-E2E-007 still fails: text), task-closure (3), ad-hoc (3), teammate race (3), worker scope (6), CM (3), DLC (3), memory-collaboration, imported-team-memory, recent-run-projection, archive-run-history, TAU (3), AOML (2), team-run-v1 (4), collaborators (1). Remote suite RC-04/RC-17 text fixed, rerun pending |
| 2026-11-11 01:21 | API-E02 | Started | | New built-server E2E `tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts` |
| 2026-11-11 01:40 | API-E02 | Completed | Pass | 3/3 (OT-1..OT-3) after test corrections (token total includes the Manager's closing turn; remote link on disk is a `taskExecutions` entry with `nodeId`; positive control via the Team tab) |
| 2026-11-11 01:42 | typecheck | Completed | Pass | server typecheck PASS, test-file errors 1180 = baseline |
| 2026-11-11 01:50 | API-E01 | Checkpoint | | remote-delegation-two-server rerun: 42/42 pass (baseline wording fixed) |
| 2026-11-11 01:51 | API-B01 | Started | | `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir /tmp/api469/probe-B01`, all 16 cases, log /tmp/api469/API-B01.log |
| 2026-11-11 02:35 | API-B01 | Checkpoint | | Run 1 (16 cases): BR-004, 006, 008, 009, 010, 012, 013, 014, 016 pass; BR-001..003 fail at my probe's before-B wait (fixed); BR-005/007 depend on them; BR-011, BR-015 fail at the Team root (row not live after a restart) |
| 2026-11-11 02:55 | API-B01 | Checkpoint | | Diagnostic BR-008..011 (temporary, reverted), twice: Team root only; server tree holds the reactivated worker, the open view shows it only after a manual reload; Agent and Org live |
| 2026-11-11 03:10 | API-B01 | Checkpoint | | Run 2 (BR-001..005, 007): BR-002, BR-004 pass; BR-001 (Agent), BR-003 (Org) fail: Manager Team tab empty after the closure plus a re-delegation; diagnostic (temporary, reverted): server returns the message and past participant, rows return after a page reload |
| 2026-11-11 03:12 | API-B01 | Completed | Fail | F-2 (AC-011 rendered, Agent and Org), F-3 (AC-002/AC-003 rendered after restart, Team). BR-005, BR-007 not run (depend on BR-001/BR-003) |
| 2026-11-11 03:15 | API-F01 | Started | | fresh clone of 431de4c9d1 in /tmp/api469/fresh: frozen install, `build:electron:mac -- --arm64`, verify steps; log /tmp/api469/API-F01.log |
| 2026-11-11 04:05 | API-F01 | Completed | Pass | install, desktop build (typecheck PASS, dmg/zip), Prisma and terminal-runtime verify steps all EXIT 0; clone removed |

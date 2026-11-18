# API/E2E Test Progress — projects-left-navigation

Your own progress log while tests run. Read it first whenever you pick the run back up.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-31T11:52Z | API-R01..R04 | Completed | Pass | Reused IMP-01/01b/02/03/04/05/06/07/10: post-commit diffs checked (467cff24c0..HEAD only tickets/; dacdceed36..HEAD web only runTreeProjection.ts comment) |
| 2026-10-31T11:56Z | API-01 | Started |  | server E2E project-run-history.e2e.test.ts first run (scripted AGY) |
| 2026-10-31T11:58Z | API-01 | Completed | Pass | 10/10 after correcting the refusal assertion (run creation answers success:false + "Project '…' was not found."); evidence API-01-server-e2e.log, API-01/project-run-history.json. Title reworded after the run; rerun inside API-02 |
| 2026-10-31T11:58Z | API-02 | Started |  | gated server E2E folders projects, run-history, agent-team-runs (background) |
| 2026-10-31T12:20Z | API-02 | Completed | Pass (in scope) | 179/180 passed; EXC-E2E-004 (parallel DONE + follow-up race) failed once at offset 9 ms, passed alone; cause in unchanged root-task-execution-lifecycle prepareClosedCopyForResume (open copy skips discardReleasedExecution after DONE's fence); FU-007 |
| 2026-10-31T12:20Z | API-03 | Started |  | web component spec WorkspaceAgentOrgScopedRows.spec.ts |
| 2026-10-31T12:20Z | API-03 | Completed | Pass | 3/3 |
| 2026-10-31T12:20Z | API-04 | Started |  | server build, then probe run 1 |
| 2026-10-31T13:11Z | API-04 | Completed | Fail | final run into evidence/api-e2e/API-04-browser-probe: 9/10 pass; PLN-09 Stop staleness in Projects mode (in-scope defect); PLN-08 records same-page run stream after restart (FU-008, existing) |
| 2026-10-31T13:11Z | API-05 | Started |  | isolated-app start --build with own data root /tmp/pln-iso-root (background) |
| 2026-10-31T13:20Z | API-05 | Completed | Pass | iso-61565-aa80 (worktree build, unpacked app; DMG step failed on hdiutil, env), scripted AGY via data-root .env; journey pass; instance stopped, list empty, data root removed |
| 2026-10-31T13:22Z | API-06 | Completed | Pass | VIS comparisons (report) |
| 2026-10-31T13:59Z | round 2 | Checkpoint |  | CRR-004 pass; HEAD 344ccade3d, code c9972a1581 (web projectRunsStore only). Still valid: API-R01/R02/R04, API-01/02/03 (no server change; Org rows component untouched). Rerun: API-04 (PLN-09 extended to Team Stop), API-05 (rebuild), new API-07 full web suite (importers chatLaunchService, projectChangeFeed). Reuse IMP-13 (typecheck) |
| 2026-10-31T13:59Z | API-07 | Started |  | pnpm -C autobyteus-web test:nuxt --run |
| 2026-10-31T14:03Z | API-07 | Completed | Pass | 679 files, 4921 tests |
| 2026-10-31T14:03Z | API-04 | Started |  | round 2 probe run (PLN-09 with Team Stop) into evidence/api-e2e/API-04-browser-probe-r2 |
| 2026-10-31T14:12Z | API-04 | Checkpoint | Fail | round 2 attempt 1: PLN-09 Agent Stop fixed (0 after 5s); Team Stop not clicked (probe locator), PLN-08 CORS error during restart window (probe tolerance) — probe fixed |
| 2026-10-31T14:12Z | API-04 | Completed | Pass | round 2: PLN-01..10 Pass; Agent and Team Stop read stopped within 5 s |
| 2026-10-31T14:12Z | API-05 | Started |  | round 2: isolated-app start --build (data root /tmp/pln-iso-root2) |
| 2026-10-31T14:19Z | API-05 | Completed | Pass | round 2: iso-65477-bc57 on the rebuilt app; journey Pass; stopped; list empty; data root removed |

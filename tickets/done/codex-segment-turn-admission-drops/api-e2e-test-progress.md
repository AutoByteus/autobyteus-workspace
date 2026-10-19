# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-19 05:45 | API-01..03 | Completed | Pass | Reused IMP-01/02/03 (commit `dedaf77fba`; `git diff --name-only dedaf77fba HEAD` = `tickets/` only) |
| 2026-10-19 05:47 | API-04..07 | Started | — | New integration file, first run (development iteration) |
| 2026-10-19 05:47 | API-04..07 | Checkpoint | — | First run: SCN-001 failed on test-side assertion (`interrupt` returns `{accepted, turnId}`); fixed to `toMatchObject`; rerun 4/4 pass. Next: mutation checks, then the recorded final run |
| 2026-10-19 05:48 | API-04..07 | Checkpoint | — | Mutation checks M1–M3 started (temporary source edits, restored with `git checkout` after each) |
| 2026-10-19 05:49 | API-04..07 | Checkpoint | — | Mutations: M1 fails AC-005 case, M3 fails all 4, M2 survives (both close paths flush; explained); client-close case strengthened (exactly once) |
| 2026-10-19 05:49 | API-04..07 | Completed | Pass | Recorded run x3, 4/4 each: evidence/API-04-07-integration-rejection-logging.log |
| 2026-10-19 05:49 | API-08 | Started | — | Neighbour codex-input-terminal-release + codex thread units with new test |
| 2026-10-19 05:50 | API-08 | Completed | Pass | 23 files / 316 tests: evidence/API-08-codex-neighbours.log |
| 2026-10-19 05:50 | API-10 | Started | — | typecheck |
| 2026-10-19 05:50 | API-10 | Completed | Pass | evidence/API-10-typecheck.log |
| 2026-10-19 05:50 | API-09 | Started | — | full test:integration, full log /tmp/codex-rejection-api09-integration.log (background) |
| 2026-10-19 05:54 | API-09 | Completed | Pass | 78 passed / 19 skipped files, 419 passed / 70 skipped tests, exit 0: evidence/API-09-test-integration-excerpt.log |
| 2026-10-19 05:54 | API-04..07 | Started | — | Re-record after type-only edit (enum config values, index access) |
| 2026-10-19 05:55 | API-04..07 | Completed | Pass | Re-recorded x3 on final file: evidence/API-04-07-integration-rejection-logging.log |

# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-19 17:28 | setup | Completed | Pass | `prebuild` + `build` of the worktree, exit 0 (`/tmp/usdr-api/build.log`); dist contains the fix |
| 2026-10-19 17:40 | API-01/02/04/07 | Started | — | First run of the new E2E file (USR-1..USR-5), clean env, scripted AGY |
| 2026-10-19 17:34 | API-01/02/04/07 | Completed | Pass | Run 1 (5/5) on logs with 2 ASCII records; strengthened to 6+ records with non-ASCII turns and a mid-file USR-4 line; rerun next (run 2) |
| 2026-10-19 17:45 | API-01/02/04/07 | Started | — | Run 2 of the strengthened E2E file |
| 2026-10-19 17:35 | API-01/02/04/07 | Completed | Pass | Run 2: 5/5, receipt /tmp/usdr-api/run2 (copied to evidence next) |
| 2026-10-19 17:35 | API-03 | Started | — | EXC-E2E-007 via -t, clean env |
| 2026-10-19 17:35 | API-03 | Completed | Pass | 1 passed, 8 skipped (filtered); receipt /tmp/usdr-api/api03 |
| 2026-10-19 17:35 | API-05 | Started | — | delegation-forest-restore.e2e.test.ts, clean env |
| 2026-10-19 17:38 | API-08 | Started | — | Negative control: new E2E file copied into a temp base worktree (f171032e88), built there; expect failures |
| 2026-10-19 17:39 | API-08 | Completed | Pass | Negative control behaved as expected: 5/5 fail on base; USR-1..3 refused with the old '(indeterminate)' text; base worktree removed |
| 2026-10-19 17:39 | API-03, API-05, API-06 | Completed | Pass | (recorded here after the fact: API-03 1 passed/8 skipped, API-05 3/3, API-06 0 non-style errors in the new file) |
| 2026-10-19 17:39 | all | Completed | Pass | All planned cases done; writing the report |

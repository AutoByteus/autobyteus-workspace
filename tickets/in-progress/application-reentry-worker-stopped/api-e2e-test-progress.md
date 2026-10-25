# API/E2E Test Progress

Read it first whenever you pick the run back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-25T04:00:17Z | API-01..API-05 | Completed | Pass | Reused IMP-00/01, IMP-02, IMP-03, IMP-04, IMP-05 (code unchanged since 6950a24e1b) |
| 2026-10-25T04:00:17Z | API-07 | Started | | reload-repair e2e with RE-04, RE-05 added; log /tmp/ab296e2e/API-07-run1.log |
| 2026-10-25T04:03:17Z | API-07 | Checkpoint | | run 1: RE-01..04 pass; RE-05 failed: host terminateAgentTeamRun cannot find app-owned runs (probe: also while ACTIVE). Redesigned RE-05 trigger: the run's runtime process dies while quarantined (probe: event dispatched after repair). Rerun |
| 2026-10-25T04:04:00Z | API-07 | Completed | Pass | run 2: Tests 5 passed (5) (RE-01..05) |
| 2026-10-25T04:05:22Z | API-08 | Completed | Pass | (a) dispatch resume removed -> only RE-05 fails ("the dispatch drain started the worker"); (b) handle-less reset removed -> only RE-04 fails ("expected 'failed' to be 'stopped'"); sources restored, diff empty |
| 2026-10-25T04:05:22Z | API-06 | Completed | Pass | docs match code and observed RE-05 behavior |

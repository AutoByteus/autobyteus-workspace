# API/E2E Test Progress

Read it first whenever you pick the run back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-24T17:37:10Z | API-01..API-03 | Completed | Pass | Reused IMP-00/01, IMP-02, IMP-03/04 (code unchanged since 5af1a03e11) |
| 2026-10-24T17:37:10Z | setup | Completed | Pass | server build exit 0 (/tmp/ab208e2e/build.log); observer copy autobyteus-web/tests/.e2e-ab208-observer/ (remove at the end) |
| 2026-10-24T17:37:10Z | API-05 | Started | | probe DLP-003,DLP-004,DCP-002,DCP-003,DCP-005,DCR-001,DCR-002 with name observer; out /tmp/ab208e2e/API-05 |
| 2026-10-24T17:43:37Z | API-05 | Completed | Pass | 7/7 Pass, 0 browser errors, cleanup OK; names: 0 mismatches (run-id and address matches); conversation titles agree |
| 2026-10-24T17:44:08Z | API-06 | Started | | calibration: three changed web sources from 1138e8fbef swapped in (Nuxt dev serves source); same cases; out /tmp/ab208e2e/API-06; restore + empty git diff afterwards |
| 2026-10-24T17:50:38Z | API-06 | Completed | Pass | calibration as expected: base sources 7/7 probe Pass, names 14 mismatches (underscored Settings vs spaced sidebar); files restored (diff 0); cleanup receipt OK |
| 2026-10-24T17:51:00Z | cleanup | Completed | | removed autobyteus-web/tests/.e2e-ab208-observer; no probe/Nuxt/vitest of this run left (remaining ones belong to the agent-input-delivery-simplification worktree) |

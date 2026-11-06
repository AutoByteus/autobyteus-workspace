# API/E2E Test Progress

Read it first whenever you pick the run back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-06T08:56:00Z | round 1 | Started | | head dda6ba59cf (code ee1178617c, 2903fba48a, 00339421ed) |
| 2026-11-06T08:56:00Z | API-01 | Completed | Pass | Reused IMP-01..IMP-05 (only ticket docs after 00339421ed) |
| 2026-11-06T08:56:00Z | API-05 | Started | | fresh clone at dda6ba59cf (generated/** changed) |
| 2026-11-06T09:06:36Z | API-05 | Completed | Pass | build exit 0, typecheck 99 = baseline, dmg/zip, Prisma and terminal-runtime verify ok |
| 2026-11-06T09:07:15Z | API-02 | Completed | Pass | 5 files: two GraphQL e2e, two create unit, the service integration |
| 2026-11-06T09:07:21Z | API-03, API-04 | Started | | PLN-01..11, out /tmp/lpf-388/pln |
| 2026-11-06T09:12:29Z | API-03 | Completed | Pass | PLN-01..10 Pass (PLN-08 listed 4.36 s after the API run, view open) |
| 2026-11-06T09:12:29Z | API-04 | Completed | Fail | PLN-11: new Project's run listed 3.99 s, unlisted 4.91 s after archive elsewhere; hidden reads 0; a Project run older than its folder's 6 newest archived elsewhere: Project stays listed, 0 Project reads in 12 s (the poll reads 6 per agent and folder; the archived run is not in the watched set) |

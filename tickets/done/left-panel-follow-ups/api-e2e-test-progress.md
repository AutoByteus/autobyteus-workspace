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
| 2026-11-06T09:33:07Z | round 2 | Started | | IR-002 code 1112f13de1, head 5731da6f95; reuse IMP-09..IMP-11 (PLN-01..11 incl. my PLN-11, probe unchanged); new API-06 read budget (Projects view now polls every run) |
| 2026-11-06T09:34:31Z | API-06 | Completed | Pass | seed 40/200/10 via API; window null p50 157.6 / p95 194.5 / max 302.4 ms; window 6 p50 146.8 / p95 169.6 ms; RB-C1..C4, RB-B1, RB-B2 Pass; load 17-28 |
| 2026-11-06T09:34:31Z | round 2 | Completed | Pass | API-03/API-04 reused from IMP-11 (PLN-01..11 on 1112f13de1); API-05 still valid (no build input changed since dda6ba59cf) |

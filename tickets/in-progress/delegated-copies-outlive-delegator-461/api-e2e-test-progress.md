# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-12 00:21 | build | Started | | server build on bc223a8ae0; then API-E01 baseline whole server E2E (log /tmp/api461/API-E01-baseline.log) |
| 2026-11-12 01:34 | API-E01 | Completed | Fail | baseline: Test Files 54 failed, 129 passed, 71 skipped (254); Tests 152 failed; triage next |
| 2026-11-12 01:34 | API-E02 | Started | | contract stories acceptance test, first run |
| 2026-11-12 02:40 | API-E02 | Checkpoint | | runs 1–8: test-harness fixes (file-authored Study Group, runOf/receiverSaw from run files, default launches, result kinds); known differences listed with reasons |
| 2026-11-12 03:05 | API-E02 | Completed | Fail | run 9 (`/tmp/api461/stories-run9.log`): 5.1 14/25 clean (S17 contract vs REQ-009, S18–S24 follow; S10/S11/S14 update_task result shape, test fixed after the run); 5.2 8/9 (U2 delivery text); 5.3 5/9 (O5 TC-12 refusal; O6–O8 follow) |
| 2026-11-12 03:10 | API-E03 | Started | | built-server faithful upgrade on hand-built data |
| 2026-11-12 03:35 | API-E03 | Completed | Pass | run 8 (`/tmp/api461/API-E03-run8.log`); runs 1–7 were test/fixture fixes (listing rule BEH-007, package logs, org record fields, restart resume of P) |
| 2026-11-12 03:40 | API-E01 | Started | | in-process suites with the composition stand-ins (token-usage, projects-graphql, recent-run-projection, run-projection-toolcalls, archive) |
| 2026-11-12 03:45 | API-E01 | Checkpoint | | 6 in-process files pass (`/tmp/api461/API-E01-inprocess-r1.log`, `-r2.log`) |
| 2026-11-12 03:46 | API-B01/B02 | Started | | stopped-delegator-views probe SDV-01…03 (`/tmp/api461/API-B01-run1.log`) |
| 2026-11-12 04:05 | API-B01/B02 | Checkpoint | | runs 1–2: probe signal fixed (agent activity from the run's own status); frames sent recorded |
| 2026-11-12 04:20 | API-B02 | Completed | Pass | run 3 SDV-01: the stream closed at Stop, the view reconnected (`/tmp/api461/sdv-ev3`) |
| 2026-11-12 04:30 | API-B01 | Completed | Fail | run 3 SDV-02 (F-2: message sent to the coordinator, team restored); run 4 SDV-03 (F-3: org inspection refused with a delegated child) |
| 2026-11-12 04:40 | report | Completed | Fail | execution report, revision record API-REV-001, evidence committed next |

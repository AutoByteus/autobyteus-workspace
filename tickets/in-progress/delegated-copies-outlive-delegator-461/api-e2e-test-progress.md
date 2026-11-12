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
| 2026-11-12 (round 2) | build | Completed | Pass | round 2 on `f75cf6b96b` (code `9f4709571b`): server prebuild + build (`/tmp/api461/r2-build.log`); contract states regenerated from the SR-054 model (`--check` matches) |
| 2026-11-12 (round 2) | API-E02 | Started | | all three stories, drivers for S17/S19/S25 and O5–O7 updated (`/tmp/api461/r2-stories-run1.log`) |
| 2026-11-12 (round 2) | API-E02 | Started | | rerun after a power-off interrupted run 1 (`/tmp/api461/r2-stories-run2.log`) |
| 2026-11-12 (round 2) | API-E02 | Completed | Fail | run 2 (`/tmp/api461/r2-stories-run2.log`): 5.2 9/9 Pass; 5.1 12/26 (F-6 delivery text S4/S7/S9; model notes S11, S17+ B workspace; test fix S14); 5.3 6/9 (O6/O7 F-7; O8 follows). Diagnostics: `/tmp/api461/r2-o6-ev` (debug run 3) |
| 2026-11-12 (round 2) | API-B01/B02 | Started | | desktop probe SDV-01…03 with the O-1 rendered-status samples (`/tmp/api461/r2-sdv-run1.log`) |
| 2026-11-12 (round 2) | API-B01/B02 | Checkpoint | | desktop: SDV-01 Pass (O-1 agent: shown stopped throughout), SDV-03 Pass ×3 (O-1 org: `bg-gray-300`), SDV-02 Fail 3 of 4 (F-8: message to the child cleared, never sent) (`/tmp/api461/r2-sdv-ev*`) |
| 2026-11-12 (round 2) | API-B01 phone | Started | | build:mobile-web, then mobile-shell probe `--cases=MSP-37,MSP-38,MSP-39` |
| 2026-11-12 (round 2) | API-B01 phone | Completed | Fail | MSP-37 Pass ×2 (agent root; O-1 `offline` throughout); MSP-38/39 Fail (F-10: a stopped team's/org's delegated worker is not listed on the phone) (`/tmp/api461/r2-msp-ev`; temporary probe copy with the base's duplicate MSP-32 renamed, deleted after) |
| 2026-11-12 (round 2) | API-E01 | Started | | whole server E2E with the round-2 test updates (`/tmp/api461/r2-E01-run1.log`) |
| 2026-11-12 (round 2) | API-E01 | Completed | Fail | whole suite (`/tmp/api461/r2-E01-run1.log`): Test Files 47 failed, 138 passed, 71 skipped (256); 9 files fixed since baseline; stale hosting-model files remain (Next Round under the updated skill) |
| 2026-11-12 (round 2) | API-E01 | Checkpoint | | file-explorer-websocket-lifecycle alone: 3/3 passed twice (not stale) |
| 2026-11-12 (round 2) | API-B01 phone | Completed | Fail | final run (`/tmp/api461/r2-msp-final`): MSP-37 Pass, MSP-38/39 F-10 |
| 2026-11-12 (round 2) | API-E03 | Completed | Pass | rerun on f75cf6b96b (`/tmp/api461/r2-API-E03.log`) |
| 2026-11-12 (round 2) | report | Completed | Fail | API-REV-002; stale rewrites Next Round per the updated skill |

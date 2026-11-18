# API/E2E Test Progress — update-restart-reliability (autobyteus-339)

Read this first when picking the run back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` § Planned Cases
- Run temp root: `/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ur339-api.vSYEoq`

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-31 09:59 | API-R1 | Completed | Pass | reused IMP-01..07: no code change since ddb03d0d0b |
| 2026-10-31 10:02 | API-00 | Checkpoint |  | clean @2c3575b0f0 and base @a977b2c1bc server builds OK |
| 2026-10-31 10:02 | API-02 | Started |  | held-connection probe, clean build |
| 2026-10-31 10:03 | API-02 | Checkpoint |  | sample 1: exit 0 1362 ms, conns closed +3 ms; cut create-runs: 2 completed unacknowledged, 1 PREPARED-ONLY left (activation admission closed) -> finding; adding restore step |
| 2026-10-31 10:03 | API-03 | Started |  | base contrast |
| 2026-10-31 10:04 | API-03 | Completed | Observed | base: silent conn held close -> bound 10583 ms exit 1; in-flight creates all succeeded; no leftovers |
| 2026-10-31 10:04 | API-02 | Checkpoint |  | sample 2 (API-02B) with restore step |
| 2026-10-31 10:05 | API-02 | Completed | Pass (AC-002) / FINDING | 2 samples: exit 0 in 1362/1610 ms, 0 survivors, silent+keep-alive closed +3/+6 ms; cut create-runs leave unacknowledged runs (1 then 3 prepared-only, listed, restorable) -> F-API-001 |
| 2026-10-31 10:05 | API-00 | Checkpoint |  | desktop build started |
| 2026-10-31 10:12 | API-00 | Completed | Pass | desktop build 6m54s; packaged server has SERVER_CLOSE_OPTIONS, app.asar has acceptIncompleteStopForInstall |
| 2026-10-31 10:12 | API-04 | Started |  | P-002 loop 42 iterations in /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ur339-api.vSYEoq/api04 (background); summary.txt there |
| 2026-10-31 10:47 | API-04 | Completed | Pass | 42/42 valid, 0 stalls, serverGoneMs 968-1602 (median 1378), all exits 0, 0 survivors, relaunch 1 server x42, continued 4/4 x42 |
| 2026-10-31 10:47 | API-01 | Started |  | 284 gated E2E on clean server build |
| 2026-10-31 10:47 | API-01 | Completed | Pass | 3 passed (busy-run-stop-now x2, native standalone host) |
| 2026-10-31 10:47 | API-05 | Started |  | desktop idle / busy-sigterm / wedged-quit |
| 2026-10-31 10:49 | API-05 | Completed | Pass | idle 258/308 ms; busy SIGTERM 872 ms exit 0; wedged force 20171 ms, 0 survivors; relaunch 1 server each |
| 2026-10-31 10:51 | API-06 | Completed | Not Tested | real install unsafe (ShipIt relaunch outside e2e profile) |
| 2026-10-31 10:51 | — | Completed | Fail | round result Fail (F-API-001 Design Impact); cleanup done |
| 2026-10-31 11:32 | round 2 | Started |  | IR-002 rerun plan in investigation § Round 2 |
| 2026-10-31 11:33 | API-00 | Checkpoint |  | R2 clean checkout /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ur339-api2.cFIEfA/clean @3be28563ea; server built |
| 2026-10-31 11:34 | API-02 R2 | Started |  | two samples, unmodified clean build |
| 2026-10-31 11:35 | API-02 R2 | Completed | Pass | 2 samples: creates before SIGTERM all 200 success with runId; 0 prepared-only, 0 unknown; exit 0 1606/1509 ms; post-SIGTERM ECONNRESET (destroyed on arrival) |
| 2026-10-31 11:35 | API-02T | Started |  | timing sample on dist with temporary [339-DIAG] (backups in /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ur339-api2.cFIEfA/diag-backup) |
| 2026-10-31 11:37 | API-02T | Completed | Pass | SIGTERM->cleanup start +86 ms with 3 in-flight (grace 69 ms); native no-in-flight +848 ms (native drain), idle +2 ms; dist restored |
| 2026-10-31 11:37 | API-01 R2 | Started |  | gated E2E |
| 2026-10-31 11:37 | API-00 | Checkpoint |  | R2 desktop build started |
| 2026-10-31 11:45 | API-01 R2 | Completed | Pass | 3 passed (an unrelated e2e run of another agent overlapped) |
| 2026-10-31 11:45 | API-00 | Completed | Pass | R2 desktop build 7m50s, hook present, no diag |
| 2026-10-31 11:45 | API-04 R2 | Started |  | P-002 loop 42 in /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ur339-api2.cFIEfA/api04 (background) |
| 2026-10-31 12:22 | API-04 R2 | Completed | Pass | 41 valid (iter 21 excluded: Org agent never started), 0 stalls, 986-1704 ms (median 1403), all exits 0, 0 survivors, relaunch 1 x41, continued 4/4 x41 |
| 2026-10-31 12:22 | API-05 R2 | Started |  | idle / busy-sigterm / wedged-quit |
| 2026-10-31 12:24 | API-05 R2 | Completed | Pass | idle 206/256 ms; busy SIGTERM 516 ms exit 0; wedged force 20193 ms 0 survivors; relaunch 1 each |
| 2026-10-31 12:25 | round 2 | Completed | Pass | API-REV-002 Pass 94.1%; cleanup done |

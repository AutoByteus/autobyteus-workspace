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

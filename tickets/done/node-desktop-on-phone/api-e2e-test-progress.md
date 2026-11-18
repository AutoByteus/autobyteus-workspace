# API/E2E Test Progress — autobyteus-407

Only add rows. Report: `api-e2e-execution-coverage-report.md`; planned cases: coverage investigation.

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-06T22:52:28Z | API-03 | Started | | /private/tmp/abx407-api/build.sh (fresh clone, server-package, install, desktop build) |
| 2026-11-06T22:52:28Z | API-01 | Completed | Pass | Reused IMP-S3-01/03/05/22/30/31, MP-001 |
| 2026-11-06T23:00:44Z | API-03 | Completed | Pass | server-package + desktop build from fresh clone; typecheck PASS |
| 2026-11-06T23:00:44Z | API-02 | Started | | server test:unit full (worktree) |
| 2026-11-06T23:11:56Z | API-02 | Completed | Pass | 938 files, 8030 passed, 0 failed |
| 2026-11-06T23:11:56Z | API-08 | Started | | browser 3 tabs + device B 5th |
| 2026-11-06T23:16:03Z | API-08 | Checkpoint | | browser part Pass (3rd tab + 5th device refused, Retry works, upstream unchanged); next desktop tile |
| 2026-11-06T23:17:19Z | API-08 | Completed | Pass | browser tabs + device B + desktop tile too-many/Retry; refused streams opened no upstream |
| 2026-11-06T23:19:51Z | API-04 | Started | | emulator AC-017 |
| 2026-11-06T23:21:36Z | API-04 | Completed | Pass | emulator AC-017 + Control after zoom |
| 2026-11-06T23:21:36Z | API-05 | Started | | Gboard keys via taps |
| 2026-11-06T23:23:22Z | API-05 | Completed | Pass | ab / teh (autocorrect off by design) / hello via suggestion / world via correction, each once |
| 2026-11-06T23:23:35Z | API-06 | Started | | Home / return |
| 2026-11-06T23:24:23Z | API-06 | Completed | Pass | Home -> closed ~1.2 s; return -> View only |
| 2026-11-06T23:24:23Z | API-07 | Started | | Phone Access off while streaming |
| 2026-11-06T23:25:44Z | API-07 | Checkpoint | | (a) Phone Access off Pass; doing CR-001 (API-09) before (b) revoke |
| 2026-11-06T23:25:44Z | API-09 | Started | | proxy stop -> new draft run -> menu; proxy start -> next run -> menu |
| 2026-11-06T23:29:12Z | API-09 | Completed | Pass | first availability 502 -> no entry; node back -> next run screen shows VNC Viewer, same pid |
| 2026-11-06T23:30:10Z | API-07 | Completed | Pass | Phone Access off 4.8 s, revoke 15.6 s; reopen refused both; on again reconnects |
| 2026-11-06T23:30:10Z | API-10 | Started | | browser probe rerun |
| 2026-11-06T23:30:32Z | API-10 | Completed | Pass | browser probe rerun done, all steps as expected |
| 2026-11-06T23:30:43Z | API-11 | Completed | Pass | 0 credential/marker hits |
| 2026-11-06T23:32:50Z | all | Completed | Pass | report + revision record; cleanup done |

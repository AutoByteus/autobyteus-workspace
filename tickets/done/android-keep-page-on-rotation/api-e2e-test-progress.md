# API/E2E Test Progress — autobyteus-415

Only add rows. Report: `api-e2e-execution-coverage-report.md`; planned cases: coverage investigation.

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-06T20:25:33Z | API-01 | Completed | Pass | Reused IMP-02…IMP-06 (dd129696a4; 51667e36cf ticket files only) |
| 2026-11-06T20:25:33Z | API-02 | Started | | connectedDebugAndroidTest on autobyteus277_api35 (emulator-5554) with the new MainActivityConfigurationChangeTest |
| 2026-11-06T20:41:01Z | API-02 | Completed | Pass | 13/13 on API 35 incl. new test; control: new test fails without configChanges |
| 2026-11-06T20:41:01Z | API-03 | Started | | Files view preview, proxy access log, watch, emu rotate |
| 2026-11-06T20:43:08Z | API-03 | Completed | Pass | Files preview kept 0->270->90->0; node: 0 requests during rotations (proxy verified live) |
| 2026-11-06T20:45:11Z | API-04 | Started | | picker up, rotating |
| 2026-11-06T20:45:44Z | API-04 | Completed | Pass | pick delivered after rotation; Context Files (1); page kept |
| 2026-11-06T20:46:20Z | API-05 | Started | | QR scanner baseline then with rotation |
| 2026-11-06T20:49:20Z | API-05 | Completed | Pass | scanner opened, rotated, cancel delivered to same MainActivity record; typed field cleared on cancel in baseline too (pre-existing) |
| 2026-11-06T20:49:41Z | API-06 | Started | | wm size resize with page open |
| 2026-11-06T20:50:19Z | API-06 | Completed | Pass | page kept through wm size and reset; insets follow the system's new nav bar |
| 2026-11-06T20:50:19Z | API-07 | Started | | dark mode toggle |
| 2026-11-06T20:51:10Z | API-07 | Completed | Pass | dark mode recreates (by design), reopens saved node page, paired; logcat relaunches only at control build + dark mode |
| 2026-11-06T20:52:00Z | API-08 | Started | | API 34: instrumented tests, then rotation journey |
| 2026-11-06T20:54:51Z | API-08 | Completed | Pass | API 34: 13/13 instrumented; page kept 0->270->90->0; insets per orientation; no relaunch (positive control) |
| 2026-11-06T20:56:13Z | all | Completed | Pass | report + revision record; cleanup done |

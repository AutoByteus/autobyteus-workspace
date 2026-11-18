# API/E2E Test Progress — autobyteus-432

Only add rows. Report: `api-e2e-execution-coverage-report.md`; planned cases: coverage investigation.

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-08T07:47:55Z | API-01 | Completed | Pass | Reused IMP-11/12/13 (6b05106fb0 = HEAD source) |
| 2026-11-08T07:47:55Z | API-02 | Started | | /private/tmp/abx432-api/build.sh |
| 2026-11-08T07:50:49Z | API-02 | Completed | Pass | builds ok; Android units 0 failures; permissions unchanged |
| 2026-11-08T07:53:31Z | API-04 | Started | | AC-001 |
| 2026-11-08T07:54:05Z | API-04 | Completed | Pass | AC-001 |
| 2026-11-08T07:54:05Z | API-06 | Started | | AC-003 Fill |
| 2026-11-08T07:55:02Z | API-06 | Completed | Pass | Fill 1.249, pan, Fit, pointer unchanged |
| 2026-11-08T07:55:02Z | API-05 | Started | | AC-002 exits |
| 2026-11-08T07:57:43Z | API-05 | Checkpoint | | attempt 1 invalid (uiautomator locked landscape); user_rotation reset to 0; rerun |
| 2026-11-08T08:00:29Z | API-05 | Completed | Pass | all exits portrait+bars; node list (real path + synthetic during full) |
| 2026-11-08T08:00:56Z | API-07 | Started | | AC-004 part A draft |
| 2026-11-08T08:04:25Z | API-07 | Checkpoint | | part A Pass; part B (local model message) next |
| 2026-11-08T08:08:31Z | API-07 | Completed | Pass | A: Home/return keeps full; kill -> portrait/home. B: checked kill -> restored URL full=1 drops to Home (route has no run); consistent; FU-002 |
| 2026-11-08T08:08:31Z | API-08 | Started | | AC-005 + CR-C-06 |
| 2026-11-08T08:13:15Z | API-08 | Completed | Pass | Keyboard; Send (portrait + full screen after lowering the keyboard); CR-C-06 copy in Chromium shows in the sheet in full screen and portrait |
| 2026-11-08T08:13:15Z | API-03 | Started | | instrumented via am instrument on emulator-5554 |
| 2026-11-08T08:13:54Z | API-03 | Completed | Pass | OK (11 tests) incl. 415 rotation test |
| 2026-11-08T08:14:10Z | API-09 | Started | | browser probe rerun |
| 2026-11-08T08:14:49Z | API-09 | Completed | Pass | browser full screen, Fill/Fit, exit follows (exitFullscreen fallback), handle, reload |
| 2026-11-08T08:16:30Z | API-10 | Started | | API 34 emulator (autobyteus277_api34, -wipe-data) |
| 2026-11-08T08:23:40Z | API-10 | Checkpoint | | Back key once stayed in full screen: Android's one-time "Viewing full screen" hint holds focus; reproduced with the hint flag reset; exits work after Got it or by the back gesture |
| 2026-11-08T08:25:10Z | API-10 | Completed | Pass | landscape + bars hidden, Fill/Fit, handle / Back / back gesture / View only tap → portrait + bars; auto-rotate on and off |
| 2026-11-08T08:25:40Z | API-11 | Started | | node logs |
| 2026-11-08T08:26:00Z | API-11 | Completed | Pass | no credentials, pairing data, typed or clipboard text; no server errors |
| 2026-11-08T08:28:00Z | API-12 | Started | | durable gap at scoring: new instrumented DesktopFullScreenWindowTest; API 35 emulator on 5554 |
| 2026-11-08T08:33:36Z | API-12 | Completed | Pass | 1/1 alone, 12/12 suite; fails on M1 (no bars hide) and M2 (no landscape request); source restored |

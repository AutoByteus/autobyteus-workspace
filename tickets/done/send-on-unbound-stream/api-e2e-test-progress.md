# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 22:42 | API-09 | Completed | Pass | guards |
| 22:42 | API-07 | Started | | send-delivery probe, rounds 20, at 41bba2c734 |
| 22:46 | API-07 | Completed | Pass | 12/12; 40 reconnect sends; notReady 0 |
| 22:46 | API-06 | Started | | stop-generation 40 gaps x2 kinds |
| 22:53 | API-06 | Completed | Pass | 80 sends after Stops, 0 stalls, 0 SESSION_NOT_READY |
| 22:53 | API-08 | Started | | whole mobile-shell at 41bba2c734 |
| 23:37 | API-08 | Completed | 86/87 pass (MSP-85..88 pass); MSP-41 fail (readsAfterSave 2, file watcher; fseventsd 156%) | rerun MSP-39..42 alone (API-08b) |
| 23:39 | API-08b | Completed | MSP-39,40,42 pass; MSP-41 fails again | known: autobyteus-458 FU-003 (Solution Designer journal 2026-11-17) |
| 23:39 | API-04 | Started | | whole server integration |
| 23:51 | API-04 | Completed | Pass for the changed scope; 4 fail in file-system-watcher (FSEvents, API-04b) | |
| 23:51 | API-05 | Started | | whole E2E |
| 01:41 | API-05 | Completed | 8 files failed (timeouts, AGY discovery, Grok catalog, node-locality) | rerun serially (API-05b) |
| 01:43 | API-05b | Completed | Pass | 8/8 files, 62/62 tests serially |

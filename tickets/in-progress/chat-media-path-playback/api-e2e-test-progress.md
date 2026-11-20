# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 17:08 | API-03/04 | Completed (trial) | MSP-91 Pass, MSP-92 Pass | /tmp/api572/msp-trial2; outside route failure has no Retry (finding) |
| 17:08 | API-05 | Started | | whole mobile-shell at 4adbafdf4d |
| 17:57 | API-05 | Completed | 90/91 (MSP-89..92 Pass); MSP-59 fail | rerun MSP-59 alone (API-05b) |
| 18:00 | API-05b | Completed | Pass | MSP-47,48,49,59 alone; FU-004 |
| 18:05 | API-03 | Completed | Fail | MSP-91 with Retry required outside: fails only on that |
| 18:38 | API-03 | Started (round 2) | | MSP-91 with the outside Retry tapped, code f2894c65e1 |
| 18:46 | API-03 | Completed (round 2) | Pass | MSP-91: outside Retry plays; inside Retry after the node serves again (404 for 2.5 s after restart; first attempt kept in /tmp) |
| 18:46 | API-05 | Started (round 2) | | whole mobile-shell |
| 19:35 | API-05 | Completed (round 2) | 90/91; MSP-41 fail (known 458 FU-003) | MSP-89..92 Pass |
| 19:35 | API-06 | Started | | whole server integration |
| 19:51 | API-06 | Completed | 86/89 files; 5 watcher (FSEvents), 2 timeouts pass alone (API-06b) | |
| 19:51 | API-07 | Started | | whole E2E |
| 21:52 | API-07 | Checkpoint | stopped at the 2 h limit after 143/283 files (8 with failures) | remaining 140 in two batches (API-07a, API-07b) |
| 22:04 | API-07 | Checkpoint | batch A 36 pass/1 fail, batch B 21 pass/1 fail | rerun the 10 failed files serially (API-07c) |
| 22:09 | API-07c | Completed | 8/10 pass; package live refresh (FSEvents) and provider-secret warm reads (timing) fail, outside the diff | |
| 22:10 | — | Checkpoint | | round 2 reports written; Pass 95.1% |

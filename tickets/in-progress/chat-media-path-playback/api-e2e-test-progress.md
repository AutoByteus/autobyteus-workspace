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

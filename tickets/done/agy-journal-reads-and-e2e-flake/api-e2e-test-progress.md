# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 09:0x | API-01 | Completed | Pass | JR-01..02 passed on the first run (load 63-78); fixture case `journal_reads` added first |
| 09:0x | API-02 | Completed | Fail (expected) | base production source: 2 of 2 runs fail on "the range read reads like view_file"; restored, status clean |
| 09:0x | API-01 | Completed | Pass | three more consecutive passes |
| 09:0x | UNIT, API-03 | Completed | Pass | 288 unit tests; the two earlier scripted-AGY files twice each |
| 09:1x | API-04 | Completed | Pass | five other in-process-server files solo |
| 09:1x | API-05 | Completed | Pass | six stalls (5/9/12 s over --help and models): all run starts succeeded, 0 probe-timeout lines |
| 09:2x | API-06 | Completed | Pass | typecheck baseline 1006 in 315 unchanged |

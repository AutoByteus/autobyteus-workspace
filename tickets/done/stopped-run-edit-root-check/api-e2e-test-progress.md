# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 11:5x | API-01 | Started | | built from `747f2ae65d` (code `79b268d2f9`); exploring the staging |
| 12:0x | API-01 | Checkpoint | Fail (test staging) | my first runs failed on my own staging: user message on the host's own stream wakes the host; copy two must come from another definition (a copy cannot delegate to its own team); the copy's report wakes the host again, so the host is crashed twice, and the switch marker is written by that wake, not by a later user message. Test rewritten each time, no product defect |
| 12:4x | API-01 | Completed | Pass | 3 consecutive passes |
| 12:5x | X-A, X-B, X-C | Completed | Fail (expected) | each mutation fails `copy two carries the SAVED model`; `dist/` restored with cmp |
| 12:5x | API-02 | Completed | Pass | 66 passed |
| 12:5x | API-03 | Completed | Pass | copy-contact-host e2e passed |

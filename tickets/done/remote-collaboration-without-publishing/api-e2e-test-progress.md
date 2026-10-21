# API/E2E Test Progress — autobyteus-245

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-10-21 06:03 | — | Checkpoint | — | E2E rewritten for no publishing (RC-03, RC-04, RC-05, RC-17, RC-20; harness: Codex missing on beta, team-local fixture, leftover published-agents.json) |
| 2026-10-21 06:03 | API-00 | Started | — | build at e5d0405aef |
| 2026-10-21 06:03 | API-00 | Completed | exit=0 | |
| 2026-10-21 06:03 | API-01 … API-20 | Started | — | run 1, evidence evidence/api-e2e/API-run1 |
| 2026-10-21 06:06 | API-01 … API-20 | Completed | Pass | run 1: 20/20 |
| 2026-10-21 06:06 | API-01 … API-20 | Started | — | run 2 |
| 2026-10-21 06:08 | API-01 … API-20 | Completed | Pass | run 2:  Tests 20 passed (20) |
| 2026-10-21 06:08 | API-21 | Started | — | same-node suites, switch on, log /tmp/api245-samenode.log |
| 2026-10-21 06:19 | API-21 | Completed | Pass (FU-003 of autobyteus-191, outside scope) | 36/37; failure identical to slice 1 |
| 2026-10-21 06:22 | API-22 | Completed | Pass | card rendered against a built node: no publish, availability note, no new setting; torn down |
| 2026-10-21 06:22 | — | Checkpoint | — | Result Pass / 95%. Next: commit, test-code review request |

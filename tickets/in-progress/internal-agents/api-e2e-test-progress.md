# API/E2E Test Progress — autobyteus-308

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 21:16 | API-00 | Completed | Pass | Reused IMP-01…04; diff 813f7208d2..692e884b77 = tickets only |
| 21:16 | API-01…05 | Started | — | internal-agents.e2e.test.ts |
| 21:18 | API-01…05 | Completed | Pass | 5/5 twice; mention refusal code is COLLABORATOR_ADD_FAILED (existing wrapping), test corrected |
| 21:24 | API-06 | Completed | Pass | two-server 38/38 incl. RC-26 and RC-38 |
| 21:24 | API-08 | Started | — | internal-agents-probe.mjs |
| 21:28 | API-08 | Completed | Pass | 5/5 run 3 (runs 1-2 probe harness fixes) |
| 21:29 | API-07 | Started | — | live LM Studio agent list_agent_definitions |
| 21:38 | API-07 | Completed | Not Tested (unreachable) | list_agent_definitions is never registered (pre-existing) → FU-001 |

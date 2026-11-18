# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-06 14:51 | API-01 | Started | | agent-runtimes-graphql e2e with AR-14 |
| 2026-11-06 14:53 | API-01 | Checkpoint | | run1: AR-14 Pass; AR-01/02/13 fail: stale 4-runtime list since autobyteus-387 added DeepSeek Harness (baseline, not this change). Baseline fix in the test; rerun file |
| 2026-11-06 14:53 | API-01 | Completed | Pass | run2 14/14 |
| 2026-11-06 14:53 | API-04 | Started | | other agent-runtime status E2Es (update notifications, running agents, available runtimes) |
| 2026-11-06 14:55 | API-04 | Completed | Pass | update-notifications 3/3, available runtimes 6/6 (+skips by gate), running-agents 4/4 after prepare |
| 2026-11-06 14:55 | API-02 | Started | | live dsh row (no model call) |
| 2026-11-06 14:56 | API-02 | Completed | Pass | 0.2.2-rc.1 installed and latest, UP_TO_DATE |
| 2026-11-06 14:56 | API-03 | Started | | isolated-app start --build (background), data root /tmp/ab393-api03 |
| 2026-11-06 15:03 | API-03 | Completed | Pass | dsh row 0.2.2-rc.1 Up to date; 4 other real CLIs unchanged; instance stopped, root removed |

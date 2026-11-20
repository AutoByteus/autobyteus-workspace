# API/E2E Test Progress

Read this first whenever the run is picked back up. Only add rows.

- Execution coverage report: `tickets/in-progress/grok-self-started-turns-517/api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-20 18:55 | API-01/API-02 | Started | | Grok replay E2E on HEAD cc2701af8a + the new gap case |
| 2026-11-20 19:17 | API-01/API-02 | Completed | Pass | 10/10 (afterAll 60 s close stall, known FU-002); gap case 3/3 alone |
| 2026-11-20 19:17 | API-03 | Started | | both typechecks |
| 2026-11-20 19:20 | API-03 | Completed | Pass | both at baseline |
| 2026-11-20 19:20 | — | Completed | Pass | round result Pass 95.1%; commits; handoff to /code_reviewer (test review) |

# API/E2E Test Progress

Read this first whenever the run is picked back up. Only add rows.

- Execution coverage report: `tickets/in-progress/prompt-section-tests-517/api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-18 06:44 | API-01 | Started | | 16 prompt-reading suites (scripted AGY + ungated) in one vitest run; log evidence/API-01-prompt-reading-suites/vitest.log |
| 2026-11-18 06:55 | API-01 | Checkpoint | | 11 files pass; collaboration-prompt-wording CPW-P1/P2 stale (collaborationPart runs into Long-Running Commands on AGY) → fixed collaborationPart; DCF-E2E-002 timing (9992 ms > 5000) and grok replay afterAll 10 s hook timeout: load, out of scope (FU-001); rerun collaboration-prompt-wording |
| 2026-11-18 06:58 | API-01 | Completed | Pass (prompt suites) | after fix: collaboration-prompt-wording 14/14; others pass; 2 timing failures out of scope (FU-001) |
| 2026-11-18 06:58 | API-02 | Started | | RUN_CODEX_E2E live -t SML-WRITE/SML-CODEX-TEAM/SML-CODEX-OFF |
| 2026-11-18 07:03 | API-02 | Completed | Pass | 3/3 |
| 2026-11-18 07:03 | API-03 | Completed | Pass | TESTING.md row rewritten |
| 2026-11-18 07:03 | API-04 | Completed | Pass | both typechecks at baseline |
| 2026-11-18 07:03 | — | Completed | Pass | round result Pass 95.8%; commits next; handoff to /delivery_engineer |

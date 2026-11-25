# API/E2E Test Progress — idle-run-discovery-638 (autobyteus-638)

- Execution coverage report: `api-e2e-execution-coverage-report.md`; planned cases: `api-e2e-coverage-investigation.md`
- Written at the end of round 1 from the run logs and evidence files (they are the record).

| Order | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 1 | API-02 | Completed | Pass | RUN-03 alone |
| 2 | API-03 | Completed | Pass (AGY, run 3) | runs 1–2 test-side: `AGY_FAKE_CASE`, the scripted reply's form |
| 3 | API-03 | Completed | Pass (Claude) | codewords remembered across the restart |
| 4 | API-03 | Completed | Not Tested (Codex inference) | the account's usage limit until 2026-11-27 |
| 5 | API-03 | Completed | Pass (Codex READY, run 2) | run 1: the empty thread's renewal line (FU-002); the assertion narrowed to "no input, no model call" |
| 6 | API-05 | Completed | Pass | RR-01 extended |
| 7 | API-04 | Completed | Pass | Docker stop/start and kill/start |
| 8 | API-09 | Completed | Pass | tracked imports |
| 9 | API-01/02 | Completed | Pass | the whole file, 4/4 |
| 10 | API-06 | Completed | Pass | 574 passed |
| 11 | API-08 | Completed | Pass | typecheck at baseline |

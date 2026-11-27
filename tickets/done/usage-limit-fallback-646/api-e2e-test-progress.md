# API/E2E Test Progress — usage-limit-fallback-646 (autobyteus-646)

- Execution coverage report: `api-e2e-execution-coverage-report.md`; planned cases: `api-e2e-coverage-investigation.md`
- Written at the end of round 1 from the run logs (the record).

| Order | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 1 | API-01 | Checkpoint | Setup failure | my concurrent typecheck rebuilt autobyteus-ts dist; rerun alone |
| 2 | API-01 | Checkpoint | 10/12 | UL-11 read only SEGMENT_CONTENT; UL-10's first form never made the run not quiet |
| 3 | API-02 | Completed | Pass | ULP-01, ULP-02 |
| 4 | API-01 | Checkpoint | UL-10 Pass (reworked), UL-11 filtered without UL-01 | order dependency stated |
| 5 | API-01 | Completed | Pass | 12/12 |
| 6 | API-03 | Completed | Pass (FU-646-05) | 575 passed; one teardown race at load 44–54; alone ×3 pass; the runtime_error suites pass |
| 7 | API-04 | Completed | Pass except MRD-04 | FU-646-04 |
| 8 | API-05, API-06 | Completed | Pass | fresh clone, imports |
| 9 | API-07 | Completed | Not Tested | no exhausted account |

# API/E2E Test Progress — private-github-packages-627 (autobyteus-627)

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` § Planned Cases
- Written at the end of round 1 from the evidence files' timestamps and the run logs (the cases' own logs are the record).

| Time (UTC, 2026-11-24) | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| first | API-01 | Completed | Pass | live client test, before the token's expiry |
| — | API-00 | Completed | Done | private repository shape: no package (probe deleted) |
| — | API-02 | Completed | Pass (run 3) | BS-L1: run 1 `.env`, run 2 `token=` scan narrowed |
| — | API-03 | Completed | Pass | BS-D1 on a test-owned Docker node |
| — | API-04 | Completed | Pass (run 3) | BS-E1: run 1 field name, run 2 the fixture served one commit |
| — | API-09 | Completed | Pass | secret gate over 9 commits |
| — | API-06 | Completed | Pass | probe after the fixture change |
| — | API-02/04 | Completed | Pass | one full run, 3/3 |
| 08:01 start | API-05 | Completed | Pass | 574 passed |
| — | API-07, API-08, API-10 | Completed | Pass | demo build, fresh clone, imports |

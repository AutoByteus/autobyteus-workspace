# API/E2E Test Progress — openai-gpt-6-1-terra (autobyteus-336)

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-30 12:54 | API-02 | Started | | probe: catalog, native run (API-03), Codex run (API-04) in one in-process server |
| 2026-10-30 12:56 | API-02 | Checkpoint | | run 1: catalog OK (alphabetical, terra listed), native and Codex runs answered; my cost query had 2 invalid fields -> run 2 |
| 2026-10-30 12:57 | API-02 | Completed | Pass | server catalog lists terra with limits and reasoning |
| 2026-10-30 12:57 | API-03 | Completed | Pass | native run: terra-ok, Green, audio refused; cost estimated 0.0101493 USD at terra prices |
| 2026-10-30 12:57 | API-04 | Completed | Pass | Codex run on terra: codex-terra-ok; cost estimated 0.008916 USD |

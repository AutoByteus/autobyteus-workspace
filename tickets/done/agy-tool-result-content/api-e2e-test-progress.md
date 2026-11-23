# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 18:0x | API-01 | Completed | Pass | server rebuilt from `dbfae1e493`; scripted NR-01..03 + arguments transport 8 passed |
| 18:1x | API-02 | Completed | Fail (expected) | base source: 5 of 8 fail (E-002b, NR-01, NR-02, NR-03 x2); restored, status clean |
| 18:2x | API-03 | Completed | Pass | live run 1: LN-01..04 (60 live read steps all recovered, 0 warnings) |
| 18:3x | API-03b | Completed | Fail (expected) | live LN-01 and LN-04 against the base source (rebuilt, then rebuilt again on the fix) |
| 18:4x | API-03 | Completed | Pass | live run 2: LN-01..05 (another 60 read steps, 0 warnings; large read recorded 46,474 bytes) |
| 18:5x | API-04 | Completed | Pass | unit 648, typecheck baseline 972 in 299, five regression e2e files 14 passed |
| 19:0x | API-03c | Completed | Pass | LN-06: asked for grep_search/find_by_name/view_file, the real agy used run_command and read_file only; evidence decision requested for the live grep/find proof |
| 19:3x | API-01b | Completed | Pass | DEC-10 received (Accepted Unverified Risk); fixture rows corrected to the stored shapes; scripted 4/4, unit 648 |

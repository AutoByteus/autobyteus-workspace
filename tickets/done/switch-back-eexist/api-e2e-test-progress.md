# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 19:3x | API-01, API-02 | Completed | Pass | server rebuilt from `4408d54504`; RS 9, MS 5, EX 5 passed |
| 19:4x | API-03 | Checkpoint | Fail (test) | first SB-01 run: my obstruct folder named segment 1, which already exists after hop 1; changed to segment 2 |
| 19:4x | API-03 | Checkpoint | Fail (test) | a beforeAll error from my Grok leftovers in the copied scaffold; removed |
| 19:4x | API-03 | Completed | Pass | SB-01..03 passed twice |
| 19:49 | X-A | Completed | Fail (expected) | all three SB cases fail with EEXIST when the `fs.rm` is removed from `dist/`; restored with cmp |
| 19:5x | API-04 | Completed | Fail (environment) | first live run: the Codex turn hit the account's usage limit (message names Nov 10th, 2026); not a product result |
| 20:0x | API-04 | Completed | Pass | live Antigravity → Claude → Antigravity (Claude as the other runtime), 33 s |
| 20:0x | X-B | Completed | Fail (expected) | live run with the `fs.rm` removed fails with EEXIST; restored with cmp |
| 20:1x | API-05 | Completed | Fail once, then Pass | DCM-009's final stop returned success false in the first combined run (private HOME); 9 further combined runs and the documented real-HOME run pass; cause not established, FU-1 |
| 20:2x | UNIT | Completed | Pass | Antigravity unit folder: 324 passed |

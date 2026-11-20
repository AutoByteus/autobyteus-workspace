# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 19:1x | API-01 | Checkpoint | Fail (test) | first runs failed on my own assertions: the schema read's result record carries no path (paired by tool_call_id instead); the journal words a `view_file` as `Command: cat <path>`, not `view_file` |
| 19:2x | API-01 | Completed | Pass | 5 consecutive passes |
| 19:2x | API-02 | Completed | Fail (expected) | base production source: 2 runs fail on "no line for the schema read"; a first run failed on an unrelated Antigravity model-discovery timeout |
| 19:3x | API-03 | Completed | Fail (cause found) | first combined run: dist/ not built (my miss, EC-05..07), AGY background-ownership discovery timeout under 31 parallel files (EC-03, restore-transport hook) |
| 19:4x | API-03 | Completed | Pass | after `pnpm build`, the two files alone: 8 passed |
| 19:4x | UNIT | Completed | Pass | journal + memory-search unit folders: 263 passed |

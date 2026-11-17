# API/E2E Test Progress

Read this first when picking the run back up. Only add rows.

- Execution coverage report: `tickets/in-progress/search-memory-default-tool-496/api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-17 06:45 | API-01, API-02, API-03 | Completed | Pass | Reused IMP-02, IMP-05, IMP-01 (code under test 5cdd6faf81 unchanged since) |
| 2026-11-17 06:45 | API-05, API-06 | Started | | scripted AGY: SEARCH_MEMORY_LIVE_E2E=agy, new suite tests/e2e/runtime/search-memory-default-tool-live.e2e.test.ts |
| 2026-11-17 06:47 | API-05, API-06 | Completed | Pass | 3/3 passed (SM-agy, SM-agy-list, SM-agy-upgrade); evidence/live/search-memory-agy.json |
| 2026-11-17 06:47 | API-05N | Completed | Pass | negative control: rule line removed -> 3/3 fail as expected; source restored |
| 2026-11-17 06:47 | API-07 | Started | | native AutoByteus DeepSeek flash, test vault |
| 2026-11-17 06:49 | API-07 | Completed | Pass | native DeepSeek: 1 passed (2 AGY-only skipped); evidence/live/search-memory-autobyteus.json |
| 2026-11-17 06:49 | API-08 | Started | | Claude Agent SDK haiku, host login |
| 2026-11-17 06:50 | API-08 | Completed | Pass | Claude: 1 passed; evidence/live/search-memory-claude.json |
| 2026-11-17 06:50 | API-09 | Started | | Codex gpt-6.1-terra medium, host login |
| 2026-11-17 06:51 | API-09 | Completed | Pass | Codex: 1 passed; evidence/live/search-memory-codex.json |
| 2026-11-17 06:51 | API-10 | Started | | Grok Build, host login |
| 2026-11-17 06:53 | API-10 | Completed | Not Tested | Grok 429 free-usage-exhausted for grok-4.7 (only model); account quota, rolling 24h |
| 2026-11-17 06:53 | API-04 | Started | | architecture tests + server typecheck + web typecheck with the new suite |
| 2026-11-17 06:56 | API-04 | Completed | Pass | arch 71/71; server tsc PASS 1012/1012 baseline; web tsc PASS 87/87 baseline; ungated suite skips |

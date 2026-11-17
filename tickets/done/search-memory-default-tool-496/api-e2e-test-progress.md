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
| 2026-11-17 07:13 | API-11 | Completed | Fail (reproduced) | release a8ac226e65: configured-skill-on-demand-loading.e2e alone: 1 failed / 3 passed, search_memory extra |
| 2026-11-17 07:13 | API-12 | Started | | full server test:integration on a8ac226e65 to find stale exact tool lists |
| 2026-11-17 07:37 | API-12 | Completed | Pass (exposure) | test:integration: 11 failures, all watcher timing (package-auto-refresh, file-system-watcher) under load avg 58-236 / fseventsd 135-176%, not exposure; backend-factory integration passed only because its registry lacked memory tools |
| 2026-11-17 07:37 | API-13 | Completed | Pass | fixed configured-skill e2e, project-task-boundaries e2e (beforeAll failed on search_memory), backend-factory integration: 22/22 + 4/4 |
| 2026-11-17 07:37 | API-14 | Started | | full ungated server E2E (pnpm test:e2e) on release branch + fixes |
| 2026-11-17 07:42 | API-15 | Completed | Pass | gated codex-agent-tools-empty-list (RUN_CODEX_E2E=1, no model): 1 passed; its own catalog has no memory adapter, enabled_tools [] still valid. Gated suites with exact lists: others use arrayContaining |
| 2026-11-17 07:42 | (aborted) | Completed | Not Tested | release_smoke.py --help started a real smoke run by mistake (no --help flag); terminated after ~2 min, no result used |
| 2026-11-17 07:54 | API-16 | Completed | Pass | server typecheck 1012/1012 baseline; web typecheck 87/87 baseline |
| 2026-11-17 07:54 | API-14 | Started | | pnpm test:e2e (all ungated server E2E) on 8af6082a52 |
| 2026-11-17 08:39 | API-14 | Completed | Fail (not exposure) | pnpm test:e2e: 17 failed / 543 passed / 672 skipped; 0 failures mention search_memory or a tool list; all timeouts or built-server exits under load avg 49-106; dist rebuilt mid-run 08:20 |
| 2026-11-17 08:39 | API-14R | Started | | rerun of the 15 failed E2E files one at a time (--no-file-parallelism) |
| 2026-11-17 08:48 | API-14R | Completed | Pass (exposure) | 10/15 files pass alone; 5 still fail on timing: server stop >15 s (team-run-v1 upgrade, qwen), afterAll 10 s < stop 15 s (provider-secret-lifecycle, and test-vault-selection which reruns it), NAS-01 5 s timeout, live-refresh watcher wait; none reach the exposure rule, the only src change since beta.7 |
| 2026-11-17 08:48 | API-17 | Started | | python3 scripts/release_smoke.py on 8af6082a52 (grok waived) |
| 2026-11-17 08:57 | API-17 | Completed | Fail (not ours) | smoke on 8af6082a52: autobyteus 2/2 and no configured-skill failure (fixed); claude 3/3, codex 3/3, agy 2/2; grok 429 (waived); other: agy-linked-skills-transport afterAll 60 s hook timeout (E01 29.8 s vs 3.6 s alone); worktree-unchanged FAIL caused by my evidence writes during the run |
| 2026-11-17 08:57 | API-17A | Completed | Pass | agy-linked-skills-transport alone: 10/10, tests 43.3 s (smoke step 109 s) |
| 2026-11-17 08:57 | API-18 | Started | | release smoke rerun on a clean tree |

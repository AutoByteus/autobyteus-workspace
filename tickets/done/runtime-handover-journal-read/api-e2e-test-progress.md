# API/E2E Test Progress

| Time | Case | Status | Result | Notes |
| --- | --- | --- | --- | --- |
| 2026-11-21 08:46 | API-02 | Started | | live probe, Codex |
| 2026-11-21 08:47 | API-02 | Completed | Pass | Codex: first call cat of work_journal_000001.md (2,405 lines), all 7 markers incl. END in tool results before its first text |
| 2026-11-21 08:47 | API-03 | Started | | live probe, Claude |
| 2026-11-21 08:50 | API-03 | Started | | live probe claude_agent_sdk sonnet (sonnet) |
| 2026-11-21 08:51 | API-03 | Completed | see summary | claude_agent_sdk sonnet (sonnet), exit 0 |
| 2026-11-21 08:51 | API-03 | Started | | live probe claude_agent_sdk haiku (haiku-2) |
| 2026-11-21 08:53 | API-03 | Completed | see summary | claude_agent_sdk haiku (haiku-2), exit 0 |
| 2026-11-21 08:53 | API-04 | Started | | live probe autobyteus default (default) |
| 2026-11-21 08:53 | API-04 | Completed | see summary | autobyteus default (default), exit 0 |
| 2026-11-21 08:53 | API-02 | Started | | live probe codex_app_server default (run-2) |
| 2026-11-21 08:56 | API-02 | Completed | see summary | codex_app_server default (run-2), exit 0 |
| 2026-11-21 08:56 | API-02..04 | Completed | Pass with a recorded runtime follow-up | Codex x2 and native 7/7 markers before the reply; Claude Agent SDK x3 (haiku x2, sonnet) read the start and the end and skipped the middle (Read returns ~610-624 lines per call) -> follow-up |
| 2026-11-21 08:56 | API-05 | Started | | server test:unit |
| 2026-11-21 09:20 | API-05 | Completed | Pass for this change | 8633 passed, 1 failed: claude-provider-turn-race (fixed settle budget; passes alone 3/3 and in its folder 2/2; outside the change's import reach) -> FU-002 |
| 2026-11-21 09:20 | API-06/07 | Started | | integration, then root test:e2e |
| 2026-11-21 10:06 | API-06 | Completed | Pass for this change | 509 passed, 5 file-system-watcher ENVIRONMENT/INCONCLUSIVE |
| 2026-11-21 10:06 | API-07 | Checkpoint | | 119 passed / 9 failed files; rerunning one at a time |
| 2026-11-21 10:10 | API-07 | Completed | Pass for this change | 119 passed / 9 failed; one at a time 5 pass; mcp-bulk-import and project-task-search pass alone 2/2 each; node-files, node-locality host timing -> FU-003 |
| 2026-11-21 10:11 | Round 1 | Closed | Pass | report, API-REV-001; to delivery |

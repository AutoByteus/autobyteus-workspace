# API/E2E Test Progress

Your own progress log while tests run. Rows only added, never changed.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` (Planned Cases)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-30T10:31:28Z | API-02/API-03 | Started | — | new E2E file, first run |
| 2026-10-30T10:37:11Z | API-02/API-03 | Checkpoint | — | first run 3 failures were in my test assumptions (user-installed tool heads, Grok has no skill case, snippet position); test fixed, 5/5 pass. Mutations A (Rebuild flag off) fails the Rebuild case; B (fingerprint without revision) fails the catch-up case; C (skill rule off) fails 3 build cases. Sources restored (git clean). Power loss interrupted session here; resumed. |
| 2026-10-30T10:37:31Z | API-02/API-03 | Started | — | final run on clean source, evidence log |
| 2026-10-30T10:38:12Z | API-02/API-03 | Completed | Pass | 5/5, evidence API-02-03 log + API-02-entry-heads/ ; mutations A-D each fail the matching cases |
| 2026-10-30T10:38:12Z | API-01 | Started | — | journal + memory-search unit suites |
| 2026-10-30T10:39:05Z | API-01 | Completed | Pass | 25 files / 236 tests passed, 2 gated files skipped; log API-01 |
| 2026-10-30T10:39:17Z | API-04 | Started | — | scripted AGY restore-transport suite |
| 2026-10-30T10:40:00Z | API-04 | Checkpoint | Fail→fixed | first run failed at line 132: expected header 'Runtime Antigravity ·', header reads 'Runtime Antigravity CLI ·' (label from agentRuntimeName since autobyteus-320 commit 2b53fd8ad3, before this ticket; renderer header untouched here). Stale gated test; one-line baseline fix; rerun that test only. |
| 2026-10-30T10:40:22Z | API-04 | Checkpoint | Fail→fixed | first run failed at :132 expecting header 'Runtime Antigravity ·'; header reads 'Runtime Antigravity CLI ·' (label from agentRuntimeName since autobyteus-320 commit 2b53fd8ad3, before this ticket; header untouched here). Stale gated test; one-line baseline fix; rerun that test only. |
| 2026-10-30T10:40:40Z | API-04 | Completed | Pass | 1/1 after one-line baseline fix of the test's header label; evidence API-04 log |
| 2026-10-30T10:41:17Z | API-05 | Started | — | new gated scripted-AGY test: send_message_to /nobody + get_handoff_rules |
| 2026-10-30T10:45:20Z | API-05 | Completed | Pass | gated scripted AGY (mcp_calls) 1/1: platform tools neutral, shape-test server tools stay Tool: (via); evidence API-05 log + folder |
| 2026-10-30T10:46:17Z | API-06 | Started | — | gated live Claude (RUN_CLAUDE_E2E=1) work-journal-live-runtimes; real HOME/USER/LOGNAME; test-owned server data dir |
| 2026-10-30T10:47:13Z | API-06 | Completed | Pass | live Claude 1/1 (31 s), real records rendered with revision 2 |
| 2026-10-30T10:47:21Z | API-07 | Started | — | gated live Codex (RUN_CODEX_E2E=1) work-journal-live-runtimes |
| 2026-10-30T10:47:48Z | API-07 | Completed | Pass | live Codex 1/1 (13 s) |
| 2026-10-30T10:49:35Z | ALL | Completed | Pass | report, revision record written; handoff next |

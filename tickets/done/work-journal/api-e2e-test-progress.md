# API/E2E Test Progress — Work Journal

- Execution coverage report: api-e2e-execution-coverage-report.md
- Planned cases: api-e2e-coverage-investigation.md "Planned Cases"

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-19 | API-01 | Completed | Pass | Reused IMP-01, IMP-02, IMP-04–IMP-11: `git diff --name-only 8f5bb563b1 c13882fa41` lists ticket docs only; IR-002 (text-diff.ts) covered by IMP-02 at 8f5bb563b1 |
| 2026-10-19 | API-02 | Started | — | `pnpm -C autobyteus-server-ts build`, then `pnpm test:e2e` (background) |
| 2026-10-19 | API-05 | Started | — | new restore-transport E2E (scripted AGY) |
| 2026-10-19 | API-05 | Completed | Pass | run 1 failed on a test defect (the scripted messages contain "compaction"); assertion narrowed to non-message lines and marker links; run 2 pass |
| 2026-10-19 | API-07 | Started | — | new built-startup migration E2E |
| 2026-10-19 | API-07 | Completed | Pass | 1/1, 5.8 s |
| 2026-10-19 | API-03a | Started | — | live suite, AutoByteus on LM Studio only (RUN_LMSTUDIO_E2E=1) |
| 2026-10-19 | API-03a | Completed | Pass | runs 1–2 failed on a test defect (multi-line message starts on the line after `User:`); assertion fixed; run 3 pass; P1: 24 raw records on disk at TURN_COMPLETED incl. assistant DONE = final count |
| 2026-10-19 | API-02 | Completed | Fail→Pass | suite: 360 pass, 2 fail. AOML-1: stale assertion ("conversion registered last") made stale by this ticket's new migration → test updated, file passes alone. AE-006 gemini pricing: "table token_usage_run_records does not exist" in the shared test DB; untouched by this ticket; passes alone 5/5 → suite-order flake, not this ticket |
| 2026-10-19 | API-03b/API-04 | Started | — | live suite, Claude (haiku) incl. /compact; RUN_CLAUDE_E2E=1 |
| 2026-10-19 | API-03b/API-04 | Completed | Pass | claude-haiku-4-5; 4 tool entries (Command, Command cat -n, Write file, Edit file); /compact closed 000001, unchanged after the AFTER turn |
| 2026-10-19 | API-03c | Started | — | live suite, Codex; RUN_CODEX_E2E=1 |
| 2026-10-19 | API-03c | Completed | Pass | gpt-5.6-luna; the model used shell for all four steps → 4 Command entries (incl. cwd) |
| 2026-10-19 | API-03d | Started | — | live suite, AGY (host login); RUN_AGY_E2E=1 |
| 2026-10-19 | API-03d | Completed | Pass | gemini-3.8-flash-low; Command ls, Command cat (content not recorded: size only, per contract view_file row), Write file, Edit file |
| 2026-10-19 | API-03e | Started | — | live suite, Grok, temp GROK_HOME; RUN_GROK_E2E=1 |
| 2026-10-19 | API-03e | Completed | Blocked | Grok account: 429 subscription:free-usage-exhausted (grok-4.7, rolling 24 h). Run 1 waited out the step timeout; helper changed to stop at ERROR and print its payload; run 2 shows the 429 in 5 s. Rendering covered by IMP translation tests on recorded Grok traces |
| 2026-10-19 | API-06 | Started | — | skill improvement E2E, LM Studio; RUN_LMSTUDIO_E2E=1 |
| 2026-10-19 | API-06 | Completed | Pass | trigger lists manifest, root, active file; improver first call read_file on the listed work_journal_manifest.json; target journal re-rendered at start after removal |
| 2026-10-19 | API-03a | Started | — | rerun on the final test file (ERROR fail-fast helper added after API-03a–d) |
| 2026-10-19 | API-03e | Decision | Not Tested | user decision: Grok left out of this ticket's live testing (free account); Grok case removed from the live suite |
| 2026-10-19 | API-03f | Started | — | AutoByteus on DeepSeek (deepseek-v4-flash), key from the user .env into the test-owned vault; final test file |
| 2026-10-19 | API-03f | Completed | Pass | deepseek-v4-flash, 6 s; Command ls, Command cat -n, Write file, Edit file, Agent DONE; P1: 15/15 raw records on disk at TURN_COMPLETED; key absent from logs and evidence |
| 2026-10-19 | API-06 | Started | — | rerun on DeepSeek (final test file) |
| 2026-10-19 | API-06 | Completed | Pass | DeepSeek rerun on the final file: trigger lists manifest/root/active; improver read_file on the listed manifest; key absent from logs |
| 2026-10-19 | API-03b/API-03c | Started | — | Claude + Codex rerun on the final test file (shared vault setup and ERROR fail-fast added since) |
| 2026-10-19 | API-03b/API-03c | Completed | Pass | final file: Claude /compact case 29 s, Codex 13 s |
| 2026-10-19 | API-03a | Stopped | — | LM Studio final-file rerun stopped by the user before a result; incomplete log removed; superseded by API-03f (DeepSeek, final file) |
| 2026-10-19 | API-03c | Started | — | round 2 (CRR-004): rerun on f0ff3a8671, which merges origin/personal with Codex backend changes (codex-thread, thread-manager, segment-turn admission) |
| 2026-10-19 | API-03c | Completed | Pass | round 2 on f0ff3a8671: gpt-5.6-luna, 5 calls = 5 Command entries (a failed macOS sed -i, then a python edit), out.txt == beta |

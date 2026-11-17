# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-17 17:25 | SETUP | Started | — | base worktree `native-tool-search-515-base` at 4cbf9e7881: install + builds (background; log /tmp/nts515/base-setup.log) |
| 2026-11-17 17:40 | SETUP | Completed | Pass | base install + autobyteus-ts + server builds EXIT=0 |
| 2026-11-17 17:41 | API-01 | Started | — | branch full `pnpm -C autobyteus-ts test`, env -i temp HOME; log /tmp/nts515/API-01-branch.log; next: same on base |
| 2026-11-17 17:24 | API-01 | Checkpoint | — | branch done: 4 failed / 2480 passed (run-bash, run-bash-wrapper heredoc, native-command-process-scope ×2); load 85→97 |
| 2026-11-17 17:26 | API-01 | Checkpoint | — | base full suite started; log /tmp/nts515/API-01-base.log; then cause search |
| 2026-11-17 17:28 | API-01 | Completed | Pass | base 9 failed (all terminal) vs branch 4 (all terminal); cause = 1500 ms launch deadline under load, probe 30/60 branch, 60/60 base; FU-003 updated |
| 2026-11-17 17:29 | API-02 | Started | — | server watcher files alone, branch then base |
| 2026-11-17 17:31 | API-02 | Completed | Pass | branch 2 failed/25, base 2 failed/25, same timeouts; fs.watch events 2.5-5.5 s or none in 15 s (fseventsd backlog) |
| 2026-11-17 17:32 | API-04 | Started | — | new server E2E autobyteus-native-tool-search.e2e.test.ts alone |
| 2026-11-17 17:36 | API-04 | Completed | Pass | 1 passed; mutation (server passes null) caught; server typecheck PASS, baseline 1012/316 unchanged; FU-005 added |
| 2026-11-17 17:38 | API-03 | Started | — | test:integration:prepare + test:integration (background, /tmp/nts515/API-03.log) |
| 2026-11-17 17:47 | API-03 | Completed | Pass | 491 passed, 14 failed: 13 watcher timeouts + 1 HTTP-contract timeout; base fails the same file; cause fseventsd backlog (fs.watch close blocks main thread 1.8 s) |
| 2026-11-17 17:48 | API-05 | Started | — | whole pnpm test:e2e, env -i (background, /tmp/nts515/API-05.log) |
| 2026-11-17 18:45 | API-05 | Checkpoint | — | whole run done: 536 passed, 25 failed in 22 files (timeouts, perf limits, server start); none sends a native message; rerunning each failing file alone on branch (/tmp/nts515/API-05-rerun-branch.log) |
| 2026-11-17 19:29 | API-05 | Completed | Pass | all failures traced: shutdown >10 s / hook & test timeouts (both builds, intermittent), watcher events (FSEvents), perf limits under load, dsh on PATH (FU-006); FU-007 added; new tool-search E2E passed inside the whole run |
| 2026-11-17 19:30 | API-06b | Started | — | gated background-task transport suite (native, scripted model; calls searchable tools directly) |
| 2026-11-17 19:45 | API-06b | Completed | Pass | 8/9; BGT-09 fails the same on base; cause: root view sends no per-agent records the test reads (FU-008) |
| 2026-11-17 19:46 | API-07 | Started | — | live native-tool-search suite, 8 default models, record /tmp/nts515/API-07-record.jsonl |
| 2026-11-17 19:51 | API-07 | Completed | Pass | 7/7 reachable called_correctly, identical tools; Kimi refused (billing), Gemini AI Studio key invalid (skip) |
| 2026-11-17 19:52 | API-08 | Started | — | evaluation old (base root) then new (branch root), pm+da, reps 2; /tmp/nts515/API-08-{old,new}.json |
| 2026-11-17 20:10 | API-08 | Completed | Pass | first request PM −5,096, DA −5,722; 23/24 each; da-download failures = stub without extension (fixed in script); fixed stub x4: old 4/4, new 4/4 |
| 2026-11-17 20:11 | API-09 | Started | — | K-2 APC live suite (Anthropic Opus 5.5, strict harness), evidence dir /tmp/nts515/API-09 |
| 2026-11-17 20:18 | API-09 | Completed | Pass | 7/7; APC-004 tools unchanged, thinking kept (7 blocks), cache read 39,258; APC-008 control 400 |
| 2026-11-17 20:19 | API-10 | Started | — | K-2 CCR live suite (Opus + Gemini Vertex), evidence /tmp/nts515/API-10 |
| 2026-11-17 20:26 | API-10 | Completed | Pass | 4/4; CCR-002 toolsChanged false, 14 thinking blocks kept, cache share 0.957, strict 200 |
| 2026-11-17 20:27 | API-11 | Started | — | live-tool-list-updates on autobyteus + deepseek-v4-flash, evidence /tmp/nts515/API-11 |
| 2026-11-17 20:28 | API-11 | Checkpoint | — | run 1 failed: suite never opened the test vault (no key); app restarted (v1.5.13-beta.9) mid-diagnosis; suite updated to open the vault |
| 2026-11-17 20:33 | API-11 | Completed | Pass | run 2 passed: search→list_projects, notice→search→list_project_tasks, removed tool not found |
| 2026-11-17 20:34 | API-12 | Started | — | search-memory-default-tool-live SEARCH_MEMORY_LIVE_E2E=autobyteus (DeepSeek) |
| 2026-11-17 20:36 | API-12 | Completed | Pass | SM-autobyteus passed; search_memory found and called; no call_tool in history |
| 2026-11-17 20:37 | API-13 | Started | — | upgrade-restore probe: DeepSeek, Gemini, Sonnet |
| 2026-11-17 20:45 | API-13 | Completed | Pass | 3/3 restored with new split, identical tools, both tasks succeed, 0 errors |
| 2026-11-17 20:46 | CLEANUP | Completed | — | base worktree removed; no processes left |
| 2026-11-17 20:50 | API-14 | Started | — | web segmentHandler case for a call_tool card |
| 2026-11-17 20:55 | API-14 | Completed | Pass | 23/23; web typecheck PASS (87/37) |

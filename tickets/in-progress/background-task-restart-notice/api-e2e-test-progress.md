# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-17 11:51 | setup | Completed | Pass | `test:integration:prepare` at `79d1f803e4` (code `d5e9f350cf`), node 22.23.1: exit 0; dist stamp 1.5.13-beta.8 |
| 2026-11-17 11:53 | API-01 | Started | | server test:integration, log /tmp/api448/API-01.log |
| 2026-11-17 12:11 | API-01 | Completed | Fail (environment) | 13 failures in two file-watcher files; rerun alone 18 failed at load 148-187; cause: fseventsd saturated (163% CPU), plain fs.watch 1.2-2.6 s and one >20 s; no import of changed code; retry later when calmer |
| 2026-11-17 12:11 | API-05..11 | Started | | restart-reminder-built-server suite RR-01..06 (no live) |
| 2026-11-17 12:24 | API-05..11 | Checkpoint | | debug runs: AUTOBYTEUS_SERVER_HOST in .env; previous-release copy links node_modules (prisma migrate); RR-02 must wait for the idle+task entry before the kill (killed inside the 2 s window it recorded the mid-turn state: designed staleness); RR-06 reads the echo from the projection; RR-04 run 1 hit "Command did not start: Command control deadline exceeded" (FU-003 of autobyteus-333 under load ~100), test now requires the task in the entry; RR-01..06 each passed once |
| 2026-11-17 12:24 | API-12 | Started | | base worktree api448-base-4cbf9e7881: pnpm install + server build |
| 2026-11-17 12:31 | API-12 | Completed | Pass (before shown) | base: no record, no reminder, no wake for RR-01/02/03; evidence/API-12-before-base/ |
| 2026-11-17 12:31 | API-05..11 | Started | | authoritative run RR-01..06 on the final test code |
| 2026-11-17 12:39 | API-05..11 | Checkpoint | | final run 1: RR-05 hit the same start-under-load failure (precondition, not the case); added the start precondition check; RR-05 alone Pass (wake first, input carried nothing) |
| 2026-11-17 12:39 | API-05..11, API-13/14 | Started | | authoritative full run incl. live RR-07 (Claude haiku) and RR-08 (Codex gpt-6.1-terra) |
| 2026-11-17 12:48 | API-05..11, API-13/14 | Completed | Pass | all 8 cases passed on the final test code (see evidence/API-05-14-restart-suite/vitest-results.log for each passing run); env failures under load recorded |
| 2026-11-17 12:48 | API-17 | Started | | server typecheck |
| 2026-11-17 12:50 | API-17 | Completed | Pass | server: production 0, tests 1012 = baseline; web: production 0, tests 87 = baseline |
| 2026-11-17 12:50 | API-03 | Started | | DRO E2E (delegated-runs-own-runs-startup) |
| 2026-11-17 12:52 | API-03 | Completed | Pass | DRO 3/3 |
| 2026-11-17 12:52 | API-04 | Started | | busy-run-stop-now E2E |
| 2026-11-17 12:52 | API-04 | Completed | Pass | 2/2 |
| 2026-11-17 12:54 | API-15 | Started | | isolated-app start --build (test vault) |
| 2026-11-17 13:15 | API-15 | Completed | Pass | desktop: Restart server IPC and full app relaunch both cause "restart"; agent acts on the reminder; FU-002 (doubled card) observed |
| 2026-11-17 13:19 | API-06 | Checkpoint | | RR-02 survivor evidence: command alive 13 s after the forced kill while the reminder says it was stopped (F-1) |
| 2026-11-17 13:19 | API-01 | Checkpoint | | watcher retry not possible: fs.watch still 1-11 s / timeouts at load 112-199 |
| 2026-11-17 13:19 | cleanup | Completed | | base worktree removed; no previous-release copies, data roots or tagged processes left; isolated instance stopped |
| 2026-11-17 14:04 | round 2 | Started | | rerun after IR-002 (DEC-008, b78555d7bb); HEAD 92f4a1b3a6; rebuilding server |
| 2026-11-17 14:07 | API-18 (RR-09) | Completed | Pass | live native gpt-5.4-mini after SIGKILL: reminder has the DEC-008 line; agent ran ps -p <pid>; "Yes — process 19048 is still running." |
| 2026-11-17 14:07 | API-05..10, API-13/14, API-18 | Started | | round-2 full rerun RR-01..09 on dist of 92f4a1b3a6 (code b78555d7bb) |
| 2026-11-17 14:15 | API-05..10, API-13/14, API-18 | Completed | Pass | round 2: all 9 passed on dist of 92f4a1b3a6 (full run + RR-01/RR-07 retries: start deadline under load; Claude haiku skipped the tool once and said so) |
| 2026-11-17 14:15 | API-03, API-17 | Started | | DRO rerun; server and web typecheck |
| 2026-11-17 14:20 | API-03, API-17 | Completed | Pass | DRO 3/3; server typecheck 1012 = baseline; web typecheck 87 = baseline |
| 2026-11-17 14:20 | API-01 | Checkpoint | | fs.watch still [853,5360,7124,timeout>20000,5178] at load 85: watcher files not retried |
| 2026-11-17 14:22 | round 2 | Completed | Pass | report, revision record API-REV-002, investigation round-2 plan written |

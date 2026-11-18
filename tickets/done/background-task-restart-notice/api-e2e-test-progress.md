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
| 2026-11-17 17:23 | part 2 | Started | | part 2 validation at 4c93deaa8f (code ce06c415cc); P2-01 server unit full started |
| 2026-11-17 17:41 | P2-01 | Completed | Pass for this change | 8244 passed, 5 failed: 4 folder-watcher (FU-001, fseventsd), 1 AGY capability spawn timed out at 5 s under load (passes alone 48/48; no changed code imported) |
| 2026-11-17 17:41 | P2-02 | Started | | prepare + server test:integration |
| 2026-11-17 17:51 | P2-02 | Completed | Fail (environment) | 86 files pass; 13 failures only in the two file-watcher files; probe fsWatchLatencyMs":["timeout>20000",240,2981,2631,5441] |
| 2026-11-17 17:51 | P2-03 | Started | | web test:nuxt run (full) |
| 2026-11-17 18:06 | P2-03 | Completed | Pass | 757 files, 5692 tests |
| 2026-11-17 18:06 | P2-04 | Completed | Pass | guards |
| 2026-11-17 18:06 | P2-07 | Started | | BTS-01..03 scripted |
| 2026-11-17 18:15 | P2-08 | Started | | TS-008 desktop probe |
| 2026-11-17 18:17 | P2-08 | Checkpoint | | TS-008 Pass; building the phone bundle for MSP-59 |
| 2026-11-17 18:20 | P2-08 | Completed | Pass | TS-008 Pass; MSP-59 Pass (phone bundle rebuilt) |
| 2026-11-17 18:20 | P2-09 | Started | | changed probes: interrupt-result-presentation, background-contention, agent-org-draft-retention |
| 2026-11-17 18:28 | P2-09 | Checkpoint | | all three changed probes failed (harness/fixture errors); base worktree api448-p2base-895cf3992d to compare |
| 2026-11-17 18:32 | P2-09 | Completed | Fail (pre-existing) | identical failures on base 895cf3992d for all three; FU-008 |
| 2026-11-17 18:32 | P2-05 | Started | | pnpm test:e2e (server E2E, full), log /tmp/api448c/P2-05.log |
| 2026-11-17 19:38 | P2-05 | Checkpoint | | 9 files still fail alone; built-server stops: head stop-probe 1.2/3.3/19 s (exit 0); building pre-ticket base 4cbf9e7881 to compare |
| 2026-11-17 19:53 | P2-05 | Completed | Pass for this change | 110 pass; 1 stale assertion this ticket made untrue fixed (correlated-status) and passing; 4 pass alone (load); rest identical on base 4cbf9e7881 or load (FU-009) |
| 2026-11-17 19:53 | P2-06 | Started | | fresh clone /tmp/api448c/fresh at 4c93deaa8f; frozen install; release checks; build:electron:mac arm64; verify steps |
| 2026-11-17 20:23 | P2-06 | Completed | Pass | fresh clone: frozen install, hygiene, licensing, mac arm64 build (typecheck+guards inside), prisma and terminal verify steps all 0; server image linux/arm64 built from fresh context; amd64 and signing Not Tested |
| 2026-11-17 20:27 | API-17p2 | Checkpoint | | app restarted (update to 1.5.13-beta.9) during the server typecheck; no process survived; rerun |
| 2026-11-17 20:30 | API-17p2 | Completed | Pass | after fixing 4 type errors in the peer suite; PBS-01 rerun Pass on the final file |
| 2026-11-17 20:30 | P2-12 | Started | | restart suite RR-01..09 on dist of 4c93deaa8f |
| 2026-11-17 20:36 | P2-12 | Completed | Pass | RR-01..09 pass on the part 2 build (RR-01/04 on retry: start deadline under load) |
| 2026-11-17 20:36 | P2-10 | Started | | isolated-app start --build with the test vault |
| 2026-11-17 20:52 | P2-10 | Completed | Pass | header/dot/no Stop, Running during a turn, 2-count, reload, zh-CN wording, Idle at the end; panel note read; evidence P2-10-desktop/ |
| 2026-11-17 20:56 | P2-07a | Started | | a failed Team member live: BTS-02 with a third member whose model answers 400 |
| 2026-11-17 21:00 | P2-07a | Checkpoint | | native provider 400 = turn diagnostic, member idle (no error status reachable by script); reverted; BTS-02 Pass on the restored file |
| 2026-11-17 21:18 | P2-07a | Completed | Not reachable live | also tried /ws/agent-collaboration directly (tree and messages only; statuses go through the feed's observePairedAgents, read by BTS-01/02, PBS-01); temporary BTS-06 removed; BTS-01/02 Pass on the final file, tsc clean |
| 2026-11-17 21:25 | P2 | Completed | Pass | report Part 2 and API-REV-003 written; 94% |
| 2026-11-17 23:10 | R4 | Started | | round 4: part 2 on the merged base (CRR-008); plan R4-R01, R4-01..R4-09; BTS-06 and the MSP-67 Settings check added; building dist at a9e5676630 (load ~150) |
| 2026-11-17 23:02 | R4-01 | Completed | Pass | BTS-01..03 on the merged build (dist at a9e5676630) |
| 2026-11-17 23:12 | R4-02 | Completed | Pass | BTS-06 (after two test-draft fixes: flag-driven exit, waits for each notice); count 3→2→1→offline 0 with exit code, SIGTERM, run_ended |
| 2026-11-17 23:14 | R4-03 | Completed | Pass | BTS-04 live Claude |
| 2026-11-17 23:17 | R4-04 | Completed | Pass | PBS-01 on two built nodes |
| 2026-11-17 23:27 | R4-05 | Completed | Pass | phone bundle rebuilt; MSP-67 (+ Settings screen) , MSP-59, MSP-63 |
| 2026-11-17 23:28 | R4-06 | Completed | Pass | 483 panel probe |
| 2026-11-17 23:41 | R4-07 | Completed | Pass | RR-01..09; RR-05 (control deadline at load 215) and RR-07 (haiku did not call Bash) on retry |
| 2026-11-17 23:45 | R4-08 | Completed | Pass | server typecheck at baseline; final BTS file: BTS-01..03, BTS-06 Pass |
| 2026-11-17 23:50 | R4 | Completed | Pass | report section "Part 2 on the merged base", API-REV-004; 94% |

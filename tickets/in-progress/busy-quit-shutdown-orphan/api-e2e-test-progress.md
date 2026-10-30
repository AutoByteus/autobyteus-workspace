# API/E2E Test Progress — busy-quit-shutdown-orphan

Read this first when picking the run back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` § Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-30 12:50 | API-R1 | Completed | Pass | Reused IMP-01..09: `git diff --name-only bf2857ca29 HEAD` outside the ticket folder is empty |
| 2026-10-30 12:54 | API-00 | Started |  | clean checkout /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/bq284-api.Gy1t06/clean at b520b51c9e; server prebuild+build |
| 2026-10-30 13:00 | API-00 | Checkpoint |  | server build OK in clean checkout (32 s); base checkout /…/bq284-api.Gy1t06/base @ 1a4453e553 built for fail-before |
| 2026-10-30 13:00 | API-02 | Checkpoint |  | iteration run of the new server fixture vs clean build: Pass (terminate 79 ms, SIGTERM exit 0 815 ms); vs base: Fail (terminate pending 20 s) — FINDING F-API-001: sweep counts its own ps child ("1 process(es)" on every exit, idle too) |
| 2026-10-30 13:00 | API-03 | Checkpoint |  | iteration run vs clean: Pass (application terminate 76 ms); vs base: Fail (pending 20 s). Fixture cleanup fixed (ps -ww) after one base leftover (own pid 39061, killed) |
| 2026-10-30 13:00 | API-04/05/06 | Started |  | live mixed probe on clean build: evidence/API-live-server-probe.mjs mixed |
| 2026-10-30 13:17 | API-04/05/06 | Checkpoint |  | earlier attempts were probe defects (missing data .env; 140-char command cut hid the marker; team payload command_id; history "?? MISSING" on null) — superseded outputs moved to run temp dir, not evidence |
| 2026-10-30 13:17 | API-04 | Completed | Pass | Codex terra terminate 82 ms, tool command gone (API-04-05-06-result.json) |
| 2026-10-30 13:17 | API-05 | Completed | Pass | Claude haiku terminate 772 ms, tool command gone |
| 2026-10-30 13:17 | API-06 | Completed | Pass | SIGTERM 4 busy (Codex sa, Claude sa, Codex Team member, Claude Org agent): exit 0 in 1272 ms, 0 survivors, 0 marked; relaunch: terminatedAt kept for API-04/05, null for shutdown-stopped + Team root |
| 2026-10-30 13:17 | API-07 | Started |  | live many-Claude probe |
| 2026-10-30 13:18 | API-07 | Completed | Pass | U-A1: 3 busy + 2 idle Claude: exit 0 in 2764 ms, 0 survivors |
| 2026-10-30 13:18 | API-08 | Started |  | Claude CLI EOF/SIGTERM probe |
| 2026-10-30 13:26 | API-08 | Completed | Pass | U-A2: Claude 2.1.314 survives stdin EOF (CLI+tool alive at 15 s); SIGTERM ends CLI in 732 ms and tool <=1 s. First attempt: haiku dropped the marker, probe fixed |
| 2026-10-30 13:26 | API-00 | Checkpoint |  | desktop build started: pnpm -C autobyteus-web build:electron:mac (clean checkout) |
| 2026-10-30 13:32 | API-00 | Completed | Pass | desktop build OK (5m47s), electron-dist/mac-arm64/AutoByteus.app 1.5.11-beta.4 ad hoc |
| 2026-10-30 13:32 | API-10 | Started |  | desktop idle quit |
| 2026-10-30 13:33 | API-10 | Completed | Pass | idle quit: server 206 ms / Electron 259 ms; relaunch exactly one server; 2nd quit 260 ms (first attempt superseded: timer started late) |
| 2026-10-30 13:33 | API-15/API-11 | Started |  | desktop busy restart + busy user quit + relaunch + continue |
| 2026-10-30 13:35 | API-15 | Completed | Pass | restart server with busy Codex: old server gone, tool gone, ready 1725 ms |
| 2026-10-30 13:35 | API-11 | Checkpoint |  | busy user quit: no survivors, relaunch 1 server, all 4 roots continued; BUT server hit the 10 s bound (exceeded 10s; sweep 4 procs + 5 groups) -> exit 1 path; investigating |
| 2026-10-30 13:35 | API-12 | Started |  | desktop busy SIGTERM to Electron main |
| 2026-10-30 13:36 | API-12 | Completed | Pass | SIGTERM to Electron main, busy Codex+Claude: server 779 ms, Electron 831 ms, exit 0, relaunch 1 server |
| 2026-10-30 13:36 | API-11B | Started |  | bisection: API-11 quit without the earlier restart |
| 2026-10-30 13:38 | API-11B | Completed | Pass | busy quit 4 roots without prior restart: server 988 ms, exit 0, all continued -> hang is tied to the prior busy restart |
| 2026-10-30 13:38 | API-11C | Started |  | minimal repro: busy restart then quit |
| 2026-10-30 13:38 | API-11C | Completed | Pass | busy restart then quit (no new runs): 207 ms, clean -> restart alone does not reproduce |
| 2026-10-30 13:38 | API-11 | Checkpoint |  | first run kept as API-11R1-*; repeating API-11 exactly (R2) |
| 2026-10-30 13:40 | API-11 | Checkpoint |  | R2 exact repeat: busy quit 931 ms, clean, all continued -> R1 hang intermittent |
| 2026-10-30 13:40 | API-06R | Started |  | cause hunt: server-level repeat x4 (restart emulation + 4 busy roots) with timestamped logs/frames |
| 2026-10-30 13:46 | API-06R | Completed | Pass | 4/4 server-level iterations clean (1.2-1.5 s) — no reproduction |
| 2026-10-30 13:46 | API-11D | Started |  | diag loop on app COPY with temporary [BQ-DIAG] logs (/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/bq284-api.Gy1t06/diag-app; patch /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/bq284-api.Gy1t06/diag-patch.py); outputs in /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/bq284-api.Gy1t06/diag-desk-N |
| 2026-10-30 13:50 | API-11D | Completed | Not reproduced | 4 instrumented desktop busy-quit iterations clean (1022/1583/1329/1326 ms); clean stage timeline saved; R1 stall narrowed to at/before Org stop -> F-API-002 Unclear |
| 2026-10-30 13:50 | API-13 | Started |  | wedged server quit |
| 2026-10-30 13:52 | API-13 | Completed | Pass | wedged (SIGSTOP) server quit: force at window expiry, 5 targets, server SIGKILL 20.2 s, Electron 21.8 s, 0 survivors, tools gone, relaunch 1 server; ShutdownIncomplete (expected N-5) |
| 2026-10-30 13:52 | API-14 | Completed | Not Tested | real install unsafe (ShipIt relaunches outside e2e profile onto user data — settings-update-notifications precedent); prepareForInstall = same ApplicationShutdown.stop proven by API-11/11B/12 |
| 2026-10-30 13:52 | API-02/03 | Started |  | vitest gated E2E in clean checkout @55ddc71839 |
| 2026-10-30 13:55 | API-01 | Completed | Pass | native standalone host close 835 ms, 4/4 commands+anchors absent |
| 2026-10-30 13:55 | API-02/03 | Completed | Pass | vitest clean: 2 passed; base: 2 failed (pending at timeout) |
| 2026-10-30 13:55 | API-09 | Started |  | before baseline: busy SIGTERM on BASE server build |
| 2026-10-30 14:03 | API-09 | Completed | Observed | base: no exit 31 s after SIGTERM, tools alive; Claude CLI+zsh+python orphaned after server SIGKILL (killed by recorded PID) |
| 2026-10-30 14:03 | — | Completed | Fail | round result: Fail (F-API-001 Local Fix, F-API-002 Unclear); cleanup done (checkouts, temp roots, instances, processes) |

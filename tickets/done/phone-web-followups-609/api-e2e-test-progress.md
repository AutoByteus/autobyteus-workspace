# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-23 00:06 | SI-1 | Started | — | server build, `test:integration:prepare`, `test:integration` → /tmp/api609 |
| 2026-11-23 00:09 | SI-1 | Completed | Pass | 91 files passed, 21 skipped; 518 tests passed, 71 skipped |
| 2026-11-23 00:08 | FX-1 | Completed | Pass | routing test 19 passed (new `AGENT_TOOL_STEPS` case) |
| 2026-11-23 00:10 | SE-1 | Started | — | whole `pnpm test:e2e` → /tmp/api609/e2e.log |
| 2026-11-23 00:20 | CS-1 | Completed | Pass | `rg contextText autobyteus-server-ts/src`: 0 files |
| 2026-11-23 00:29 | SE-1 | Completed | Fail (outside) | 126 passed, 2 failed, 160 skipped: RRB-1, SID-2 `Unknown system error -102 … node-access/local-control.sock` |
| 2026-11-23 00:31 | SE-1 | Checkpoint | — | the two files alone on the branch: same 2 failures (deterministic) |
| 2026-11-23 00:42 | SE-1 | Checkpoint | — | same two files on a fresh clone of base `f2c0d2a902`: same 2 failures → base; cause: the snapshot reads the running node's Unix socket |
| 2026-11-23 00:44 | CD-1 | Completed | Pass | branch PASS (3 packages, clean); base FAIL naming `team-stream-server-message.d.ts(.map)` |
| 2026-11-23 00:52 | MSP-101, MSP-102 | Completed | Fail | MSP-102: AC-D phone and page card read Failed/error after a reread (F-1); MSP-101: harness (member folder query) |
| 2026-11-23 01:05 | MSP-89…91, MSP-101, MSP-102 | Completed | Fail | MSP-89/90/91 Pass (first read after restart `[5, 200]`, unknown folder 404); MSP-102 F-1 again (page `statusKey: "error"`); MSP-101 harness (Team row selector) |
| 2026-11-23 01:12 | MSP-101 | Completed | Pass | member → MATE, delegated → HOST, desktop and phone |
| 2026-11-23 01:13 | WS-1 | Started | — | whole phone probe → /tmp/api609/ws-1 |
| 2026-11-23 01:34 | WS-1 | Completed | Fail | 100 cases, 98 Pass (started 00:46, the row above has the wrong time); MSP-102 (F-1), MSP-61 (FU-006, base); unknown browser errors 0; MSP-98 skipped (gate) |
| 2026-11-23 01:37 | FX-1 | Checkpoint | Pass | server typecheck `1000 in 313 files (baseline 1000 in 313 files)` |
| 2026-11-23 02:55 | — | Checkpoint | — | Round 2 (CRR-003 on IR-002, tree `9a4777b0eb`): server build, phone bundle (exit 0) |
| 2026-11-23 03:00 | R2-MSP-102, MSP-103 | Completed | MSP-102 Pass; MSP-103 Fail (harness) | MSP-102: phone `interrupted`/`Stopped`, page card stop icon, page `statusKey: interrupted`. MSP-103 failed after the phone reload (my wait) |
| 2026-11-23 03:30 | MSP-103 | Completed | Pass | after four harness fixes (the reload reopens `?row=<member>&screen=activity`): phone live Stopped; desktop member card stop icon, Activity Stopped, no conflict; phone read back Stopped; stored `interrupted` |
| 2026-11-23 03:31 | R2-SI-1, R2-SE-1 | Started | — | `test:integration:prepare`, `test:integration`, `pnpm test:e2e` → /tmp/api609/r2-* |
| 2026-11-23 03:29 | R2-SI-1, R2-SE-1 | Completed | Pass; Fail (outside) | integration 91 passed / 21 skipped; e2e 126 passed, the same 2 base failures (FU-007) |
| 2026-11-23 04:17 | R2-WS-1 (1st) | Completed | Fail | 101 cases, 99 Pass: MSP-14 `the task agent is listed before` (new), MSP-61 (FU-006) |
| 2026-11-23 04:30 | R2-MSP-14 | Completed | — | with MSP-103 before: Fail; without: Pass → MSP-103 disturbs MSP-14 |
| 2026-11-23 05:24 | R2-WS-1 (2nd) | Completed | Fail | first fix (list reload in MSP-103, Show older in MSP-14): MSP-14 still Fail. Cause: MSP-103 reloaded the shared phone (unfolded rows lost); two debug logs that held a used pairing URL deleted |
| 2026-11-23 06:13 | R2-WS-1 (3rd) | Completed | Pass for this ticket | MSP-103 reads back through a second phone; MSP-14 reverted: 101 cases, 100 Pass (MSP-61 FU-006); unknown browser errors 0 |
| 2026-11-23 06:15 | FS-1 | Started | — | fresh clone of `3d49a60c82` → <tmp>/fs-1.log |
| 2026-11-23 06:20 | FS-1 | Completed | Pass | fresh clone of `3d49a60c82`: install, mac build (typecheck 86 in 36 at baseline), DMG; Prisma and terminal runtime ok; no staging folder |

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

# API/E2E Test-Case Ledger — anthropic-prompt-caching

## Ledger Meta

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching`
- Coverage investigation: `tickets/in-progress/anthropic-prompt-caching/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/anthropic-prompt-caching/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/anthropic-prompt-caching/api-e2e-revision-record.md`
- Ledger scope: one long-running, paid live run on claude-opus-5-5 with dependent cases on one agent run.
- Last updated: 2026-10-09

## Planned Cases

The planned command is the same for every case:

`RUN_ANTHROPIC_CACHE_E2E=1 … vitest run tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts`

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- |
| APC-E2E-001 | Two tool-cycle turns (T1, T2); new turn writes only new input; T1 thinking kept | AC-002, AC-004, REQ-003 | Studio server WS/GraphQL → native runtime → Anthropic (strict) | 1 | — |
| APC-E2E-002 | Interrupt at a pending approval (T3), then a new turn (T4) | AC-011, REQ-010 | same | 2 | Depends on 001 |
| APC-E2E-003 | Run-level cache over T1..T4; marker shape; SDK version | AC-001, AC-003, AC-012, QR-001/002 | same | 3 | Aggregate of 001–002 calls |
| APC-E2E-004 | Settings → Default image model changed while waiting on a tool approval (T5) | AC-013(a), P-005, REQ-012 | same + GraphQL `updateServerSetting` | 4 | A 400 here is Design Impact |
| APC-E2E-005 | Stop → restore → continue (T6) with thinking in the snapshot | AC-013(b), persisted data | same + `terminateAgentRun` / `restoreAgentRun` | 5 | — |
| APC-E2E-006 | Stop while a tool approval is pending (last turn = tool_use) → restore → continue (T7/T8) | AC-013(b) variant | same | 6 | — |
| APC-E2E-007 | Token Meter (run summary GraphQL) = cost from Anthropic raw usage at catalog prices | AC-006, REQ-006 (AC-007 meter side) | GraphQL `getAgentRunTokenUsageSummary` | 7 | — |
| APC-E2E-008 | Strict-mode control: kept thinking + changed tool → 400 | Harness validity (RSK-003) | Same transport wrapper | 8 | Proves "no 400" is meaningful |
| DSK-001 | Desktop app: native Opus 5.5 agent run from the UI, multi-call tool cycles approved in the UI over 2 turns; no error; per-call cache reads; Token Meter shows the cache rows and a high hit | AC-001/003/004, AC-006 (UI) | Isolated Electron instance of the worktree build (`pnpm isolated-app start --build`), browser-automation via CDP | 9 | Added after the user asked for real Electron testing |
| DSK-002 | Desktop app: Stop generation while a tool approval is pending, then a new message | AC-011 | same | 10 | — |
| DSK-003 | Desktop app: Settings → default image model changed while a tool approval is pending, then Approve | AC-013(a), P-005 | same | 11 | — |
| DSK-004 | Desktop app: whole-app restart (`isolated-app restart`), reopen the run and continue | AC-013(b) (real process restart) | same | 12 | Also observes DEF-B in the product meter |
| DSK-005 | Desktop app: Terminate run (left panel) while idle, then continue in the same app session; does the Token Meter record the new calls? | REQ-006 / DEF-B (real-product check) | same | 13 | Added to classify DEF-B in the product |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | APC-E2E-001..008 | 2026-10-09 12:25 | Started | `env -i PATH HOME=<temp> TMPDIR LANG RUN_ANTHROPIC_CACHE_E2E=1 ANTHROPIC_API_KEY=<from server .env, not logged> ANTHROPIC_CACHE_E2E_EVIDENCE_DIR=api-e2e-evidence/live ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-anthropic-prompt-caching-live.e2e.test.ts --no-watch` (cwd autobyteus-server-ts), model claude-opus-5-5, strict mode | All 8 cases pass | Run launched | — | `api-e2e-evidence/live-run-1.log` | Completed: 4 pass / 4 fail (see rows 2–9) |
| 2 | APC-E2E-001 | 2026-10-09 12:26 | Completed | run 1 | Thinking kept; new turn writes only new input | Cache: T2 first call read 18031 = previous prefix exactly, wrote 94 (new input only). Opus produced thinking on only 1 of 38 calls (call 27, T4); the T1 thinking assertion failed (0 thinking-bearing T1 responses) | Fail (test design: no thinking produced) | `api-e2e-evidence/live-run-1/` | Redesign: reasoning chain + `thinking_display: summarized` |
| 3 | APC-E2E-002 | 2026-10-09 12:27 | Completed | run 1 | No 400; system unchanged; note after history | Pass | Pass | `live-run-1/case-results.json` | — |
| 4 | APC-E2E-003 | 2026-10-09 12:27 | Completed | run 1 | ≥25 calls, read>0 after first, hit ≥90%, 2×1h markers, SDK 0.132.1 | Pass (31 calls) | Pass | same | — |
| 5 | APC-E2E-004 | 2026-10-09 12:27 | Completed | run 1 | Strip once, tools changed, accepted | Pass, but the pending round's tool_use had no thinking (only earlier thinking was stripped) | Pass (partial P-005) | same | Rerun with a thinking-bearing pending tool_use |
| 6 | APC-E2E-005 | 2026-10-09 12:27 | Completed | run 1 | Snapshot holds thinking; restore strips once | Snapshot had no thinking (the T5 strip had removed it; later calls did not think) | Fail (test design: order) | same | Reorder: restore before Settings change |
| 7 | APC-E2E-006 | 2026-10-09 12:32 | Completed | run 1 | Stop with pending approval → restore → continue | `terminateAgentRun` did not return within 300 s (undici "fetch failed"). Reproduced with a 1-call probe on HEAD (300864 ms) and on base 927796780 (300797 ms): pre-existing defect | Blocked (pre-existing defect) | `api-e2e-evidence/stop-pending-probe/` | Report separately; drop from the durable suite |
| 8 | APC-E2E-007 | 2026-10-09 12:33 | Completed | run 1 | Meter = raw usage | 37/38 reports. The missing one is exactly call 37 (T7, Stop issued ms after it completed, then the Stop hung). The other 37 match exactly: input 86, read 753358, 1h write 67639, output 3763, cost $0.7673876 | Fail (consequence of the APC-E2E-006 defect) | `live-run-1/case-results.json` | Rerun without the hung Stop |
| 9 | APC-E2E-008 | 2026-10-09 12:33 | Completed | run 1 | Unchanged → 200; changed tool + kept thinking → 400 | 200 and 400 "Invalid `signature` in `thinking` block. The block is bound to a different conversation" | Pass | same | — |
| 10 | APC-E2E-006 | 2026-10-09 12:38–12:49 | Checkpoint | Temporary probe `api-e2e-evidence/stop-pending-probe/` (1 call), HEAD and temp base worktree 927796780 | Classify the Stop hang | HEAD 300864 ms, base 300797 ms; no `AgentRuntime.stop` log, so it blocks in the server Stop path (`stopRoot`/`root.stop`/`terminateHost`) | Blocked (pre-existing) | `stop-pending-probe/{head,base}-result.json` | Report separately |
| 11 | APC-E2E-001..008 | 2026-10-09 12:51 | Checkpoint | Run 2 (chain rule inside files) | — | `stop_reason: refusal` from call 3 on; aborted | N/A (harness) | `api-e2e-evidence/live-run-2-aborted/` | Move the rule to the user prompt |
| 12 | APC-E2E-001..008 | 2026-10-09 12:55 | Checkpoint | Run 3 (chain rule in user prompt) | — | Refusal at call 0; aborted. Refusal probe: the arithmetic-chain prompt alone is refused (with or without strict mode or summarized display); the run-1 prompt is accepted | N/A (harness) | `live-run-3-aborted/`, `refusal-probe/result.json` | Use an audit-style prompt (probe: thinking at every tool step, no refusal) |
| 13 | APC-E2E-001..008 | 2026-10-09 13:00 | Completed | Run 4 (audit prompt, `thinking_display: summarized`) | All pass | 001, 002, 003, 005, 004, 008 Pass; 007 Fail: 31/43 reports | 6 Pass / 1 Fail | `live-run-4/` | Investigate the 007 gap |
| 14 | APC-E2E-007 | 2026-10-09 13:02 | Checkpoint | Temporary probe `restore-usage-probe/` on HEAD and temp base 927796780 | Restored-run usage recorded | Both: post-restore usage frame emitted, run summary stays at 1. Cause: the restored runtime numbers turns from `turn_0001` again → usage idempotency keys collide → dropped (run 4: exactly 12 duplicate keys = 12 missing calls). Meter = raw usage exactly for the 31 pre-restore calls ($0.6594544) | Pre-existing defect (not this change) | `restore-usage-probe/{head,base}-result.json`, `live-run-4/case-results.json` | Move 007 before the restore; report the defect separately |
| 15 | APC-E2E-001..008 (excl. 006) | 2026-10-09 13:06 | Checkpoint | Run 5 (final, same command) | All 7 cases pass | Interrupted by a machine power-off during APC-E2E-001; no case result written; orphan temp dirs removed | Not Tested (unresolved; superseded by run 6) | `api-e2e-evidence/live-run-5-interrupted-by-poweroff.log` | Rerun as run 6 |
| 16 | APC-E2E-001..008 (excl. 006) | resumed after power-off | Started | Run 6 (final, same command, `ANTHROPIC_CACHE_E2E_EVIDENCE_DIR=api-e2e-evidence/live-run-6`) | All 7 cases pass | — | — | `api-e2e-evidence/live-run-6.log` | — |
| 17 | APC-E2E-001, 002, 003, 007, 005, 004, 008 | run 6 end | Completed | Run 6 | All 7 pass | 7/7 Pass, exit 0. 45 calls, 27 thinking-bearing responses, 0 refusals, only non-200 = control 400. AC-003 hit 94.9% (31 calls). Meter exact ($0.6086732). Restore strip accepted. P-005 strict: pending `tool_use` with thinking, continuation `[tool_use]`-only accepted | Pass | `api-e2e-evidence/live-run-6/` | Reconciled into the execution report |
| 18 | DSK-001..005 | 2026-10-09 13:2x | Started | Isolated desktop app `iso-64203-6f86` built from the worktree at `a89fe62cc` (`pnpm isolated-app start --build`). Only `ANTHROPIC_API_KEY` imported with `pnpm secrets:import` into the instance DB, then restart. UI: Daily Assistant, Temp workspace with 30 data-only chunk files, **Ask first**, `claude-opus-5-5 · AutoByteus`, thinking display **Summarized**. Driven via browser-automation (CDP, attach-only); a read-only renderer observer copies `TOKEN_USAGE_UPDATED` frames | — | — | — | `api-e2e-evidence/electron/` | — |
| 19 | DSK-001 | 13:36–13:39 | Completed | T1 (12 files) and T2 (12 files), every `read_file` approved in the UI | No error; new turn writes only new input; meter cache rows | T1 13 calls, meter **cache hit 90.2%**. T2 first call read 27,873 (T1 last prompt 27,875 − 2 uncached) and wrote 420; each later call read the full previous prompt and wrote ~857, all 1h, 0 × 5m; meter **95.0%** after T2 | Pass | `shots/06-t1-done.png`, `07-t2-done.png`, `usage-t2.json` | — |
| 20 | DSK-002 | 13:39–13:40 | Completed | T3: held at the chunk-25 approval, clicked **Stop generation**; T4 new message | Idle; no 400; system unchanged | Idle, the chunk-25 call was never executed. T4 first call read 40,036 = the full T3 prompt (39,610 + 426), so `system` was unchanged; the note is persisted as a separate `system` message (snapshot msg 59) | Pass | `shots/09-t3-interrupted.png`, `10-…`, `usage-through-t4.json`, `snapshot-before-restart.json` | — |
| 21 | DSK-003 | 13:42–13:46 | Completed | T6: held at the **Thinking → read_file chunk-28** approval; Settings → Server Settings → Default media models → Image generation `Gemini / imagen-4` → save (✓) → "Default media models saved." (server `DEFAULT_IMAGE_GENERATION_MODEL=imagen-4`); back to the run → Approve | Accepted; thinking stripped once | Continuation accepted (read 0 / write 48,851: tools changed, so expected); calls 3–8 append-only; snapshot: msg 83 (the pending tool_use that had thinking) and all earlier turns have 0 thinking blocks, new thinking only after the change (85–95); 0 errors in UI or server log | Pass (P-005 live in product) | `shots/13-…`, `14-…`, `16-…`, `17-…`, `usage-through-t6.json`, `snapshot-before-restart.json` | — |
| 22 | DSK-004 | 13:47–13:50 | Completed | `pnpm isolated-app restart` (whole process; new pid 55019), expanded the workspace tree, reopened the run, T7 | Accepted after restart; one strip | First request read 48,851, wrote 6,108, accepted; calls 2–5 append-only; snapshot: thinking 85–95 removed, new thinking kept (99, 101, 105); meter recorded all 5 calls (47 → 52 reports; +274,179 read = sum of the 5 reads) | Pass | `shots/19-…`, `20-…`, `usage-after-restart.json`, `snapshot-after-restart.json`, `meter-*.txt` | — |
| 23 | DSK-005 | 13:51–13:52 | Completed | Left panel **Terminate run** (idle, confirmed) → send "Read chunk-01.txt …" in the same app session | Meter records the new calls | 2 calls, no error; their usage frames reached the UI with empty usage fields; the run record stayed at 52 reports / $1.536216, so the calls are missing from the meter | DEF-B reproduced in the product (pre-existing) | `meter-after-terminate-restore.txt`, `usage-after-terminate.json`, `shots/22-…` | Reported |
| 24 | DSK-001..005 | 13:53 | Completed | Cleanup | — | Recordings saved; instance stopped (not forced), data root and vault removed, ports released; no secrets in evidence; no temp key file | — | `recording-dsk.mp4`, `recording-dsk-after-restart.mp4` | — |

## Re-entry And Reconciliation

- Last durably recorded event: row 24 (desktop round complete, instance cleaned up)
- Last completed case and result: DSK-005 (DEF-B reproduced in the product); DSK-001..004 Pass
- Cases still running, interrupted, or not started: none. APC-E2E-006 is Not Tested (blocked by pre-existing DEF-A)
- Next case or recovery action: none
- Interruption note: run 5 was lost to a power-off (row 15) and superseded by run 6
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md` § Test-Case Ledger Reconciliation

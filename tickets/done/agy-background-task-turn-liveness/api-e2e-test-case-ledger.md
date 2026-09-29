# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness`
- Coverage investigation: `tickets/in-progress/agy-background-task-turn-liveness/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/agy-background-task-turn-liveness/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/agy-background-task-turn-liveness/api-e2e-revision-record.md`
- Ledger scope and reason it is required: 8 independent cases. The real-AGY SCN-002 case runs about 6 minutes or more.
- Last updated: 2026-09-28

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-001 | AGY unit folder | AC-001..003 | Unit | `vitest run tests/unit/agent-execution/backends/antigravity` | 1 | |
| E2E-REG-001 | Existing fake-transport suites | REQ-004 | Real server + fake AGY | `RUN_AGY_FAILURE_E2E=1 … agy-failure-transport + agy-native-image-step-output` | 2 | |
| E2E-BG-001 | Daemon background closure via the real server | AC-002, REQ-003 | Real server + fake AGY | `agy-background-task-transport.e2e.test.ts` | 3 | |
| E2E-BG-002 | Stop during daemon turn via the real server | AC-003, REQ-002 | Real server + fake AGY | same | 4 | |
| LIVE-BG-001 | SCN-001 real AGY + quiet window + next turn + terminate | AC-004 | Real server + real AGY | `RUN_AGY_BACKGROUND_E2E=1 … agy-background-task-live.e2e.test.ts` | 5 | |
| LIVE-BG-002 | SCN-002 real AGY, more than 300 s silence | AC-004, AC-001 | Real server + real AGY | same | 6 | long-running |
| LIVE-BG-003 | Stop during a real daemon turn | AC-004 alt, REQ-002, ASM-001 | Real server + real AGY | same | 7 | |
| TSC-001 | Type-check the new test files | — | tsc | `tsc -p tsconfig.json --noEmit` | 8 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | UNIT-001 | 2026-09-28 21:27 | Completed | `pnpm exec vitest run tests/unit/agent-execution/backends/antigravity --no-watch` | All pass | 9 files passed, 3 skipped (live); 100 passed, 5 skipped | Pass | console | E2E-REG-001 |
| 2 | E2E-REG-001 | 2026-09-28 21:27 | Completed | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs vitest run agy-failure-transport + agy-native-image-step-output` | All pass | 2 files, 6 tests passed | Pass | console | E2E-BG-001 |
| 3 | E2E-BG-001 | 2026-09-28 21:32 | Completed | same gate + `agy-background-task-transport.e2e.test.ts` (`AGY_FAKE_CASE=daemon_background`) | Daemon `TOOL_EXECUTION_SUCCEEDED` with `{provider_state:"RUNNING", output:<background text>}`, same invocation/turn/args as STARTED, after the echo DONE and before `TURN_COMPLETED`; no ERROR/FAILED/INTERRUPTED; projection row `tool_call` + activity `success` with the same result, live and after terminate; next turn accepted with no tool events | As expected. First attempt failed on a test-matching defect: the fake DONE carries no params, so SUCCEEDED `arguments` is `{}`. Fixed by matching on `invocation_id`. | Pass | console | Negative control: against the base-commit converter (`e6c16d801`), this case fails (no daemon SUCCEEDED). Source restored. |
| 4 | E2E-BG-002 | 2026-09-28 21:32 | Completed | same file (`AGY_FAKE_CASE=daemon_hold`), WebSocket `INTERRUPT_GENERATION` | ACK accepted; `TURN_INTERRUPTED`; no SUCCEEDED / `TURN_COMPLETED` / `AGY_PROCESS_ERROR`; history activity not `success`; history contains "Tool execution interrupted." and no background text | As expected (also passes on the base commit, which is correct for preserved behavior) | Pass | console | LIVE-BG-001 |

| 5 | TSC-001 | 2026-09-28 21:36 | Completed | `pnpm exec tsc -p tsconfig.json --noEmit` | No semantic errors in the new files | 0 non-TS6059 errors (TS6059 rootDir noise predates this change) | Pass | console | — |
| 6 | LIVE-BG-001..003 | 2026-09-28 21:37 | Started | `RUN_AGY_BACKGROUND_E2E=1 AGY_BACKGROUND_EVIDENCE_DIR=<ticket>/evidence vitest run tests/e2e/runtime/agy-background-task-live.e2e.test.ts`; agy 1.2.12, `gemini-3.8-flash-high` | see planned cases | running | — | `evidence/live-run.log`, `evidence/live-bg-00*.json` | await |

| 7 | LIVE-BG-001 | 2026-09-28 21:36 | Completed (attempt 1) | live suite; port 59806 | Turn completes; daemon SUCCEEDED/RUNNING before TURN_COMPLETED; withheld steps delivered; 130 s quiet; next turn clean; history; (ASM-001) daemon down after terminate | Every product assertion held: daemon STARTED at 5.2 s; withheld steps delivered at 21.2 s; daemon SUCCEEDED `{RUNNING, background text}` at 22.1 s before TURN_COMPLETED; no ERROR; quiet window 130 s with 0 events; next turn completed with no tool events; history row and activity success. **Only the ASM-001 assertion failed**: the daemon was still listening 15 s after `terminateAgentRun`. | Fail (test assertion based on a falsified assumption, not an AC) | `evidence/live-bg-001-scn-001.json`, `evidence/live-run.log` | Diagnose with a raw-AGY probe |
| 8 | LIVE-BG-002 | 2026-09-28 21:42 | Completed | same | TURN_COMPLETED after more than 300 s of silence; no ERROR | `sleep 330` STARTED at 2.8 s; next event at 332.8 s (**max silent gap 330,031 ms**); SUCCEEDED DONE `FINISHED_MARKER`; TURN_COMPLETED at 335.4 s; no ERROR / AGY_PROCESS_ERROR | Pass | `evidence/live-bg-002-scn-002.json` | — |
| 9 | LIVE-BG-003 | 2026-09-28 21:42 | Completed | same; port 60093 | Stop ACK accepted; TURN_INTERRUPTED; no daemon SUCCEEDED; history activity `error` "Tool execution interrupted." | As expected; daemon down after Stop (Stop was 0.4 s after STARTED) | Pass | `evidence/live-bg-003-stop.json` | — |
| 10 | PROBE-ASM-001 | 2026-09-28 21:48 | Completed | Temporary raw-AGY probes `/tmp/agy-asm-probe/probe.py` (SIGTERM after `result`) and `probe-midturn.py` (SIGTERM mid-turn, 25 s after the daemon was listening); ports 59911/59912 | Classify the LIVE-BG-001 failure | In both probes AGY exits on SIGTERM (rc=1), but the daemon `python -m http.server` keeps listening. It is in its own process group and is reparented to PID 1. **ASM-001 is falsified for backgrounded daemons in AGY 1.2.12.** The LIVE-BG-003 kill came only from the early Stop, before backgrounding. AutoByteus code is not involved, and this change did not touch the terminate path. | N/A (diagnostic) | this row; probe output in execution report | Orphans killed (59911, 59912). The durable test's ASM-001 assertions were converted to recorded evidence. Record as a non-blocking finding. |
| 11 | LIVE-BG-001, LIVE-BG-003 | 2026-09-28 21:50 | Started (rerun) | `-t "SCN-001\|Stop during"` with the revised live file | Both pass | running | — | `evidence/live-rerun.log` | await |
| 12 | LIVE-BG-001 | 2026-09-28 21:53 | Completed (rerun) | port 60353 | as attempt 1, with the ASM-001 check as evidence only | Daemon STARTED at 4.7 s; withheld steps at 19.6 s; daemon SUCCEEDED `{RUNNING, background text}` at 19.7 s before TURN_COMPLETED; quiet window 130 s with 0 events; next turn TURN_STARTED→TURN_COMPLETED with no tool events; history `tool_call` with the RUNNING result; `daemonListeningAfterTerminate: true` (reproduces the ASM-001 finding; cleaned by afterAll) | Pass | `evidence/live-bg-001-scn-001.json`, `evidence/live-rerun.log` | — |
| 13 | LIVE-BG-003 | 2026-09-28 21:53 | Completed (rerun) | port 60584 | as attempt 1 | ACK accepted; TURN_INTERRUPTED 0.4 s after daemon STARTED; no daemon SUCCEEDED; history activity `error` "Tool execution interrupted."; daemon down (early Stop) | Pass | `evidence/live-bg-003-stop.json` | — |
| 14 | WEB-001 | 2026-09-28 21:57 | Completed | `pnpm exec nuxi prepare` (env setup), then `NUXT_TEST=true pnpm exec vitest run toolLifecycleHandler.spec.ts runProjectionConversation.spec.ts ToolCallIndicator.spec.ts` in `autobyteus-web` | Streaming daemon card: running → success with the RUNNING result retained; activity `success`; history hydration → `success` card with result | 3 files, 41 tests passed (2 new cases) | Pass | console | — |

## Re-entry And Reconciliation

- Last durably recorded event: 14
- Last completed case and result: WEB-001 Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none; report written
- Interruption, context-compression, or rerun note: LIVE-BG-001 attempt 1 failed only on the ASM-001 assertion. That assertion was reclassified after probe evidence and the case was rerun (Pass). Attempt-1 evidence is preserved as `evidence/attempt1-*.json`.
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md`, "Test-Case Ledger Reconciliation"
- Reconciliation note for any case missing a terminal result: —

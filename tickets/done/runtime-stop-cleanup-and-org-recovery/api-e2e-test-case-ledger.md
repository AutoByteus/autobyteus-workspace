# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery`
- Coverage investigation: `tickets/in-progress/runtime-stop-cleanup-and-org-recovery/api-e2e-coverage-investigation.md`
- Execution coverage report: `…/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `…/api-e2e-revision-record.md`
- Ledger scope and reason: 12 cases, many of them multi-minute live real-AGY cases
- Last updated: 2026-09-29

## Planned Cases

| Case ID | Case / Journey | Req / AC | Surface | Entry Point | Order |
| --- | --- | --- | --- | --- | --- |
| UNIT-001 | Changed-owner unit + architecture suites | all | Unit | vitest folders | 1 |
| E2E-REG-001 | Fake-AGY transport e2e (predecessor) | regression | Real server + fake AGY | `RUN_AGY_FAILURE_E2E=1` | 2 |
| TSC-001 | Typecheck new/changed tests | — | tsc | `tsc -p tsconfig.json --noEmit` | 3 |
| LIVE-ORG-B1 | Org director `kill -9` → Terminate / 2nd Terminate / restore / resume | AC-B1, AC-B2, REQ-B4, ASM-001 | Real server + real AGY | `RUN_AGY_RECOVERY_E2E=1 agy-runtime-stop-recovery-live` | 4 |
| LIVE-ORG-B3 | Org team worker `kill -9` → message resumes; director untouched | AC-B3 | same | same | 5 |
| LIVE-ORG-R7 | Stop-caused death: director Stop → message; worker Stop → Org Terminate → restore → resume | R-7, AC-B1..B3 | same | same | 6 |
| LIVE-ORG-A2 | Org member daemon → Org Terminate → daemon gone | AC-A2, AC-A3 | same | same | 7 |
| LIVE-TEAM-D4 | Standalone Team: crash + daemon → state, self-heal restore, Terminate, restore, resume | DEC-004, REQ-B1/B2, AC-A2 | same | same | 8 |
| LIVE-SHUTDOWN-A2 | Graceful `app.close()` with an idle AGY run holding a daemon → daemon gone | AC-A2 | same | same | 9 |
| LIVE-BG-001 | Standalone run: turn end keeps daemon; Terminate kills it | AC-A3, AC-A2 | same | `RUN_AGY_BACKGROUND_E2E=1 -t SCN-001` | 10 |
| LIVE-BG-003 | Stop mid-turn after the daemon is backgrounded → daemon gone | AC-A1 | same | `-t "Stop during"` | 11 |
| LIVE-REG-B4 | Healthy Team relay + Org members + terminate/restore | AC-B4 | same | `RUN_AGY_E2E=1 agy-team-inter-agent-roundtrip` | 12 |

## Execution Events

| Seq | Case ID | Timestamp | Event | Command / Config | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | UNIT-001 | 2026-09-29 | Completed | `vitest run tests/unit/agent-execution/backends/antigravity tests/unit/agent-collaboration tests/unit/agent-org-execution tests/unit/agent-team-execution tests/architecture` | Green for the change | 451 passed, 5 skipped, 12 failed in `team-run-model-selection-save.test.ts` and `agent-org-run-config.test.ts`. The same 2 files at base `5d6179797` (src/tests checked out temporarily, then restored) show the same 12 failures, so they are pre-existing. | Pass | console | E2E-REG-001 |

| 2 | E2E-REG-001 | 2026-09-29 | Completed | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs vitest run agy-background-task-transport agy-failure-transport agy-native-image-step-output` | All pass | 3 files, 8 tests passed | Pass | console | — |
| 3 | LIVE-BG-001 | 2026-09-29 | Completed (attempt 1) | `RUN_AGY_BACKGROUND_E2E=1 -t "SCN-001\|Stop during"` | Turn end keeps the daemon; Terminate stops it within 5 s | Failed **before** the Terminate step, on a fixture assertion: the model ran `echo "OK" > done.txt` via `run_command` in its own cwd, not the workspace (tool SUCCEEDED; `cat done.txt` = OK). The daemon RUNNING closure and the withheld steps were correct. | Fail (test fixture; not product) | `evidence/live-bg-001-scn-001.json` (overwritten by rerun), `evidence/live-bg-run.log` | Local fix: assert on the write step's SUCCEEDED event instead of the file location; rerun |
| 4 | LIVE-BG-003 | 2026-09-29 | Completed | same | Stop after the daemon is backgrounded → TURN_INTERRUPTED; daemon gone within 5 s | Daemon owner `pid 69784, ppid 69459 (AGY), pgid 69784` (own background group, the previously leaking case), waited 10 s after listening. Stop ACK accepted; TURN_INTERRUPTED; **daemon closed at first check (0 ms)**; no background success | Pass | `evidence/live-bg-003-stop.json` | — |
| 5 | TSC-001 | 2026-09-29 | Completed | `tsc -p tsconfig.json --noEmit` | No errors in the new/changed live files | 0 errors in either file | Pass | console | — |
| 6 | LIVE-ORG-B1..LIVE-SHUTDOWN-A2, LIVE-BG-001 rerun | 2026-09-29 | Started | `RUN_AGY_RECOVERY_E2E=1 … agy-runtime-stop-recovery-live.e2e.test.ts`, then `RUN_AGY_BACKGROUND_E2E=1 -t SCN-001` | see plan | running | — | `evidence/live-recovery-run.log`, `evidence/live-bg-rerun.log` | await |

| 7 | LIVE-ORG-B1 | 2026-09-29 06:41 | Completed (attempt 1) | recovery suite | Crash → Terminate success → 2nd Terminate no-op success → restore → resume | `kill -9` director AGY. State after the crash: config active, inspection active. Terminate `success:true`; then config `false`, inspection `false` (consistent). **2nd Terminate `success:false` "Agent organization run not found."**, a hard assertion that stopped the test | Fail (AC-B1 alternate) | `evidence/attempt1-live-org-b1.json` | Soft-assert and rerun to prove the remainder |
| 8 | LIVE-ORG-B3 + LIVE-ORG-A2 | 06:42 | Completed | same | Crashed team worker resumes by message; director untouched; daemon stays after turn end; Org Terminate stops the daemon | ACK accepted; TURN_COMPLETED; worker recalled its code; resumed argv `--conversation …`; director AGY pid unchanged and alive; Org active. Daemon listening after its turn end (AC-A3). Org Terminate success; **daemon closed within 5 s**; director AGY gone | Pass | `evidence/live-org-b3-a2.json` | — |
| 9 | LIVE-ORG-R7 | 06:42 | Completed (attempt 1) | same | Stop-caused death, both placements | Director Stop: ACK accepted, TURN_INTERRUPTED, AGY gone; message → accepted, recalled code. Worker Stop: same. Org Terminate `success:true`, config/inspection `false`. **2nd Terminate `success:false` "not found"** stopped the test | Fail (AC-B1 alternate) | `evidence/attempt1-live-org-r7.json` | Rerun with soft assert |
| 10 | LIVE-TEAM-D4 | 06:43 | Completed (attempt 1) | same | Standalone Team crash + daemon | Alpha `kill -9`; Team still active. Terminate `success:true`; beta daemon closed at 1 ms; beta AGY gone; Team inactive. **2nd Terminate `success:false` "Agent team run not found."** stopped the test | Fail (AC-B1 alternate) | `evidence/attempt1-live-team-d4.json` | Rerun with soft assert |
| 11 | LIVE-SHUTDOWN-A2 | 06:43 | Completed | same | Graceful `app.close()` stops an idle run's daemon and an Org member's daemon | Both daemons closed within 5 s; both AGY processes gone | Pass | `evidence/live-shutdown-a2.json` | — |
| 12 | LIVE-BG-001 | 06:44–06:47 | Completed (rerun) | `RUN_AGY_BACKGROUND_E2E=1 -t SCN-001` after the fixture fix | Turn end keeps daemon; quiet window; next turn clean; Terminate stops daemon ≤ 5 s | TURN_COMPLETED; daemon RUNNING closure; 130 s quiet window with 0 events; daemon owner `pid 84545, ppid 84530 (AGY), pgid 84545`; **closed 1 ms after Terminate returned** | Pass | `evidence/live-bg-001-scn-001.json`, `evidence/live-bg-rerun.log` | — |
| 13 | LIVE-ORG-B1, LIVE-ORG-R7, LIVE-TEAM-D4 | 06:50 | Completed (rerun, 2nd Terminate soft-asserted) | `-t "LIVE-ORG-B1\|LIVE-ORG-R7\|LIVE-TEAM-D4"` | Full remainder proven; AC-B1 alternate still fails | **B1:** restore success; config/inspection `true`; director recalled its code; resumed argv `agy --conversation e5a12e05-… --agent …` (ASM-001 proven). **R7:** restore success; worker recalled its code. **D4:** restore success; alpha recalled its code; Terminate+restore race: both `success:true`, no "already managed", Team active after. **All three: 2nd Terminate `success:false` "…run not found." (soft failure)** | Fail (AC-B1 alternate only); every other assertion passed | `evidence/live-org-b1.json`, `evidence/live-org-r7.json`, `evidence/live-team-d4.json`, `evidence/live-recovery-rerun.log` (the JSON `result:"Pass"` field reflects only the hard assertions; the soft failure is in the log) | Route |
| 14 | LIVE-REG-B4 | 06:53 | Completed | `RUN_AGY_E2E=1 vitest run agy-team-inter-agent-roundtrip.e2e.test.ts` | Healthy Team relay; Org members; terminate/restore | 2/2 passed | Pass | `evidence/live-reg-b4.log` | — |

| 15 | LIVE-ORG-B1, LIVE-ORG-R7, LIVE-TEAM-D4 (+ B3/A2, SHUTDOWN) | 2026-09-29 (round 2) | Completed | Assertions updated per SR-004 / N-4: the second Terminate expects an unchanged state + `{success:false, "…not found."}`. Full file rerun: `RUN_AGY_RECOVERY_E2E=1 … agy-runtime-stop-recovery-live.e2e.test.ts` | All 5 pass | **5/5 passed.** B1/R7: second Terminate `{success:false,"Agent organization run not found."}`, and the state after it equals the state after the first Terminate (config/inspection `false`/`false`). D4: `{success:false,"Agent team run not found."}`, Team inactive. Restore and resume re-proven (`--conversation`, codes recalled). Daemons closed 1 ms after Org/Team Terminate and after shutdown. Race: both success | Pass | `evidence/live-*.json` (round 2), `evidence/round1-*.json`, `evidence/live-recovery-round2.log` | — |
| 16 | PROBE-LINUX-A1 | 2026-09-29 (round 2) | Completed | Temporary: `docker run --rm --network none node:22-bookworm`, with the real `agy-background-process-groups.ts` mounted read-only and run via `node --experimental-strip-types`. A fake AGY parent spawns a detached (`setsid`) `sh -c "sleep 300 & wait"`; an unrelated detached process is also started | Helper selects only the AGY background group on Linux; the group dies; the unrelated process survives | `groups:[23]` = bg leader; `ps` listing 3 ms; bg + child gone; unrelated alive; fake AGY gone | Pass | this row; execution report | Container removed (`--rm`); probe dir deleted |

## Re-entry And Reconciliation

- Last durably recorded event: 16
- Last completed case and result: PROBE-LINUX-A1 Pass (round 2)
- Cases still running, interrupted, or not started: none
- Next: round 2 Pass → `/code_reviewer` for proportional test-code review
- Reconciled into execution coverage report: `Yes` (`api-e2e-execution-coverage-report.md`)

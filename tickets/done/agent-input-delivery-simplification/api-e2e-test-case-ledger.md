# API/E2E Test-Case Ledger — Agent Input Delivery Simplification (v3)

## Ledger Meta

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification-v3`
- Branch: `codex/agent-input-delivery-simplification-v3`
- Validated commit: `a3391c924f` (IR-004; source `dbc27db9df`)
- Base: `origin/personal@0216c6fb14`
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md` (round API-REV-003; the v2 rounds API-REV-001/002 are superseded together with IR-001..003)
- Scope:
  - repository layers;
  - the race suite ported to v3 (DEC-005 refusal);
  - the two-server remote suite (`acceptFromRemote`, `commitSentToRemote`);
  - the serial scripted-AGY regression set;
  - a live-runtime teammate suite.

  The host is heavily loaded and shared with other worktrees, so heavy runs are serialized (TESTING.md).
- Last updated: 2026-10-24

Evidence paths are relative to `api-e2e-evidence-v3/`.

## Planned Cases

| Case ID | Case / Journey | REQ / AC | Surface | Order |
| --- | --- | --- | --- | --- |
| R-01 | Build typecheck | — | tsc | 1 |
| R-02 | Unit layer (communication, roots, admission, tools, remote collaboration, memory, architecture), incl. V-2/V-3 contract, append, V-4 | AC-001..AC-013 | Vitest | 2 |
| R-03 | Integration layer | AC-014 | Vitest | 3 |
| TDR-001..003 | Race suite per root: closure during the write; closure while waiting for the lock (slot dropped); root keeps working and restores | REQ-012, AC-012, DEC-005, AC-013 | Live API (scripted AGY) | 4 |
| TDR-B | Race suite on base `0216c6fb14` | Discrimination | base worktree | 5 |
| REM | Two-server remote suite (37 cases) | SCN-016, AC-007, AC-013 | Two built servers | 6 |
| REG-E2E | `tests/e2e/projects` (without the race suite), `agent-org-runs`, `agent-team-runs`, compaction replay/transport | AC-002..AC-010, AC-014 | Live API (serial) | 7 |
| LIVE-RT | `team-busy-member-mid-turn-delivery` (Claude and Codex workers) | AC-007 | Real models | 8 |

## Execution Events

| Seq | Case ID | Event | Configuration | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R-01 | Completed | `tsc -p tsconfig.build.json --noEmit` | exit 0 | exit 0 | Pass | `r01-tsc.log` |
| 2 | R-02 | Completed | 15 unit directories | pass | 464 files, 4062 passed, 6 skipped, 0 failed | Pass | `r02-unit.log` |
| 3 | R-03 | Completed | `tests/integration` | pass | 20 failures in 6 `application-backend` files. Cause: I ran this layer before `test:integration:prepare`, so the Brief Studio importable package did not exist yet. | Fail (my run order) | `r03-integration.log` |
| 4 | R-03 | Completed | the 6 failed files after `test:integration:prepare` | pass | 6 files, 20/20 | Pass | `r03-integration-rerun.log` |
| 5 | TDR-001..003 | Checkpoint | port iterations 1–2 | — | Adapted to v3: an `appendMessage` gate on the single message; the `create_task`/`update_task` tools with the Task key; a JSONL log reader (the coordinating log plus the Task agents' own logs, filtered by this root's agents) | — | `tdr-run1..2` (superseded) |
| 6 | TDR-001..003 | Completed | final suite | all roots pass | 3/3. TDR-001/002 delivery and agent outcome `{accepted:false, code:"TASK_AGENT_RESOURCE_CLOSED", message:"Your Task is DONE or CANCELLED, so you can't start new work."}`, readable by the agent (DEC-005). TDR-001's record is kept in the log and shown in the root view. History `[RACE1, BLOCKER request, BLOCKER, AFTER, POST-RESTORE]`, no `RACEB`. The live and restored snapshots equal the saved history. | Pass | `tdr-run3/`, `tdr-run3.log` |
| 7 | TDR-B | Completed | base `0216c6fb14` | fails | Agent root: the delivery throws `Error: AgentRun input reservation '2' cannot be cancelled.` (the agent sees `-32603 Internal error`). Team/Org: no outcome within 300 s, and the roots then cannot be terminated ("run not found"). | Pass (discriminates) | `tdr-base.log`, `tdr-base/` |
| 8 | REM | Completed | clean `env -i` environment; v3 `dist` built and `test:integration:prepare` run | pass | 37/37 (RC-01..RC-37), including RC-05..07 messages both ways per root kind, RC-10/11/23 Task closure, RC-12/13 idle restore and restarts | Pass | `remote-two-server.log`, `remote-two-server/` |
| 9 | REG-E2E | Interrupted | session power-off before the start | — | — | — | — |
| 10 | REG-E2E | Completed | clean `env -i` environment; `tests/e2e/projects` (race suite excluded), `agent-org-runs`, `agent-team-runs`, AGY compaction transport, Grok compaction and runtime replay; serial | pass | 34/36 files; 147 passed, 3 failed, 4 skipped. Failures: `delegated-launch-config-defaults` ×2 and `task-existing-copy-assignment` EXC-E2E-004 | Fail (causes below) | `reg-e2e.log` |
| 11 | REG-E2E | Diagnosed | `delegated-launch-config-defaults`, rerun once as its header specifies | — | Reproduces deterministically. Cause in the test: since `71d51a1608` (delegated-copy-model-change) copy members record a concrete `launchConfiguration` and `followsTeam`, and since the task-agent own-run change (`52f2837ca7`) a restored copy's launch facts live in its own run. The test still expects `launch: null` and reads `source.members` from the root tree. None of the files involved is in this ticket's diff. | Not caused by this change; report to owner | `launch-defaults-rerun.log`, `launch-defaults-rerun/` |
| 12 | REG-E2E | Diagnosed | EXC-E2E-004 rerun once (`-t "EXC-E2E-004"`) | — | Cause: at a 9 ms offset, the assignment's live-lease restore (`root-task-execution-lifecycle.ts` `acquireAtHead` → `restoreChain`) met a member already fenced by the DONE's in-flight stop. The refusal is raised before `deliverWork` reaches the delivery engine. The race is in the several-Tasks reopen/release path (`a18fe714cd`), outside this diff. The rerun passed (timing-dependent; load average ~50). | Not caused by this change; report to owner | `exc004-rerun.log` |
| 13 | LIVE-RT | Completed | `env -i` with real HOME/USER/LOGNAME; `RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1` | pass | 2/2 fail at the reply-text check only. Mid-turn delivery itself passed (receipt before the worker's turn completed; one turn). Cause in the test: since `be00680819` (autobyteus-139) text arrives in `SEGMENT_CONTENT_BATCH` items, which the test did not read. | Fail (stale test) | `live-rt.log` |
| 14 | LIVE-RT | Completed | after the baseline fix `67ec5ac6ca` | pass | 2/2: Claude and Codex workers received the teammate message mid-turn (receipt@39/40 < completed@74/83) and replied with `WORK_DONE` and `PINEAPPLE` | Pass | `live-rt-rerun.log` |

## Re-entry And Reconciliation

- Last durably recorded event: 14
- Cases not started: none
- Next: none (reconciled into the execution report)
- Note: the session was interrupted (power-off) after event 8. The worktree, the evidence and the uncommitted test changes survived, and no test process was left running.

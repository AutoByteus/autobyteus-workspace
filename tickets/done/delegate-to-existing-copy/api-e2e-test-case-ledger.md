# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy`
- Coverage investigation: `tickets/in-progress/delegate-to-existing-copy/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/delegate-to-existing-copy/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/delegate-to-existing-copy/api-e2e-revision-record.md`
- Ledger scope: API-REV-001; many independent gated suites, long browser probes, interruption risk.
- Last updated: 2026-10-09

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-001 | Server typecheck | — | tsc | `pnpm -C autobyteus-server-ts typecheck` | 1 | |
| REPO-002 | Focused unit layers | AC-001..018 (unit) | unit | vitest run focused dirs | 2 | |
| REPO-003 | Focused integration | AC-016 | integration | vitest run 2 integration files | 3 | |
| REPO-004 | Full unit + integration baseline | regression | unit/integration | `test:unit`, `test:integration` | 4 | |
| EXC-E2E-001 | Standalone Agent root journey | AC-001..010, 012, 013, 018 | real HTTP/WS/scoped MCP, scripted AGY | new suite | 5 | |
| EXC-E2E-002 | Agent Team root journey | same | same | new suite | 5 | Team root mandatory |
| EXC-E2E-003 | Agent Org root journey | same | same | new suite | 5 | |
| EXC-E2E-004 | QR-001 parallel DONE(A) + assign(B), both orders | QR-001 | same + `CALL_TOOLS` | new suite | 5 | |
| EXC-E2E-005 | Cross-root sender: team run ID message, other root's copy | AC-008, AC-012 | same | new suite | 5 | |
| EXC-E2E-006 | Never started, lost conversation, damaged data | AC-009, AC-013, REQ-005 | same | new suite | 5 | |
| E2E-PRJ | Existing `tests/e2e/projects` (gated) | AC-016 | same | vitest run tests/e2e/projects | 6 | |
| E2E-AGY-FIX | AGY native-argument regression + fixture routing unit | fixture coexistence | server E2E | TESTING.md commands | 7 | |
| E2E-LIVE | Live-model runtime suites with updated assertions | AC-001/016 | real Claude | gated vitest | 8 | provider availability |
| BR-001..011 | Existing tree probe cases | AC-016, REQ-008 preserved | browser + built backend | `test:e2e:task-closure-tree` | 9 | |
| BR-012..014 | Existing-copy rows/board in 3 roots | REQ-008, AC-002/004/005 | browser + built backend | same probe | 9 | new |
| BR-015 | Real restarts around the assignment | AC-011, REQ-008/013 | browser + built backend | same probe | 9 | new |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REPO-001 | 2026-10-09 09:10 | Completed | `pnpm -C autobyteus-server-ts typecheck` | exit 0 | exit 0 | Pass | `api-e2e-evidence/repo-001-typecheck.log` | — |
| 2 | REPO-002 | 2026-10-09 09:12 | Completed | vitest focused unit dirs (projects, agent-collaboration, agent-tools, agent-communication, agent-team-execution, agent-org-execution, standalone-agent-run-root) | all pass | 139 files, 1115 tests passed | Pass | `api-e2e-evidence/repo-002-focused-unit.log` | — |
| 3 | REPO-003 | 2026-10-09 09:13 | Completed | 2 focused integration files | all pass | 2 files, 17 tests passed | Pass | `api-e2e-evidence/repo-003-focused-integration.log` | — |
| 4 | EXC-E2E-001..007 | 2026-10-09 09:14–09:30 | Checkpoint | new suite iterations (test-assertion corrections only: unknown-Task text, persisted entry shape, Agent-root non-assigner entry) | — | 6 of 7 pass; EXC-E2E-006 observes the generic refusal for a never-started copy | — | `api-e2e-evidence/exc-iter.log`, `exc-e2e-iter/task-existing-copy-assignment.json` | Final run after offsets change |
| 5 | E2E-PRJ | 2026-10-09 09:23–09:30 | Completed | 11 existing `tests/e2e/projects` files in one parallel vitest run (gated scripted AGY) | all pass | 49 passed, 2 skipped (real-model cases), 1 failed: `task-copy-idle-lifetime` Team copy `shutdownAfterEndMs` 58,947 < 59,000 (client receive-time window under 11-file parallel load) | Pass (with non-blocking flaky observation) | `api-e2e-evidence/e2e-prj-existing.log` | Rerun alone |
| 6 | E2E-PRJ (idle-lifetime rerun 1) | 2026-10-09 09:31 | Completed | file alone | pass | failed differently: the Agent root's first delegation was refused because model `gemini-3.8-flash-low` was "not available on antigravity_cli" (catalog validation, no change in this branch) | Not attributed | `api-e2e-evidence/e2e-idle-lifetime-rerun.log` | Rerun again |
| 7 | E2E-PRJ (idle-lifetime rerun 2) | 2026-10-09 09:35 | Completed | file alone | pass | 1 passed | Pass | `api-e2e-evidence/e2e-idle-lifetime-rerun2.log`, `idle-lifetime-rerun2/` | Record as intermittent, unrelated |
| 8 | E2E-AGY-FIX | 2026-10-09 09:30 | Completed | `agy-failure-cli-routing.test.ts`; `RUN_AGY_FAILURE_E2E=1 … agy-native-tool-arguments-transport.e2e.test.ts` | both pass | 1 file pass; 4 tests pass | Pass | `api-e2e-evidence/e2e-agy-native-args.log` | — |
| 9 | BR-001..016 | 2026-10-09 09:40 | Started | `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir api-e2e-evidence/browser-task-closure-tree` | all pass | running | — | `api-e2e-evidence/browser-task-closure-tree/evidence.json` | — |
| 10 | BR-001..016 | 2026-10-09 09:58 | Completed | same | all pass | 15 pass; BR-015 failed on a probe bug (an Agent run with no open task rows renders no task tree; `openRoot` waited for one) | BR-001..014, 016 Pass; BR-015 probe defect | same | Fix probe (`requireTaskTree` option), rerun BR-012..016 |
| 11 | BR-012..016 | 2026-10-09 10:03 | Completed | `--cases BR-012,BR-013,BR-014,BR-015,BR-016 --output-dir api-e2e-evidence/browser-existing-copy` | all pass | 5/5 pass; cleanup: backend exit 0, frontend terminated, browser closed, data root removed | Pass | `api-e2e-evidence/browser-existing-copy/evidence.json` | — |
| 12 | EXC-E2E-001..007 | 2026-10-09 10:05 | Completed | final run, dense race offsets | all pass | 6 pass; EXC-E2E-006 Fail (F-001, 3rd reproduction); race: 24 rounds, both outcomes on both copy kinds, invariants held; cleanup clean; 749 feed frames, 0 invalid | EXC-E2E-006 Fail, rest Pass | `api-e2e-evidence/exc-e2e-final.log`, `exc-e2e-final/` | Route F-001 |
| 13 | REPO-004 | 2026-10-09 10:10–10:25 | Completed | `test:unit`; `test:integration:prepare`; `test:integration` | baseline green | unit 668 files / 5160 tests pass; integration 338 pass, 2 fail = the documented known exception (`agent-status-websocket` content cadence) | Pass | `repo-004-*.log` | — |
| 14 | E2E-LIVE mixed-task-delegation | 2026-10-09 09:56–10:12 | Completed | LM Studio qwen3.8 + Codex gpt-5.6-luna + Claude haiku (first attempt: no default Codex model match) | pass | 4/4 pass | Pass | `e2e-live-mixed-task-delegation.log` | — |
| 15 | E2E-LIVE Claude collaborator suites | 2026-10-09 10:13–10:20 | Completed | `RUN_CLAUDE_E2E=1` agent-initiated-collaborators, standalone-agent-collaborator-mention | pass | agent-initiated: LE-A2/A3/T1/O1 pass; LE-A1, LE-F1 fail; standalone mention: 2 fail. All failures at `@`-mention / catalog assumptions predating this branch (O-003) | Pass for changed scope; unrelated failures recorded | `e2e-live-agent-initiated.log`, `e2e-live-standalone-mention.log` | Separate item |

| 16 | REPO-001/002 (round 2) | 2026-10-09 | Completed | typecheck; focused unit dirs | pass | typecheck exit 0; 139 files, 1116 tests | Pass | `round-2/repo-00*.log` | — |
| 17 | EXC-E2E-006 + 001..007 (round 2) | 2026-10-09 | Completed | whole suite after fix `88e59f500` | pass | 7/7; never-started reason present; generic refusals unchanged | Pass | `round-2/exc-e2e.log`, `round-2/exc-e2e/` | F-001 resolved |
| 18 | E2E reactivation (round 2) | 2026-10-09 | Completed | server rebuild, then `task-reactivation-root-visibility` | pass | build exit 0; 6 pass, 1 skipped (real-model) | Pass | `round-2/build.log`, `round-2/e2e-reactivation.log` | — |
| 19 | BR-012..016 (round 2, attempt 1) | 2026-10-09 | Completed | probe on rebuilt backend | pass | BR-015 failed: probe read B3 root `start: starting` in the designed delivery → `markStarted` window | Fail (probe timing) | `round-2/browser-existing-copy-attempt1/` | Probe waits for `started` |
| 20 | BR-012..016 (round 2, attempt 2) | 2026-10-09 | Completed | same, probe fixed | pass | 5/5; cleanup clean | Pass | `round-2/browser-existing-copy/` | — |
| 21 | EXC-E2E-001..008 (round 2 final) | 2026-10-09 | Completed | `RUN_CLAUDE_E2E=1` added | pass | 8/8; EXC-E2E-008 real Claude recalled `HERON-5842`; race 24 rounds both outcomes; cleanup clean; 762 feed frames, 0 invalid | Pass | `round-2/exc-e2e-final.log`, `round-2/exc-e2e-final/` | — |

| 22 | ELECTRON-001 | 2026-10-09 10:48–11:05 | Completed | `pnpm isolated-app start --build` (iso-54380-fba9); UI journey with the real PTM on Claude haiku 5.5 | follow-up Task to the same copy works in the packaged app | Task A → Team copy; A DONE; follow-up B via `delegate_task({target_team_run_id, task_id})` accepted with explicit IDs; the copy recalled OSPREY-7314; board shows both Tasks with the same root; instance stopped cleanly | Pass | `api-e2e-evidence/electron/` | — |
| 23 | CRR-005 pass | 2026-10-09 11:08–11:15 | Completed | typecheck; standalone root unit; DCM E2E; existing-copy E2E (`RUN_CLAUDE_E2E=1`) on the integrated base | pass | all pass (21/21; 1/1; 8/8) | Pass | `api-e2e-evidence/round-3/` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 23
- Last completed case and result: CRR-005 pass on the integrated base (Pass)
- Cases still running, interrupted, or not started: none
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md` → Test-Case Ledger Reconciliation

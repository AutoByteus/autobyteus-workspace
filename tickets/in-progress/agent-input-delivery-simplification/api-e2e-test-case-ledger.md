# API/E2E Test-Case Ledger — Agent Input Delivery Simplification

## Ledger Meta

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification` (HEAD `1f2758614`)
- Coverage investigation: `api-e2e-coverage-investigation.md`
- Execution coverage report: `api-e2e-execution-coverage-report.md`
- API/E2E revision record: `api-e2e-revision-record.md`
- Scope: multi-root gated server E2E (new race suite), long serial regression set, real-runtime teammate suites, on a heavily loaded shared host
- Last updated: 2026-10-10 (API-REV-001)

Evidence paths are relative to `api-e2e-evidence/`.

## Planned Cases

| Case ID | Case / Journey | REQ / AC | Surface | Entry Point | Order |
| --- | --- | --- | --- | --- | --- |
| R-01 | Build typecheck | — | tsc | `tsc -p tsconfig.build.json --noEmit` | 1 |
| R-02 | Unit layer (delivery, admission, roots, tools, memory, architecture) incl. baseline contract V-2/V-3, roots/engine V-4/CR-001 | AC-001..AC-013 | Vitest | see investigation | 2 |
| R-03 | Integration layer | AC-014 | Vitest | `tests/integration` | 3 |
| TDR-001 | Closure during a held teammate-message write (Agent, Team, Org) | REQ-012, AC-012 | Live API (scripted AGY) | `teammate-delivery-task-closure-race.e2e.test.ts` | 4 |
| TDR-002 | Closure while waiting behind another write, CR-001 (Agent, Team, Org) | REQ-012, AC-012 | Live API | same | 5 |
| TDR-003 | Root keeps working; stop/restore reads history back (Agent, Team, Org) | REQ-012, REQ-008, AC-013 | Live API + persisted reader | same | 6 |
| TDR-B | Race suite on base `46e94fdea` | Discrimination | base worktree | same file | 7 |
| REG-E2E | Scripted-AGY regression set (DTL, existing-copy assignment, contact-host, reactivation, ad-hoc, closure, change feed, context files, task boundaries, Org publication, delegation API surface, AGY compaction transport, Grok compaction replay, idle lifetime) | AC-002..AC-010, AC-014 | Live API (serial) | see report | 8 |
| LIVE-RT | Real-runtime teammate delivery (Claude/Codex Team round trips, busy-member mid-turn delivery) | AC-007, AC-014 | Live API, real models | gated suites | 9 |

## Execution Events

| Seq | Case ID | Time | Event | Configuration | Expected | Observed | Result | Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R-01 | 05:41 | Completed | tsc | exit 0 | exit 0 | Pass | `r01-tsc.log` | — |
| 2 | R-02 | 05:45 | Completed | unit (380 files) | pass | 3229 passed, 1 failed: `agy-configured-skill-linker.test.ts` "links the actual Solution Designer skill…". It reads the user's live `autobyteus-agents` checkout, where `design-examples.md` no longer exists. Machine-dependent and outside this ticket. Delivery-path suites all pass (baseline contract 6/6, roots 21/21, engine 12/12, admission 11/11, agent-run 42/42). | Pass (1 environmental) | `r02-unit.log` | Report to the test's owner |
| 3 | R-03 | 05:57 | Completed | integration | pass except baseline | 22 failed, all 22 in `evidence/v1-baseline/baseline-failures.txt` (application-backend/Brief Studio packages, agent status websocket); 0 new | Pass (baseline) | `r03-integration.log` | — |
| 4 | TDR-001..003 | 06:00–06:40 | Checkpoint | Iterations 1–5 | — | Adapted to the current `delegate_task` result shape; added fixture options (`AGY_FAKE_TOOL_TIMEOUT_MS`, `AGY_FAKE_TOOL_LOG`) after the MCP client's 60 s timeout and opaque protocol errors hid outcomes. Diagnostics proved no server hang: the engine threw `TaskDelegationError` promptly, and the agent sees `MCP error -32603`. Fixed the history file-name match for Team/Org. | — | `tdr-run1..5.log`, `tdr-diag*.log` | — |
| 5 | TDR-001..003 | 06:41 | Completed | final suite | all roots pass | 3/3. TDR-001/002 delivery `TaskDelegationError TASK_AGENT_RESOURCE_CLOSED`; agent saw `-32603`; history `[RACE1, BLOCKER request, BLOCKER, AFTER, POST-RESTORE]`, no `RACEB`; restore snapshot equals pre-stop | Pass | `tdr-run6/`, `tdr-run6.log` | — |
| 6 | TDR-B | 07:00 | Completed | base `46e94fdea` | fails | Agent root: delivery throws `Error: AgentRun input reservation '2' cannot be cancelled.` Team/Org: no sender outcome in 300 s, and the roots can no longer be terminated ("run not found") | Pass (discriminates) | `tdr-base.log`, `tdr-base/` | — |
| 7 | REG-E2E | 07:05 | Started | serial | pass | running | — | `reg-e2e.log` | — |
| 8 | REG-E2E | 07:45 | Completed | 14 files serial | pass | 13/14 pass (DTL 2 + 1 Claude-gated skip, existing-copy assignment 7 + 1 skip, contact-host, reactivation, ad-hoc, closure, change feed, context files, task boundaries, Org publication, delegation API surface, AGY compaction transport, Grok compaction replay). `task-copy-idle-lifetime` failed on timing: 58 961 ms vs 59 000 ms lower bound, load avg ~50 | Pass except one timing flake | `reg-e2e.log` | Rerun alone |
| 9 | REG-E2E | 07:50 | Completed | `task-copy-idle-lifetime` alone | pass | 1/1 | Pass | `idle-lifetime-rerun.log` | — |
| 10 | LIVE-RT | 08:05 | Completed | `RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1`: busy-member mid-turn delivery, Claude/Codex Team round trips | pass | Busy-member mid-turn delivery passes for both the Claude worker and the Codex worker (real teammate `send_message_to` into a running turn). Round trips: 10/10 fail at setup with a GraphQL error (`refType` is not a field of `TeamMemberInput`; nested Team definitions) | Pass (mid-turn); round trips Not Applicable (stale suites) | `live-rt.log` | Compare on base |
| 11 | LIVE-RT | 08:10 | Completed | round trips on base `46e94fdea` | — | Identical 10/10 failures (stale `refType` / nested Team defs). Gated, so absent from the V-1 baseline list | Pre-existing | `live-rt-base.log` | Report to owner |
| 12 | TDR-001..003 | 2026-10-10 | Completed | Round 2 after CRR-003 TR-001/N-1 (exact tool-outcome matching; precondition assertion) | pass; blocker outcome from A lead → mate | 3/3; `blockerAgentSaw.target_agent_run_id` = A's mate in every root; B's delivery started ~3.06 s before Task B closed | Pass | `tdr-run7/`, `tdr-run7.log` | Re-review |

## Re-entry And Reconciliation

- Last durably recorded event: 12
- Cases still running: none
- Next: none (reconciled into the execution report)

# API/E2E Test-Case Ledger

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation`
- Coverage investigation: `tickets/in-progress/delegated-team-member-lazy-activation/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/delegated-team-member-lazy-activation/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/delegated-team-member-lazy-activation/api-e2e-revision-record.md`
- Ledger scope and reason it is required: multi-root, long-running (idle grace 60 s) gated server E2E cases plus several multi-minute regression suites
- Last updated: 2026-10-08 (API-REV-001)

Evidence paths are relative to `tickets/in-progress/delegated-team-member-lazy-activation/api-e2e-evidence/`.

## Planned Cases

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Build typecheck | Removal plan | `tsc -p tsconfig.build.json` | see investigation | 1 | |
| R-02 | Unit layer (Project Task + Team/Org/standalone) | AC-001..006 | Vitest unit | see investigation | 2 | |
| R-03 | Integration layer | AC-006 | Vitest integration | see investigation | 3 | |
| R-04 | Baseline comparison of failing integration files | AC-006, TESTING rule 9 | base worktree | see investigation | 4 | |
| DTL-001 | Delegation starts only the coordinator (Agent/Team/Org) | AC-001, AC-003, QR-001, REQ-004 | Live API (scripted AGY) | `delegated-team-lazy-member-activation.e2e.test.ts` | 5 | task_id in Agent root; description in Team/Org |
| DTL-002 | Coordinator's message starts only its recipient | AC-002 | Live API | same | 6 | |
| DTL-003 | Not-startable member: sender gets delivery failure, member error, coordinator unaffected (Org) | AC-004, REQ-005 | Live API | same | 7 | Only Org placements carry member-specific config |
| DTL-004 | Copy member delegates the Team (Team-hosted copy) (Agent/Team) | AC-003, REQ-004 | Live API | same | 8 | |
| DTL-005 | Idle shutdown + Manager message resumes only the lead | AC-005 | Live API + lifecycle | same | 9 | |
| DTL-006 | Task DONE, reopen, reactivation resumes only the lead | AC-005 | Live API + lifecycle | same | 10 | |
| DTL-007 | Root stop + pre-fix saved tree + restore; legacy-bound member starts fresh on first work | AC-005, persisted data | Live API + persisted reader | same | 11 | |
| DTL-008 | Coordinator that cannot start fails `delegate_task`, no member session (Org) | AC-004 | Live API | same | 12 | |
| DTL-B01 | New E2E on base `ace86bf1f` | Discrimination | base worktree | same file copied | 13 | Temporary |
| REG-E2E | Regression E2E suites (idle lifetime, reactivation, ad-hoc, closure, change feed, context files, task boundaries, Org publication, delegation API surface) | AC-006, AC-005 | Live API | see investigation | 14 | Serial (`--no-file-parallelism`) |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R-01 | 2026-10-08 15:50 | Completed | `tsc -p tsconfig.build.json --noEmit` | exit 0 | exit 0 | Pass | `r01-tsc.log` | — |
| 2 | R-02 | 2026-10-08 15:52 | Completed | unit layer | all pass | 99 files, 837 tests passed | Pass | `r02-unit.log` | — |
| 3 | R-03 | 2026-10-08 15:53 | Completed | integration layer | pass except known baseline | 23 failed in 4 files (agent-team-run-manager 14, configured-scope-readiness 6, team-agent-tools-mcp-lifecycle 1, team-conversation-target-websocket 2); 72 passed | Fail (baseline) | `r03-integration.log` | Compare with base |
| 4 | R-04 | 2026-10-08 15:56 | Completed | same 4 files on base | identical failures | identical 23 failures on base | Pass (baseline confirmed) | `r04-integration-base.log` | Fix stale doubles (rule 9) |
| 5 | R-04 | 2026-10-08 16:01 | Completed | baseline fixes to 4 integration files (test doubles only) | all pass | 8/8, 14/14, 1/1, 3/3 | Pass | rerun output in this session | Commit as baseline fix |
| 6 | DTL-001..008 | 2026-10-08 16:20 | Completed | run3 (all roots) | all pass | Agent: DTL-001,002,004,005,006,007 pass. Team: same pass. Org: DTL-001, 002 pass; DTL-003 fails (lead's tool call result never arrives). DTL-008 pass | Fail | `dtl-e2e-run3.log`, `dtl-e2e-run3/` | Probe DTL-003 |
| 7 | DTL-003 | 2026-10-08 16:30 | Checkpoint | Org-only temporary probe; lead's own scoped MCP session calls `send_message_to` the not-started writer | not-accepted delivery result naming the cause; writer `error` | `MCP error -32603: Internal error` thrown; writer status `offline`, no status events | Fail | `dtl-org-probe.log`, `dtl-org-probe2.log`, `dtl-org-member-failure-probe.log` | Reroute (failure-origin review) |
| 8 | DTL-005..007 (Org) | 2026-10-08 16:34 | Completed | Org-only temporary copy skipping DTL-003 | pass | pass (also DTL-008) | Pass | `dtl-org-rest-probe.log`, `dtl-org-rest-probe/` | — |
| 9 | DTL-B01 | 2026-10-08 16:37 | Completed | new E2E on base | DTL-001 fails | Agent/Team: 4 launches at delegation; Org: `delegate_task` fails with `AGY_MODEL_UNAVAILABLE` (eager writer start) | Pass (discriminates) | `dtl-e2e-base.log` | — |
| 10 | REG-E2E | 2026-10-08 16:38 | Started | serial regression suites | all pass | running | — | `e2e-regression.log` | — |
| 11 | REG-E2E | 2026-10-08 16:53 | Completed | serial batch (9 files) | all pass | 7 pass; `controlled-org-publication-http` fails; `task-copy-idle-lifetime` fails (model discovery timeout, 58.8 s < 59 s bound, idle wait timeout) | Fail (to triage) | `e2e-regression.log` | Triage both |
| 12 | REG-E2E | 2026-10-08 16:56 | Completed | `controlled-org-publication-http` on base and worktree | — | identical failure on base: stale `@`-adds-collaborator assertion | Pass (baseline confirmed) | `org-publication-base.log`, `org-publication-worktree.log` | Baseline fix |
| 13 | REG-E2E | 2026-10-08 16:58 | Completed | same after baseline fix | pass | 1/1 | Pass | `org-publication-worktree-fixed.log` | — |
| 14 | REG-E2E | 2026-10-08 17:02 | Completed | `task-copy-idle-lifetime` alone | pass | 1/1 | Pass | `idle-lifetime-rerun.log` | Batch failure environmental |
| 15 | R-03 | 2026-10-08 17:04 | Completed | integration layer after baseline fixes | all pass | 12 files / 95 tests | Pass | `r03-integration-after-baseline-fix.log` | — |

## Re-entry And Reconciliation

- Last durably recorded event: 15
- Last completed case and result: R-03 rerun Pass
- Cases still running, interrupted, or not started: None
- Next case or recovery action: after the DTL-003 fix, rerun DTL-003 first
- Interruption, context-compression, or rerun note: on rerun after the fix, start with DTL-003 (prior failure), then the full new suite and REG-E2E
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md`, Test-Case Ledger Reconciliation
- Reconciliation note for any case missing a terminal result: —

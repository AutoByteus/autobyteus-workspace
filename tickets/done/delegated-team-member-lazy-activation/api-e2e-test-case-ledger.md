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
| 16 | DTL-003 | 2026-10-08 17:20 | Checkpoint | Round 2 on IR-002 `d30c11204` (later superseded) | not-accepted naming cause; writer `error` | Org: `{accepted:false, code:"AGENT_RUN_ACTIVATION_FAILED", message:"AGY_MODEL_UNAVAILABLE: dtl-retiring-model"}`; writer `error`; the copy with an errored never-started writer still idle-shuts-down; DTL-005..007 pass in Org | Not final (IR-002 superseded) | `r2-dtl-e2e*.log`, `r2-dtl-e2e-final-1/` | Re-run on the SR-003 package |
| 17 | DTL-001..007 | 2026-10-08 17:45 | Checkpoint | Repeated full-suite runs on a heavily loaded host (load avg 20–100; other worktrees' E2E batches) | stable pass | Intermittent test-side failures diagnosed by timed probes: (a) `savedCopyRecords` read every `.json` under the data dir, which took ~60 s once, so legitimately idle-shut-down members (after the 60 s grace) read `offline`; (b) one Org reactivation `send_message_to` returned `accepted:false` once (code not captured) | Not final | `r2-*-probe*.log`, `r2-dtl-e2e-final-2.log` | Test fixes pending validation (below) |
| 18 | — | 2026-10-08 17:50 | Checkpoint | HOLD from Solution Designer: SR-003 supersedes IR-002; await the new implementation package after source review | — | Uncommitted durable-test edits in `delegated-team-lazy-member-activation.e2e.test.ts`: tree-file-only saved-record walk (`TREE_FILES`), grace-aware `expectStatuses` for expected-`idle` members only, result JSON in `accepted:true` assertion messages. Not yet validated by a full run | Not Tested | — | On resume: run the suite on the SR-003 package (DTL-003 first), loop 3×; capture the code if the Org reactivation rejection recurs; then REG-E2E + unit/integration |
| 19 | DTL-001..008 | 2026-10-08 18:40 | Completed | IR-003 `b3b28d47b`, with the round-2 test edits; 3 runs (load 8–30) | pass | Pass ×3; DTL-003: `AGENT_RUN_ACTIVATION_FAILED` / `AGY_MODEL_UNAVAILABLE`, writer `error`, 1 error card | Pass | `r2-ir3-dtl-1..3/` | — |
| 20 | R-01..R-03 | 2026-10-08 18:43 | Completed | tsc, unit, integration | pass | tsc 0; 853/853; 95/95 | Pass | `r2-tsc.log`, `r2-unit.log`, `r2-integration.log` | — |
| 21 | REG-E2E | 2026-10-08 18:46 | Completed | serial 9-file set | pass | 9/9 files; 33 passed, 1 Claude-gated skip | Pass | `r2-e2e-regression.log` | — |
| 22 | DTL-001..008 | 2026-10-08 18:47 | Completed | after the grace-evidence edit | pass | Pass; `graceShutdownAccepted` none | Pass | `r2-ir3-dtl-final/` | — |
| 23 | DTL-009 | 2026-10-08 18:57 | Completed | `RUN_CLAUDE_E2E=1`, real HOME; earlier attempts: "Not logged in" under disposable HOME (fixed: real HOME for the live case); prompt-echo false positive (fixed: assistant reply required) | only the coordinator has a Claude session | `{lead: <session>, others: null}`; full suite 3/3 in that run; default run 2 passed + 1 skipped | Pass | `r2-final-with-claude/`, `r2-final-default/` | — |
| 24 | BR-008..BR-011 | 2026-10-08 19:10 | Completed | built dist + Nuxt + Chrome; new render check | coordinator Idle, unused Offline; restarts | all Pass; `lazyStatuses` `{coordinator: idle, unused: offline}` in all roots; 2 real backend restarts | Pass | `r2-task-closure-tree/` | — |
| 25 | DTL-E01 | 2026-10-08 19:24 | Completed | Packaged Electron app of this worktree (`pnpm --silent isolated-app start --build --keep`, instance `iso-60679-3968`, own data root); test agent package `/tmp/dtl-electron-agent-package` (Manager + 4-member team-local Squad) imported as a LOCAL_PATH package; Manager on real Claude haiku; delegation request typed into the real composer | Only work-reached members start; others gray Offline | Seconds after delegation: lead green, reviewer blue (handoff), writer/tester gray; steady state lead+reviewer green, writer/tester gray; saved tree `writer: null, tester: null`; memory dirs only for lead and reviewer | Pass | `electron/04..06-*.png` | Observation: the Task Team row's screen-reader label reads "offline" while members are active (not rendered visually) |

## Re-entry And Reconciliation

- Last durably recorded event: 25
- Last completed case and result: BR-008..BR-011 Pass; round 2 complete (API-REV-002 Pass)
- Cases still running, interrupted, or not started: None
- Next case or recovery action: none (handoff for test-code review)
- Interruption, context-compression, or rerun note: on rerun after the fix, start with DTL-003 (prior failure), then the full new suite and REG-E2E
- Reconciled into execution coverage report: `Yes` — round 2, `api-e2e-execution-coverage-report.md`, Test-Case Ledger Reconciliation
- Reconciliation note for any case missing a terminal result: —

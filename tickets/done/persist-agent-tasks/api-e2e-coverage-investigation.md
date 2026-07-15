# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/done/persist-agent-tasks/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/done/persist-agent-tasks/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/done/persist-agent-tasks/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/done/persist-agent-tasks/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/done/persist-agent-tasks/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/done/persist-agent-tasks/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Code-review round 5 pass after CR-003 delegated-task naming cleanup; re-evaluate and resume provisional API/E2E work against the updated implementation state.
- Prior Investigation Reviewed: Round 1 provisional/idle coverage investigation produced before the round-3 superseding code-review fail. It is context only; all retained coverage decisions below are revalidated against code-review round 5.
- Latest Authoritative Investigation: Round 2

## Current Requirement And Design Basis

The current approved behavior remains durable visibility/readback for delegated task records while preserving transient runtime authority. Backend task lifecycle transitions must persist normalized address-first `TaskDelegationRecord` records under the root team run file before live events, notifications, and settlement. The root records file must survive active service detach/restart and must be read by `getTaskDelegationRecords(teamRunId)` for active and historical runs. Failed activation remains active/tool-result-only (`not_started`) and must not produce durable rows. Task-team child-run delegations must reserve root-scoped task ids and write to the root records file, not a child-local file. Team-target records must keep `receiverTargetKind = "team"` and use the concrete task-team ingress/coordinator inbox as `receiverAddress`. Task reference content must resolve from persisted records after active service lookup misses. Frontend task display must be persisted-record-first, match the focused address against `senderAddress` or `receiverAddress`, and treat live task-agent/task-team nodes as enrichment only. Persisted records must not authorize task tools after runtime state disappears.

Round-5 code review adds an authoritative frontend naming constraint from CR-003: the persisted task-display path is now delegated-task terminology, not historical `ActiveTasks` terminology. Current implementation paths and symbols use `TeamDelegatedTasksSection`, `TeamDelegatedTaskNavigator`, `TeamDelegatedTaskDetailPane`, `teamDelegatedTaskEntries.ts`, `teamDelegatedTaskTechnicalDetails.ts`, `DelegatedTaskEntry`, and `deriveDelegatedTaskEntries`. Legitimate live-runtime active execution projection names outside this persisted display path remain out of scope for CR-003.

The implementation handoff's `Legacy / Compatibility Removal Check` remains clean: no backward-compatibility mechanisms, no retained legacy old behavior, no durable `not_started` rows, and no duplicate durable sender/receiver/target identity objects. The code review report confirms CR-001, CR-002, and CR-003 are resolved and the latest authoritative result is round 5 pass. The provisional API/E2E durable coverage edits are present in the worktree but have not yet had coverage-code re-review; if retained after this round, the package must return through `code_reviewer` before delivery.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Root-team `task_delegation_records.json` durable records file | Added | `REQ-PTASK-001`-`005`, data contract, design DS-001/DS-004 | Durable coverage must prove persisted activation/submission/review records and readback from file/service/API. |
| Address-first durable `TaskDelegationRecord` shape | Changed | `REQ-PTASK-015`, `REQ-PTASK-018`-`019`, design target shape | Tests must assert `senderAddress`, `receiverAddress`, `receiverTargetKind`, `taskRun`, `updates`, and absence of duplicate target/receiver objects. |
| Active-only pre-activation starting state; no durable `not_started` | Changed/Removed | `REQ-PTASK-016`, `AC-PTASK-014`, DR-001 resolution | Existing activation-failure coverage remains valid; durable coverage must assert no persisted row and no later active review target. |
| Root-scoped task-team child persistence/id allocation | Added | `REQ-PTASK-017`, `AC-PTASK-015`, DR-002 resolution | Need integrated coverage where a child task-team service delegates local work and root readback sees the child record/id. |
| Team-target receiver address is ingress/coordinator inbox | Added/Changed | `REQ-PTASK-019`, `AC-PTASK-017`, design round 3 | Need backend/frontend coverage of exact ingress receiver address matching, not broad team address matching. |
| Task reference content persisted fallback | Added | `REQ-PTASK-009`, `AC-PTASK-007`, design DS-005 | Existing active route coverage is not enough; retain persisted fallback coverage after active registry miss. |
| Frontend task list derives from persisted records and focused addresses | Changed | `REQ-PTASK-006`-`008`, `REQ-PTASK-018`, `AC-PTASK-006`, `AC-PTASK-016` | Retain renamed delegated-task utility/component coverage and run changed-scope frontend suite. |
| Persisted delegated-task display naming | Changed/Cleanup | CR-003 round-5 pass; code-review naming quality and cleanup verdicts | Update API/E2E artifact references and final frontend commands from old `ActiveTask` paths to current `DelegatedTask` paths; run static stale-naming check and renamed affected specs. |
| Persisted records are visible history, not runtime authority | Preserved/Clarified | `REQ-PTASK-010`, `AC-PTASK-010`, implementation assumptions | Retain coverage that records read back after active service removal but active tool operations still do not use them as ledger authority. |
| Existing Team Communication persistence/hydration | Preserved | `REQ-PTASK-011`, `AC-PTASK-009` | Run changed-scope frontend/build checks; no durable task-specific edit should alter message tests. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` | Service-level activation, submit/review lifecycle, notifications, activation failure, team targets, active authority gates, and persisted record update history | `AC-PTASK-001`-`004`, `AC-PTASK-010`, `AC-PTASK-014`, `AC-PTASK-017` | Still Valid after provisional update | Current file contains persisted lifecycle/status/update assertions, team-target persisted receiver assertions, and rejected activation no-row assertions. | Retain and rerun. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-records-service.test.ts` | Records service id allocation, root file writes, missing/corrupt degradation, persisted reference resolution | `AC-PTASK-005`, `AC-PTASK-008`, `AC-PTASK-012`, `AC-PTASK-015`, `AC-PTASK-007` | Still Valid | Covers missing/corrupt files, child-scope writes into root file, high-watermark allocation, and reference lookup from records. | Retain and rerun. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-address-builder.test.ts` | Address construction for root/child/team-target shapes | `REQ-PTASK-017`-`019`, `AC-PTASK-015`-`017` | Still Valid | Handoff/code-review list this as part of backend targeted suite. | Retain and rerun. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-reference-content-service.test.ts` | Active service reference content lookup, missing-reference errors, and persisted fallback after active registry miss | `AC-PTASK-007` | Still Valid after provisional update | Current file contains persisted fallback test. | Retain and rerun. |
| `autobyteus-server-ts/tests/unit/api/task-delegation-route.test.ts` | REST route streams task reference content and maps content errors | `AC-PTASK-007` | Still Valid | Route remains a thin facade over reference content service. | Retain and rerun. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Tool lifecycle integration through `TaskDelegationToolService`, `TaskDelegationRunRegistry`, `TeamRun`, task-agent/task-team activation, child routing, settlement, stale active authority, filesystem-backed records service readback | `AC-PTASK-001`-`004`, `AC-PTASK-010`, `AC-PTASK-014`, `AC-PTASK-015` | Still Valid after provisional update | Current file contains real records service, root readback, registry clear/runtime-authority check, child root-scoped id/readback, no child-local file, and corrected rejected activation expectation. | Retain and rerun. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Live mixed-runtime task delegation via GraphQL-created team, websocket, tool approvals, notifications | Live runtime smoke for task tools; adjacent to `AC-PTASK-001`-`004`, `AC-PTASK-017` | Still Valid, but environment-gated | The file is gated by `RUN_MIXED_TASK_DELEGATION_E2E`/LMStudio/Codex availability and mostly covers live behavior, not deterministic persisted readback. | Run to observe gate; if skipped, record explicitly. |
| `autobyteus-web/utils/__tests__/teamDelegatedTaskEntries.spec.ts` | Persisted-record-first focused sender/receiver matching, team ingress exact receiver match, child final task-agent segment classification | `AC-PTASK-016`, `AC-PTASK-017`, CR-002, CR-003 | Still Valid | Current renamed utility/spec replaces old `teamActiveTaskEntries` path and directly covers key frontend address-perspective behavior. | Retain and rerun. |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Team overview/focus workflow seeded with persisted task records and communication messages | `AC-PTASK-006`, `AC-PTASK-016`, `AC-PTASK-017` | Still Valid | Handoff notes this was updated after CR-001; code review confirms persisted records participate in focus workflow under renamed delegated-task path. | Retain and rerun. |
| `autobyteus-web/components/workspace/team/__tests__/TeamDelegatedTaskNavigator.spec.ts` | Navigator entry-key selection and task-owned references under delegated-task naming | `AC-PTASK-013`, `AC-PTASK-016`, CR-001, CR-003 | Still Valid | Current renamed component/spec replaces old `TeamActiveTaskNavigator` path; code review confirms `entryKey` model remains. | Retain and rerun. |
| `autobyteus-web/components/workspace/team/__tests__/TeamDelegatedTasksSection.spec.ts` | Delegated task section rendering/reference preview with live/persisted entry shape and delegated-task empty state naming | `AC-PTASK-013`, CR-003 | Still Valid | Current renamed component/spec replaces old `TeamActiveTasksSection` path and was included in round-5 validation. | Retain and rerun. |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Team overview task/message integration and delegated-task display path | `AC-PTASK-006`, `AC-PTASK-016`, CR-003 | Still Valid | Included in round-5 validation and changed-scope suite. | Retain and rerun. |
| `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts` | Workspace-level team view integration and delegated-task absence/selector wiring | CR-003 display-path cleanup, frontend integration sanity | Still Valid | Modified by delegated-task rename; code-review handoff notes history/workspace absence-selector suite passed earlier. | Retain and rerun. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Run-history tree absence/selector behavior after delegated-task rename | CR-003 display-path cleanup, run-history integration sanity | Still Valid | Modified by delegated-task rename; relevant to historical display/navigation path. | Retain and rerun. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Existing transient task-agent/task-team projection, cleanup, terminal behavior | `REQ-PTASK-007`-`008`, DS-006 | Still Valid | Live projection cleanup/enrichment semantics must not be broken; legitimate active execution naming remains outside CR-003 persisted display path. | Retain and rerun. |
| `autobyteus-web/graphql/queries/__tests__/runHistoryQueries.spec.ts` | Run-history/team communication query shape plus `GetTaskDelegationRecords` durable field shape | `AC-PTASK-006`, `AC-PTASK-013`, frontend hydration | Still Valid after provisional update | Current file includes task records query-shape coverage for durable address/update/reference fields. | Retain and rerun. |
| Static stale delegated-task display naming check | No residual old active-task component/util/selector/i18n/test-title names in changed persisted display path | CR-003 | Still Valid | Round-5 code review ran this statically; API/E2E should rerun as evidence. | Run `rg` stale-name patterns and expect no matches. |
| `pnpm -C autobyteus-web build` | Production frontend build | Frontend integration sanity | Still Valid | Round-5 report notes build passed after source rename with existing large chunk warnings. | Re-run after authoritative API/E2E execution. |
| `pnpm -C autobyteus-server-ts build` | Server production build | Backend integration sanity | Still Valid | Provisional execution passed; implementation changes after CR-003 were frontend-only naming cleanup, but server build remains a reasonable executable check. | Re-run after authoritative API/E2E execution. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` task-team child local delegation expects `task_0001` inside child service | Child task-team service has a child-local id space | Root-scoped id allocation is now required; child service should reserve from the root file/high watermark. | `REQ-PTASK-014`, `REQ-PTASK-017`, `AC-PTASK-012`, `AC-PTASK-015`, design DS-008 | Updated integration expectations so child task-team local work gets the next root id and root readback sees it. | N/A |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` rejected activation review expects `TASK_NOT_AWAITING_REVIEW` | Rejected activation leaves a stale inactive ledger record | Current durable/active design discards starting entries on rejected activation, so there should be no active record and no durable row for the rejected task id. | `REQ-PTASK-016`, `AC-PTASK-014`, DR-001 resolution | Updated expectation to `TASK_NOT_FOUND` and asserted only accepted activations are persisted. | N/A |
| API/E2E artifact references to old frontend `ActiveTask` coverage paths | Provisional round-1 artifacts named `TeamActiveTask*`, `TeamActiveTasksSection`, and `teamActiveTaskEntries` as active API/E2E execution targets | CR-003 intentionally renamed the persisted display path to delegated-task terminology; old source/test files are deleted in the current implementation. | Code-review round 5 CR-003 resolution and current worktree paths | Update this investigation and execution report to current `TeamDelegatedTask*`, `TeamDelegatedTasksSection`, and `teamDelegatedTaskEntries` paths. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| COV-PTASK-001 | Persisted lifecycle record readback after activation/submission/revision/accept, active registry clear, and recreated records service | `AC-PTASK-001`-`005`, `AC-PTASK-010`-`011`, design DS-001-DS-004 | `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Proves real tool lifecycle writes full durable records and readback survives transient service removal; proves records are not runtime authority. |
| COV-PTASK-002 | Task-team child-run delegation writes root-scoped id/record to root file and readback includes child addresses | `REQ-PTASK-017`, `AC-PTASK-015`, design DS-008 | `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Existing unit coverage uses direct service scope; integration should exercise child task-team tool routing and service scope resolution. |
| COV-PTASK-003 | Persisted task reference content fallback when active registry misses | `REQ-PTASK-009`, `AC-PTASK-007`, design DS-005 | `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-reference-content-service.test.ts` | Existing service test covered active lookup; fallback after active registry miss needs durable coverage. |
| COV-PTASK-004 | Frontend GraphQL `GetTaskDelegationRecords` query includes all durable fields required for hydration/display | `REQ-PTASK-005`-`006`, `AC-PTASK-006`, `AC-PTASK-013` | `autobyteus-web/graphql/queries/__tests__/runHistoryQueries.spec.ts` | Prevents accidental query truncation of address/update/reference fields needed for historical UI. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| COV-PTASK-005 | `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` submit/review lifecycle | Add/retain persisted record assertions for status transitions, update history, reference normalization, and no duplicate record | `AC-PTASK-002`-`004`, `AC-PTASK-011` | Complements integration coverage with focused unit assertions. |
| COV-PTASK-006 | `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` task-team child scenario | Replace child-local id expectation with root-scoped sequence and assert no child-local records file | `AC-PTASK-012`, `AC-PTASK-015` | This is both a stale assertion update and root persistence proof. |
| COV-PTASK-007 | `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` rejected activation scenario | Replace stale `TASK_NOT_AWAITING_REVIEW` expectation with `TASK_NOT_FOUND` and assert rejected task id is not persisted | `AC-PTASK-014` | Discovered during provisional round-1 run and revalidated here before final rerun. |
| COV-PTASK-008 | Frontend changed-scope API/E2E coverage target names | Retarget API/E2E investigation/reporting/execution from old `ActiveTask` display paths to current delegated-task paths | CR-003 round-5 pass | The implementation already renamed durable coverage paths/symbols; API/E2E artifacts and final command list must use current paths before final execution. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None by API/E2E in this round | N/A | N/A | Old active-task display files were already deleted/renamed by implementation for CR-003; API/E2E only revalidates current replacements. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-PTASK-001 | Static/worktree inspection plus final `git diff --check` | Confirms coverage edits and CR-003 naming cleanup have no whitespace errors | Standard execution evidence, not a separate durable test. |
| TEMP-PTASK-002 | Static stale delegated-task display naming search | Confirms no old active-task display naming remains in the persisted delegated-task display path | Static validation is useful evidence but does not need a new repository test beyond existing renamed specs. |
| TEMP-PTASK-003 | Environment check for live mixed-runtime e2e gate | Determines whether `mixed-task-delegation.e2e.test.ts` can be run as live E2E or is intentionally skipped | The live E2E already exists; env availability is not controlled by this ticket. |
| TEMP-PTASK-004 | README-guided live browser smoke with backend and frontend dev servers, using `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=/Users/normy/autobyteus_org/autobyteus-agents,/Users/normy/autobyteus_org/autobyteus-private-agents` and the private `nested-classroom-test` package | Proves the built server can start from the documented flow, the Nuxt frontend can connect to that backend in a real browser, imported agent-team package definitions are visible, and the renamed delegated-task UI text is present without stale active-task display naming | This is environment/startup integration evidence for this package, not a new durable repository test; deterministic unit/integration coverage remains the durable task-record proof. |
| TEMP-PTASK-005 | Live browser launch of `Nested Classroom Test Team` with user-requested Codex runtime and `gpt-5.5` default model, followed by backend process restart and GraphQL readback from the same data directory | Proves the real browser launch path can configure a nested team run with Codex/gpt-5.5, delegate from top-level `Teacher` to nested `StudentStudyGroup`, create a task-team execution, show the delegated-task display surface, and read the accepted task record after backend restart | This is a live smoke of the integrated UI/runtime path; it is not durable deterministic coverage because it depends on local Codex runtime/model availability and LLM behavior. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live LLM/Codex/LMStudio mixed e2e if env vars are not enabled | Existing e2e is explicitly gated and may be skipped locally. | Low for this change because deterministic tool lifecycle integration covers the task delegation boundaries without LLM nondeterminism. | Run when environment is enabled; otherwise report skipped by gate. |
| Disk write failure after lifecycle mutation | Requirements intentionally make persistence failure non-rollbacking and warn-only. Existing coverage can inspect normal and corrupt read paths; inducing write failure reliably is platform-dependent. | Medium residual risk documented upstream. | No escalation; record as residual risk unless a reproducible write-failure harness becomes needed. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified before final rerun | N/A | Requirements/design/code review are explicit; no compatibility wrapper or durable legacy path found in inspected source; CR-003 is resolved in current code review. | N/A |

## Execution Plan

1. Treat round-1 API/E2E artifacts as provisional context only, then update the canonical coverage investigation to this round-2 decision set before final execution.
2. Retain the existing provisional durable coverage edits that remain valid against round-5 implementation: backend lifecycle/readback integration assertions, reference fallback test, persisted lifecycle unit assertions, and frontend task query-shape assertion.
3. Execute static checks:
   - `git diff --check`
   - `rg -n "ActiveTask|activeTask|TeamActiveTask|teamActiveTask|active-task|active_tasks|empty active task state|active task entries" autobyteus-web/components/workspace/team autobyteus-web/utils autobyteus-web/localization/messages -S` expecting no matches in the persisted display path.
4. Run backend targeted coverage:
   - `pnpm -C autobyteus-server-ts test --run tests/unit/agent-team-execution/task-delegation-service.test.ts tests/unit/agent-team-execution/task-delegation-records-service.test.ts tests/unit/agent-team-execution/task-delegation-address-builder.test.ts tests/unit/agent-team-execution/task-delegation-reference-content-service.test.ts tests/unit/api/task-delegation-route.test.ts tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`
5. Run frontend changed-scope coverage against current delegated-task paths:
   - `pnpm -C autobyteus-web test:nuxt --run components/workspace/team/__tests__/TeamDelegatedTaskNavigator.spec.ts components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts components/workspace/team/__tests__/TeamDelegatedTasksSection.spec.ts components/workspace/team/__tests__/TeamOverviewPanel.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts utils/__tests__/teamDelegatedTaskEntries.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts graphql/queries/__tests__/runHistoryQueries.spec.ts`
6. Run production builds: `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build`.
7. Check live mixed-runtime E2E gate and run `mixed-task-delegation.e2e.test.ts`; if skipped by env gate, record as such.
8. Perform README-guided browser validation: start the built backend with a temporary data directory and `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=/Users/normy/autobyteus_org/autobyteus-agents,/Users/normy/autobyteus_org/autobyteus-private-agents`, start the Nuxt frontend against that backend, open the app in a browser tab, verify backend/GraphQL health through the running UI boundary, verify the imported `Nested Classroom Test Team` is visible in Agent Teams from `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test`, inspect the workspace/delegated-task display surface for current delegated-task wording/no stale active-task display naming, then configure and start the nested team using Codex runtime with `gpt-5.5` as requested by the user. The prior `Classroom Simulation Team` browser smoke is retained only as superseded context because the user clarified that the intended browser fixture is `Nested Classroom Test Team`.
9. Update this investigation if any new stale/invalid coverage decision is discovered.
10. Update `/Users/normy/autobyteus_org/autobyteus-worktrees/persist-agent-tasks/tickets/done/persist-agent-tasks/api-e2e-execution-coverage-report.md` with authoritative round-2 evidence.
11. Because repository-resident durable coverage is retained/updated after implementation review and has not yet had coverage-code re-review, route the cumulative package back to `code_reviewer` before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Proceed with final revalidation against the code-review round-5 implementation. No requirement/design ambiguity or implementation compatibility wrapper was found. The follow-up route after passing execution must be `code_reviewer` because repository-resident durable coverage edits are being retained after the implementation review pass and require coverage-code re-review.

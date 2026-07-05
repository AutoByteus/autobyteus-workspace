# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/tickets/in-progress/transient-team-cleanup-bug/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/tickets/in-progress/transient-team-cleanup-bug/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/tickets/in-progress/transient-team-cleanup-bug/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/tickets/in-progress/transient-team-cleanup-bug/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/tickets/in-progress/transient-team-cleanup-bug/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/transient-team-cleanup-bug/tickets/in-progress/transient-team-cleanup-bug/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Code-review pass requesting API/E2E coverage investigation and execution for intermittent stale transient task-team cleanup.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `1`

## Current Requirement And Design Basis

The accepted current behavior is: after a parent agent accepts a delegated task-team result via `review_task_result`, backend settlement must wait for open child work to close, then converge the transient child team runtime to offline/terminated, remove the task-team active handle and directory binding, emit a task-team-scoped root `TEAM_STATUS` `offline` signal consumed by the existing frontend cleanup path, and keep task-delegation history available. Accepted task record state is not itself a runtime terminal signal. Duplicate child wakeups/repeated settlement requests must not launch duplicate destructive termination sequences. Already-stopping/already-absent held child runs are success-equivalent for cleanup, but real active termination failures must remain rejected and preserve active handles. Reconnect/reload/status snapshots must not rehydrate settled task-team handles.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no compatibility shim, no accepted-as-terminal frontend filtering, and obsolete remove-before-stop / active-precheck / restore-for-terminate / unconditional-disposal paths were removed. The code review independently passed the no-legacy/no-backward-compatibility checks. I did not observe an upstream-approved compatibility behavior to preserve.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Accepted task-team result settles backend runtime after child work is closed | Changed | `REQ-002`, `REQ-003`, `REQ-006`, `AC-002`, `AC-007`; design DS-001 | Existing integration task-team lifecycle scenario remains valid and must be executed; add focused durable coverage for active snapshot presence before settlement and absence after accepted settlement. |
| Child/team termination is idempotent for already-stopping/already-absent held runs | Changed | `REQ-004`, `REQ-012`, `REQ-013`, design TC-001 | Existing implementation-added owner-local unit tests remain valid; execute them as part of coverage. |
| Real active child termination failure must remain rejected and preserve handles | Preserved/Changed | `REQ-011`, `AC-009`; design risks | Existing implementation-added unit tests in mixed manager/member handles remain valid; execute them. |
| Duplicate settlement wakeups are single lifecycle signals, not duplicate close operations | Added | `REQ-005`, `AC-003`; design DS-004 | Existing implementation-added settlement-coordinator unit test remains valid; execute it. |
| Scoped root offline signal removes frontend task-team projection; accepted review alone does not | Preserved/Changed | `REQ-007`, `AC-004`, `AC-005`, `AC-006`; design DS-002 | Existing frontend streaming projection coverage remains valid; execute the relevant frontend suite. |
| Reconnect/reload snapshots exclude settled task-team handles | Changed | `REQ-006`, `AC-007`; design DS-003 | Existing backend integration checks active directory removal but not manager snapshots directly; add durable coverage at the mixed manager boundary. |
| Historical task/run evidence remains inspectable | Preserved | `REQ-009`, `AC-008`; integration handoff assumption | Existing task-delegation integration verifies records persist after active cleanup; execute it. |
| Frontend-only accepted filtering or parallel cleanup while stale handles remain | Removed/Rejected | Requirements out-of-scope/constraints; design backward-compatibility rejection log | Do not add coverage that treats accepted as runtime terminal or preserves stale active handles. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` / `runs task-team target ingress, child tool routing, revision, settlement gates, cleanup, and sequential delegation` | Server-managed task-team target flow; parent accept waits while child work is open, then child idle/wakeup settles, active directory clears, stale child context rejects, sequential same-team delegation creates a new task-team run, records persist. | `AC-001`, `AC-002`, `AC-007` partial, `AC-008`, design DS-001/DS-004 | Still Valid | Directly exercises task-delegation service/router/run-registry/directory with task-team target and no external LLM dependency. It remains aligned with accepted current behavior. | Execute as final coverage; retain. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` / live team-target activation | Live GraphQL/websocket task-team target activation and visible activation copy. | `AC-001`, activation half of DS-001/DS-002 | Still Valid | The test is still valid but gated by `RUN_MIXED_TASK_DELEGATION_E2E` / live runtime availability and only covers activation, not accepted cleanup. | Treat as optional live E2E; do not rely on it as the only proof. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-team-settlement-coordinator.test.ts` | Known inactive task-team binding settlement; duplicate child wakeups collapse to one settling lifecycle and directory cleanup. | `REQ-003`, `REQ-005`, `AC-002`, `AC-003`, design DS-004 | Still Valid | Added before code review and reviewed as owner-local lifecycle coverage. | Execute. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts` / termination lifecycle | Repeated terminate joins one sequence, new work rejected while terminating, root offline once; active child termination rejection preserves active state. | `REQ-004`, `REQ-011`, `REQ-012`, `AC-009`, design TC-001 | Needs Update | Existing tests are valid but do not directly assert task-team handle snapshot presence before settlement and absence after accepted settlement, which is a DS-003/AC-007 gap. | Add one focused durable scenario, then execute. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-task-team-member-handle-termination.test.ts` | Scoped root offline fallback before disposal; rejected child termination does not publish offline or dispose child run. | `REQ-007`, `REQ-011`, `AC-004`, `AC-009`, design DS-002 | Still Valid | Added before code review and directly covers handle bridge/fallback failure semantics. | Execute. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-termination.test.ts` | No restore solely to terminate an absent local run; rejected active termination keeps local run attached. | `REQ-004`, `REQ-011`, `REQ-012`, design TC-001 | Still Valid | Added before code review and covers the log-observed inactive/restore failure class. | Execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts` and `autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts` | Native active/stopping lifecycle and held native terminate convergence/new-work gating/stop failure behavior. | `REQ-004`, `REQ-011`, `REQ-012`, `REQ-013`, design TC-001 | Still Valid | Reviewed owner-local tests for the lower-level contract settlement depends on. | Execute. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` task-team projection scenarios | Accepted review marks projection accepted but does not remove on idle; scoped root offline/terminal event removes task-team root, children, nested task agents, and focus; sequential delegations stay distinct. | `AC-004`, `AC-005`, `AC-006`, `AC-001`, design DS-002 | Still Valid | Existing frontend contract is intentionally preserved by requirements and code review. | Execute focused frontend suite. |
| `autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` | Live nested mixed team routing/restoration with AutoByteus, Codex, Claude. | General nested runtime confidence; not task-delegation cleanup-specific | Out Of Scope | Requires multiple live runtimes and does not cover accepted task-team cleanup. | Do not run as required final evidence for this bug. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts` | Live mixed runtime message routing/restoration. | General mixed runtime confidence; not task-delegation cleanup-specific | Out Of Scope | Gated by live runtimes and not specific to accepted task-team settlement. | Do not run as required final evidence for this bug. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No relevant stale/obsolete durable coverage found during investigation. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `APIE2E-001` | A mixed parent runtime with an active task-team handle exposes the handle in member status snapshots before settlement; after accepted `settleTaskTeamInstance`, the task-team handle is removed from snapshots and the known active directory binding is gone. | `REQ-006`, `AC-001`, `AC-007`, design DS-003 | Update `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts` with a focused manager-boundary scenario using a fake child `TeamRun`. | Existing integration verifies active-directory cleanup but does not directly cover the manager snapshot surface that reconnect/reload relies on. This keeps coverage close to the owner boundary without requiring flaky live LLM E2E. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `APIE2E-001` | `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts` | Add one scenario under mixed manager lifecycle/snapshot behavior. | `REQ-006`, `AC-001`, `AC-007`, design DS-003 | Repository-resident durable coverage will change; route back through `code_reviewer` after execution. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `TEMP-001` | Run the live `mixed-task-delegation.e2e.test.ts` command without enabling live runtime env flags, only to confirm it remains gated/skipped in this local environment if needed. | Documents why live LLM E2E was not used as primary proof. | The live test already exists; forcing live runtimes is environment-dependent and outside this deterministic local coverage pass. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Fully autonomous live `Nested Classroom Test Team` LLM flow through parent delegate, child result, parent accept, websocket cleanup, and reconnect | Requires live model behavior, tool approval orchestration, and user-specific configured team/runtime state. Deterministic server-managed integration plus owner-local lifecycle tests cover the code paths without depending on model compliance. | Medium residual confidence gap for the exact production team configuration, mitigated by exercising the same backend lifecycle owners and frontend cleanup contract. | None for this ticket unless local deterministic coverage fails or maintainers require live runtime E2E. |
| Actual browser UI sidebar visual assertion | The changed contract is backend runtime state and frontend streaming projection; existing frontend service tests assert projection state without browser rendering. | Low; UI component rendering is downstream of the same projection state. | None. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No ambiguity or compatibility/legacy reroute trigger found during coverage investigation. | N/A |

## Execution Plan

1. Add focused durable coverage `APIE2E-001` to `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts` for task-team snapshot presence before accepted settlement and absence after accepted settlement/directory unbind.
2. Run the updated focused mixed manager test.
3. Run the deterministic task-delegation integration test covering task-team target ingress, accepted settlement gates, cleanup, sequential delegation, and history persistence.
4. Run reviewed owner-local lifecycle coverage for settlement coordinator, task-team handle, agent-member handle, native backend/factory, and frontend streaming projection contract.
5. Run source build typecheck and `git diff --check`; document the known broad server `typecheck` TS6059 repo-config issue rather than treating it as an implementation failure.
6. Because repository-resident durable coverage will be updated after code review, write the execution coverage report and route the cumulative package back to `code_reviewer` for narrow coverage-code re-review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Existing durable coverage is mostly valid and no stale coverage should be removed. One DS-003/AC-007 gap merits a narrow backend manager snapshot coverage addition before final execution.

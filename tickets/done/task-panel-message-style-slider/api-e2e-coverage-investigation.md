# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/task-panel-message-style-slider/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/task-panel-message-style-slider/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/task-panel-message-style-slider/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/task-panel-message-style-slider/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/task-panel-message-style-slider/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/task-panel-message-style-slider/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review-passed package for frontend Team tab task split resize and task reference preview cleanup.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1, this artifact.

## Current Requirement And Design Basis

The approved work is a bounded desktop/web Team tab UI behavior change. The task section must mirror the message section's horizontal master/detail split behavior with a vertical draggable separator and clamped navigator width. The shared resize policy must preserve existing message split behavior. Task reference selection must directly show the reference file content in the right pane with no task-specific `Back to task` or `team-reference-viewer-back` control; clicking the task row again is the approved return path to task body content. Existing task focus behavior must stay unchanged. The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no compatibility mechanisms were introduced, old task-back behavior was not retained, stale production back-label/emit/localization paths were removed, and the shared resize structure remains tight.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Task list/detail horizontal split in `TeamActiveTasksSection.vue` | Added / Changed | REQ-001..REQ-003, AC-001..AC-002, DS-001 | Execute durable component coverage that checks handle role/orientation, initial width, drag growth, and min/max clamp behavior. |
| Shared horizontal split resize policy in `useHorizontalSplitResize.ts` | Added | Requirements design-health assessment; DS-005; implementation handoff | Covered through task and message component behavior rather than private composable internals. No extra durable unit test needed while API is this small and callers exercise it. |
| Existing message split behavior after extraction | Preserved | REQ-004, AC-003, DS-004 | Execute existing message regression coverage for initial width and clamp bounds. |
| Task reference preview in right pane | Changed | REQ-006..REQ-008, AC-004..AC-005, DS-002..DS-003 | Execute task section coverage for reference preview, no back control, and row-click return; execute task reference viewer coverage for task-owned content route and absence of `team-reference-viewer-back`. |
| Task-specific preview back navigation | Removed | REQ-007, REQ-010, Legacy Removal Policy, Decommission Plan | Treat any remaining production `back_to_task`, `backLabel`, `back-label`, task reference `back` emit, or `team-reference-viewer-back` UI as invalid legacy retention. Static scan required. |
| Existing task focus actions and task-team member focus rows | Preserved | REQ-009, AC-006 | Execute durable focus coverage in `TeamActiveTasksSection.spec.ts` and workflow-level `TeamFocusSendWorkflow.spec.ts`. |
| Backend/API reference content routes | Preserved | Constraints: task route `/team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content`; message route preserved | Execute task and message reference viewer route tests; no backend/API implementation changed, so no server API coverage additions required. |
| Mobile Team Messages/Tasks UX | Out Of Scope | Requirements out-of-scope list | No mobile-specific validation. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Task section collapse/count, task selection, reference preview branch, row-click return, task split handle role/orientation/initial width/clamps, focus button/member-row emits, empty state. | REQ-001..REQ-003, REQ-005..REQ-009, AC-001..AC-002, AC-004..AC-007, DS-001..DS-003 | Still Valid | Test assertions now match approved behavior; code review passed these durable changes. | Execute. |
| `autobyteus-web/components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts` | Message panel layout, message rows/reference rows, message split initial width/clamps, selected message reference route identity passed to viewer. | REQ-004, AC-003, UC-004, DS-004 | Still Valid | Message UI is the source-of-truth pattern and must not regress after resize extraction. | Execute. |
| `autobyteus-web/components/workspace/team/__tests__/TeamTaskReferenceViewer.spec.ts` | Task reference viewer builds the task-owned content URL and does not render `team-reference-viewer-back`. | REQ-006..REQ-008, REQ-010, AC-004, AC-008, DS-002 | Still Valid | Test directly covers removed back control and preserved task content route. | Execute. |
| `autobyteus-web/components/workspace/team/__tests__/TeamCommunicationReferenceViewer.spec.ts` | Message reference viewer fetches authorized content route, handles binary/text/error/maximize/raw-preview states. | REQ-004, AC-003, constraints preserving message content route | Still Valid | Message reference behavior is intentionally unchanged; execute as regression coverage around adjacent viewer behavior. | Execute. |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Focusing task-agent/task-team members from Tasks updates focused member and send-message routing. | REQ-009, AC-006 | Still Valid | Focus behavior is explicitly preserved; code review noted this test lost only stale fixture label. | Execute. |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Parent Team tab section expansion/collapse and identity passing to child panels. | Scope boundary; existing Team tab section behavior preserved | Still Valid | Task change must not alter parent-owned expansion/collapse behavior. | Execute. |
| `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts` | Broader Team workspace view rendering/selection behavior. | Indirect Team tab integration | Still Valid | Not directly changed, but included in Team suite smoke coverage if execution cost remains low. | Execute with full Team component suite. |
| `autobyteus-web/components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts` | Event monitor behavior unrelated to task split/reference preview. | Not related to changed scope | Out Of Scope | Same folder but different Team event-monitor surface. | Execute only as part of full Team suite; failures would be classified by current requirements before routing. |
| `autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.focusedInterrupt.e2e.spec.ts` | Focused team member interrupt WebSocket behavior. | Not related to task split/reference preview | Out Of Scope | Existing `.e2e`-named Vitest file covers agent input focus, not the changed Team task UI. | Do not execute for this task unless broader suite is requested. |
| `autobyteus-web/tests/integration/*` and store tests outside `components/workspace/team` | Miscellaneous integration/store behaviors. | Mostly unrelated to changed frontend Team task detail UI | Out Of Scope | No backend/API/store contracts changed. | Do not execute for targeted API/E2E pass. |
| Repository browser E2E framework files | Durable browser-level Team tab coverage. | Would be useful for full visual drag feel if present | Out Of Scope / Not Present | Search found no Playwright/Cypress config or Team browser E2E harness in `autobyteus-web`; package has `playwright-core` only as a dependency, not an established durable browser suite. | Use existing Nuxt/Vitest component/integration coverage and record visual feel residual. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A for this API/E2E round | The stale back-button assertions were already updated/removed by implementation before code review. | Code review confirmed no remaining blocking stale durable coverage. | REQ-007, REQ-010, design Legacy Removal Policy, implementation handoff cleanup notes. | Current `TeamActiveTasksSection.spec.ts` and `TeamTaskReferenceViewer.spec.ts` assert no back control and row-click return. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | Existing reviewed durable component coverage already covers the required in-scope boundaries. No post-code-review durable coverage addition is planned. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No post-code-review durable coverage update is planned. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | No post-code-review durable coverage removal is planned. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TV-001 | Run `node ./scripts/guard-localization-boundary.mjs` from `autobyteus-web`. | Locale boundary remains valid after removing `back_to_task`. | Project guard, not a new test artifact. |
| TV-002 | Run static scan for in-scope legacy back-navigation references: `rg -n "back_to_task|backLabel|back-label|@back=|\\(e: 'back'\\)|Back to task" autobyteus-web/components/workspace/team autobyteus-web/localization/messages/en/workspace.ts autobyteus-web/localization/messages/zh-CN/workspace.ts || true`. | Confirms no production Team task back-navigation compatibility path remains. | One-off validation evidence; durable absence is already guarded by reviewed tests/localization cleanup. |
| TV-003 | Run targeted Nuxt/Vitest Team component suite under `NUXT_TEST=true`: all `autobyteus-web/components/workspace/team/__tests__/*.spec.ts`. | Exercises task resize, task reference no-back/row return, message resize regression, task focus workflow, parent Team section behavior, and adjacent Team components in the project test harness. | Existing durable tests remain in repo; the command execution evidence belongs in the execution report. |
| TV-004 | Run `git diff --check origin/personal`. | Confirms no whitespace errors in changed sources/artifacts. | Repository hygiene check, not durable coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Pixel-perfect manual drag feel in a live browser with real backend-populated Team data | No established repository-resident browser E2E harness or seeded backend Team tab scenario exists for this UI surface; this task did not change backend APIs. Component tests exercise the DOM handle, stateful drag events, and clamp behavior. | Low-to-medium visual/product tuning risk only; code/design already identify possible width preference (`248px` vs `232px`). | Delivery/user verification may inspect live desktop UI if desired. No requirement/design gap because accepted behavior and bounds are specified and covered. |
| Mobile Team Messages/Tasks UX | Explicitly out of scope. | None for this task. | None. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified before execution. | N/A | Upstream artifacts and implementation/code review are aligned; Legacy / Compatibility Removal Check is clean. | N/A |

## Execution Plan

1. Use temporary `node_modules` symlinks to the already-installed superrepo dependency install if the isolated worktree still lacks dependencies; remove them after execution.
2. Run localization boundary guard.
3. Run the in-scope static legacy-back scan.
4. Run `nuxi prepare` if needed by the Nuxt/Vitest environment.
5. Execute the full Team component test suite with `NUXT_TEST=true pnpm exec vitest run components/workspace/team/__tests__/*.spec.ts`.
6. Run `git diff --check origin/personal`.
7. Remove temporary dependency symlinks and generated `.nuxt` / `.nuxtrc` artifacts if created.
8. Record results in the canonical execution coverage report.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing reviewed durable component/integration coverage is valid for the approved UI boundaries. This API/E2E round will execute that coverage plus guards/static probes without changing repository-resident durable coverage after code review.

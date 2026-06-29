# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-active-task-member-order/tickets/done/team-active-task-member-order/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-active-task-member-order/tickets/done/team-active-task-member-order/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-active-task-member-order/tickets/done/team-active-task-member-order/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-active-task-member-order/tickets/done/team-active-task-member-order/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-active-task-member-order/tickets/done/team-active-task-member-order/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-active-task-member-order/tickets/done/team-active-task-member-order/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass requested API/E2E coverage investigation and execution for the Team tab active-task task-team member-row ordering change.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved change is a UI-only clean reorder in `TeamActiveTasksSection.vue`. For selected `task_team` active task entries that have members, the existing `[data-test="active-task-member-row"]` controls must render before `[data-test="active-task-task-body"]`, directly after the selected task header/status/primary Focus button and any waiting notice. The existing member row visual treatment, text, selectors, aria/title labels, initials, and `select-member` emission must be preserved. Selected `task_agent` entries must still render no member focus rows. Existing selected-task header/status chip, primary Focus button, waiting notice, markdown task body, technical details, and task reference preview behavior must remain unchanged. No backend/API, store, data-model, feature-flag, duplicate-row, compatibility, or new-copy behavior is in scope.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanism was introduced, the old below-markdown row placement was not retained, and no shared structure or API shape changed. Static inspection of the current diff confirms one member-row block was moved from after `MarkdownRenderer` to before it, with `mt-5` changed to `mb-5`; no duplicate below-body row or compatibility branch exists.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Task-team selected task detail render order | Changed | Requirements AC-001; design target order; implementation handoff says member rows moved before markdown | Execute durable component coverage that asserts member row appears before task body in DOM order. |
| Member-row click/focus emission | Preserved | Requirements AC-002; design preserves `emit('select-member', memberRouteKey)`; code review pass | Execute component event coverage and workflow coverage for focused member send path. |
| Task-agent selected task detail member rows | Preserved | Requirements AC-003; implementation handoff adds/keeps task-agent no-row coverage | Execute component coverage for task-agent body and absence of member rows. |
| No new member-row label/helper copy | Preserved | Requirements AC-004; design forbids labels/helper text; code review found no new copy | Execute component coverage that inspects existing text/no historical labels through the active detail tests; no separate browser visual check required. |
| Reference-preview behavior | Preserved | Requirements AC-005; design lists reference preview as off-spine concern unchanged | Execute component coverage that switches to task-owned reference preview and returns to task body. |
| Backend/API/store/data model | Preserved / Out of scope | Requirements Out of Scope; design dependency rules; code review found no API/store changes | No API or backend durable coverage required for this task. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` / `renders task-team member focus rows as primary controls` | Selects a task-team entry, verifies the member row text/Focus control, asserts DOM order `active-task-member-row` before `active-task-task-body`, and verifies click emits `select-member` with `task-team-run-1/solution_designer`. | AC-001, AC-002; design target order and event boundary preservation. | Still Valid | Static inspection shows this reviewed scenario directly covers the changed render order and preserved click event. | Execute in final validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` / `does not render task-team member focus rows for task-agent entries` | Selects a task-agent entry, verifies its body renders, and verifies no `[data-test="active-task-member-row"]` exists. | AC-003; design preserves task-agent no-row behavior. | Still Valid | Scenario directly maps to the required task-agent edge case. | Execute in final validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` / `switches the whole right pane to a task-owned reference preview and returns to task body` | Opens a task reference, verifies the detail body is replaced by `TeamTaskReferenceViewer`, then reselects task and verifies task body returns. | AC-005; design says reference preview must remain unaffected. | Still Valid | Scenario exercises the reference preview switch around the changed detail pane. | Execute in final validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` / `opens into master/detail, selects first task, and shows task refs only in the left navigator` | Verifies selected task body, primary Focus button, technical details, absence of old/non-required labels/copy, reference rows only in navigator, and no obsolete task approval controls. | AC-004, AC-005 and surrounding preserved detail behavior. | Still Valid | Scenario validates no new visible task-type labels/helper copy in the detail pane and preserves adjacent UI behavior. | Execute in final validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` / `selects tasks for reading without focusing; explicit focus buttons emit focus requests` | Verifies selecting a task row does not emit focus and the primary Focus button emits the selected task route key. | AC-005; design preserves task selection and primary Focus behavior. | Still Valid | Adjacent task-detail behavior remains required and the changed block must not alter selection/focus semantics. | Execute in final validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` / `focuses a task-team member from Tasks, sends to that focused member, renders the message, and keeps Messages identity updated` | Mounts the Team overview workflow with stores, selects a task-team row, clicks a member focus row, verifies focused route/run identity, sends a message, and verifies stream target segments. | AC-002; design event spine from member row -> parent/store focus hydration -> message send target. | Still Valid | This is the durable workflow-level proof that the preserved row click still reaches the focus and send-message boundary. | Execute in final validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` / `focuses a task target from Tasks, sends to that focused target, and renders the submitted message` | Verifies primary task Focus path for task-agent target and message routing. | AC-005 and preserved primary Focus behavior. | Still Valid | Adjacent workflow remains required; row reorder must not break existing task focus semantics. | Execute in final validation. |
| `autobyteus-web/components/workspace/team/__tests__/TeamTaskReferenceViewer.spec.ts` | Tests internals of the standalone task reference viewer component. | AC-005 only indirectly. | Out Of Scope | The viewer implementation and API were not changed; `TeamActiveTasksSection.spec.ts` already covers preview switching at the affected boundary. | Do not run for final validation unless a failure points to viewer internals. |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Tests parent-owned section expansion and message identity behavior. | Adjacent Team overview behavior, not the member-row order or selected task detail. | Out Of Scope | The changed component/event boundary is already covered by `TeamFocusSendWorkflow.spec.ts`; no parent expansion behavior changed. | Do not run for final validation. |
| `autobyteus-web/services/**/__tests__`, `autobyteus-web/stores/**/__tests__`, `autobyteus-web/tests/integration/**` | Service, store, and integration coverage for streaming, run open, team communication, and definitions. | Backend/API/data-model behavior is out of scope. | Out Of Scope | Requirements, design, implementation handoff, and code review all identify no API/store/data-model changes. | Do not run for final validation. |
| Browser/native E2E coverage inventory | No Playwright/Cypress browser scenario for the Team active task detail was found; repo test scripts use Vitest/Nuxt for this UI area. | UI-only DOM order can be proven at component/workflow boundary. | Out Of Scope / No Existing Artifact | `autobyteus-web/package.json` exposes `test:nuxt`; relevant Team coverage is Vue Test Utils-based. | No new browser E2E coverage needed for this narrow reorder. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale durable coverage identified during investigation. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | The implementation already added/updated the necessary component coverage before code review; no additional repository-resident durable coverage is needed at API/E2E stage. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No API/E2E-stage durable coverage update required. The reviewed implementation already contains the required component spec update. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | `git diff --check` from task worktree | Confirms no whitespace/diff hygiene issues in reviewed source/test/artifact state. | Repository-resident test not appropriate; this is a one-off hygiene command. |
| TEMP-002 | Targeted Nuxt/Vitest run: `pnpm --dir autobyteus-web test:nuxt run components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Executes all valid durable component/workflow scenarios for task-team order, task-agent no-row behavior, reference preview, primary/member focus behavior, and send workflow. | The tests themselves are durable; the command invocation/evidence is task-specific. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Pixel-perfect browser screenshot/visual regression | No browser visual regression harness exists for this component, and the requirement is DOM/render order plus preserved existing style rather than new layout pixels. Component coverage verifies selectors/order/behavior. | Low; residual visual-spacing risk was already accepted upstream. | None. |
| Backend/API/server behavior | No backend/API behavior changed or required. | Low / none. | None. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No ambiguity, compatibility wrapper, duplicate row, stale-test requirement conflict, or implementation local-fix trigger found. | N/A |

## Execution Plan

1. Keep repository-resident durable coverage unchanged during API/E2E stage.
2. Run `git diff --check` as temporary hygiene validation.
3. Run the targeted Nuxt/Vitest component/workflow suite: `TeamActiveTasksSection.spec.ts` and `TeamFocusSendWorkflow.spec.ts`.
4. Capture pass/fail output, environment notes, and any warnings in the canonical execution coverage report.
5. If all planned checks pass and no durable coverage changes are made by API/E2E, hand the cumulative package to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing reviewed component/workflow coverage is sufficient for this UI-only reorder. No stale coverage, requirement gap, design impact, or compatibility-only behavior was found.

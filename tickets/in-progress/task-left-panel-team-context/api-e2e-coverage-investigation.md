# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/design-spec.md`
- Supporting Product Analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/analysis-recommendation.md`
- Solution Design-Impact Rework: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/solution-design-impact-rework.md`
- API/E2E Design-Impact Reroute: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/api-e2e-design-impact-reroute.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/code-review-report.md`
- Current Investigation Round: 3
- Trigger: Code-review Round 4 pass for the final post-feedback Team Active Tasks UX.
- Prior Investigation Reviewed: Round 2 investigation/execution passed the corrected Team-owned host, but is superseded for the final post-feedback delta because the right detail pane was simplified to content/reference-only and reference rows were restyled.
- Latest Authoritative Investigation: Round 3

## Current Requirement And Design Basis

The current approved behavior keeps active-task navigation inside the Team tab Active Tasks master/detail split, not in the global Workspaces tree. `TeamActiveTasksSection.vue` owns local selected task/reference state and composes the left `TeamActiveTaskNavigator.vue` plus the right `TeamActiveTaskDetailPane.vue`. The left navigator renders task summary -> responsible actor/team row -> optional member rows -> References/file rows -> collapsed Technical details. Summary and reference rows select right-pane content only and must not focus the center composer/subteam. Actor/team/member rows in the left navigator are the only active-task controls that request focus.

The final post-feedback implementation delta tightens the right pane: `TeamActiveTaskDetailPane.vue` is now content/reference-only. It must start directly with selected task body or selected reference preview and must not duplicate actor/team heading, task status chip, waiting notice, right-side Focus button, roster, reference list, or technical metadata. `TeamActiveTasksSection.vue` no longer listens for focus from the detail pane. Reference file rows in `TeamActiveTaskNavigator.vue` are restyled for clearer original-row readability while staying in the required left navigator position.

The implementation handoff's Legacy / Compatibility Removal Check is clean: no backward compatibility mechanisms, no old global-tree active-task host, no cross-surface active-task stores/composables, no `openRightPanel()` activation path, and no right-detail focus compatibility path. Code review Round 4 independently passed these invariants.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Team tab Active Tasks remains the active-task host | Preserved | `REQ-001`, design DS-001, implementation handoff, code review Round 4 | Re-execute Team navigator/section coverage and browser smoke. |
| Global Workspaces tree remains workspace/run/team/member-only | Preserved / Removed old path | `REQ-002`, `REQ-020`, `AC-010`, `AC-015`, solution rework | Re-execute negative Workspaces-tree coverage and browser DOM/screenshot check. |
| Right detail pane is content/reference-only | Changed / Removed duplicate UI | Code review Round 4 scope; implementation handoff; `REQ-016`, `AC-009` | Existing section/workflow tests now assert no right Focus button and no duplicated actor/team title; browser smoke must verify no right heading/status/waiting/focus. |
| Active-task focus can only originate from left actor/member rows | Changed / Tightened | Code review Round 4; design DS-002; `REQ-006`, `REQ-012`, `AC-006`, `AC-007` | Execute focus workflow tests and browser summary-vs-actor click check. |
| Reference rows remain in the left navigator but with clearer row styling | Changed presentation | Code review Round 4; implementation handoff boundary notes; `REQ-013`, `AC-008`, `AC-013` | Execute navigator tests for style/class semantics; browser verify visible clearer row and preview using a live smoke task with an absolute-path reference file. |
| Technical details remain left/collapsed and absent from right detail | Preserved | `REQ-015`, `REQ-016`, `AC-009` | Execute navigator/section coverage and browser inspect. |
| Prior Round-2 browser result with right-side title/status/waiting/Focus | Stale / Replaced | Code review Round 4 and user feedback image | Browser evidence must be refreshed; previous screenshots remain history only. |
| Full typecheck signal | Unclear/Blocked check | Code review Round 4 typecheck OOM log | Attempt or record typecheck evidence; grep changed paths where useful, but do not claim full typecheck success. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts` | Direct single-agent and task-team navigator hierarchy, summary text-only, actor/member status dots, references, collapsed technical metadata, events, and Round-4 reference-row styling | `AC-001` through `AC-005`, `AC-008`, `AC-009`, `AC-012`, `AC-013`; DS-001/DS-003 | Still Valid | `TeamActiveTaskNavigator.vue` remains the final left navigator owner; Round-4 tests cover reference row scale/interactions. | Execute. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Section owns local split and selection; right detail renders task body/reference preview; no right Focus button; no duplicated actor/team title; no right technical/reference navigation; actor rows emit focus | `REQ-001`, `REQ-005`, `REQ-006`, `REQ-014`, `REQ-016`, `AC-006`, `AC-008`, `AC-009`, `AC-014` | Still Valid | Code review Round 4 confirms tests were updated for content-only detail. | Execute. |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Focuses task target from the left actor row and verifies task-team summary selection does not focus or reintroduce right-side member navigation | `REQ-006`, `REQ-012`, `AC-006`, `AC-007` | Still Valid | Round-4 focus ownership is now left-actor-only. | Execute. |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Messages/Tasks section expansion remains local to Team overview and Messages opens first on team-run reset | Corrected design answer 4; `REQ-001`; local section ownership | Still Valid | Post-feedback delta did not change Team overview ownership. | Execute. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` — negative active-task context under expanded live team | Ensures global Workspaces tree does not render active-task navigator/summary/reference/technical selectors | `REQ-002`, `REQ-020`, `AC-010`, `AC-011`, `AC-015`; DS-004 | Still Valid | Global tree host remains forbidden and code review rechecked stale refs. | Execute. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` — broader workspace/team/member behavior | Verifies existing global tree navigation/status behavior | `AC-011`; DS-004 | Still Valid | Workspaces tree still owns normal navigation only. | Execute targeted file. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Regression coverage for team selection/hydration/expansion/draft cleanup | DS-004 | Still Valid | No post-feedback changes here, but still part of focused boundary. | Execute. |
| `autobyteus-web/composables/__tests__/useRightPanel.spec.ts` | Remaining right-panel width/clamping behavior after removing obsolete `openRightPanel()` | Implementation handoff removal notes | Still Valid | `useRightPanel` remains changed in task scope; old activation path must stay gone. | Execute. |
| `autobyteus-web/utils/__tests__/workspaceStatusDotPresentation.spec.ts` | Shared status-dot class/status color mapping | `REQ-018`, `AC-012`, DS-003 | Still Valid | Status-dot presentation still serves Workspaces and task navigator only as a display primitive. | Execute. |
| `active-task-focus-primary` positive right-detail focus selector | Old Round-3/earlier right Focus button behavior | Round-4 removed right-side Focus button and detail `select-member` emit | Stale / Remove | Code review Round 4 states selector appears only in negative tests; detail pane no longer emits focus. | Verify absence in production and execute negative tests. |
| Prior browser screenshots `corrected-team-active-tasks-live.png`, `corrected-actor-focus-behavior.png`, `corrected-technical-details-expanded.png` | Round-2 browser evidence where the right pane still showed duplicated actor/title/status/waiting/Focus | Round-4 post-feedback delta | Replace | The host placement result remains useful history, but final right-pane content-only behavior must be re-captured. | Capture new Round-4 browser screenshots. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskContextTree.spec.ts` and old global-tree-positive tests | Prior global-tree host component/scenario | Superseded by corrected design | Stale / Remove | Already deleted/replaced before Round 4. | Verify obsolete refs remain absent. |
| Broader backend/API/store tests outside the UI boundary | General runtime state and APIs | Backend status model is out of scope | Out Of Scope | No backend/API contract changed. | Do not execute unless browser/runtime points there. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Positive right-detail Focus-button behavior / `active-task-focus-primary` in production | Right task detail contains a Focus button or emits focus | Round 4 intentionally removes right focus affordance; focus belongs only to left actor/member rows | Code review Round 4, implementation handoff, `REQ-006`, `REQ-012`, DS-002 | Negative assertions in `TeamActiveTasksSection.spec.ts` and left actor-row focus coverage in `TeamFocusSendWorkflow.spec.ts` | N/A |
| Prior Round-2 browser screenshots/report text showing actor heading/status/waiting/Focus on the right pane | Right detail includes duplicated actor/status/focus UI | User feedback and Round 4 changed right detail to content/reference-only | Code review Round 4 scope | New Round-3 API/E2E execution report and browser screenshots | N/A |
| `TeamActiveTaskContextTree` spec/component and prior positive global-tree host scenario | Active-task hierarchy belongs under global Workspaces tree | Corrected requirements/design forbid global-tree active-task content | API/E2E reroute, solution rework, `REQ-002`, `REQ-020` | `TeamActiveTaskNavigator.spec.ts`, `TeamActiveTasksSection.spec.ts`, negative `WorkspaceAgentRunsTreePanel.spec.ts` | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None in API/E2E Round 3 | N/A | N/A | N/A | Round-4 implementation-scoped tests already cover the final delta and passed code review. API/E2E will execute reviewed coverage plus browser smoke rather than editing coverage code. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None in API/E2E Round 3 | N/A | N/A | N/A | No post-code-review durable coverage edits are planned. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None by API/E2E Round 3 | Stale right-focus/global-tree coverage removals were already made by implementation and reviewed by code review. | Code review Round 4 | Verify current state; no API/E2E source edit. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-EXEC-001 | Focused Vitest execution for the current valid team/history/right-panel/status test set | Current durable coverage passes for final left navigator, content-only right detail, left-only focus, Workspaces-tree absence, and status-dot semantics | Command evidence only. |
| TEMP-EXEC-002 | Guard/audit/diff/whitespace/obsolete-reference checks | Boundary/localization/whitespace and no-legacy constraints still hold after Round 4 | Command evidence only. |
| TEMP-EXEC-003 | Typecheck attempt with larger heap or reuse/recheck Round-4 OOM log plus changed-path grep | Establishes that full typecheck is not a successful check and whether any useful changed-path diagnostics exist | Command/log evidence only. |
| TEMP-EXEC-004 | Real browser smoke using local frontend/backend and `Nested Classroom Test Team` fixture | Final post-feedback UI: Team Active Tasks host, content-only right pane, no right Focus/actor/status/waiting duplication, left actor focus, global-tree absence, reference row styling, and reference preview with readable content | Browser evidence only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live single-agent task layout under the current root `Nested Classroom Test Team` run | The root test team exposes `StudentStudyGroup` as a team target; direct delegation to `student_one` returned `TASK_MEMBER_TARGET_NOT_FOUND`, so the live root smoke could only create task-team rows | Browser smoke does not include a live `left-task-agent-context`; durable `TeamActiveTaskNavigator.spec.ts` covers the single-agent layout and passed | Record fixture limitation in execution report; no escalation because the requirement behavior is covered durably and the live fixture does not expose a member target at the root level. |
| Full successful repo typecheck | Prior repo-wide failures and Round-4 OOM indicate this check is not currently stable | Type errors outside scope remain unproven | Capture/reuse OOM/changed-path evidence; no scope escalation if no changed-path diagnostics. |
| Pixel-perfect comparison across all panel widths | No visual baseline suite exists | Minor visual regressions may escape DOM checks | Browser screenshots plus style assertions and resize tests are the scoped mitigation. |
| Backend runtime status model | Explicitly out of scope | Rare projection states could differ | Browser live fixture plus existing projection tests are sufficient unless frontend data proves insufficient. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently | N/A | Round-4 code review, handoff, and corrected requirements agree on final behavior. | N/A |

## Execution Plan

1. Run the focused durable coverage set:
   - `components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts`
   - `components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts`
   - `components/workspace/team/__tests__/TeamOverviewPanel.spec.ts`
   - `components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts`
   - `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
   - `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
   - `composables/__tests__/useRightPanel.spec.ts`
   - `utils/__tests__/workspaceStatusDotPresentation.spec.ts`
2. Run `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, `git diff --check`, navigator trailing-whitespace/no-newline check, and obsolete-reference search including `active-task-focus-primary` production absence.
3. Attempt typecheck with `NODE_OPTIONS=--max-old-space-size=4096`, capture `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/api-e2e-typecheck.log`, and grep for changed-path diagnostics. If it OOMs again, record OOM as blocked evidence.
4. Run real browser smoke against the local frontend/backend and `Nested Classroom Test Team`:
   - ensure a live delegated task exists, creating one via Teacher only if necessary;
   - verify Team tab Active Tasks contains the left navigator and content-only right detail pane;
   - verify right pane has no duplicated actor/team heading/status chip/waiting notice/Focus button;
   - verify left actor/member row focus behavior and summary non-focus behavior;
   - verify global Workspaces tree contains no active-task selectors;
   - capture new Round-4 screenshots in `browser-evidence/`.
5. Update the canonical execution report. If no API/E2E repository-resident durable coverage edits are made, route to `delivery_engineer`; otherwise route to `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: This Round-3 investigation supersedes Round-2 API/E2E for the final post-feedback UX. Current valid durable coverage already exists and passed code review Round 4; API/E2E will execute it plus a refreshed real-browser smoke.

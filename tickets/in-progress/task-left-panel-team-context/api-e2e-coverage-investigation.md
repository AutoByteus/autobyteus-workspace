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
- Current Investigation Round: 2
- Trigger: Round-3 corrected implementation review passed; API/E2E must validate the corrected Team-owned active-task UX after the prior global Workspaces-tree design was rejected and superseded.
- Prior Investigation Reviewed: Round 1, now superseded by `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/api-e2e-design-impact-reroute.md` and `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/solution-design-impact-rework.md`.
- Latest Authoritative Investigation: Round 2

## Current Requirement And Design Basis

The current approved behavior preserves the existing Team tab active-task master/detail layout. The active task UI lives inside `TeamActiveTasksSection.vue`: a left task navigator and a right task/reference detail pane. The global Workspaces/run-history tree remains a workspace/run/team/member navigation surface only and must not render active-task summaries, active-task reference rows, or active-task technical details.

Inside the Team Active Tasks left navigator, each active task item must render in this order: text-only task summary/short description; responsible agent/team actor row with the shared tiny status dot and no root indentation; optional indented team-member rows with the same status-dot language; References label and file-name rows; collapsed compact Technical details. Clicking a task summary or reference row updates only the Team active-task right detail/reference pane and must not focus the center composer/subteam. Clicking explicit actor/team/member rows may use the existing Team focus behavior. The right detail pane must show selected task content or selected reference preview, without duplicating the left roster or left technical metadata.

The implementation handoff's Legacy / Compatibility Removal Check reports no backward-compatibility mechanisms, no old global-tree active-task host retained, no cross-surface active-task selection store, no section store, no right-detail activation composable, and no compatibility branch. Code review Round 3 independently verified the same removal and found no blocking findings.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Active-task hierarchy is hosted inside the Team tab Active Tasks left navigator | Changed | `REQ-001`, corrected design DS-001, implementation handoff summary, code review Round 3 | Execute durable Team navigator/section tests and browser smoke against the Team tab Tasks section. |
| Global Workspaces tree must not host active-task summaries, references, or technical details | Removed / Preserved boundary | `REQ-002`, `REQ-020`, `AC-010`, `AC-015`, solution rework answers 1 and 4 | Execute negative durable Workspaces-tree coverage and browser smoke after expanding a live team run. |
| Task summary row is text-only and first | Changed | `REQ-003`, `REQ-004`, `AC-001`, `AC-005` | Execute component coverage for no dot/avatar on summary and correct row order. |
| Actor/team/member rows use shared tiny status-dot semantics | Added / Preserved presentation | `REQ-009`, `REQ-011`, `REQ-018`, `AC-012` | Execute `TeamActiveTaskNavigator.spec.ts` and `workspaceStatusDotPresentation.spec.ts`; inspect browser DOM/visual state. |
| References remain left file-name rows and right preview content | Changed placement / Preserved behavior | `REQ-013`, `REQ-014`, `AC-008`, corrected analysis addendum | Execute Team section reference preview tests; browser fixture may not have references, so record fixture coverage limit if none exist. |
| Technical details move to collapsed compact left metadata | Changed / Removed from right detail | `REQ-015`, `REQ-016`, `AC-009` | Execute navigator/section tests and inspect browser collapsed details element. |
| Task summary/reference clicks do not focus center composer/subteam | Changed interaction boundary | `REQ-006`, `REQ-012`, `AC-006`, `AC-007`, design DS-002 | Execute Team section and focus workflow tests; browser smoke compares focus state before/after summary/reference clicks where possible. |
| Explicit actor/team/member rows keep existing focus behavior | Preserved through new entrypoint | `REQ-012`, `AC-007`, design DS-002 | Execute Team section/focus workflow tests and browser click on task-team/member row. |
| Prior cross-surface selection/activation path is removed | Removed | Design removal plan; implementation boundary notes; code review dead-reference search | Verify deleted files remain gone and no obsolete imports are present; no compatibility coverage should be retained. |
| Prior API/E2E Round-1 global-tree coverage/artifacts | Removed / Superseded | API/E2E reroute and solution design-impact rework | Treat old global-tree-positive coverage as stale/replaced; execute corrected coverage only. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts` | Direct single-agent and task-team navigator layout: text-only summary, root actor/team row, indented members, shared dots, references, collapsed technical metadata, select/focus emits | `AC-001` through `AC-005`, `AC-008`, `AC-009`, `AC-012`; DS-001/DS-003 | Still Valid | New corrected Team-owned navigator is the intended host; tests assert the exact row hierarchy. | Execute. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Section owns local active-task split, selected task/reference state, reference refresh, split resize, right detail body/preview, summary/reference non-focus, actor/member focus emits, empty state | `REQ-001`, `REQ-005`, `REQ-006`, `REQ-014`, `REQ-016`, `AC-006`, `AC-008`, `AC-013`, `AC-014` | Still Valid | Implementation handoff says section is the corrected owner; code review passed coverage quality. | Execute. |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Focuses task target from Tasks and verifies task-team summary selection does not focus or reintroduce right-side member navigation | `REQ-006`, `REQ-012`, `AC-006`, `AC-007` | Still Valid | Existing workspace team focus behavior is intentionally reused only for actor/member controls. | Execute. |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Messages/Tasks section expansion is local to Team overview; Messages opens first on team-run reset; focused subteam identity is preserved | Corrected design answer 4; `REQ-001`; deferred default-opening risk | Still Valid | Section visibility store was removed; local Team overview ownership is intentional. | Execute. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` — negative active-task context under expanded live team | Ensures global Workspaces tree still renders workspace/team/member rows but does not render active-task navigator/summary/reference/technical detail selectors | `REQ-002`, `REQ-020`, `AC-010`, `AC-011`, `AC-015`; DS-004 | Still Valid | Corrected requirements explicitly forbid the prior global-tree host; code review noted this scenario. | Execute. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` — broader workspace/team/member behavior | Verifies existing workspace/team/member navigation, expansion, status rows, selection, delete/archive behavior | `AC-011`; DS-004 | Still Valid | Global tree remains workspace/run/team/member navigation only. | Execute targeted file. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Regression coverage for team top-row selection/hydration, expanded teams, draft cleanup | DS-004 | Still Valid | Existing global tree behavior must not regress while removing active-task detail ownership. | Execute. |
| `autobyteus-web/composables/__tests__/useRightPanel.spec.ts` | Right panel width/clamping behavior after removed `openRightPanel()` API | Implementation handoff: `openRightPanel()` removed because wrong activation path is gone | Still Valid | `useRightPanel.ts` changed; remaining behavior still must pass. | Execute. |
| `autobyteus-web/utils/__tests__/workspaceStatusDotPresentation.spec.ts` | Shared dot class/status color mapping | `REQ-018`, `AC-012`, DS-003 | Still Valid | Shared presentation remains a valid cross-surface primitive; not a selection/host owner. | Execute. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskContextTree.spec.ts` | Prior Round-1 direct coverage for the wrong global-tree-named component | Superseded design; removal plan | Stale / Remove | Corrected code deletes `TeamActiveTaskContextTree.vue` and this spec; code review verified obsolete references are gone. | No API/E2E edit needed after code review; verify deletion remains. |
| Prior `WorkspaceAgentRunsTreePanel.spec.ts` positive scenario for rendering active-task context under expanded live team | Old Round-1 assertion that global Workspaces tree hosts task context and opens Team tab/right panel from global-tree clicks | Superseded by `REQ-002`, `REQ-020`, `AC-010`, `AC-015` | Replace | API/E2E reroute and solution rework identify this as the rejected design. | Replacement is the current negative Workspaces-tree absence scenario plus Team-owned navigator/section tests. |
| `autobyteus-web/composables/__tests__/useRightSideTabs.spec.ts` / `components/layout/__tests__/RightSideTabs.spec.ts` | Right tab shell behavior used by the old global-tree activation path | Superseded DS-002 no longer opens right panel from global tree | Out Of Scope | Current corrected implementation does not change these files or require a global activation command. | Do not execute unless a browser/runtime finding points there. |
| Broader active-execution/backend/store tests outside the changed UI boundary | General active execution, team communication, backend state, API data models | Backend/runtime status model explicitly out of scope | Out Of Scope | Task is frontend UI ownership/rendering over existing `AgentTeamContext` projection. | Do not execute for this focused round. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskContextTree.spec.ts` | Tests a component name/shape from the prior global-tree host path | The corrected Team-owned implementation uses `TeamActiveTaskNavigator.vue` and deletes `TeamActiveTaskContextTree.vue` | `REQ-002`, `REQ-020`, solution rework, implementation handoff removed/decommissioned list, code review dead-reference search | `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts` | N/A |
| Prior positive global-tree active-task scenario in `WorkspaceAgentRunsTreePanel.spec.ts` | Active task summary/reference/technical detail rows appear under expanded live team runs | User rejected this browser shape; corrected requirements explicitly forbid it | API/E2E design-impact reroute; solution-design-impact rework; `AC-010`, `AC-015` | Negative Workspaces-tree absence scenario plus Team-owned navigator/section coverage | N/A |
| Prior ticket-level API/E2E Round-1 investigation/execution content | Declares global Workspaces-tree active-task embedding as approved coverage | Superseded by design-impact reroute and corrected requirements | `/api-e2e-design-impact-reroute.md`, `/solution-design-impact-rework.md` | This Round-2 investigation and forthcoming execution report | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None in API/E2E Round 2 | N/A | N/A | N/A | Corrected durable coverage was already implemented before code-review Round 3 and passed code review. API/E2E will execute it rather than changing repository-resident tests. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None in API/E2E Round 2 | N/A | N/A | N/A | No coverage code edits are planned after Round-3 code review. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None in API/E2E Round 2 | Prior stale coverage removals were already made by implementation and reviewed by code review. | Implementation handoff and code review Round 3 | Execute current state and verify no obsolete references remain. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-EXEC-001 | Focused Vitest execution for the current valid team/history/right-panel/status tests | Current durable coverage for Team-owned active-task navigator, right detail, Workspaces-tree absence, focus behavior, and status-dot semantics passes under repository test runtime | Command evidence only. |
| TEMP-EXEC-002 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, `git diff --check`, and untracked navigator whitespace check | Boundary/localization/whitespace constraints are still satisfied after the corrected implementation | Command evidence only. |
| TEMP-EXEC-003 | `nuxi typecheck` attempted with captured log and changed-path grep if it remains blocked by known repo-wide issues | Confirms whether full TypeScript failures implicate changed active-task/history/right-panel files | Command/log evidence only. |
| TEMP-EXEC-004 | Real browser smoke using the running frontend at `http://127.0.0.1:3010/workspace` and the user's `Nested Classroom Test Team` fixture against the Electron-started backend | Confirms the corrected live/hydrated UI placement: active-task context appears in Team tab Active Tasks navigator; global Workspaces tree stays workspace/run/team/member only; summary/reference/focus interactions behave visibly | Browser evidence is runtime validation for this task, not repository-resident coverage code. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live reference preview if the current nested classroom fixture exposes no active-task reference files | The user-provided fixture task may be a simple token task with no references | Browser smoke may not exercise reference preview on live data; durable component tests still cover reference preview and refresh with fixtures | Record fixture limitation in execution report; no escalation unless requirements demand live reference fixture creation. |
| Pixel-perfect visual comparison across all desktop sizes | No repository Playwright/Cypress visual baseline suite is present for this surface | Small truncation/spacing regressions could escape DOM/component assertions | Browser screenshots at current/narrow panel widths plus component resize coverage reduce risk; delivery/user can request broader visual QA. |
| Backend/runtime status model changes | Upstream explicitly excludes backend runtime status model changes unless frontend data is insufficient | Projection anomalies could appear only in rare backend states | Real browser smoke against a live team fixture exercises current projection enough for this frontend task. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently | N/A | Corrected requirements/design/code review agree on Team-owned active-task UI and global-tree non-hosting. No compatibility/legacy source behavior was observed in static inspection. | N/A |

## Execution Plan

1. Execute the valid focused durable coverage set:
   - `components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts`
   - `components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts`
   - `components/workspace/team/__tests__/TeamOverviewPanel.spec.ts`
   - `components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts`
   - `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
   - `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
   - `composables/__tests__/useRightPanel.spec.ts`
   - `utils/__tests__/workspaceStatusDotPresentation.spec.ts`
2. Run boundary/localization/audit/diff/whitespace checks.
3. Attempt full `nuxi typecheck`, capture API/E2E log, and grep for changed active-task/history/right-panel paths if it fails due known repo-wide issues.
4. Run a real browser smoke against the running local frontend/backend using the `Nested Classroom Test Team` fixture. Capture screenshots into `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/browser-evidence/` and record DOM/visual observations for:
   - global Workspaces tree expanded on the nested team does not contain active-task context selectors or task summary/reference/technical rows;
   - Team tab Active Tasks section contains the `team-active-task-navigator` and right `active-task-detail-pane`;
   - task-team layout shows summary -> actor/team -> members -> Technical details, with summary/reference selection not refocusing center and actor/member row click retaining focus behavior;
   - narrow-panel scenario keeps left metadata/reference rows truncated/collapsed rather than breaking layout.
5. Update the canonical execution coverage report. If no repository-resident durable coverage is added/updated/removed during API/E2E, route to `delivery_engineer`; if coverage code changes become necessary, route to `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: The prior Round-1 global-tree API/E2E plan is superseded. Current valid coverage already exists after corrected implementation/code review. API/E2E will execute existing reviewed coverage plus real browser smoke; no post-code-review durable coverage edits are planned unless execution reveals a concrete gap.

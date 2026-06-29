# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/design-spec.md`
- Supporting Product Analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/analysis-recommendation.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review handoff for API/E2E and executable coverage investigation of left-side active task/team context UX.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior keeps full task body, selected reference preview, messages, and deeper inspection on the right Team surface while moving compact active-task navigation/context to the left workspace tree under expanded live team runs. The left task block must render a text-only task summary row, a responsible single-agent or task-team root actor row with the shared tiny status dot, indented task-team member rows with the same status-dot language, reference file-name rows that select right-side previews, and compact left technical metadata collapsed by default. Left task or reference clicks must select the task/reference and make the right-side detail visible by opening the right panel, selecting the Team tab, and expanding Active Tasks even when Messages was previously visible. Actor/member clicks must focus the same underlying target as existing workspace team focus behavior. The implementation handoff's Legacy / Compatibility Removal Check reports no backward-compatibility mechanisms, no retained old right-side navigator/local selection path, and clean removal of `TeamActiveTaskRow.vue` from source; code review confirms the same.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Left active-task context under expanded live team runs | Added | `REQ-001`, `REQ-003`, `REQ-004`, `AC-001`, `AC-002`; design DS-001; implementation handoff "Moved active-task navigation/context into the left workspace tree" | Needs durable component coverage for both single-agent and task-team layouts plus focused executable coverage through the workspace tree. |
| Text-only task summary with no status dot | Changed | `REQ-008`, `AC-009`; design guidance forbids status dot on summary row | Existing task-team workspace test partially covers; add direct layout coverage for single-agent/task-team rows. |
| Shared tiny actor/team/member status dots | Changed / Preserved | `REQ-007`, `AC-004`, `AC-008`; design DS-004; code-review status-dot extraction pass | Existing status utility test is valid; direct left-context coverage should assert the dot is on actor/member rows and not the task summary. |
| Right Team tab remains detail surface only | Changed / Preserved | `REQ-006`, `AC-006`; design removal plan; implementation handoff removed right navigator and technical details from right pane | Existing `TeamActiveTasksSection` and workflow tests remain valid; execute them. |
| Left task/reference click activates visible right detail | Added | `REQ-002`, `AC-003`, `AC-011`; design DS-002; design review AR-001 resolution | Existing workspace test covers selection and Active Tasks store activation but does not assert right panel visibility or Team tab. Update durable test. Existing detail-pane tests prove task body/reference rendering from selection. |
| Actor/member focus from left task context | Preserved / Changed entrypoint | `REQ-005`, `AC-005`; design DS-003; implementation handoff focus hints | Existing workspace and workflow tests remain valid; execute them. |
| References remain left rows and right previews | Changed placement / Preserved content surface | `REQ-009`, `AC-011`; product analysis reference placement; implementation handoff | Existing detail preview test remains valid; workspace test should retain left reference click selection/activation assertion. |
| Technical metadata moves left collapsed by default | Changed / Removed from right | `REQ-010`, `AC-012`; design removal plan; implementation handoff | Existing right-pane absence assertions are valid; add direct left-context details coverage. |
| Old right-side active-task navigator and local selection refs | Removed | Design Legacy Removal Policy; implementation handoff Removed; code review no legacy retention | Existing absence assertions are valid; no stale coverage to remove. |
| Durable docs still mention old navigator | Preserved docs debt | Code review Docs-Impact Verdict | Out of API/E2E scope; delivery docs sync must handle after coverage review. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` — `renders active task context under an expanded live team and activates right detail from left clicks` | Mounts left workspace tree with live team context; renders task-team summary/actor/member/reference; asserts no summary dot; reference click selects shared reference and opens Active Tasks section; member click focuses child member | `AC-002`, `AC-003`, `AC-005`, `AC-009`, `AC-011`; DS-001/DS-002/DS-003 | Needs Update | Scenario is still required and currently valid, but right panel visibility and Team tab activation are part of `AC-003` and are not asserted. | Update this durable scenario to set Messages/default state and a closed right panel before left click, then assert `useRightPanel().isRightPanelVisible === true`, `useRightSideTabs().activeTab === 'teamMembers'`, and Active Tasks section store is active. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` — existing workspace/team/member selection and status row tests | Verifies workspace/team rows, expansion, persisted-member hydration, status indicators, and member selection behavior | Existing workspace focus behavior reused by `REQ-005`; status conventions reused by `REQ-007` | Still Valid | Requirements preserve workspace selection/focus conventions and status visual language. | Execute targeted file; no removal. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` | Regression coverage for team selection, expansion, and draft cleanup | Workspace tree host remains the left-context owner; existing tree behavior must not regress | Still Valid | Design keeps `WorkspaceAgentRunsTreePanel` as left-tree orchestrator. | Execute targeted file; no update planned. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Verifies right active-task section is controlled by parent collapse state, renders detail pane from shared selection, removes old navigator/resizer/reference rows/technical details, shows selected right reference preview, emits focus, falls back on stale selection, and empty state | `REQ-006`, `AC-006`, `AC-011`; removal/decommission plan; DS-002 | Still Valid | Right side remains detail-only; old navigator assertions are intentionally negative and current. | Execute targeted file; no update planned. |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Verifies Messages-first default, parent-owned Messages/Tasks expansion through store, and selected-team reset behavior | `REQ-002`, `AC-003`; design AR-001 resolution and `teamOverviewSectionStore` ownership | Still Valid | Requirements preserve Messages and require explicit Active Tasks activation after left clicks. | Execute targeted file; no update planned. |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Verifies focus from active task detail to task-agent target and send-message path; verifies shared task-team selection without reintroducing right-side member navigation or technical details | `REQ-005`, `REQ-006`; DS-003; removal plan | Still Valid | Focus behavior and no-old-navigator assertions remain required. | Execute targeted file; no update planned. |
| `autobyteus-web/composables/__tests__/useRightPanel.spec.ts` | Verifies idempotent `openRightPanel()` and width behavior | Design DS-002 activation must use idempotent open action | Still Valid | `useTeamActiveTaskRightDetailActivation` depends on `openRightPanel()`; no compatibility toggle allowed. | Execute targeted file. |
| `autobyteus-web/composables/__tests__/useRightSideTabs.spec.ts` and `components/layout/__tests__/RightSideTabs.spec.ts` | Verifies existing right tab shell behavior around tab visibility/focus | DS-002 uses existing tab owner to select Team tab | Still Valid | Right tab owner is reused, not replaced. | Execute targeted files. |
| `autobyteus-web/composables/__tests__/useWorkspaceHistoryTreeState.spec.ts` | Verifies tree expansion/selection state | DS-001 host under expanded team rows; existing expansion behavior must remain | Still Valid | Left context appears only under expanded live teams. | Execute targeted file. |
| `autobyteus-web/utils/__tests__/workspaceStatusDotPresentation.spec.ts` | Verifies shared base dot class and agent/team status color mapping | `REQ-007`, `AC-004`, `AC-008`; DS-004 | Still Valid | Code review confirms workspace rows now use extracted mapping. | Execute targeted file. |
| `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts`, `stores/__tests__/agentTeamRunStore.spec.ts`, `utils/__tests__/teamActiveExecutionMembers.spec.ts` | Broader active execution/focus behavior and active-execution bar behavior | Indirectly related to task-team status/focus, but not changed left-context UX | Out Of Scope | They do not assert the changed left/right task-context boundary. | Do not execute for this focused round unless a failure points there. |
| `autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.focusedInterrupt.e2e.spec.ts` | Existing focused input/interrupt behavior in a Vitest e2e-named spec | Unrelated to left active-task context | Out Of Scope | Search shows no Playwright/Cypress/browser E2E suite for this surface; repository coverage is component/integration Vitest. | No action for this task. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None | N/A | No existing durable test asserts the old right navigator as desired behavior. Existing old-selector assertions are negative removal checks and remain valid. | Design removal/decommission plan; implementation handoff; code review legacy verdict | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| COV-ADD-001 | Direct left-context layout for single-agent and task-team active tasks, including text-only summary, actor/member dots, root actor alignment, member indentation, references, collapsed/truncated technical metadata | `AC-001`, `AC-002`, `AC-004`, `AC-007`, `AC-009`, `AC-010`, `AC-012`; design DS-001/DS-004 | Add `autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskContextTree.spec.ts` | Existing durable coverage exercises a task-team context through the workspace tree but does not directly cover the single-agent left layout or collapsed technical metadata behavior. A component-level test is the correct durable boundary for narrow-panel row semantics. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| COV-UPD-001 | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` — active task context / left click activation scenario | Assert default Messages section before click, close the right panel before click, then after left reference click assert the right panel is open, active right tab is `teamMembers`, shared reference selection is set, and Active Tasks section is active | `REQ-002`, `AC-003`, `AC-011`; design DS-002 and design-review AR-001 resolution | Keeps coverage at the real left workspace tree entrypoint without adding a full browser harness that the repository does not currently provide. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-EXEC-001 | Focused targeted Vitest execution for changed team/workspace/composable/status tests after durable coverage edits | Current repository-resident coverage for left context, right detail, focus, status, and right activation passes under Nuxt/happy-dom runtime | This is command execution evidence, not extra code. |
| TEMP-EXEC-002 | `nuxi typecheck` attempted with changed-file grep if it still fails | Confirms whether known repo-wide typecheck failures include the changed implementation/coverage files | Typecheck command is a validation method; no durable probe is needed. |
| TEMP-EXEC-003 | Guard/audit commands and `git diff --check` | Confirms boundary/localization/whitespace constraints after coverage edits | Command evidence only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full real browser visual screenshot at actual desktop panel widths | The repository does not expose a Playwright/Cypress browser E2E suite or script for this surface; current durable UI tests use Nuxt/happy-dom component/integration mounting. | Visual pixel regressions outside class/DOM semantics may escape component tests. | Record limitation in execution report; delivery/user can request a browser visual pass if product requires pixel-level evidence. |
| Live backend/WebSocket team run with real delegated tasks | Scope is frontend UX over existing projected `AgentTeamContext`; upstream explicitly excludes backend runtime status model changes. | Fixture shape could miss backend projection anomalies, but `deriveActiveTaskEntries()` is already covered by existing fixtures. | No escalation unless tests reveal projection mismatch. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently | N/A | Upstream requirements/design/code review agree on the ownership model and no compatibility/legacy source behavior was observed during investigation. | N/A |

## Execution Plan

1. Add direct durable component coverage for `TeamActiveTaskContextTree.vue` single-agent/task-team/narrow metadata scenarios (`COV-ADD-001`).
2. Update the existing workspace-tree active-task activation test to assert right-panel open, Team tab activation, default Messages-to-Active-Tasks transition, and reference selection (`COV-UPD-001`).
3. Run focused Vitest coverage for the changed and relevant existing files:
   - `components/workspace/team/__tests__/TeamActiveTaskContextTree.spec.ts`
   - `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts`
   - `components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts`
   - `components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts`
   - `components/workspace/team/__tests__/TeamOverviewPanel.spec.ts`
   - `components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts`
   - `components/layout/__tests__/RightSideTabs.spec.ts`
   - `composables/__tests__/useRightPanel.spec.ts`
   - `composables/__tests__/useRightSideTabs.spec.ts`
   - `composables/__tests__/useWorkspaceHistoryTreeState.spec.ts`
   - `utils/__tests__/workspaceStatusDotPresentation.spec.ts`
4. Run `pnpm --filter autobyteus run guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, and `git diff --check`.
5. Attempt `pnpm --filter autobyteus exec nuxi typecheck`; if it fails as known, grep output for changed source/test paths and record changed-file impact.
6. Update this investigation if findings alter validity decisions, then write the execution coverage report. Because repository-resident durable coverage will be added/updated, route the cumulative package back to `code_reviewer` for coverage-code review on pass.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: No stale durable coverage requires removal. The current test suite is valid but has two focused gaps: direct single-agent/narrow left-context coverage and explicit left-click right-panel/Team-tab activation assertions. Address those as durable coverage before final execution.
